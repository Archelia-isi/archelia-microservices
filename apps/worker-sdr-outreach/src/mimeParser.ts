/**
 * Parser MIME RFC 5322 / RFC 2045-2047 / RFC 2231 completo e zero-dependency
 * per la Sentinella IMAP di worker-sdr-outreach.
 *
 * - Non tronca mai il sorgente raw a 12KB né il testo a 600 caratteri.
 * - Decodifica correttamente multipart/mixed, multipart/alternative, multipart/related,
 *   quoted-printable, base64 e charset italiani (UTF-8, Windows-1252, ISO-8859-1).
 * - Estrae tutti gli allegati (PDF, Excel, Word, CSV, ZIP, immagini) in Base64 pronti per Brevo API.
 * - Separa la risposta fresca del cliente (`freshReplyText`) dallo storico citato (`fullText`)
 *   così il classificatore distingue con precisione chirurgica `Consenso_Invio` ("Sì grazie")
 *   da `Domanda_Specifica` / `Opt_Out` / `Bounce` / `Out_Of_Office`.
 */

export interface ParsedEmailAttachment {
  name: string;
  content: string; // Base64 puro per Brevo API `attachment: [{ name, content }]`
  contentType: string;
  sizeBytes: number;
}

export interface ParsedInboundEmail {
  headers: Record<string, string>;
  messageIdsInThread: string[];
  inReplyTo: string;
  autoSubmitted: string;
  fullText: string;
  freshReplyText: string;
  htmlBody: string;
  attachments: ParsedEmailAttachment[];
  oversizedAttachmentsSkipped: string[];
}

export type InboundReplyClassification =
  | 'Bounce'
  | 'Out_Of_Office'
  | 'Opt_Out'
  | 'Consenso_Invio'
  | 'Domanda_Specifica';

const MAX_TOTAL_ATTACHMENTS_BYTES = 18 * 1024 * 1024; // 18 MB (sotto il limite Brevo 20 MB)

function normalizeCharsetLabel(rawCharset?: string | null): string {
  const cleaned = String(rawCharset || 'utf-8')
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
  if (!cleaned || cleaned === 'utf8' || cleaned === 'us-ascii' || cleaned === 'ascii') {
    return 'utf-8';
  }
  if (
    cleaned === 'iso-8859-1' ||
    cleaned === 'iso_8859-1' ||
    cleaned === 'latin1' ||
    cleaned === 'cp1252' ||
    cleaned === 'windows-1252'
  ) {
    return 'windows-1252';
  }
  return cleaned;
}

function decodeBufferWithCharset(buf: Buffer, charset?: string | null): string {
  const label = normalizeCharsetLabel(charset);
  try {
    const decoder = new TextDecoder(label, { fatal: false });
    return decoder.decode(buf);
  } catch {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch {
      return buf.toString('utf8');
    }
  }
}

function decodeQuotedPrintableToBuffer(input: Buffer | string): Buffer {
  const str = typeof input === 'string' ? input : input.toString('latin1');
  // Rimuove soft line breaks (=\r\n o =\n)
  const unfolded = str.replace(/=[ \t]*\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < unfolded.length; i++) {
    const ch = unfolded.charCodeAt(i);
    if (ch === 0x3d /* '=' */ && i + 2 < unfolded.length) {
      const hex = unfolded.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(ch & 0xff);
  }
  return Buffer.from(bytes);
}

/**
 * Decodifica parole codificate RFC 2047 (=?charset?B?...?= e =?charset?Q?...?=),
 * unendo token adiacenti con lo stesso charset per non spezzare sequenze UTF-8 multi-byte.
 */
export function decodeRfc2047Words(raw: string): string {
  if (!raw || !raw.includes('=?')) return raw;

  const tokenRegex = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;
  const parts: Array<
    | { kind: 'literal'; text: string }
    | { kind: 'encoded'; charset: string; bytes: Buffer }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(raw)) !== null) {
    const between = raw.slice(lastIndex, match.index);
    if (between) {
      // RFC 2047: gli spazi bianchi puri tra due encoded-word adiacenti vanno ignorati
      const prevWasEncoded = parts.length > 0 && parts[parts.length - 1].kind === 'encoded';
      if (!(prevWasEncoded && /^[ \t\r\n]+$/.test(between))) {
        parts.push({ kind: 'literal', text: between });
      }
    }

    const charset = normalizeCharsetLabel(match[1]);
    const encoding = match[2].toUpperCase();
    const payload = match[3];

    let decodedBytes: Buffer;
    if (encoding === 'B') {
      decodedBytes = Buffer.from(payload.replace(/\s+/g, ''), 'base64');
    } else {
      const qPayload = payload.replace(/_/g, ' ');
      decodedBytes = decodeQuotedPrintableToBuffer(qPayload);
    }

    const prev = parts[parts.length - 1];
    if (prev && prev.kind === 'encoded' && prev.charset === charset) {
      prev.bytes = Buffer.concat([prev.bytes, decodedBytes]);
    } else {
      parts.push({ kind: 'encoded', charset, bytes: decodedBytes });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    parts.push({ kind: 'literal', text: raw.slice(lastIndex) });
  }

  return parts
    .map((p) => (p.kind === 'literal' ? p.text : decodeBufferWithCharset(p.bytes, p.charset)))
    .join('');
}

