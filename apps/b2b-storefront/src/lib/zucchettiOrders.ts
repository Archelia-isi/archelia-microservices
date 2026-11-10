import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { Pool } from 'pg';
import { Agent } from 'undici';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

let mainDbPool: Pool | null = null;
function getMainDbPool(): Pool | null {
  if (!mainDbPool && process.env.DATABASE_URL) {
    mainDbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return mainDbPool;
}

const ELMARK_DISCGROUPS = new Set(['E1', 'L', 'E2', 'F', 'C']);

function getZucchettiBaseUrl(): string {
  return (process.env.ZUCCHETTI_BASE_URL || 'https://infinity.immobiliareizzo.com/ahrweb').replace(/\/$/, '');
}

async function zFetch(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fetchOptions = {
      ...options,
      dispatcher: zucchettiDispatcher,
      signal: options.signal || controller.signal,
    } as unknown as RequestInit;
    return await fetch(url, fetchOptions);
  } finally {
    clearTimeout(timer);
  }
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Converte il log XML / tecnico di Zucchetti in un messaggio pulito e leggibile per l'utente,
 * senza mai esporre XML grezzo, query SQL o stack trace Java nella UI.
 */
function formatCleanZucchettiError(decodedLog: string, httpStatus?: number): string {
  if (httpStatus && httpStatus >= 400) {
    return `Il server gestionale Zucchetti non ha risposto correttamente (HTTP ${httpStatus}). Riprova tra qualche istante.`;
  }

  const text = String(decodedLog || '');
  if (!text) {
    return 'Impossibile completare la registrazione del documento su Zucchetti.';
  }

  if (text.includes('fk_a0002saldiart_2') || text.includes('a0002art_icol')) {
    return 'Errore nella causale documento o nell’anagrafica articolo su Zucchetti (codice articolo/saldi magazzino non validi per la causale selezionata).';
  }

  if (text.includes('MVUNIMIS')) {
    return 'Uno o più articoli dell’ordine non risultano presenti o codificati correttamente nell’anagrafica Zucchetti.';
  }

  if (text.includes('MVCODCON') || text.includes('fk_a0002doc_mast')) {
    return 'Il codice cliente associato all’ordine non risulta valido nell’anagrafica Zucchetti.';
  }

  if (text.includes('XML file is not valid') || text.includes('File XML non valido')) {
    return 'Formato del tracciato ordine non allineato con lo schema Zucchetti.';
  }

  const codeMatch = text.match(/ErrorCode="([^"@]+)/);
  if (codeMatch && codeMatch[1]) {
    return `Impossibile registrare l’ordine su Zucchetti (codice errore gestionale: ${codeMatch[1].trim()}).`;
  }

  return 'Impossibile registrare l’ordine su Zucchetti. Verifica i dati dell’ordine o contatta l’assistenza.';
}

/**
 * Scompone una stringa di sconto a cascata (es. "50+10%", "40+5%", "-50%", "20+10")
 * nei singoli sconti separati [50, 10] (fino a 4 sconti: MVSCONT1..MVSCONT4).
 * Non somma e non accorpa mai (es. 50+10 resta [50, 10], mai [55]).
 */
export function parseCascadeDiscounts(discountString?: string | null): number[] {
  if (!discountString) return [];
  const cleaned = String(discountString)
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return [];

  const parts = cleaned.split('+');
  const discounts: number[] = [];

  for (const part of parts) {
    const normalized = part.replace(/^-+/, '').replace(',', '.').trim();
    if (!normalized) continue;
    const val = Number(normalized);
    if (Number.isFinite(val) && val > 0 && val < 100) {
      discounts.push(Number(val.toFixed(2)));
    }
    if (discounts.length >= 4) break;
  }

  return discounts;
}

/**
 * Genera un MVSERIAL_K univoco di massimo 10 caratteri per Zucchetti:
 * - B2Ixxxxxxx per ordini negozio Izzo Distribuzione (ORDCL)
 * - B2Exxxxxxx per ordini negozio Elmark (ORDIC)
 */
