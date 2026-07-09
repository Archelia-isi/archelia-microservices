import { prisma } from '@archelia/database';
import { logger } from '@archelia/core';
import { xmlBuilder, zucchettiClient, zucchettiAuth } from '@archelia/zucchetti';

export class ZucchettiCustomerNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZucchettiCustomerNotReadyError';
  }
}

function buildXmlLineItems(lineItems: any[], isLogistica: boolean = false): any[] {
  return lineItems.map((item, index) => {
    const basePrice = parseFloat(item.price || 0);
    const lineDiscount = parseFloat(item.total_discount || 0);
    const qty = parseInt(item.quantity) || 1;
    let price = basePrice - (lineDiscount / qty);

    let sku = item.sku;
    if (!sku) {
      logger.warn(`L'articolo ${item.title} non ha SKU. Verrà ignorato.`);
      return null;
    }

    let finalPrice = price;
    if (isLogistica) {
      const itemTaxRate = item.tax_lines && item.tax_lines.length > 0 
        ? item.tax_lines.reduce((sum: number, tax: any) => sum + parseFloat(tax.rate || 0), 0) 
        : 0;
      if (itemTaxRate > 0) {
        finalPrice = price / (1 + itemTaxRate);
      }
    }

    return {
      CPROWNUM_K: index + 1,
      MVNUMRIF_K: 0,
      MVCODICE: sku,
      MVQTAMOV: item.quantity || 1,
      MVPREZZO: finalPrice.toFixed(5),
      useMappingDirect: 'N'
    };
  }).filter(item => item !== null);
}

export async function processOrderSync(orderPayload: any) {
  const shopifyOrderIdStr = orderPayload.id.toString();
  const shopifyCustomerId = orderPayload.customer?.id?.toString();

  logger.info(`📦 OrderWorker: Avvio sincronizzazione per ordine Shopify ID ${shopifyOrderIdStr}`);

  if (!shopifyCustomerId) {
    throw new Error(`Nessun cliente associato all'ordine ${shopifyOrderIdStr}`);
  }

  // 1. Interlock di Sicurezza
  const customerQueue = await prisma.zelZucchettiCustomerQueue.findUnique({
    where: { shopifyId: shopifyCustomerId }
  });

  if (!customerQueue || customerQueue.status !== 'SYNCED') {
    logger.warn(`🛑 Interlock [Ordine: ${shopifyOrderIdStr}]: Cliente non ancora pronto in Zucchetti (Status: ${customerQueue?.status}). Attesa Semaforo Verde...`);
    // Lanciando questo errore, BullMQ rimetterà il job in coda con backoff.
    throw new ZucchettiCustomerNotReadyError(`Cliente ${shopifyCustomerId} non pronto in Zucchetti.`);
  }

  const customerArcId = customerQueue.arcId;

  // 2. Preparazione Dati Zucchetti
  const dateStr = orderPayload.created_at ? orderPayload.created_at.split('T')[0].replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
  const isLogistica = orderPayload.tags && orderPayload.tags.includes('LOGISTICA');
  const magazzino = isLogistica ? 'LO' : 'PR';

  const orderLines = buildXmlLineItems(orderPayload.line_items || [], isLogistica);

  if (orderLines.length === 0) {
    throw new Error('L\'ordine non ha righe valide (SKU mancanti o carrello vuoto). Impossibile importare.');
  }

  const xmlPayloadObj: any = {
    AHR_REQUEST: {
      AHR_REQUEST_d: {
        AHR_REQUEST_LOGIN: 'SERVLET',
      },
      Add_ADHOC_DOCUMENTI: {
        Add_ADHOC_DOCUMENTI_d: {
          TDDATDOC_K: dateStr,
          TDCLADOC_K: 'OR',
          TDTIPDOC_K: 'ORDCE',
          TDNUMDOC_K: 0,
          TDCONTO: customerArcId,
          TDNUMORD: (orderPayload.name || orderPayload.order_number?.toString() || '').substring(0, 20),
          TDMAGAZZ: magazzino,
          TDCODPAG: 'RD',
          USEMAPPINGDIRECT: 'N'
        },
        Add_ADHOC_DOCUMENTI_R: orderLines.map(line => ({ Add_ADHOC_DOCUMENTI_d: line }))
      }
    }
  };

  const xmlString = xmlBuilder.build(xmlPayloadObj);

  // 3. Salvataggio Storico
  await prisma.zelZucchettiOrderQueue.upsert({
    where: { shopifyOrderId: shopifyOrderIdStr },
    update: {
      payload: orderPayload,
      status: 'PENDING',
      updatedAt: new Date()
    },
    create: {
      shopifyOrderId: shopifyOrderIdStr,
      payload: orderPayload,
      status: 'PENDING'
    }
  });

  try {
    await zucchettiAuth.withToken(async (token) => {
      await zucchettiClient.importData(token, xmlString);
    });

    await prisma.zelZucchettiOrderQueue.update({
      where: { shopifyOrderId: shopifyOrderIdStr },
      data: { status: 'SYNCED', updatedAt: new Date() }
    });

    logger.info(`✅ OrderWorker: Ordine ${shopifyOrderIdStr} sincronizzato in Zucchetti con successo.`);
  } catch (err: any) {
    logger.error(`❌ OrderWorker: Errore Zucchetti per ${shopifyOrderIdStr} — ${err.message}`);
    
    await prisma.zelZucchettiOrderQueue.update({
      where: { shopifyOrderId: shopifyOrderIdStr },
      data: { status: 'ERROR', lastError: err.message, updatedAt: new Date() }
    });
    
    throw err;
  }
}
