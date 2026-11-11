import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { formatFidoPaymentType, getRomeYMD } from './fidoSchedule';
import { parseSavedOrderStockMeta } from './savedOrdersStock';

interface PdfLogoData {
  flateBytes: Buffer;
  width: number;
  height: number;
}

let cachedWhiteBgLogo: PdfLogoData | null = null;

/**
 * Decodifica public/logo-izzo.png e lo compone su sfondo bianco puro (#FFFFFF)
 * ritagliando con precisione il marchio IZZO + IZZO DISTRIBUZIONE SRL.
 */
function getOrderPdfIzzoLogo(): PdfLogoData | null {
  if (cachedWhiteBgLogo) return cachedWhiteBgLogo;

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'logo-izzo.png'),
      path.join(process.cwd(), 'apps', 'b2b-storefront', 'public', 'logo-izzo.png'),
    ];
    const logoPath = candidatePaths.find((p) => fs.existsSync(p));
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

    // Calcolo dinamico del bounding box reale dei pixel non trasparenti
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < h; y++) {
      const rowOff = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (rgba[rowOff + x * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const pad = 20;
    const cropX = minX < maxX ? Math.max(0, minX - pad) : 0;
    const cropY = minY < maxY ? Math.max(0, minY - pad) : 0;
    const cropW = minX < maxX ? Math.min(w - cropX, maxX - minX + 1 + pad * 2) : w;
    const cropH = minY < maxY ? Math.min(h - cropY, maxY - minY + 1 + pad * 2) : h;

    const outW = 820;
    const outH = Math.max(120, Math.round((outW * cropH) / cropW));
    const rgbOut = Buffer.alloc(outW * outH * 3);
    const scaleX = cropW / outW;
    const scaleY = cropH / outH;

    // Downsampling gamma-corretto (gamma 2.2) su sfondo bianco puro (#FFFFFF)
    // per mantenere nitide e piene le linee verdi sottili del marchio IZZO.
    for (let oy = 0; oy < outH; oy++) {
      const sy0 = Math.floor(cropY + oy * scaleY);
      const sy1 = Math.min(h, Math.max(sy0 + 1, Math.ceil(cropY + (oy + 1) * scaleY)));
      for (let ox = 0; ox < outW; ox++) {
        const sx0 = Math.floor(cropX + ox * scaleX);
        const sx1 = Math.min(w, Math.max(sx0 + 1, Math.ceil(cropX + (ox + 1) * scaleX)));
        let rLinSum = 0;
        let gLinSum = 0;
        let bLinSum = 0;
        let count = 0;
        for (let sy = sy0; sy < sy1; sy++) {
          for (let sx = sx0; sx < sx1; sx++) {
            const idx = (sy * w + sx) * 4;
            const a = rgba[idx + 3] / 255;
            const cr = (rgba[idx] * a + 255 * (1 - a)) / 255;
            const cg = (rgba[idx + 1] * a + 255 * (1 - a)) / 255;
            const cb = (rgba[idx + 2] * a + 255 * (1 - a)) / 255;
            rLinSum += cr * cr;
            gLinSum += cg * cg;
            bLinSum += cb * cb;
            count++;
          }
        }
        const oIdx = (oy * outW + ox) * 3;
        rgbOut[oIdx] = count > 0 ? Math.round(Math.sqrt(rLinSum / count) * 255) : 255;
        rgbOut[oIdx + 1] = count > 0 ? Math.round(Math.sqrt(gLinSum / count) * 255) : 255;
        rgbOut[oIdx + 2] = count > 0 ? Math.round(Math.sqrt(bLinSum / count) * 255) : 255;
      }
    }

    const flateBytes = zlib.deflateSync(rgbOut, { level: 9 });
    cachedWhiteBgLogo = { flateBytes, width: outW, height: outH };
    return cachedWhiteBgLogo;
  } catch (err) {
    console.warn('Impossibile caricare logo-izzo.png per PDF ordine:', err);
    return null;
  }
}

/**
 * Converte una stringa UTF-8 in sintassi PDF WinAnsiEncoding sicura,
 * usando l'escape ottale \200 per il simbolo Euro (€) nativo WinAnsi.
 */
function toPdfWinAnsi(input: string): string {
  const normalized = (input || '')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/Ø/g, 'O')
    .replace(/ø/g, 'o');

  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const ch = normalized[i];
    if (code === 0x20ac) {
      // Simbolo Euro (€) in WinAnsiEncoding = 0x80 = ottale \200
      out += '\\200';
    } else if (ch === '\\') {
      out += '\\\\';
    } else if (ch === '(') {
      out += '\\(';
    } else if (ch === ')') {
      out += '\\)';
    } else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    }
  }
  return out;
}

