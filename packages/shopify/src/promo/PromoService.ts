import { shopifyClient } from '../client.js';
import { log as logger, env } from '@archelia/core';
import { prisma } from '@archelia/database';
import { shopifyDiscountService } from './DiscountService.js';

export interface ShopifyPromoPayload {
  tipo: string;
  titolo: string;
  attivo?: boolean;
  badge_testo?: string;
  badge_colore?: string;
  descrizione?: string;
  codice_sconto?: string;
  collezione_target: string;
  prodotti_target_sku?: string[];
  prodotti_target_gid?: string[]; // Valorizzato dopo la query a DB
  prodotti_regalo_sku?: string[];
  prodotti_regalo_gid?: string[]; // Valorizzato dopo la query a DB
  link_cta?: string;
  testo_cta?: string;
  sconto_percentuale?: number;
  mostra_in_strip: boolean;
  mostra_in_banner: boolean;
  data_inizio: string;
  data_fine: string;
}

export interface TypesensePromoData {
  is_in_promo: boolean;
  promo_type?: string;
  promo_discount?: number;
  promo_slogan?: string;
  promo_badge?: string;
  promo_badge_color?: string;
  promo_start?: string;
  promo_end?: string;
}

/**
 * Funzioni GraphQL per le Promozioni.
 */
export class ShopifyPromoService {

  private promoCache: Map<string, TypesensePromoData> | null = null;
  private promoCacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

