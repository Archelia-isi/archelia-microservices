import { prisma } from '@archelia/database';
import { logger } from '@archelia/core';
import { xmlBuilder, zucchettiClient, zucchettiAuth } from '@archelia/zucchetti';

async function generateNextArcId(): Promise<string> {
  const lastCustomer = await prisma.zelShopifyCustomer.findFirst({
    where: { zucchettiArcId: { not: null } },
    orderBy: { zucchettiArcId: 'desc' },
  });

  if (!lastCustomer || !lastCustomer.zucchettiArcId) {
    return 'ARC000001A';
  }

  const match = lastCustomer.zucchettiArcId.match(/^ARC(\d+)A$/);
  if (!match) return 'ARC000001A';

  const nextNumber = parseInt(match[1], 10) + 1;
  const paddedNumber = nextNumber.toString().padStart(6, '0');
  return `ARC${paddedNumber}A`;
}

export async function processCustomerSync(shopifyId: string) {
  logger.info(`📦 CustomerWorker: Avvio sincronizzazione per cliente Shopify ID ${shopifyId}`);
  
  const shopifyRecord = await prisma.zelShopifyCustomer.findUnique({
    where: { shopifyId }
  });

  if (!shopifyRecord) {
    throw new Error(`Mapper Engine: Cliente Shopify ID ${shopifyId} non trovato nel DB CRM.`);
  }

  let isUpdate = !!shopifyRecord.zucchettiArcId;

  if (isUpdate && shopifyRecord.zucchettiArcId) {
    const queueRecord = await prisma.zelZucchettiCustomerQueue.findUnique({
      where: { arcId: shopifyRecord.zucchettiArcId }
    });
    if (queueRecord && queueRecord.status === 'ERROR') {
      const payloadStr = JSON.stringify(queueRecord.xmlPayload);
      if (payloadStr.includes('Add_ADHOC_CONTI')) {
        isUpdate = false;
      }
    }
  }

  if (!isUpdate) {
    const hasOrder = await prisma.zelShopifyOrder.findFirst({
      where: { shopifyCustomerId: shopifyId },
      select: { shopifyOrderId: true }
    });
    if (!hasOrder) {
      logger.info(`ℹ️ Mapper Engine: Cliente ${shopifyId} senza ordini — non entra in Zucchetti.`);
      return;
    }
  }

  const addresses = (shopifyRecord.addresses as any[]) || [];
  let primaryAddress = shopifyRecord.billingAddress as any;
  
  if (!primaryAddress && addresses.length > 0) {
    primaryAddress = addresses[0];
  }
  
  if (!primaryAddress || !primaryAddress.address1 || !primaryAddress.city || !primaryAddress.zip) {
    logger.warn(`⚠️ Mapper Engine: Shopify ID ${shopifyId} senza indirizzo completo. Impossibile promuovere in Zucchetti.`);
    return;
  }

  const fiscalData = (shopifyRecord.fiscalData || {}) as any;
  const pIva = fiscalData.pIva || '';
  const cFiscale = fiscalData.cFiscale || '';
  const sdi = fiscalData.sdi || '';
  const pec = fiscalData.pec || '';

  let anforgiu = '';
  if (pIva) {
    if (primaryAddress.company) {
      anforgiu = "SRL";
    } else {
      anforgiu = "IND";
    }
  } else {
    anforgiu = "PER";
  }

  const nome = primaryAddress.first_name || shopifyRecord.firstName || '';
  const cognome = primaryAddress.last_name || shopifyRecord.lastName || '';
  const descrizione = (primaryAddress.company || '').trim() || `${cognome} ${nome}`.trim() || shopifyRecord.email || 'Cliente';
  const descrizioneMax60 = descrizione.substring(0, 60);
  
  const targetArcId = shopifyRecord.zucchettiArcId || await generateNextArcId();

  const xmlPayloadObj: any = {
    AHR_REQUEST: {
      AHR_REQUEST_d: {
        AHR_REQUEST_LOGIN: 'SERVLET',
      }
    }
  };

  const adhocContiObj: any = {
    COCODICE: targetArcId,
    ANCODMAS: '01030201',
    ANDENOMI: descrizioneMax60,
    ANINDIRI: (primaryAddress.address1 || '').substring(0, 60),
    ANCAP: (primaryAddress.zip || '').substring(0, 5),
    ANLOCALI: (primaryAddress.city || '').substring(0, 50),
    ANPROVIN: (primaryAddress.province_code || 'EE').substring(0, 2),
    ANCODNAZ: (primaryAddress.country_code || 'IT').substring(0, 4),
    ANDATNAS: '',
    ANPIVA: pIva.substring(0, 16),
    ANCODFIS: cFiscale.substring(0, 16),
    ANFORGIU: anforgiu,
    ANCATEG: 'CLIBE',
    ANTIPCON: 'C',
    CODATAPE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    USEMAPPINGDIRECT: 'N'
  };

  if (sdi) adhocContiObj.CDFATTEL = sdi.substring(0, 7);
  if (pec) adhocContiObj.IDPEC = pec.substring(0, 100);

  const adhocAnagEstese: any = {
    AECODICE: targetArcId,
    AEMASTRO: '01030201',
    AENOME: nome.substring(0, 50),
    AECOGNOM: cognome.substring(0, 50),
    AEEMAIL: (shopifyRecord.email || '').substring(0, 100),
    AETELEF1: (shopifyRecord.phone || '').substring(0, 20),
    USEMAPPINGDIRECT: 'N'
  };

  if (isUpdate) {
    xmlPayloadObj.AHR_REQUEST.Upd_ADHOC_CONTI = { Upd_ADHOC_CONTI_d: adhocContiObj };
    xmlPayloadObj.AHR_REQUEST.Upd_ADHOC_ANAGESTESE = { Upd_ADHOC_ANAGESTESE_d: adhocAnagEstese };
  } else {
    xmlPayloadObj.AHR_REQUEST.Add_ADHOC_CONTI = { Add_ADHOC_CONTI_d: adhocContiObj };
    xmlPayloadObj.AHR_REQUEST.Add_ADHOC_ANAGESTESE = { Add_ADHOC_ANAGESTESE_d: adhocAnagEstese };
  }

  const xmlString = xmlBuilder.build(xmlPayloadObj);

  await prisma.zelZucchettiCustomerQueue.upsert({
    where: { shopifyId },
    update: {
      arcId: targetArcId,
      xmlPayload: xmlPayloadObj,
      status: 'PENDING',
      updatedAt: new Date()
    },
    create: {
      shopifyId,
      arcId: targetArcId,
      xmlPayload: xmlPayloadObj,
      status: 'PENDING'
    }
  });

  try {
    await zucchettiAuth.withToken(async (token) => {
      await zucchettiClient.importData(token, xmlString);
    });

    await prisma.zelShopifyCustomer.update({
      where: { shopifyId },
      data: { zucchettiArcId: targetArcId }
    });

    await prisma.zelZucchettiCustomerQueue.update({
      where: { shopifyId },
      data: { status: 'SYNCED', updatedAt: new Date() }
    });

    logger.info(`✅ Mapper Engine: Cliente ${shopifyId} sincronizzato in Zucchetti con ID: ${targetArcId}`);
  } catch (err: any) {
    logger.error(`❌ Mapper Engine: Errore Zucchetti per ${shopifyId} — ${err.message}`);
    
    await prisma.zelZucchettiCustomerQueue.update({
      where: { shopifyId },
      data: { status: 'ERROR', lastError: err.message, updatedAt: new Date() }
    });
    
    throw err;
  }
}