function splitHeaderAndBodyOffsets(buf: Buffer): { headerText: string; bodyBuffer: Buffer } {
  for (let i = 0; i < buf.length - 1; i++) {
    if (
      buf[i] === 0x0d &&
      buf[i + 1] === 0x0a &&
      i + 3 < buf.length &&
      buf[i + 2] === 0x0d &&
      buf[i + 3] === 0x0a
    ) {
      return {
        headerText: buf.subarray(0, i).toString('latin1'),
        bodyBuffer: buf.subarray(i + 4),
      };
    }
    if (buf[i] === 0x0a && buf[i + 1] === 0x0a) {
      return {
        headerText: buf.subarray(0, i).toString('latin1'),
        bodyBuffer: buf.subarray(i + 2),
      };
    }
  }
  return {
    headerText: '',
    bodyBuffer: buf,
  };
}

function parseMimeHeaders(headerText: string): Record<string, string> {
  const unfolded = headerText.replace(/\r?\n([ \t]+)/g, ' ');
  const lines = unfolded.split(/\r?\n/);
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = decodeRfc2047Words(line.slice(colonIdx + 1).trim());
    if (headers[key]) {
      headers[key] = `${headers[key]} ${val}`;
    } else {
      headers[key] = val;
    }
  }
  return headers;
}

