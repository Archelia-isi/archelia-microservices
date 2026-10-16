import { NextResponse } from 'next/server';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const storeMode = searchParams.get('storeMode') || 'ZUCCHETTI';

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ hits: [] });
    }

    const filterBy = storeMode === 'ELMARK' 
      ? 'brand:=ELMARK' 
      : 'brand:!=[ELMARK]';

    const searchResults = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q: q.trim(),
      query_by: 'sku,sku_prefixes,natural_sku,title,original_name',
      query_by_weights: '100,80,50,40,30',
      filter_by: filterBy,
      sort_by: '_text_match:desc,natural_sku:asc',
      per_page: 8
    });

    const hits = searchResults?.hits?.map((hit: any) => hit.document) || [];
    return NextResponse.json({ hits });
  } catch (error) {
    console.error('Quick Add search API error:', error);
    return NextResponse.json({ hits: [] });
  }
}