export function generateB2BZucchettiSerial(orderId: string, storeMode: string): string {
  const prefix = storeMode === 'ELMARK' ? 'B2E' : 'B2I';
  const cleanId = String(orderId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const suffix = cleanId.slice(-7).padStart(7, '0');
  return `${prefix}${suffix}`.substring(0, 10);
}

/**
 * Estrae il suffisso dopo il primo punto da un codice articolo Zucchetti (es. "E61.40241" -> "40241", "IL175. 99LED837W" -> "99LED837W").
 */
function extractCodeAfterDot(sku: string): string {
  const dotIdx = sku.indexOf('.');
  if (dotIdx === -1) return '';
  return sku.substring(dotIdx + 1).trim().toUpperCase();
}

/**
 * Dato uno SKU salvato nell'ordine (che nel negozio Elmark è il codice puro Elmark es. "40241",
 * mentre nel negozio Izzo Distribuzione è il codice Zucchetti es. "E61.40241"),
 * trova il documento Typesense corrispondente nel catalogo Zucchetti e il record in elmark_processed_products,
 * restituendo il vero codice articolo Zucchetti (ARCODAR2), le giacenze e il prezzo di acquisto Elmark.
 */
export async function resolveZucchettiProductForOrderItem(
  rawSku: string,
  storeMode: 'ZUCCHETTI' | 'ELMARK'
): Promise<{
  zucchettiSku: string;
  unit: string;
  stockMain: number;
  stockElmark: number;
  isElmarkWorld: boolean;
  priceB2b: number;
  priceElmark: number;
  purchasePrice: number;
}> {
  const cleanSku = String(rawSku || '').trim();
  const upperSku = cleanSku.toUpperCase();
  const codeAfterDot = upperSku.includes('.') ? extractCodeAfterDot(upperSku) : upperSku;

  // 1. Cerca nella tabella elmark_processed_products (per ottenere il purchasePrice di acquisto e lo SKU Zucchetti)
  let elmarkDbRow: {
    sku: string;
    elmarkCode: string;
    price: number;
    purchasePrice: number;
    discgroup: string | null;
  } | null = null;

  try {
    const dbPool = getMainDbPool();
    if (dbPool) {
      const dbRes = upperSku.includes('.')
        ? await dbPool.query(
            `SELECT sku, "elmarkCode", price, "purchasePrice", discgroup
             FROM elmark_processed_products
             WHERE LOWER(TRIM(sku)) = LOWER($1)
             LIMIT 1`,
            [cleanSku]
          )
        : await dbPool.query(
            `SELECT sku, "elmarkCode", price, "purchasePrice", discgroup
             FROM elmark_processed_products
             WHERE LOWER(TRIM(sku)) = LOWER($1)
                OR LOWER(TRIM("elmarkCode")) = LOWER($1)
             LIMIT 1`,
            [cleanSku]
          );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        elmarkDbRow = {
          sku: String(row.sku || ''),
          elmarkCode: String(row.elmarkCode || ''),
          price: Number(row.price || 0),
          purchasePrice: Number(row.purchasePrice || 0),
          discgroup: row.discgroup ? String(row.discgroup) : null,
        };
      }
    }
  } catch (err) {
    console.warn(`[ZucchettiOrders] Avviso lettura elmark_processed_products per SKU ${cleanSku}:`, err);
  }

  let directProd: any = null;
  try {
    directProd = await getProductById(cleanSku);
  } catch {}

  let zucchettiDoc: any =
    directProd && directProd.catalog_source === 'zucchetti' ? directProd : null;
  let elmarkDoc: any =
    directProd && directProd.catalog_source === 'elmark' ? directProd : null;

  // Se abbiamo trovato lo SKU Zucchetti in elmark_processed_products ma non abbiamo ancora zucchettiDoc da Typesense
  if (!zucchettiDoc && elmarkDbRow?.sku) {
    try {
      const byDbSku: any = await getProductById(elmarkDbRow.sku.trim());
      if (byDbSku && byDbSku.catalog_source === 'zucchetti') {
        zucchettiDoc = byDbSku;
      }
    } catch {}
  }

  // Se non abbiamo ancora il documento del catalogo Zucchetti (es. ordine dal negozio Elmark dove rawSku = "40241"),
  // cerchiamo il corrispettivo articolo Zucchetti in Typesense (catalog_source:=zucchetti)
  if (!zucchettiDoc) {
    try {
      const searchRes = await typesenseClient
        .collections(PRODUCTS_COLLECTION_NAME)
        .documents()
        .search({
          q: cleanSku,
          query_by: 'sku,natural_sku,title',
          filter_by: 'catalog_source:=zucchetti',
          per_page: 50,
        });

      const hits = (searchRes?.hits || []).map((h: any) => h.document).filter(Boolean);

      // 1. Match esatto sullo SKU completo
      zucchettiDoc = hits.find(
        (d: any) => String(d.sku || '').trim().toUpperCase() === upperSku
      );

      // 2. Match esatto sul codice Elmark dopo il punto (es. "E61.40241" o "IL175. 99LED837W" per "40241" / "99LED837W")
      if (!zucchettiDoc) {
        zucchettiDoc = hits.find((d: any) => {
          const dSku = String(d.sku || '').trim().toUpperCase();
          return extractCodeAfterDot(dSku) === codeAfterDot;
        });
      }
    } catch (err) {
      console.warn(`[ZucchettiOrders] Errore ricerca corrispettivo Zucchetti per SKU ${cleanSku}:`, err);
    }
  }

  const refDoc = zucchettiDoc || directProd;
  const resolvedZucchettiSku = String(zucchettiDoc?.sku || elmarkDbRow?.sku || cleanSku).trim();

  const rawUnit = String(refDoc?.unit || 'PZ')
    .trim()
    .toUpperCase()
    .substring(0, 3);
  const unit = rawUnit || 'PZ';

  const stockMain = Math.max(0, Number(zucchettiDoc?.stock_main ?? directProd?.stock_main ?? 0));
  const totalStock = Math.max(0, Number(zucchettiDoc?.stock ?? directProd?.stock ?? 0));
  const stockElmark =
    zucchettiDoc?.stock_elmark !== undefined && zucchettiDoc?.stock_elmark !== null
      ? Math.max(0, Number(zucchettiDoc.stock_elmark))
      : Math.max(0, totalStock - stockMain);

  const brandUpper = String(zucchettiDoc?.brand || directProd?.brand || '')
    .trim()
    .toUpperCase();
  const discgroupUpper = String(
    elmarkDbRow?.discgroup || zucchettiDoc?.discgroup || directProd?.discgroup || ''
  )
    .trim()
    .toUpperCase();

  // Verifica se il prodotto appartiene realmente al catalogo fornitore Elmark (presente in elmark_processed_products o brand EK)
  const isElmarkWorld =
    storeMode === 'ELMARK' ||
    Boolean(elmarkDbRow) ||
    Boolean(elmarkDoc) ||
    ELMARK_DISCGROUPS.has(discgroupUpper) ||
    brandUpper === 'EK' ||
    brandUpper === 'ELMARK';

  const purchasePrice =
    elmarkDbRow && Number(elmarkDbRow.purchasePrice) > 0
      ? Number(elmarkDbRow.purchasePrice)
      : isElmarkWorld && Number(zucchettiDoc?.price_b2b || 0) > 0
        ? Number((Number(zucchettiDoc.price_b2b) / 3).toFixed(4))
        : 0;

  // Per i prodotti non presenti in PR (stockMain === 0) appartenenti a Elmark,
  // il prezzo di listino Izzo Distribuzione è sempre purchasePrice * 3
  const priceB2b =
    stockMain === 0 && purchasePrice > 0
      ? Number((purchasePrice * 3).toFixed(5))
      : Number(zucchettiDoc?.price_b2b) > 0
        ? Number(zucchettiDoc.price_b2b)
        : Number(zucchettiDoc?.price || directProd?.price || 0);
  const priceElmark = Number(
    elmarkDbRow?.price || elmarkDoc?.price || directProd?.price || priceB2b || 0
  );

  return {
    zucchettiSku: resolvedZucchettiSku,
    unit,
    stockMain,
    stockElmark,
    isElmarkWorld,
    priceB2b,
    priceElmark,
    purchasePrice,
  };
}