function extractHeaderParam(headerVal: string | undefined, paramName: string): string | null {
  if (!headerVal) return null;
  const lowerName = paramName.toLowerCase();

  // 1. RFC 2231 extended parameter: filename*=UTF-8''nome%20file.pdf
  const extRegex = new RegExp(`(?:^|;)\\s*${lowerName}\\*=([^;]+)`, 'i');
  const extMatch = headerVal.match(extRegex);
  if (extMatch?.[1]) {
    const rawExt = extMatch[1].trim().replace(/^["']|["']$/g, '');
    const parts = rawExt.split("''");
    if (parts.length >= 2) {
      const charset = normalizeCharsetLabel(parts[0]);
      const encodedPart = parts.slice(1).join("''");
      try {
        const pctBytes: number[] = [];
        for (let i = 0; i < encodedPart.length; i++) {
          if (
            encodedPart[i] === '%' &&
            i + 2 < encodedPart.length &&
            /^[0-9A-Fa-f]{2}$/.test(encodedPart.slice(i + 1, i + 3))
          ) {
            pctBytes.push(parseInt(encodedPart.slice(i + 1, i + 3), 16));
            i += 2;
          } else {
            pctBytes.push(encodedPart.charCodeAt(i) & 0xff);
          }
        }
        return decodeBufferWithCharset(Buffer.from(pctBytes), charset);
      } catch {
        // fallback below
      }
    }
  }

  // 2. Standard parameter: filename="nome.pdf" o filename=nome.pdf
  const stdRegex = new RegExp(`(?:^|;)\\s*${lowerName}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^;\\s]+))`, 'i');
  const stdMatch = headerVal.match(stdRegex);
  if (stdMatch) {
    const rawVal = stdMatch[1] || stdMatch[2] || stdMatch[3] || '';
    return decodeRfc2047Words(rawVal).trim();
  }

  // 3. RFC 2231 multi-segment continuation: filename*0="..."; filename*1="..."
  const segRegex = new RegExp(`(?:^|;)\\s*${lowerName}\\*(\\d+)\\*?=\\s*(?:"([^"]*)"|([^;]+))`, 'gi');
  const segments: Array<{ idx: number; val: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = segRegex.exec(headerVal)) !== null) {
    segments.push({
      idx: Number(m[1]),
      val: (m[2] ?? m[3] ?? '').trim(),
    });
  }
  if (segments.length > 0) {
    segments.sort((a, b) => a.idx - b.idx);
    const joined = segments.map((s) => s.val).join('');
    const cleanJoined = joined.includes("''") ? decodeURIComponent(joined.split("''").slice(1).join("''")) : joined;
    return decodeRfc2047Words(cleanJoined).trim();
  }

  return null;
}

function splitMultipartBuffer(body: Buffer, boundary: string): Buffer[] {
  const dashBoundary = Buffer.from(`--${boundary}`, 'latin1');
  const parts: Buffer[] = [];
  let searchFrom = 0;
  const positions: number[] = [];

  while (searchFrom < body.length) {
    const idx = body.indexOf(dashBoundary, searchFrom);
    if (idx === -1) break;
    // Verifica che sia a inizio buffer o preceduto da \n
    if (idx === 0 || body[idx - 1] === 0x0a || body[idx - 1] === 0x0d) {
      positions.push(idx);
    }
    searchFrom = idx + dashBoundary.length;
  }

  for (let i = 0; i < positions.length - 1; i++) {
    const startAfterMarker = positions[i] + dashBoundary.length;
    // Se subito dopo --boundary c'è `--`, è il terminatore finale
    if (
      startAfterMarker + 1 < body.length &&
      body[startAfterMarker] === 0x2d &&
      body[startAfterMarker + 1] === 0x2d
    ) {
      break;
    }

    // Salta eventuali spazi e \r\n dopo --boundary
    let partStart = startAfterMarker;
    while (partStart < body.length && (body[partStart] === 0x20 || body[partStart] === 0x09)) {
      partStart++;
    }
    if (body[partStart] === 0x0d && body[partStart + 1] === 0x0a) {
      partStart += 2;
    } else if (body[partStart] === 0x0a) {
      partStart += 1;
    }

    // Fine parte prima del \r\n che precede il prossimo --boundary
    let partEnd = positions[i + 1];
    if (partEnd >= 2 && body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) {
      partEnd -= 2;
    } else if (partEnd >= 1 && body[partEnd - 1] === 0x0a) {
      partEnd -= 1;
    }

    if (partEnd > partStart) {
      parts.push(body.subarray(partStart, partEnd));
    }
  }

  return parts;
}

function decodeTransferEncoding(rawBody: Buffer, transferEncoding?: string | null): Buffer {
  const enc = String(transferEncoding || '7bit')
    .trim()
    .toLowerCase();
  if (enc === 'base64') {
    const cleaned = rawBody.toString('latin1').replace(/[^A-Za-z0-9+/=]/g, '');
    return Buffer.from(cleaned, 'base64');
  }
  if (enc === 'quoted-printable') {
    return decodeQuotedPrintableToBuffer(rawBody);
  }
  return rawBody;
}

const HTML_NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  agrave: 'à',
  egrave: 'è',
  eacute: 'é',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  Agrave: 'À',
  Egrave: 'È',
  Eacute: 'É',
  Igrave: 'Ì',
  Ograve: 'Ò',
  Ugrave: 'Ù',
  euro: '€',
  deg: '°',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
};

export function htmlToReadableText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote|section|article)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&([a-zA-Z0-9#]+);/g, (full, entity: string) => {
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        const code = parseInt(entity.slice(2), 16);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : full;
      }
      if (entity.startsWith('#')) {
        const code = parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : full;
      }
      return HTML_NAMED_ENTITIES[entity] ?? full;
    })
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inferExtensionFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('pdf')) return '.pdf';
  if (ct.includes('spreadsheetml') || ct.includes('xlsx')) return '.xlsx';
  if (ct.includes('ms-excel') || ct.includes('excel')) return '.xls';
  if (ct.includes('csv')) return '.csv';
  if (ct.includes('wordprocessingml') || ct.includes('docx')) return '.docx';
  if (ct.includes('msword')) return '.doc';
  if (ct.includes('zip')) return '.zip';
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('gif')) return '.gif';
  if (ct.includes('xml')) return '.xml';
  if (ct.includes('plain')) return '.txt';
  return '.bin';
}

function sanitizeAttachmentFilename(rawName: string | null, contentType: string, index: number): string {
  const cleaned = String(rawName || '')
    .replace(/[\r\n\t\\/]+/g, '_')
    .replace(/[^\w.\- ()àèéìòùÀÈÉÌÒÙ]/g, '_')
    .trim();

  const ext = inferExtensionFromContentType(contentType);
  if (!cleaned) {
    return `allegato_${index + 1}${ext}`;
  }
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(cleaned)) {
    return `${cleaned}${ext}`;
  }
  return cleaned;
}

