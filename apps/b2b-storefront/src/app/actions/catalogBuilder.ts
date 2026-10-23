'use server';

import { verifySession } from '@/lib/session';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { prisma as mainPrisma } from '@archelia/database';
import { getAgentClientsList, AgentManagedClient } from './newClient';
import taxonomyData from '@/lib/taxonomy.json';

export interface CatalogFacetOption {
  code: string;
  label: string;
  count: number;
}

export type WarehouseFilterMode =
  | 'ALL_AVAILABLE'
  | 'MAIN_2GG'
  | 'EXTERNAL_7GG'
  | 'BOTH_WAREHOUSES'
  | 'ALL_INCLUDING_OOS';

export type CatalogSourceMode = 'ZUCCHETTI' | 'ELMARK' | 'ALL';

export type CatalogPriceMode = 'LIST_AND_NET' | 'NET_ONLY' | 'LIST_ONLY' | 'NO_PRICE';

export type CatalogStockMode = 'BADGE_ONLY' | 'HIDE_STOCK' | 'EXACT_QTY';

export type CatalogSortMode =
  | 'STOCK_DESC'
  | 'SKU_ASC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'TITLE_ASC';

export interface CatalogSearchFilters {
  catalogSource: CatalogSourceMode;
  query: string;
  warehouse: WarehouseFilterMode;
  brands: string[];
  productGroups: string[];
  families: string[];
  categories: string[];
  sortBy: CatalogSortMode;
  limit: number;
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

async function getTaxonomyLookupMaps(): Promise<TaxonomyMaps> {
  if (cachedTaxonomyMaps && Date.now() < cachedTaxonomyMaps.expiresAt) {
    return cachedTaxonomyMaps.data;
  }

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
  cachedTaxonomyMaps = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
  return data;
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

  // 1. Sorgente catalogo
  if (filters.catalogSource === 'ZUCCHETTI') {
    clauses.push('catalog_source:=zucchetti');
  } else if (filters.catalogSource === 'ELMARK') {
    clauses.push('brand:=ELMARK');
  }

  // 2. Filtro Deposito / Giacenza
  if (filters.warehouse === 'MAIN_2GG') {
    clauses.push('stock_main:>0');
  } else if (filters.warehouse === 'EXTERNAL_7GG') {
    clauses.push('stock_ek:>0');
  } else if (filters.warehouse === 'BOTH_WAREHOUSES') {
    clauses.push('stock_main:>0 && stock_ek:>0');
  } else if (filters.warehouse === 'ALL_AVAILABLE') {
    clauses.push('stock:>0');
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
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const [clientsRes, initialSearch] = await Promise.all([
    getAgentClientsList(),
    searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: '',
      warehouse: 'ALL_AVAILABLE',
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'STOCK_DESC',
      limit: 100,
    }),
  ]);

