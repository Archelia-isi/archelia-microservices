import { log as logger, env, isDatabaseSafeToWrite } from '@archelia/core';
import { prisma } from '@archelia/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { shopifyClient, shopifyDiscountService } from '@archelia/shopify';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function gql(query: string, variables: any = {}) {
  // SAFE MODE CHECK
  if (query.trim().toLowerCase().startsWith('mutation')) {
    if (!isDatabaseSafeToWrite()) {
      logger.info(`🛡️ [DRY-RUN] Intercettata GraphQL Mutation: ${query.split('(')[0]?.trim()}`, { module: 'auto-promo-brain', payload: variables });
      // Simuliamo la risposta di successo di Shopify
      return { 
        metaobjectCreate: { 
          metaobject: { id: `gid://shopify/Metaobject/dryrun-${Date.now()}`, handle: `dryrun-${Date.now()}` },
          userErrors: []
        } 
      };
    }
  }

  const res = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query, variables });
  if (res.errors) throw new Error('GraphQL Errors: ' + JSON.stringify(res.errors));
  return res.data;
}

const CREATE_METAOBJECT = `
  mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message }
    }
  }
`;

function getRandomItem(arr: any[]) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateAiSlogan(title: string, discount: number, type: 'Flash Deal' | 'Dead Stock' | 'Hourly Standard Deal'): Promise<{ titolo: string, desc: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
Sei un esperto copywriter per l'e-commerce di ferramenta "Archelia".
Stiamo scontando questo prodotto del ${discount}% (${type}): "${title}".
Scrivi:
1) Un titolo promozionale esplosivo (max 5 parole).
2) Una brevissima descrizione accattivante che crei FOMO (urgente, max 15 parole).

Rispondi SOLO in formato JSON:
{"titolo": "...", "desc": "..."}
`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    logger.warn(`Gemini ha fallito la generazione slogan. Fallback. Motivo: ${e.message}`, { module: 'ai-promo' });
  }
  return { titolo: `Offerta -${discount}%`, desc: `Acquista ora prima che finisca!` };
}

function getItalyTargetDateString(isToday: boolean): string {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
  const romeNow = new Date(nowStr);
  if (!isToday) romeNow.setDate(romeNow.getDate() + 1);
  return `${romeNow.getFullYear()}-${String(romeNow.getMonth() + 1).padStart(2, '0')}-${String(romeNow.getDate()).padStart(2, '0')}`;
}

function getItalyISOStringForHour(hourValue: number, isToday: boolean): string {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
  const romeNow = new Date(nowStr);
  if (!isToday) romeNow.setDate(romeNow.getDate() + 1); 
  
  const h = Math.floor(hourValue);
  const m = Math.round((hourValue - h) * 60);

  const yyyy = romeNow.getFullYear();
  const mm = String(romeNow.getMonth() + 1).padStart(2, '0');
  const dd = String(romeNow.getDate()).padStart(2, '0');
  
  const sampleTime = new Date(Date.UTC(yyyy, romeNow.getMonth(), romeNow.getDate(), 12, 0, 0));
  const romeSample = new Date(sampleTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const utcSample = new Date(sampleTime.toLocaleString('en-US', { timeZone: 'UTC' }));
  let diffMin = Math.round((romeSample.getTime() - utcSample.getTime()) / 60000);
  
  const sign = diffMin >= 0 ? '+' : '-';
  diffMin = Math.abs(diffMin);
  const oh = String(Math.floor(diffMin / 60)).padStart(2, '0');
  const om = String(diffMin % 60).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${sign}${oh}:${om}`;
}