function estimatePdfTextWidth(text: string, fontSize: number, isBold: boolean): number {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ("iIl1|.,:;'!` ".includes(ch)) {
      units += isBold ? 0.29 : 0.26;
    } else if ('fjtJ()-/\\[]"'.includes(ch)) {
      units += isBold ? 0.36 : 0.32;
    } else if ('mMWGOQ@#%&'.includes(ch)) {
      units += isBold ? 0.80 : 0.75;
    } else if (ch === '€') {
      units += 0.56;
    } else if (ch >= 'A' && ch <= 'Z') {
      units += isBold ? 0.66 : 0.62;
    } else if (ch >= '0' && ch <= '9') {
      units += 0.56;
    } else {
      units += isBold ? 0.54 : 0.50;
    }
  }
  return units * fontSize;
}

function drawLeftText(
  font: '/F1' | '/F2',
  fontSize: number,
  rgb: string,
  x: number,
  y: number,
  text: string
): string {
  return `BT ${font} ${fontSize} Tf ${rgb} rg ${x.toFixed(1)} ${y.toFixed(
    1
  )} Td (${toPdfWinAnsi(text)}) Tj ET`;
}

function drawRightText(
  font: '/F1' | '/F2',
  fontSize: number,
  rgb: string,
  rightX: number,
  y: number,
  text: string
): string {
  const w = estimatePdfTextWidth(text, fontSize, font === '/F2');
  const startX = Math.max(28, rightX - w);
  return drawLeftText(font, fontSize, rgb, startX, y, text);
}

