import * as crypto from 'crypto';
import {
  sdrPrisma,
  resolveClusterConfig,
  type BuildOutreachEmailInput,
} from './index';
import { DEFAULT_SYNONYM_TOKENS, type SeedSynonymToken } from './combinatorialDictionary';
import {
  DEFAULT_EMAIL_TEMPLATES,
  type HtmlLayoutVariant,
  type SeedEmailTemplate,
} from './combinatorialTemplates';
import {
  composeProspectIntelligence,
  cleanCompanyDisplayName,
  extractVerifiedDecisionMaker,
  type ProspectIntelligenceSummary,
} from './prospectPersonalizer';

export interface ActiveEmailTemplateRecord {
  id?: number;
  code: string;
  name: string;
  angleGroup: string;
  targetCategory: string;
  htmlLayoutVariant: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  usageCount?: number;
}

export interface ActiveSynonymTokenRecord {
  id?: number;
  tokenKey: string;
  category: string;
  description: string;
  variants: string[];
  isActive: boolean;
}

export interface ReplacedTokenTrace {
  tokenKey: string;
  category: string;
  chosenValue: string;
  poolSize: number;
}

export interface CombinatorialEmailResult {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  discountFormulaLabel: string;
  templateCode: string;
  templateName: string;
  angleGroup: string;
  htmlLayoutVariant: HtmlLayoutVariant;
  tokensReplacedCount: number;
  replacedTokensPreview: ReplacedTokenTrace[];
  prospectIntelligence?: {
    companyClean: string;
    decisionMaker: string | null;
    domain: string | null;
    areaLabel: string;
    cluster: string;
    specializations: string[];
    detectedBrands: string[];
    civilBrandMatched: string | null;
    foundationYear: string | null;
    certifications: string | null;
  };
}

export interface GenerateCombinatorialOptions {
  forceTemplateCode?: string | null;
  isPreview?: boolean;
  deterministicSeed?: number | null;
}

export interface SdrSequenceFollowupInput {
  prospectId?: number | null;
  companyName: string;
  city?: string | null;
  province?: string | null;
  categoryCluster?: string | null;
  commercialCategory?: string | null;
  decisionMaker?: string | null;
  richMetadata?: Record<string, any> | null;
  originalSubject?: string | null;
  previousSubject?: string | null;
  subject?: string | null;
  smartCatalogUrl?: string | null;
  offerUrl?: string | null;
  trackingToken?: string | null;
  baseDiscount?: number | null;
  extraFirstPurchasePct?: number | null;
  minOrderAmountText?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  senderInboxEmail?: string | null;
  deterministicSeed?: number | null;
}

export type ConsentReplyEmailInput = SdrSequenceFollowupInput;
export type Step2FollowupEmailInput = SdrSequenceFollowupInput;
export type Step3WarmFollowupEmailInput = SdrSequenceFollowupInput;

export interface QuarterlyLoopEmailInput extends SdrSequenceFollowupInput {
  cycleNumber?: number | null;
  outreachCycle?: number | null;
  usedLoopTemplateCodes?: string[] | null;
  region?: string | null;
  website?: string | null;
  atecoCode?: string | null;
  brandsDetected?: string | string[] | null;
  offerTitle?: string | null;
  freeShippingText?: string | null;
  paymentTermsText?: string | null;
  forceTemplateCode?: string | null;
}

export interface SdrSequenceEmailOutput {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  sequenceStep: number;
  templateCode: string;
  discountFormulaLabel: string;
}

export interface QuarterlyLoopEmailOutput extends SdrSequenceEmailOutput {
  cycleNumber: number;
  angleGroup: string;
  templateName: string;
  updatedUsedLoopTemplateCodes: string[];
}

export interface QuarterlyLoopTemplateDef {
  code: string;
  name: string;
  angleGroup:
    | 'STOCK_PRONTA_CONSEGNA'
    | 'QUOTAZIONE_CAPITOLATO'
    | 'RIASSORTIMENTO_STAGIONALE'
    | 'SECONDO_FORNITORE_LIBERO'
    | 'CATALISTINO_NETTO_AGGIORNATO'
    | 'COMPATIBILITA_MARCHI_REPARTI';
}

export const IZZO_LEGAL_COMPANY_LINE =
  'Izzo Distribuzione S.r.l. — Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049';

export const DEFAULT_OPTOUT_B2B_NOTE =
  'Comunicazione B2B rivolta a operatori professionali. Per non ricevere ulteriori comunicazioni è sufficiente rispondere "STOP".';

interface CachedLibrary {
  loadedAt: number;
  templates: ActiveEmailTemplateRecord[];
  tokensMap: Map<string, ActiveSynonymTokenRecord>;
  tokensList: ActiveSynonymTokenRecord[];
}

const CACHE_TTL_MS = 45_000;
let memoryCache: CachedLibrary | null = null;
let seedingPromise: Promise<void> | null = null;

export function invalidateCombinatorialCache(): void {
  memoryCache = null;
}

function escapeHtml(val?: string | null): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmailFormat(val?: string | null): boolean {
  if (!val) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
}

/**
 * Risolve l'email mostrata nella firma in calce garantendo che non compaia mai un dominio
 * diverso non presidiato da IMAP (es. @izzodistribuzione.com).
 */
export function resolveSignatureSenderEmail(
  senderInboxEmail?: string | null,
  agentEmail?: string | null
): string {
  const inboxClean = (senderInboxEmail || '').trim().toLowerCase();
  if (isValidEmailFormat(inboxClean) && !inboxClean.endsWith('@izzodistribuzione.com')) {
    return inboxClean;
  }
  const agentClean = (agentEmail || '').trim().toLowerCase();
  if (
    isValidEmailFormat(agentClean) &&
    !agentClean.endsWith('@izzodistribuzione.com') &&
    !agentClean.includes('noreply') &&
    !agentClean.startsWith('info@')
  ) {
    return agentClean;
  }
  return 'daniele.savoia@izzodistribuzioneb2b.it';
}

/**
 * Allinea al 100% l'indirizzo Email nella firma in calce (testo + HTML) con la casella Aruba
 * effettiva che sta spedendo il messaggio via SMTP, senza iniettare tag <a href> cliccabili.
 */
export function applySenderEmailToDraftSignature(
  bodyText: string | null | undefined,
  bodyHtml: string | null | undefined,
  senderEmail: string | null | undefined
): { bodyText: string; bodyHtml: string } {
  const rawText = String(bodyText || '');
  const rawHtml = String(bodyHtml || '');
  const cleanSender = (senderEmail || '').trim().toLowerCase();

  if (!isValidEmailFormat(cleanSender)) {
    return {
      bodyText: rawText,
      bodyHtml: rawHtml || renderMinimalOutlookHtmlFromPlain(rawText),
    };
  }

  let updatedText = rawText
    .replace(
      /(\bEmail:\s*)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      `$1${cleanSender}`
    )
    .replace(/[a-zA-Z0-9._%+-]+@izzodistribuzione\.com\b/gi, cleanSender);

  // Se la firma non conteneva ancora "Email: ...", lo garantisce accanto al telefono se presente
  if (!updatedText.toLowerCase().includes(cleanSender)) {
    updatedText = updatedText.replace(
      /(Tel\s*\/\s*WhatsApp:\s*[^\n—]+)(?:\s*—\s*Email:[^\n]*)?/i,
      `$1 — Email: ${cleanSender}`
    );
  }

  let updatedHtml = rawHtml
    ? rawHtml
        // Rimuove eventuali vecchi <a href="mailto:..."> nella riga Email: e allinea al mittente Aruba
        .replace(
          /(\bEmail:\s*)(?:<a\b[^>]*>)?\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*(?:<\/a>)?/gi,
          `$1${escapeHtml(cleanSender)}`
        )
        // Rimuove eventuali vecchi <a href="tel:..."> nella firma per mantenere conteggio link zero/uno
        .replace(
          /<a\b[^>]*href=["']tel:[^"']*["'][^>]*>([^<]+)<\/a>/gi,
          '$1'
        )
        .replace(
          /mailto:[a-zA-Z0-9._%+-]+@izzodistribuzione\.com\b/gi,
          `mailto:${escapeHtml(cleanSender)}`
        )
        .replace(
          /[a-zA-Z0-9._%+-]+@izzodistribuzione\.com\b/gi,
          escapeHtml(cleanSender)
        )
    : renderMinimalOutlookHtmlFromPlain(updatedText);

  if (!updatedHtml.toLowerCase().includes(escapeHtml(cleanSender).toLowerCase())) {
    updatedHtml = updatedHtml.replace(
      /(Tel\s*\/\s*WhatsApp:\s*[^<\n—]+)(?:\s*—\s*Email:[^<\n]*)?/i,
      `$1 — Email: ${escapeHtml(cleanSender)}`
    );
  }

  return {
    bodyText: updatedText,
    bodyHtml: updatedHtml,
  };
}

function buildFallbackLibrary(): CachedLibrary {
  const templates: ActiveEmailTemplateRecord[] = DEFAULT_EMAIL_TEMPLATES.map((t) => ({
    ...t,
    isActive: true,
    usageCount: 0,
  }));
  const tokensList: ActiveSynonymTokenRecord[] = DEFAULT_SYNONYM_TOKENS.map((tk) => ({
    ...tk,
    isActive: true,
  }));
  const tokensMap = new Map<string, ActiveSynonymTokenRecord>();
  for (const tk of tokensList) {
    tokensMap.set(tk.tokenKey.toUpperCase(), tk);
  }
  return {
    loadedAt: Date.now(),
    templates,
    tokensMap,
    tokensList,
  };
}

/**
 * Popola in modo idempotente le 100 email madri (Step 1 conversazione umana pura)
 * e i 108 gruppi di parole dinamiche nel DB SDR.
 */