async function fetchDynamicCandidates(
  baseWhere: any,
  initialMonths: number,
  targetBrands: string[],
  targetGroups: string[],
  targetFamilies: string[],
  targetCategories: string[],
  excludeSkus: string[] = [],
  minRequiredCount: number = 1
): Promise<any[]> {
  let offsetDays = initialMonths * 30; 
  if (offsetDays < 0) offsetDays = 0;
  
  while (true) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - offsetDays);

    let candidates = await prisma.product.findMany({
      where: {
        ...baseWhere,
        createdAt: { lte: limitDate }
      },
      select: { title: true, shopifyId: true, sku: true, stock: true, price: true, brand: true, productGroup: true, family: true, category: true }
    });

    if (excludeSkus.length > 0) candidates = candidates.filter((p: any) => !excludeSkus.includes(p.sku));
    if (targetBrands.length > 0) candidates = candidates.filter((p: any) => p.brand && targetBrands.includes(p.brand));
    if (targetGroups.length > 0) candidates = candidates.filter((p: any) => p.productGroup && targetGroups.includes(p.productGroup));
    if (targetFamilies.length > 0) candidates = candidates.filter((p: any) => p.family && targetFamilies.includes(p.family));
    if (targetCategories.length > 0) candidates = candidates.filter((p: any) => p.category && targetCategories.includes(p.category));

    if (candidates.length >= minRequiredCount) {
      if (offsetDays < initialMonths * 30) {
        logger.info(`⏳ Dynamic Threshold Fallback: Trovati ${candidates.length} prodotti (min richiesto: ${minRequiredCount}) scalando a ~${offsetDays} giorni di fermo residuo.`, { module: 'ai-promo' });
      }
      return candidates;
    }

    if (offsetDays <= 0) {
      if (candidates.length > 0) {
         logger.info(`⚠️ Fallback Esausto: Trovati solo ${candidates.length} prodotti utilizzabili su ${minRequiredCount} richiesti. Procedo comunque per evitare blocchi.`, { module: 'ai-promo' });
      }
      return candidates;
    }
    
    offsetDays -= 15;
    if (offsetDays < 0) offsetDays = 0;
  }
}

