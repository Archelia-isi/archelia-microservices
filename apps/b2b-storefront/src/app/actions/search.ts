'use server';

import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';

import { cookies } from 'next/headers';

export async function searchBySkuPrefix(q: string, storeMode?: string) {
  try {
    if (!q || q.trim().length === 0) return [];

    const effectiveMode = storeMode || (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

    const filterBy = effectiveMode === 'ELMARK' 
      ? 'brand:=ELMARK' 
      : 'brand:!=[ELMARK]';

    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q: q,
      query_by: 'sku,sku_prefixes,natural_sku,title,original_name',
      query_by_weights: '100,80,50,40,30',
      filter_by: filterBy,
      sort_by: '_text_match:desc,natural_sku:asc',
      per_page: 8
    });

    return searchResults?.hits?.map((hit: any) => hit.document) || [];
  } catch (error) {
    console.error('Quick Add search error:', error);
    return [];
  }
}