export function parseRawMimeEmail(rawInput?: Buffer | string | null): ParsedInboundEmail {
  if (!rawInput) {
    return {
      headers: {},
      messageIdsInThread: [],
      inReplyTo: '',
      autoSubmitted: '',
      fullText: '',
      freshReplyText: '',
      htmlBody: '',
      attachments: [],
      oversizedAttachmentsSkipped: [],
    };
  }

  const rootBuffer = Buffer.isBuffer(rawInput) ? rawInput : Buffer.from(rawInput, 'utf8');
  const { headerText, bodyBuffer } = splitHeaderAndBodyOffsets(rootBuffer);
  const rootHeaders = parseMimeHeaders(headerText);

  const plainParts: string[] = [];
  const htmlParts: string[] = [];
  const attachments: ParsedEmailAttachment[] = [];
  const oversizedAttachmentsSkipped: string[] = [];
  let totalAttachmentBytes = 0;

  const walkPart = (partHeaders: Record<string, string>, partBody: Buffer) => {
    const rawContentType = partHeaders['content-type'] || 'text/plain; charset=utf-8';
    const mimeType = rawContentType.split(';')[0].trim().toLowerCase();
    const charset = extractHeaderParam(rawContentType, 'charset');
    const boundary = extractHeaderParam(rawContentType, 'boundary');

    const rawDisposition = partHeaders['content-disposition'] || '';
    const dispositionType = rawDisposition.split(';')[0].trim().toLowerCase();
    const filename =
      extractHeaderParam(rawDisposition, 'filename') ||
      extractHeaderParam(rawContentType, 'name');
    const transferEncoding = partHeaders['content-transfer-encoding'];
    const contentId = partHeaders['content-id'] || '';

    if (mimeType.startsWith('multipart/') && boundary) {
      const subParts = splitMultipartBuffer(partBody, boundary);
      for (const sub of subParts) {
        const splitSub = splitHeaderAndBodyOffsets(sub);
        const subHeaders = parseMimeHeaders(splitSub.headerText);
        walkPart(subHeaders, splitSub.bodyBuffer);
      }
      return;
    }

    // Messaggi incapsulati (es. DSN bounce message/rfc822 o delivery-status)
    if (mimeType === 'message/delivery-status' || mimeType === 'text/rfc822-headers') {
      const decoded = decodeTransferEncoding(partBody, transferEncoding);
      plainParts.push(decodeBufferWithCharset(decoded, charset || 'utf-8'));
      return;
    }

    const decodedBytes = decodeTransferEncoding(partBody, transferEncoding);

    const isExplicitAttachment = dispositionType === 'attachment';
    const isDocumentOrArchive =
      mimeType.startsWith('application/') &&
      !mimeType.includes('pgp-signature') &&
      !mimeType.includes('pkcs7-signature');
    const isMediaWithFilename =
      Boolean(filename) &&
      (mimeType.startsWith('image/') ||
        mimeType.startsWith('audio/') ||
        mimeType.startsWith('video/') ||
        mimeType === 'text/csv');

    // Escludi minuscoli tracking pixel / icone firma inline (< 2.5 KB con Content-ID)
    const isTinyInlineSignatureIcon =
      !isExplicitAttachment &&
      dispositionType === 'inline' &&
      Boolean(contentId) &&
      mimeType.startsWith('image/') &&
      decodedBytes.length < 2500;

    if (
      (isExplicitAttachment || isDocumentOrArchive || isMediaWithFilename) &&
      !isTinyInlineSignatureIcon
    ) {
      if (decodedBytes.length === 0) return;

      const safeName = sanitizeAttachmentFilename(filename, mimeType, attachments.length);
      if (totalAttachmentBytes + decodedBytes.length > MAX_TOTAL_ATTACHMENTS_BYTES) {
        oversizedAttachmentsSkipped.push(
          `${safeName} (${(decodedBytes.length / (1024 * 1024)).toFixed(1)} MB)`
        );
        return;
      }

      totalAttachmentBytes += decodedBytes.length;
      attachments.push({
        name: safeName,
        content: decodedBytes.toString('base64'),
        contentType: mimeType || 'application/octet-stream',
        sizeBytes: decodedBytes.length,
      });
      return;
    }

    if (mimeType === 'text/plain') {
      const text = decodeBufferWithCharset(decodedBytes, charset);
      if (text.trim()) plainParts.push(text.replace(/\r\n/g, '\n').trim());
      return;
    }

    if (mimeType === 'text/html') {
      const html = decodeBufferWithCharset(decodedBytes, charset);
      if (html.trim()) htmlParts.push(html);
      return;
    }
  };

  walkPart(rootHeaders, bodyBuffer);

  const htmlBody = htmlParts.join('\n\n');
  const fullTextRaw =
    plainParts.length > 0
      ? plainParts.join('\n\n')
      : htmlBody
        ? htmlToReadableText(htmlBody)
        : decodeBufferWithCharset(bodyBuffer, 'utf-8').trim();

  const fullText = fullTextRaw.replace(/\r\n/g, '\n').trim();
  const freshReplyText = extractFreshReplyText(fullText);

  const inReplyToRaw = rootHeaders['in-reply-to'] || '';
  const referencesRaw = rootHeaders['references'] || '';
  const allIds = Array.from(
    new Set(
      (`${inReplyToRaw} ${referencesRaw}`.match(/<[^>]+>/g) || []).map((id) => id.trim())
    )
  );
  const primaryInReplyTo =
    (inReplyToRaw.match(/<[^>]+>/)?.[0] || inReplyToRaw.trim() || allIds[allIds.length - 1] || '').trim();

  const autoSubmitted = (
    rootHeaders['auto-submitted'] ||
    rootHeaders['x-autoreply'] ||
    rootHeaders['x-autorespond'] ||
    ''
  )
    .trim()
    .toLowerCase();

  return {
    headers: rootHeaders,
    messageIdsInThread: allIds,
    inReplyTo: primaryInReplyTo,
    autoSubmitted,
    fullText,
    freshReplyText,
    htmlBody,
    attachments,
    oversizedAttachmentsSkipped,
  };
}

