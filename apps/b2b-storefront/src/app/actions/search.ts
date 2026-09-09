'use server';

import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';

export async function searchBySkuPrefix(q: string) {
  try {
    if (!q || q.trim().length === 0) return [];

    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q: q,
      query_by: 'sku,sku_prefixes,natural_sku',
      query_by_weights: '100,80,50',
      sort_by: '_text_match:desc,natural_sku:asc',
      per_page: 8
    });

    return searchResults?.hits?.map((hit: any) => hit.document) || [];
  } catch (error) {
    console.error('Quick Add search error:', error);
    return [];
  }
}