export async function runAiBrainCron(isManualToday: boolean = false) {
  logger.info('🧠 Avvio Motore AI (AutoPromo Brain)...', { module: 'ai-promo' });

  const settings = await prisma.autoPromoSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings || !settings.isActive) {
    logger.info('⛔ AutoPromo Engine SPENTO nelle impostazioni. Esco.', { module: 'ai-promo' });
    return;
  }

  let {
    deadStockDiscount, deadStockMonths, deadStockItemCount, flashDealDiscount, flashDealsPerDay,
    flashDealDurations, flashDealHours,
    standardHourlyDiscount, standardHourlyPerDay, standardHourlyMonths, standardHourlyDurations, standardHourlyHours,
    blacklistedCategories, sloganMode, staticSlogans,
    dailyDealsEnabled, flashDealsEnabled, standardHourlyEnabled,
    dailyTargetBrands, dailyTargetGroups, dailyTargetFamilies, dailyTargetCategories,
    flashTargetBrands, flashTargetGroups, flashTargetFamilies, flashTargetCategories,
    stdTargetBrands, stdTargetGroups, stdTargetFamilies, stdTargetCategories,
    aiAutopilotEnabled, aiPrioritySkus
  } = settings;

  const targetDateStr = getItalyTargetDateString(isManualToday);

  const GET_ACTIVE = `
    query {
      orario: metaobjects(type: "archelia_orario", first: 50) {
        edges { node { fields { key value } } }
      }
      giornaliero: metaobjects(type: "archelia_giornaliero", first: 50) {
        edges { node { fields { key value } } }
      }
      promozione: metaobjects(type: "archelia_promozione", first: 50) {
        edges { node { fields { key value reference { ... on Collection { id } } } } }
      }
    }
  `;
  let activeDataPayload: any = null;
  try {
    const activeData = await gql(GET_ACTIVE);
    activeDataPayload = activeData;
    if (dailyDealsEnabled) {
      const hasDaily = activeData.giornaliero.edges.some((e: any) => {
        const val = e.node.fields.find((f: any) => f.key === 'giorno_di_validita')?.value;
        return val === targetDateStr;
      });
      if (hasDaily) {
        if (isManualToday) logger.info(`⚠️ Daily Deal trovato per il ${targetDateStr}, ma procedo lo stesso (Forza Manuale).`, { module: 'ai-promo' });
        else {
          logger.info(`🚫 Daily Deal già presente per il ${targetDateStr}. Skippo generazione per evitare duplicati.`, { module: 'ai-promo' });
          dailyDealsEnabled = false;
        }
      }
    }
    if (flashDealsEnabled || standardHourlyEnabled) {
      const hasOrario = activeData.orario.edges.some((e: any) => {
        const val = e.node.fields.find((f: any) => f.key === 'inizio')?.value;
        return val && val.startsWith(targetDateStr);
      });
      if (hasOrario) {
        if (isManualToday) logger.info(`⚠️ Offerte trovate per il ${targetDateStr}, ma procedo lo stesso (Forza Manuale).`, { module: 'ai-promo' });
        else {
          logger.info(`🚫 Offerte a Tempo/Flash già presenti per il ${targetDateStr}. Skippo generazione per evitare duplicati.`, { module: 'ai-promo' });
          flashDealsEnabled = false;
          standardHourlyEnabled = false;
        }
      }
    }
    if (!dailyDealsEnabled && !flashDealsEnabled && !standardHourlyEnabled) {
      logger.info('🛑 Tutte le promozioni per domani sono già state generate. Uscita sicura.', { module: 'ai-promo' });
      return;
    }
  } catch (e: any) {
    logger.error('Errore durante check idempotenza: ' + e.message, { module: 'ai-promo' });
  }

  let allCandidates: any[] = [];
  if (dailyDealsEnabled || flashDealsEnabled || standardHourlyEnabled) {
    allCandidates = await prisma.product.findMany({
      where: {
        publishedOnWeb: true,
        stock: { gte: 3 },
        shopifyId: { not: null },
        shopifyStatus: 'ACTIVE',
        ...(blacklistedCategories.length > 0 ? { category: { notIn: blacklistedCategories } } : {}),
        ...(blacklistedCategories.length > 0 ? { family: { notIn: blacklistedCategories } } : {})
      },
      select: { title: true, shopifyId: true, sku: true, stock: true, price: true, brand: true, productGroup: true, family: true, category: true, soldCount: true }
    });
  }

  const globalBlacklistSkus: string[] = [];

  if (activeDataPayload?.promozione?.edges) {
    for (const edge of activeDataPayload.promozione.edges) {
      const f: any = {};
      for (const field of edge.node.fields) {
        if (field) f[field.key] = field;
      }
      
      if (f.attivo?.value !== 'true') continue;
      if (f.data_inizio?.value && f.data_inizio.value > targetDateStr) continue;
      if (f.data_fine?.value && f.data_fine.value < targetDateStr) continue;

      if (f.prodotti_target?.value) {
        try {
          const targetGids = JSON.parse(f.prodotti_target.value);
          for (const gid of targetGids) {
            const found = allCandidates.find(c => c.shopifyId === gid);
            if (found && !globalBlacklistSkus.includes(found.sku)) globalBlacklistSkus.push(found.sku);
          }
        } catch(e) {}
      }

      if (f.prodotti_regalo?.value) {
        try {
          const regaliGids = JSON.parse(f.prodotti_regalo.value);
          for (const gid of regaliGids) {
            const found = allCandidates.find(c => c.shopifyId === gid);
            if (found && !globalBlacklistSkus.includes(found.sku)) globalBlacklistSkus.push(found.sku);
          }
        } catch(e) {}
      }

      const collId = f.collezione_target?.reference?.id;
      if (collId) {
        try {
          let hasNextCollPage = true;
          let collCursor: string | null = null;
          while (hasNextCollPage) {
            const cursorInsert = collCursor ? `, after: "${collCursor}"` : '';
            const COLL_QUERY = `query { collection(id: "${collId}") { products(first: 250${cursorInsert}) { pageInfo { hasNextPage endCursor } edges { node { id } } } } }`;
            const collData = await gql(COLL_QUERY);
            
            const productsInColl = collData.collection?.products?.edges || [];
            for (const p of productsInColl) {
              const found = allCandidates.find(c => c.shopifyId === p.node.id);
              if (found && !globalBlacklistSkus.includes(found.sku)) globalBlacklistSkus.push(found.sku);
            }
            
            hasNextCollPage = collData.collection?.products?.pageInfo?.hasNextPage || false;
            collCursor = collData.collection?.products?.pageInfo?.endCursor || null;
          }
        } catch (e: any) { }
      }
    }
  }

  if (activeDataPayload?.orario?.edges) {
    for (const edge of activeDataPayload.orario.edges) {
      const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
      if (f.prodotto) {
         const found = allCandidates.find(c => c.shopifyId === f.prodotto);
         if (found && !globalBlacklistSkus.includes(found.sku)) globalBlacklistSkus.push(found.sku);
      }
    }
  }
  if (activeDataPayload?.giornaliero?.edges) {
    for (const edge of activeDataPayload.giornaliero.edges) {
      const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
      if (f.prodotti) {
         try {
           const arr = JSON.parse(f.prodotti);
           for (const gid of arr) {
             const found = allCandidates.find(c => c.shopifyId === gid);
             if (found && !globalBlacklistSkus.includes(found.sku)) globalBlacklistSkus.push(found.sku);
           }
         } catch(e) {}
      }
    }
  }

  if (globalBlacklistSkus.length > 0) {
    logger.info(`🛡️ Blacklist Iniziale Completa: Esclusi ${globalBlacklistSkus.length} SKU attualmente presenti in Promozioni (Manuali, Orarie o Giornaliere).`, { module: 'ai-promo' });
  }

  let availableAiCandidates: any[] = [];
  if (aiAutopilotEnabled && aiPrioritySkus && aiPrioritySkus.length > 0) {
    availableAiCandidates = allCandidates
      .filter(c => aiPrioritySkus.includes(c.sku) || aiPrioritySkus.includes(c.title))
      .filter(c => !globalBlacklistSkus.includes(c.sku));
      
    if (availableAiCandidates.length > 0) {
      logger.info(`🤖 AI Autopilot iniezione: trovati ${availableAiCandidates.length} SKU prioritari idonei per le promozioni!`, { module: 'ai-promo' });
    }
  }

  let pickedFlashes: any[] = [];

  // ─── DAILY DEALS ───
  if (dailyDealsEnabled) {
    let dailyBaseWhere = {
      publishedOnWeb: true,
      stock: { gte: 3 },
      shopifyId: { not: null },
      shopifyStatus: 'ACTIVE',
      ...(blacklistedCategories.length > 0 ? { category: { notIn: blacklistedCategories } } : {}),
      ...(blacklistedCategories.length > 0 ? { family: { notIn: blacklistedCategories } } : {})
    };

    let dailyBaseCountCandidates = allCandidates;
    if (dailyTargetBrands.length > 0) dailyBaseCountCandidates = dailyBaseCountCandidates.filter(p => p.brand && dailyTargetBrands.includes(p.brand));
    if (dailyTargetGroups.length > 0) dailyBaseCountCandidates = dailyBaseCountCandidates.filter(p => p.productGroup && dailyTargetGroups.includes(p.productGroup));
    if (dailyTargetFamilies.length > 0) dailyBaseCountCandidates = dailyBaseCountCandidates.filter(p => p.family && dailyTargetFamilies.includes(p.family));
    if (dailyTargetCategories.length > 0) dailyBaseCountCandidates = dailyBaseCountCandidates.filter(p => p.category && dailyTargetCategories.includes(p.category));

    const dynamicMinDaily = Math.max(deadStockItemCount, Math.ceil(dailyBaseCountCandidates.length * 0.20));

    const dailyCandidates = await fetchDynamicCandidates(
      dailyBaseWhere,
      deadStockMonths,
      dailyTargetBrands,
      dailyTargetGroups,
      dailyTargetFamilies,
      dailyTargetCategories,
      globalBlacklistSkus, 
      dynamicMinDaily 
    );

    const neededDaily = deadStockItemCount;
    const aiForDaily = availableAiCandidates.splice(0, Math.ceil(neededDaily * 0.5));
    let dailyRand = dailyCandidates.filter((c: any) => !aiForDaily.some((ai: any) => ai.sku === c.sku));
    dailyRand = dailyRand.sort(() => 0.5 - Math.random()).slice(0, neededDaily - aiForDaily.length);
    
    const dailyDealPool = [...aiForDaily, ...dailyRand].sort((a, b) => (a.soldCount || 0) - (b.soldCount || 0));
    
    if (dailyDealPool.length > 0) {
      dailyDealPool.forEach(p => { if (!globalBlacklistSkus.includes(p.sku)) globalBlacklistSkus.push(p.sku); });
      logger.info(`Generazione Daily Deal con ${dailyDealPool.length} prodotti (sconto ${deadStockDiscount}%)...`, { module: 'ai-promo' });
      
      let copy = { titolo: "Svuotatutto Magazzino", desc: "Occasione del giorno irripetibile!" };
      if (sloganMode === 'STATIC') {
        const s = getRandomItem(staticSlogans);
        if (s) { copy.titolo = s; copy.desc = "Offerta limitata"; }
      } else {
        copy = await generateAiSlogan("Selezione di 10 prodotti Bestseller", deadStockDiscount, "Dead Stock");
      }

      const gids = dailyDealPool.map(p => p.shopifyId);
      const finalDateStr = getItalyTargetDateString(isManualToday);

      const moResponse = await gql(CREATE_METAOBJECT, {
        metaobject: {
          type: "archelia_giornaliero",
          capabilities: { publishable: { status: "ACTIVE" } },
          fields: [
            { key: "slogan", value: `${copy.titolo} - ${copy.desc}` },
            { key: "prodotti", value: JSON.stringify(gids) },
            { key: "sconto", value: deadStockDiscount.toString() },
            { key: "giorno_di_validita", value: finalDateStr }
          ]
        }
      });
      
      const moId = moResponse?.metaobjectCreate?.metaobject?.id;
      if (moId) {
        try {
          const sAt = `${finalDateStr}T00:00:00+01:00`;
          const eAt = `${finalDateStr}T23:59:59+01:00`;
          const pct = deadStockDiscount / 100;
          await shopifyDiscountService.createAutomaticBasicDiscount({
             title: copy.titolo, metaobjectId: moId, startsAt: sAt, endsAt: eAt, percentage: pct, productGids: gids
          });

          await prisma.aiPromoEvent.create({
            data: {
              promoType: 'DAILY_DEAL',
              title: copy.titolo,
              description: copy.desc,
              discount: deadStockDiscount,
              productGids: gids,
              shopifyMetaId: moId,
              startsAt: new Date(sAt),
              endsAt: new Date(eAt)
            }
          });
        } catch (e: any) {
          logger.error(`Fallita schedulazione Sconto Nativo o DB per Daily Deal: ${e.message}`, { module: 'ai-promo' });
        }
      }
    }
  }

  // ─── FLASH DEALS ───
  if (flashDealsEnabled) {
    let flashCandidates = allCandidates.filter(p => !globalBlacklistSkus.includes(p.sku) && p.price >= 30 && p.price <= 99 && p.stock >= 1);
    
    if (flashTargetBrands.length > 0) flashCandidates = flashCandidates.filter(p => p.brand && flashTargetBrands.includes(p.brand));
    if (flashTargetGroups.length > 0) flashCandidates = flashCandidates.filter(p => p.productGroup && flashTargetGroups.includes(p.productGroup));
    if (flashTargetFamilies.length > 0) flashCandidates = flashCandidates.filter(p => p.family && flashTargetFamilies.includes(p.family));
    if (flashTargetCategories.length > 0) flashCandidates = flashCandidates.filter(p => p.category && flashTargetCategories.includes(p.category));

    const neededFlash = flashDealsPerDay;
    const aiForFlash = availableAiCandidates.splice(0, Math.ceil(neededFlash * 0.5));
    let flashRand = flashCandidates.filter((c: any) => !aiForFlash.some((ai: any) => ai.sku === c.sku));
    flashRand = flashRand.sort(() => 0.5 - Math.random()).slice(0, neededFlash - aiForFlash.length);

    pickedFlashes = [...aiForFlash, ...flashRand].sort((a, b) => (a.soldCount || 0) - (b.soldCount || 0));

    if (pickedFlashes.length > 0) {
      pickedFlashes.forEach(p => { if (!globalBlacklistSkus.includes(p.sku)) globalBlacklistSkus.push(p.sku); });
      logger.info(`Pianificazione di ${pickedFlashes.length} Flash Deals per domani (sconto ${flashDealDiscount}%)...`, { module: 'ai-promo' });

      const basiOrarie = flashDealHours.split(',').map(h => parseFloat(h.trim())).filter(h => !isNaN(h));
      if (basiOrarie.length === 0) basiOrarie.push(10);

      const basiDurate = flashDealDurations.split(',').map(d => parseFloat(d.trim())).filter(d => !isNaN(d));
      if (basiDurate.length === 0) basiDurate.push(1);

      for (let i = 0; i < pickedFlashes.length; i++) {
        const prod = pickedFlashes[i];
        const hour = basiOrarie[i % basiOrarie.length];
        const duration = basiDurate[i % basiDurate.length];
        
        const inizioIso = getItalyISOStringForHour(hour, isManualToday);
        const fineIso = getItalyISOStringForHour(hour + duration, isManualToday);

        let copy = { titolo: "Offertissima Lampo", desc: "1 Solo Pezzo Disponibile!" };
        if (sloganMode === 'STATIC') {
          const s = getRandomItem(staticSlogans);
          if (s) { copy.titolo = s; copy.desc = "Vendita lampo. 1 pezzo residuo."; }
        } else {
          copy = await generateAiSlogan(prod.title || prod.sku, flashDealDiscount, "Flash Deal");
        }

        const moResponse = await gql(CREATE_METAOBJECT, {
          metaobject: {
            type: "archelia_orario",
            capabilities: { publishable: { status: "ACTIVE" } },
            fields: [
              { key: "slogan", value: `[FLASH] ${copy.titolo} - ${copy.desc}` },
              { key: "prodotto", value: prod.shopifyId },
              { key: "sconto", value: flashDealDiscount.toString() },
              { key: "inizio", value: inizioIso },
              { key: "fine", value: fineIso }
            ]
          }
        });
        
        const moId = moResponse?.metaobjectCreate?.metaobject?.id;
        if (moId) {
          try {
            const pct = flashDealDiscount / 100;
            await shopifyDiscountService.createAutomaticBasicDiscount({
               title: copy.titolo, metaobjectId: moId, startsAt: inizioIso, endsAt: fineIso, percentage: pct, productGids: [prod.shopifyId]
            });

            await prisma.aiPromoEvent.create({
              data: {
                promoType: 'FLASH_DEAL',
                title: copy.titolo,
                description: copy.desc,
                discount: flashDealDiscount,
                productGids: [prod.shopifyId],
                shopifyMetaId: moId,
                startsAt: new Date(inizioIso),
                endsAt: new Date(fineIso)
              }
            });
          } catch (e: any) {
            logger.error(`Fallita schedulazione Sconto Nativo o DB per Flash Deal: ${e.message}`, { module: 'ai-promo' });
          }
        }
      }
    }
  }

  // ─── HOURLY DEALS NORMALI ───
  if (standardHourlyEnabled) {
    const stdBaseWhere = {
      publishedOnWeb: true,
      price: { gte: 30 },
      stock: { gte: 3 },
      NOT: { shopifyId: null },
      shopifyStatus: 'ACTIVE',
      ...(blacklistedCategories.length > 0 ? { category: { notIn: blacklistedCategories } } : {}),
      ...(blacklistedCategories.length > 0 ? { family: { notIn: blacklistedCategories } } : {})
    };
    
    let baseStdCandidates = allCandidates.filter(p => p.price >= 30);
    if (stdTargetBrands.length > 0) baseStdCandidates = baseStdCandidates.filter(p => p.brand && stdTargetBrands.includes(p.brand));
    if (stdTargetGroups.length > 0) baseStdCandidates = baseStdCandidates.filter(p => p.productGroup && stdTargetGroups.includes(p.productGroup));
    if (stdTargetFamilies.length > 0) baseStdCandidates = baseStdCandidates.filter(p => p.family && stdTargetFamilies.includes(p.family));
    if (stdTargetCategories.length > 0) baseStdCandidates = baseStdCandidates.filter(p => p.category && stdTargetCategories.includes(p.category));

    baseStdCandidates = baseStdCandidates.filter(p => !globalBlacklistSkus.includes(p.sku));
    const dynamicMinStd = Math.max(standardHourlyPerDay, Math.ceil(baseStdCandidates.length * 0.20));

    const pickedStdHourlyAll = await fetchDynamicCandidates(
      stdBaseWhere,
      standardHourlyMonths,
      stdTargetBrands,
      stdTargetGroups,
      stdTargetFamilies,
      stdTargetCategories,
      globalBlacklistSkus, 
      dynamicMinStd 
    );

    const neededStd = standardHourlyPerDay;
    const aiForStd = availableAiCandidates.splice(0, Math.ceil(neededStd * 0.5));
    let stdRand = pickedStdHourlyAll.filter((c: any) => !aiForStd.some((ai: any) => ai.sku === c.sku));
    stdRand = stdRand.sort(() => 0.5 - Math.random()).slice(0, neededStd - aiForStd.length);

    const pickedStdHourly = [...aiForStd, ...stdRand].sort((a, b) => (a.soldCount || 0) - (b.soldCount || 0));

    if (pickedStdHourly.length > 0) {
      logger.info(`Pianificazione di ${pickedStdHourly.length} Promo Orarie (Svuotamagazzino) per domani...`, { module: 'ai-promo' });

      const basiOrarieStd = standardHourlyHours.split(',').map(h => parseFloat(h.trim())).filter(h => !isNaN(h));
      if (basiOrarieStd.length === 0) basiOrarieStd.push(11);

      const basiDurateStd = standardHourlyDurations.split(',').map(d => parseFloat(d.trim())).filter(d => !isNaN(d));
      if (basiDurateStd.length === 0) basiDurateStd.push(1);

      for (let i = 0; i < pickedStdHourly.length; i++) {
        const prod = pickedStdHourly[i];
        const hour = basiOrarieStd[i % basiOrarieStd.length];
        const duration = basiDurateStd[i % basiDurateStd.length];
        
        const inizioIso = getItalyISOStringForHour(hour, isManualToday);
        const fineIso = getItalyISOStringForHour(hour + duration, isManualToday);

        let copy = { titolo: "Svuotatutto Magazzino", desc: "Offerta a Tempo Limitato!" };
        if (sloganMode === 'STATIC') {
          const s = getRandomItem(staticSlogans);
          if (s) { copy.titolo = s; copy.desc = "Prezzo tagliato per poche ore."; }
        } else {
          copy = await generateAiSlogan(prod.title || prod.sku, standardHourlyDiscount, "Hourly Standard Deal");
        }

        const moResponse = await gql(CREATE_METAOBJECT, {
          metaobject: {
            type: "archelia_orario",
            capabilities: { publishable: { status: "ACTIVE" } },
            fields: [
              { key: "slogan", value: `${copy.titolo} - ${copy.desc}` },
              { key: "prodotto", value: prod.shopifyId },
              { key: "sconto", value: standardHourlyDiscount.toString() },
              { key: "inizio", value: inizioIso },
              { key: "fine", value: fineIso }
            ]
          }
        });
        
        const moId = moResponse?.metaobjectCreate?.metaobject?.id;
        if (moId) {
          try {
            const pct = standardHourlyDiscount / 100;
            await shopifyDiscountService.createAutomaticBasicDiscount({
               title: copy.titolo, metaobjectId: moId, startsAt: inizioIso, endsAt: fineIso, percentage: pct, productGids: [prod.shopifyId]
            });

            await prisma.aiPromoEvent.create({
              data: {
                promoType: 'STANDARD_HOURLY',
                title: copy.titolo,
                description: copy.desc,
                discount: standardHourlyDiscount,
                productGids: [prod.shopifyId],
                shopifyMetaId: moId,
                startsAt: new Date(inizioIso),
                endsAt: new Date(fineIso)
              }
            });
          } catch (e: any) {
            logger.error(`Fallita schedulazione Sconto Nativo o DB per Standard Hourly Deal: ${e.message}`, { module: 'ai-promo' });
          }
        }
      }
    }
  }

  logger.info('🧠 Cervello AI: Tutte le schedulazioni per domani sono state trasmesse a Shopify con successo.', { module: 'ai-promo' });
  return { success: true };
}