/**
 * Estrae esclusivamente il testo nuovo scritto dal cliente in cima alla risposta,
 * rimuovendo la citazione della nostra mail precedente ("Il giorno ... ha scritto:", "> ...", ecc.).
 */
export function extractFreshReplyText(fullText: string): string {
  if (!fullText) return '';

  const lines = fullText.replace(/\r\n/g, '\n').split('\n');
  const keptLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Separatori classici client di posta (Outlook, Gmail, Apple Mail, Aruba Webmail, Thunderbird)
    if (
      /^-{2,}\s*(?:Messaggio originale|Original Message|Messaggio inoltrato|Forwarded message)\s*-{2,}/i.test(
        trimmed
      ) ||
      /^_{6,}$/.test(trimmed) ||
      /^Il giorno .+ ha scritto:\s*$/i.test(trimmed) ||
      /^Il \d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}.+ha scritto:\s*$/i.test(trimmed) ||
      /^On .+ wrote:\s*$/i.test(trimmed)
    ) {
      break;
    }

    // Gmail / Apple Mail wrap su 2 righe: "Il giorno lun 17 nov 2026..." + riga successiva "...ha scritto:"
    if (
      (/^Il giorno /i.test(trimmed) || /^On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d)/i.test(trimmed)) &&
      i + 1 < lines.length &&
      /(?:ha scritto|wrote):\s*$/i.test(lines[i + 1].trim())
    ) {
      break;
    }

    // Blocco header citato Outlook italiano/inglese ("Da: ... Inviato: ...")
    if (
      /^(?:Da|From):\s+.+/i.test(trimmed) &&
      i + 1 < lines.length &&
      /^(?:Inviato|Data|Sent|A|To|Oggetto|Subject):\s+/i.test(lines[i + 1].trim())
    ) {
      break;
    }

    // Ignora righe citate col simbolo `>`
    if (/^>+/.test(trimmed)) {
      continue;
    }

    keptLines.push(line);
  }

  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Classificatore evoluto Sentinella IMAP:
 * - `Bounce` / `Out_Of_Office` / `Opt_Out`
 * - `Consenso_Invio`: risposta breve affermativa ("Sì grazie", "Mandate pure", "Ok inviate listino", "Va bene"),
 *   senza punti interrogativi di merito su codici/pagamenti e senza allegati.
 * - `Domanda_Specifica`: domanda di merito, testo articolato o presenza di allegati (distinte, PDF, Excel, foto).
 */
