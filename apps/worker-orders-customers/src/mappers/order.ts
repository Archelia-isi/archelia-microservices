import { prisma } from '@archelia/database';
import { logger, env } from '@archelia/core';
import { zucchettiClient, zucchettiAuth } from '@archelia/zucchetti';
import { ZucchettiClientService } from '@archelia/zucchetti';
import { TelegramNotifier } from '../utils/telegram.js';
import { OrderMailer } from '../utils/mailer.js';

export class ZucchettiCustomerNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZucchettiCustomerNotReadyError';
  }
}

/**
 * Mappa un array di Line Items Shopify in XML righe documento Zucchetti.
 */
function buildXmlLineItems(lineItems: any[], isLogistica: boolean = false): string {
  return lineItems.map((item, index) => {
    // Calcola il prezzo base unitario e sottrai la porzione di sconto totale applicata alla singola riga
    const basePrice = parseFloat(item.price || 0);
    const lineDiscount = parseFloat(item.total_discount || 0);
    const qty = parseInt(item.quantity) || 1;
    let price = basePrice - (lineDiscount / qty);

    let sku = item.sku;
    if (!sku) {
      logger.warn(`L'articolo ${item.title} non ha SKU. Verrà ignorato.`);
      return '';
    }

    // Se logistica (A0002), Zucchetti richiede il prezzo NETTO (scorporato dall'IVA)
    let finalPrice = price;
    if (isLogistica) {
      const itemTaxRate = item.tax_lines && item.tax_lines.length > 0 
        ? item.tax_lines.reduce((sum: number, tax: any) => sum + parseFloat(tax.rate || 0), 0) 
        : 0;
      if (itemTaxRate > 0) {
        finalPrice = price / (1 + itemTaxRate);
      }
    }

    const priceNode = `<MVPREZZO>${finalPrice.toFixed(5)}</MVPREZZO>`;

    return `
      <ADHOC_DOCUMENTI_d>
        <CPROWNUM_K>${index + 1}</CPROWNUM_K>
        <MVNUMRIF_K>0</MVNUMRIF_K>
        <MVCODICE>${sku}</MVCODICE>
        <MVQTAMOV>${item.quantity || 1}</MVQTAMOV>
        ${priceNode}
        <useMappingDirect>N</useMappingDirect>
      </ADHOC_DOCUMENTI_d>`;
  }).join('');
}