export interface ZucchettiOrderRowPayload {
  sku: string;
  warehouse: 'PR' | 'EK' | null;
  unit: string;
  quantity: number;
  listPrice: number;
  discounts: number[];
}

export function buildAdhocDocumentiXml(params: {
  mvSerial: string;
  mvTipDoc: 'ORDCL' | 'ORDIC';
  customerCode: string;
  dateStr: string;
  destinationCode?: string | null;
  externalRef?: string | null;
  rows: ZucchettiOrderRowPayload[];
  includeDiscountTags: boolean;
}): string {
  const destAttr =
    params.destinationCode && params.destinationCode.trim()
      ? ` MVCODDES="${escapeXml(params.destinationCode.trim())}"`
      : '';

  const extRefAttr =
    params.externalRef && params.externalRef.trim()
      ? ` MVNUMFAT="${escapeXml(params.externalRef.trim().substring(0, 50))}"`
      : '';

  const rowsXml = params.rows
    .map((row, idx) => {
      const rowNum = idx + 1;
      const warehouseTagXml = row.warehouse ? `\n        <MVCODMAG>${row.warehouse}</MVCODMAG>` : '';
      const discountTagsXml =
        params.includeDiscountTags && row.discounts.length > 0
          ? row.discounts
              .slice(0, 4)
              .map((d, dIdx) => {
                const negVal = -Math.abs(d);
                return `\n        <MVSCONT${dIdx + 1}>${negVal.toFixed(2)}</MVSCONT${dIdx + 1}>`;
              })
              .join('')
          : '';

      return `      <ADHOC_DOCUMENTI_d>
        <CPROWNUM_K>${rowNum}</CPROWNUM_K>
        <MVNUMRIF_K>0</MVNUMRIF_K>
        <MVCODICE>${escapeXml(row.sku)}</MVCODICE>${warehouseTagXml}
        <MVUNIMIS>${escapeXml(row.unit)}</MVUNIMIS>
        <MVQTAMOV>${row.quantity.toFixed(2)}</MVQTAMOV>
        <MVPREZZO>${row.listPrice.toFixed(4)}</MVPREZZO>${discountTagsXml}
        <useMappingDirect>N</useMappingDirect>
      </ADHOC_DOCUMENTI_d>`;
    })
    .join('\n');

  return `<ADHOC_DOCUMENTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="00004">
  <Add_ADHOC_DOCUMENTI MVCLADOC="OR" MVCODCON="${escapeXml(params.customerCode)}" MVDATDOC="${params.dateStr}" MVDATREG="${params.dateStr}" MVFLVEAC="V" MVSERIAL_K="${escapeXml(params.mvSerial)}" MVTIPDOC="${params.mvTipDoc}"${destAttr}${extRefAttr}>
    <BO_ADHOC_DOCUMENTI_d>
${rowsXml}
    </BO_ADHOC_DOCUMENTI_d>
  </Add_ADHOC_DOCUMENTI>
</ADHOC_DOCUMENTI>`;
}