  /**
   * Costruisce il JSON-String array per il fieldDefinitions del metaobject
   */
  private buildMetaobjectFields(data: ShopifyPromoPayload) {
    const fields: any[] = [];
    const addField = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        fields.push({ key, value: String(value) });
      }
    };

    addField('tipo', data.tipo);
    addField('titolo', data.titolo);
    
    // Attivo di default se non esplicitato (dipende boolean API)
    const attivoStr = data.attivo !== false ? "true" : "false";
    fields.push({ key: 'attivo', value: attivoStr });
    
    addField('badge_testo', data.badge_testo);
    addField('badge_colore', data.badge_colore);
    addField('descrizione', data.descrizione);
    addField('codice_sconto', data.codice_sconto);
    addField('collezione_target', data.collezione_target);
    
    if (data.prodotti_target_gid && data.prodotti_target_gid.length > 0) {
      fields.push({ key: 'prodotti_target', value: JSON.stringify(data.prodotti_target_gid) });
    }

    if (data.prodotti_regalo_gid && data.prodotti_regalo_gid.length > 0) {
      fields.push({ key: 'prodotti_regalo', value: JSON.stringify(data.prodotti_regalo_gid) });
    }

    // Shopify Url validation requires absolute domains, relative paths fail empty schema checks
    if (data.link_cta && data.link_cta.trim() !== '') {
      let finalUrl = data.link_cta.trim();
      if (finalUrl.startsWith('/')) {
        finalUrl = `https://${env.SHOPIFY_STORE_URL}${finalUrl}`;
      } else if (!/^(https?|mailto|tel|sms):/i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }
      addField('link_cta', finalUrl);
    }

    addField('testo_cta', data.testo_cta);
    if (data.sconto_percentuale) addField('sconto_percentuale', data.sconto_percentuale);
    
    fields.push({ key: 'mostra_in_strip', value: data.mostra_in_strip ? "true" : "false" });
    fields.push({ key: 'mostra_in_banner', value: data.mostra_in_banner ? "true" : "false" });
    
    // Date: YYYY-MM-DD
    addField('data_inizio', data.data_inizio);
    addField('data_fine', data.data_fine);

    return fields;
  }

  /**
   * Recupera tutti gli SKU impegnati in promozioni attive (Manuali, Flash, Daily, Hourly)
   */
  async getBusySkus(): Promise<string[]> {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
    const romeNow = new Date(nowStr);
    const targetDateStr = `${romeNow.getFullYear()}-${String(romeNow.getMonth() + 1).padStart(2, '0')}-${String(romeNow.getDate()).padStart(2, '0')}`;

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

    const activeData = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query: GET_ACTIVE });
    const activeDataPayload = activeData?.data;
    if (!activeDataPayload) return [];

    const busyGids: Set<string> = new Set();
    const busySkus: string[] = [];

    // ─── ESTRAZIONE CANDIDATI GLOBALI ───
    const allCandidates = await prisma.product.findMany({
      where: { shopifyId: { not: null } },
      select: { shopifyId: true, sku: true }
    });

    const addGid = (gid: string) => {
      busyGids.add(gid);
      const found = allCandidates.find(c => c.shopifyId === gid);
      if (found && !busySkus.includes(found.sku)) busySkus.push(found.sku);
    };

    // ─── 1. PROMOZIONI MANUALI ───
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
            const gids = JSON.parse(f.prodotti_target.value);
            for (const gid of gids) addGid(gid);
          } catch(e) {}
        }
        if (f.prodotti_regalo?.value) {
          try {
            const gids = JSON.parse(f.prodotti_regalo.value);
            for (const gid of gids) addGid(gid);
          } catch(e) {}
        }

        const collId = f.collezione_target?.reference?.id;
        if (collId) {
          try {
            let hasNextCollPage = true;
            let collCursor: string | null = null;
            while (hasNextCollPage) {
              const cursorInsert: string = collCursor ? `, after: "${collCursor}"` : '';
              const COLL_QUERY: string = `query { collection(id: "${collId}") { products(first: 250${cursorInsert}) { pageInfo { hasNextPage endCursor } edges { node { id } } } } }`;
              const collResponse = await shopifyClient.post<{ data: any }>('/graphql.json', { query: COLL_QUERY });
              const collData = collResponse;
              const productsInColl = collData?.data?.collection?.products?.edges || [];
              for (const p of productsInColl) {
                if (p.node.id) addGid(p.node.id);
              }
              hasNextCollPage = collData?.data?.collection?.products?.pageInfo?.hasNextPage || false;
              collCursor = collData?.data?.collection?.products?.pageInfo?.endCursor || null;
            }
          } catch (e: any) {
             // Silently ignore collection fetch errors in block aggregation
          }
        }
      }
    }

    // ─── 2. PROMOZIONI ORARIE / GIORNALIERE ───
    if (activeDataPayload?.orario?.edges) {
      for (const edge of activeDataPayload.orario.edges) {
        const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
        if (f.prodotto) addGid(f.prodotto);
      }
    }
    if (activeDataPayload?.giornaliero?.edges) {
      for (const edge of activeDataPayload.giornaliero.edges) {
        const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
        if (f.prodotti) {
           try {
             const gids = JSON.parse(f.prodotti);
             for (const gid of gids) addGid(gid);
           } catch(e) {}
        }
      }
    }

    return busySkus;
  }

  /**
   * Recupera una mappa di tutti i GID prodotto attualmente in promozione con i relativi dettagli promozionali.
   * Utilizzato principalmente per arricchire i dati inviati a Typesense.
   */
  async getActivePromosMap(useCache: boolean = true): Promise<Map<string, TypesensePromoData>> {
    const nowTimestamp = Date.now();
    if (useCache && this.promoCache && (nowTimestamp - this.promoCacheTimestamp < this.CACHE_TTL_MS)) {
      return this.promoCache;
    }

    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
    const romeNow = new Date(nowStr);
    const targetDateStr = `${romeNow.getFullYear()}-${String(romeNow.getMonth() + 1).padStart(2, '0')}-${String(romeNow.getDate()).padStart(2, '0')}`;

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

    const promoMap = new Map<string, TypesensePromoData>();

    try {
      const activeData = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query: GET_ACTIVE });
      const activeDataPayload = activeData?.data;
      if (!activeDataPayload) return promoMap;

      const addPromoData = (gid: string, data: TypesensePromoData) => {
        if (!promoMap.has(gid)) {
          promoMap.set(gid, data);
        }
      };

      // 1. PROMOZIONI MANUALI
      if (activeDataPayload?.promozione?.edges) {
        for (const edge of activeDataPayload.promozione.edges) {
          const f: any = {};
          for (const field of edge.node.fields) {
            if (field) f[field.key] = field;
          }
          if (f.attivo?.value !== 'true') continue;
          if (f.data_inizio?.value && f.data_inizio.value > targetDateStr) continue;
          if (f.data_fine?.value && f.data_fine.value < targetDateStr) continue;

          const promoData: TypesensePromoData = {
            is_in_promo: true,
            promo_type: 'MANUAL',
            promo_discount: f.sconto_percentuale?.value ? parseFloat(f.sconto_percentuale.value) : undefined,
            promo_slogan: f.titolo?.value || '',
            promo_badge: f.badge_testo?.value || '',
            promo_badge_color: f.badge_colore?.value || '',
            promo_start: f.data_inizio?.value || '',
            promo_end: f.data_fine?.value || ''
          };

          if (f.prodotti_target?.value) {
            try {
              const gids = JSON.parse(f.prodotti_target.value);
              for (const gid of gids) addPromoData(gid, promoData);
            } catch(e) {}
          }
          if (f.prodotti_regalo?.value) {
            try {
              const gids = JSON.parse(f.prodotti_regalo.value);
              for (const gid of gids) addPromoData(gid, promoData);
            } catch(e) {}
          }

          const collId = f.collezione_target?.reference?.id;
          if (collId) {
            try {
              let hasNextCollPage = true;
              let collCursor: string | null = null;
              while (hasNextCollPage) {
                const cursorInsert: string = collCursor ? `, after: "${collCursor}"` : '';
                const COLL_QUERY: string = `query { collection(id: "${collId}") { products(first: 250${cursorInsert}) { pageInfo { hasNextPage endCursor } edges { node { id } } } } }`;
                const collResponse = await shopifyClient.post<{ data: any }>('/graphql.json', { query: COLL_QUERY });
                const productsInColl = collResponse?.data?.collection?.products?.edges || [];
                for (const p of productsInColl) {
                  if (p.node.id) addPromoData(p.node.id, promoData);
                }
                hasNextCollPage = collResponse?.data?.collection?.products?.pageInfo?.hasNextPage || false;
                collCursor = collResponse?.data?.collection?.products?.pageInfo?.endCursor || null;
              }
            } catch (e: any) { }
          }
        }
      }

      // 2. DAILY DEALS
      if (activeDataPayload?.giornaliero?.edges) {
        for (const edge of activeDataPayload.giornaliero.edges) {
          const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
          
          if (f.giorno_di_validita && f.giorno_di_validita !== targetDateStr) continue;

          const promoData: TypesensePromoData = {
            is_in_promo: true,
            promo_type: 'DAILY_DEAL',
            promo_discount: f.sconto ? parseFloat(f.sconto) : undefined,
            promo_slogan: f.slogan || '',
            promo_start: f.giorno_di_validita || '',
            promo_end: f.giorno_di_validita || ''
          };

          if (f.prodotti) {
             try {
               const gids = JSON.parse(f.prodotti);
               for (const gid of gids) addPromoData(gid, promoData);
             } catch(e) {}
          }
        }
      }

      // 3. FLASH / HOURLY DEALS
      if (activeDataPayload?.orario?.edges) {
        for (const edge of activeDataPayload.orario.edges) {
          const f = Object.fromEntries(edge.node.fields.map((x: any) => [x.key, x.value]));
          
          let isValidNow = true;
          if (f.inizio && f.fine) {
            const startDt = new Date(f.inizio);
            const endDt = new Date(f.fine);
            if (nowTimestamp < startDt.getTime() || nowTimestamp > endDt.getTime()) {
               isValidNow = false;
            }
          }

          if (!isValidNow) continue;

          const isFlash = f.slogan && f.slogan.includes('[FLASH]');
          
          const promoData: TypesensePromoData = {
            is_in_promo: true,
            promo_type: isFlash ? 'FLASH_DEAL' : 'STANDARD_HOURLY',
            promo_discount: f.sconto ? parseFloat(f.sconto) : undefined,
            promo_slogan: f.slogan || '',
            promo_start: f.inizio || '',
            promo_end: f.fine || ''
          };

          if (f.prodotto) addPromoData(f.prodotto, promoData);
        }
      }

      this.promoCache = promoMap;
      this.promoCacheTimestamp = Date.now();

    } catch (e: any) {
      logger.error('Error fetching active promos map: ' + e.message, { module: 'shopify-promo' });
    }

    return promoMap;
  }

  /**
   * Crea il Metaobject `archelia_promozione` su Shopify.
   */
  async createPromo(payload: ShopifyPromoPayload): Promise<any> {
    logger.info(`Preparazione payload creazione metaobject Promozione (tipo: ${payload.tipo})`, { module: 'shopify-promo' });

    const busySkus = await this.getBusySkus();

    // Validazione prodotti singoli via SKU se presenti
    if (payload.prodotti_target_sku && payload.prodotti_target_sku.length > 0) {
      const targetSkus = payload.prodotti_target_sku.map(s => s.toUpperCase());

      // HARD BLOCK: Controllo se gli SKU sono già impegnati
      const conflictingSkus = targetSkus.filter(sku => busySkus.includes(sku));
      if (conflictingSkus.length > 0) {
        throw new Error(`Impossibile procedere. I seguenti prodotti TARGET sono già impegnati in un'altra promozione attiva: ${conflictingSkus.join(', ')}`);
      }

      logger.info(`Verifica di ${targetSkus.length} SKU target su database Prisma...`, { module: 'shopify-promo' });
      const products = await prisma.product.findMany({
        where: { 
          OR: targetSkus.map(sku => ({ sku: { startsWith: sku } }))
        },
        select: { sku: true, shopifyId: true, shopifyStatus: true }
      });

      const invalidSkus: string[] = [];
      const validGids: Set<string> = new Set(); // Use Set for unique GIDs if matching multiple variants

      for (const sku of targetSkus) {
        const matched = products.filter((p: any) => p.sku.startsWith(sku));
        const validMatched = matched.filter((p: any) => p.shopifyId && p.shopifyStatus === 'ACTIVE');
        
        if (validMatched.length === 0) {
          invalidSkus.push(sku);
        } else {
          validMatched.forEach((p: any) => validGids.add(p.shopifyId));
        }
      }

      if (invalidSkus.length > 0) {
        const errMsg = `Impossibile procedere. I seguenti prodotti non sono idonei (sono in 'DRAFT' o non sincronizzati su Shopify): ${invalidSkus.join(', ')}`;
        logger.error(errMsg, { module: 'shopify-promo' });
        throw new Error(errMsg);
      }

      payload.prodotti_target_gid = Array.from(validGids);
    }

    // Validazione prodotti regalo via SKU se presenti
    if (payload.prodotti_regalo_sku && payload.prodotti_regalo_sku.length > 0) {
      const giftSkus = payload.prodotti_regalo_sku.map(s => s.toUpperCase());

      // HARD BLOCK: Controllo se gli SKU regalo sono già impegnati
      const conflictingSkus = giftSkus.filter(sku => busySkus.includes(sku));
      if (conflictingSkus.length > 0) {
        throw new Error(`Impossibile procedere. I seguenti prodotti REGALO sono già impegnati in un'altra promozione attiva: ${conflictingSkus.join(', ')}`);
      }

      logger.info(`Verifica di ${giftSkus.length} SKU regalo su database Prisma...`, { module: 'shopify-promo' });
      const products = await prisma.product.findMany({
        where: { 
          OR: giftSkus.map(sku => ({ sku: { startsWith: sku } }))
        },
        select: { sku: true, shopifyId: true, shopifyStatus: true }
      });

      const invalidSkus: string[] = [];
      const validGids: Set<string> = new Set(); 

      for (const sku of giftSkus) {
        const matched = products.filter((p: any) => p.sku.startsWith(sku));
        const validMatched = matched.filter((p: any) => p.shopifyId && p.shopifyStatus === 'ACTIVE');
        
        if (validMatched.length === 0) {
          invalidSkus.push(sku);
        } else {
          validMatched.forEach((p: any) => validGids.add(p.shopifyId));
        }
      }

      if (invalidSkus.length > 0) {
        const errMsg = `Impossibile procedere. I seguenti prodotti REGALO non sono idonei (sono in 'DRAFT' o non sincronizzati su Shopify): ${invalidSkus.join(', ')}`;
        logger.error(errMsg, { module: 'shopify-promo' });
        throw new Error(errMsg);
      }

      payload.prodotti_regalo_gid = Array.from(validGids);
    }

    const fields = this.buildMetaobjectFields(payload);

    const query = `
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metaobject: {
        type: 'archelia_promozione',
        fields: fields
      }
    };

    logger.info(`Chiamata GraphQL metaobjectCreate (campi: ${fields.length})`, { module: 'shopify-promo' });
    const response = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query, variables });

    if (response.errors) {
      throw new Error(`Errore API Shopify: ${JSON.stringify(response.errors)}`);
    }

    const userErrors = response.data?.metaobjectCreate?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(`Errore GraphQL: ${JSON.stringify(userErrors)}`);
    }

    const result = response.data?.metaobjectCreate?.metaobject;
    logger.info(`✅ Promozione creata con successo! Handle: ${result.handle}, ID: ${result.id}`, { module: 'shopify-promo' });

    // --- NUOVA ARCHITETTURA: Creazione Sconto Nativo GraphQL ---
    try {
      const applyTz = (dateStr: string, isEnd: boolean) => {
        const dateObj = new Date(dateStr + (isEnd ? 'T23:59:59' : 'T00:00:00'));
        const t = isEnd ? 'T23:59:59' : 'T00:00:00';
        return `${dateStr}${t}Z`;
      };
      
      const startsAt = applyTz(payload.data_inizio, false);
      const endsAt = payload.data_fine ? applyTz(payload.data_fine, true) : undefined;
      const pct = payload.sconto_percentuale ? payload.sconto_percentuale / 100 : 0.10;

      let t = payload.tipo;
      if (t === 'percentuale') {
        t = 'sconto_percentuale';
      }

      const hasProductTargets = payload.prodotti_target_gid && payload.prodotti_target_gid.length > 0;

      if (t === 'sconto_percentuale') {
        if (!payload.codice_sconto) {
          await shopifyDiscountService.createAutomaticBasicDiscount({
             title: payload.titolo, 
             metaobjectId: result.id, 
             startsAt, 
             endsAt, 
             percentage: pct, 
             collectionGids: hasProductTargets ? undefined : [payload.collezione_target],
             productGids: hasProductTargets ? payload.prodotti_target_gid : undefined
          });
        } else {
          await shopifyDiscountService.createCodeBasicDiscount({
             title: payload.titolo, metaobjectId: result.id, code: payload.codice_sconto, startsAt, endsAt, percentage: pct
          });
        }
      } else if (t === 'bxgy') {
        const pct = payload.sconto_percentuale ? payload.sconto_percentuale / 100 : 0.50; // default 50% for 2nd item if missing
        await shopifyDiscountService.createAutomaticBxgyDiscount({
          title: payload.titolo, 
          metaobjectId: result.id, 
          startsAt, 
          endsAt, 
          buyCollectionGids: hasProductTargets ? undefined : [payload.collezione_target],
          buyProductGids: hasProductTargets ? payload.prodotti_target_gid : undefined,
          getFreeProductGids: payload.prodotti_regalo_gid || [], 
          percentage: pct
        });
      } else if (t === 'sconto_ordine') {
        await shopifyDiscountService.createCodeBasicDiscount({
          title: payload.titolo, metaobjectId: result.id, code: payload.codice_sconto || `PROMO-${Date.now()}`, startsAt, endsAt, percentage: pct
        });
      } else if (t === 'spedizione_gratuita') {
        await shopifyDiscountService.createAutomaticFreeShipping({
          title: payload.titolo, metaobjectId: result.id, startsAt, endsAt
        });
      } else {
        logger.warn(`⚠ Nessuna Factory Sconto Nativi per tipo: "${payload.tipo}". Verifica il manuale`, { module: 'shopify-promo' });
      }
    } catch (discErr: any) {
      logger.error(`Fallita creazione Sconto GraphQL nativo post-metaobject: ${discErr.message}`, { module: 'shopify-promo' });
    }

    return { success: true, metaobject: result };
  }

  /**
   * Recupera la lista di tutte le Collezioni Shopify 
   */
  async getCollections(): Promise<{ id: string; title: string; handle: string }[]> {
    logger.info(`Recupero liste collezioni da Shopify per Wizard Promozioni...`, { module: 'shopify-promo' });
    const query = `
      query GetCollectionsForPromoWizard {
        collections(first: 250, sortKey: TITLE) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const response = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query });

    if (response.errors) {
      throw new Error(`Errore API Shopify getCollections: ${JSON.stringify(response.errors)}`);
    }

    const edges = response.data?.collections?.edges || [];
    return edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle
    }));
  }

  /**
   * Recupera i Tipi di Promozione (le validazioni choices) ammessi su Shopify.
   */
  async getPromoTypes(): Promise<string[]> {
    logger.info(`Recupero tipi promozione validi (choices) dal Metaobject Shopify...`, { module: 'shopify-promo' });
    const query = `
      query GetPromoTypesValidation {
        metaobjectDefinitionByType(type: "archelia_promozione") {
          fieldDefinitions {
            key
            validations {
              name
              value
            }
          }
        }
      }
    `;

    const response = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query });
    if (response.errors) throw new Error(`Errore API Shopify getPromoTypes: ${JSON.stringify(response.errors)}`);

    const fields = response.data?.metaobjectDefinitionByType?.fieldDefinitions || [];
    const tipoField = fields.find((f: any) => f.key === 'tipo');
    if (!tipoField) return [];

    const choicesValidation = tipoField.validations?.find((v: any) => v.name === 'choices');
    if (choicesValidation && choicesValidation.value) {
      try {
        return JSON.parse(choicesValidation.value); 
      } catch (e) {
        logger.warn("Impossibile parsare le choices per 'tipo' da Shopify.", { module: 'shopify-promo' });
        return [];
      }
    }
    return [];
  }

  /**
   * Pulizia automatica: recupera tutti i metaobject (promozione), controlla la data_fine
   * e distrugge su Shopify quelli scaduti rispetto alla mezzanotte di oggi.
   */
  async deleteExpiredPromos(): Promise<{ deleted: number, totalScanned: number, errors: string[] }> {
    logger.info(`🚀 [Admin] Avvio procedura MASSIVA di CLEANUP promozioni scadute su Shopify...`, { module: 'shopify-promo' });
    const errors: string[] = [];
    let deletedCount = 0;
    let totalScanned = 0;

    const now = new Date();
    const todayZero = new Date(now);
    todayZero.setHours(0, 0, 0, 0);

    const targets = [
      { type: "archelia_promozione", dateField: "data_fine", isIso: false },
      { type: "archelia_orario", dateField: "fine", isIso: true },
      { type: "archelia_giornaliero", dateField: "giorno_di_validita", isIso: false }
    ];

    try {
      let iterCount = 0;
      for (const target of targets) {
        logger.info(`🔄 [Admin] Inizio scansione per pulizia: [${target.type}]`, { module: 'shopify-promo' });
        let hasNextPage = true;
        let endCursor: string | null = null;
        let loopScanned = 0;
        let loopDeleted = 0;

        while (hasNextPage && iterCount < 1000) {
          iterCount++;
          const query = `
            query GetActivePromos($cursor: String, $type: String!) {
              metaobjects(type: $type, first: 250, after: $cursor) {
                edges {
                  node {
                    id
                    handle
                    fields {
                      key
                      value
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `;

          const response: any = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { 
            query, 
            variables: { cursor: endCursor, type: target.type } 
          });

          if (response.errors) {
            throw new Error(JSON.stringify(response.errors));
          }

          const data: any = response.data?.metaobjects;
          if (!data) break;

          const edges = data.edges || [];
          if (edges.length === 0) {
            hasNextPage = false; 
            break; 
          }
          
          loopScanned += edges.length;

          for (const edge of edges) {
            const fields = edge.node.fields || [];
            const dateFieldObj = fields.find((f: any) => f.key === target.dateField);
            const dateStr = dateFieldObj?.value;

            if (!dateStr) continue;

            let isExpired = false;

            if (target.isIso) {
              const dt = new Date(dateStr);
              if (dt.getTime() < now.getTime()) isExpired = true;
            } else {
              const dt = new Date(dateStr);
              if (dt.getTime() < todayZero.getTime()) isExpired = true;
            }

            if (isExpired) {
              try {
                await shopifyDiscountService.deleteDiscountsLinkedToMetaobject(edge.node.id);
                
                const deleteQuery = `mutation metaobjectDelete($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message } } }`;
                const delRes = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query: deleteQuery, variables: { id: edge.node.id } });
                
                if (delRes.errors || delRes.data?.metaobjectDelete?.userErrors?.length > 0) {
                  throw new Error(JSON.stringify(delRes.errors || delRes.data?.metaobjectDelete?.userErrors));
                }
                
                loopDeleted++;
                deletedCount++;
              } catch (delErr: any) {
                const msg = `Errore cancellazione [${target.type}] ${edge.node.handle}: ${delErr.message}`;
                logger.error(msg, { module: 'shopify-promo' });
                errors.push(msg);
              }
            }
          }

          hasNextPage = data.pageInfo.hasNextPage;
          endCursor = data.pageInfo.endCursor;
        }

        totalScanned += loopScanned;
        logger.info(`✅ Fine scansione [${target.type}]: scansionati ${loopScanned}, eliminati ${loopDeleted}`, { module: 'shopify-promo' });
      }
    } catch (e: any) {
      logger.error('Errore globale durante la pulizia promozioni: ' + e.message, { module: 'shopify-promo' });
      errors.push('Errore globale: ' + e.message);
    }

    return { deleted: deletedCount, totalScanned, errors };
  }
}

export const shopifyPromoService = new ShopifyPromoService();
