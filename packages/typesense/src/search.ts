import { typesenseClient, PRODUCTS_COLLECTION_NAME, GUIDES_COLLECTION_NAME } from './client.js';

export async function searchProducts(q: string, options?: { includeUnpublished?: boolean, b2bMode?: boolean, sortBy?: string }) {
  try {
    const searchParams: any = {
      q: q,
      query_by: 'sku_prefixes,sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,150,100,100,100,100,80,80,80,60,50',
      sort_by: '_text_match:desc,is_in_promo:desc,natural_sku:asc',
      per_page: 50
    };
    
    if (options?.sortBy) {
      searchParams.sort_by = options.sortBy;
    }
    
    if (!options?.includeUnpublished) {
      if (options?.b2bMode) {
        searchParams.filter_by = 'publishedOnB2b:true';
      } else {
        searchParams.filter_by = 'publishedOnWeb:true';
      }
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