export async function seedCombinatorialLibraryInDb(options?: {
  syncMissing?: boolean;
  overwriteDefaults?: boolean;
}): Promise<{ templatesCount: number; tokensCount: number }> {
  const syncMissing = options?.syncMissing ?? true;
  const overwriteDefaults = options?.overwriteDefaults ?? false;

  if (overwriteDefaults) {
    await sdrPrisma.sdrSynonymToken
      .deleteMany({ where: { tokenKey: 'CLAUSOLA_SOLO_2GG' } })
      .catch(() => {});
    const chunkSize = 25;
    for (let i = 0; i < DEFAULT_SYNONYM_TOKENS.length; i += chunkSize) {
      const batch = DEFAULT_SYNONYM_TOKENS.slice(i, i + chunkSize);
      await Promise.all(
        batch.map((tk) => {
          const key = tk.tokenKey.toUpperCase();
          return sdrPrisma.sdrSynonymToken.upsert({
            where: { tokenKey: key },
            create: {
              tokenKey: key,
              category: tk.category,
              description: tk.description,
              variants: tk.variants,
              isActive: true,
            },
            update: {
              category: tk.category,
              description: tk.description,
              variants: tk.variants,
            },
          });
        })
      );
    }

    for (let i = 0; i < DEFAULT_EMAIL_TEMPLATES.length; i += chunkSize) {
      const batch = DEFAULT_EMAIL_TEMPLATES.slice(i, i + chunkSize);
      await Promise.all(
        batch.map((tpl) =>
          sdrPrisma.sdrEmailTemplate.upsert({
            where: { code: tpl.code },
            create: {
              code: tpl.code,
              name: tpl.name,
              angleGroup: tpl.angleGroup,
              targetCategory: 'ALL',
              htmlLayoutVariant: tpl.htmlLayoutVariant,
              subjectTemplate: tpl.subjectTemplate,
              bodyTemplate: tpl.bodyTemplate,
              isActive: true,
            },
            update: {
              name: tpl.name,
              angleGroup: tpl.angleGroup,
              targetCategory: 'ALL',
              htmlLayoutVariant: tpl.htmlLayoutVariant,
              subjectTemplate: tpl.subjectTemplate,
              bodyTemplate: tpl.bodyTemplate,
            },
          })
        )
      );
    }
  } else {
    const [existingTemplatesCount, existingTokensCount] = await Promise.all([
      sdrPrisma.sdrEmailTemplate.count(),
      sdrPrisma.sdrSynonymToken.count(),
    ]);

    if (existingTokensCount === 0 || syncMissing) {
      await sdrPrisma.sdrSynonymToken.createMany({
        data: DEFAULT_SYNONYM_TOKENS.map((tk: SeedSynonymToken) => ({
          tokenKey: tk.tokenKey.toUpperCase(),
          category: tk.category,
          description: tk.description,
          variants: tk.variants,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    if (existingTemplatesCount === 0 || syncMissing) {
      await sdrPrisma.sdrEmailTemplate.createMany({
        data: DEFAULT_EMAIL_TEMPLATES.map((tpl: SeedEmailTemplate) => ({
          code: tpl.code,
          name: tpl.name,
          angleGroup: tpl.angleGroup,
          targetCategory: 'ALL',
          htmlLayoutVariant: tpl.htmlLayoutVariant,
          subjectTemplate: tpl.subjectTemplate,
          bodyTemplate: tpl.bodyTemplate,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  invalidateCombinatorialCache();

  const [finalTemplates, finalTokens] = await Promise.all([
    sdrPrisma.sdrEmailTemplate.count(),
    sdrPrisma.sdrSynonymToken.count(),
  ]);

  return {
    templatesCount: finalTemplates,
    tokensCount: finalTokens,
  };
}

async function loadCombinatorialLibraryFromDb(): Promise<CachedLibrary> {
  if (memoryCache && Date.now() - memoryCache.loadedAt < CACHE_TTL_MS) {
    return memoryCache;
  }

  try {
    const [tplCount, tokCount] = await Promise.all([
      sdrPrisma.sdrEmailTemplate.count(),
      sdrPrisma.sdrSynonymToken.count(),
    ]);

    if (tplCount === 0 || tokCount === 0) {
      if (!seedingPromise) {
        seedingPromise = seedCombinatorialLibraryInDb({ syncMissing: true })
          .then(() => {})
          .finally(() => {
            seedingPromise = null;
          });
      }
      await seedingPromise;
    }

    const [dbTemplates, dbTokens] = await Promise.all([
      sdrPrisma.sdrEmailTemplate.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
      sdrPrisma.sdrSynonymToken.findMany({
        where: { isActive: true },
        orderBy: { tokenKey: 'asc' },
      }),
    ]);

    if (dbTemplates.length === 0 || dbTokens.length === 0) {
      return buildFallbackLibrary();
    }

    const tokensMap = new Map<string, ActiveSynonymTokenRecord>();
    for (const tk of dbTokens) {
      if (Array.isArray(tk.variants) && tk.variants.length > 0) {
        tokensMap.set(tk.tokenKey.toUpperCase(), tk);
      }
    }

    for (const fallbackTk of DEFAULT_SYNONYM_TOKENS) {
      const key = fallbackTk.tokenKey.toUpperCase();
      if (!tokensMap.has(key)) {
        tokensMap.set(key, { ...fallbackTk, isActive: true });
      }
    }

    memoryCache = {
      loadedAt: Date.now(),
      templates: dbTemplates,
      tokensMap,
      tokensList: Array.from(tokensMap.values()),
    };
    return memoryCache;
  } catch {
    return buildFallbackLibrary();
  }
}

export function computeCombinatorialStats(
  templates: Array<{ isActive?: boolean }>,
  tokens: Array<{ isActive?: boolean; variants?: string[] }>
) {
  const activeTemplates = templates.filter((t) => t.isActive !== false).length;
  const activeTokens = tokens.filter(
    (tk) => tk.isActive !== false && Array.isArray(tk.variants) && tk.variants.length > 0
  );
  const totalVariantsCount = activeTokens.reduce(
    (acc, tk) => acc + (tk.variants?.length || 0),
    0
  );
  const avgVariants =
    activeTokens.length > 0 ? totalVariantsCount / activeTokens.length : 1;

  const slotsPerEmail = Math.min(20, activeTokens.length);
  const log10Combinations =
    activeTemplates > 0 && avgVariants > 1
      ? Math.floor(Math.log10(activeTemplates) + slotsPerEmail * Math.log10(avgVariants))
      : 0;

  return {
    totalTemplates: templates.length,
    activeTemplates,
    totalTokens: tokens.length,
    activeTokens: activeTokens.length,
    totalVariantsCount,
    avgVariantsPerToken: Number(avgVariants.toFixed(1)),
    slotsPerEmailEstimate: slotsPerEmail,
    exponentBase10: log10Combinations,
    estimatedCombinationsLabel:
      log10Combinations >= 18
        ? `Oltre 10^${log10Combinations} (miliardi di miliardi di combinazioni uniche)`
        : log10Combinations >= 9
          ? `Oltre 10^${log10Combinations} (miliardi di combinazioni uniche)`
          : `Oltre milioni di combinazioni uniche`,
  };
}

function pickIndex(length: number, seedCursor?: { val: number } | null): number {
  if (length <= 1) return 0;
  if (seedCursor) {
    seedCursor.val = (seedCursor.val * 1664525 + 1013904223) >>> 0;
    return seedCursor.val % length;
  }
  return crypto.randomInt(0, length);
}

function normalizeItalianArticulatedPrepositions(text: string): string {
  const rules: Array<[RegExp, string]> = [
    [/\bdi il\b/g, 'del'],
    [/\bDi il\b/g, 'Del'],
    [/\bdi lo\b/g, 'dello'],
    [/\bDi lo\b/g, 'Dello'],
    [/\bdi la\b/g, 'della'],
    [/\bDi la\b/g, 'Della'],
    [/\bdi l’/g, 'dell’'],
    [/\bDi l’/g, 'Dell’'],
    [/\bdi i\b/g, 'dei'],
    [/\bDi i\b/g, 'Dei'],
    [/\bdi gli\b/g, 'degli'],
    [/\bDi gli\b/g, 'Degli'],
    [/\bdi le\b/g, 'delle'],
    [/\bDi le\b/g, 'Delle'],
    [/\ba il\b/g, 'al'],
    [/\bA il\b/g, 'Al'],
    [/\ba lo\b/g, 'allo'],
    [/\bA lo\b/g, 'Allo'],
    [/\ba la\b/g, 'alla'],
    [/\bA la\b/g, 'Alla'],
    [/\ba l’/g, 'all’'],
    [/\bA l’/g, 'All’'],
    [/\ba i\b/g, 'ai'],
    [/\bA i\b/g, 'Ai'],
    [/\ba gli\b/g, 'agli'],
    [/\bA gli\b/g, 'Agli'],
    [/\ba le\b/g, 'alle'],
    [/\bA le\b/g, 'Alle'],
    [/\bda il\b/g, 'dal'],
    [/\bDa il\b/g, 'Dal'],
    [/\bda lo\b/g, 'dallo'],
    [/\bDa lo\b/g, 'Dallo'],
    [/\bda la\b/g, 'dalla'],
    [/\bDa la\b/g, 'Dalla'],
    [/\bda l’/g, 'dall’'],
    [/\bDa l’/g, 'Dall’'],
    [/\bda i\b/g, 'dai'],
    [/\bDa i\b/g, 'Dai'],
    [/\bda gli\b/g, 'dagli'],
    [/\bDa gli\b/g, 'Dagli'],
    [/\bda le\b/g, 'dalle'],
    [/\bDa le\b/g, 'Dalle'],
    [/\bin il\b/g, 'nel'],
    [/\bIn il\b/g, 'Nel'],
    [/\bin lo\b/g, 'nello'],
    [/\bIn lo\b/g, 'Nello'],
    [/\bin la\b/g, 'nella'],
    [/\bIn la\b/g, 'Nella'],
    [/\bin l’/g, 'nell’'],
    [/\bIn l’/g, 'Nell’'],
    [/\bin i\b/g, 'nei'],
    [/\bIn i\b/g, 'Nei'],
    [/\bin gli\b/g, 'negli'],
    [/\bIn gli\b/g, 'Negli'],
    [/\bin le\b/g, 'nelle'],
    [/\bIn le\b/g, 'Nelle'],
    [/\bsu il\b/g, 'sul'],
    [/\bSu il\b/g, 'Sul'],
    [/\bsu lo\b/g, 'sullo'],
    [/\bSu lo\b/g, 'Sullo'],
    [/\bsu la\b/g, 'sulla'],
    [/\bSu la\b/g, 'Sulla'],
    [/\bsu l’/g, 'sull’'],
    [/\bSu l’/g, 'Sull’'],
    [/\bsu i\b/g, 'sui'],
    [/\bSu i\b/g, 'Sui'],
    [/\bsu gli\b/g, 'sugli'],
    [/\bSu gli\b/g, 'Sugli'],
    [/\bsu le\b/g, 'sulle'],
    [/\bSu le\b/g, 'Sulle'],
  ];
  let out = text;
  for (const [re, rep] of rules) {
    out = out.replace(re, rep);
  }
  return out;
}

function polishSubjectTypography(rawSubject: string): string {
  const cleaned = normalizeItalianArticulatedPrepositions(rawSubject)
    .replace(/`/g, '')
    .replace(/\bpassword\b/gi, 'codice riservato')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function polishBodyTypography(rawBody: string): string {
  const lines = rawBody.split('\n').map((line) =>
    normalizeItalianArticulatedPrepositions(line)
      .replace(/`/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.;!?])/g, '$1')
      .trimEnd()
  );
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeExternalCopy(raw?: string | null, fallback = ''): string {
  const txt = String(raw || '').trim();
  if (!txt) return fallback;
  return (
    txt
      .replace(/\(?\s*(?:linea\s*)?(?:solo\s*)?(?:pronta\s+consegna\s*)?2gg\s*\)?/gi, '')
      .replace(/\(?\s*7gg\s*\)?/gi, '')
      .replace(/\b24\/48\s*(?:h|ore)\b/gi, '')
      .replace(/con\s+garanzia\s+di\s+evasione[^.,;]*/gi, '')
      .replace(/\(\s*Cod\.[^)]*\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .trim() || fallback
  );
}

function stripMarkdownAndForbiddenStep1Tokens(
  rawText: string,
  forbiddenLiterals: Array<string | null | undefined> = []
): string {
  let out = rawText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(→])\*([^*\n]+)\*(?=[\s.,;:)!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/[^\s<)"']+/gi, '')
    .replace(/(?<![@.-])\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<)"']*)?/gi, '')
    .replace(/(?<![@.-])\bizzodistribuzione\.(?:it|com)(?:\/[^\s<)"']*)?/gi, 'Izzo Distribuzione S.r.l.')
    .replace(/\bpassword\b/gi, 'abilitazione riservata')
    .replace(/\busername\b/gi, 'profilo riservato');

  for (const lit of forbiddenLiterals) {
    const cleanLit = String(lit || '').trim();
    if (cleanLit.length >= 4) {
      out = out.split(cleanLit).join('');
    }
  }

  return out
    .split('\n')
    .map((l) =>
      l
        .replace(/^-{3,}$/, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([,.;:])/g, '$1')
        .trimEnd()
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converte testo puro in HTML minimale stile mail scritta a mano da Outlook:
 * `<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #111111;">`
 * con soli `<p>` e `<br/>` (e, solo se `singleAllowedUrl` è valorizzato in Step 1B / Step 2, 1 singolo `<a href>`).
 */
export function renderMinimalOutlookHtmlFromPlain(
  plainFullText: string,
  options?: {
    singleAllowedUrl?: string | null;
    signatureStartMarker?: string | null;
  }
): string {
  const allowedUrl = (options?.singleAllowedUrl || '').trim();
  let linkInjected = false;

  const paragraphs = String(plainFullText || '')
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const renderedParagraphs = paragraphs.map((block, idx) => {
    const isLegalFooter =
      idx === paragraphs.length - 1 &&
      (block.includes('P.IVA 01868260629') || block.includes('STOP'));

    let escaped = escapeHtml(block);

    if (allowedUrl && !linkInjected && block.includes(allowedUrl)) {
      const escapedUrl = escapeHtml(allowedUrl);
      escaped = escaped.replace(
        escapedUrl,
        `<a href="${escapedUrl}" style="color: #0b57d0; text-decoration: underline;">${escapedUrl}</a>`
      );
      linkInjected = true;
    }

    const withLineBreaks = escaped.replace(/\n/g, '<br/>');

    if (isLegalFooter) {
      return `<p style="margin: 12px 0 0 0; font-size: 12px; color: #555555;">${withLineBreaks}</p>`;
    }
    return `<p style="margin: 0 0 12px 0;">${withLineBreaks}</p>`;
  });

  return `<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #111111;">\n  ${renderedParagraphs.join('\n  ')}\n</div>`;
}

function buildCoherentSignatureBlock(params: {
  agentDisplayName: string;
  firmaReparto: string;
  agentPhoneFinal: string;
  senderEmailFinal: string;
  optOutNote: string;
}): string {
  return [
    `${params.agentDisplayName}`,
    `${params.firmaReparto} — Izzo Distribuzione S.r.l.`,
    `Tel / WhatsApp: ${params.agentPhoneFinal} — Email: ${params.senderEmailFinal}`,
    '',
    `${IZZO_LEGAL_COMPANY_LINE}`,
    `${params.optOutNote}`,
  ].join('\n');
}

function executeCombinatorialSynthesis(
  library: CachedLibrary,
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): CombinatorialEmailResult & { chosenTemplateId?: number } {
  const catCfg = resolveClusterConfig(input.categoryCluster);
  const discountFormulaLabel = `${input.baseDiscount}% + ${input.extraFirstPurchasePct}%`;
  const effectiveNetPct = Number(
    (100 - (100 - input.baseDiscount) * (1 - input.extraFirstPurchasePct / 100)).toFixed(1)
  );

  const seedCursor =
    typeof options?.deterministicSeed === 'number'
      ? { val: Math.abs(Math.floor(options.deterministicSeed)) || 1 }
      : null;

  const intel: ProspectIntelligenceSummary = composeProspectIntelligence(input, (len) =>
    pickIndex(len, seedCursor)
  );

  let chosenTemplate: ActiveEmailTemplateRecord | undefined;
  if (options?.forceTemplateCode) {
    chosenTemplate = library.templates.find(
      (t) => t.code.toUpperCase() === String(options.forceTemplateCode).toUpperCase()
    );
  }
  if (!chosenTemplate) {
    const pool =
      library.templates.length > 0 ? library.templates : buildFallbackLibrary().templates;
    chosenTemplate =
      pool[pickIndex(pool.length, seedCursor)] || buildFallbackLibrary().templates[0];
  }

  // Se nel DB fosse rimasto un vecchio template con segnaposto {LOGIN_URL}/{TEMP_PASSWORD}, usa la versione allineata Step 1
  const cleanCodeMatch = DEFAULT_EMAIL_TEMPLATES.find(
    (t) => t.code.toUpperCase() === chosenTemplate!.code.toUpperCase()
  );
  const activeBodySource =
    /\{(LOGIN_URL|OFFER_URL|SMART_CATALOG_URL|USERNAME|TEMP_PASSWORD)\}|password|username/i.test(
      chosenTemplate.bodyTemplate
    ) && cleanCodeMatch
      ? cleanCodeMatch.bodyTemplate
      : chosenTemplate.bodyTemplate;
  const activeSubjectSource =
    /credenzial|pdf|abilitazion|password|username/i.test(chosenTemplate.subjectTemplate) &&
    cleanCodeMatch
      ? cleanCodeMatch.subjectTemplate
      : chosenTemplate.subjectTemplate;

  const replacedTraces: ReplacedTokenTrace[] = [];
  const usedVariantByToken = new Map<string, string>();

  const drawTokenValue = (rawKey: string): string => {
    const key = rawKey.trim().toUpperCase();
    const tokenRec = library.tokensMap.get(key);
    if (!tokenRec || !Array.isArray(tokenRec.variants) || tokenRec.variants.length === 0) {
      return `[${key}]`;
    }
    const variants = tokenRec.variants;
    let chosen = variants[pickIndex(variants.length, seedCursor)];
    const prev = usedVariantByToken.get(key);
    if (prev && variants.length > 1 && chosen === prev) {
      chosen = variants[(variants.indexOf(chosen) + 1) % variants.length];
    }
    usedVariantByToken.set(key, chosen);
    replacedTraces.push({
      tokenKey: key,
      category: tokenRec.category,
      chosenValue: chosen,
      poolSize: variants.length,
    });
    return chosen;
  };

  const replaceDynamicTokens = (templateText: string): string => {
    return templateText.replace(/\[([A-Z0-9_]+)\]/gi, (_full, tokenKey: string) => {
      return drawTokenValue(tokenKey);
    });
  };

  const firmaReparto = drawTokenValue('REPARTO_FIRMA');
  const optOutNote = drawTokenValue('NOTA_LEGALE_OPTOUT');

  const cityClean = intel.cityClean;
  const provClean = intel.provinceClean;
  const cityLabel = cityClean
    ? `${cityClean}${provClean ? ` (${provClean})` : ''}`
    : 'la Vostra area operativa';
  const cityParen = cityClean ? ` (${cityClean})` : '';

  const rawAgentName = (input.agentName || '').trim();
  const agentDisplayName =
    !rawAgentName || rawAgentName.toLowerCase() === 'savoia.daniele'
      ? 'Daniele Savoia'
      : sanitizeExternalCopy(rawAgentName, 'Daniele Savoia');

  const rawAgentPhone = (input.agentPhone || '').trim();
  const agentPhoneFinal =
    rawAgentPhone && !rawAgentPhone.includes('0823 123456')
      ? rawAgentPhone
      : '+39 389 0129832';

  const senderEmailFinal = resolveSignatureSenderEmail(
    input.senderInboxEmail,
    input.agentEmail
  );

  const cleanOfferTitle = sanitizeExternalCopy(
    input.offerTitle,
    'Presentazione fornitore B2B e condizione primo ordine'
  );
  const cleanMinOrderText = sanitizeExternalCopy(
    input.minOrderAmountText,
    "senza minimo d'ordine"
  );
  const cleanFreeShippingText = sanitizeExternalCopy(
    input.freeShippingText,
    'spedizione tracciata in tutta Italia'
  );

  const listinoRuoloLabel = intel.isReseller ? 'Rivenditori' : 'operatori Partita IVA';
  const conditionInlineShort = intel.isReseller
    ? `listino Rivendita ${discountFormulaLabel} a cascata sul primo ordine eventuale, ${cleanMinOrderText.toLowerCase()}`
    : `sconto di benvenuto ${discountFormulaLabel} a cascata sul primo ordine eventuale, ${cleanMinOrderText.toLowerCase()}`;

  // Step 1 — Inviti discorsivi puri a rispondere alla mail (ZERO link, ZERO credenziali/password)
  const invitoRispostaProsaOptions = [
    `Se può esserVi utile per un confronto prezzi senza alcun impegno, rispondete pure con un cenno a questa mail e Vi trasmettiamo qui l’estratto del nostro listino netto riservato insieme a un accesso gratuito di consultazione, con ${conditionInlineShort}.`,
    `Qualora voleste valutare il posizionamento dei nostri prezzi netti rispetto agli attuali fornitori, basta rispondere anche con un breve «Sì» a questa comunicazione e Vi inviamo subito il prospetto PDF riservato alla Vostra categoria insieme a un profilo conoscitivo gratuito (${conditionInlineShort}).`,
    `Ove di Vostro interesse per una libera verifica tecnica ed economica, rispondendo con un cenno a questa email Vi giriamo direttamente l’estratto del catalistino netto riservato e un’abilitazione gratuita di sola lettura, già valorizzati con ${conditionInlineShort}.`,
    `Se desiderate confrontare in autonomia i nostri listini riservati alle Partite IVA (${conditionInlineShort}), rispondete pure a questa mail e provvediamo a trasmetterVi qui l’estratto PDF selezionato per il Vostro comparto insieme all’accesso gratuito di consultazione.`,
  ];
  const invitoRispostaProsa =
    invitoRispostaProsaOptions[pickIndex(invitoRispostaProsaOptions.length, seedCursor)];

  const invitoRispostaFlashOptions = [
    `Se può esserVi utile per un confronto prezzi, rispondete pure con un cenno a questa mail e Vi trasmettiamo qui l’estratto del listino netto riservato insieme a un accesso gratuito di consultazione (${conditionInlineShort}).`,
    `Per ricevere qui il prospetto PDF dei prezzi netti riservati e un accesso gratuito di sola lettura (${discountFormulaLabel} sul primo ordine eventuale, ${cleanMinOrderText.toLowerCase()}), basta rispondere con un breve «Sì» a questa mail.`,
    `Qualora voleste esaminare senza vincoli il nostro listino riservato (${conditionInlineShort}), rispondete pure con un cenno alla presente e Vi inviamo subito l’estratto PDF e l’abilitazione gratuita di consultazione.`,
  ];
  const invitoRispostaFlash =
    invitoRispostaFlashOptions[pickIndex(invitoRispostaFlashOptions.length, seedCursor)];

  const invitoRispostaPsOptions = [
    `P.S. Se può esserVi utile per un confronto prezzi senza impegno, rispondete pure con un cenno a questa mail e Vi trasmettiamo qui l’estratto del nostro listino netto riservato insieme a un accesso gratuito di consultazione (${conditionInlineShort}).`,
    `P.S. Qualora voleste verificare i nostri prezzi netti (${discountFormulaLabel} a cascata sul primo ordine eventuale, ${cleanMinOrderText.toLowerCase()}), basta rispondere anche con un semplice «Sì» a questa email per ricevere il prospetto PDF riservato e l’abilitazione conoscitiva gratuita.`,
    `P.S. Su un Vostro breve cenno di risposta a questa comunicazione, provvediamo a inviarVi qui l’estratto del catalistino netto riservato e un accesso gratuito di sola consultazione (${conditionInlineShort}).`,
  ];
  const invitoRispostaPs =
    invitoRispostaPsOptions[pickIndex(invitoRispostaPsOptions.length, seedCursor)];

  const schedaQualificaPlainStep1 = [
    `Riferimenti operativi Izzo Distribuzione S.r.l. (P.IVA 01868260629 — REA BN-309049):`,
    `- Comparto seguito per ${intel.companyClean}: ${intel.prodottiCompatti}`,
    `- Condizione riservata nuovi partner: ${conditionInlineShort}, ${cleanFreeShippingText}`,
    `- Referente commerciale diretto: ${agentDisplayName} (${agentPhoneFinal})`,
  ].join('\n');

  const resolveClientVariables = (txt: string): string => {
    const map: Record<string, string> = {
      COMPANY_NAME: intel.companyClean,
      SALUTO_PERSONALIZZATO: intel.salutoPersonalizzato,
      SALUTO_UMANO_1A1: intel.salutoUmano1a1,
      INTESTAZIONE_OGGETTO: intel.intestazioneOggetto,
      FRASE_CONTESTO_DB: intel.fraseContestoDb,
      INCISO_CONTESTO_DB: intel.incisoContestoDb,
      CONTESTO_TERRITORIO_FALLBACK: intel.contestoTerritorioFallback,
      SCENARIO_MESTIERE_SETTORE: intel.scenarioMestiereSettore,
      SCOPO_FORNITURA_SETTORE: intel.scopoFornituraSettore,
      LINEE_PRODOTTI_IZZO: intel.lineeProdottiIzzo,
      PRODOTTI_PROSA: intel.prodottiProsa,
      PRODOTTI_COMPATTI: intel.prodottiCompatti,
      PRODOTTI_MATRICE_REPARTI: intel.prodottiMatriceReparti,
      CHIUSURA_SETTORE: intel.chiusuraSettore,
      CITY: cityLabel,
      CITY_PAREN: cityParen,
      PROVINCE: provClean || 'IT',
      SECTOR_SHORT: catCfg.shortLabel,
      RECOMMENDED_FAMILY: catCfg.recommendedFamily,
      BRANDS_NOTE: intel.lineeProdottiIzzo,
      DISCOUNT_FORMULA: discountFormulaLabel,
      BASE_DISCOUNT: String(input.baseDiscount),
      EXTRA_DISCOUNT: String(input.extraFirstPurchasePct),
      NET_DISCOUNT_PCT: String(effectiveNetPct),
      LISTINO_RUOLO: listinoRuoloLabel,
      CONDIZIONE_BREVE: conditionInlineShort,
      OFFER_TITLE: cleanOfferTitle,
      MIN_ORDER_TEXT: cleanMinOrderText,
      SHIPPING_TEXT: cleanFreeShippingText,
      PAYMENT_TERMS_TEXT: sanitizeExternalCopy(
        input.paymentTermsText,
        'Condizioni B2B riservate'
      ),
      AGENT_NAME: agentDisplayName,
      AGENT_PHONE: agentPhoneFinal,
      AGENT_EMAIL: senderEmailFinal,
      INVITO_RISPOSTA_PROSA: invitoRispostaProsa,
      INVITO_RISPOSTA_FLASH: invitoRispostaFlash,
      INVITO_RISPOSTA_PS: invitoRispostaPs,
      // Compatibilità con eventuali template custom: mappati tutti all'invito umano senza link né password
      CREDENZIALI_PROSA: invitoRispostaProsa,
      CREDENZIALI_RIGA_FLASH: invitoRispostaFlash,
      CREDENZIALI_PS: invitoRispostaPs,
      CREDENZIALI_FILETTO: invitoRispostaFlash,
      SCHEDA_QUALIFICA_FORNITORE: schedaQualificaPlainStep1,
      CREDENTIALS_BLOCK: invitoRispostaProsa,
      LOGIN_URL: 'il nostro portale B2B riservato',
      OFFER_URL: 'l’estratto del catalistino riservato',
      SMART_CATALOG_URL: 'l’estratto del catalistino riservato',
      USERNAME: 'profilo riservato',
      TEMP_PASSWORD: 'abilitazione riservata',
    };

    return txt.replace(/\{([A-Z0-9_]+)\}/g, (full, varName: string) => {
      return Object.prototype.hasOwnProperty.call(map, varName) ? map[varName] : full;
    });
  };

  // Sintesi Oggetto Step 1
  const rawSubjectWithTokens = replaceDynamicTokens(activeSubjectSource);
  const resolvedSubject = polishSubjectTypography(resolveClientVariables(rawSubjectWithTokens));

  // Sintesi Corpo Step 1
  let rawBodyTemplate = activeBodySource;
  const hasAnyInviteVar =
    /\{(INVITO_RISPOSTA_PROSA|INVITO_RISPOSTA_FLASH|INVITO_RISPOSTA_PS|CREDENZIALI_PROSA|CREDENZIALI_RIGA_FLASH|CREDENZIALI_PS|CREDENZIALI_FILETTO|CREDENTIALS_BLOCK)\}|rispond/i.test(
      rawBodyTemplate
    );
  if (!hasAnyInviteVar) {
    rawBodyTemplate = `${rawBodyTemplate.trim()}\n\n{INVITO_RISPOSTA_PROSA}`;
  }

  const bodyAfterTokens = replaceDynamicTokens(rawBodyTemplate);
  const resolvedBodyCoreRaw = polishBodyTypography(resolveClientVariables(bodyAfterTokens));
  const cleanBodyCore = stripMarkdownAndForbiddenStep1Tokens(resolvedBodyCoreRaw, [
    input.username,
    input.tempPasswordPlain,
  ]);

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName,
    firmaReparto,
    agentPhoneFinal,
    senderEmailFinal,
    optOutNote,
  });

  const bodyText = `${cleanBodyCore}\n\n${signaturePlain}`;
  const bodyHtml = renderMinimalOutlookHtmlFromPlain(bodyText);

  return {
    subject: resolvedSubject,
    bodyText,
    bodyHtml,
    discountFormulaLabel,
    templateCode: chosenTemplate.code,
    templateName: chosenTemplate.name,
    angleGroup: chosenTemplate.angleGroup,
    htmlLayoutVariant: 'plain_personal',
    tokensReplacedCount: replacedTraces.length,
    replacedTokensPreview: replacedTraces,
    prospectIntelligence: {
      companyClean: intel.companyClean,
      decisionMaker: intel.decisionMakerClean,
      domain: intel.domainClean,
      areaLabel: intel.areaLabel,
      cluster: intel.cluster,
      specializations: intel.specializations,
      detectedBrands: intel.detectedBrands,
      civilBrandMatched: intel.civilBrandMatched,
      foundationYear: intel.foundationYear,
      certifications: intel.certificationsLabel,
    },
    chosenTemplateId: chosenTemplate.id,
  };
}

// ============================================================================
// SEQUENZA ANTI-SPAM A 3 TEMPI: STEP 1B ("SÌ"), STEP 2 (+5GG), STEP 3 (+5GG CALDI)
// ============================================================================

function resolveFollowupCommonContext(input: SdrSequenceFollowupInput) {
  const catCfg = resolveClusterConfig(input.categoryCluster, input.commercialCategory);
  const isRiv =
    String(input.commercialCategory || '').toUpperCase() === 'RIV' ||
    catCfg.commercialCategory === 'RIV';
  const baseDiscount =
    typeof input.baseDiscount === 'number' && input.baseDiscount > 0
      ? input.baseDiscount
      : isRiv
        ? 50
        : 40;
  const extraPct =
    typeof input.extraFirstPurchasePct === 'number' && input.extraFirstPurchasePct >= 0
      ? input.extraFirstPurchasePct
      : 10;
  const discountFormulaLabel = extraPct > 0 ? `${baseDiscount}% + ${extraPct}%` : `${baseDiscount}%`;

  const meta =
    input.richMetadata && typeof input.richMetadata === 'object'
      ? (input.richMetadata as Record<string, any>)
      : {};
  const vatOfficialName = meta.vat_official_name ? String(meta.vat_official_name) : null;
  const companyClean = cleanCompanyDisplayName(input.companyName, vatOfficialName);
  const decisionMaker = extractVerifiedDecisionMaker(
    input.decisionMaker || meta.decision_maker || null,
    input.companyName,
    vatOfficialName
  );

  const seedCursor =
    typeof input.deterministicSeed === 'number'
      ? { val: Math.abs(Math.floor(input.deterministicSeed)) || 1 }
      : input.prospectId
        ? { val: Math.abs(Math.floor(input.prospectId)) || 1 }
        : null;

  const rawOrigSubj = String(
    input.originalSubject || input.previousSubject || input.subject || ''
  ).trim();
  const strippedOrigSubj = rawOrigSubj
    .replace(/^(?:(?:re|r|fwd|fw|i)\s*:\s*)+/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/\s+/g, ' ')
    .trim();
  const replySubject = strippedOrigSubj
    ? `Re: ${strippedOrigSubj}`
    : `Re: Presentazione fornitore B2B per ${companyClean} — Izzo Distribuzione S.r.l.`;

  const rawSmartUrl = String(input.smartCatalogUrl || input.offerUrl || '').trim();
  const smartCatalogUrl = rawSmartUrl
    ? rawSmartUrl
    : input.trackingToken
      ? `https://www.izzodistribuzione.it/offerta/${encodeURIComponent(String(input.trackingToken).trim())}`
      : 'https://www.izzodistribuzione.it';

  const rawAgentName = (input.agentName || '').trim();
  const agentDisplayName =
    !rawAgentName || rawAgentName.toLowerCase() === 'savoia.daniele'
      ? 'Daniele Savoia'
      : sanitizeExternalCopy(rawAgentName, 'Daniele Savoia');

  const rawAgentPhone = (input.agentPhone || '').trim();
  const agentPhoneFinal =
    rawAgentPhone && !rawAgentPhone.includes('0823 123456')
      ? rawAgentPhone
      : '+39 389 0129832';

  const senderEmailFinal = resolveSignatureSenderEmail(
    input.senderInboxEmail,
    input.agentEmail
  );

  const minOrderClean = sanitizeExternalCopy(
    input.minOrderAmountText,
    "senza minimo d'ordine"
  ).toLowerCase();

  return {
    companyClean,
    decisionMaker,
    seedCursor,
    replySubject,
    smartCatalogUrl,
    discountFormulaLabel,
    minOrderClean,
    agentDisplayName,
    agentPhoneFinal,
    senderEmailFinal,
  };
}

/**
 * STEP 1B — Risposta automatica (dopo 15-25 min) a chi risponde "Sì" / consenso semplice.
 * Regole:
 * - Oggetto: `Re: <subject originale>`
 * - 1 SOLO link pulito (`smartCatalogUrl`) in tutta l'email
 * - ZERO parola "Password" o "Username", zero tabelle/bottoni pesanti
 * - Spiega che dalla pagina può scaricare il Catalistino PDF riservato (che contiene anche le credenziali da conservare)
 *   ed entrare con 1 clic nel portale coi prezzi netti già scontati.
 */
export function generateConsentReplyEmail(
  input: ConsentReplyEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);
  const greeting = ctx.decisionMaker
    ? `Gentile ${ctx.decisionMaker},`
    : `Gentili Referenti di ${ctx.companyClean},`;

  const variants = [
    [
      greeting,
      `Vi ringrazio per il cortese riscontro.`,
      `Come anticipato, Vi lascio qui il collegamento riservato predisposto per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Aprendo questa pagina potete entrare direttamente con 1 clic nel nostro portale B2B con i prezzi netti già calcolati (sconto di benvenuto ${ctx.discountFormulaLabel} a cascata sul primo ordine eventuale, ${ctx.minOrderClean}) e scaricare il Vostro Catalistino PDF riservato, all’interno del quale trovate stampate anche le credenziali riservate da conservare per i futuri accessi.`,
      `Per qualsiasi verifica su articoli specifici o per quotare una distinta materiali potete rispondermi direttamente a questa mail o scrivermi su WhatsApp al ${ctx.agentPhoneFinal}.`,
      `Un cordiale saluto,`,
    ],
    [
      greeting,
      `grazie per avermi risposto.`,
      `Ecco il collegamento riservato dedicato a ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Da questa pagina potete sia entrare subito con 1 clic nel catalogo completo coi Vostri prezzi netti riservati (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}), sia scaricare il Catalistino PDF personalizzato che riporta stampate al suo interno le credenziali riservate da tenere in archivio.`,
      `Resto a Vostra completa disposizione qui via mail o telefonicamente per ogni eventuale esigenza o preventivo su commessa.`,
      `Cordiali saluti,`,
    ],
    [
      greeting,
      `grazie per il riscontro. Vi trasmetto subito la pagina riservata che ho abilitato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Dal collegamento qui sopra potete accedere con 1 solo clic al portale B2B in libera consultazione (${ctx.discountFormulaLabel} a cascata sul primo ordine eventuale, ${ctx.minOrderClean}) oppure scaricare sul computer o telefono il Catalistino PDF riservato, dove trovate indicate anche le credenziali personali da conservare.`,
      `Se avete una lista materiali su cui confrontare le nostre quotazioni nette, giratemela pure in risposta quando volete.`,
      `Buon lavoro e cordiali saluti,`,
    ],
    [
      greeting,
      `Vi ringrazio per l’interesse e per il rapido cenno di risposta.`,
      `Trovate tutto pronto per ${ctx.companyClean} a questo collegamento riservato:\n${ctx.smartCatalogUrl}`,
      `Dalla pagina potete entrare immediatamente con 1 clic nel portale coi prezzi netti a Voi dedicati (${ctx.discountFormulaLabel} in cascata sul primo ordine eventuale, ${ctx.minOrderClean}) e scaricare l’estratto Catalistino in PDF, che contiene anche le credenziali riservate stampate all’interno per averle sempre a portata di mano.`,
      `Resto personalmente a disposizione ai recapiti in calce per qualsiasi approfondimento.`,
      `Distinti saluti,`,
    ],
    [
      greeting,
      `grazie del cortese riscontro. Come promesso, ecco l’accesso riservato predisposto per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Aprendo il collegamento potete consultare subito con 1 clic l’intero portale B2B valorizzato al netto (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}) e scaricare il Catalistino PDF dedicato, nel quale sono riportate anche le credenziali riservate da conservare per le prossime consultazioni.`,
      `Per qualsiasi necessità o quotazione dedicata potete rispondermi direttamente qui.`,
      `Un cordiale saluto,`,
    ],
  ];

  const vIdx = pickIndex(variants.length, ctx.seedCursor);
  const chosenParagraphs = variants[vIdx];

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName: ctx.agentDisplayName,
    firmaReparto: 'Referente commerciale B2B',
    agentPhoneFinal: ctx.agentPhoneFinal,
    senderEmailFinal: ctx.senderEmailFinal,
    optOutNote: DEFAULT_OPTOUT_B2B_NOTE,
  });

  const bodyText = `${chosenParagraphs.join('\n\n')}\n\n${signaturePlain}`
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato');

  const bodyHtml = renderMinimalOutlookHtmlFromPlain(bodyText, {
    singleAllowedUrl: ctx.smartCatalogUrl,
  });

  return {
    subject: ctx.replySubject,
    bodyText,
    bodyHtml,
    sequenceStep: 10,
    templateCode: `STEP1B_CONSENT_V${vIdx + 1}`,
    discountFormulaLabel: ctx.discountFormulaLabel,
  };
}

/**
 * STEP 2 — Follow-up sobrio a Giorno +5 se il prospect non ha risposto allo Step 1.
 * Regole:
 * - Oggetto: `Re: <subject originale>`
 * - 1 SOLO link pulito (`smartCatalogUrl`), zero insistenza
 * - ZERO parola "Password" o "Username", zero tabelle/bottoni pesanti
 */
export function generateStep2FollowupEmail(
  input: Step2FollowupEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);
  const greeting = ctx.decisionMaker
    ? `Gentile ${ctx.decisionMaker},`
    : `Gentili Referenti di ${ctx.companyClean},`;

  const variants = [
    [
      greeting,
      `riprendo brevemente la mia comunicazione di qualche giorno fa solo per evitarVi perdite di tempo in passaggi intermedi.`,
      `Qualora in occasione di prossime forniture voleste verificare in autonomia e senza alcun impegno i nostri listini netti B2B (${ctx.discountFormulaLabel} a cascata sul primo ordine eventuale, ${ctx.minOrderClean}), Vi lascio direttamente qui il collegamento riservato predisposto per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Da questa pagina potete entrare con 1 clic nel portale oppure scaricare il Catalistino PDF riservato, che riporta all’interno anche le credenziali di consultazione da conservare in archivio.`,
      `Resto a disposizione per eventuali quotazioni su distinta materiali e Vi auguro buon lavoro.`,
      `Cordiali saluti,`,
    ],
    [
      greeting,
      `mi permetto una sola breve nota a completamento della precedente email inviata a ${ctx.companyClean}.`,
      `Per consentirVi di tenere agli atti i nostri riferimenti senza dover rispondere se siete impegnati in cantiere o in ufficio, Vi lascio direttamente il collegamento riservato di consultazione (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}):\n${ctx.smartCatalogUrl}`,
      `Aprendo il collegamento potete consultare subito con 1 clic i prezzi netti a portale o scaricare il Catalistino PDF dedicato con le credenziali riservate stampate all’interno.`,
      `Un cordiale saluto,`,
    ],
    [
      greeting,
      `riprendo sinteticamente la mia precedente presentazione di Izzo Distribuzione S.r.l. solo per lasciarVi a disposizione diretta il prospetto riservato a ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Senza alcuna formalità né vincolo commerciale, da quella pagina potete scaricare l’estratto del Catalistino PDF (comprensivo delle credenziali da conservare) ed entrare con 1 clic nell’area B2B già configurata con lo sconto ${ctx.discountFormulaLabel} a cascata sul primo ordine eventuale, ${ctx.minOrderClean}.`,
      `Per qualsiasi confronto futuro resto raggiungibile ai recapiti qui sotto.`,
      `Distinti saluti,`,
    ],
    [
      greeting,
      `a integrazione della mia nota precedente, e per evitarVi qualsiasi perdita di tempo, Vi trasmetto direttamente il collegamento riservato predisposto per l’ufficio acquisti di ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Potrete utilizzarlo liberamente quando Vi sarà più comodo per scaricare il Catalistino PDF coi prezzi netti (che include le credenziali riservate da archiviare) o accedere con 1 clic al portale B2B completo (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}).`,
      `Cordialmente,`,
    ],
    [
      greeting,
      `Vi scrivo un’ultima breve riga in coda alla precedente comunicazione per lasciarVi direttamente il riferimento operativo preparato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Dal collegamento potete entrare con 1 clic nel catalogo B2B coi prezzi netti riservati (${ctx.discountFormulaLabel} in cascata sul primo ordine eventuale, ${ctx.minOrderClean}) oppure salvare il Catalistino PDF che riporta all’interno anche le credenziali riservate di consultazione.`,
      `Rimanendo a disposizione anche per preventivi rapidi su distinta materiali, porgo cordiali saluti.`,
    ],
    [
      greeting,
      `riprendo brevemente la mia precedente mail unicamente per lasciarVi agli atti l’accesso conoscitivo gratuito di Izzo Distribuzione S.r.l. dedicato a ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
      `Quando avrete necessità di confrontare disponibilità e quotazioni nette (${ctx.discountFormulaLabel} a cascata sul primo ordine eventuale, ${ctx.minOrderClean}), da quella pagina potrete entrare con 1 clic nel portale o scaricare il Catalistino PDF completo delle credenziali da conservare.`,
      `Un cordiale saluto e buon lavoro,`,
    ],
  ];

  const vIdx = pickIndex(variants.length, ctx.seedCursor);
  const chosenParagraphs = variants[vIdx];

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName: ctx.agentDisplayName,
    firmaReparto: 'Referente commerciale B2B',
    agentPhoneFinal: ctx.agentPhoneFinal,
    senderEmailFinal: ctx.senderEmailFinal,
    optOutNote: DEFAULT_OPTOUT_B2B_NOTE,
  });

  const bodyText = `${chosenParagraphs.join('\n\n')}\n\n${signaturePlain}`
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato');

  const bodyHtml = renderMinimalOutlookHtmlFromPlain(bodyText, {
    singleAllowedUrl: ctx.smartCatalogUrl,
  });

  return {
    subject: ctx.replySubject,
    bodyText,
    bodyHtml,
    sequenceStep: 2,
    templateCode: `STEP2_FOLLOWUP_V${vIdx + 1}`,
    discountFormulaLabel: ctx.discountFormulaLabel,
  };
}

/**
 * STEP 3 — Brevissima nota cortese 1-a-1 a Giorno +5 SOLO per i Lead Caldi che hanno aperto
 * davvero il PDF/Portale ma non hanno ancora ordinato né sono stati chiamati dall'agente.
 * Regole:
 * - ZERO link cliccabili (0 http/https/<a href>)
 * - ZERO parola "Password" o "Username"
 * - Stop definitivo agli invii automatici dopo questo messaggio.
 */
export function generateStep3WarmFollowupEmail(
  input: Step3WarmFollowupEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);
  const greeting = ctx.decisionMaker
    ? `Buongiorno ${ctx.decisionMaker},`
    : `Buongiorno ai Referenti di ${ctx.companyClean},`;

  const variants = [
    [
      greeting,
      `Vi lascio solo un brevissimo saluto personale a chiusura dei riferimenti inviati nei giorni scorsi per ${ctx.companyClean}.`,
      `Se per una commessa in corso o per il magazzino può esserVi utile mettere alla prova i nostri prezzi netti su una distinta materiali specifica, potete rispondermi direttamente a questa mail (o su WhatsApp al ${ctx.agentPhoneFinal}) e Vi preparo personalmente una quotazione dedicata senza impegno.`,
      `Non invierò ulteriori messaggi automatici: conservate pure i miei recapiti per qualsiasi futura esigenza.`,
      `Buon lavoro e cordiali saluti,`,
    ],
    [
      greeting,
      `Vi scrivo un’ultima nota molto rapida per non arrecare alcun disturbo operativo a ${ctx.companyClean}.`,
      `Qualora voleste verificare la nostra competitività su specifici codici ad alta rotazione o su un computo materiali, rispondete pure a questa mail con l’elenco articoli e Vi rispondo personalmente in giornata con la migliore offerta riservata (${ctx.discountFormulaLabel} sul primo ordine eventuale, ${ctx.minOrderClean}).`,
      `Chiudo qui i ricontatti automatici e resto semplicemente a Vostra disposizione per il futuro.`,
      `Un cordiale saluto,`,
    ],
    [
      greeting,
      `chiudo con questa brevissima comunicazione il nostro contatto informativo per ${ctx.companyClean}, così da non intasare la Vostra casella.`,
      `Se in occasione dei prossimi acquisti aveste piacere di confrontare una quotazione su misura su una Vostra lista materiali, basta rispondere a questa email o contattarmi al ${ctx.agentPhoneFinal}.`,
      `Grazie per l’attenzione e buon proseguimento di lavoro,`,
    ],
    [
      greeting,
      `mi permetto un solo saluto conclusivo in merito alla presentazione di Izzo Distribuzione S.r.l. inviata a ${ctx.companyClean}.`,
      `Resto a Vostra completa disposizione qualora voleste sottopormi in risposta una distinta articoli di prova per verificare sul concreto servizio e prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}). Non seguiranno altre comunicazioni automatiche.`,
      `Cordiali saluti,`,
    ],
    [
      greeting,
      `Vi lascio un ultimo sintetico riferimento personale per ${ctx.companyClean} prima di archiviare la pratica senza ulteriori solleciti.`,
      `Se aveste bisogno di quotare rapidamente una lista materiali elettrica, LED, fissaggio o utensileria per un confronto diretto coi Vostri attuali fornitori, rispondete pure quando volete a questa mail e me ne occupo personalmente.`,
      `Un cordiale saluto,`,
    ],
  ];

  const vIdx = pickIndex(variants.length, ctx.seedCursor);
  const chosenParagraphs = variants[vIdx];

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName: ctx.agentDisplayName,
    firmaReparto: 'Referente commerciale B2B',
    agentPhoneFinal: ctx.agentPhoneFinal,
    senderEmailFinal: ctx.senderEmailFinal,
    optOutNote: DEFAULT_OPTOUT_B2B_NOTE,
  });

  const cleanBodyCore = stripMarkdownAndForbiddenStep1Tokens(
    chosenParagraphs.join('\n\n')
  );
  const cleanText = `${cleanBodyCore}\n\n${signaturePlain}`;
  const bodyHtml = renderMinimalOutlookHtmlFromPlain(cleanText);

  return {
    subject: ctx.replySubject,
    bodyText: cleanText,
    bodyHtml,
    sequenceStep: 3,
    templateCode: `STEP3_WARM_V${vIdx + 1}`,
    discountFormulaLabel: ctx.discountFormulaLabel,
  };
}

// ============================================================================
// CANTIERE 7: MOTORE EMAIL GIRI SUCCESSIVI 90+ GIORNI (LOOP TRIMESTRALE V01..V16)
// ============================================================================

interface QuarterlyLoopRenderVars {
  greeting: string;
  companyClean: string;
  areaLabel: string;
  sectorNoun: string;
  specClause: string;
  compatClause: string;
  prodottiCompatti: string;
  prodottiProsa: string;
  discountFormulaLabel: string;
  minOrderClean: string;
  roleDiscountLabel: string;
  smartCatalogUrl: string;
  agentPhoneFinal: string;
  cycleNumber: number;
}

interface InternalQuarterlyLoopTemplate extends QuarterlyLoopTemplateDef {
  buildParagraphs: (v: QuarterlyLoopRenderVars) => string[];
}

export const QUARTERLY_LOOP_TEMPLATES: readonly QuarterlyLoopTemplateDef[] = [
  {
    code: 'LOOP_Q_V01',
    name: 'Aggiornamento disponibilità magazzino pronta consegna',
    angleGroup: 'STOCK_PRONTA_CONSEGNA',
  },
  {
    code: 'LOOP_Q_V02',
    name: 'Allineamento trimestrale scorte deposito centrale per urgenze cantiere',
    angleGroup: 'STOCK_PRONTA_CONSEGNA',
  },
  {
    code: 'LOOP_Q_V03',
    name: 'Disponibilità aggiornata codici ad alta rotazione di comparto',
    angleGroup: 'STOCK_PRONTA_CONSEGNA',
  },
  {
    code: 'LOOP_Q_V04',
    name: 'Quotazioni comparative rapide su distinta materiali o capitolato',
    angleGroup: 'QUOTAZIONE_CAPITOLATO',
  },
  {
    code: 'LOOP_Q_V05',
    name: 'Supporto ufficio preventivi B2B per commesse e computi metrici',
    angleGroup: 'QUOTAZIONE_CAPITOLATO',
  },
  {
    code: 'LOOP_Q_V06',
    name: 'Confronto prezzi netti senza impegno su liste articoli ricorrenti',
    angleGroup: 'QUOTAZIONE_CAPITOLATO',
  },
  {
    code: 'LOOP_Q_V07',
    name: 'Riassortimento periodico di reparto e scorta operativa trimestrale',
    angleGroup: 'RIASSORTIMENTO_STAGIONALE',
  },
  {
    code: 'LOOP_Q_V08',
    name: 'Pianificazione approvvigionamenti di reparto senza vincoli di lotto',
    angleGroup: 'RIASSORTIMENTO_STAGIONALE',
  },
  {
    code: 'LOOP_Q_V09',
    name: 'Secondo fornitore B2B indipendente senza minimo d’ordine',
    angleGroup: 'SECONDO_FORNITORE_LIBERO',
  },
  {
    code: 'LOOP_Q_V10',
    name: 'Canale B2B alternativo per coprire rotture di stock e integrazioni',
    angleGroup: 'SECONDO_FORNITORE_LIBERO',
  },
  {
    code: 'LOOP_Q_V11',
    name: 'Affiancamento forniture dirette a margine protetto per Partite IVA',
    angleGroup: 'SECONDO_FORNITORE_LIBERO',
  },
  {
    code: 'LOOP_Q_V12',
    name: 'Revisione trimestrale Catalistino PDF netto riservato',
    angleGroup: 'CATALISTINO_NETTO_AGGIORNATO',
  },
  {
    code: 'LOOP_Q_V13',
    name: 'Aggiornamento prospetto prezzi netti B2B per ufficio acquisti',
    angleGroup: 'CATALISTINO_NETTO_AGGIORNATO',
  },
  {
    code: 'LOOP_Q_V14',
    name: 'Nuovo estratto Catalistino PDF aggiornato d’archivio con ingresso 1-clic',
    angleGroup: 'CATALISTINO_NETTO_AGGIORNATO',
  },
  {
    code: 'LOOP_Q_V15',
    name: 'Focus compatibilità installativa e linee tecniche dedicate',
    angleGroup: 'COMPATIBILITA_MARCHI_REPARTI',
  },
  {
    code: 'LOOP_Q_V16',
    name: 'Panoramica aggiornata reparti serie civile, LED, quadristica e utensileria',
    angleGroup: 'COMPATIBILITA_MARCHI_REPARTI',
  },
] as const;

const INTERNAL_QUARTERLY_LOOP_TEMPLATES: readonly InternalQuarterlyLoopTemplate[] = [
  {
    ...QUARTERLY_LOOP_TEMPLATES[0],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di qualche mese dalla nostra precedente comunicazione, Vi scrivo una breve nota di aggiornamento sulle disponibilità attuali a deposito centrale per ${v.companyClean}${v.specClause}.`,
      `Abbiamo appena allineato il Vostro Catalistino PDF aggiornato con le giacenze in pronta consegna e i prezzi netti attuali sulle linee ${v.prodottiCompatti}:\n${v.smartCatalogUrl}`,
      `Aprendo il collegamento potete consultare con 1 clic il portale B2B o scaricare il Catalistino PDF aggiornato, all’interno del quale trovate stampate anche le Vostre credenziali riservate da conservare e la condizione di benvenuto ${v.discountFormulaLabel} a cascata sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Resto a disposizione senza alcun impegno anche per verifiche puntuali di disponibilità e Vi auguro buon lavoro.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[1],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo con discrezione i riferimenti inviati nei mesi scorsi a ${v.companyClean} solo per segnalarVi l’aggiornamento trimestrale delle scorte disponibili nel nostro deposito principale per gli operatori su ${v.areaLabel}.`,
      `Al collegamento riservato qui sotto trovate il Catalistino PDF aggiornato coi prezzi netti attuali e le disponibilità effettive su ${v.prodottiCompatti}:\n${v.smartCatalogUrl}`,
      `Dalla pagina potete entrare direttamente con 1 clic nel catalogo B2B oppure salvare il PDF aggiornato, che riporta stampate al suo interno anche le credenziali riservate per i futuri accessi e mantiene attivo il ${v.roleDiscountLabel} ${v.discountFormulaLabel} sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Per qualsiasi urgenza di cantiere o magazzino potete rispondermi direttamente a questa email.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[2],
    buildParagraphs: (v) => [
      v.greeting,
      `a qualche mese dal nostro ultimo contatto informativo, aggiorno sinteticamente l’ufficio acquisti di ${v.companyClean} sulle referenze ad alta rotazione oggi disponibili a magazzino per il comparto ${v.sectorNoun}.`,
      `Ho rigenerato per Voi il Catalistino PDF aggiornato con giacenze e quotazioni nette attuali (${v.prodottiCompatti}), consultabile direttamente da qui:\n${v.smartCatalogUrl}`,
      `All’interno del PDF aggiornato trovate sempre indicate le Vostre credenziali riservate da tenere in archivio, oltre all’ingresso diretto con 1 clic e allo sconto di benvenuto ${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Resto volentieri a disposizione ai recapiti in calce e porgo distinti saluti.`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[3],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo sobriamente la corrispondenza dei mesi scorsi con ${v.companyClean} in vista delle nuove commesse del trimestre su ${v.areaLabel}${v.specClause}.`,
      `Qualora aveste una distinta materiali o un capitolato da confrontare senza impegno sui reparti ${v.prodottiCompatti}, potete rispondermi direttamente a questa mail oppure consultare il Vostro Catalistino PDF aggiornato coi prezzi netti attuali:\n${v.smartCatalogUrl}`,
      `Dalla pagina riservata potete accedere con 1 clic al portale B2B e scaricare il PDF aggiornato, nel quale sono riportate anche le Vostre credenziali riservate e lo sconto di benvenuto ${v.discountFormulaLabel} a cascata valido sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Per preventivi rapidi fuori listino resto raggiungibile anche al ${v.agentPhoneFinal}.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[4],
    buildParagraphs: (v) => [
      v.greeting,
      `dopo alcuni mesi dalle precedenti comunicazioni, lascio un sintetico aggiornamento operativo alla struttura tecnica e acquisti di ${v.companyClean}.`,
      `Il nostro ufficio preventivi B2B è a disposizione per quotazioni comparative in giornata su computi e liste materiali di ${v.sectorNoun}; nel frattempo trovate qui il Catalistino PDF aggiornato con disponibilità e prezzi netti attuali:\n${v.smartCatalogUrl}`,
      `Scaricando il PDF aggiornato avrete sottomano sia il listino netto revisionato sia le Vostre credenziali riservate stampate all’interno, con facoltà di ingresso 1-clic e ${v.roleDiscountLabel} ${v.discountFormulaLabel} sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Buon lavoro e un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[5],
    buildParagraphs: (v) => [
      v.greeting,
      `mi permetto un breve contatto trimestrale in coda ai riferimenti trasmessi nei mesi passati a ${v.companyClean}.`,
      `Se desiderate verificare il posizionamento economico attuale di Izzo Distribuzione S.r.l. rispetto ai fornitori abituali su ${v.prodottiCompatti}, abbiamo predisposto il nuovo Catalistino PDF aggiornato coi prezzi netti riservati:\n${v.smartCatalogUrl}`,
      `All’interno del documento PDF trovate conservate anche le Vostre credenziali riservate (oltre all’accesso immediato con 1 clic dalla pagina) con la condizione di benvenuto ${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}. Se preferite inviare una lista codici in risposta, la quotiamo noi senza alcun vincolo.`,
      `Distinti saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[6],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di oltre un trimestre dal precedente invio, aggiorno con piacere ${v.companyClean} per i riassortimenti periodici di reparto e scorta operativa.`,
      `Abbiamo pubblicato il Vostro Catalistino PDF aggiornato con le disponibilità attuali e i prezzi netti revisionati sulle famiglie ${v.prodottiCompatti}:\n${v.smartCatalogUrl}`,
      `Aprendo il collegamento potete entrare con 1 clic nel portale o scaricare il Catalistino PDF aggiornato, dove ritrovate stampate anche le Vostre credenziali riservate e lo sconto di benvenuto ${v.discountFormulaLabel} a cascata sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Resto a completa disposizione per ogni approfondimento e Vi auguro buon proseguimento.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[7],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo brevemente il filo delle comunicazioni inviate nei mesi scorsi a ${v.companyClean} per trasmetterVi l’aggiornamento periodico dedicato alla programmazione acquisti di ${v.sectorNoun}.`,
      `Trovate qui il Catalistino PDF aggiornato con giacenze reali e prezzi netti attuali su ${v.prodottiCompatti}, ordinabili liberamente anche a confezione singola senza vincoli di lotto:\n${v.smartCatalogUrl}`,
      `Nel PDF aggiornato sono riportate anche le Vostre credenziali riservate da archiviare, insieme all’accesso rapido con 1 clic e al ${v.roleDiscountLabel} ${v.discountFormulaLabel} sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[8],
    buildParagraphs: (v) => [
      v.greeting,
      `dopo qualche mese dal nostro precedente messaggio, lascio un breve promemoria operativo per ${v.companyClean} quale secondo fornitore B2B indipendente a supporto dei canali che utilizzate abitualmente su ${v.areaLabel}.`,
      `Per consentirVi un confronto immediato su disponibilità e prezzi netti attuali (${v.prodottiCompatti}), abbiamo aggiornato il Vostro Catalistino PDF riservato a questo collegamento:\n${v.smartCatalogUrl}`,
      `Dalla pagina potete consultare con 1 clic l’intero portale oppure scaricare il PDF aggiornato, che contiene stampate al suo interno anche le Vostre credenziali riservate e conferma lo sconto di benvenuto ${v.discountFormulaLabel} a cascata sul primo eventuale ordine, ${v.minOrderClean}.`,
      `Cordialmente,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[9],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo con sobrietà i riferimenti condivisi nei mesi scorsi con ${v.companyClean}: spesso avere già attivo un fornitore B2B alternativo senza obblighi di minimo si rivela prezioso per coprire rotture di stock o richieste improvvise.`,
      `A questo collegamento trovate il Catalistino PDF aggiornato con le disponibilità attuali a deposito e i prezzi netti riservati su ${v.prodottiCompatti}:\n${v.smartCatalogUrl}`,
      `All’interno del PDF aggiornato trovate anche le Vostre credenziali riservate pronte all’uso (oltre all’ingresso con 1 clic dalla pagina) e la condizione di benvenuto ${v.discountFormulaLabel} a cascata sul primo acquisto eventuale, ${v.minOrderClean}.`,
      `Resto a disposizione ai recapiti qui sotto e porgo cordiali saluti.`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[10],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di alcuni mesi dalla nostra presentazione a ${v.companyClean}, Vi rinnovo in modo sintetico i nostri riferimenti di distribuzione diretta riservata esclusivamente agli operatori con Partita IVA.`,
      `Abbiamo appena aggiornato il Catalistino PDF dedicato alla Vostra categoria con i prezzi netti attuali e le scorte disponibili sulle linee ${v.prodottiCompatti}:\n${v.smartCatalogUrl}`,
      `Dal collegamento potete accedere in 1 clic al listino completo o salvare il Catalistino PDF aggiornato, dove sono indicate anche le Vostre credenziali riservate e resta valido il ${v.roleDiscountLabel} ${v.discountFormulaLabel} sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Buon lavoro e distinti saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[11],
    buildParagraphs: (v) => [
      v.greeting,
      `facendo seguito con discrezione alle comunicazioni dei mesi precedenti, trasmetto a ${v.companyClean} la revisione trimestrale del Catalistino PDF riservato con disponibilità e listini netti allineati ad oggi.`,
      `Potete visionare il prospetto aggiornato per il comparto ${v.sectorNoun} (${v.prodottiCompatti}) direttamente da questa pagina riservata:\n${v.smartCatalogUrl}`,
      `Aprendo la pagina avrete l’accesso 1-clic al portale B2B e il download del Catalistino PDF aggiornato, all’interno del quale sono riportate anche le Vostre credenziali riservate e lo sconto di benvenuto ${v.discountFormulaLabel} a cascata sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[12],
    buildParagraphs: (v) => [
      v.greeting,
      `a qualche mese dal precedente aggiornamento, condivido con l’ufficio acquisti di ${v.companyClean} il prospetto prezzi netti B2B aggiornato per il trimestre in corso.`,
      `Il nuovo Catalistino PDF aggiornato con giacenze e quotazioni nette riservate su ${v.prodottiCompatti} è disponibile senza alcuna formalità a questo collegamento:\n${v.smartCatalogUrl}`,
      `Ricordo che all’interno del PDF aggiornato trovate stampate anche le Vostre credenziali riservate per le consultazioni successive, con ingresso diretto 1-clic e condizione di benvenuto ${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Resto personalmente a disposizione per qualsiasi confronto tecnico o commerciale.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[13],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo brevemente il contatto informativo dei mesi scorsi con ${v.companyClean} unicamente per lasciarVi in archivio l’edizione aggiornata del nostro Catalistino PDF netto riservato.`,
      `Trovate disponibilità attuali e prezzi già scontati sulle famiglie ${v.prodottiCompatti} a questo indirizzo riservato:\n${v.smartCatalogUrl}`,
      `Scaricando il PDF aggiornato ritrovate all’interno anche le Vostre credenziali riservate di consultazione (oltre al tasto di ingresso 1-clic al portale B2B) con il ${v.roleDiscountLabel} ${v.discountFormulaLabel} sempre valido sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Distinti saluti e buon lavoro,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[14],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di qualche mese dalla nostra precedente nota per ${v.companyClean}, Vi segnalo l’aggiornamento tecnico ed economico sulle nostre linee ${v.prodottiCompatti}${v.compatClause}.`,
      `Abbiamo rigenerato il Catalistino PDF aggiornato coi prezzi netti attuali e le disponibilità effettive a magazzino, consultabile qui:\n${v.smartCatalogUrl}`,
      `Dalla pagina potete entrare subito con 1 clic nel portale B2B oppure scaricare il Catalistino PDF aggiornato, che riporta all’interno anche le Vostre credenziali riservate e lo sconto di benvenuto ${v.discountFormulaLabel} a cascata sul primo ordine eventuale, ${v.minOrderClean}.`,
      `Per schede tecniche o quotazioni dedicate potete rispondermi direttamente a questa mail.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[15],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo con garbo le comunicazioni dei mesi scorsi verso ${v.companyClean} per aggiornarVi sull’assortimento attuale dedicato agli operatori su ${v.areaLabel}: ${v.prodottiProsa}.`,
      `Potete verificare prezzi netti aggiornati e disponibilità attuali aprendo il Vostro Catalistino PDF aggiornato da questo collegamento riservato:\n${v.smartCatalogUrl}`,
      `All’interno del PDF trovate stampate anche le Vostre credenziali riservate da conservare, l’ingresso immediato con 1 clic al portale e la condizione di benvenuto ${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Resto a disposizione ai recapiti in calce e Vi auguro buon lavoro.`,
      `Cordiali saluti,`,
    ],
  },
];

function sanitizeLoopInlineFragment(raw?: string | null): string {
  return String(raw || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(→])\*([^*\n]+)\*(?=[\s.,;:)!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/[^\s<)"']+/gi, '')
    .replace(/(?<![@.-])\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<)"']*)?/gi, '')
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

/**
 * LOOP TRIMESTRALE (Giri N >= 2, dopo almeno 90 giorni di silenzio e vergini esaurite).
 * Regole tassative:
 * - 16 varianti esecutive distinte (`LOOP_Q_V01` .. `LOOP_Q_V16`) su 6 tagli commerciali
 * - Anti-ripetizione matematica tramite `usedLoopTemplateCodes` (esclude tutti i già usati; dopo 16+ giri riparte escludendo l'ultimo usato)
 * - Oggetto: `Re: <originalSubject pulito da doppi Re:>`
 * - 1 SOLO link pulito (`smartCatalogUrl`) in tutta l'email
 * - ZERO parola "Password" o "Username", ZERO tabelle/bottoni pesanti
 * - Firma 100% allineata alla casella Aruba mittente (`senderInboxEmail`) + dati legali completi + nota STOP
 */
export function generateQuarterlyLoopEmail(
  input: QuarterlyLoopEmailInput
): QuarterlyLoopEmailOutput {
  const ctx = resolveFollowupCommonContext(input);
  const resolvedCycle = Math.max(
    2,
    Math.floor(Number(input.cycleNumber ?? input.outreachCycle ?? 2) || 2)
  );

  const rawBaseSeed =
    typeof input.deterministicSeed === 'number'
      ? Math.abs(Math.floor(input.deterministicSeed)) || 1
      : input.prospectId
        ? Math.abs(Math.floor(input.prospectId)) || 1
        : null;

  const normalizedUsed: string[] = Array.isArray(input.usedLoopTemplateCodes)
    ? input.usedLoopTemplateCodes
        .map((c) => String(c || '').trim().toUpperCase())
        .filter((c) => /^LOOP_Q_V\d{2}$/.test(c))
    : [];
  const usedSet = new Set<string>(normalizedUsed);

  const cycleSeedCursor =
    rawBaseSeed !== null
      ? {
          val:
            (((rawBaseSeed * 2654435761) ^
              (resolvedCycle * 40503) ^
              (normalizedUsed.length * 12289)) >>>
              0) || 1,
        }
      : null;

  const catCfg = resolveClusterConfig(input.categoryCluster, input.commercialCategory);
  const isRiv =
    String(input.commercialCategory || '').toUpperCase() === 'RIV' ||
    catCfg.commercialCategory === 'RIV';
  const baseDiscountNum =
    typeof input.baseDiscount === 'number' && input.baseDiscount > 0
      ? input.baseDiscount
      : isRiv
        ? 50
        : 40;
  const extraPctNum =
    typeof input.extraFirstPurchasePct === 'number' && input.extraFirstPurchasePct >= 0
      ? input.extraFirstPurchasePct
      : 10;

  const intel = composeProspectIntelligence(
    {
      prospectId: Number(input.prospectId || 0),
      companyName: input.companyName,
      city: input.city ?? null,
      province: input.province ?? null,
      region: input.region ?? null,
      website: input.website ?? null,
      atecoCode: input.atecoCode ?? null,
      categoryCluster: input.categoryCluster ?? catCfg.cluster,
      brandsDetected: input.brandsDetected ?? null,
      decisionMaker: input.decisionMaker ?? null,
      richMetadata: input.richMetadata ?? null,
      baseDiscount: baseDiscountNum,
      extraFirstPurchasePct: extraPctNum,
      offerTitle: input.offerTitle || 'Aggiornamento Catalistino B2B riservato',
      minOrderAmountText: input.minOrderAmountText || "senza minimo d'ordine",
      freeShippingText: input.freeShippingText || 'spedizione tracciata in tutta Italia',
      paymentTermsText: input.paymentTermsText || 'Condizioni B2B riservate',
      smartCatalogUrl: ctx.smartCatalogUrl,
      agentName: ctx.agentDisplayName,
      agentCode: '003',
      agentEmail: ctx.senderEmailFinal,
      agentPhone: ctx.agentPhoneFinal,
      senderInboxEmail: input.senderInboxEmail ?? ctx.senderEmailFinal,
      sequenceStep: 20,
    },
    (len) => pickIndex(len, cycleSeedCursor)
  );

  // Selezione template con anti-ripetizione matematica
  let chosenTpl: InternalQuarterlyLoopTemplate | undefined;
  const forcedCode = String(input.forceTemplateCode || '').trim().toUpperCase();
  if (forcedCode) {
    chosenTpl = INTERNAL_QUARTERLY_LOOP_TEMPLATES.find((t) => t.code === forcedCode);
  }

  if (!chosenTpl) {
    let candidates = INTERNAL_QUARTERLY_LOOP_TEMPLATES.filter(
      (t) => !usedSet.has(t.code)
    );
    if (candidates.length === 0) {
      const lastUsedCode = normalizedUsed[normalizedUsed.length - 1] || '';
      candidates = INTERNAL_QUARTERLY_LOOP_TEMPLATES.filter(
        (t) => t.code !== lastUsedCode
      );
      if (candidates.length === 0) {
        candidates = [...INTERNAL_QUARTERLY_LOOP_TEMPLATES];
      }
    }
    const chosenIdx = pickIndex(candidates.length, cycleSeedCursor);
    chosenTpl = candidates[chosenIdx] || INTERNAL_QUARTERLY_LOOP_TEMPLATES[0];
  }

  const companySafe = sanitizeLoopInlineFragment(intel.companyClean) || 'Vostra Azienda';
  const dmSafe = intel.decisionMakerClean
    ? sanitizeLoopInlineFragment(intel.decisionMakerClean)
    : null;
  const greeting = dmSafe
    ? `Gentile ${dmSafe},`
    : `Gentili Referenti di ${companySafe},`;

  const specClean = intel.specializationsLabel
    ? sanitizeLoopInlineFragment(intel.specializationsLabel)
    : '';
  const specClause = specClean ? ` nei comparti ${specClean}` : '';

  const compatClause = intel.civilBrandMatched
    ? ` (pienamente compatibili anche con gli standard installativi ${sanitizeLoopInlineFragment(intel.civilBrandMatched)} già in uso nelle Vostre commesse)`
    : ' (compatibili coi principali standard installativi del mercato italiano)';

  const renderVars: QuarterlyLoopRenderVars = {
    greeting,
    companyClean: companySafe,
    areaLabel: sanitizeLoopInlineFragment(intel.areaLabel) || 'il territorio nazionale',
    sectorNoun: sanitizeLoopInlineFragment(intel.sectorNoun) || 'fornitura tecnica B2B',
    specClause,
    compatClause,
    prodottiCompatti: sanitizeLoopInlineFragment(intel.prodottiCompatti),
    prodottiProsa: sanitizeLoopInlineFragment(intel.prodottiProsa),
    discountFormulaLabel: ctx.discountFormulaLabel,
    minOrderClean: sanitizeLoopInlineFragment(ctx.minOrderClean) || "senza minimo d'ordine",
    roleDiscountLabel: intel.isReseller
      ? 'listino Rivendita con sconto di benvenuto'
      : 'sconto di benvenuto',
    smartCatalogUrl: ctx.smartCatalogUrl,
    agentPhoneFinal: ctx.agentPhoneFinal,
    cycleNumber: resolvedCycle,
  };

  const rawParagraphs = chosenTpl.buildParagraphs(renderVars);

  // Garantisce che nessun paragrafo (eccetto la riga con smartCatalogUrl) contenga link accidentali o parole vietate
  const urlSentinel = '__SINGLE_ALLOWED_SMART_CATALOG_URL__';
  const sanitizedCore = polishBodyTypography(
    rawParagraphs
      .join('\n\n')
      .split(ctx.smartCatalogUrl)
      .join(urlSentinel)
      .replace(/https?:\/\/[^\s<)"']+/gi, '')
      .replace(/(?<![@.-])\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<)"']*)?/gi, '')
      .replace(/\bpassword\b/gi, 'chiave riservata')
      .replace(/\busername\b/gi, 'profilo riservato')
      .split(urlSentinel)
      .join(ctx.smartCatalogUrl)
  );

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName: ctx.agentDisplayName,
    firmaReparto: 'Referente commerciale B2B',
    agentPhoneFinal: ctx.agentPhoneFinal,
    senderEmailFinal: ctx.senderEmailFinal,
    optOutNote: DEFAULT_OPTOUT_B2B_NOTE,
  });

  const bodyText = `${sanitizedCore}\n\n${signaturePlain}`
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato');

  const bodyHtml = renderMinimalOutlookHtmlFromPlain(bodyText, {
    singleAllowedUrl: ctx.smartCatalogUrl,
  });

  const updatedUsedLoopTemplateCodes = normalizedUsed.includes(chosenTpl.code)
    ? [...normalizedUsed, chosenTpl.code]
    : [...normalizedUsed, chosenTpl.code];

  return {
    subject: ctx.replySubject,
    bodyText,
    bodyHtml,
    sequenceStep: 20,
    cycleNumber: resolvedCycle,
    templateCode: chosenTpl.code,
    templateName: chosenTpl.name,
    angleGroup: chosenTpl.angleGroup,
    discountFormulaLabel: ctx.discountFormulaLabel,
    updatedUsedLoopTemplateCodes,
  };
}

/**
 * Motore Combinatorio Principale DB-backed (Step 1 Conversazione Umana Pura: 100 Email Madri × 108 Gruppi Lessicali + Intelligence DB Prospect).
 * Se `prospectId` corrisponde a un lead reale nel DB e mancano `website`/`richMetadata` in input,
 * li idrata automaticamente dalla tabella `sdr_prospects`.
 */
export async function generateCombinatorialOutreachEmail(
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): Promise<CombinatorialEmailResult> {
  let enrichedInput: BuildOutreachEmailInput = input;

  if (
    input.prospectId &&
    input.prospectId > 0 &&
    input.prospectId < 900000 &&
    (input.website === undefined || input.richMetadata === undefined)
  ) {
    try {
      const dbRow = await sdrPrisma.sdrProspect.findUnique({
        where: { id: input.prospectId },
        select: {
          website: true,
          region: true,
          atecoCode: true,
          brandsDetected: true,
          richMetadata: true,
        },
      });
      if (dbRow) {
        enrichedInput = {
          ...input,
          website: input.website ?? dbRow.website,
          region: input.region ?? dbRow.region,
          atecoCode: input.atecoCode ?? dbRow.atecoCode,
          brandsDetected: input.brandsDetected ?? dbRow.brandsDetected,
          richMetadata:
            input.richMetadata ??
            (dbRow.richMetadata && typeof dbRow.richMetadata === 'object'
              ? (dbRow.richMetadata as Record<string, any>)
              : null),
        };
      }
    } catch {
      // Fallback silenzioso ai dati passati in input
    }
  }

  const library = await loadCombinatorialLibraryFromDb();
  const result = executeCombinatorialSynthesis(library, enrichedInput, options);

  if (!options?.isPreview && result.chosenTemplateId) {
    sdrPrisma.sdrEmailTemplate
      .update({
        where: { id: result.chosenTemplateId },
        data: { usageCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  return result;
}

export function generateCombinatorialOutreachEmailSync(
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): CombinatorialEmailResult {
  const library = memoryCache || buildFallbackLibrary();
  return executeCombinatorialSynthesis(library, input, options);
}
