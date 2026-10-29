'use server';

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { verifySession } from '@/lib/session';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { getAgentClientsList, AgentManagedClient } from './newClient';
import taxonomyData from '@/lib/taxonomy.json';
import { AgentDiscountRule, getAgentDiscountRulesFromDb } from '@/lib/discountRules';

export interface CatalogFacetOption {
  code: string;
  label: string;
  count: number;
}

export type WarehouseFilterMode = 'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG';

export type CatalogSourceMode = 'ZUCCHETTI' | 'ELMARK' | 'ALL';

export type CatalogPriceMode = 'LIST_AND_NET' | 'NET_ONLY' | 'LIST_ONLY' | 'NO_PRICE';

export type CatalogStockMode = 'BADGE_ONLY' | 'HIDE_STOCK' | 'EXACT_QTY';

export type CatalogSortMode =
  | 'TAXONOMY_ASC'
  | 'INSERTION_ORDER'
  | 'STOCK_DESC'
  | 'SKU_ASC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'TITLE_ASC';

export interface CatalogSearchFilters {
  catalogSource: CatalogSourceMode;
  query: string;
  warehouse: WarehouseFilterMode;
  includeZeroStock?: boolean;
  brands: string[];
  productGroups: string[];
  families: string[];
  categories: string[];
  sortBy: CatalogSortMode;
  limit?: number;
}

export interface CatalogProductItem {
  id: string;
  sku: string;
  title: string;
  originalName: string;
  brand: string;
  brandLabel: string;
  productGroup: string;
  productGroupLabel: string;
  family: string;
  familyLabel: string;
  category: string;
  categoryLabel: string;
  technicalDesc: string;
  description: string;
  unit: string;
  listPrice: number;
  discgroup: string;
  stockMain: number;
  stockEk: number;
  stockTotal: number;
  imageUrl: string;
  catalogSource: 'zucchetti' | 'elmark';
}

export interface CatalogSearchResponse {
  success: boolean;
  error?: string;
  totalFound: number;
  products: CatalogProductItem[];
  facets: {
    brands: CatalogFacetOption[];
    productGroups: CatalogFacetOption[];
    families: CatalogFacetOption[];
    categories: CatalogFacetOption[];
  };
}

interface TaxonomyMaps {
  brands: Map<string, string>;
  productGroups: Map<string, string>;
  families: Map<string, string>;
  categories: Map<string, string>;
}

const KNOWN_BRAND_FALLBACKS: Record<string, string> = {
  ELMARK: 'ELMARK',
  EK: 'ELMARK (Deposito Esterno)',
  KO: 'KOMBO',
  SR: 'STRÜHM / SPECTRUM',
  MM: 'MASTER / MODO',
  TKLG: 'TEKNOLIGHT',
  ZUMA: 'ZUMA LINE',
  OA: 'OASI / ACCESSORI',
  IZZO: 'IZZO DISTRIBUZIONE',
};

let cachedTaxonomyMaps: { data: TaxonomyMaps; expiresAt: number } | null = null;
let inflightTaxonomyMaps: Promise<TaxonomyMaps> | null = null;

const cachedInitialFacets = new Map<
  string,
  { data: CatalogSearchResponse; expiresAt: number }
>();

async function getTaxonomyLookupMaps(): Promise<TaxonomyMaps> {
  if (cachedTaxonomyMaps && Date.now() < cachedTaxonomyMaps.expiresAt) {
    return cachedTaxonomyMaps.data;
  }
  if (inflightTaxonomyMaps) {
    return inflightTaxonomyMaps;
  }

  inflightTaxonomyMaps = (async () => {
    const brands = new Map<string, string>();
    const productGroups = new Map<string, string>();
    const families = new Map<string, string>();
    const categories = new Map<string, string>();

    for (const [k, v] of Object.entries(KNOWN_BRAND_FALLBACKS)) {
      brands.set(k.toUpperCase(), v);
    }

    // 1. Popola da taxonomy.json locale (3 livelli: L1 product_group, L2 family, L3 category)
    try {
      for (const l1 of taxonomyData as any[]) {
        if (l1?.id && l1?.name) {
          productGroups.set(String(l1.id).trim().toUpperCase(), String(l1.name).trim());
        }
        for (const l2 of l1?.children || []) {
          if (l2?.id && l2?.name) {
            families.set(String(l2.id).trim().toUpperCase(), String(l2.name).trim());
          }
          for (const l3 of l2?.children || []) {
            if (l3?.id && l3?.name) {
              categories.set(String(l3.id).trim().toUpperCase(), String(l3.name).trim());
            }
          }
        }
      }
    } catch (e) {}

    // 2. Arricchisci con le tabelle lookup del database principale (brands, product_groups, families, homogeneous_categories)
    try {
      const { prisma: mainPrisma } = await import('@archelia/database');
      const [dbBrands, dbGroups, dbFamilies, dbCats] = await Promise.all([
        mainPrisma.brand.findMany(),
        mainPrisma.productGroup.findMany(),
        mainPrisma.family.findMany(),
        mainPrisma.homogeneousCategory.findMany(),
      ]);

      for (const b of dbBrands) {
        if (b.code && b.name) {
          brands.set(b.code.trim().toUpperCase(), b.name.trim());
        }
      }
      for (const g of dbGroups) {
        if (g.code && g.name) {
          productGroups.set(g.code.trim().toUpperCase(), g.name.trim());
        }
      }
      for (const f of dbFamilies) {
        if (f.code && f.name) {
          families.set(f.code.trim().toUpperCase(), f.name.trim());
        }
      }
      for (const c of dbCats) {
        if (c.code && c.name) {
          categories.set(c.code.trim().toUpperCase(), c.name.trim());
        }
      }
    } catch (e) {
      console.warn('Avviso caricamento tabelle lookup tassonomia:', e);
    }

    const data = { brands, productGroups, families, categories };
    cachedTaxonomyMaps = { data, expiresAt: Date.now() + 30 * 60 * 1000 };
    return data;
  })().finally(() => {
    inflightTaxonomyMaps = null;
  });

  return inflightTaxonomyMaps;
}

function formatCodeWithLabel(code: string, map: Map<string, string>): string {
  const clean = (code || '').trim();
  if (!clean) return '';
  const upper = clean.toUpperCase();
  const label = map.get(upper);
  if (!label) return upper;
  if (label.toUpperCase() === upper) return upper;
  return `${upper} - ${label}`;
}

function escapeTypesenseFilterValue(val: string): string {
  return `\`${String(val || '').replace(/`/g, '')}\``;
}

function buildTypesenseFilterString(filters: CatalogSearchFilters): string {
  const clauses: string[] = [];

  // 1. Sorgente catalogo: esclusivamente negozio Izzo Distribuzione (catalog_source:=zucchetti)
  clauses.push('catalog_source:=zucchetti');

  // 2. Filtro Deposito / Giacenza (3 modalità + opzione includi giacenza 0)
  if (!filters.includeZeroStock) {
    if (filters.warehouse === 'MAIN_2GG') {
      clauses.push('stock_main:>0');
    } else if (filters.warehouse === 'EXTERNAL_7GG') {
      clauses.push('stock_ek:>0');
    } else {
      clauses.push('stock:>0');
    }
  }

  // 3. Filtro Marchi
  if (filters.brands && filters.brands.length > 0) {
    const list = filters.brands.map(escapeTypesenseFilterValue).join(',');
    clauses.push(`brand:=[${list}]`);
  }

  // 4. Filtro Gruppo Merceologico (L1)
  if (filters.productGroups && filters.productGroups.length > 0) {
    const list = filters.productGroups.map(escapeTypesenseFilterValue).join(',');
    clauses.push(`product_group:=[${list}]`);
  }

  // 5. Filtro Famiglia (L2)
  if (filters.families && filters.families.length > 0) {
    const list = filters.families.map(escapeTypesenseFilterValue).join(',');
    clauses.push(`family:=[${list}]`);
  }

  // 6. Filtro Tipo Prodotto / Categoria (L3)
  if (filters.categories && filters.categories.length > 0) {
    const list = filters.categories.map(escapeTypesenseFilterValue).join(',');
    clauses.push(`category:=[${list}]`);
  }

  return clauses.join(' && ');
}

