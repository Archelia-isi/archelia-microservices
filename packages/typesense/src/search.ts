import { typesenseClient, PRODUCTS_COLLECTION_NAME, GUIDES_COLLECTION_NAME } from './client.js';
import { B2B_DISABLED_SKUS_FILTER, isB2bDisabledSku } from './b2bExclusions.js';

export * from './b2bExclusions.js';

export async function searchProducts(q: string, options?: { includeUnpublished?: boolean, b2bMode?: boolean, sortBy?: string, limit?: number, l1?: string, l2?: string, l3?: string }) {
  try {
    const searchParams: any = {
      q: q,
      query_by: 'sku_prefixes,sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,150,100,100,100,100,80,80,80,60,50',
      sort_by: (!q || q === '*') 
        ? 'stock_main:desc,stock_ek:desc,natural_sku:asc' 
        : '_text_match:desc,stock_main:desc,stock_ek:desc',
      per_page: options?.limit || 50
    };
    
    if (options?.sortBy) {
      searchParams.sort_by = options.sortBy;
    }
    
    let filters = [];
    if (options?.b2bMode) {
      filters.push(B2B_DISABLED_SKUS_FILTER);
    } else if (!options?.includeUnpublished) {
      filters.push('publishedOnWeb:true');
    }

    if (options?.l1) filters.push(`product_group:=${options.l1}`);
    if (options?.l2) filters.push(`family:=${options.l2}`);
    if (options?.l3) filters.push(`category:=${options.l3}`);

    if (filters.length > 0) {
      searchParams.filter_by = filters.join(' && ');
    }

    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search(searchParams);
    return searchResults;
  } catch (error) {
    console.error('Typesense search error:', error);
    throw error;
  }
}

export async function getProductById(idOrSku: string) {
  try {
    if (isB2bDisabledSku(idOrSku)) return null;

    // Prima proviamo a prenderlo direttamente per ID (metodo più veloce e sicuro per gli ID esatti)
    try {
      const doc: any = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents(idOrSku).retrieve();
      if (doc) {
        if (isB2bDisabledSku(doc.sku) || isB2bDisabledSku(doc.id)) return null;
        return doc;
      }
    } catch (e) {
      // Se fallisce, potrebbe non essere l'ID ma lo SKU
    }

    // Se non lo trova per ID, cerchiamo per SKU esatto
    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q: '*',
      filter_by: `sku:=${idOrSku} || natural_sku:=${idOrSku}`,
      per_page: 1
    });
    const foundDoc: any = searchResults?.hits?.[0]?.document || null;
    if (foundDoc && (isB2bDisabledSku(foundDoc.sku) || isB2bDisabledSku(foundDoc.id))) {
      return null;
    }
    return foundDoc;
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