export async function triggerImmediateFlashDeal() {
  logger.info('🧪 TEST MODE: Forzo la creazione di 1 Flash Deal con scadenza immediata.', { module: 'ai-promo' });

  const settings = await prisma.autoPromoSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings || !settings.isActive) {
    throw new Error('AutoPromo Engine SPENTO. Accendilo dalla Dashboard prima di testare.');
  }

  const { flashDealDiscount, flashDealDurations, sloganMode, staticSlogans } = settings;

  const basiDurate = (flashDealDurations || "1").split(',').map(d => parseFloat(d.trim())).filter(d => !isNaN(d));
  const baseDuration = basiDurate.length > 0 ? basiDurate[0] : 1;

  const allCandidates = await prisma.product.findMany({
    where: { publishedOnWeb: true, price: { gte: 30, lte: 99 }, stock: { gte: 1 }, shopifyId: { not: null }, shopifyStatus: 'ACTIVE' },
    take: 10,
    select: { title: true, shopifyId: true, sku: true, stock: true, price: true }
  });

  const prod = allCandidates.sort(() => 0.5 - Math.random())[0];
  if (!prod) throw new Error('Nessun prodotto compatibile trovato (Prezzo 30-99€, Stock > 0).');

  const now = new Date();
  const tInizio = new Date(now.getTime() + 1000 * 60);
  const tFine = new Date(tInizio.getTime() + 1000 * 60 * 60 * baseDuration);

  let copy = { titolo: "Offertissima Lampo", desc: "1 Solo Pezzo Disponibile!" };
  if (sloganMode === 'STATIC') {
    const s = getRandomItem(staticSlogans);
    if (s) { copy.titolo = s; copy.desc = "Vendita lampo. 1 pezzo residuo."; }
  } else {
    copy = await generateAiSlogan(prod.title || prod.sku, flashDealDiscount, "Flash Deal");
  }

  const moResponse = await gql(CREATE_METAOBJECT, {
    metaobject: {
      type: "archelia_orario",
      capabilities: { publishable: { status: "ACTIVE" } },
      fields: [
        { key: "slogan", value: `[FLASH] ${copy.titolo} - ${copy.desc}` },
        { key: "prodotto", value: prod.shopifyId },
        { key: "sconto", value: flashDealDiscount.toString() },
        { key: "inizio", value: tInizio.toISOString() },
        { key: "fine", value: tFine.toISOString() }
      ]
    }
  });

  const moId = moResponse?.metaobjectCreate?.metaobject?.id;
  if (moId) {
    try {
      const pct = flashDealDiscount / 100;
      await shopifyDiscountService.createAutomaticBasicDiscount({
          title: copy.titolo, metaobjectId: moId, startsAt: tInizio.toISOString(), endsAt: tFine.toISOString(), percentage: pct, productGids: [prod.shopifyId as string]
      });

      await prisma.aiPromoEvent.create({
        data: {
          promoType: 'FLASH_DEAL',
          title: copy.titolo,
          description: copy.desc,
          discount: flashDealDiscount,
          productGids: [prod.shopifyId as string],
          shopifyMetaId: moId,
          startsAt: tInizio,
          endsAt: tFine
        }
      });
    } catch (e: any) {
      logger.error(`Fallita schedulazione Sconto Nativo o DB per Test Flash Deal: ${e.message}`, { module: 'ai-promo' });
    }
  }

  return { success: true, message: `✅ Flash Deal creato: ${prod.sku} | Gemini: "${copy.titolo}"` };
}