  const agentName =
    clientsRes.agentName ||
    session.user.companyName ||
    `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
    session.user.username;

  return {
    success: true,
    agentName,
    agentCode: clientsRes.agentCode || session.user.zucchettiCode || '',
    clients: clientsRes.clients || [],
    initialSearch,
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
    const maps = await getTaxonomyLookupMaps();
    const rawQuery = (filters.query || '').trim();
    const isWildcard = !rawQuery || rawQuery === '*';
    const q = isWildcard ? '*' : rawQuery;

    const requestedLimit = Math.min(Math.max(filters.limit || 100, 10), 500);
    const perPage = Math.min(requestedLimit, 250);
    const pagesToFetch = requestedLimit > 250 ? 2 : 1;

    let sortByStr = 'stock_main:desc,stock_ek:desc,natural_sku:asc';
    if (filters.sortBy === 'SKU_ASC') {
      sortByStr = isWildcard ? 'natural_sku:asc' : '_text_match:desc,natural_sku:asc';
    } else if (filters.sortBy === 'PRICE_ASC') {
      sortByStr = 'price_b2b:asc,natural_sku:asc';
    } else if (filters.sortBy === 'PRICE_DESC') {
      sortByStr = 'price_b2b:desc,natural_sku:asc';
    } else if (filters.sortBy === 'TITLE_ASC') {
      sortByStr = '_text_match:desc,natural_sku:asc';
    } else {
      sortByStr = isWildcard
        ? 'stock_main:desc,stock_ek:desc,natural_sku:asc'
        : '_text_match:desc,stock_main:desc,natural_sku:asc';
    }

    const filterBy = buildTypesenseFilterString(filters);

    // Costruisce anche una query facet di contesto (filtrata per sorgente e deposito) così le tendine mostrano tutte le opzioni disponibili
    const baseFacetClauses: string[] = [];
    if (filters.catalogSource === 'ZUCCHETTI') {
      baseFacetClauses.push('catalog_source:=zucchetti');
    } else if (filters.catalogSource === 'ELMARK') {
      baseFacetClauses.push('brand:=ELMARK');
    }
    if (filters.warehouse === 'MAIN_2GG') {
      baseFacetClauses.push('stock_main:>0');
    } else if (filters.warehouse === 'EXTERNAL_7GG') {
      baseFacetClauses.push('stock_ek:>0');
    } else if (filters.warehouse === 'BOTH_WAREHOUSES') {
      baseFacetClauses.push('stock_main:>0 && stock_ek:>0');
    } else if (filters.warehouse === 'ALL_AVAILABLE') {
      baseFacetClauses.push('stock:>0');
    }

    const pagePromises = [];
    for (let page = 1; page <= pagesToFetch; page++) {
      pagePromises.push(
        typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q,
            query_by:
              'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
            query_by_weights: '200,180,150,100,100,100,100,80,80,80,60,50',
            filter_by: filterBy || undefined,
            sort_by: sortByStr,
            facet_by: 'brand,product_group,family,category',
            max_facet_values: 250,
            per_page: perPage,
            page,
          })
      );
    }

    // Se ci sono filtri di marchio/categoria attivi, eseguiamo in parallelo una query leggera (per_page: 0) per non far sparire le altre opzioni dai selettori
    const hasSubFilters =
      filters.brands.length > 0 ||
      filters.productGroups.length > 0 ||
      filters.families.length > 0 ||
      filters.categories.length > 0;

    const facetResPromise = hasSubFilters
      ? typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q,
            query_by:
              'sku_prefixes,sku,natural_sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
            filter_by: baseFacetClauses.join(' && ') || undefined,
            facet_by: 'brand,product_group,family,category',
            max_facet_values: 250,
            per_page: 0,
          })
      : null;

    const [pageResults, broadFacetRes] = await Promise.all([
      Promise.all(pagePromises),
      facetResPromise,
    ]);

    const firstPage = pageResults[0];
    const totalFound = firstPage?.found || 0;
    const allHits = pageResults.flatMap(r => r?.hits || []).slice(0, requestedLimit);

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
        title: String(doc.title || doc.original_name || ''),
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

    if (filters.sortBy === 'TITLE_ASC') {
      products.sort((a, b) => (a.title || a.originalName).localeCompare(b.title || b.originalName, 'it'));
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

    return {
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
    categoryLabel: string;
    technicalDesc: string;
    unit: string;
    listPrice: number;
    netPrice: number;
    discountPct: number;
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
  // Cloudinary: forza trasformazione in baseline JPEG 120x120 su sfondo bianco
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url
      .replace(
        /\/image\/upload\/(?:[^/]+\/)?/,
        '/image/upload/f_jpg,fl_force_strip,w_120,h_120,c_pad,b_white,q_80/'
      )
      .replace(/\.(webp|png|gif)$/i, '.jpg');
  }
  if (url.includes('cdn.shopify.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}format=jpg&width=120`;
  }
  // Proxy gratuito wsrv.nl per convertire PNG Elmark in baseline JPEG 120x120
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=120&h=120&fit=contain&bg=white&output=jpg&q=80`;
  }
  return null;
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

  const items = (input.items || []).slice(0, 300);
  if (items.length === 0) {
    return { success: false, error: 'Seleziona almeno un prodotto per generare il catalogo PDF.' };
  }

  try {
    // Scarica in parallelo (a blocchi di 15) le miniature JPEG per i primi 120 prodotti
    const thumbs = new Map<
      number,
      { bytes: Buffer; width: number; height: number; components: number }
    >();
    const maxThumbItems = Math.min(items.length, 120);
    const batchSize = 15;
    for (let i = 0; i < maxThumbItems; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      const results = await Promise.all(slice.map(it => fetchJpegThumbnail(it.imageUrl)));
      results.forEach((r, idx) => {
        if (r) thumbs.set(i + idx, r);
      });
    }

    const ITEMS_PER_PAGE = 9;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const dateStr = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Costruzione oggetti PDF 1.4 multipagina con supporto XObject immagini JPEG
    // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font Regular, Obj 4: Font Bold
    const imageObjMap = new Map<number, number>(); // itemIdx -> objectNumber
    let nextObjNum = 5;

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

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageSlice = items.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);
      const cmd: string[] = [];
      const imgRefsForPage = new Map<number, number>();

      // Header pagina
      cmd.push('0.07 0.09 0.15 rg');
      cmd.push('0 772 595 70 re f');
      cmd.push('0.00 0.78 0.00 rg');
      cmd.push('0 769 595 3 re f');

      cmd.push('BT /F2 15 Tf 1 1 1 rg 28 815 Td (IZZO DISTRIBUZIONE - CATALOGO PRODOTTI B2B) Tj ET');
      cmd.push(
        `BT /F2 10 Tf 0.00 0.90 0.00 rg 28 798 Td (${toPdfSafeLatin1(
          truncateText(input.catalogTitle || 'Catalogo Personalizzato Agente', 65)
        )}) Tj ET`
      );
      cmd.push(
        `BT /F1 8 Tf 0.82 0.85 0.90 rg 28 783 Td (${toPdfSafeLatin1(
          truncateText(
            `Agente: ${input.agentName}${
              input.clientName ? `  |  Cliente: ${input.clientName}` : ''
            }  |  Data: ${dateStr}`,
            95
          )
        )}) Tj ET`
      );
      cmd.push(
        `BT /F2 9 Tf 1 1 1 rg 490 815 Td (Pag. ${pageIdx + 1} / ${totalPages}) Tj ET`
      );
      cmd.push(
        `BT /F1 8 Tf 0.75 0.80 0.85 rg 450 798 Td (Articoli: ${items.length}) Tj ET`
      );

      // Fascia riepilogo filtri
      cmd.push('0.95 0.96 0.98 rg');
      cmd.push('28 744 539 20 re f');
      cmd.push('0.85 0.88 0.92 RG 0.5 w');
      cmd.push('28 744 539 20 re S');
      cmd.push(
        `BT /F1 7.5 Tf 0.25 0.30 0.38 rg 35 751 Td (${toPdfSafeLatin1(
          truncateText(input.filterSummary || 'Tutti i prodotti selezionati', 110)
        )}) Tj ET`
      );

      // Righe prodotti (9 card per pagina, altezza 72pt ciascuna)
      let currentY = 664;
      pageSlice.forEach((item, localIdx) => {
        const globalIdx = pageIdx * ITEMS_PER_PAGE + localIdx;

        // Box scheda prodotto
        cmd.push('1 1 1 rg');
        cmd.push(`28 ${currentY} 539 68 re f`);
        cmd.push('0.86 0.88 0.91 RG 0.6 w');
        cmd.push(`28 ${currentY} 539 68 re S`);

        // Box miniatura foto (56x56)
        const imgX = 34;
        const imgY = currentY + 6;
        const imgSize = 56;
        cmd.push('0.97 0.98 0.99 rg');
        cmd.push(`${imgX} ${imgY} ${imgSize} ${imgSize} re f`);
        cmd.push('0.90 0.92 0.95 RG 0.4 w');
        cmd.push(`${imgX} ${imgY} ${imgSize} ${imgSize} re S`);

        const imgObjNum = imageObjMap.get(globalIdx);
        if (imgObjNum) {
          imgRefsForPage.set(globalIdx, imgObjNum);
          cmd.push('q');
          cmd.push(`${imgSize - 4} 0 0 ${imgSize - 4} ${imgX + 2} ${imgY + 2} cm`);
          cmd.push(`/Im${globalIdx} Do`);
          cmd.push('Q');
        } else {
          cmd.push(
            `BT /F2 6.5 Tf 0.55 0.60 0.68 rg ${imgX + 8} ${imgY + 26} Td (${toPdfSafeLatin1(
              truncateText(item.brand || 'FOTO', 8)
            )}) Tj ET`
          );
        }

        // Colonna centrale: SKU, Brand, Categoria, Titolo e Specifiche
        const textX = 98;
        const badgeLine = `${item.sku}   [${item.brand || 'IZZO'}]${
          item.categoryLabel ? `  -  ${truncateText(item.categoryLabel, 38)}` : ''
        }`;
        cmd.push(
          `BT /F2 8.5 Tf 0.05 0.45 0.15 rg ${textX} ${currentY + 52} Td (${toPdfSafeLatin1(
            badgeLine
          )}) Tj ET`
        );

        const cleanTitle = (item.title || '').replace(/\s+/g, ' ').trim();
        const titleLine1 = cleanTitle.slice(0, 62);
        const titleLine2 = cleanTitle.length > 62 ? truncateText(cleanTitle.slice(62), 62) : '';

        cmd.push(
          `BT /F2 9.5 Tf 0.08 0.10 0.15 rg ${textX} ${currentY + 38} Td (${toPdfSafeLatin1(
            titleLine1
          )}) Tj ET`
        );
        if (titleLine2) {
          cmd.push(
            `BT /F1 8.5 Tf 0.18 0.22 0.28 rg ${textX} ${currentY + 26} Td (${toPdfSafeLatin1(
              titleLine2
            )}) Tj ET`
          );
        } else if (item.technicalDesc) {
          cmd.push(
            `BT /F1 7.5 Tf 0.38 0.42 0.50 rg ${textX} ${currentY + 25} Td (${toPdfSafeLatin1(
              truncateText(item.technicalDesc.replace(/;/g, ' | '), 68)
            )}) Tj ET`
          );
        }

        // Giacenza / Disponibilità (in base a stockMode)
        if (input.stockMode !== 'HIDE_STOCK') {
          let stockLabel = '';
          if (input.stockMode === 'BADGE_ONLY') {
            if (item.catalogSource === 'elmark') {
              stockLabel = item.stockTotal > 0 ? 'Disponibile (Consegna 7GG)' : 'Su ordinazione';
            } else if (item.stockMain > 0 && item.stockEk > 0) {
              stockLabel = 'Pronta Consegna 2GG + Deposito 7GG';
            } else if (item.stockMain > 0) {
              stockLabel = 'Pronta Consegna (Deposito 2GG)';
            } else if (item.stockEk > 0) {
              stockLabel = 'Disponibile (Deposito 7GG)';
            } else {
              stockLabel = 'Su ordinazione';
            }
          } else {
            // EXACT_QTY
            if (item.catalogSource === 'elmark') {
              stockLabel = `Disp. 7GG: ${item.stockTotal} ${item.unit || 'PZ'}`;
            } else {
              const parts: string[] = [];
              if (item.stockMain > 0) parts.push(`Dep. 2GG: ${item.stockMain} ${item.unit || 'PZ'}`);
              if (item.stockEk > 0) parts.push(`Dep. 7GG: ${item.stockEk} ${item.unit || 'PZ'}`);
              stockLabel = parts.length > 0 ? parts.join('  |  ') : 'Esaurito (0 pz)';
            }
          }
          cmd.push(
            `BT /F2 7.5 Tf 0.15 0.35 0.65 rg ${textX} ${currentY + 11} Td (${toPdfSafeLatin1(
              stockLabel
            )}) Tj ET`
          );
        }

        // Colonna destra: Prezzi (in base a priceMode)
        if (input.priceMode !== 'NO_PRICE') {
          cmd.push('0.96 0.98 0.96 rg');
          cmd.push(`445 ${currentY + 6} 116 56 re f`);
          cmd.push('0.82 0.90 0.82 RG 0.5 w');
          cmd.push(`445 ${currentY + 6} 116 56 re S`);

          const listFmt = `EUR ${item.listPrice.toFixed(2).replace('.', ',')}`;
          const netFmt = `EUR ${item.netPrice.toFixed(2).replace('.', ',')}`;

          if (input.priceMode === 'LIST_ONLY') {
            cmd.push(
              `BT /F1 7.5 Tf 0.40 0.45 0.52 rg 453 ${currentY + 46} Td (Prezzo Listino) Tj ET`
            );
            cmd.push(
              `BT /F2 11.5 Tf 0.08 0.10 0.15 rg 453 ${currentY + 28} Td (${toPdfSafeLatin1(
                listFmt
              )}) Tj ET`
            );
            cmd.push(
              `BT /F1 7 Tf 0.45 0.50 0.55 rg 453 ${currentY + 14} Td (IVA esclusa / ${toPdfSafeLatin1(
                item.unit || 'PZ'
              )}) Tj ET`
            );
          } else if (input.priceMode === 'NET_ONLY') {
            cmd.push(
              `BT /F1 7.5 Tf 0.05 0.45 0.15 rg 453 ${currentY + 46} Td (Prezzo Riservato) Tj ET`
            );
            cmd.push(
              `BT /F2 11.5 Tf 0.05 0.45 0.15 rg 453 ${currentY + 28} Td (${toPdfSafeLatin1(
                netFmt
              )}) Tj ET`
            );
            cmd.push(
              `BT /F1 7 Tf 0.45 0.50 0.55 rg 453 ${currentY + 14} Td (Netto IVA escl. / ${toPdfSafeLatin1(
                item.unit || 'PZ'
              )}) Tj ET`
            );
          } else {
            // LIST_AND_NET
            cmd.push(
              `BT /F1 7.5 Tf 0.45 0.48 0.54 rg 453 ${currentY + 48} Td (Listino: ${toPdfSafeLatin1(
                listFmt
              )}) Tj ET`
            );
            if (item.discountPct > 0) {
              cmd.push(
                `BT /F2 7.5 Tf 0.80 0.15 0.15 rg 453 ${currentY + 37} Td (Sconto: -${item.discountPct.toFixed(
                  1
                ).replace('.0', '')}%) Tj ET`
              );
            }
            cmd.push(
              `BT /F2 11 Tf 0.05 0.45 0.15 rg 453 ${currentY + 22} Td (${toPdfSafeLatin1(
                netFmt
              )}) Tj ET`
            );
            cmd.push(
              `BT /F1 6.5 Tf 0.45 0.50 0.55 rg 453 ${currentY + 11} Td (Netto IVA escl. / ${toPdfSafeLatin1(
                item.unit || 'PZ'
              )}) Tj ET`
            );
          }
        }

        currentY -= 73;
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
      const xObjectEntries = Array.from(imgRefs.entries())
        .map(([idx, oNum]) => `/Im${idx} ${oNum} 0 R`)
        .join(' ');
      const xObjectDict = xObjectEntries ? ` /XObject << ${xObjectEntries} >>` : '';

      offsets[pageObjNum] = currentLength;
      pushStr(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjectDict} >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
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
