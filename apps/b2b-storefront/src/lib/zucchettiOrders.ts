import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { Agent } from 'undici';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

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

export interface ZucchettiOrderRowPayload {
  sku: string;
  warehouse: 'PR' | 'EK';
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
      const discountTagsXml =
        params.includeDiscountTags && row.discounts.length > 0
          ? row.discounts
              .slice(0, 4)
              .map((d, dIdx) => `\n        <MVSCONT${dIdx + 1}>${d.toFixed(2)}</MVSCONT${dIdx + 1}>`)
              .join('')
          : '';

      return `      <ADHOC_DOCUMENTI_d>
        <CPROWNUM_K>${rowNum}</CPROWNUM_K>
        <MVNUMRIF_K>0</MVNUMRIF_K>
        <MVCODICE>${escapeXml(row.sku)}</MVCODICE>
        <MVCODMAG>${row.warehouse}</MVCODMAG>
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
 * - Negozio Izzo Distribuzione (storeMode === 'ZUCCHETTI') -> MVTIPDOC = 'ORDCL', magazzino 'PR' (o split 'PR'/'EK' se attinge da EK)
 * - Negozio Elmark (storeMode === 'ELMARK') -> MVTIPDOC = 'ORDIC', magazzino 'EK'
 * - Prezzo di listino lordo in MVPREZZO + sconti a cascata separati (es. 50+10 -> MVSCONT1=50, MVSCONT2=10)
 */
export async function sendB2BOrderToZucchetti(orderId: string): Promise<{
  success: boolean;
  mvSerial?: string;
  mvTipDoc?: 'ORDCL' | 'ORDIC';
  discountsAcceptedByXsd?: boolean;
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
  if (!customerCode || customerCode.startsWith('CLIPR')) {
    return {
      success: false,
      error: `Il cliente associato all'ordine non possiede ancora un codice conto Zucchetti definitivo (attuale: "${customerCode || 'vuoto'}").`,
    };
  }

  const storeMode = order.storeMode === 'ELMARK' ? 'ELMARK' : 'ZUCCHETTI';
  const mvTipDoc: 'ORDCL' | 'ORDIC' = storeMode === 'ELMARK' ? 'ORDIC' : 'ORDCL';
  const mvSerial = order.zucchettiOrderRef || generateB2BZucchettiSerial(order.id, storeMode);
  const dateStr = (order.createdAt || new Date()).toISOString().split('T')[0];

  const rows: ZucchettiOrderRowPayload[] = [];

  for (const item of order.items) {
    if (item.quantity <= 0) continue;

    let prod: any = null;
    try {
      prod = await getProductById(item.sku);
    } catch {}

    const rawUnit = String(prod?.unit || 'PZ')
      .trim()
      .toUpperCase()
      .substring(0, 3);
    const unit = rawUnit || 'PZ';

    const listPrice =
      Number(item.originalPrice) > 0
        ? Number(item.originalPrice)
        : Number(
            storeMode === 'ELMARK'
              ? prod?.price || item.finalPrice || 0
              : prod?.price_b2b || prod?.price || item.finalPrice || 0
          );

    const discounts = parseCascadeDiscounts(item.discountString);

    if (storeMode === 'ELMARK') {
      // Negozio Elmark (ORDIC): scarica sempre dal magazzino EK
      rows.push({
        sku: item.sku,
        warehouse: 'EK',
        unit,
        quantity: item.quantity,
        listPrice,
        discounts,
      });
    } else {
      // Negozio Izzo Distribuzione (ORDCL): usa il magazzino principale PR,
      // con gestione automatica EK se il prodotto attinge dal magazzino Elmark
      const stockMain = Math.max(0, Number(prod?.stock_main ?? 0));
      const stockElmark = Math.max(0, Number(prod?.stock_elmark ?? 0));

      if (stockMain >= item.quantity || stockElmark <= 0) {
        rows.push({
          sku: item.sku,
          warehouse: 'PR',
          unit,
          quantity: item.quantity,
          listPrice,
          discounts,
        });
      } else if (stockMain <= 0 && stockElmark > 0) {
        rows.push({
          sku: item.sku,
          warehouse: 'EK',
          unit,
          quantity: item.quantity,
          listPrice,
          discounts,
        });
      } else {
        // Split quantità tra PR (disponibile in sede) ed EK (eccedenza da magazzino Elmark)
        const qtyPr = stockMain;
        const qtyEk = item.quantity - stockMain;
        rows.push({
          sku: item.sku,
          warehouse: 'PR',
          unit,
          quantity: qtyPr,
          listPrice,
          discounts,
        });
        rows.push({
          sku: item.sku,
          warehouse: 'EK',
          unit,
          quantity: qtyEk,
          listPrice,
          discounts,
        });
      }
    }
  }

  if (rows.length === 0) {
    return { success: false, error: 'Nessuna riga ordine valida da inviare a Zucchetti.' };
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
      return {
        ok: false,
        decodedLog: errTxt,
        errorMessage: `Import ADHOC_DOCUMENTI HTTP ${impRes.status}: ${errTxt}`,
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
      const errMatch = decodedLog.match(/ErrorMessage="([^"]+)"/);
      return {
        ok: false,
        decodedLog,
        errorMessage: errMatch ? errMatch[1] : decodedLog || 'Import ADHOC_DOCUMENTI non riuscito',
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

    // Se lo schema XSD di Zucchetti (00004/ADHOC_DOCUMENTI) non espone ancora MVSCONT1..4,
    // intercetta l'errore XSD specifico su MVSCONT1 e invia il documento con MVPREZZO (listino) senza bloccare l'ordine.
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
      log: res.decodedLog,
    };
  } catch (err: any) {
    console.error(`[ZucchettiOrders] Eccezione invio ordine ${orderId}:`, err);
    return {
      success: false,
      mvSerial,
      mvTipDoc,
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
