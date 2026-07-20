import { prisma } from '@archelia/database';
import { logger, env } from '@archelia/core';
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

/**
 * Esegue un'operazione su Zucchetti con logica di fallback UPSERT
 */
async function zucchettiUpsert(token: string, action: string, payload: string, company: string, recordArcId: string) {
  try {
    await zucchettiClient.importData(token, payload, company);
  } catch (err: any) {
    const errorMsg = err.message || '';
    
    // Fallback da Update ad Add
    if (payload.includes('<Upd_') && (errorMsg.includes('401') || errorMsg.includes('non risulta inviata') || errorMsg.includes('non è mai stata inviata') || errorMsg.includes('entità inesistente') || errorMsg.includes('Update fallito'))) {
      logger.warn(`⚠️ [${recordArcId}] Zucchetti ${action} su ${company}: Update fallito (entità inesistente). Tento fallback in Add...`);
      let fallbackPayload = payload.replace(/<Upd_/g, '<Add_').replace(/<\/Upd_/g, '</Add_');
      
      if (fallbackPayload.includes('<Add_ADHOC_CONTI')) {
        const nomeMatch = fallbackPayload.match(/AENOME>([^<]*)<\/AENOME/);
        const cognomMatch = fallbackPayload.match(/AECOGNOM>([^<]*)<\/AECOGNOM/);
        const descMatch = fallbackPayload.match(/ANDENOMI>([^<]*)<\/ANDENOMI/);
        
        let descrizione = 'Cliente';
        if (descMatch) {
          descrizione = descMatch[1];
        } else if (nomeMatch && cognomMatch) {
          descrizione = `${cognomMatch[1]} ${nomeMatch[1]}`.trim();
        }
        
        const descrizioneMax60 = descrizione.substring(0, 60);

        fallbackPayload = fallbackPayload.replace('<Add_ADHOC_CONTI_d>', `<Add_ADHOC_CONTI_d>\n<DescriNoZoom>${descrizioneMax60}</DescriNoZoom>`);
      }

      await zucchettiClient.importData(token, fallbackPayload, company);
      return;
    }

    // Fallback da Add ad Update
    if (payload.includes('<Add_') && (errorMsg.toLowerCase().includes('già present') || errorMsg.toLowerCase().includes('duplicat') || errorMsg.toLowerCase().includes('already exists'))) {
      logger.warn(`⚠️ [${recordArcId}] Zucchetti ${action} su ${company}: Add fallito (entità già presente). Tento fallback in Update...`);
      const fallbackPayload = payload.replace(/<Add_/g, '<Upd_').replace(/<\/Add_/g, '</Upd_');
      await zucchettiClient.importData(token, fallbackPayload, company);
      return;
    }

    throw err;
  }
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

  const xmlContiObj: any = {
    AHR_REQUEST: {
      AHR_REQUEST_d: { AHR_REQUEST_LOGIN: 'SERVLET' }
    }
  };
  const xmlAnagEsteseObj: any = {
    AHR_REQUEST: {
      AHR_REQUEST_d: { AHR_REQUEST_LOGIN: 'SERVLET' }
    }
  };

  if (isUpdate) {
    xmlContiObj.AHR_REQUEST.Upd_ADHOC_CONTI = { Upd_ADHOC_CONTI_d: adhocContiObj };
    xmlAnagEsteseObj.AHR_REQUEST.Upd_ADHOC_ANAGESTESE = { Upd_ADHOC_ANAGESTESE_d: adhocAnagEstese };
  } else {
    xmlContiObj.AHR_REQUEST.Add_ADHOC_CONTI = { Add_ADHOC_CONTI_d: { DescriNoZoom: descrizioneMax60, ...adhocContiObj } };
    xmlAnagEsteseObj.AHR_REQUEST.Add_ADHOC_ANAGESTESE = { Add_ADHOC_ANAGESTESE_d: adhocAnagEstese };
  }

  const xmlConti = xmlBuilder.build(xmlContiObj);
  const xmlAnagEstese = xmlBuilder.build(xmlAnagEsteseObj);

  // Salvataggio nel DB locale PENDING (si usa un oggettone misto per storico)
  const fullPayload = { conti: xmlContiObj, anagEstese: xmlAnagEsteseObj };
  await prisma.zelZucchettiCustomerQueue.upsert({
    where: { shopifyId },
    update: { arcId: targetArcId, xmlPayload: fullPayload, status: 'PENDING', updatedAt: new Date() },
    create: { shopifyId, arcId: targetArcId, xmlPayload: fullPayload, status: 'PENDING' }
  });

  try {
    if (!env.ENABLE_GLOBAL_WRITES) {
      logger.warn(`⚠️ ENABLE_GLOBAL_WRITES è false. Bypass invio anagrafica cliente a Zucchetti per sicurezza.`);
      logger.debug(`[Dry-Run] Pipeline Multi-Company saltata.`);
    } else {
      await zucchettiAuth.withToken(async (token) => {
        // ============================================
        // STEP 1: Creazione base in Izzo Distrib (A0002)
        // ============================================
        await zucchettiUpsert(token, 'ADHOC_CONTI', xmlConti, 'A0002', targetArcId);
        logger.info(`✅ [${targetArcId}] Cliente creato su A0002. Attesa 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ============================================
        // STEP 2: Estrazione Ancompanyid da A0002
        // ============================================
        const qRes = await zucchettiClient.query('zzna_clienti', { Ancodice: targetArcId }, 'A0002', { silent: true });
        let companyId = '';

        if (qRes && typeof qRes === 'object') {
          const parsed = qRes as any;
          const list = parsed.dataset || parsed.data || parsed.zzna_clienti || (Array.isArray(parsed) ? parsed : [parsed]);
          const records = Array.isArray(list) ? list : (list ? [list] : []);
          if (records.length > 0) companyId = records[0].Ancompanyid || records[0].ANCOMPANYID || records[0].ancompanyid;
        }

        if (!companyId) {
          throw new Error(`Impossibile estrarre Ancompanyid da A0002 per ${targetArcId}.`);
        }
        logger.info(`✅ [${targetArcId}] CompanyId estratto: ${companyId}. Scrittura AnagEstese su A0002...`);

        await zucchettiUpsert(token, 'ADHOC_ANAGESTESE', xmlAnagEstese, 'A0002', targetArcId);

        // ============================================
        // STEP 3: Scrittura in Izzo Software (A0001)
        // ============================================
        // A0001 richiede sempre applicationId="00009" e ANCATCON="CLIBE"
        const xmlContiA0001 = xmlConti.replace(/applicationId="[^"]+"/, 'applicationId="00009"').replace(/ANCATCON="[^"]+"/, 'ANCATCON="CLIBE"');
        await zucchettiUpsert(token, 'ADHOC_CONTI', xmlContiA0001, 'A0001', targetArcId);
        logger.info(`✅ [${targetArcId}] Multi-Company completato su A0001 per ADHOC_CONTI!`);

        await new Promise(resolve => setTimeout(resolve, 2000));
        await zucchettiUpsert(token, 'ADHOC_ANAGESTESE', xmlAnagEstese, 'A0001', targetArcId);
        logger.info(`✅ [${targetArcId}] Multi-Company completato su A0001 per ADHOC_ANAGESTESE!`);
      });
    }

    await prisma.zelShopifyCustomer.update({
      where: { shopifyId },
      data: { zucchettiArcId: targetArcId }
    });

    await prisma.zelZucchettiCustomerQueue.update({
      where: { shopifyId },
      data: { status: 'SYNCED', updatedAt: new Date(), lastError: null }
    });

    logger.info(`✅ Mapper Engine: Cliente ${shopifyId} sincronizzato (Multi-Company) in Zucchetti con ID: ${targetArcId}`);
  } catch (err: any) {
    logger.error(`❌ Mapper Engine: Errore Zucchetti per ${shopifyId} — ${err.message}`);
    
    await prisma.zelZucchettiCustomerQueue.update({
      where: { shopifyId },
      data: { status: 'ERROR', lastError: err.message, updatedAt: new Date() }
    });
    
    throw err;
  }
}