export function classifyInboundEmail(params: {
  fromEmail: string;
  subject: string;
  freshReplyText: string;
  fullText: string;
  attachmentsCount: number;
  autoSubmitted?: string;
}): InboundReplyClassification {
  const fromLower = (params.fromEmail || '').trim().toLowerCase();
  const subjectLower = (params.subject || '').trim().toLowerCase();
  const fresh = (params.freshReplyText || '').trim();
  const freshLower = fresh.toLowerCase();
  const combinedFullLower = `${subjectLower}\n${params.fullText || ''}`.toLowerCase();

  // 1. Hard / Soft Bounce
  if (
    /mailer-daemon|postmaster|maildelivery/i.test(fromLower) ||
    /undelivered|delivery status notification|mail delivery failed|failure notice|user unknown|550 5\.1\.1|550[-\s].*(?:mailbox|user|recipient|address)|indirizzo inesistente|casella piena|mailbox unavailable|non recapitat|impossibile recapitare/i.test(
      combinedFullLower
    )
  ) {
    return 'Bounce';
  }

  // 2. Out Of Office / Risponditore Automatico Ferie
  if (
    (params.autoSubmitted &&
      params.autoSubmitted !== 'no' &&
      /auto-replied|auto-generated|yes/i.test(params.autoSubmitted)) ||
    /assente dall'ufficio|fuori sede|out of office|risposta automatica|automatic reply|chiusura estiva|chiusi per ferie|in ferie fino|rientrer[oò] in ufficio/i.test(
      `${subjectLower}\n${freshLower}`
    )
  ) {
    return 'Out_Of_Office';
  }

  // 3. Opt-Out / Rifiuto Esplicito (incluso "STOP" o "No grazie")
  if (
    /non siamo interessati|non interessat[oi]|non ci interessa|non ci serve|cancellatemi|rimuovetemi|disiscriv|unsubscribe|non inviate|stop email|gdpr|rimuovere il nostro indirizzo|no\s*,?\s*grazie|siamo gi[aà] coperti|abbiamo gi[aà] i nostri fornitori/i.test(
      `${subjectLower}\n${freshLower}`
    ) ||
    /^\s*stop\s*[.!]*\s*$/i.test(fresh)
  ) {
    return 'Opt_Out';
  }

  // 4. Qualsiasi risposta con allegati (PDF, Excel, distinte, immagini) va subito a Daniele per intero!
  if (params.attachmentsCount > 0) {
    return 'Domanda_Specifica';
  }

  // Rimuove saluti/firme standard solo ai fini del conteggio lunghezza/domande della frase di consenso
  const coreLines = fresh
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^(?:cordiali saluti|distinti saluti|saluti|buona giornata|buon lavoro|inviato da iphone|inviato da outlook|inviato dal mio|get outlook for)/i.test(
          l
        )
    );
  const coreText = coreLines.join(' ').replace(/\s+/g, ' ').trim();

  // Se contiene punti interrogativi, o è lungo, o cita richieste specifiche su codici/marchi/pagamenti/chiamate -> Domanda Specifica
  const hasQuestionMark = fresh.includes('?');
  const hasSpecificMeritRequest =
    /\b(preventiv[oi]|quotazion[ei]|offerta per|avete disponibil|disponibilit[aà]\s+di|quanto costa|prezzo di|riba|ri\.ba|bonifico\s*\d+|30\s*gg|60\s*gg|90\s*gg|fido|dilazion|chiamatemi|potete chiamar|ricontattatemi|passare in sede|appuntamento|distinta|capitolato|codic[ei]|articolo|bticino|vimar|gewiss|schneider|abb|urmet|comelit|finder|meanwell)\b/i.test(
      coreText
    );

  if (hasQuestionMark || hasSpecificMeritRequest || coreText.length > 260) {
    return 'Domanda_Specifica';
  }

  // 5. Consenso Semplice ("Sì grazie", "Mandate pure", "Ok inviate listino", "Va bene", "Volentieri", ecc.)
  const hasAffirmativeConsent =
    /\b(s[iì]|si'|ok|okay|va\s*bene|volentieri|certo|certamente|perfetto|procedete|proceda|mandat[ei]|mandi|inviat[ei]|invii|trasmettet[ei]|trasmetta|inoltrat[ei]|attendiamo|attendo|grazie|pure|visioniamo|valutiamo|riceviamo|mandateci|inviateci|fateci\s+avere|interessati\s+al\s+listino|interessati\s+a\s+ricevere)\b/i.test(
      coreText
    );

  if (hasAffirmativeConsent && coreText.length >= 2) {
    return 'Consenso_Invio';
  }

  // Fallback prudenziale: se non è un consenso breve inequivocabile, passa subito la conversazione a Daniele
  return 'Domanda_Specifica';
}
