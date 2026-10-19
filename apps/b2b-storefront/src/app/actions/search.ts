'use server';

import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';

import { cookies } from 'next/headers';

export async function searchBySkuPrefix(q: string, storeMode?: string) {
  try {
    if (!q || q.trim().length === 0) return [];

    const effectiveMode = storeMode || (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
    const baseParams = {
      q: q.trim(),
      query_by: 'sku,sku_prefixes,natural_sku,title,original_name',
      query_by_weights: '100,80,50,40,30',
      per_page: 8
    };

    if (effectiveMode === 'ELMARK') {
      const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseParams,
        filter_by: 'brand:=ELMARK',
      });
      return (searchResults?.hits || []).map((hit: any) => hit.document);
    }

    const [tier1Res, tier2Res, tier3Res] = await Promise.all([
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseParams,
        filter_by: 'catalog_source:=zucchetti && stock_main:>0',
        sort_by: '_text_match:desc,stock_main:desc,natural_sku:asc'
      }),
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseParams,
        filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:>0',
        sort_by: '_text_match:desc,stock_ek:desc,natural_sku:asc'
      }),
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseParams,
        filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:<=0',
        sort_by: '_text_match:desc,natural_sku:asc'
      })
    ]);

    return [
      ...(tier1Res?.hits || []),
      ...(tier2Res?.hits || []),
      ...(tier3Res?.hits || [])
    ]
      .slice(0, 8)
      .map((hit: any) => hit.document);
  } catch (error) {
    console.error('Quick Add search error:', error);
    return [];
  }
}
