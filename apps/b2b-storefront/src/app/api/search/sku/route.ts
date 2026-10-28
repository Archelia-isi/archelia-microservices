import { NextResponse } from 'next/server';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { verifySession } from '@/lib/session';
import {
  getEffectiveClientDiscountContext,
  evaluateTypesenseProductWithContext,
} from '@/lib/discount';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const storeMode = (searchParams.get('storeMode') as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ hits: [] });
    }

    const filterBy = storeMode === 'ELMARK' 
      ? 'brand:=ELMARK' 
      : 'brand:!=[ELMARK]';

    const [searchResults, session, discountCtx] = await Promise.all([
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        q: q.trim(),
        query_by: 'sku,sku_prefixes,natural_sku,title,original_name',
        query_by_weights: '100,80,50,40,30',
        filter_by: filterBy,
        sort_by: '_text_match:desc,natural_sku:asc',
        per_page: 8
      }),
      verifySession(),
      getEffectiveClientDiscountContext(),
    ]);

    const rawHits = searchResults?.hits?.map((hit: any) => hit.document) || [];
    const hits = session
      ? rawHits.map((doc: any) => {
          const evaluated = evaluateTypesenseProductWithContext(doc, storeMode, discountCtx);
          return {
            ...doc,
            originalPriceB2b: evaluated.originalPriceB2b,
            evaluatedPriceB2b: evaluated.netPrice,
            discountPct: evaluated.discountPct,
            discountLabel: evaluated.discountLabel,
          };
        })
      : rawHits;

    return NextResponse.json({ hits });
  } catch (error) {
    console.error('Quick Add search API error:', error);
    return NextResponse.json({ hits: [] });
  }
}
