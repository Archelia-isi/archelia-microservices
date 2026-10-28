import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    const q = (searchParams.get('q') || '').trim();
    const cookieMode = cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK' | undefined;
    const paramMode = searchParams.get('storeMode') as 'ZUCCHETTI' | 'ELMARK' | null;
    const storeMode: 'ZUCCHETTI' | 'ELMARK' = paramMode || cookieMode || 'ZUCCHETTI';

    if (!q) {
      return NextResponse.json({
        hits: [],
        found: 0,
        facets: { categories: [], brands: [] },
        storeMode
      });
    }

    const baseSearchParams = {
      q,
      query_by: 'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,180,150,100,100,100,100,80,80,80,60,50',
      prefix: 'true,true,true,true,true,true,true,true,true,true,false,false',
      facet_by: 'category,brand,family',
      max_facet_values: 6,
      per_page: 8
    };

    let rawHits: any[] = [];
    let totalFound = 0;
    let searchFacetSets: any[][] = [];
    let session: any = null;

    if (storeMode === 'ELMARK') {
      const [searchRes, sess] = await Promise.all([
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: 'brand:=ELMARK',
          sort_by: '_text_match:desc,natural_sku:asc'
        }),
        verifySession()
      ]);

      session = sess;
      rawHits = (searchRes?.hits || []).slice(0, 8);
      totalFound = searchRes?.found || 0;
      searchFacetSets = [searchRes?.facet_counts || []];
    } else {
      const [tier1Res, tier2Res, tier3Res, sess] = await Promise.all([
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: 'catalog_source:=zucchetti && stock_main:>0',
          sort_by: '_text_match:desc,stock_main:desc,natural_sku:asc'
        }),
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:>0',
          sort_by: '_text_match:desc,stock_ek:desc,natural_sku:asc'
        }),
        typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
          ...baseSearchParams,
          filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:<=0',
          sort_by: '_text_match:desc,natural_sku:asc'
        }),
        verifySession()
      ]);

      session = sess;
      rawHits = [
        ...(tier1Res?.hits || []),
        ...(tier2Res?.hits || []),
        ...(tier3Res?.hits || [])
      ].slice(0, 8);
      totalFound = (tier1Res?.found || 0) + (tier2Res?.found || 0) + (tier3Res?.found || 0);
      searchFacetSets = [
        tier1Res?.facet_counts || [],
        tier2Res?.facet_counts || [],
        tier3Res?.facet_counts || []
      ];
    }

    const isAuthenticated = !!session;
    const discountCtx = isAuthenticated
      ? await getEffectiveClientDiscountContext()
      : null;

    const hits = rawHits.map((hit: any) => {
      const doc = { ...hit.document };
      if (isAuthenticated && discountCtx) {
        const evaluated = evaluateTypesenseProductWithContext(doc, storeMode, discountCtx);
        doc.originalPriceB2b = evaluated.originalPriceB2b;
        doc.price_b2b = evaluated.netPrice;
        doc.discountPct = Math.round(evaluated.discountPct);
        doc.discountLabel = evaluated.discountLabel;
      }
      return doc;
    });

    const mergeFacetField = (fieldName: string) => {
      const countsMap = new Map<string, number>();
      for (const facetSet of searchFacetSets) {
        const facet = (facetSet || []).find((f: any) => f.field_name === fieldName);
        for (const item of facet?.counts || []) {
          if (item?.value && String(item.value).trim().length > 1) {
            const val = String(item.value);
            countsMap.set(val, (countsMap.get(val) || 0) + Number(item.count || 0));
          }
        }
      }
      return Array.from(countsMap.entries())
        .map(([value, count]) => ({ value, count }))
        .slice(0, 4);
    };

    const categories = mergeFacetField('category');
    const fallbackCategories = categories.length > 0 ? categories : mergeFacetField('family');
    const brands = mergeFacetField('brand');

    return NextResponse.json({
      hits,
      found: totalFound || hits.length,
      facets: {
        categories: fallbackCategories,
        brands: storeMode === 'ELMARK' ? [] : brands
      },
      isAuthenticated,
      storeMode
    });
  } catch (error) {
    console.error('Predictive search API error:', error);
    return NextResponse.json({
      hits: [],
      found: 0,
      facets: { categories: [], brands: [] }
    });
  }
}