function wrapTextLines(text: string, maxChars: number, maxLines: number): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) {
          const last = lines[maxLines - 1];
          lines[maxLines - 1] =
            last.length > maxChars - 2 ? `${last.slice(0, maxChars - 2).trim()}..` : `${last}..`;
          return lines;
        }
        current = word.length > maxChars ? word.slice(0, maxChars) : word;
      } else {
        lines.push(word.slice(0, maxChars));
        if (lines.length >= maxLines) return lines;
        current = '';
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function formatMoneyIt(val: number): string {
  return (Number(val) || 0).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRomeDateTime(input: Date | string): {
  dateSlash: string;
  dateDash: string;
  timeStr: string;
} {
  const d = input instanceof Date ? input : new Date(input);
  const ymd = getRomeYMD(d);
  const timeStr = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  const [yyyy, mm, dd] = ymd.iso.split('-');
  return {
    dateSlash: ymd.formatted,
    dateDash: `${dd}-${mm}-${yyyy}`,
    timeStr,
  };
}

function extractCleanDocNum(rawRef?: string | null, docType: 'ORDCL' | 'ORDIC' = 'ORDCL'): string {
  const defaultSerie = docType === 'ORDIC' ? 'OIC' : 'ST';
  const str = String(rawRef || '').trim();
  if (!str) return '';
  if (str.includes('/')) {
    const [nPart, sPart] = str.split('/').map((s) => s.trim());
    const cleanN = nPart.replace(/^.*n\.\s*/i, '').trim();
    const cleanS = (sPart || defaultSerie).split(/\s+/)[0];
    return cleanN ? `${cleanN}/${cleanS}` : '';
  }
  const nMatch = str.match(/n\.\s*([^\s]+)/i);
  if (nMatch && nMatch[1]) return nMatch[1];
  if (str === 'ORDIC' || str === 'OIC' || str === 'ORDCL' || str === 'ST') return '';
  return str;
}

export interface GeneratedOrderPdfResult {
  buffer: Buffer;
  fileName: string;
}

export async function generateOrderPdfOnServer(params: {
  orderId: string;
  requesterId: string;
  requesterRole: string;
}): Promise<
  | { status: 'OK'; data: GeneratedOrderPdfResult }
  | { status: 'NOT_FOUND' | 'FORBIDDEN'; error: string }
> {
  const order = await prisma.b2BOrder.findUnique({
    where: { id: params.orderId },
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
      user: {
        include: {
          agent: true,
        },
      },
      promoProspect: true,
      fidoMovements: {
        select: { amount: true },
      },
    },
  });

  if (!order) {
    return { status: 'NOT_FOUND', error: 'Ordine non trovato.' };
  }

  const orderOwnerId = order.userId || order.promoProspectId;
  const orderAgentId = order.user?.agentId || order.promoProspect?.agentId;
  const isOwner = Boolean(orderOwnerId && orderOwnerId === params.requesterId);
  const isAssignedAgent =
    params.requesterRole === 'AGENT' &&
    (orderAgentId === params.requesterId || order.createdById === params.requesterId);
  const isAdmin = params.requesterRole === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    return { status: 'FORBIDDEN', error: 'Non autorizzato a scaricare questo ordine.' };
  }

  // Arricchimento nomi articoli tramite Typesense (con fallback sicuro su SKU)
  const populatedItems = await Promise.all(
    order.items.map(async (item) => {
      let title = item.sku;
      try {
        const p = (await getProductById(item.sku)) as any;
        const rawTitle = String(p?.original_name || p?.title || '').trim();
        if (rawTitle) {
          title = rawTitle;
        }
      } catch {
        // Fallback sul codice articolo se Typesense non risponde
      }
      return {
        ...item,
        productTitle: title,
      };
    })
  );

  const shortOrderId = order.id.slice(-6).toUpperCase();
  const { dateSlash, dateDash, timeStr } = formatRomeDateTime(order.createdAt);
  const nowInfo = formatRomeDateTime(new Date());

  const isDraft = order.status === 'DRAFT';
  const isPending = order.status === 'PENDING_AGENT_REVIEW';
  const isApproved = order.status === 'APPROVED' || order.status === 'SENT_TO_ZUCCHETTI';
  const isSavedOrder = isDraft && (!order.createdById || order.createdById === orderOwnerId);
  const isElmark = order.storeMode === 'ELMARK';

  let docMainTitle = 'RIEPILOGO ORDINE B2B';
  let statusLabel = String(order.status);
  let filePrefix = 'Ordine';

  if (isSavedOrder) {
    docMainTitle = 'ORDINE SALVATO (BOZZA)';
    statusLabel = 'Ordine Salvato';
    filePrefix = 'Ordine_Salvato';
  } else if (isDraft) {
    docMainTitle = "PREVENTIVO / PROPOSTA D'ORDINE";
    statusLabel = 'Preventivo in Pausa';
    filePrefix = 'Preventivo';
  } else if (isPending) {
    docMainTitle = 'ORDINE INVIATO (IN REVISIONE)';
    statusLabel = 'In attesa di revisione agente';
    filePrefix = 'Ordine_Inviato';
  } else if (isApproved) {
    docMainTitle = "CONFERMA D'ORDINE B2B";
    statusLabel = 'Approvato';
    filePrefix = 'Conferma_Ordine';
  } else if (order.status === 'ERROR') {
    docMainTitle = 'RIEPILOGO ORDINE B2B';
    statusLabel = 'Errore trasmissione';
  }

  // Dati cliente (attivo o prospect in attivazione)
  const owner: any = order.user || order.promoProspect;
  const companyName =
    owner?.companyName ||
    `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() ||
    owner?.username ||
    'Cliente B2B';
  const vatNumber = owner?.vatNumber || owner?.fiscalCode || '-';
  const addressParts = [
    owner?.address ? `${owner.address}${owner?.streetNumber ? ` ${owner.streetNumber}` : ''}` : '',
    [owner?.zip, owner?.city, owner?.province ? `(${owner.province})` : '']
      .filter(Boolean)
      .join(' '),
  ].filter(Boolean);
  const fullAddress = addressParts.join(' - ') || '-';
  const contactLine = [owner?.email, owner?.phone].filter(Boolean).join('  |  ') || '-';

  // Dati Agente
  let agentLabel = '-';
  if (order.user?.agent) {
    const ag = order.user.agent;
    agentLabel =
      ag.companyName || `${ag.firstName || ''} ${ag.lastName || ''}`.trim() || ag.username;
  } else if (order.promoProspect?.agentId) {
    const ag = await prisma.b2BUser.findUnique({
      where: { id: order.promoProspect.agentId },
      select: { companyName: true, firstName: true, lastName: true, username: true },
    });
    if (ag) {
      agentLabel =
        ag.companyName || `${ag.firstName || ''} ${ag.lastName || ''}`.trim() || ag.username;
    }
  }

  // Condizione Fido (visibile SOLO se fido attivo sul cliente, zero traccia altrimenti)
  const hasActiveFido = Boolean(order.user?.fidoEnabled && Number(order.user?.fido || 0) > 0);
  const fidoPaymentLabel = hasActiveFido
    ? formatFidoPaymentType(order.user?.fidoPaymentType || '30GG')
    : '';

  // Raggruppamento righe per documento Zucchetti (se ordine approvato/trasmesso)
  const fallbackDocType: 'ORDCL' | 'ORDIC' = isElmark ? 'ORDIC' : 'ORDCL';
  interface PdfItemGroup {
    key: string;
    headerText: string | null;
    docType: 'ORDCL' | 'ORDIC';
    items: typeof populatedItems;
    imponibile: number;
  }

  const groups: PdfItemGroup[] = [];
  if (isApproved) {
    const map = new Map<string, PdfItemGroup>();
    for (const item of populatedItems) {
      const rawType = String(item.zucchettiDocType || fallbackDocType)
        .trim()
        .toUpperCase();
      const docType: 'ORDCL' | 'ORDIC' = rawType === 'ORDIC' ? 'ORDIC' : 'ORDCL';
      const rawRef =
        item.zucchettiDocRef ||
        (order.zucchettiOrderRef && !order.zucchettiOrderRef.includes('|')
          ? order.zucchettiOrderRef
          : '');
      const cleanRef = extractCleanDocNum(rawRef, docType);
      const headerText = cleanRef
        ? `Riferimento in fattura: ${docType} n. ${cleanRef} ${dateDash}`
        : `Documento gestionale: ${docType} del ${dateDash}`;

      if (!map.has(docType)) {
        map.set(docType, {
          key: docType,
          headerText,
          docType,
          items: [],
          imponibile: 0,
        });
      }
      const g = map.get(docType)!;
      g.items.push(item);
      g.imponibile += (Number(item.finalPrice) || 0) * (Number(item.quantity) || 0);
    }
    groups.push(
      ...Array.from(map.values()).sort((a, b) =>
        a.docType === b.docType ? 0 : a.docType === 'ORDCL' ? -1 : 1
      )
    );
  } else {
    const imponibile = populatedItems.reduce(
      (s, it) => s + (Number(it.finalPrice) || 0) * (Number(it.quantity) || 0),
      0
    );
    groups.push({
      key: 'ALL',
      headerText: null,
      docType: fallbackDocType,
      items: populatedItems,
      imponibile,
    });
  }

  const computedImponibile = populatedItems.reduce(
    (s, it) => s + (Number(it.finalPrice) || 0) * (Number(it.quantity) || 0),
    0
  );
  const totalImponibile =
    Number(order.totalAmount) > 0 ? Number(order.totalAmount) : computedImponibile;
  const totalIva =
    Number(order.totalIva) > 0
      ? Number(order.totalIva)
      : Math.round(totalImponibile * 0.22 * 100) / 100;
  const totalGross = Math.round((totalImponibile + totalIva) * 100) / 100;

  let paymentStatusLabel = '';
  if (hasActiveFido && isApproved) {
    const movSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const paidAmount = order.isPaid
      ? totalGross
      : Math.min(totalGross, Math.max(0, Math.round(Math.max(Number(order.paidAmount) || 0, movSum) * 100) / 100));
    const rem = Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);
    if (order.isPaid || rem <= 0.009) {
      paymentStatusLabel = 'Saldato';
    } else if (paidAmount > 0) {
      paymentStatusLabel = `Acconto € ${formatMoneyIt(paidAmount)} (Residuo € ${formatMoneyIt(rem)})`;
    } else {
      paymentStatusLabel = 'Da saldare';
    }
  }

  const totalPieces = populatedItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const parsedNotes = parseSavedOrderStockMeta(order.notes).cleanNotes.trim();
  const displayNotes =
    parsedNotes && parsedNotes.toLowerCase() !== 'ordine salvato dal cliente' ? parsedNotes : '';

  // ===========================================================================
  // IMPAGINAZIONE A4 MULTIPAGINA (595 x 842 pt)
  // ===========================================================================
  const logo = getOrderPdfIzzoLogo();
  const LEFT = 32;
  const RIGHT = 563;
  const TABLE_W = RIGHT - LEFT; // 531 pt
  const BOTTOM_LIMIT = 58;

  // Costruiamo prima i comandi per pagina (senza il testo "Pagina X di Y", che aggiungiamo alla fine)
  const pagesCmds: string[][] = [];
  let currentCmds: string[] = [];
  let cursorY = 0;

  const drawTableHeader = (cmds: string[], topY: number): number => {
    const h = 21;
    const bottomY = topY - h;
    cmds.push('0.10 0.13 0.19 rg');
    cmds.push(`${LEFT} ${bottomY} ${TABLE_W} ${h} re f`);

    const textY = bottomY + 6.5;
    cmds.push(drawLeftText('/F2', 7.5, '1 1 1', LEFT + 6, textY, 'CODICE'));
    cmds.push(drawLeftText('/F2', 7.5, '1 1 1', LEFT + 98, textY, 'DESCRIZIONE ARTICOLO'));
    cmds.push(drawRightText('/F2', 7.5, '1 1 1', LEFT + 334, textY, "Q.TA'"));
    cmds.push(drawRightText('/F2', 7.5, '1 1 1', LEFT + 392, textY, 'LISTINO'));
    cmds.push(drawRightText('/F2', 7.5, '1 1 1', LEFT + 436, textY, 'SCONTO'));
    cmds.push(drawRightText('/F2', 7.5, '1 1 1', LEFT + 482, textY, 'NETTO'));
    cmds.push(drawRightText('/F2', 7.5, '1 1 1', RIGHT - 6, textY, 'TOTALE'));
    return bottomY;
  };

  const startNewPage = (isFirstPage: boolean, repeatTableHeader = false) => {
    if (currentCmds.length > 0) {
      pagesCmds.push(currentCmds);
    }
    currentCmds = [];

    // Fondo bianco pagina
    currentCmds.push('1 1 1 rg');
    currentCmds.push('0 0 595 842 re f');

    // Logo Izzo Distribuzione in alto a sinistra (su sfondo bianco)
    if (logo) {
      const logoDrawW = 148;
      const logoDrawH = ((logoDrawW * logo.height) / logo.width).toFixed(1);
      currentCmds.push('q');
      currentCmds.push(`${logoDrawW} 0 0 ${logoDrawH} ${LEFT} 758 cm`);
      currentCmds.push('/ImLogo Do');
      currentCmds.push('Q');
    } else {
      currentCmds.push(drawLeftText('/F2', 18, '0.04 0.50 0.14', 32, 792, 'IZZO DISTRIBUZIONE'));
      currentCmds.push(drawLeftText('/F2', 8.5, '0.25 0.30 0.36', 32, 777, 'IZZO DISTRIBUZIONE S.R.L.'));
    }

    // Intestazione Documento a destra
    currentCmds.push(drawRightText('/F2', 13, '0.07 0.09 0.14', RIGHT, 801, docMainTitle));
    currentCmds.push(
      drawRightText(
        '/F2',
        9.5,
        '0.04 0.48 0.14',
        RIGHT,
        785,
        `Ordine #${shortOrderId}   -   Data: ${dateSlash} ${timeStr}`
      )
    );
    currentCmds.push(
      drawRightText(
        '/F1',
        8,
        '0.38 0.42 0.48',
        RIGHT,
        771,
        `Divisione: ${isElmark ? 'Elmark' : 'Izzo Distribuzione'}   |   www.izzodistribuzione.it`
      )
    );

    // Linea verde istituzionale Izzo sotto l'header
    currentCmds.push('0.05 0.54 0.16 rg');
    currentCmds.push(`${LEFT} 750 ${TABLE_W} 2.2 re f`);

    cursorY = 740;

    if (isFirstPage) {
      // Due riquadri informativi affiancati (Cliente a sinistra, Dettagli Ordine a destra)
      const boxH = 92;
      const boxY = cursorY - boxH;
      const boxW = 259;
      const rightBoxX = LEFT + boxW + 13;

      // Box Cliente
      currentCmds.push('0.97 0.98 0.99 rg');
      currentCmds.push(`${LEFT} ${boxY} ${boxW} ${boxH} re f`);
      currentCmds.push('0.84 0.87 0.91 RG 0.7 w');
      currentCmds.push(`${LEFT} ${boxY} ${boxW} ${boxH} re S`);

      currentCmds.push(
        drawLeftText('/F2', 7.5, '0.05 0.48 0.15', LEFT + 10, boxY + boxH - 14, 'DATI CLIENTE')
      );
      const compLines = wrapTextLines(companyName, 40, 2);
      currentCmds.push(
        drawLeftText('/F2', 9.5, '0.07 0.09 0.14', LEFT + 10, boxY + boxH - 28, compLines[0] || companyName)
      );
      let clientLineY = boxY + boxH - 41;
      if (compLines[1]) {
        currentCmds.push(
          drawLeftText('/F2', 9, '0.07 0.09 0.14', LEFT + 10, clientLineY, compLines[1])
        );
        clientLineY -= 12;
      }
      currentCmds.push(
        drawLeftText(
          '/F1',
          8,
          '0.25 0.29 0.35',
          LEFT + 10,
          clientLineY,
          `P.IVA / CF: ${vatNumber}`
        )
      );
      const addrLines = wrapTextLines(fullAddress, 46, 1);
      currentCmds.push(
        drawLeftText(
          '/F1',
          8,
          '0.25 0.29 0.35',
          LEFT + 10,
          clientLineY - 13,
          `Sede: ${addrLines[0] || '-'}`
        )
      );
      const contactLines = wrapTextLines(contactLine, 46, 1);
      currentCmds.push(
        drawLeftText(
          '/F1',
          7.8,
          '0.35 0.39 0.45',
          LEFT + 10,
          clientLineY - 26,
          contactLines[0] || '-'
        )
      );

      // Box Dettagli Ordine
      currentCmds.push('0.97 0.98 0.99 rg');
      currentCmds.push(`${rightBoxX} ${boxY} ${boxW} ${boxH} re f`);
      currentCmds.push('0.84 0.87 0.91 RG 0.7 w');
      currentCmds.push(`${rightBoxX} ${boxY} ${boxW} ${boxH} re S`);

      currentCmds.push(
        drawLeftText(
          '/F2',
          7.5,
          '0.05 0.48 0.15',
          rightBoxX + 10,
          boxY + boxH - 14,
          'DETTAGLI E RIFERIMENTI ORDINE'
        )
      );
      currentCmds.push(
        drawLeftText(
          '/F2',
          8.5,
          '0.07 0.09 0.14',
          rightBoxX + 10,
          boxY + boxH - 28,
          `Stato: ${statusLabel}`
        )
      );
      currentCmds.push(
        drawLeftText(
          '/F1',
          8,
          '0.25 0.29 0.35',
          rightBoxX + 10,
          boxY + boxH - 42,
          wrapTextLines(`Agente: ${agentLabel}`, 45, 1)[0] || 'Agente: -'
        )
      );

      let detailY = boxY + boxH - 56;
      if (hasActiveFido && fidoPaymentLabel) {
        currentCmds.push(
          drawLeftText(
            '/F2',
            8,
            '0.12 0.16 0.22',
            rightBoxX + 10,
            detailY,
            `Pagamento: ${fidoPaymentLabel}${paymentStatusLabel ? ` (${paymentStatusLabel})` : ''}`
          )
        );
        detailY -= 13;
      }

      const docSummaryRefs = groups
        .map((g) =>
          g.headerText
            ?.replace(/^Riferimento in fattura:\s*/i, '')
            .replace(/^Documento gestionale:\s*/i, '')
            .replace(new RegExp(`\\s+(del\\s+)?${dateDash}$`), '')
        )
        .filter(Boolean)
        .join('  |  ');
      if (docSummaryRefs) {
        currentCmds.push(
          drawLeftText(
            '/F1',
            7.8,
            '0.25 0.29 0.35',
            rightBoxX + 10,
            detailY,
            wrapTextLines(`Doc.: ${docSummaryRefs}`, 46, 1)[0] || ''
          )
        );
      } else {
        currentCmds.push(
          drawLeftText(
            '/F1',
            7.8,
            '0.35 0.39 0.45',
            rightBoxX + 10,
            detailY,
            `Articoli: ${populatedItems.length} righe (${totalPieces} pz totali)`
          )
        );
      }

      cursorY = boxY - 14;
    }

    if (repeatTableHeader) {
      cursorY = drawTableHeader(currentCmds, cursorY);
    }
  };

  startNewPage(true, false);

  if (populatedItems.length === 0) {
    currentCmds.push(
      drawLeftText('/F1', 10, '0.40 0.44 0.50', LEFT + 8, cursorY - 24, "Nessun articolo presente nell'ordine.")
    );
    cursorY -= 40;
  } else {
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const grp = groups[gIdx];

      // Verifica spazio minimo per testata gruppo + testata tabella + almeno 1 riga
      if (cursorY < BOTTOM_LIMIT + 78) {
        startNewPage(false, false);
      }

      if (grp.headerText) {
        const bannerH = 20;
        const bannerY = cursorY - bannerH;
        if (grp.docType === 'ORDIC') {
          currentCmds.push('1.00 0.97 0.90 rg');
          currentCmds.push(`${LEFT} ${bannerY} ${TABLE_W} ${bannerH} re f`);
          currentCmds.push('0.94 0.80 0.50 RG 0.6 w');
          currentCmds.push(`${LEFT} ${bannerY} ${TABLE_W} ${bannerH} re S`);
          currentCmds.push(
            drawLeftText('/F2', 8.5, '0.55 0.32 0.04', LEFT + 8, bannerY + 6, grp.headerText)
          );
        } else {
          currentCmds.push('0.93 0.96 1.00 rg');
          currentCmds.push(`${LEFT} ${bannerY} ${TABLE_W} ${bannerH} re f`);
          currentCmds.push('0.73 0.83 0.96 RG 0.6 w');
          currentCmds.push(`${LEFT} ${bannerY} ${TABLE_W} ${bannerH} re S`);
          currentCmds.push(
            drawLeftText('/F2', 8.5, '0.10 0.28 0.58', LEFT + 8, bannerY + 6, grp.headerText)
          );
        }
        cursorY = bannerY - 2;
      }

      cursorY = drawTableHeader(currentCmds, cursorY);

      grp.items.forEach((item, rowIdx) => {
        const cleanDesc = item.productTitle
          .replace(new RegExp(`\\s*-\\s*${item.sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
          .trim();
        const descLines = wrapTextLines(cleanDesc || item.sku, 39, 2);
        const rowH = descLines.length > 1 ? 30 : 22;

        if (cursorY - rowH < BOTTOM_LIMIT + 10) {
          startNewPage(false, true);
        }

        const rowBottomY = cursorY - rowH;

        // Sfondo zebra alternato
        if (rowIdx % 2 === 1) {
          currentCmds.push('0.975 0.980 0.988 rg');
          currentCmds.push(`${LEFT} ${rowBottomY} ${TABLE_W} ${rowH} re f`);
        }

        // Bordo inferiore riga
        currentCmds.push('0.89 0.91 0.94 RG 0.5 w');
        currentCmds.push(`${LEFT} ${rowBottomY} m ${RIGHT} ${rowBottomY} l S`);

        const origPrice = Number(item.originalPrice) || 0;
        const netPrice = Number(item.finalPrice) || 0;
        const qty = Number(item.quantity) || 0;
        const lineTotal = netPrice * qty;
        const hasDiscount = origPrice > netPrice + 0.004;

        let discLabel = '-';
        if (hasDiscount) {
          if (item.discountString && String(item.discountString).trim()) {
            const cleanD = String(item.discountString).trim().replace(/^-/, '');
            discLabel = cleanD.includes('%') ? `-${cleanD}` : `-${cleanD}%`;
          } else if (origPrice > 0) {
            const pct = Math.round((1 - netPrice / origPrice) * 100);
            discLabel = pct > 0 ? `-${pct}%` : '-';
          }
        }

        const midY = descLines.length > 1 ? rowBottomY + 17 : rowBottomY + 7.5;

        // Codice SKU
        currentCmds.push(
          drawLeftText(
            '/F2',
            7.8,
            '0.08 0.10 0.15',
            LEFT + 6,
            midY,
            wrapTextLines(item.sku, 17, 1)[0] || item.sku
          )
        );

        // Descrizione (1 o 2 righe)
        if (descLines.length > 1) {
          currentCmds.push(
            drawLeftText('/F1', 8, '0.12 0.15 0.20', LEFT + 98, rowBottomY + 18, descLines[0])
          );
          currentCmds.push(
            drawLeftText('/F1', 7.8, '0.32 0.36 0.42', LEFT + 98, rowBottomY + 7.5, descLines[1])
          );
        } else {
          currentCmds.push(
            drawLeftText(
              '/F1',
              8,
              '0.12 0.15 0.20',
              LEFT + 98,
              rowBottomY + 7.5,
              descLines[0] || item.sku
            )
          );
        }

        // Quantità
        currentCmds.push(
          drawRightText('/F2', 8.2, '0.08 0.10 0.15', LEFT + 334, midY, `${qty} pz`)
        );

        // Listino
        currentCmds.push(
          drawRightText(
            '/F1',
            7.8,
            hasDiscount ? '0.45 0.49 0.55' : '0.20 0.24 0.30',
            LEFT + 392,
            midY,
            origPrice > 0 ? `€ ${formatMoneyIt(origPrice)}` : '-'
          )
        );

        // Sconto
        currentCmds.push(
          drawRightText(
            hasDiscount ? '/F2' : '/F1',
            7.5,
            hasDiscount ? '0.78 0.14 0.14' : '0.55 0.58 0.62',
            LEFT + 436,
            midY,
            discLabel
          )
        );

        // Netto unitario
        currentCmds.push(
          drawRightText('/F2', 8.2, '0.08 0.10 0.15', LEFT + 482, midY, `€ ${formatMoneyIt(netPrice)}`)
        );

        // Totale riga
        currentCmds.push(
          drawRightText(
            '/F2',
            8.4,
            '0.04 0.46 0.14',
            RIGHT - 6,
            midY,
            `€ ${formatMoneyIt(lineTotal)}`
          )
        );

        cursorY = rowBottomY;
      });

      // Subtotale gruppo se ci sono più documenti (es. ORDCL + ORDIC)
      if (groups.length > 1) {
        const subH = 20;
        if (cursorY - subH < BOTTOM_LIMIT + 10) {
          startNewPage(false, false);
        }
        const subY = cursorY - subH;
        const grpIva = grp.imponibile * 0.22;
        const grpTot = grp.imponibile + grpIva;
        currentCmds.push('0.95 0.96 0.98 rg');
        currentCmds.push(`${LEFT} ${subY} ${TABLE_W} ${subH} re f`);
        currentCmds.push(
          drawRightText(
            '/F2',
            8,
            '0.18 0.22 0.28',
            RIGHT - 6,
            subY + 6.5,
            `Subtotale ${grp.docType}: Imponibile € ${formatMoneyIt(grp.imponibile)}   |   IVA 22% € ${formatMoneyIt(grpIva)}   |   Totale € ${formatMoneyIt(grpTot)}`
          )
        );
        cursorY = subY - 10;
      } else {
        cursorY -= 12;
      }
    }
  }

  // ===========================================================================
  // RIEPILOGO TOTALI E NOTE FINALI
  // ===========================================================================
  const totalsBlockH = 96;
  if (cursorY - totalsBlockH < BOTTOM_LIMIT) {
    startNewPage(false, false);
  }

  const totalsTopY = cursorY - 4;
  const totalsBoxW = 224;
  const totalsBoxX = RIGHT - totalsBoxW;
  const totalsBoxY = totalsTopY - 84;

  // Colonna sinistra: Riepilogo pezzi + eventuali note
  currentCmds.push(
    drawLeftText(
      '/F2',
      8.5,
      '0.18 0.22 0.28',
      LEFT,
      totalsTopY - 12,
      `Totale Articoli: ${populatedItems.length} righe   |   Totale Quantita': ${totalPieces} pz`
    )
  );

  if (displayNotes) {
    const noteLines = wrapTextLines(`Note: ${displayNotes}`, 54, 3);
    noteLines.forEach((nl, idx) => {
      currentCmds.push(
        drawLeftText('/F1', 8, '0.32 0.36 0.42', LEFT, totalsTopY - 28 - idx * 12, nl)
      );
    });
  }

  // Box Totali a destra
  currentCmds.push('0.97 0.98 0.99 rg');
  currentCmds.push(`${totalsBoxX} ${totalsBoxY} ${totalsBoxW} 84 re f`);
  currentCmds.push('0.82 0.85 0.90 RG 0.8 w');
  currentCmds.push(`${totalsBoxX} ${totalsBoxY} ${totalsBoxW} 84 re S`);

  currentCmds.push(
    drawLeftText('/F1', 8.8, '0.30 0.34 0.40', totalsBoxX + 12, totalsTopY - 18, 'Totale Imponibile:')
  );
  currentCmds.push(
    drawRightText(
      '/F2',
      9,
      '0.08 0.10 0.15',
      RIGHT - 12,
      totalsTopY - 18,
      `€ ${formatMoneyIt(totalImponibile)}`
    )
  );

  currentCmds.push(
    drawLeftText('/F1', 8.8, '0.30 0.34 0.40', totalsBoxX + 12, totalsTopY - 35, 'IVA (22%):')
  );
  currentCmds.push(
    drawRightText(
      '/F2',
      9,
      '0.08 0.10 0.15',
      RIGHT - 12,
      totalsTopY - 35,
      `€ ${formatMoneyIt(totalIva)}`
    )
  );

  // Fascia inferiore Totale Ordine IVA Inclusa
  currentCmds.push('0.07 0.10 0.15 rg');
  currentCmds.push(`${totalsBoxX} ${totalsBoxY} ${totalsBoxW} 32 re f`);
  currentCmds.push(
    drawLeftText('/F2', 8.8, '1 1 1', totalsBoxX + 12, totalsBoxY + 11, 'TOTALE ORDINE (IVA incl.):')
  );
  currentCmds.push(
    drawRightText(
      '/F2',
      11.5,
      '0.25 0.95 0.42',
      RIGHT - 12,
      totalsBoxY + 10.5,
      `€ ${formatMoneyIt(totalGross)}`
    )
  );

  pagesCmds.push(currentCmds);

  // Aggiunta numerazione pagine e footer su ciascun foglio
  const totalPages = pagesCmds.length;
  const pageStreams: Buffer[] = pagesCmds.map((cmds, idx) => {
    const pageFooter: string[] = [];
    pageFooter.push('0.85 0.87 0.90 RG 0.5 w');
    pageFooter.push(`${LEFT} 38 m ${RIGHT} 38 l S`);
    pageFooter.push(
      drawLeftText(
        '/F1',
        7.5,
        '0.42 0.46 0.52',
        LEFT,
        24,
        'Izzo Distribuzione S.r.l. - Portale B2B www.izzodistribuzione.it'
      )
    );
    pageFooter.push(
      drawRightText(
        '/F1',
        7.5,
        '0.42 0.46 0.52',
        RIGHT,
        24,
        `Generato il ${nowInfo.dateSlash} ${nowInfo.timeStr}   -   Pagina ${idx + 1} di ${totalPages}`
      )
    );
    return Buffer.from([...cmds, ...pageFooter].join('\n'), 'latin1');
  });

  // ===========================================================================
  // ASSEMBLAGGIO BINARIO PDF 1.4
  // ===========================================================================
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let currentLen = 0;

  const pushBuf = (b: Buffer) => {
    chunks.push(b);
    currentLen += b.length;
  };
  const pushStr = (s: string) => {
    pushBuf(Buffer.from(s, 'latin1'));
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // 1: Catalog, 2: Pages, 3: Helvetica, 4: Helvetica-Bold, [5: Logo], poi Page + Content
  let nextObj = 5;
  const logoObjNum = logo ? nextObj++ : null;
  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];
  for (let p = 0; p < totalPages; p++) {
    pageObjNums.push(nextObj++);
    contentObjNums.push(nextObj++);
  }

  offsets[1] = currentLen;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = currentLen;
  pushStr(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj\n`
  );

  offsets[3] = currentLen;
  pushStr(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
  );

  offsets[4] = currentLen;
  pushStr(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
  );

  if (logo && logoObjNum) {
    offsets[logoObjNum] = currentLen;
    pushStr(
      `${logoObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.flateBytes.length} >>\nstream\n`
    );
    pushBuf(logo.flateBytes);
    pushStr('\nendstream\nendobj\n');
  }

  for (let p = 0; p < totalPages; p++) {
    const pObj = pageObjNums[p];
    const cObj = contentObjNums[p];
    const streamBuf = pageStreams[p];
    const xObjDict = logoObjNum ? ` /XObject << /ImLogo ${logoObjNum} 0 R >>` : '';

    offsets[pObj] = currentLen;
    pushStr(
      `${pObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjDict} >> /Contents ${cObj} 0 R >>\nendobj\n`
    );

    offsets[cObj] = currentLen;
    pushStr(`${cObj} 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`);
    pushBuf(streamBuf);
    pushStr('\nendstream\nendobj\n');
  }

  const totalObjects = nextObj;
  const xrefOffset = currentLen;
  let xref = `xref\n0 ${totalObjects}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjects; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pushStr(xref);
  pushStr(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const safeClientSlug = companyName
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);

  const fileName = `${filePrefix}_IZZO_${shortOrderId}${safeClientSlug ? `_${safeClientSlug}` : ''}.pdf`;

  return {
    status: 'OK',
    data: {
      buffer: Buffer.concat(chunks),
      fileName,
    },
  };
}
