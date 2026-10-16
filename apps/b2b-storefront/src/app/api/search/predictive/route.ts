import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { verifySession } from '@/lib/session';
import { getEffectiveDiscount, getExtraAgentDiscount, getEffectiveElmarkDiscounts } from '@/lib/discount';

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

    const filterBy = storeMode === 'ELMARK'
      ? 'brand:=ELMARK'
      : 'brand:!=[ELMARK]';

    const [searchResults, session] = await Promise.all([
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        q,
        query_by: 'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
        query_by_weights: '200,180,150,100,100,100,100,80,80,80,60,50',
        prefix: 'true,true,true,true,true,true,true,true,true,true,false,false',
        filter_by: filterBy,
        facet_by: 'category,brand,family',
        max_facet_values: 4,
        sort_by: '_text_match:desc,stock:desc,natural_sku:asc',
        per_page: 8
      }),
      verifySession()
    ]);

    const isAuthenticated = !!session;
    let genericDiscount = 0;
    let extraDiscount = 0;
    let elmarkDiscounts: Record<string, number> = {};

    if (isAuthenticated) {
      if (storeMode === 'ELMARK') {
        elmarkDiscounts = await getEffectiveElmarkDiscounts();
      } else {
        const [gen, ext] = await Promise.all([
          getEffectiveDiscount(),
          getExtraAgentDiscount()
        ]);
        genericDiscount = gen;
        extraDiscount = ext;
      }
    }

    const hits = (searchResults?.hits || []).map((hit: any) => {
      const doc = { ...hit.document };
      if (isAuthenticated) {
        const basePrice = storeMode === 'ELMARK'
          ? (Number(doc.price) > 0 ? Number(doc.price) : Number(doc.price_b2b || 0))
          : (Number(doc.price_b2b) > 0 ? Number(doc.price_b2b) : Number(doc.price || 0));

        let finalPrice = basePrice;
        if (storeMode === 'ELMARK') {
          const dGroup = doc.discgroup || '';
          const groupDisc = Number(elmarkDiscounts[dGroup]) || 0;
          if (groupDisc > 0) {
            finalPrice = finalPrice * (1 - groupDisc / 100);
          }
        } else {
          if (genericDiscount > 0) {
            finalPrice = finalPrice * (1 - genericDiscount / 100);
          }
          if (extraDiscount > 0) {
            finalPrice = finalPrice * (1 - extraDiscount / 100);
          }
        }

        const discountPct = basePrice > 0 && basePrice > finalPrice
          ? Math.round((1 - finalPrice / basePrice) * 100)
          : 0;

        doc.originalPriceB2b = basePrice;
        doc.price_b2b = finalPrice;
        doc.discountPct = discountPct;
      }
      return doc;
    });

    const facetCounts = searchResults?.facet_counts || [];
    const categoryFacet = facetCounts.find((f: any) => f.field_name === 'category');
    const familyFacet = facetCounts.find((f: any) => f.field_name === 'family');
    const brandFacet = facetCounts.find((f: any) => f.field_name === 'brand');

    const categories: { value: string; count: number }[] = (
      categoryFacet?.counts?.length ? categoryFacet.counts : (familyFacet?.counts || [])
    )
      .filter((c: any) => c.value && c.value.trim().length > 1)
      .slice(0, 4)
      .map((c: any) => ({ value: c.value, count: c.count }));

    const brands: { value: string; count: number }[] = (brandFacet?.counts || [])
      .filter((b: any) => b.value && b.value.trim().length > 1)
      .slice(0, 4)
      .map((b: any) => ({ value: b.value, count: b.count }));

    return NextResponse.json({
      hits,
      found: searchResults?.found || hits.length,
      facets: {
        categories: categories.length > 0 ? categories : [],
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
