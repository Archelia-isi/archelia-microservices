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
      const sortInStock = options?.sortBy || (isWildcard ? 'stock:desc,natural_sku:asc' : '_text_match:desc,stock:desc,natural_sku:asc');
      const sortOutStock = options?.sortBy || (isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc');

      const [inStockRes, outStockRes] = await Promise.all([
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: buildFilter('catalog_source:=elmark && stock:>0'),
          sort_by: sortInStock
        }),
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: buildFilter('catalog_source:=elmark && stock:<=0'),
          sort_by: sortOutStock
        })
      ]);

      const combinedHits = [
        ...(inStockRes?.hits || []),
        ...(outStockRes?.hits || [])
      ].slice(0, limit);

      return {
        ...inStockRes,
        found: (inStockRes?.found || 0) + (outStockRes?.found || 0),
        hits: combinedHits
      };
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

export async function getProductById(idOrSku: string) {
  try {
    // Prima proviamo a prenderlo direttamente per ID (metodo più veloce e sicuro per gli ID esatti)
    try {
      const doc = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents(idOrSku).retrieve();
      if (doc) return doc;
    } catch (e) {
      // Se fallisce, potrebbe non essere l'ID ma lo SKU
    }

    // Se non lo trova per ID, cerchiamo per SKU esatto
    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q: '*',
      filter_by: `sku:=${idOrSku} || natural_sku:=${idOrSku}`,
      per_page: 1
    });
    return searchResults?.hits?.[0]?.document || null;
  } catch (error) {
    console.error('Typesense getProductById error:', error);
    return null;
  }
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
