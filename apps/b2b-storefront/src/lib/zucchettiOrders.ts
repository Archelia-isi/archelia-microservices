import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { Agent } from 'undici';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * Codici marchio Zucchetti (e nomi brand) appartenenti all'ecosistema / catalogo del fornitore Elmark
 * (Elmark, Stellar, TeknoLight, Zuma Line, Sonoff, Milio, ecc.)
 */
const ELMARK_WORLD_BRANDS = new Set([
  'EK',
  'ELMARK',
  'SR',
  'STELLAR',
  'TKLG',
  'ZUMA',
  'SNFF',
  'ATRA',
  'SOLI',
  'FISC',
  'WAGO',
  'OBBT',
  'ACRL',
  'AOBO',
  'LD',
  'ST',
  'ML',
  'OKTY',
  'PENS',
  'OKTA',
  'METS',
  'BISH',
]);

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
 * trova il documento Typesense corrispondente nel catalogo Zucchetti e restituisce
 * il vero codice articolo Zucchetti (ARCODAR2) insieme ai metadati di giacenza e brand.
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
}> {
  const cleanSku = String(rawSku || '').trim();
  const upperSku = cleanSku.toUpperCase();

  let directProd: any = null;
  try {
    directProd = await getProductById(cleanSku);
  } catch {}

  let zucchettiDoc: any =
    directProd && directProd.catalog_source === 'zucchetti' ? directProd : null;
  let elmarkDoc: any =
    directProd && directProd.catalog_source === 'elmark' ? directProd : null;

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
        const targetCode = upperSku.includes('.') ? extractCodeAfterDot(upperSku) : upperSku;
        zucchettiDoc = hits.find((d: any) => {
          const dSku = String(d.sku || '').trim().toUpperCase();
          return extractCodeAfterDot(dSku) === targetCode;
        });
      }
    } catch (err) {
      console.warn(`[ZucchettiOrders] Errore ricerca corrispettivo Zucchetti per SKU ${cleanSku}:`, err);
    }
  }

  const refDoc = zucchettiDoc || directProd;
  const resolvedZucchettiSku = String(zucchettiDoc?.sku || cleanSku).trim();

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
  const discgroupUpper = String(zucchettiDoc?.discgroup || directProd?.discgroup || '')
    .trim()
    .toUpperCase();

  // Verifica se il prodotto appartiene al Mondo Elmark (Elmark, Stellar, Zuma, TeknoLight, Sonoff, ecc.)
  let isElmarkWorld =
    storeMode === 'ELMARK' ||
    Boolean(elmarkDoc) ||
    ELMARK_DISCGROUPS.has(discgroupUpper) ||
    ELMARK_WORLD_BRANDS.has(brandUpper) ||
    stockElmark > 0;

  if (!isElmarkWorld && resolvedZucchettiSku.includes('.')) {
    const codeAfterDot = extractCodeAfterDot(resolvedZucchettiSku);
    if (codeAfterDot) {
      try {
        const elmarkCheck = await typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q: codeAfterDot,
            query_by: 'sku',
            filter_by: `catalog_source:=elmark && sku:=\`${codeAfterDot.replace(/`/g, '')}\``,
            per_page: 1,
          });
        if ((elmarkCheck?.hits || []).length > 0) {
          isElmarkWorld = true;
        }
      } catch {}
    }
  }

  const priceB2b =
    Number(zucchettiDoc?.price_b2b) > 0
      ? Number(zucchettiDoc.price_b2b)
      : Number(zucchettiDoc?.price || directProd?.price || 0);
  const priceElmark = Number(elmarkDoc?.price || directProd?.price || priceB2b || 0);

  return {
    zucchettiSku: resolvedZucchettiSku,
    unit,
    stockMain,
    stockElmark,
    isElmarkWorld,
    priceB2b,
    priceElmark,
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
  rows: ZucchettiOrderRowPayload[];
  includeDiscountTags: boolean;
}): string {
  const destAttr =
    params.destinationCode && params.destinationCode.trim()
      ? ` MVCODDES="${escapeXml(params.destinationCode.trim())}"`
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
  <Add_ADHOC_DOCUMENTI MVCLADOC="OR" MVCODCON="${escapeXml(params.customerCode)}" MVDATDOC="${params.dateStr}" MVDATREG="${params.dateStr}" MVFLVEAC="V" MVSERIAL_K="${escapeXml(params.mvSerial)}" MVTIPDOC="${params.mvTipDoc}"${destAttr}>
    <BO_ADHOC_DOCUMENTI_d>
${rowsXml}
    </BO_ADHOC_DOCUMENTI_d>
  </Add_ADHOC_DOCUMENTI>
</ADHOC_DOCUMENTI>`;
}

/**
 * Invia un ordine B2B approvato a Zucchetti esclusivamente sull'azienda Izzo Distribuzione (A0002, flusso 00004):
 * - Negozio Izzo Distribuzione (storeMode === 'ZUCCHETTI') -> MVTIPDOC = 'ORDCL':
 *   1) Se nell'ordine ci sono SOLO prodotti del Mondo Elmark (Elmark, Stellar, ecc.):
 *      - Se tutti sono coperti dalla giacenza PR -> tutto l'ordine va su PR
 *      - Se anche uno solo sfora la giacenza PR -> tutto l'ordine va su EK (senza sdoppiamenti)
 *   2) Se nell'ordine ci sono anche prodotti NON appartenenti al Mondo Elmark (ordine misto):
 *      - Tutti i prodotti con giacenza PR sufficiente vanno su PR
 *      - I prodotti del Mondo Elmark con PR > 0 che superano la giacenza PR vengono sdoppiati (quota PR + eccedenza EK)
 *      - I prodotti del Mondo Elmark con PR = 0 vanno su EK
 * - Negozio Elmark (storeMode === 'ELMARK') -> MVTIPDOC = 'ORDIC':
 *   - Risolve sempre il codice articolo puro Elmark nel corrispettivo codice Zucchetti (ARCODAR2)
 *   - Magazzino sempre 'EK'
 * - Prezzo di listino lordo in MVPREZZO + sconti a cascata separati con segno negativo (es. 50+10 -> MVSCONT1=-50.00, MVSCONT2=-10.00)
 */
export async function sendB2BOrderToZucchetti(orderId: string): Promise<{
  success: boolean;
  mvSerial?: string;
  mvTipDoc?: 'ORDCL' | 'ORDIC';
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
  const mvTipDoc: 'ORDCL' | 'ORDIC' = storeMode === 'ELMARK' ? 'ORDIC' : 'ORDCL';
  const mvSerial = order.zucchettiOrderRef || generateB2BZucchettiSerial(order.id, storeMode);
  const dateStr = (order.createdAt || new Date()).toISOString().split('T')[0];

  // Fase 1: Risolve per ogni riga il codice Zucchetti (ARCODAR2), le giacenze PR/EK e l'appartenenza al Mondo Elmark
  const resolvedItems: Array<{
    zucchettiSku: string;
    unit: string;
    quantity: number;
    listPrice: number;
    discounts: number[];
    stockMain: number;
    stockElmark: number;
    isElmarkWorld: boolean;
  }> = [];

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
      zucchettiSku: meta.zucchettiSku,
      unit: meta.unit,
      quantity: item.quantity,
      listPrice,
      discounts,
      stockMain: meta.stockMain,
      stockElmark: meta.stockElmark,
      isElmarkWorld: meta.isElmarkWorld,
    });
  }

  if (resolvedItems.length === 0) {
    return { success: false, error: 'Nessuna riga ordine valida da inviare a Zucchetti.' };
  }

  // Fase 2: Applicazione regole magazzino (PR vs EK)
  const rows: ZucchettiOrderRowPayload[] = [];

  if (storeMode === 'ELMARK') {
    // Negozio Elmark (ORDIC): causale che NON movimenta il magazzino -> nessun MVCODMAG passato
    for (const it of resolvedItems) {
      rows.push({
        sku: it.zucchettiSku,
        warehouse: null,
        unit: it.unit,
        quantity: it.quantity,
        listPrice: it.listPrice,
        discounts: it.discounts,
      });
    }
  } else {
    // Negozio Izzo Distribuzione (ORDCL)
    const allItemsAreElmarkWorld = resolvedItems.every(it => it.isElmarkWorld);

    if (allItemsAreElmarkWorld) {
      // Caso A: Ordine composto SOLO da prodotti del Mondo Elmark (Elmark, Stellar, ecc.)
      // Se tutti sono coperti da PR -> tutto in PR; se anche uno solo sfora PR -> tutto in EK!
      const anyItemExceedsPr = resolvedItems.some(it => it.quantity > it.stockMain);
      const targetWarehouse: 'PR' | 'EK' = anyItemExceedsPr ? 'EK' : 'PR';

      for (const it of resolvedItems) {
        rows.push({
          sku: it.zucchettiSku,
          warehouse: targetWarehouse,
          unit: it.unit,
          quantity: it.quantity,
          listPrice: it.listPrice,
          discounts: it.discounts,
        });
      }
    } else {
      // Caso B: Ordine Misto (contiene almeno un prodotto che NON fa parte del Mondo Elmark)
      for (const it of resolvedItems) {
        if (!it.isElmarkWorld) {
          // Prodotto non-Elmark: va sempre su PR
          rows.push({
            sku: it.zucchettiSku,
            warehouse: 'PR',
            unit: it.unit,
            quantity: it.quantity,
            listPrice: it.listPrice,
            discounts: it.discounts,
          });
        } else {
          // Prodotto del Mondo Elmark in ordine misto:
          // - Se coperto da PR -> PR
          // - Se PR = 0 -> EK
          // - Se PR > 0 ma quantità > PR -> sdoppiato (PR + EK)
          if (it.quantity <= it.stockMain || it.stockElmark <= 0) {
            rows.push({
              sku: it.zucchettiSku,
              warehouse: 'PR',
              unit: it.unit,
              quantity: it.quantity,
              listPrice: it.listPrice,
              discounts: it.discounts,
            });
          } else if (it.stockMain <= 0) {
            rows.push({
              sku: it.zucchettiSku,
              warehouse: 'EK',
              unit: it.unit,
              quantity: it.quantity,
              listPrice: it.listPrice,
              discounts: it.discounts,
            });
          } else {
            const qtyPr = it.stockMain;
            const qtyEk = it.quantity - it.stockMain;
            rows.push({
              sku: it.zucchettiSku,
              warehouse: 'PR',
              unit: it.unit,
              quantity: qtyPr,
              listPrice: it.listPrice,
              discounts: it.discounts,
            });
            rows.push({
              sku: it.zucchettiSku,
              warehouse: 'EK',
              unit: it.unit,
              quantity: qtyEk,
              listPrice: it.listPrice,
              discounts: it.discounts,
            });
          }
        }
      }
    }
  }

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

  const executePost = async (xmlPayload: string) => {
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
      console.error(`[ZucchettiOrders] Dettaglio tecnico errore Zucchetti (${mvSerial}):\n`, decodedLog);
      return {
        ok: false,
        decodedLog,
        errorMessage: formatCleanZucchettiError(decodedLog),
      };
    }

    return { ok: true, decodedLog, errorMessage: '' };
  };

  try {
    const hasAnyDiscounts = rows.some(r => r.discounts.length > 0);
    let discountsAcceptedByXsd = true;

    const xmlWithDiscounts = buildAdhocDocumentiXml({
      mvSerial,
      mvTipDoc,
      customerCode,
      dateStr,
      rows,
      includeDiscountTags: hasAnyDiscounts,
    });

    let res = await executePost(xmlWithDiscounts);

    if (
      !res.ok &&
      hasAnyDiscounts &&
      res.decodedLog.includes('Invalid content was found starting with element') &&
      res.decodedLog.includes('MVSCONT1')
    ) {
      console.warn(
        `[ZucchettiOrders] Lo schema XSD 00004/ADHOC_DOCUMENTI su A0002 non espone ancora i tag <MVSCONT1..4>. Reinvio ordine ${mvSerial} (${mvTipDoc}) con MVPREZZO di listino senza tag MVSCONT.`
      );
      discountsAcceptedByXsd = false;
      const xmlWithoutDiscountTags = buildAdhocDocumentiXml({
        mvSerial,
        mvTipDoc,
        customerCode,
        dateStr,
        rows,
        includeDiscountTags: false,
      });
      res = await executePost(xmlWithoutDiscountTags);
    }

    if (!res.ok) {
      console.error(`[ZucchettiOrders] Errore invio ordine ${orderId} (${mvSerial}):`, res.errorMessage);
      return {
        success: false,
        mvSerial,
        mvTipDoc,
        rowsSent: rows,
        log: res.decodedLog,
        error: res.errorMessage,
      };
    }

    await prisma.b2BOrder.update({
      where: { id: order.id },
      data: {
        zucchettiOrderRef: mvSerial,
      },
    });

    return {
      success: true,
      mvSerial,
      mvTipDoc,
      discountsAcceptedByXsd,
      rowsSent: rows,
      log: res.decodedLog,
    };
  } catch (err: any) {
    console.error(`[ZucchettiOrders] Eccezione invio ordine ${orderId}:`, err);
    return {
      success: false,
      mvSerial,
      mvTipDoc,
      rowsSent: rows,
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