export async function processOrderSync(orderPayload: any) {
  const shopifyOrderIdStr = orderPayload.id.toString();
  const shopifyCustomerId = orderPayload.customer?.id?.toString();

  logger.info(`📦 OrderWorker: Avvio sincronizzazione per ordine Shopify ID ${shopifyOrderIdStr}`);

  if (!shopifyCustomerId) {
    throw new Error(`Nessun cliente associato all'ordine ${shopifyOrderIdStr}`);
  }

  const orderDateRaw = new Date(orderPayload.created_at || Date.now()).toISOString();
  const orderDateFormatted = orderDateRaw.substring(0, 10);
  const shortOrderId = orderPayload.name ? orderPayload.name.replace('#', '') : orderPayload.id.toString().substring(0, 5);

  // 0. Verifica se è un nuovo ordine per inviare le notifiche
  const existingOrder = await prisma.zelShopifyOrder.findUnique({
    where: { shopifyOrderId: shopifyOrderIdStr }
  });
  
  if (!existingOrder) {
    try {
      const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' }});
      if (settings?.config) {
        const config = JSON.parse(settings.config);

        // Arricchimento miniature prodotti da DB locale
        const productGids = orderPayload.line_items
          ?.filter((i: any) => i.product_id)
          .map((i: any) => `gid://shopify/Product/${i.product_id}`) || [];

        if (productGids.length > 0) {
          try {
            const products = await prisma.product.findMany({
              where: { shopifyId: { in: productGids } },
              select: { shopifyId: true, imageUrl: true }
            });
            const imageMap = new Map(products.map(p => [p.shopifyId, p.imageUrl]));
            orderPayload.line_items.forEach((item: any) => {
              if (item.product_id) {
                item.image_url = imageMap.get(`gid://shopify/Product/${item.product_id}`);
              }
            });
          } catch (err) {
            logger.error({ error: err }, 'Errore durante fetch immagini per notifica ordine');
          }
        }

        if (config.telegramChatId) {
          TelegramNotifier.sendNewOrderMessage(config.telegramChatId, orderPayload).catch(e => logger.error(e, `Telegram error`));
        }
        if (config.orderNotificationEmails && config.orderNotificationEmails.length > 0) {
          OrderMailer.sendNewOrderEmails(config.orderNotificationEmails, orderPayload).catch(e => logger.error(e, `Mailer error`));
        }
      }
    } catch (e) {
      logger.error({ error: e }, 'Errore durante invio notifiche ordine');
    }
  }

  // 1. Salvataggio preliminare dell'ordine in zelShopifyOrder per sbloccare il CustomerWorker
  const totalPrice = parseFloat(orderPayload.total_price || orderPayload.current_total_price || '0');
  await prisma.zelShopifyOrder.upsert({
    where: { shopifyOrderId: shopifyOrderIdStr },
    update: {
      orderNumber: orderPayload.order_number?.toString() || shortOrderId,
      totalPrice,
      shopifyCustomerId: shopifyCustomerId
    },
    create: {
      shopifyOrderId: shopifyOrderIdStr,
      orderNumber: orderPayload.order_number?.toString() || shortOrderId,
      shopifyCustomerId: shopifyCustomerId,
      totalPrice
    }
  });

  // 1.5. Inizializza coda Zucchetti PRIMA dell'Interlock per esporre subito il JSON alla UI
  await prisma.zelZucchettiOrderQueue.upsert({
    where: { shopifyOrderId: shopifyOrderIdStr },
    update: { 
      payload: orderPayload, 
      totalPrice: totalPrice,
      status: 'PENDING', 
      updatedAt: new Date() 
    },
    create: { 
      shopifyOrderId: shopifyOrderIdStr, 
      payload: orderPayload, 
      totalPrice: totalPrice,
      status: 'PENDING' 
    }
  });

  // 1b. Interlock di Sicurezza
  const customerQueue = await prisma.zelZucchettiCustomerQueue.findUnique({
    where: { shopifyId: shopifyCustomerId }
  });

  if (!customerQueue || customerQueue.status !== 'SYNCED') {
    logger.warn(`🛑 Interlock [Ordine: ${shopifyOrderIdStr}]: Cliente non ancora pronto in Zucchetti (Status: ${customerQueue?.status}). Attesa Semaforo Verde...`);
    throw new ZucchettiCustomerNotReadyError(`Cliente ${shopifyCustomerId} non pronto in Zucchetti.`);
  }

  const customerArcId = customerQueue.arcId;

  // Calcolo Spese di Spedizione (MVSPETRA)
  let shippingPrice = 0;
  if (orderPayload.shipping_lines && orderPayload.shipping_lines.length > 0) {
    const sLine = orderPayload.shipping_lines[0];
    shippingPrice = parseFloat(sLine.price || 0);
  }

  // Generazione righe XML differenziate per politica IVA
  const xmlRigheA0001 = buildXmlLineItems(orderPayload.line_items || [], false); // IVA Inclusa
  const xmlRigheA0002 = buildXmlLineItems(orderPayload.line_items || [], true);  // IVA Scorporata

  if (!xmlRigheA0001 && !xmlRigheA0002) {
    throw new Error('L\'ordine non ha righe valide (SKU mancanti o carrello vuoto). Impossibile importare.');
  }

  const tipoDocCommerciale = 'ORDCE';
  const classDocCommerciale = 'OR';


  try {
    if (!env.ENABLE_GLOBAL_WRITES) {
      logger.warn(`⚠️ ENABLE_GLOBAL_WRITES è false. Bypass invio ordine a Zucchetti per sicurezza.`);
      logger.debug(`[Dry-Run A0002] XML Righe A0002 generato`);
      logger.debug(`[Dry-Run A0001] XML Righe A0001 generato con MVSPETRA=${shippingPrice}`);
    } else {
      await zucchettiAuth.withToken(async (token) => {
        // ==========================================
        // 1. CHIAMATA A0002: IZZO DISTRIBUZIONE (Logistica)
        // ==========================================
        const xmlA0002 = `
<ADHOC_DOCUMENTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="00004">
  <Add_ADHOC_DOCUMENTI MVCLADOC="OR" MVCODCON="${customerArcId}" MVCODORN="C000074" MVDATDOC="${orderDateFormatted}" MVDATREG="${orderDateFormatted}" MVFLVEAC="V" MVSERIAL_K="L${shortOrderId}" MVTIPDOC="ORDCL">
    <BO_ADHOC_DOCUMENTI_d>
${xmlRigheA0002}
    </BO_ADHOC_DOCUMENTI_d>
  </Add_ADHOC_DOCUMENTI>
</ADHOC_DOCUMENTI>`.trim();

        logger.info(`➤ [A0002] Lancio Ordine Logistico (ORDCL) per ${orderPayload.name}...`);
        await zucchettiClient.importData(token, xmlA0002, 'A0002');
        logger.info(`✅ [A0002] Logistica OK.`);

        // ==========================================
        // 2. CHIAMATA A0001: IZZO SOFTWARE (Fatturazione)
        // ==========================================
        const xmlA0001 = `
<ADHOC_DOCUMENTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="00009">
  <Add_ADHOC_DOCUMENTI MVCLADOC="${classDocCommerciale}" MVCODCON="${customerArcId}" MVDATDOC="${orderDateFormatted}" MVDATREG="${orderDateFormatted}" MVFLVEAC="V" MVSERIAL_K="F${shortOrderId}" MVTIPDOC="${tipoDocCommerciale}" MVSPETRA="${shippingPrice}">
    <BO_ADHOC_DOCUMENTI_d>
${xmlRigheA0001}
    </BO_ADHOC_DOCUMENTI_d>
  </Add_ADHOC_DOCUMENTI>
</ADHOC_DOCUMENTI>`.trim();

        logger.info(`➤ [A0001] Lancio Documento Commerciale (${tipoDocCommerciale}) per ${orderPayload.name}...`);
        await zucchettiClient.importData(token, xmlA0001, 'A0001');
        logger.info(`✅ [A0001] Commerciale OK.`);
      });
    }

    await prisma.zelZucchettiOrderQueue.update({
      where: { shopifyOrderId: shopifyOrderIdStr },
      data: { status: 'SYNCED', updatedAt: new Date(), lastError: null }
    });

    logger.info(`✅ OrderWorker: Ordine ${shopifyOrderIdStr} sincronizzato (Logistica + Commerciale) con successo.`);
  } catch (err: any) {
    logger.error(`❌ OrderWorker: Errore pipeline ordine [${shopifyOrderIdStr}] — ${err.message}`);
    
    // Non incrementiamo 'attempts' manualmente se gestito da BullMQ, ma aggiorniamo status.
    await prisma.zelZucchettiOrderQueue.update({
      where: { shopifyOrderId: shopifyOrderIdStr },
      data: { status: 'ERROR', lastError: err.message, updatedAt: new Date() }
    });
    
    throw err;
  }
}