export async function getAgentCatalogInitData(): Promise<{
  success: boolean;
  error?: string;
  agentName?: string;
  agentCode?: string;
  clients?: AgentManagedClient[];
  initialSearch?: CatalogSearchResponse;
  discountRules?: AgentDiscountRule[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const sessionAgentCode = session.user.zucchettiCode || '';

  const [clientsRes, initialSearch, discountRules] = await Promise.all([
    getAgentClientsList(),
    searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: '',
      warehouse: 'ALL_WAREHOUSES',
      includeZeroStock: false,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'TAXONOMY_ASC',
      limit: 0,
    }),
    getAgentDiscountRulesFromDb(session.user.id, sessionAgentCode),
  ]);

  const agentName =
    clientsRes.agentName ||
    session.user.companyName ||
    `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
    session.user.username;

  const agentCode = clientsRes.agentCode || sessionAgentCode;

  return {
    success: true,
    agentName,
    agentCode,
    clients: clientsRes.clients || [],
    initialSearch,
    discountRules,
  };
}

export async function searchAgentCatalogProducts(
  filters: CatalogSearchFilters
): Promise<CatalogSearchResponse> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return {
      success: false,
      error: 'Non autorizzato',
      totalFound: 0,
      products: [],
      facets: { brands: [], productGroups: [], families: [], categories: [] },
    };
  }

  try {
    const rawQuery = (filters.query || '').trim();
    const isWildcard = !rawQuery || rawQuery === '*';
    const q = isWildcard ? '*' : rawQuery;

    const hasSubFilters =
      filters.brands.length > 0 ||
      filters.productGroups.length > 0 ||
      filters.families.length > 0 ||
      filters.categories.length > 0;

    // Se è richiesto solo il conteggio e le faccette (es. limit <= 1 all'apertura della pagina Sconti / Catalogo),
    // non scarichiamo le migliaia di schede prodotto da Typesense!
    const onlyFacetsRequested = typeof filters.limit === 'number' && filters.limit <= 1;
    const facetCacheKey = `${filters.warehouse}|${Boolean(filters.includeZeroStock)}`;

    if (onlyFacetsRequested && isWildcard && !hasSubFilters) {
      const cachedFacetRes = cachedInitialFacets.get(facetCacheKey);
      if (cachedFacetRes && Date.now() < cachedFacetRes.expiresAt) {
        return cachedFacetRes.data;
      }
    }

    const maps = await getTaxonomyLookupMaps();

    const perPage = onlyFacetsRequested
      ? 0
      : typeof filters.limit === 'number' && filters.limit > 0
      ? Math.min(250, filters.limit)
      : 250;

    let sortByStr = 'stock_main:desc,stock_ek:desc,natural_sku:asc';
    if (filters.sortBy === 'SKU_ASC') {
      sortByStr = isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc';
    } else if (filters.sortBy === 'PRICE_ASC') {
      sortByStr = 'price_b2b:asc,natural_sku:asc';
    } else if (filters.sortBy === 'PRICE_DESC') {
      sortByStr = 'price_b2b:desc,natural_sku:asc';
    } else if (filters.sortBy === 'TITLE_ASC') {
      sortByStr = isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc';
    } else {
      // Max 3 sort fields allowed by Typesense
      if (isWildcard) {
        sortByStr =
          filters.warehouse === 'EXTERNAL_7GG'
            ? 'stock_ek:desc,stock_main:desc,natural_sku:asc'
            : 'stock_main:desc,stock_ek:desc,natural_sku:asc';
      } else {
        sortByStr =
          filters.warehouse === 'EXTERNAL_7GG'
            ? '_text_match:desc,stock_ek:desc,natural_sku:asc'
            : '_text_match:desc,stock_main:desc,natural_sku:asc';
      }
    }

    const filterBy = buildTypesenseFilterString(filters);

    // Costruisce anche una query facet di contesto (filtrata per negozio Izzo e deposito) così le tendine mostrano tutte le opzioni disponibili
    const baseFacetClauses: string[] = ['catalog_source:=zucchetti'];
    if (!filters.includeZeroStock) {
      if (filters.warehouse === 'MAIN_2GG') {
        baseFacetClauses.push('stock_main:>0');
      } else if (filters.warehouse === 'EXTERNAL_7GG') {
        baseFacetClauses.push('stock_ek:>0');
      } else {
        baseFacetClauses.push('stock:>0');
      }
    }

    const includeFields =
      'id,sku,natural_sku,title,original_name,brand,product_group,family,category,technical_desc,description,unit,price,price_b2b,discgroup,stock,stock_main,stock_ek,image_url,catalog_source';

    const queryByFields =
      'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description';
    const queryByWeights = '200,180,150,100,100,100,100,80,80,80,60,50';
    const prefixFlags = 'true,true,true,true,true,true,true,true,true,true,false,false';

    const firstPagePromise = typesenseClient
      .collections(PRODUCTS_COLLECTION_NAME)
      .documents()
      .search({
        q,
        query_by: queryByFields,
        query_by_weights: queryByWeights,
        prefix: prefixFlags,
        filter_by: filterBy || undefined,
        sort_by: sortByStr,
        facet_by: 'brand,product_group,family,category',
        max_facet_values: 250,
        include_fields: includeFields,
        per_page: perPage,
        page: 1,
      });

    const facetResPromise = hasSubFilters
      ? typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q,
            query_by: queryByFields,
            query_by_weights: queryByWeights,
            prefix: prefixFlags,
            filter_by: baseFacetClauses.join(' && ') || undefined,
            facet_by: 'brand,product_group,family,category',
            max_facet_values: 250,
            per_page: 0,
          })
      : null;

    const [firstPage, broadFacetRes] = await Promise.all([firstPagePromise, facetResPromise]);

    const totalFound = firstPage?.found || 0;
    const maxProductsToFetch =
      onlyFacetsRequested
        ? 0
        : typeof filters.limit === 'number' && filters.limit > 0
        ? filters.limit
        : totalFound;
    const totalPages = perPage > 0 ? Math.ceil(Math.min(totalFound, maxProductsToFetch) / perPage) : 0;
    const allHits: any[] = onlyFacetsRequested ? [] : [...(firstPage?.hits || [])];

    // Scarica le pagine successive solo quando servono effettivamente i prodotti (non per le sole faccette)
    if (!onlyFacetsRequested && totalPages > 1) {
      const remainingPageNumbers: number[] = [];
      for (let p = 2; p <= totalPages; p++) {
        remainingPageNumbers.push(p);
      }
      const batchSize = 10;
      for (let i = 0; i < remainingPageNumbers.length; i += batchSize) {
        const batch = remainingPageNumbers.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(page =>
            typesenseClient
              .collections(PRODUCTS_COLLECTION_NAME)
              .documents()
              .search({
                q,
                query_by: queryByFields,
                query_by_weights: queryByWeights,
                prefix: prefixFlags,
                filter_by: filterBy || undefined,
                sort_by: sortByStr,
                include_fields: includeFields,
                per_page: perPage,
                page,
              })
          )
        );
        for (const r of batchResults) {
          if (r?.hits) {
            allHits.push(...r.hits);
          }
        }
      }
    }

    const products: CatalogProductItem[] = allHits.map((hit: any) => {
      const doc = hit.document || {};
      const brandCode = String(doc.brand || '').trim().toUpperCase();
      const pgCode = String(doc.product_group || '').trim().toUpperCase();
      const famCode = String(doc.family || '').trim().toUpperCase();
      const catCode = String(doc.category || '').trim().toUpperCase();
      const source: 'zucchetti' | 'elmark' =
        doc.catalog_source === 'elmark' || brandCode === 'ELMARK' ? 'elmark' : 'zucchetti';

      const listPrice =
        source === 'elmark'
          ? Number(doc.price) > 0
            ? Number(doc.price)
            : Number(doc.price_b2b || 0)
          : Number(doc.price_b2b) > 0
          ? Number(doc.price_b2b)
          : Number(doc.price || 0);

      const stockMain = Math.max(0, Number(doc.stock_main ?? doc.stock ?? 0));
      const stockEk = Math.max(0, Number(doc.stock_ek ?? 0));
      const stockTotal =
        source === 'elmark'
          ? Math.max(0, Number(doc.stock ?? stockMain))
          : stockMain + stockEk || Math.max(0, Number(doc.stock ?? 0));

      return {
        id: String(doc.id || doc.sku),
        sku: String(doc.sku || doc.natural_sku || ''),
        title: String(doc.original_name || doc.title || ''),
        originalName: String(doc.original_name || doc.title || ''),
        brand: brandCode,
        brandLabel: formatCodeWithLabel(brandCode, maps.brands),
        productGroup: pgCode,
        productGroupLabel: formatCodeWithLabel(pgCode, maps.productGroups),
        family: famCode,
        familyLabel: formatCodeWithLabel(famCode, maps.families),
        category: catCode,
        categoryLabel: formatCodeWithLabel(catCode, maps.categories),
        technicalDesc: String(doc.technical_desc || ''),
        description: String(doc.description || ''),
        unit: String(doc.unit || 'PZ'),
        listPrice,
        discgroup: String(doc.discgroup || ''),
        stockMain,
        stockEk,
        stockTotal,
        imageUrl: String(doc.image_url || ''),
        catalogSource: source,
      };
    });

    if (filters.sortBy === 'TAXONOMY_ASC') {
      // Ordinamento gerarchico a blocchi: 1) Gruppo Merceologico -> 2) Famiglia -> 3) Categoria -> 4) SKU
      products.sort((a, b) => {
        const gA = a.productGroup || '\uffff';
        const gB = b.productGroup || '\uffff';
        const cmpGroup = gA.localeCompare(gB, 'it', { numeric: true, sensitivity: 'base' });
        if (cmpGroup !== 0) return cmpGroup;

        const fA = a.family || '\uffff';
        const fB = b.family || '\uffff';
        const cmpFamily = fA.localeCompare(fB, 'it', { numeric: true, sensitivity: 'base' });
        if (cmpFamily !== 0) return cmpFamily;

        const cA = a.category || '\uffff';
        const cB = b.category || '\uffff';
        const cmpCat = cA.localeCompare(cB, 'it', { numeric: true, sensitivity: 'base' });
        if (cmpCat !== 0) return cmpCat;

        return (a.sku || '').localeCompare(b.sku || '', 'it', { numeric: true, sensitivity: 'base' });
      });
    } else if (filters.sortBy === 'TITLE_ASC') {
      products.sort((a, b) =>
        (a.title || a.originalName).localeCompare(b.title || b.originalName, 'it')
      );
    }

    const facetSource = broadFacetRes?.facet_counts || firstPage?.facet_counts || [];
    const extractFacetList = (
      fieldName: string,
      lookupMap: Map<string, string>
    ): CatalogFacetOption[] => {
      const f = facetSource.find((item: any) => item.field_name === fieldName);
      if (!f || !Array.isArray(f.counts)) return [];
      return f.counts
        .filter((c: any) => c.value && String(c.value).trim().length > 0)
        .map((c: any) => {
          const code = String(c.value).trim();
          return {
            code,
            label: formatCodeWithLabel(code, lookupMap),
            count: Number(c.count || 0),
          };
        });
    };

    const responsePayload: CatalogSearchResponse = {
      success: true,
      totalFound,
      products,
      facets: {
        brands: extractFacetList('brand', maps.brands),
        productGroups: extractFacetList('product_group', maps.productGroups),
        families: extractFacetList('family', maps.families),
        categories: extractFacetList('category', maps.categories),
      },
    };

    if (onlyFacetsRequested && isWildcard && !hasSubFilters) {
      cachedInitialFacets.set(facetCacheKey, {
        data: responsePayload,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }

    return responsePayload;
  } catch (err: any) {
    console.error('Errore searchAgentCatalogProducts:', err);
    return {
      success: false,
      error: err.message || 'Errore durante la ricerca dei prodotti per il catalogo.',
      totalFound: 0,
      products: [],
      facets: { brands: [], productGroups: [], families: [], categories: [] },
    };
  }
}

export async function searchCatalogPredictiveAction(
  query: string,
  warehouse: WarehouseFilterMode = 'ALL_WAREHOUSES',
  includeZeroStock = false
): Promise<{
  success: boolean;
  totalFound: number;
  products: CatalogProductItem[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, totalFound: 0, products: [] };
  }

  const q = (query || '').trim();
  if (!q) {
    return { success: true, totalFound: 0, products: [] };
  }

  try {
    const maps = await getTaxonomyLookupMaps();

    // Stessi identici parametri e ordinamento a 3 livelli delle barre di ricerca già esistenti nel sito (/api/search/predictive)
    const baseSearchParams = {
      q,
      query_by:
        'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,180,150,100,100,100,100,80,80,80,60,50',
      prefix: 'true,true,true,true,true,true,true,true,true,true,false,false',
      include_fields:
        'id,sku,natural_sku,title,original_name,brand,product_group,family,category,technical_desc,description,unit,price,price_b2b,discgroup,stock,stock_main,stock_ek,image_url,catalog_source',
      per_page: 10,
    };

    const [tier1Res, tier2Res, tier3Res] = await Promise.all([
      warehouse === 'EXTERNAL_7GG' && !includeZeroStock
        ? Promise.resolve({ hits: [], found: 0 })
        : typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
            ...baseSearchParams,
            filter_by: 'catalog_source:=zucchetti && stock_main:>0',
            sort_by: '_text_match:desc,stock_main:desc,natural_sku:asc',
          }),
      warehouse === 'MAIN_2GG' && !includeZeroStock
        ? Promise.resolve({ hits: [], found: 0 })
        : typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
            ...baseSearchParams,
            filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:>0',
            sort_by: '_text_match:desc,stock_ek:desc,natural_sku:asc',
          }),
      typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        ...baseSearchParams,
        filter_by: 'catalog_source:=zucchetti && stock_main:<=0 && stock_ek:<=0',
        sort_by: '_text_match:desc,natural_sku:asc',
      }),
    ]);

    const rawHits = [
      ...(tier1Res?.hits || []),
      ...(tier2Res?.hits || []),
      ...(tier3Res?.hits || []),
    ].slice(0, 10);

    const totalFound =
      (tier1Res?.found || 0) + (tier2Res?.found || 0) + (tier3Res?.found || 0);

    const products: CatalogProductItem[] = rawHits.map((hit: any) => {
      const doc = hit.document || {};
      const brandCode = String(doc.brand || '').trim().toUpperCase();
      const pgCode = String(doc.product_group || '').trim().toUpperCase();
      const famCode = String(doc.family || '').trim().toUpperCase();
      const catCode = String(doc.category || '').trim().toUpperCase();
      const listPrice =
        Number(doc.price_b2b) > 0 ? Number(doc.price_b2b) : Number(doc.price || 0);
      const stockMain = Math.max(0, Number(doc.stock_main ?? doc.stock ?? 0));
      const stockEk = Math.max(0, Number(doc.stock_ek ?? 0));
      const stockTotal = stockMain + stockEk || Math.max(0, Number(doc.stock ?? 0));

      return {
        id: String(doc.id || doc.sku),
        sku: String(doc.sku || doc.natural_sku || ''),
        title: String(doc.original_name || doc.title || ''),
        originalName: String(doc.original_name || doc.title || ''),
        brand: brandCode,
        brandLabel: formatCodeWithLabel(brandCode, maps.brands),
        productGroup: pgCode,
        productGroupLabel: formatCodeWithLabel(pgCode, maps.productGroups),
        family: famCode,
        familyLabel: formatCodeWithLabel(famCode, maps.families),
        category: catCode,
        categoryLabel: formatCodeWithLabel(catCode, maps.categories),
        technicalDesc: String(doc.technical_desc || ''),
        description: String(doc.description || ''),
        unit: String(doc.unit || 'PZ'),
        listPrice,
        discgroup: String(doc.discgroup || ''),
        stockMain,
        stockEk,
        stockTotal,
        imageUrl: String(doc.image_url || ''),
        catalogSource: 'zucchetti',
      };
    });

    return {
      success: true,
      totalFound,
      products,
    };
  } catch (e) {
    console.error('Errore searchCatalogPredictiveAction:', e);
    return { success: false, totalFound: 0, products: [] };
  }
}

export interface GenerateCatalogPdfInput {
  catalogTitle: string;
  catalogSubtitle?: string;
  clientName?: string;
  clientCode?: string;
  agentName: string;
  filterSummary: string;
  priceMode: CatalogPriceMode;
  stockMode: CatalogStockMode;
  baseDiscount: number;
  extraDiscount: number;
  elmarkDiscounts?: Record<string, number>;
  items: {
    sku: string;
    title: string;
    brand: string;
    productGroupLabel?: string;
    familyLabel?: string;
    categoryLabel: string;
    technicalDesc: string;
    unit: string;
    listPrice: number;
    netPrice: number;
    discountPct: number;
    discountLabel?: string;
    stockMain: number;
    stockEk: number;
    stockTotal: number;
    catalogSource: 'zucchetti' | 'elmark';
    imageUrl?: string;
  }[];
}

function toPdfSafeLatin1(input: string): string {
  return (input || '')
    .replace(/€/g, 'EUR ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/Ø/g, 'O')
    .replace(/ø/g, 'o')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncateText(str: string, maxLen: number): string {
  const clean = (str || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trim() + '.';
}

function parseBaselineJpegDimensions(buf: Buffer): {
  width: number;
  height: number;
  components: number;
} | null {
  if (!buf || buf.length < 24 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segLen = buf.readUInt16BE(offset + 2);
    if (segLen < 2 || offset + 2 + segLen > buf.length) break;

    // Accettiamo solo Baseline DCT (0xC0) con 1 o 3 componenti (Gray o RGB)
    if (marker === 0xc0) {
      const precision = buf[offset + 4];
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      const components = buf[offset + 9];
      if (precision === 8 && width > 0 && height > 0 && (components === 1 || components === 3)) {
        return { width, height, components };
      }
      return null;
    }
    // Se è Progressive (0xC2) o altro SOF non baseline, evitiamo incompatibilità viewer
    if (marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
      return null;
    }
    offset += 2 + segLen;
  }
  return null;
}

function toJpegThumbnailUrl(rawUrl: string): string | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;
  // Cloudinary: forza trasformazione in baseline JPEG 220x220 su sfondo bianco per schede catalogo
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url
      .replace(
        /\/image\/upload\/(?:[^/]+\/)?/,
        '/image/upload/f_jpg,fl_force_strip,w_220,h_220,c_pad,b_white,q_85/'
      )
      .replace(/\.(webp|png|gif)$/i, '.jpg');
  }
  if (url.includes('cdn.shopify.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}format=jpg&width=220`;
  }
  // Proxy wsrv.nl per convertire PNG Elmark in baseline JPEG 220x220
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=220&h=220&fit=contain&bg=white&output=jpg&q=85`;
  }
  return null;
}

function wrapTextLines(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
  truncateOverflow = false
): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length === maxLines) {
          if (truncateOverflow) {
            const last = lines[maxLines - 1];
            lines[maxLines - 1] =
              last.length >= maxCharsPerLine - 1
                ? last.slice(0, maxCharsPerLine - 2).trim() + '..'
                : last + '..';
          }
          return lines;
        }
        currentLine = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine) : word;
      } else {
        lines.push(word.slice(0, maxCharsPerLine));
        if (lines.length === maxLines) return lines;
        currentLine = '';
      }
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

async function fetchJpegThumbnail(rawUrl?: string): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  components: number;
} | null> {
  if (!rawUrl) return null;
  const thumbUrl = toJpegThumbnailUrl(rawUrl);
  if (!thumbUrl) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(thumbUrl, { signal: controller.signal, cache: 'force-cache' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    const dims = parseBaselineJpegDimensions(buf);
    if (!dims) return null;
    return { bytes: buf, ...dims };
  } catch {
    return null;
  }
}

let cachedPdfHeaderLogo: {
  flateBytes: Buffer;
  width: number;
  height: number;
} | null = null;

function getCatalogPdfHeaderLogo(): {
  flateBytes: Buffer;
  width: number;
  height: number;
} | null {
  if (cachedPdfHeaderLogo) return cachedPdfHeaderLogo;

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'logo-izzo.png'),
      path.join(process.cwd(), 'apps', 'b2b-storefront', 'public', 'logo-izzo.png'),
    ];
    const logoPath = candidatePaths.find(p => fs.existsSync(p));
    if (!logoPath) return null;

    const buf = fs.readFileSync(logoPath);
    if (buf.length < 32 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;

    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];
    if (bitDepth !== 8 || colorType !== 6 || w <= 0 || h <= 0) return null;

    const idatChunks: Buffer[] = [];
    let pos = 8;
    while (pos + 8 <= buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (type === 'IDAT' && pos + 8 + len <= buf.length) {
        idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
      }
      pos += 12 + len;
    }

    const raw = zlib.inflateSync(Buffer.concat(idatChunks));
    const stride = w * 4 + 1;
    const rgba = new Uint8Array(w * h * 4);
    const prev = new Uint8Array(w * 4);
    const cur = new Uint8Array(w * 4);

    const paeth = (a: number, b: number, c: number) => {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    };

    for (let y = 0; y < h; y++) {
      const filter = raw[y * stride];
      const rowStart = y * stride + 1;
      for (let i = 0; i < w * 4; i++) {
        const x = raw[rowStart + i];
        const a = i >= 4 ? cur[i - 4] : 0;
        const b = prev[i];
        const c = i >= 4 ? prev[i - 4] : 0;
        const recon =
          filter === 1
            ? a
            : filter === 2
            ? b
            : filter === 3
            ? (a + b) >> 1
            : filter === 4
            ? paeth(a, b, c)
            : 0;
        cur[i] = (x + recon) & 0xff;
      }
      rgba.set(cur, y * w * 4);
      prev.set(cur);
    }

    // Ritaglio sul bounding box del logo Izzo e ridimensionamento nitido a 360 x 148 su sfondo nero (#000000)
    const cropX = Math.min(280, Math.floor(w * 0.065));
    const cropY = Math.min(360, Math.floor(h * 0.16));
    const cropW = Math.min(w - cropX, Math.floor(w * 0.865));
    const cropH = Math.min(h - cropY, Math.floor(h * 0.66));

    const outW = 360;
    const outH = 148;

    const rgbOut = Buffer.alloc(outW * outH * 3);
    const scaleX = cropW / outW;
    const scaleY = cropH / outH;

    for (let oy = 0; oy < outH; oy++) {
      const sy0 = Math.floor(cropY + oy * scaleY);
      const sy1 = Math.min(h, Math.ceil(cropY + (oy + 1) * scaleY));
      for (let ox = 0; ox < outW; ox++) {
        const sx0 = Math.floor(cropX + ox * scaleX);
        const sx1 = Math.min(w, Math.ceil(cropX + (ox + 1) * scaleX));
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;
        for (let sy = sy0; sy < sy1; sy += 2) {
          for (let sx = sx0; sx < sx1; sx += 2) {
            const idx = (sy * w + sx) * 4;
            const a = rgba[idx + 3] / 255;
            const pr = rgba[idx];
            let pg = rgba[idx + 1];
            const pb = rgba[idx + 2];
            if (pg > pr + 20 && pg > pb + 20) {
              pg = Math.min(255, Math.round(pg * 1.35 + 25));
            }
            rSum += pr * a;
            gSum += pg * a;
            bSum += pb * a;
            count++;
          }
        }
        const oIdx = (oy * outW + ox) * 3;
        rgbOut[oIdx] = count > 0 ? Math.round(rSum / count) : 0;
        rgbOut[oIdx + 1] = count > 0 ? Math.round(gSum / count) : 0;
        rgbOut[oIdx + 2] = count > 0 ? Math.round(bSum / count) : 0;
      }
    }

    const flateBytes = zlib.deflateSync(rgbOut, { level: 9 });
    cachedPdfHeaderLogo = { flateBytes, width: outW, height: outH };
    return cachedPdfHeaderLogo;
  } catch (e) {
    console.warn('Impossibile caricare logo-izzo.png per header PDF:', e);
    return null;
  }
}

export async function generateAgentCatalogPdfAction(
  input: GenerateCatalogPdfInput
): Promise<{
  success: boolean;
  error?: string;
  pdfBase64?: string;
  pdfFileName?: string;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const items = input.items || [];
  if (items.length === 0) {
    return { success: false, error: 'Seleziona almeno un prodotto per generare il catalogo PDF.' };
  }

  try {
    // Scarica in parallelo (a blocchi di 40) le miniature JPEG per tutti i prodotti selezionati
    const thumbs = new Map<
      number,
      { bytes: Buffer; width: number; height: number; components: number }
    >();
    const batchSize = 40;
    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      const results = await Promise.all(slice.map(it => fetchJpegThumbnail(it.imageUrl)));
      results.forEach((r, idx) => {
        if (r) thumbs.set(i + idx, r);
      });
    }

    // 6 SCHEDE PER FOGLIO A4 (Griglia 2 colonne x 3 righe)
    const ITEMS_PER_PAGE = 6;
    const COLS = 2;
    const CARD_W = 262;
    const CARD_H = 220;
    const GAP_X = 15;
    const GAP_Y = 14;
    const MARGIN_X = 28;
    const FIRST_ROW_TOP_Y = 738; // Y superiore della prima riga di schede (sotto la barra categoria)

    // 1. Raggruppamento per Categoria Merceologica (Gruppo -> Famiglia -> Categoria): ogni nuova categoria inizia su una pagina nuova
    interface IndexedItem {
      item: GenerateCatalogPdfInput['items'][number];
      globalIdx: number;
      groupLabel: string;
      familyLabel: string;
      categoryLabel: string;
    }

    interface CategorySection {
      key: string;
      groupLabel: string;
      familyLabel: string;
      categoryLabel: string;
      breadcrumb: string;
      entries: IndexedItem[];
    }

    const sectionMap = new Map<string, CategorySection>();
    const orderedSections: CategorySection[] = [];

    items.forEach((it, idx) => {
      const groupLabel = (it.productGroupLabel || 'CATALOGO GENERALE').trim();
      const familyLabel = (it.familyLabel || '').trim();
      const categoryLabel = (
        it.categoryLabel ||
        familyLabel ||
        groupLabel ||
        'Articoli a Catalogo'
      ).trim();
      const key = `${groupLabel.toUpperCase()}|||${familyLabel.toUpperCase()}|||${categoryLabel.toUpperCase()}`;
      let sec = sectionMap.get(key);
      if (!sec) {
        const breadcrumb = Array.from(
          new Set([groupLabel, familyLabel, categoryLabel].filter(Boolean))
        ).join('  >  ');
        sec = {
          key,
          groupLabel,
          familyLabel,
          categoryLabel,
          breadcrumb,
          entries: [],
        };
        sectionMap.set(key, sec);
        orderedSections.push(sec);
      }
      sec.entries.push({
        item: it,
        globalIdx: idx,
        groupLabel,
        familyLabel,
        categoryLabel,
      });
    });

    interface ProductPageSlice {
      groupLabel: string;
      familyLabel: string;
      categoryLabel: string;
      breadcrumb: string;
      entries: IndexedItem[];
    }

    const productPages: ProductPageSlice[] = [];
    const sectionStartOffset = new Map<string, number>();

    for (const sec of orderedSections) {
      sectionStartOffset.set(sec.key, productPages.length);
      for (let i = 0; i < sec.entries.length; i += ITEMS_PER_PAGE) {
        productPages.push({
          groupLabel: sec.groupLabel,
          familyLabel: sec.familyLabel,
          categoryLabel: sec.categoryLabel,
          breadcrumb: sec.breadcrumb,
          entries: sec.entries.slice(i, i + ITEMS_PER_PAGE),
        });
      }
    }

    // 2. Costruzione righe dell'Indice (Gruppo Merceologico -> Famiglia -> Categoria)
    interface PdfIndexRow {
      kind: 'GROUP' | 'CATEGORY';
      groupLabel: string;
      familyLabel: string;
      categoryLabel: string;
      itemsCount: number;
      firstProductPageOffset: number;
    }

    const rawIndexRows: PdfIndexRow[] = [];
    const groupsOrder: string[] = [];
    const sectionsByGroup = new Map<string, CategorySection[]>();

    for (const sec of orderedSections) {
      const gKey = sec.groupLabel.toUpperCase();
      if (!sectionsByGroup.has(gKey)) {
        sectionsByGroup.set(gKey, []);
        groupsOrder.push(gKey);
      }
      sectionsByGroup.get(gKey)!.push(sec);
    }

    for (const gKey of groupsOrder) {
      const secs = sectionsByGroup.get(gKey)!;
      const firstSec = secs[0];
      const totalInGroup = secs.reduce((acc, s) => acc + s.entries.length, 0);
      const groupFirstOffset = sectionStartOffset.get(firstSec.key) || 0;

      rawIndexRows.push({
        kind: 'GROUP',
        groupLabel: firstSec.groupLabel,
        familyLabel: '',
        categoryLabel: '',
        itemsCount: totalInGroup,
        firstProductPageOffset: groupFirstOffset,
      });

      for (const sec of secs) {
        rawIndexRows.push({
          kind: 'CATEGORY',
          groupLabel: sec.groupLabel,
          familyLabel: sec.familyLabel,
          categoryLabel: sec.categoryLabel,
          itemsCount: sec.entries.length,
          firstProductPageOffset: sectionStartOffset.get(sec.key) || 0,
        });
      }
    }

    const MAX_INDEX_ROWS_PER_PAGE = 16;
    const numIndexPages = Math.max(
      1,
      Math.ceil(rawIndexRows.length / MAX_INDEX_ROWS_PER_PAGE)
    );
    const totalPages = numIndexPages + productPages.length;

    const dateStr = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Costruzione oggetti PDF 1.4 multipagina con supporto XObject immagini JPEG + Logo Header + Annotazioni Link Indice
    // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font Regular, Obj 4: Font Bold
    const headerLogo = getCatalogPdfHeaderLogo();
    const imageObjMap = new Map<number, number>(); // itemIdx -> objectNumber
    let nextObjNum = 5;
    const logoObjNum = headerLogo ? nextObjNum++ : null;

    for (const [itemIdx] of Array.from(thumbs.entries())) {
      imageObjMap.set(itemIdx, nextObjNum++);
    }

    const pageObjNums: number[] = [];
    const contentObjNums: number[] = [];
    for (let p = 0; p < totalPages; p++) {
      pageObjNums.push(nextObjNum++);
      contentObjNums.push(nextObjNum++);
    }

    const pageContents: Buffer[] = [];
    const pageImageRefs: Map<number, number>[] = []; // per pagina: itemIdx -> objNum
    const pageLinkAnnots: {
      rect: [number, number, number, number];
      targetPageObjNum: number;
    }[][] = Array.from({ length: totalPages }, () => []);

    const pushCommonPageHeaderAndFooter = (cmd: string[], pageIdx: number) => {
      // Header pagina A4 (sfondo nero come l'header del sito) con Logo Izzo Distribuzione in alto a sinistra
      cmd.push('0 0 0 rg');
      cmd.push('0 772 595 70 re f');
      cmd.push('0.00 0.78 0.00 rg');
      cmd.push('0 769 595 3 re f');

      const textStartX = logoObjNum ? 164 : 28;
      if (logoObjNum) {
        cmd.push('q');
        cmd.push('118 0 0 48 28 783 cm');
        cmd.push('/ImLogo Do');
        cmd.push('Q');
        cmd.push('0.20 0.22 0.26 RG 0.8 w');
        cmd.push('154 782 m 154 830 l S');
      }

      cmd.push(
        `BT /F2 12.5 Tf 1 1 1 rg ${textStartX} 816 Td (IZZO DISTRIBUZIONE - CATALOGO PRODOTTI B2B) Tj ET`
      );
      cmd.push(
        `BT /F2 10 Tf 0.00 0.90 0.00 rg ${textStartX} 799 Td (${toPdfSafeLatin1(
          truncateText(
            input.catalogTitle
              ? `${input.catalogTitle}${input.catalogSubtitle ? ` - ${input.catalogSubtitle}` : ''}`
              : 'Catalogo Personalizzato Agente',
            logoObjNum ? 56 : 72
          )
        )}) Tj ET`
      );
      cmd.push(
        `BT /F1 8 Tf 0.82 0.85 0.90 rg ${textStartX} 783 Td (${toPdfSafeLatin1(
          truncateText(
            `Agente: ${input.agentName}${
              input.clientName ? `  |  Cliente: ${input.clientName}` : ''
            }  |  Data: ${dateStr}`,
            logoObjNum ? 74 : 95
          )
        )}) Tj ET`
      );
      cmd.push(
        `BT /F2 9 Tf 1 1 1 rg 480 816 Td (Foglio ${pageIdx + 1} / ${totalPages}) Tj ET`
      );
      cmd.push(
        `BT /F1 8 Tf 0.75 0.80 0.85 rg 465 799 Td (Tot. ${items.length} schede) Tj ET`
      );
    };

    // 3A. Generazione Pagine INDICE (all'inizio del catalogo: Foglio 1 .. numIndexPages)
    for (let idxPage = 0; idxPage < numIndexPages; idxPage++) {
      const cmd: string[] = [];
      const rowsSlice = rawIndexRows.slice(
        idxPage * MAX_INDEX_ROWS_PER_PAGE,
        (idxPage + 1) * MAX_INDEX_ROWS_PER_PAGE
      );

      pushCommonPageHeaderAndFooter(cmd, idxPage);

      // Fascia Titolo Indice
      cmd.push('0.07 0.09 0.14 rg');
      cmd.push('28 724 539 34 re f');
      cmd.push('0.00 0.78 0.00 rg');
      cmd.push('28 724 5 34 re f');
      cmd.push(
        `BT /F2 11 Tf 1 1 1 rg 42 742 Td (INDICE MERCEOLOGICO DEL CATALOGO${
          numIndexPages > 1 ? ` (PARTE ${idxPage + 1}/${numIndexPages})` : ''
        }) Tj ET`
      );
      cmd.push(
        `BT /F1 7.5 Tf 0.75 0.80 0.88 rg 42 730 Td (Suddivisione per Gruppo Merceologico, Famiglia e Categoria  -  Clicca su una voce per andare alla pagina) Tj ET`
      );

      let curY = 706;
      for (const row of rowsSlice) {
        const targetSheetIdx = numIndexPages + row.firstProductPageOffset;
        const targetPageNumber = targetSheetIdx + 1;
        const targetPageObj = pageObjNums[targetSheetIdx] || pageObjNums[0];

        if (row.kind === 'GROUP') {
          const boxH = 26;
          const boxY = curY - boxH;

          cmd.push('0.11 0.15 0.22 rg');
          cmd.push(`28 ${boxY} 539 ${boxH} re f`);
          cmd.push('0.00 0.78 0.00 rg');
          cmd.push(`28 ${boxY} 4 ${boxH} re f`);

          const grpText = truncateText(
            `GRUPPO: ${row.groupLabel.toUpperCase()}`,
            64
          );
          cmd.push(
            `BT /F2 9 Tf 1 1 1 rg 40 ${boxY + 9} Td (${toPdfSafeLatin1(grpText)}) Tj ET`
          );

          const countText = `${row.itemsCount} ${
            row.itemsCount === 1 ? 'articolo' : 'articoli'
          }`;
          cmd.push(
            `BT /F1 8 Tf 0.65 0.92 0.72 rg 425 ${boxY + 9} Td (${toPdfSafeLatin1(
              countText
            )}) Tj ET`
          );

          // Pill Pagina
          cmd.push('0.00 0.78 0.00 rg');
          cmd.push(`504 ${boxY + 4} 55 18 re f`);
          cmd.push(
            `BT /F2 8.5 Tf 0 0 0 rg 513 ${boxY + 9} Td (PAG. ${targetPageNumber}) Tj ET`
          );

          pageLinkAnnots[idxPage].push({
            rect: [28, boxY, 567, boxY + boxH],
            targetPageObjNum: targetPageObj,
          });

          curY -= boxH + 8;
        } else {
          const boxH = 24;
          const boxY = curY - boxH;

          cmd.push('0.98 0.98 0.99 rg');
          cmd.push(`38 ${boxY} 529 ${boxH} re f`);
          cmd.push('0.86 0.89 0.93 RG 0.6 w');
          cmd.push(`38 ${boxY} 529 ${boxH} re S`);

          const catTitle =
            row.familyLabel &&
            row.familyLabel.toUpperCase() !== row.categoryLabel.toUpperCase()
              ? `${row.familyLabel}  >  ${row.categoryLabel}`
              : row.categoryLabel;
          const cleanCatTitle = truncateText(catTitle, 58);

          cmd.push(
            `BT /F2 8.5 Tf 0.10 0.14 0.20 rg 48 ${boxY + 8} Td (${toPdfSafeLatin1(
              cleanCatTitle
            )}) Tj ET`
          );

          // Puntini di guida
          const approxTextW = Math.min(285, cleanCatTitle.length * 4.5 + 14);
          const dotsStartX = 48 + approxTextW;
          if (dotsStartX < 410) {
            cmd.push('0.75 0.79 0.85 RG 0.5 w [1.5 2.5] 0 d');
            cmd.push(`${dotsStartX.toFixed(1)} ${boxY + 9} m 415 ${boxY + 9} l S`);
            cmd.push('[] 0 d');
          }

          const countBadge = `${row.itemsCount} art.`;
          cmd.push(
            `BT /F1 7.5 Tf 0.40 0.45 0.54 rg 428 ${boxY + 8} Td (${toPdfSafeLatin1(
              countBadge
            )}) Tj ET`
          );

          cmd.push('0.91 0.98 0.93 rg');
          cmd.push('0.00 0.68 0.20 RG 0.6 w');
          cmd.push(`504 ${boxY + 3.5} 55 17 re B`);
          cmd.push(
            `BT /F2 8 Tf 0.04 0.42 0.14 rg 514 ${boxY + 8} Td (Pag. ${targetPageNumber}) Tj ET`
          );

          pageLinkAnnots[idxPage].push({
            rect: [38, boxY, 567, boxY + boxH],
            targetPageObjNum: targetPageObj,
          });

          curY -= boxH + 6;
        }
      }

      // Footer pagina indice
      cmd.push('0.85 0.87 0.90 RG 0.5 w');
      cmd.push('28 28 567 28 m l S');
      cmd.push(
        'BT /F1 7.5 Tf 0.45 0.48 0.53 rg 28 16 Td (Izzo Distribuzione S.r.l. - Portale B2B www.izzodistribuzione.it - Prezzi IVA esclusa salvo errori e/o omissioni.) Tj ET'
      );

      pageContents.push(Buffer.from(cmd.join('\n'), 'latin1'));
      pageImageRefs.push(new Map<number, number>());
    }

    // 3B. Generazione Pagine PRODOTTI (ogni nuova categoria inizia su una pagina nuova)
    for (let prodPageIdx = 0; prodPageIdx < productPages.length; prodPageIdx++) {
      const pageIdx = numIndexPages + prodPageIdx;
      const pageData = productPages[prodPageIdx];
      const pageSlice = pageData.entries;
      const cmd: string[] = [];
      const imgRefsForPage = new Map<number, number>();

      pushCommonPageHeaderAndFooter(cmd, pageIdx);

      // Barra Categoria Merceologica della Pagina
      cmd.push('0.94 0.96 0.99 rg');
      cmd.push('28 744 539 18 re f');
      cmd.push('0.00 0.78 0.00 rg');
      cmd.push('28 744 4 18 re f');
      cmd.push(
        `BT /F2 7.5 Tf 0.10 0.15 0.24 rg 38 750 Td (${toPdfSafeLatin1(
          truncateText(pageData.breadcrumb.toUpperCase(), 92)
        )}) Tj ET`
      );

      // Griglia 6 Schede per foglio (2 colonne x 3 righe)
      pageSlice.forEach((entry, localIdx) => {
        const item = entry.item;
        const globalIdx = entry.globalIdx;
        const col = localIdx % COLS; // 0 o 1
        const row = Math.floor(localIdx / COLS); // 0, 1 o 2

        const cardX = MARGIN_X + col * (CARD_W + GAP_X);
        const cardTopY = FIRST_ROW_TOP_Y - row * (CARD_H + GAP_Y);
        const cardY = cardTopY - CARD_H;

        // 1. Cornice esterna della Scheda Prodotto
        cmd.push('1 1 1 rg');
        cmd.push(`${cardX} ${cardY} ${CARD_W} ${CARD_H} re f`);
        cmd.push('0.82 0.85 0.90 RG 0.8 w');
        cmd.push(`${cardX} ${cardY} ${CARD_W} ${CARD_H} re S`);

        // 2. Fascia superiore della Scheda (SKU a sinistra, Marchio a destra)
        const headerH = 22;
        const headerY = cardTopY - headerH;
        cmd.push('0.09 0.12 0.19 rg');
        cmd.push(`${cardX} ${headerY} ${CARD_W} ${headerH} re f`);
        cmd.push('0.00 0.78 0.00 rg');
        cmd.push(`${cardX} ${headerY - 1.5} ${CARD_W} 1.5 re f`);

        cmd.push(
          `BT /F2 8.5 Tf 1 1 1 rg ${cardX + 8} ${headerY + 7} Td (COD. ${toPdfSafeLatin1(
            truncateText(item.sku, 20)
          )}) Tj ET`
        );

        const brandTag = truncateText((item.brand || 'IZZO').toUpperCase(), 18);
        const brandX = cardX + CARD_W - Math.min(brandTag.length * 4.7 + 12, 115);
        cmd.push(
          `BT /F2 7.5 Tf 0.25 0.95 0.40 rg ${brandX.toFixed(1)} ${headerY + 7} Td (${toPdfSafeLatin1(
            brandTag
          )}) Tj ET`
        );

        // 3. Sezione Superiore-Centrale: Foto Prodotto (78x78) a sinistra + Categoria/Titolo 40 car./Giacenza a destra
        const imgBoxSize = 78;
        const imgX = cardX + 8;
        const imgY = cardY + 119;

        cmd.push('0.98 0.98 0.99 rg');
        cmd.push(`${imgX} ${imgY} ${imgBoxSize} ${imgBoxSize} re f`);
        cmd.push('0.88 0.90 0.94 RG 0.5 w');
        cmd.push(`${imgX} ${imgY} ${imgBoxSize} ${imgBoxSize} re S`);

        const imgObjNum = imageObjMap.get(globalIdx);
        if (imgObjNum) {
          imgRefsForPage.set(globalIdx, imgObjNum);
          cmd.push('q');
          cmd.push(`${imgBoxSize - 6} 0 0 ${imgBoxSize - 6} ${imgX + 3} ${imgY + 3} cm`);
          cmd.push(`/Im${globalIdx} Do`);
          cmd.push('Q');
        } else {
          cmd.push(
            `BT /F2 7 Tf 0.58 0.63 0.70 rg ${imgX + 14} ${imgY + 42} Td ( IMMAGINE ) Tj ET`
          );
          cmd.push(
            `BT /F1 6 Tf 0.65 0.70 0.76 rg ${imgX + 10} ${imgY + 31} Td (NON DISPONIBILE) Tj ET`
          );
        }

        // Colonna Destra accanto alla foto (Categoria + Titolo di 40 caratteri completo + Bollino Disponibilità)
        const infoX = cardX + 92;
        const infoW = CARD_W - 100; // 162pt

        // Categoria
        const catText = truncateText(
          (item.categoryLabel || 'ARTICOLO A CATALOGO').toUpperCase(),
          34
        );
        cmd.push(
          `BT /F2 6.5 Tf 0.38 0.45 0.56 rg ${infoX} ${cardY + 188} Td (${toPdfSafeLatin1(
            catText
          )}) Tj ET`
        );

        // Titolo Prodotto (descrizione Zucchetti di 40 caratteri, mai troncata)
        const titleLines = wrapTextLines(item.title || item.sku, 29, 3, false);
        titleLines.forEach((line, lIdx) => {
          const lineY = cardY + 174 - lIdx * 11;
          cmd.push(
            `BT /F2 8.5 Tf 0.07 0.09 0.14 rg ${infoX} ${lineY} Td (${toPdfSafeLatin1(
              line
            )}) Tj ET`
          );
        });

        // Bollino Disponibilità / Giacenze (se abilitato)
        if (input.stockMode !== 'HIDE_STOCK') {
          let stockLabel = '';
          let isReady2GG = false;
          let isAvail7GG = false;

          if (input.stockMode === 'BADGE_ONLY') {
            if (item.catalogSource === 'elmark') {
              isAvail7GG = item.stockTotal > 0;
              stockLabel = isAvail7GG ? 'Disponibile (Consegna 7GG)' : 'Su ordinazione';
            } else if (item.stockMain > 0 && item.stockEk > 0) {
              isReady2GG = true;
              stockLabel = 'Pronta Consegna 2GG + 7GG';
            } else if (item.stockMain > 0) {
              isReady2GG = true;
              stockLabel = 'Pronta Consegna (2GG)';
            } else if (item.stockEk > 0) {
              isAvail7GG = true;
              stockLabel = 'Disponibile (Consegna 7GG)';
            } else {
              stockLabel = 'Su ordinazione';
            }
          } else {
            // EXACT_QTY
            if (item.catalogSource === 'elmark') {
              isAvail7GG = item.stockTotal > 0;
              stockLabel = `Consegna 7GG: ${item.stockTotal} ${item.unit || 'PZ'}`;
            } else {
              isReady2GG = item.stockMain > 0;
              isAvail7GG = item.stockEk > 0;
              const parts: string[] = [];
              parts.push(`2GG: ${item.stockMain} ${item.unit || 'PZ'}`);
              parts.push(`7GG: ${item.stockEk} ${item.unit || 'PZ'}`);
              stockLabel = parts.join(' | ');
            }
          }

          if (isReady2GG) {
            cmd.push('0.91 0.98 0.93 rg');
            cmd.push('0.68 0.88 0.74 RG 0.5 w');
          } else if (isAvail7GG) {
            cmd.push('0.91 0.95 0.99 rg');
            cmd.push('0.70 0.82 0.95 RG 0.5 w');
          } else {
            cmd.push('0.95 0.96 0.97 rg');
            cmd.push('0.84 0.86 0.89 RG 0.5 w');
          }
          cmd.push(`${infoX} ${cardY + 119} ${infoW} 17 re B`);

          if (isReady2GG) {
            cmd.push('0.05 0.45 0.18 rg');
          } else if (isAvail7GG) {
            cmd.push('0.10 0.35 0.68 rg');
          } else {
            cmd.push('0.40 0.44 0.50 rg');
          }
          cmd.push(
            `BT /F2 7 Tf ${infoX + 6} ${cardY + 125} Td (${toPdfSafeLatin1(
              truncateText(stockLabel, 32)
            )}) Tj ET`
          );
        }

        // 4. Fascia Centrale: Specifiche e Descrizione Tecnica COMPLETA (non troncata, alta 68pt)
        const specBoxX = cardX + 8;
        const specBoxY = cardY + 46;
        const specBoxW = CARD_W - 16; // 246pt
        const specBoxH = 68;

        cmd.push('0.96 0.97 0.99 rg');
        cmd.push(`${specBoxX} ${specBoxY} ${specBoxW} ${specBoxH} re f`);
        cmd.push('0.89 0.91 0.95 RG 0.4 w');
        cmd.push(`${specBoxX} ${specBoxY} ${specBoxW} ${specBoxH} re S`);

        cmd.push(
          `BT /F2 6.5 Tf 0.38 0.43 0.52 rg ${specBoxX + 6} ${
            specBoxY + 57
          } Td (SPECIFICHE E DESCRIZIONE TECNICA) Tj ET`
        );

        const rawSpecs = (item.technicalDesc || item.title || '')
          .replace(/;/g, '  |  ')
          .replace(/\s+/g, ' ')
          .trim();

        if (rawSpecs) {
          // Adatta automaticamente dimensione font e caratteri per riga per non troncare mai la descrizione tecnica
          let specFontSize = 7;
          let specLineStep = 9;
          let specLines = wrapTextLines(rawSpecs, 58, 12, false);

          if (specLines.length > 5 && specLines.length <= 7) {
            specFontSize = 6.2;
            specLineStep = 7.4;
            specLines = wrapTextLines(rawSpecs, 66, 12, false);
          } else if (specLines.length > 7) {
            specFontSize = 5.5;
            specLineStep = 6.2;
            specLines = wrapTextLines(rawSpecs, 75, 12, false);
          }

          specLines.slice(0, 8).forEach((sLine, sIdx) => {
            const lineY = specBoxY + 45 - sIdx * specLineStep;
            if (lineY >= specBoxY + 3) {
              cmd.push(
                `BT /F1 ${specFontSize} Tf 0.18 0.22 0.29 rg ${specBoxX + 6} ${lineY.toFixed(
                  1
                )} Td (${toPdfSafeLatin1(sLine)}) Tj ET`
              );
            }
          });
        } else {
          cmd.push(
            `BT /F1 7 Tf 0.50 0.55 0.62 rg ${specBoxX + 6} ${
              specBoxY + 42
            } Td (Unita' di vendita: ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
          );
        }

        // 5. Fascia Inferiore della Scheda: Box Prezzi (o riepilogo tecnico se NO_PRICE)
        const priceBoxX = cardX + 8;
        const priceBoxY = cardY + 6;
        const priceBoxW = CARD_W - 16; // 246pt
        const priceBoxH = 35;

        if (input.priceMode === 'NO_PRICE') {
          cmd.push('0.94 0.95 0.97 rg');
          cmd.push(`${priceBoxX} ${priceBoxY} ${priceBoxW} ${priceBoxH} re f`);
          cmd.push('0.84 0.87 0.91 RG 0.5 w');
          cmd.push(`${priceBoxX} ${priceBoxY} ${priceBoxW} ${priceBoxH} re S`);

          cmd.push(
            `BT /F2 7.5 Tf 0.25 0.30 0.38 rg ${priceBoxX + 8} ${
              priceBoxY + 21
            } Td (SCHEDA TECNICA PRODOTTO  -  UNITA': ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
          );
          cmd.push(
            `BT /F1 7 Tf 0.45 0.50 0.58 rg ${priceBoxX + 8} ${
              priceBoxY + 10
            } Td (Richiedi quotazione riservata al tuo agente di riferimento) Tj ET`
          );
        } else {
          cmd.push('0.95 0.99 0.96 rg');
          cmd.push(`${priceBoxX} ${priceBoxY} ${priceBoxW} ${priceBoxH} re f`);
          cmd.push('0.76 0.89 0.78 RG 0.6 w');
          cmd.push(`${priceBoxX} ${priceBoxY} ${priceBoxW} ${priceBoxH} re S`);

          const listFmt = `EUR ${item.listPrice.toFixed(2).replace('.', ',')}`;
          const netFmt = `EUR ${item.netPrice.toFixed(2).replace('.', ',')}`;

          if (input.priceMode === 'LIST_ONLY') {
            cmd.push(
              `BT /F2 7.5 Tf 0.35 0.40 0.48 rg ${priceBoxX + 8} ${
                priceBoxY + 22
              } Td (PREZZO DI LISTINO) Tj ET`
            );
            cmd.push(
              `BT /F1 6.5 Tf 0.45 0.50 0.56 rg ${priceBoxX + 8} ${
                priceBoxY + 10
              } Td (IVA esclusa / per ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
            );
            cmd.push(
              `BT /F2 12.5 Tf 0.08 0.10 0.15 rg ${priceBoxX + 140} ${
                priceBoxY + 14
              } Td (${toPdfSafeLatin1(listFmt)}) Tj ET`
            );
          } else if (input.priceMode === 'NET_ONLY') {
            cmd.push(
              `BT /F2 7.5 Tf 0.05 0.45 0.15 rg ${priceBoxX + 8} ${
                priceBoxY + 22
              } Td (PREZZO NETTO RISERVATO) Tj ET`
            );
            cmd.push(
              `BT /F1 6.5 Tf 0.40 0.46 0.52 rg ${priceBoxX + 8} ${
                priceBoxY + 10
              } Td (IVA esclusa / per ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
            );
            cmd.push(
              `BT /F2 12.5 Tf 0.04 0.45 0.14 rg ${priceBoxX + 140} ${
                priceBoxY + 14
              } Td (${toPdfSafeLatin1(netFmt)}) Tj ET`
            );
          } else {
            // LIST_AND_NET
            cmd.push(
              `BT /F1 7.5 Tf 0.40 0.44 0.50 rg ${priceBoxX + 8} ${
                priceBoxY + 23
              } Td (Listino: ${toPdfSafeLatin1(listFmt)}) Tj ET`
            );
            if (item.discountPct > 0) {
              const discText = item.discountLabel
                ? `Sconto riservato: -${item.discountLabel}`
                : `Sconto riservato: -${item.discountPct.toFixed(1).replace('.0', '')}%`;
              cmd.push(
                `BT /F2 7.5 Tf 0.80 0.14 0.14 rg ${priceBoxX + 8} ${
                  priceBoxY + 10
                } Td (${toPdfSafeLatin1(truncateText(discText, 32))}) Tj ET`
              );
            } else {
              cmd.push(
                `BT /F1 6.5 Tf 0.45 0.50 0.56 rg ${priceBoxX + 8} ${
                  priceBoxY + 10
                } Td (IVA esclusa / ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
              );
            }

            cmd.push(
              `BT /F2 6.5 Tf 0.05 0.45 0.15 rg ${priceBoxX + 138} ${
                priceBoxY + 26
              } Td (PREZZO NETTO / ${toPdfSafeLatin1(item.unit || 'PZ')}) Tj ET`
            );
            cmd.push(
              `BT /F2 12 Tf 0.04 0.45 0.14 rg ${priceBoxX + 138} ${
                priceBoxY + 11
              } Td (${toPdfSafeLatin1(netFmt)}) Tj ET`
            );
          }
        }
      });

      // Footer pagina
      cmd.push('0.85 0.87 0.90 RG 0.5 w');
      cmd.push('28 28 567 28 m l S');
      cmd.push(
        'BT /F1 7.5 Tf 0.45 0.48 0.53 rg 28 16 Td (Izzo Distribuzione S.r.l. - Portale B2B www.izzodistribuzione.it - Prezzi IVA esclusa salvo errori e/o omissioni.) Tj ET'
      );

      pageContents.push(Buffer.from(cmd.join('\n'), 'latin1'));
      pageImageRefs.push(imgRefsForPage);
    }

    // Assemblaggio binario del PDF 1.4 (supporta stream binari JPEG)
    const chunks: Buffer[] = [];
    const offsets: number[] = [];
    let currentLength = 0;

    const pushBuffer = (buf: Buffer) => {
      chunks.push(buf);
      currentLength += buf.length;
    };
    const pushStr = (str: string) => {
      pushBuffer(Buffer.from(str, 'latin1'));
    };

    pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // Obj 1: Catalog
    offsets[1] = currentLength;
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages
    offsets[2] = currentLength;
    const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
    pushStr(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj\n`);

    // Obj 3: Font Regular
    offsets[3] = currentLength;
    pushStr(
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
    );

    // Obj 4: Font Bold
    offsets[4] = currentLength;
    pushStr(
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
    );

    // Oggetto XObject Logo Header (FlateDecode RGB)
    if (headerLogo && logoObjNum) {
      offsets[logoObjNum] = currentLength;
      pushStr(
        `${logoObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${headerLogo.width} /Height ${headerLogo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${headerLogo.flateBytes.length} >>\nstream\n`
      );
      pushBuffer(headerLogo.flateBytes);
      pushStr('\nendstream\nendobj\n');
    }

    // Oggetti Immagini XObject (JPEG)
    for (const [itemIdx, objNum] of Array.from(imageObjMap.entries())) {
      const thumb = thumbs.get(itemIdx)!;
      const colorSpace = thumb.components === 1 ? '/DeviceGray' : '/DeviceRGB';
      offsets[objNum] = currentLength;
      pushStr(
        `${objNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${thumb.width} /Height ${thumb.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${thumb.bytes.length} >>\nstream\n`
      );
      pushBuffer(thumb.bytes);
      pushStr('\nendstream\nendobj\n');
    }

    // Oggetti Pagine e relativi Content Stream
    for (let p = 0; p < totalPages; p++) {
      const pageObjNum = pageObjNums[p];
      const contentObjNum = contentObjNums[p];
      const imgRefs = pageImageRefs[p];
      const xObjectParts: string[] = [];
      if (logoObjNum) {
        xObjectParts.push(`/ImLogo ${logoObjNum} 0 R`);
      }
      for (const [idx, oNum] of Array.from(imgRefs.entries())) {
        xObjectParts.push(`/Im${idx} ${oNum} 0 R`);
      }
      const xObjectEntries = xObjectParts.join(' ');
      const xObjectDict = xObjectEntries ? ` /XObject << ${xObjectEntries} >>` : '';

      const links = pageLinkAnnots[p] || [];
      let annotsDict = '';
      if (links.length > 0) {
        const inlineAnnots = links
          .map(
            l =>
              `<< /Type /Annot /Subtype /Link /Rect [${l.rect
                .map(n => n.toFixed(1))
                .join(' ')}] /Border [0 0 0] /Dest [${l.targetPageObjNum} 0 R /Fit] >>`
          )
          .join(' ');
        annotsDict = ` /Annots [${inlineAnnots}]`;
      }

      offsets[pageObjNum] = currentLength;
      pushStr(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjectDict} >>${annotsDict} /Contents ${contentObjNum} 0 R >>\nendobj\n`
      );

      const contentBuf = pageContents[p];
      offsets[contentObjNum] = currentLength;
      pushStr(`${contentObjNum} 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`);
      pushBuffer(contentBuf);
      pushStr('\nendstream\nendobj\n');
    }

    const totalObjects = nextObjNum - 1;
    const xrefOffset = currentLength;
    pushStr(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= totalObjects; i++) {
      const off = offsets[i] || 0;
      pushStr(`${String(off).padStart(10, '0')} 00000 n \n`);
    }
    pushStr(
      `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    );

    const finalPdfBuffer = Buffer.concat(chunks);
    const safeTitle = (input.catalogTitle || 'Catalogo_B2B')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);

    return {
      success: true,
      pdfBase64: finalPdfBuffer.toString('base64'),
      pdfFileName: `Catalogo_Izzo_${safeTitle}.pdf`,
    };
  } catch (err: any) {
    console.error('Errore generateAgentCatalogPdfAction:', err);
    return {
      success: false,
      error: err.message || 'Errore durante la generazione del PDF del catalogo.',
    };
  }
}
