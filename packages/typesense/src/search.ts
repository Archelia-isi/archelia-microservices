import { typesenseClient, PRODUCTS_COLLECTION_NAME, GUIDES_COLLECTION_NAME } from './client.js';

export async function searchProducts(q: string, options?: { includeUnpublished?: boolean, b2bMode?: boolean, sortBy?: string, limit?: number, l1?: string, l2?: string, l3?: string, catalogSource?: 'zucchetti' | 'elmark' }) {
  try {
    const limit = options?.limit || 50;
    const isWildcard = !q || q === '*';
    const baseSearchParams: any = {
      q: q || '*',
      query_by: 'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,180,150,100,100,100,100,80,80,80,60,50',
      per_page: limit
    };

    const baseFilters: string[] = [];
    if (!options?.includeUnpublished) {
      if (!options?.b2bMode) {
        baseFilters.push('publishedOnWeb:true');
      }
    }

    if (options?.l1) baseFilters.push(`product_group:=${options.l1}`);
    if (options?.l2) baseFilters.push(`family:=${options.l2}`);
    if (options?.l3) baseFilters.push(`category:=${options.l3}`);

    const buildFilter = (extra: string) => [...baseFilters, extra].join(' && ');

    if (options?.catalogSource === 'elmark') {
      const sortElmark = options?.sortBy || (isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc');
      return await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseSearchParams,
        filter_by: buildFilter('brand:=ELMARK'),
        sort_by: sortElmark
      });
    }

    // Default / Zucchetti mode:
    // Priority 1: Main warehouse (catalog_source:=zucchetti && stock_main:>0)
    // Priority 2: Other warehouses (catalog_source:=zucchetti && stock_main:<=0 && stock_ek:>0)
    // Priority 3: Out of stock (catalog_source:=zucchetti && stock_main:<=0 && stock_ek:<=0)
    const sortTier1 = options?.sortBy || (isWildcard ? 'stock_main:desc,natural_sku:asc' : '_text_match:desc,stock_main:desc,natural_sku:asc');
    const sortTier2 = options?.sortBy || (isWildcard ? 'stock_ek:desc,natural_sku:asc' : '_text_match:desc,stock_ek:desc,natural_sku:asc');
    const sortTier3 = options?.sortBy || (isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc');

    const [tier1Res, tier2Res, tier3Res] = await Promise.all([
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseSearchParams,
        filter_by: buildFilter('catalog_source:=zucchetti && stock_main:>0'),
        sort_by: sortTier1
      }),
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseSearchParams,
        filter_by: buildFilter('catalog_source:=zucchetti && stock_main:<=0 && stock_ek:>0'),
        sort_by: sortTier2
      }),
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseSearchParams,
        filter_by: buildFilter('catalog_source:=zucchetti && stock_main:<=0 && stock_ek:<=0'),
        sort_by: sortTier3
      })
    ]);

    const combinedHits = [
      ...(tier1Res?.hits || []),
      ...(tier2Res?.hits || []),
      ...(tier3Res?.hits || [])
    ].slice(0, limit);

    return {
      ...(tier1Res || tier2Res || tier3Res),
      found: (tier1Res?.found || 0) + (tier2Res?.found || 0) + (tier3Res?.found || 0),
      hits: combinedHits
    };
  } catch (error) {
    console.error('Typesense search error:', error);
    throw error;
  }
}

const productCache = new Map<string, { doc: any; expiresAt: number }>();
const PRODUCT_CACHE_TTL_MS = 15_000;

let pendingBatchKeys = new Set<string>();
let pendingResolvers = new Map<string, Array<(doc: any) => void>>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

async function searchWithRetry(searchParams: any, maxRetries = 3): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await typesenseClient
        .collections(PRODUCTS_COLLECTION_NAME)
        .documents()
        .search(searchParams);
    } catch (err: any) {
      lastErr = err;
      const status = err?.httpStatus || err?.status;
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function flushProductBatch() {
  const keys = Array.from(pendingBatchKeys);
  const resolversMap = pendingResolvers;
  pendingBatchKeys = new Set<string>();
  pendingResolvers = new Map<string, Array<(doc: any) => void>>();
  batchTimer = null;

  if (keys.length === 0) return;

  const foundMap = new Map<string, any>();
  const chunkSize = 80;

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const escapedList = chunk.map(k => `\`${k.replace(/`/g, '')}\``).join(',');
    try {
      const res = await searchWithRetry({
        q: '*',
        filter_by: `sku:=[${escapedList}] || natural_sku:=[${escapedList}]`,
        per_page: Math.min(250, chunk.length * 2 + 10),
      });
      const hits = res?.hits || [];
      for (const h of hits) {
        const doc = h?.document;
        if (!doc) continue;
        if (doc.sku) foundMap.set(String(doc.sku).trim().toUpperCase(), doc);
        if (doc.natural_sku) {
          const ns = String(doc.natural_sku).trim().toUpperCase();
          if (!foundMap.has(ns)) foundMap.set(ns, doc);
        }
        if (doc.id) foundMap.set(String(doc.id).trim().toUpperCase(), doc);
      }
    } catch (error) {
      console.error('Typesense batch getProductById error:', error);
    }
  }

  const now = Date.now();
  for (const rawKey of keys) {
    const upperKey = rawKey.toUpperCase();
    let doc = foundMap.get(upperKey) || null;

    if (!doc) {
      try {
        doc = await typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents(rawKey)
          .retrieve();
      } catch {
        doc = null;
      }
    }

    if (doc) {
      productCache.set(upperKey, { doc, expiresAt: now + PRODUCT_CACHE_TTL_MS });
    }

    const callbacks = resolversMap.get(rawKey) || [];
    for (const cb of callbacks) {
      cb(doc);
    }
  }
}

export async function getProductById(idOrSku: string) {
  const cleanKey = String(idOrSku || '').trim();
  if (!cleanKey) return null;

  const upperKey = cleanKey.toUpperCase();
  const cached = productCache.get(upperKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.doc;
  }

  return new Promise<any>(resolve => {
    pendingBatchKeys.add(cleanKey);
    const list = pendingResolvers.get(cleanKey) || [];
    list.push(resolve);
    pendingResolvers.set(cleanKey, list);

    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        flushProductBatch().catch(err => {
          console.error('Typesense flushProductBatch error:', err);
        });
      }, 5);
    }
  });
}

export async function searchGuides(q: string) {
  try {
    const searchResults = await typesenseClient.collections(GUIDES_COLLECTION_NAME).documents().search({
      q: q,
      query_by: 'title,content,category',
      query_by_weights: '100,50,20',
      per_page: 3
    });
    return searchResults;
  } catch (error) {
    console.error('Typesense guides search error:', error);
    throw error;
  }
}