/**
 * Invia un ordine B2B approvato a Zucchetti esclusivamente sull'azienda Izzo Distribuzione (A0002, flusso 00004):
 * - Soglia Salva-Scaffale PR (70%): un articolo del Mondo Elmark non intacca PR se quantità > stockMain * 0.70.
 * - Soglia Porto Franco Elmark (> 500 €): se il nostro costo di acquisto complessivo dei prodotti Elmark nell'ordine
 *   (calcolato da elmark_processed_products.purchasePrice) supera i 500 €, tutti i prodotti Elmark passano su ORDIC.
 * - Negozio Izzo Distribuzione (storeMode === 'ZUCCHETTI'):
 *   1) Ordine composto SOLO da prodotti del Mondo Elmark:
 *      - Se costo acquisto > 500 € OPPURE anche un solo articolo supera il 70% di PR -> 1 ordine ORDIC (senza magazzino) con prezzi/sconti Izzo Distribuzione
 *      - Altrimenti -> 1 ordine ORDCL (magazzino PR) con prezzi/sconti Izzo Distribuzione
 *   2) Ordine MISTO (prodotti non-Elmark + prodotti Mondo Elmark):
 *      - Prodotti non-Elmark restano sempre su ORDCL (magazzino PR)
 *      - Se costo acquisto Elmark > 500 €, tutti i prodotti Elmark vengono tolti dall'ORDCL e spostati in un secondo ordine ORDIC (senza magazzino)
 *      - Se costo acquisto Elmark <= 500 €, i prodotti Elmark con quantità > 70% di PR vengono tolti dall'ORDCL e spostati per l'intera quantità in un secondo ordine ORDIC (senza magazzino)
 * - Negozio Elmark (storeMode === 'ELMARK') -> 1 ordine ORDIC (senza magazzino) con prezzi/sconti Elmark.
 */
export async function sendB2BOrderToZucchetti(orderId: string): Promise<{
  success: boolean;
  mvSerial?: string;
  mvTipDoc?: 'ORDCL' | 'ORDIC';
  splitOrderId?: string;
  splitMvSerial?: string;
  totalElmarkPurchaseCost?: number;
  discountsAcceptedByXsd?: boolean;
  rowsSent?: ZucchettiOrderRowPayload[];
  log?: string;
  error?: string;
}> {
  const order = await prisma.b2BOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: true,
    },
  });

  if (!order) {
    return { success: false, error: `Ordine ${orderId} non trovato.` };
  }

  if (!order.items || order.items.length === 0) {
    return { success: false, error: `L'ordine ${orderId} non contiene righe articolo.` };
  }

  const customerCode = (order.user?.zucchettiCode || '').trim().toUpperCase();
  if (!customerCode) {
    return {
      success: false,
      error: `Il cliente associato all'ordine non possiede ancora un codice conto Zucchetti definitivo.`,
    };
  }

  const storeMode = order.storeMode === 'ELMARK' ? 'ELMARK' : 'ZUCCHETTI';
  const dateStr = (order.createdAt || new Date()).toISOString().split('T')[0];

  // Fase 1: Risolve per ogni riga il codice Zucchetti (ARCODAR2), le giacenze PR/EK, il purchasePrice Elmark e l'appartenenza al Mondo Elmark
  interface ResolvedOrderItem {
    itemId: string;
    rawSku: string;
    zucchettiSku: string;
    unit: string;
    quantity: number;
    listPrice: number;
    finalPrice: number;
    discountString: string | null;
    discounts: number[];
    stockMain: number;
    stockElmark: number;
    isElmarkWorld: boolean;
    purchasePrice: number;
  }

  const resolvedItems: ResolvedOrderItem[] = [];

  for (const item of order.items) {
    if (item.quantity <= 0) continue;

    const meta = await resolveZucchettiProductForOrderItem(item.sku, storeMode);

    const listPrice =
      Number(item.originalPrice) > 0
        ? Number(item.originalPrice)
        : storeMode === 'ELMARK'
          ? meta.priceElmark || Number(item.finalPrice || 0)
          : meta.priceB2b || Number(item.finalPrice || 0);

    const discounts = parseCascadeDiscounts(item.discountString);

    resolvedItems.push({
      itemId: item.id,
      rawSku: item.sku,
      zucchettiSku: meta.zucchettiSku,
      unit: meta.unit,
      quantity: item.quantity,
      listPrice,
      finalPrice: Number(item.finalPrice || listPrice),
      discountString: item.discountString || null,
      discounts,
      stockMain: meta.stockMain,
      stockElmark: meta.stockElmark,
      isElmarkWorld: meta.isElmarkWorld,
      purchasePrice: meta.purchasePrice,
    });
  }

  if (resolvedItems.length === 0) {
    return { success: false, error: 'Nessuna riga ordine valida da inviare a Zucchetti.' };
  }

  // Calcolo del nostro costo di acquisto complessivo verso Elmark (dalla tabella elmark_processed_products.purchasePrice)
  const totalElmarkPurchaseCost = Number(
    resolvedItems
      .filter(it => it.isElmarkWorld)
      .reduce((sum, it) => sum + it.purchasePrice * it.quantity, 0)
      .toFixed(2)
  );
  const elmarkCostExceeds500 = totalElmarkPurchaseCost > 500;

  // Un prodotto Elmark supera la capienza di sicurezza PR se la quantità richiesta è > 70% della giacenza PR
  const exceeds70PctPr = (it: ResolvedOrderItem) => it.quantity > it.stockMain * 0.7;

  interface ZucchettiDocumentPlan {
    mvSerial: string;
    mvTipDoc: 'ORDCL' | 'ORDIC';
    rows: ZucchettiOrderRowPayload[];
    items: ResolvedOrderItem[];
  }

  const documentsToSend: ZucchettiDocumentPlan[] = [];

  if (storeMode === 'ELMARK') {
    // Negozio Elmark: sempre 1 ordine ORDIC (senza magazzino)
    const mvSerial = order.zucchettiOrderRef || generateB2BZucchettiSerial(order.id, 'ELMARK');
    documentsToSend.push({
      mvSerial,
      mvTipDoc: 'ORDIC',
      items: resolvedItems,
      rows: resolvedItems.map(it => ({
        sku: it.zucchettiSku,
        warehouse: null,
        unit: it.unit,
        quantity: it.quantity,
        listPrice: it.listPrice,
        discounts: it.discounts,
      })),
    });
  } else {
    // Negozio Izzo Distribuzione (prezzi e sconti Izzo Distribuzione)
    const allItemsAreElmarkWorld = resolvedItems.every(it => it.isElmarkWorld);

    if (allItemsAreElmarkWorld) {
      // Caso 1: Ordine composto SOLO da prodotti del Mondo Elmark
      const anyItemExceeds70PctPr = resolvedItems.some(exceeds70PctPr);

      if (elmarkCostExceeds500 || anyItemExceeds70PctPr) {
        // Tutto l'ordine si trasforma in ORDIC (senza magazzino) mantenendo i prezzi e sconti Izzo Distribuzione
        const mvSerial = order.zucchettiOrderRef || generateB2BZucchettiSerial(order.id, 'ELMARK');
        documentsToSend.push({
          mvSerial,
          mvTipDoc: 'ORDIC',
          items: resolvedItems,
          rows: resolvedItems.map(it => ({
            sku: it.zucchettiSku,
            warehouse: null,
            unit: it.unit,
            quantity: it.quantity,
            listPrice: it.listPrice,
            discounts: it.discounts,
          })),
        });
      } else {
        // Tutti sotto il 70% di PR e costo acquisto <= 500 € -> tutto in ORDCL su magazzino PR
        const mvSerial = order.zucchettiOrderRef || generateB2BZucchettiSerial(order.id, 'ZUCCHETTI');
        documentsToSend.push({
          mvSerial,
          mvTipDoc: 'ORDCL',
          items: resolvedItems,
          rows: resolvedItems.map(it => ({
            sku: it.zucchettiSku,
            warehouse: 'PR',
            unit: it.unit,
            quantity: it.quantity,
            listPrice: it.listPrice,
            discounts: it.discounts,
          })),
        });
      }
    } else {
      // Caso 2: Ordine MISTO (prodotti non-Elmark + prodotti Mondo Elmark)
      const ordclItems: ResolvedOrderItem[] = [];
      const ordicItems: ResolvedOrderItem[] = [];

      for (const it of resolvedItems) {
        if (!it.isElmarkWorld) {
          // Prodotto non-Elmark: resta sempre nell'ordine ORDCL su magazzino PR
          ordclItems.push(it);
        } else if (elmarkCostExceeds500 || exceeds70PctPr(it)) {
          // Prodotto Elmark che sfora il 70% di PR (o ordine con costo acquisto Elmark > 500 €):
          // viene tolto dall'ordine misto ORDCL e spostato per l'intera quantità in un nuovo ordine ORDIC
          ordicItems.push(it);
        } else {
          // Prodotto Elmark entro il 70% di PR e sotto i 500 € di costo acquisto: resta in ORDCL su PR
          ordclItems.push(it);
        }
      }

      if (ordclItems.length > 0) {
        documentsToSend.push({
          mvSerial: generateB2BZucchettiSerial(order.id, 'ZUCCHETTI'),
          mvTipDoc: 'ORDCL',
          items: ordclItems,
          rows: ordclItems.map(it => ({
            sku: it.zucchettiSku,
            warehouse: 'PR',
            unit: it.unit,
            quantity: it.quantity,
            listPrice: it.listPrice,
            discounts: it.discounts,
          })),
        });
      }

      if (ordicItems.length > 0) {
        documentsToSend.push({
          mvSerial: generateB2BZucchettiSerial(order.id, 'ELMARK'),
          mvTipDoc: 'ORDIC',
          items: ordicItems,
          rows: ordicItems.map(it => ({
            sku: it.zucchettiSku,
            warehouse: null,
            unit: it.unit,
            quantity: it.quantity,
            listPrice: it.listPrice,
            discounts: it.discounts,
          })),
        });
      }
    }
  }

  const allRowsSent = documentsToSend.flatMap(d => d.rows);
  const primaryDoc = documentsToSend[0];

  const baseUrl = getZucchettiBaseUrl();
  const tokenParams = new URLSearchParams();
  tokenParams.set('username', process.env.ZUCCHETTI_USERNAME || 'Soapserv');
  tokenParams.set('password', process.env.ZUCCHETTI_PASSWORD || 'SspSrvZ2025%%');
  tokenParams.set('company', 'A0002');
  tokenParams.set('instance', 'SERVLET');

  let token = '';
  try {
    const tokenRes = await zFetch(`${baseUrl}/api/getToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      return {
        success: false,
        error: `Autenticazione Zucchetti (A0002) fallita (HTTP ${tokenRes.status}).`,
      };
    }

    const tokenJson: any = await tokenRes.json();
    token = tokenJson?.responseData?.result || '';
    if (!token) {
      return {
        success: false,
        error: 'Token Zucchetti non ricevuto da /api/getToken per A0002.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Errore di connessione a Zucchetti (/api/getToken): ${err.message}`,
    };
  }

  const executePost = async (xmlPayload: string, docSerial: string) => {
    const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
    const importUrl = `${baseUrl}/api/${appId}/ADHOC_DOCUMENTI`;
    const bodyParams = new URLSearchParams();
    bodyParams.set('data', xmlPayload);

    const impRes = await zFetch(importUrl, {
      method: 'POST',
      headers: {
        authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body: bodyParams.toString(),
    });

    if (!impRes.ok) {
      const errTxt = await impRes.text();
      console.error(`[ZucchettiOrders] HTTP ${impRes.status} su ADHOC_DOCUMENTI:`, errTxt);
      return {
        ok: false,
        decodedLog: errTxt,
        errorMessage: formatCleanZucchettiError(errTxt, impRes.status),
      };
    }

    const impJson: any = await impRes.json();
    const message = impJson?.responseStatus?.message || impJson?.message;
    let decodedLog = '';
    if (impJson?.responseData?.result) {
      try {
        decodedLog = Buffer.from(impJson.responseData.result, 'base64').toString('utf-8');
      } catch {
        decodedLog = String(impJson.responseData.result);
      }
    }

    const isError =
      message !== 'ok' ||
      decodedLog.includes('GenericResult="ko"') ||
      /Errors\s*:\s*[1-9]/i.test(decodedLog);

    if (isError) {
      console.error(`[ZucchettiOrders] Dettaglio tecnico errore Zucchetti (${docSerial}):\n`, decodedLog);
      return {
        ok: false,
        decodedLog,
        errorMessage: formatCleanZucchettiError(decodedLog),
      };
    }

    return { ok: true, decodedLog, errorMessage: '' };
  };

  const webOrderShortId = order.id.slice(-6).toUpperCase();
  const externalRef = `ORDINE WEB #${webOrderShortId}`;
  const [yyyy, mm, dd] = dateStr.split('-');
  const itDateStr = dd && mm && yyyy ? `${dd}-${mm}-${yyyy}` : dateStr;

  try {
    let discountsAcceptedByXsd = true;
    const logs: string[] = [];
    const createdDocs: Array<{
      mvSerialK: string;
      assignedMvSerial: string;
      mvTipDoc: 'ORDCL' | 'ORDIC';
      docRef: string;
      items: ResolvedOrderItem[];
    }> = [];

    for (const docPlan of documentsToSend) {
      const hasAnyDiscounts = docPlan.rows.some(r => r.discounts.length > 0);
      const xmlWithDiscounts = buildAdhocDocumentiXml({
        mvSerial: docPlan.mvSerial,
        mvTipDoc: docPlan.mvTipDoc,
        customerCode,
        dateStr,
        externalRef,
        rows: docPlan.rows,
        includeDiscountTags: hasAnyDiscounts,
      });

      let res = await executePost(xmlWithDiscounts, docPlan.mvSerial);

      if (
        !res.ok &&
        hasAnyDiscounts &&
        res.decodedLog.includes('Invalid content was found starting with element') &&
        res.decodedLog.includes('MVSCONT1')
      ) {
        console.warn(
          `[ZucchettiOrders] Lo schema XSD 00004/ADHOC_DOCUMENTI su A0002 non espone ancora i tag <MVSCONT1..4>. Reinvio ordine ${docPlan.mvSerial} (${docPlan.mvTipDoc}) con MVPREZZO di listino senza tag MVSCONT.`
        );
        discountsAcceptedByXsd = false;
        const xmlWithoutDiscountTags = buildAdhocDocumentiXml({
          mvSerial: docPlan.mvSerial,
          mvTipDoc: docPlan.mvTipDoc,
          customerCode,
          dateStr,
          externalRef,
          rows: docPlan.rows,
          includeDiscountTags: false,
        });
        res = await executePost(xmlWithoutDiscountTags, docPlan.mvSerial);
      }

      if (!res.ok) {
        console.error(
          `[ZucchettiOrders] Errore invio ordine ${orderId} (${docPlan.mvSerial} - ${docPlan.mvTipDoc}):`,
          res.errorMessage
        );
        return {
          success: false,
          mvSerial: docPlan.mvSerial,
          mvTipDoc: docPlan.mvTipDoc,
          totalElmarkPurchaseCost,
          rowsSent: allRowsSent,
          log: res.decodedLog,
          error: res.errorMessage,
        };
      }

      logs.push(res.decodedLog);

      // Estrae il seriale interno MVSERIAL assegnato da Zucchetti (es. "0000002539")
      const serialMatches = Array.from(res.decodedLog.matchAll(/MVSERIAL="([^"]+)"/g))
        .map(m => m[1])
        .filter(s => s && s !== 'CALCOLATA');
      const assignedMvSerial = serialMatches[serialMatches.length - 1] || docPlan.mvSerial;
      const defaultSerie = docPlan.mvTipDoc === 'ORDIC' ? 'OIC' : 'ST';

      createdDocs.push({
        mvSerialK: docPlan.mvSerial,
        assignedMvSerial,
        mvTipDoc: docPlan.mvTipDoc,
        docRef: defaultSerie,
        items: docPlan.items,
      });
    }

    // Verifica su SPVQRProducer/zzna_ordini se Zucchetti restituisce MVNUMDOC e MVALFDOC (es. "13 / OIC" o "120 / ST")
    try {
      const basicAuth =
        'Basic ' +
        Buffer.from(
          `${process.env.ZUCCHETTI_USERNAME || 'Soapserv'}:${process.env.ZUCCHETTI_PASSWORD || 'SspSrvZ2025%%'}`
        ).toString('base64');
      for (const cDoc of createdDocs) {
        const vqrRes = await zFetch(
          `${baseUrl}/servlet/api/SPVQRProducer/zzna_ordini?sp_company=A0002&pMVSERIAL=${encodeURIComponent(cDoc.assignedMvSerial)}`,
          {
            method: 'GET',
            headers: { authorization: basicAuth },
          },
          4000
        );
        const vqrText = await vqrRes.text();
        if (vqrText) {
          let numDoc = '';
          let alfDoc = '';
          try {
            const vqrJson: any = JSON.parse(vqrText);
            const vqrRows: any[] = Array.isArray(vqrJson?.data) ? vqrJson.data : [];
            const matchRow =
              vqrRows.find(r => String(r.mvserial || '').trim() === cDoc.assignedMvSerial) ||
              vqrRows[0];
            if (matchRow && matchRow.mvnumdoc) {
              numDoc = String(matchRow.mvnumdoc).trim();
              alfDoc = String(
                matchRow.mvalfdoc || (cDoc.mvTipDoc === 'ORDIC' ? 'OIC' : 'ST')
              ).trim();
            }
          } catch {
            // Fallback nel caso in cui SPVQRProducer tronchi il JSON dopo mvscont4 per un campo successivo non valido
            const numMatch = vqrText.match(/"mvnumdoc"\s*:\s*"([^"]+)"/);
            const alfMatch = vqrText.match(/"mvalfdoc"\s*:\s*"([^"]*)"/);
            if (numMatch && numMatch[1]) {
              numDoc = numMatch[1].trim();
              alfDoc = (
                alfMatch && alfMatch[1]
                  ? alfMatch[1]
                  : cDoc.mvTipDoc === 'ORDIC'
                    ? 'OIC'
                    : 'ST'
              ).trim();
            }
          }
          if (numDoc) {
            cDoc.docRef = alfDoc ? `${numDoc} / ${alfDoc}` : numDoc;
          }
        }
      }
    } catch {}

    // Mantiene un UNICO ordine sul sito (senza spezzare il B2BOrder) e salva su ogni riga articolo
    // il documento Zucchetti (ORDCL oppure ORDIC) a cui appartiene, insieme al riferimento e seriale Zucchetti
    for (const cDoc of createdDocs) {
      const itemIds = cDoc.items.map(it => it.itemId);
      if (itemIds.length > 0) {
        await prisma.b2BOrderItem.updateMany({
          where: { id: { in: itemIds } },
          data: {
            zucchettiDocType: cDoc.mvTipDoc,
            zucchettiDocRef: cDoc.docRef,
            zucchettiDocSerial: cDoc.assignedMvSerial,
          },
        });
      }
    }

    const combinedOrderRef = createdDocs.map(d => d.docRef).join(' | ');

    await prisma.b2BOrder.update({
      where: { id: order.id },
      data: {
        zucchettiOrderRef: combinedOrderRef,
      },
    });

    return {
      success: true,
      mvSerial: combinedOrderRef,
      mvTipDoc: primaryDoc.mvTipDoc,
      splitMvSerial: createdDocs.length > 1 ? createdDocs[1].docRef : undefined,
      totalElmarkPurchaseCost,
      discountsAcceptedByXsd,
      rowsSent: allRowsSent,
      log: logs.join('\n'),
    };
  } catch (err: any) {
    console.error(`[ZucchettiOrders] Eccezione invio ordine ${orderId}:`, err);
    return {
      success: false,
      mvSerial: primaryDoc?.mvSerial,
      mvTipDoc: primaryDoc?.mvTipDoc,
      totalElmarkPurchaseCost,
      rowsSent: allRowsSent,
      error: err.message || 'Errore imprevisto durante la comunicazione con Zucchetti.',
    };
  } finally {
    if (token) {
      try {
        await zFetch(`${baseUrl}/api/releaseToken`, {
          method: 'POST',
          headers: { authorization: token },
        });
      } catch {}
    }
  }
}
