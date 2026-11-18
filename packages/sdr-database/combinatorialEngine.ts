import * as crypto from 'crypto';
import {
  sdrPrisma,
  resolveClusterConfig,
  type BuildOutreachEmailInput,
  type CanonicalB2BCluster,
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
  cleanCompanyShortSubject,
  buildCompanyBodyForms,
  extractVerifiedDecisionMaker,
  buildSalutoModerno,
  buildProdottiMiratiBrevi,
  sanitizeProspectCity,
  isGenericOnlyCompanyName,
  buildGenericCompanyFallbackForms,
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
  'Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049';

export const DEFAULT_OPTOUT_B2B_NOTE =
  'Informativa B2B rivolta ai titolari di Partita IVA. Per interrompere gli invii basta rispondere "STOP".';

type ExtendedProspectIntel = ProspectIntelligenceSummary &
  Partial<{
    isDirectPerson: boolean;
    salutoModerno: string;
    companyShortSubject: string;
    prodottiMiratiBrevi: string;
    microPresentazioneIzzo: string;
    fraseAggancioBreve: string;
    domandaFinaleBreve: string;
  }>;

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

  if (!updatedText.toLowerCase().includes(cleanSender)) {
    updatedText = updatedText.replace(
      /(Tel\s*\/\s*WhatsApp:\s*[^\n—]+)(?:\s*—\s*Email:[^\n]*)?/i,
      `$1 — Email: ${cleanSender}`
    );
  }

  let updatedHtml = rawHtml
    ? rawHtml
        .replace(
          /(\bEmail:\s*)(?:<a\b[^>]*>)?\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*(?:<\/a>)?/gi,
          `$1${escapeHtml(cleanSender)}`
        )
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
    let z = (seedCursor.val = (seedCursor.val + 0x9e3779b9) >>> 0);
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z % length;
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
    [/\bdi l([’'])/g, 'dell$1'],
    [/\bDi l([’'])/g, 'Dell$1'],
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
    [/\ba l([’'])/g, 'all$1'],
    [/\bA l([’'])/g, 'All$1'],
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
    [/\bda l([’'])/g, 'dall$1'],
    [/\bDa l([’'])/g, 'Dall$1'],
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
    [/\bin l([’'])/g, 'nell$1'],
    [/\bIn l([’'])/g, 'Nell$1'],
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
    [/\bsu l([’'])/g, 'sull$1'],
    [/\bSu l([’'])/g, 'Sull$1'],
    [/\bsu i\b/g, 'sui'],
    [/\bSu i\b/g, 'Sui'],
    [/\bsu gli\b/g, 'sugli'],
    [/\bSu gli\b/g, 'Sugli'],
    [/\bsu le\b/g, 'sulle'],
    [/\bSu le\b/g, 'Sulle'],
    // Preposizioni e congiunzioni duplicate accidentali (case-sensitive per non troncare cognomi come "di Di Luzio")
    [/\b(per|su|da|con|in|di|a|e|o)\s+\1\b/g, '$1'],
    // Articoli errati comuni davanti a s+consonante o consonante semplice
    [/\bil sconto\b/g, 'lo sconto'],
    [/\bIl sconto\b/g, 'Lo sconto'],
    [/\bi sconti\b/g, 'gli sconti'],
    [/\bI sconti\b/g, 'Gli sconti'],
    [/\blo listino\b/g, 'il listino'],
    [/\bLo listino\b/g, 'Il listino'],
    [/\buno canale\b/g, 'un canale'],
    [/\bUno canale\b/g, 'Un canale'],
    [/\bun soluzione\b/g, 'una soluzione'],
    [/\bUn soluzione\b/g, 'Una soluzione'],
  ];
  let out = text;
  for (const [re, rep] of rules) {
    out = out.replace(re, rep);
  }
  return out;
}

function endsWithDottedAbbreviation(text: string): boolean {
  const trimmed = String(text || '').trim();
  const hasDottedTail =
    /(?:[A-Za-zÀ-ÿ0-9]{1,5}\.[&\s]*){2,}$/.test(trimmed) ||
    /[A-Za-zÀ-ÿ]{2,}\s+[A-Z]\.$/.test(trimmed);
  if (!hasDottedTail) return false;
  if (/(?:^|\s)(?:per|ad?)\s+s\.?\s*c\.$/i.test(trimmed)) {
    return true;
  }
  if (
    /(?:^|\s)(?:s\.?r\.?l\.?s?\.|s\.?p\.?a\.|s\.?n\.?c\.|s\.?a\.?s\.|s\.?c\.?a\.?r\.?l\.|a\.?\s*r\.?\s*l\.|soc\.?\s*coop\.|coop\.|f\.?lli\.)$/i.test(
      trimmed
    ) ||
    /\S{3,}[,\s]+s\.?\s*c\.?\s*a?\.$/i.test(trimmed)
  ) {
    return false;
  }
  return true;
}

function polishSubjectTypography(rawSubject: string): string {
  const keepTrailingDot = endsWithDottedAbbreviation(rawSubject.trim());
  let cleaned = normalizeItalianArticulatedPrepositions(rawSubject)
    .replace(/`/g, '')
    .replace(/["“”«»!?*#_:]/g, ' ')
    .replace(/,(?=[A-Za-zÀ-ÿ0-9])/g, ', ')
    .replace(/\s+c\/o\b.*$/i, '')
    .replace(/[—–|]/g, ' ')
    .replace(/%/g, '')
    .replace(/\bIzzo\s+Distribuzione(?:\s+S\.?r\.?l\.?)?/gi, '')
    .replace(/\.+(?=(?:s\.?r\.?l\.?s?|s\.?p\.?a|s\.?n\.?c|s\.?a\.?s|s\.?c\.?a\.?r\.?l)\b)/gi, '. ')
    .replace(/\b(?:s\.?\s*r[:.]?\s*l\.?\s*s?\.?|s\.?\s*p\.?\s*a\.?|s\.?\s*n\.?\s*c\.?|s\.?\s*a\.?\s*s\.?)\b/gi, '')
    .replace(/(?<!\b(?:per|ad?))[,\s]+s\.\s*c\.\s*a\.?\s*$/gi, '')
    .replace(/\b(per|ad?)\s*[:;?!*#+~'"“”«»]+\s*/gi, '$1 ')
    .replace(/(?:^|(?<=\s))\?+([a-zà-ÿ])/g, (_m, ch: string) => ch.toUpperCase())
    .replace(/\b([LDld])[’']\s+([A-Za-zÀ-ÿ])/g, '$1’$2')
    .replace(/\bpassword\b/gi, 'codice riservato')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\.\s+\.+/g, '. ')
    .replace(/\s+\.(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
  cleaned = keepTrailingDot
    ? cleaned.replace(/[,:;!?*#+~'"“”«»]+$/g, '').trim()
    : cleaned.replace(/[,.:;!?*#+~'"“”«»]+$/g, '').trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function polishBodyTypography(rawBody: string): string {
  const lines = rawBody.split('\n').map((line) =>
    normalizeItalianArticulatedPrepositions(line)
      .replace(/`/g, '')
      .replace(/,\s*,+/g, ',')
      .replace(/\.\.+/g, '.')
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

function normalizeMinOrderPhrase(raw?: string | null): string {
  const clean = sanitizeExternalCopy(raw, '');
  if (!clean || /nessun\s+minimo|senza\s+minimo|zero\s+minimo|\btuo\b/i.test(clean)) {
    return 'senza minimo d’ordine';
  }
  return clean.toLowerCase();
}

const TRAILING_COMPANY_STOPWORDS = new Set([
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dalla',
  'e',
  'ed',
  'o',
  'od',
  'in',
  'su',
  'per',
  'con',
  'a',
  'ad',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'dal',
  'dallo',
  'dalla',
  'dai',
  'dagli',
  'dalle',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'col',
  'coi',
  'tra',
  'fra',
  '&',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'una',
  'by',
  'c/o',
  'san',
  'santa',
  'santo',
  'monte',
  'f.lli',
  'flli',
  'fratelli',
  'dott',
  'dott.ssa',
  'ing',
  'arch',
  'geom',
  'rag',
  'per.ind',
  'sig',
  'sig.ra',
  'societa',
  'società',
]);

const GENERIC_SUBJECT_ORG_WORDS = new Set([
  'impianti',
  'impianto',
  'impiantistica',
  'elettrici',
  'elettrico',
  'elettrica',
  'elettriche',
  'elettronica',
  'elettrotecnica',
  'elettroforniture',
  'studio',
  'associato',
  'associati',
  'tecnico',
  'tecnica',
  'tecnici',
  'tecnologie',
  'impresa',
  'edile',
  'edili',
  'edilizia',
  'costruzioni',
  'costruzione',
  'ristrutturazioni',
  'ristrutturazione',
  'officina',
  'meccanica',
  'meccaniche',
  'installazioni',
  'installazione',
  'manutenzione',
  'manutenzioni',
  'assistenza',
  'autorizzata',
  'autorizzato',
  'termoidraulica',
  'termoidraulici',
  'idraulica',
  'idraulici',
  'serramenti',
  'infissi',
  'carpenteria',
  'lattoneria',
  'ferramenta',
  'legno',
  'ferro',
  'alluminio',
  'metallica',
  'metalliche',
  'forniture',
  'lavorazioni',
  'commerciale',
  'sistemi',
  'servizi',
  'soluzioni',
  'centro',
  'gruppo',
  'nuova',
  'nuovo',
  'moderna',
  'moderno',
  'generale',
  'generali',
  'progettazione',
  'integrata',
  'integrate',
  'integrati',
  'integrato',
  'quadri',
  'industriali',
  'industriale',
  'civili',
  'civile',
  'termoidrauliche',
  'termoidraulico',
  'fotovoltaiche',
  'fotovoltaici',
  'fotovoltaico',
  'fotovoltaica',
  'architettonica',
  'architettonico',
  'strutturale',
  'strutturali',
  'energetica',
  'energetico',
  'ambientale',
  'ambientali',
  'tecnologica',
  'tecnologico',
  'solare',
  'solari',
  'climatici',
  'climatizzazione',
  'condizionamento',
  'lattonerie',
  'carpenterie',
  'lavorazione',
  'coperture',
  'tetti',
  'metalli',
  'metallo',
  'compositi',
  'tecnologia',
  'tecnologici',
  'tecnologiche',
  'colori',
  'caldaie',
  'climatizzatori',
  'condizionatori',
  'allarme',
  'allarmi',
  'antennista',
  'antennisti',
  'sicurezza',
  'domotica',
  'illuminazione',
  'elettroimpianti',
  'idraulico',
  'elettricista',
  'elettricisti',
  'ingegneria',
  'architettura',
  'materiale',
  'riparazioni',
  'riparazione',
  'pronto',
  'intervento',
  'interventi',
  'fabbro',
  'muratore',
  'falegname',
  'falegnameria',
  'ditta',
  'azienda',
  'cooperativa',
  'coop',
  'consorzio',
  'associazione',
  'societa',
  'società',
  'colorificio',
  'serramento',
  'infisso',
  'provincia',
  'urgente',
  'urgenza',
  'urgenze',
  'h24',
  'sos',
  'preventivi',
  'gratuiti',
  'rapido',
  'rapidi',
  'cablaggio',
  'manutentore',
  'parchettista',
  'serraturiere',
  'colorista',
  'termosanitaria',
  'refrigerazione',
  'restauro',
  'piscina',
  'piscine',
  'scuola',
  'tutto',
  'pratiche',
  'accessori',
  'applicazioni',
  'macchine',
  'utensili',
  'cancelli',
  'energie',
  'efficienza',
  'officine',
  'metalmeccanica',
  'elettromeccanica',
  'ponteggi',
  'ponteggio',
  'noleggio',
  'montaggio',
  'isolamenti',
  'isolamento',
  'impermeabilizzazioni',
  'cartongesso',
  'scavi',
  'demolizioni',
  'pavimenti',
  'rivestimenti',
  'ing',
  'arch',
  'geom',
  'dott',
  'dottssa',
  'perind',
  'rag',
  'avv',
  'urb',
  'urbanistica',
  'finestre',
  'finestra',
  'fabbrica',
  'showroom',
  'pvc',
  'pergole',
  'pergola',
  'verande',
  'veranda',
  'tende',
  'tenda',
  'sole',
  'zanzariere',
  'tapparelle',
  'persiane',
  'avvolgibili',
  'porte',
  'blindate',
]);

const TRAILING_TRUNCATED_DESCRIPTORS = new Set([
  'impresa',
  'edile',
  'edili',
  'assistenza',
  'autorizzata',
  'autorizzato',
  'servizi',
  'manutenzione',
  'manutenzioni',
  'installazioni',
  'lavorazione',
  'lavorazioni',
  'forniture',
  'commerciale',
  'generale',
  'generali',
  'specializzata',
  'specializzato',
  'materiali',
  'matriali',
  'carpenteria',
  'carpenterie',
  'lattoneria',
  'lattonerie',
  'termoidraulica',
  'idraulica',
  'condizionamento',
  'coperture',
  'tetti',
  'tecnologia',
  'tecnologie',
  'officina',
  'officine',
  'metalmeccanica',
  'elettromeccanica',
  'ditta',
  'cooperativa',
  'coop',
]);

const LOWERCASE_COMPANY_CONNECTORS = new Set([
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dallo',
  'dalla',
  'dai',
  'dagli',
  'dalle',
  'in',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'su',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'per',
  'con',
  'col',
  'coi',
  'tra',
  'fra',
  'e',
  'ed',
  'o',
  'a',
  'ad',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'una',
  'by',
  'c/o',
  'azienda',
  'team',
]);

const SURNAME_PARTICLE_WORDS = new Set([
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dalla',
  'lo',
  'la',
]);

function capitalizeDirtyLowercaseCompanyWords(text: string): string {
  const arr = text.split(/\s+/);
  return arr
    .map((w, idx) => {
      if (
        w === 'o' &&
        idx > 0 &&
        /^(?:due|tre|zero)$/i.test(arr[idx - 1].replace(/[^A-Za-zÀ-ÿ]/g, ''))
      ) {
        return 'O';
      }
      if (/^\d+[a-z]{1,2}\.?$/i.test(w) || /^[a-z]\d+\.?$/i.test(w)) {
        return w.toUpperCase();
      }
      if (/^[a-zà-ÿ]{2,}$/.test(w) && (idx === 0 || !LOWERCASE_COMPANY_CONNECTORS.has(w))) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    })
    .join(' ');
}

function normalizeCompanyTypography(rawName: string): string {
  let out = String(rawName || '')
    .replace(/'/g, '’')
    .replace(/\b([A-Z]\.)\s*&\s*([A-Z]\.)/g, '$1&$2')
    .replace(/\b([A-Z])\s*&\s*([A-Z])\b/g, '$1&$2')
    .replace(/\b([A-Z]\.[A-Z])\.?\s+([A-Z]\.)(?=\s|$|[,;)\]])/g, '$1.$2');
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out.replace(/\b([A-Z]\.(?:[A-Z]\.)*)\s+([A-Z]\.)(?=\s|$|[,;)\]])/g, '$1$2');
  }
  return out
    .replace(/\b(?:[A-Za-z0-9]{1,3}\.){2,}[A-Za-z0-9]{0,4}\b/g, (m) => {
      const compact = m.toLowerCase().replace(/\./g, '');
      if (
        /^(?:srl|srls|spa|snc|sas|scarl|ss|socc|flli)$/.test(compact) ||
        /^f\.?lli$/i.test(m) ||
        /^soc\.?$/i.test(m) ||
        /^(?:[A-Z][a-z]{1,2}\.)+[A-Z][a-z]{1,2}$/.test(m)
      ) {
        return m;
      }
      return m.toUpperCase();
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function trimTrailingCompanyStopwords(rawText: string): string {
  const words = String(rawText || '').trim().split(/\s+/).filter(Boolean);
  while (words.length > 1) {
    const rawLast = words[words.length - 1];
    if (/^[A-Z]\.$/.test(rawLast) || endsWithDottedAbbreviation(rawLast)) {
      break;
    }
    const lastNorm = rawLast
      .toLowerCase()
      .replace(/^[.,;:'’\-]+|[.,;:'’\-]+$/g, '');
    const prevClean = words[words.length - 2].replace(/[^A-Za-zÀ-ÿ0-9]/g, '').toLowerCase();
    // "Dal Col" è cognome veneto, mai preposizione "col"; "H Due O" è formula H2O
    if (lastNorm === 'col' && prevClean === 'dal') {
      break;
    }
    if (lastNorm === 'o' && /^(?:due|tre|zero)$/.test(prevClean)) {
      break;
    }
    if (TRAILING_COMPANY_STOPWORDS.has(lastNorm)) {
      words.pop();
    } else {
      break;
    }
  }
  const joined = words.join(' ').trim();
  if (endsWithDottedAbbreviation(joined)) {
    return joined;
  }
  return joined.replace(/[.,;:\-–—|/\\]+$/g, '').trim();
}

function compressToTwoWordSubjectCompany(companyShort3: string): string {
  const words = companyShort3.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return companyShort3;
  const norm = (w: string) => w.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
  const n0 = norm(words[0]);
  const n1 = norm(words[1]);
  const n2 = norm(words[2]);

  // Mai spezzare cognomi composti tipo "Di Luzio Caldaie", "Studio Del Monte", "Impresa Dal Col" o "Io e Legno"
  if (SURNAME_PARTICLE_WORDS.has(n0) || SURNAME_PARTICLE_WORDS.has(n1) || n1 === 'e' || n1 === 'ed') {
    return companyShort3;
  }
  // "Studio Ing. Zamagni" / "Impresa Geom. Rossi" -> "Studio Zamagni" / "Impresa Rossi"
  if (/^(?:ing|arch|geom|perind|dott|dottssa|dr|rag|avv)$/.test(n1) && n2.length >= 2) {
    return trimTrailingCompanyStopwords(`${words[0]} ${words[2]}`) || companyShort3;
  }
  // "Carpenteria F.lli Bianchi" -> "Carpenteria Bianchi"
  if (/^(?:flli|fratelli)$/.test(n1) && n2.length >= 2) {
    return trimTrailingCompanyStopwords(`${words[0]} ${words[2]}`) || companyShort3;
  }
  // "Impianti Elettrici Lovato" / "Studio Associato Rossi" -> "Impianti Lovato" / "Studio Rossi"
  if (
    GENERIC_SUBJECT_ORG_WORDS.has(n0) &&
    GENERIC_SUBJECT_ORG_WORDS.has(n1) &&
    !GENERIC_SUBJECT_ORG_WORDS.has(n2) &&
    !TRAILING_COMPANY_STOPWORDS.has(n2) &&
    n2.length >= 2
  ) {
    return trimTrailingCompanyStopwords(`${words[0]} ${words[2]}`) || companyShort3;
  }
  const sliced = trimTrailingCompanyStopwords(words.slice(0, 2).join(' '));
  const slicedWords = sliced.split(/\s+/).filter(Boolean);
  if (
    (slicedWords.length === 1 && GENERIC_SUBJECT_ORG_WORDS.has(norm(slicedWords[0]))) ||
    (hasDistinctiveCompanyWord(companyShort3) && !hasDistinctiveCompanyWord(sliced))
  ) {
    return companyShort3;
  }
  return sliced || companyShort3;
}

function preCleanCompanyRawEngine(raw: string): string {
  return String(raw || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/\s+c\/o\b.*$/i, '')
    // OCR Google Maps su parole di mestiere italiane ("Termoidraulića" -> "Termoidraulica")
    .replace(
      /(?<=\b(?:termo)?idrauli|\belettri|\bmeccani|\btecnologi|\bimpiantisti|\bcarpenteri|\blattoneri)[ćčĆČ](?=[aheio]\b)/gi,
      (m) => (m === m.toUpperCase() ? 'C' : 'c')
    )
    // Riparazioni Latin-1 comuni ("Societ?", "Responsabilit?", "Edilpi?")
    .replace(/\bsociet\?(?=\s|$)/gi, 'Società')
    .replace(/\bresponsabilit\?(?=\s|$)/gi, 'Responsabilità')
    .replace(/\battivit\?(?=\s|$)/gi, 'Attività')
    .replace(/\bqualit\?(?=\s|$)/gi, 'Qualità')
    .replace(/(?<=[A-Za-zÀ-ÿ]*pi)\?(?=\s|$|[,.;)\]])/gi, 'ù')
    // Refusi S.R:L. -> S.r.l. e M.A: -> M.A.
    .replace(/\bs\.?\s*r[:.]\s*l\.?(?:s\.?)?\b/gi, 'S.r.l.')
    .replace(/\b([A-Z]\.[A-Z]):(?=\s|$)/g, '$1.')
    // Umlaut codificati come H:Oller / K:Unig -> Holler / Kunig
    .replace(/\b([A-Za-z]):([AEIOUaeiou])(?=[a-zà-ÿ])/g, (_m, c1: string, c2: string) => c1 + c2.toLowerCase())
    // Sigla F:L -> F.L.
    .replace(/\b([A-Z]):([A-Z])(?=\s|$)/g, '$1.$2.')
    // b5 art:.:arch -> b5 art arch ; uno:sei -> uno sei
    .replace(/:[\s.:]*:/g, ' ')
    .replace(/(?<=\b[A-Za-z]{2,3}):(?=[A-Za-z]{2,3}\b)/g, ' ')
    .replace(/\b(uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci):([a-zà-ÿ]+)\b/gi, '$1 $2')
    // Apostrofi con encoding rotto: "L?Altra", "Ca? del Re"
    .replace(/\b([LlDd]|Ca)\?(?=[A-Za-zÀ-ÿ\s])/g, '$1’')
    // Separatori slogan Google Maps ": " / ":parola" / " ? " -> " - "
    .replace(/^[\s:;,.?!*#+~'"“”«»\-–—|/\\]+/, '')
    .replace(/:\s+/g, ' - ')
    .replace(/:(?=[A-Za-zÀ-ÿ0-9]{2,})/g, ' - ')
    .replace(/\s+\?+\s+/g, ' - ')
    .replace(/(?:^|(?<=\s))\?+([a-zà-ÿ])/g, (_m, ch: string) => ch.toUpperCase())
    .replace(/\b100%\s*/g, '')
    .replace(/%+/g, ' ')
    .replace(/\?+/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/#+/g, ' ')
    .replace(/:+/g, ' ')
    .replace(/(?<=[A-Za-zÀ-ÿ0-9])!+(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
    .replace(/!+/g, '')
    .replace(/["“”«»`]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/,(?=[A-Za-zÀ-ÿ0-9])/g, ', ')
    .replace(/\.+(?=(?:s\.?r\.?l\.?s?|s\.?p\.?a|s\.?n\.?c|s\.?a\.?s|s\.?c\.?a\.?r\.?l)\b)/gi, '. ')
    .replace(/\b([Ss]\.?[Rr])\.{2,}([Ll][Ss]?\b)/g, '$1.$2')
    .replace(/\.\s+\.+/g, '. ')
    .replace(/\s+\.(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
    .replace(/\b((?:[A-Za-z0-9]{1,3}\.)+[A-Za-z0-9]{1,3})\s*\.{2,}\s*/g, '$1. ')
    .replace(/\b([A-Z])\s*\.\s*\.+\s*/g, '$1. ')
    .replace(/\.{2,}/g, ' ')
    .replace(/\b([LDld])[’']\s+([A-Za-zÀ-ÿ])/g, '$1’$2')
    .replace(/^[\s:;,.?!*#+~'"“”«»\-–—|/\\]+/, '')
    .replace(/[\s:;?!*#+~'"“”«»\-–—|/\\]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripLegalSuffixes(rawName: string): string {
  const preCleaned = preCleanCompanyRawEngine(rawName);
  const preHyphenNormalized = preCleaned
    .replace(/(?<![A-Za-z0-9.])([A-Za-z]{2})-([A-Za-z]{2})(?![A-Za-z0-9.])/g, (full, p1: string, p2: string) => {
      if (/^(?:wi-fi|hi-fi|hi-lo|ac-dc|co-op|on-off|no-gas|in-out|up-to|ex-novo|bi-zona)$/i.test(full)) {
        return full;
      }
      const c1 = p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase();
      const c2 = p2.charAt(0).toUpperCase() + p2.slice(1).toLowerCase();
      return `${c1}.${c2}.`;
    })
    .replace(/^([A-Za-z]{2})\s+di\s+(?=di\s+[A-ZÀ-Ÿ])/i, (full, p1: string) => {
      if (/^di$/i.test(p1)) return full;
      const c1 = p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase();
      return `${c1}.Di. `;
    });
  let s = normalizeCompanyTypography(preHyphenNormalized).replace(
    /^D\s+I\s+([A-ZÀ-Ÿ][a-zà-ÿ]{2,}\b)/,
    'Di $1'
  );
  const dashSplit = s.match(/^(.+?)\s+(?:[-–—|])\s+(.+)$/);
  if (dashSplit) {
    const left = dashSplit[1].trim();
    const right = dashSplit[2].trim();
    const leftDistinctive = hasDistinctiveCompanyWord(left);
    const rightDistinctive = hasDistinctiveCompanyWord(right) && !right.includes(',');
    const rightWords = right.split(/\s+/).filter(Boolean);
    if (
      leftDistinctive &&
      !rightDistinctive &&
      left.replace(/\./g, '').length <= 3 &&
      left.split(/\s+/).length === 1 &&
      rightWords.length === 1 &&
      `${left} ${right}`.length <= 30
    ) {
      // "GM - Termoidraulica" -> "GM Termoidraulica"
      s = `${left} ${right}`;
    } else {
      s = !leftDistinctive && rightDistinctive ? right : left;
    }
  }
  s = s
    .replace(/,?\s+o,?\s+in\s+forma\s+abbreviata\b.*$/i, '')
    .replace(/,?\s+abbreviabile\s+anche\s+in\b.*$/i, '')
    .trim();
  const stripOnce = (val: string): string => {
    let cur = val;
    for (let pass = 0; pass < 5; pass++) {
      const next = cur
        .replace(
          /[,\s]+(?:societ[àa][’']?\s+a\s+responsabilit[àa][’']?\s+limitata(?:\s+unipersonale)?(?:\s+semplificata)?|limitata(?:\s+unipersonale)?(?:\s+semplificata)?|societ[àa][’']?\s+per\s+azioni|per\s+azioni|societ[àa][’']?\s+in\s+(?:nome\s+collettivo|accomandita\s+semplice)|societ[àa][’']?\s+(?:mutua\s+)?cooperativa(?:\s+sociale|\s+edilizia|\s+edile)?(?:\s*a\.?\s*r\.?\s*l\.?)?|soc\.?\s*cooperativa(?:\s+sociale)?(?:\s*a\.?\s*r\.?\s*l\.?)?|cooperativa(?:\s+sociale|\s+edilizia|\s+edile)?|soc\.?\s*coop\.?(?:\s*a\.?\s*r\.?\s*l\.?)?|coop\.?|s\.?\s*c\.?\s*a\.?\s*r\.?\s*l\.?|a\.?\s*r\.?\s*l\.?|s\.?\s*r\.?\s*l\.?\s*semplificata|s\.?\s*r\.?\s*l\.?\s*s?\.?|s\.?\s*p\.?\s*a\.?|s\.?\s*n\.?\s*c\.?|s\.?\s*a\.?\s*s\.?|s\.?\s*s\.?|impresa\s+individuale|ditta\s+individuale|ditta|unipersonale|a\s+socio\s+unico|in\s+liquidazione)\b\.?\s*$/gi,
          ''
        )
        .replace(/(\S{3,})[,\s]+s\.\s*c\.\s*a\.?\s*$/gi, '$1')
        .replace(/(\S{3,})[,\s]+s\.?\s*c\.?\s*$/gi, '$1')
        .replace(/[,\s]+(?:&|e)\s*c\.?\s*$/gi, '')
        .trim();
      if (next === cur) break;
      cur = next;
    }
    return cur;
  };
  s = stripOnce(s);
  s = s
    .replace(
      /\b(?:societ[àa][’']?\s+a\s+responsabilit[àa][’']?\s+limitata(?:\s+unipersonale)?(?:\s+semplificata)?|s\.?\s*r\.?\s*l\.?\s*s?\.?|s\.?\s*p\.?\s*a\.?|s\.?\s*n\.?\s*c\.?|s\.?\s*a\.?\s*s\.?|soc\.?\s*cooperativa|soc\.?\s*coop\.?|unipersonale)\b\.?/gi,
      ''
    )
    .replace(/[()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\-–—|\s]+|[,\-–—|\s]+$/g, '')
    .trim();
  s = stripOnce(s);
  const withoutLeadingCoop = s
    .replace(
      /^(?:societ[àa][’']?\s+(?:mutua\s+)?cooperativa(?:\s+sociale|\s+edilizia|\s+edile)?|consorzio\s+cooperativa|associazione\s+cooperativa|soc\.?\s*cooperativa(?:\s+sociale)?|soc\.?\s*coop\.?|cooperativa(?:\s+sociale|\s+edilizia|\s+edile)?)\s+/i,
      ''
    )
    .trim();
  if (withoutLeadingCoop && hasDistinctiveCompanyWord(withoutLeadingCoop)) {
    s = withoutLeadingCoop;
  }
  const withoutInfixCoop = s
    .replace(
      /\s+(?:societ[àa][’']?\s+cooperativa|soc\.?\s*cooperativa|soc\.?\s*coop\.?|cooperativa)\b/gi,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (withoutInfixCoop && hasDistinctiveCompanyWord(withoutInfixCoop)) {
    s = withoutInfixCoop;
  }
  s = capitalizeDirtyLowercaseCompanyWords(s);
  // Rimuovi code camerali multi-socio (", ") o con iniziale puntata ("De Sisto G. & Orsini G.") o post-sigla ("F.G. di dal Lago", "3G Di Geom. ...")
  const chamberDiMatch = s.match(/^(.+?)\s+di\s+(.+)$/i);
  if (chamberDiMatch) {
    const pref = chamberDiMatch[1].trim();
    const tail = chamberDiMatch[2].trim();
    const prefIsShortCode =
      isDistinctiveAcronymToken(pref) ||
      /^(?:[0-9][A-Za-z]\.?|[A-Za-z][0-9]\.?)(?:\s+[A-Za-zÀ-ÿ]+)?$/.test(pref);
    if (
      pref.length >= 2 &&
      hasDistinctiveCompanyWord(pref) &&
      !/^(?:di|de|da|studio|cooperativa|consorzio)$/i.test(pref)
    ) {
      const isMultiPartnerComma =
        /^(?:(?:De|Di|Del|Della|Dello|Dal|Dalla|Da|Lo|La)\s+)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’'.]+\s*,\s*[A-ZÀ-Ÿ]/i.test(
          tail
        );
      const isDottedInitialPartner =
        /^(?:(?:De|Di|Del|Della|Dello|Dal|Dalla|Da|Lo|La)\s+)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-Z]\.(?:\s*(?:&|e|,)\s*.*)?$/i.test(
          tail
        );
      const isCodeOwnerTail =
        prefIsShortCode &&
        /^(?:(?:Geom|Ing|Arch|Per|Dott|Dr|Rag|Avv)\.?\s+|(?:di|de|del|della|dello|dal|dalla|da|lo|la)\s+[A-ZÀ-Ÿ])/i.test(
          tail
        );
      const isParticleOwnerTail =
        /^(?:De|Di|Del|Della|Dello|Dei|Degli|Delle|Dal|Dalla|Da|Lo|La)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+(?:\s+(?:e|ed|&)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+)?$/i.test(
          tail
        );
      if (isMultiPartnerComma || isDottedInitialPartner || isCodeOwnerTail || isParticleOwnerTail) {
        s = pref;
      }
    } else if (
      pref.split(/\s+/).length >= 2 &&
      /^nuov[oa]\s+[a-zà-ÿ]{4,}$/i.test(pref) &&
      /^(?:De|Di|Del|Della|Dello|Dei|Degli|Delle|Dal|Dalla|Da|Lo|La)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+$/i.test(
        tail
      )
    ) {
      s = pref;
    } else if (
      pref.length >= 4 &&
      !/^(?:di|de|da|per|in|su|con|studio|cooperativa|consorzio)\b/i.test(pref)
    ) {
      const genPartTail = tail.match(
        /^((?:De|Di|Del|Della|Dello|Dei|Degli|Delle|Dal|Dalla|Da|Lo|La)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+(?:\s+(?:e|ed|&)\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+)?$/i
      );
      if (genPartTail) {
        const partParts = genPartTail[1].trim().split(/\s+/);
        const formattedSurname = `${partParts[0].charAt(0).toUpperCase() + partParts[0].slice(1).toLowerCase()} ${partParts[1]}`;
        const prefWords = pref.split(/\s+/).filter(Boolean);
        const headPref =
          prefWords.length >= 2 && !LOWERCASE_COMPANY_CONNECTORS.has(prefWords[1].toLowerCase())
            ? `${prefWords[0]} ${prefWords[1]}`
            : prefWords[0];
        s = `${headPref} ${formattedSurname}`;
      }
    }
  }
  if (!endsWithDottedAbbreviation(s)) {
    s = s.replace(/\.+$/g, '').trim();
  }
  return trimTrailingCompanyStopwords(s);
}

const NEUTRAL_COMPANY_FORM_RE =
  /^(?:la\s+(?:vostra|sua)\s+azienda|il\s+(?:vostro|suo)\s+(?:studio|team))$/i;
const NEUTRAL_COMP_REF_RE =
  /^(?:della\s+(?:vostra|sua)\s+azienda|del\s+(?:vostro|suo)\s+(?:studio|team))$/i;

/** true se l'etichetta aziendale contiene almeno un elemento distintivo (cognome, brand, sigla). */
function isDistinctiveCompanyLabel(label: string): boolean {
  const t = String(label || '').trim();
  if (!t || NEUTRAL_COMPANY_FORM_RE.test(t) || /^il\s+vostro\s+team$/i.test(t)) return false;
  return hasDistinctiveCompanyWord(
    t.replace(/^(?:il\s+team|l['’]azienda|lo|dello|dell['’]azienda|della|del|di)\s+/i, '')
  );
}

const LEGAL_DOTTED_FORMS_RE = /^(?:s\.?r\.?l\.?s?\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?c\.?a\.?r\.?l\.?|f\.?lli\.?|soc\.?)$/i;

function isDistinctiveAcronymToken(rawToken: string): boolean {
  const w = rawToken.replace(/^[(\[“"']+|[)\],;:“"']+$/g, '');
  if (!w) return false;
  if (LEGAL_DOTTED_FORMS_RE.test(w)) return false;
  // Sigle puntate: "I.M.A.", "A.G.K.", "S.E.I.", "N.T.NET"
  if (/^(?:[A-Za-z0-9]{1,3}\.){2,}[A-Za-z0-9]{0,4}\.?$/.test(w)) return true;
  // Sigle maiuscole compatte di 2-5 lettere: "GM", "LP", "RT", "ML"
  if (/^[A-Z]{2,5}\d*$/.test(w)) {
    const low = w.toLowerCase();
    return (
      !GENERIC_SUBJECT_ORG_WORDS.has(low) &&
      !TRAILING_COMPANY_STOPWORDS.has(low) &&
      !/^(?:iva|srl|spa|snc|sas|srls|coop)$/.test(low)
    );
  }
  return false;
}

function hasDistinctiveCompanyWord(text: string): boolean {
  const trimmed = text.trim();
  if (
    /^di\s+tutto\b/i.test(trimmed) ||
    /\bdal\s+col\b/i.test(trimmed) ||
    /^nuova\s+(?:infissi|serramenti|impianti|costruzioni)\b/i.test(trimmed)
  ) {
    return true;
  }
  const rawTokens = trimmed.split(/\s+/).filter(Boolean);
  if (rawTokens.some((w) => /^[A-Za-z]&[A-Za-z]$/i.test(w))) {
    return true;
  }
  if (rawTokens.some((w) => isDistinctiveAcronymToken(w))) {
    return true;
  }
  const tokens = rawTokens
    .map((w) =>
      w
        .toLowerCase()
        .replace(/^(?:l|d|un)['’]/, '')
        .replace(/[^a-zà-ÿ0-9]/g, '')
    )
    .filter(Boolean);
  return tokens.some(
    (t) =>
      t.length >= 2 &&
      !GENERIC_SUBJECT_ORG_WORDS.has(t) &&
      !TRAILING_COMPANY_STOPWORDS.has(t) &&
      t !== 'ditta' &&
      t !== 'azienda'
  );
}

function hasDistinctiveIgnoringCityEngine(text: string, cityHint?: string | null): boolean {
  const cityWords = new Set(
    String(cityHint || '')
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/)
      .filter((w) => w.length >= 2)
  );
  const localityQualifiers = new Set([
    'alta',
    'bassa',
    'superiore',
    'inferiore',
    'marina',
    'scalo',
    'lido',
    'terme',
  ]);
  const filtered = text
    .trim()
    .split(/\s+/)
    .filter((w) => {
      const clean = w
        .toLowerCase()
        .replace(/^(?:l|d|un)['’]/, '')
        .replace(/[^a-zà-ÿ0-9]/g, '');
      if (!clean) return false;
      if (cityWords.size > 0 && (cityWords.has(clean) || localityQualifiers.has(clean))) {
        return false;
      }
      return true;
    })
    .join(' ');
  return hasDistinctiveCompanyWord(filtered);
}

function compressSubjectCompanyWords(rawBase: string): string {
  const origWords = rawBase.trim().split(/\s+/).filter(Boolean);
  let words = [...origWords];
  if (words.length <= 3 && words.join(' ').length <= 30) {
    return rawBase.trim();
  }

  const norm = (w: string) =>
    w
      .toLowerCase()
      .replace(/^(?:l|d|un)['’]/, '')
      .replace(/[^a-zà-ÿ0-9]/g, '');

  // Caso "Io e il Legno" -> "Io e Legno" (mai troncare a "Io e" o "Io")
  if (
    words.length === 4 &&
    /^(?:e|ed)$/i.test(words[1]) &&
    /^(?:il|lo|la|i|gli|le)$/i.test(words[2]) &&
    `${words[0]} ${words[1]} ${words[3]}`.length <= 30
  ) {
    return `${words[0]} ${words[1]} ${words[3]}`;
  }

  // Caso "Ristrutturazioni Nuovo Centro Edile" -> "Nuovo Centro Edile"
  if (
    words.length > 3 &&
    /^(?:ristrutturazioni|lavorazioni|installazioni|manutenzioni|forniture)$/.test(norm(words[0])) &&
    words.slice(1).length >= 2 &&
    words.slice(1).join(' ').length <= 30
  ) {
    words = words.slice(1);
  }

  // Comprimi prefissi generici composti seguiti da parole distintive:
  // (MAI quando words[0] è una preposizione tipo "Di Tutto di Già", che produrrebbe "Di Già" / "Di Di Già")
  const startsWithPreposition = /^(?:di|de|da|per|in|su|con|a)$/i.test(words[0]);
  if (!startsWithPreposition && (words.length > 3 || words.join(' ').length > 30)) {
    let firstDistinctiveIdx = -1;
    for (let i = 0; i < words.length; i++) {
      const ni = norm(words[i]);
      const prevNi = i > 0 ? norm(words[i - 1]) : '';
      const isDalCol = prevNi === 'dal' && ni === 'col';
      const isGenericOrConnector =
        !isDalCol &&
        (GENERIC_SUBJECT_ORG_WORDS.has(ni) ||
          LOWERCASE_COMPANY_CONNECTORS.has(ni) ||
          TRAILING_COMPANY_STOPWORDS.has(ni) ||
          /^(?:flli|fratelli)$/.test(ni));
      if (!isGenericOrConnector && ni.length >= 2) {
        firstDistinctiveIdx = i;
        break;
      }
    }
    if (firstDistinctiveIdx >= 2) {
      const prefixSlice = words.slice(0, firstDistinctiveIdx);
      const prefixHasAmpersandOrInitial = prefixSlice.some(
        (w) => w.includes('&') || /^[A-Z]\.?$/.test(w)
      );
      // Articolo iniziale ("La Termoidraulica di Daniele Bonanno", "Lo Studio Architettura Design"):
      // la testa è "Articolo + Categoria", mai il solo articolo ("La Bonanno", "Lo Design")
      const startsWithArticle = /^(?:il|lo|la|i|gli|le|l[’'][a-zà-ÿ]*)$/i.test(words[0]);
      const headWords = startsWithArticle ? words.slice(0, 2) : words.slice(0, 1);
      if (startsWithArticle && firstDistinctiveIdx <= 2) {
        // già "Articolo Categoria Cognome": nessuna compressione del prefisso
      } else if (!prefixHasAmpersandOrInitial) {
        const prevWord = words[firstDistinctiveIdx - 1];
        const prevNorm = norm(prevWord);
        if (
          SURNAME_PARTICLE_WORDS.has(prevNorm) &&
          (prevNorm !== 'di' ||
            /^(?:fratelli|f\.?lli\.?)$/i.test(words[firstDistinctiveIdx - 2] || ''))
        ) {
          const capParticle = prevWord.charAt(0).toUpperCase() + prevWord.slice(1).toLowerCase();
          words = [...headWords, capParticle, ...words.slice(firstDistinctiveIdx)];
        } else {
          words = [...headWords, ...words.slice(firstDistinctiveIdx)];
        }
      }
    }
  }

  let wasTruncated = false;
  while (words.length > 1 && (words.length > 3 || words.join(' ').length > 30)) {
    words.pop();
    wasTruncated = true;
    const cleaned = trimTrailingCompanyStopwords(words.join(' '));
    words = cleaned ? cleaned.split(/\s+/).filter(Boolean) : words;
  }

  // Se troncato da destra, rimuovi eventuali descrittori generici pendenti in coda
  // ("Costel Lupu Impresa Edile" -> "Costel Lupu", "Di Matteo Marco Assistenza..." -> "Di Matteo Marco",
  //  "Mr4 di Ivan Maggi Impresa Edile Specializzata" -> "Mr4")
  if (wasTruncated) {
    if (
      words.length === 3 &&
      norm(words[1]) === 'di' &&
      !GENERIC_SUBJECT_ORG_WORDS.has(norm(words[0])) &&
      words[0].length >= 3
    ) {
      words = [words[0]];
    }
    while (words.length > 1) {
      const lastNorm = norm(words[words.length - 1]);
      const prefixText = words.slice(0, -1).join(' ');
      if (
        TRAILING_TRUNCATED_DESCRIPTORS.has(lastNorm) &&
        hasDistinctiveCompanyWord(prefixText)
      ) {
        words.pop();
      } else {
        break;
      }
    }
  }

  let finalStr = trimTrailingCompanyStopwords(words.join(' '));
  if (hasDistinctiveCompanyWord(rawBase) && !hasDistinctiveCompanyWord(finalStr)) {
    const distIdx = origWords.findIndex((w) => {
      const nw = norm(w);
      return (
        nw.length >= 2 &&
        !GENERIC_SUBJECT_ORG_WORDS.has(nw) &&
        !LOWERCASE_COMPANY_CONNECTORS.has(nw) &&
        !TRAILING_COMPANY_STOPWORDS.has(nw) &&
        nw !== 'ditta' &&
        nw !== 'azienda'
      );
    });
    if (distIdx >= 1) {
      const prevW = origWords[distIdx - 1];
      if (SURNAME_PARTICLE_WORDS.has(norm(prevW))) {
        const capPart = prevW.charAt(0).toUpperCase() + prevW.slice(1).toLowerCase();
        const cand3 = `${origWords[0]} ${capPart} ${origWords[distIdx]}`;
        finalStr = cand3.length <= 30 ? cand3 : `${capPart} ${origWords[distIdx]}`;
      } else {
        const cand2 = `${origWords[0]} ${origWords[distIdx]}`;
        finalStr = cand2.length <= 30 ? cand2 : origWords[distIdx];
      }
    }
  }
  return finalStr || rawBase.trim();
}

function isBareHonorificFalseDm(dm?: string | null): boolean {
  const clean = String(dm || '').trim();
  if (!clean) return true;
  if (
    /^(?:sig\.?(?:\s*ra)?|dott\.?(?:\s*ssa)?|dr\.?(?:\s*ssa)?|per\.?(?:\s*ind\.?)?|ing\.?|geom\.?|arch\.?|rag\.?|avv\.?)$/i.test(
      clean
    )
  ) {
    return true;
  }
  return /\b(?:liquidazione|fallimento|concordato|archistudio|tecnistudio|edilstudio|lavorazione|lavorazioni|metalli|metallo|metal|legno|ferro|alluminio|acciaio|vetro|plastica|compositi|materiali|matriali)\b|\b[a-zà-ÿ]{4,}studio\b/i.test(
    clean
  );
}

function extractSurnameWithoutTitle(personStr: string): string {
  const tokens = personStr
    .trim()
    .split(/\s+/)
    .filter(
      (w) =>
        w &&
        !/^(?:sig\.?(?:ra)?|dott\.?(?:ssa)?|dr\.?(?:ssa)?|ing\.?|arch\.?|geom\.?|per\.?(?:ind\.?|ed\.?)?|ind\.?|ed\.?|rag\.?|avv\.?)$/i.test(
          w
        )
    );
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];
  const prev = tokens[tokens.length - 2]
    .toLowerCase()
    .replace(/[^a-zà-ÿ]/g, '');
  if (SURNAME_PARTICLE_WORDS.has(prev) || prev === 'li' || prev === 'le') {
    return `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
  }
  return tokens[tokens.length - 1];
}

function buildShortCompanyForSubject(
  rawShortOrClean: string,
  cityHintRaw?: string | null
): string {
  const cityHint = cityHintRaw || null;
  let base = stripLegalSuffixes(rawShortOrClean)
    .replace(
      /^(?:(?:societ[àa][’']?\s+(?:mutua\s+)?)?cooperativa(?:\s+(?:sociale|edilizia|edile))?|soc\.?\s*coop\.?)\s+(?:di\s+(?:lavoro|produzione(?:\s+e\s+lavoro)?|comunit[àa]|consumo|abitazione)\s+)?(?:di\s+)?/i,
      ''
    )
    .replace(/^Di\s+(?=(?:De|Di|Del|Della|Dal|Dalla)\s+)/i, '')
    .replace(/^Ditta\s+(?:Edile\s+)?(?=F\.?lli\b|Fratelli\b)/i, '')
    .replace(/^Ditta\s+([A-Za-z0-9]{1,2})$/i, '$1')
    .replace(/\b(di)\s+\1\b/gi, '$1');

  // Per "Studio Tecnico Associato Rossi ..." preserva il cognome ("Studio Associato Rossi"), mai un titolo ("Ing", "Arch", "Geom")
  base = base.replace(
    /^Studio\s+Tecnico\s+Associato\s+(?!(?:Ing|Arch|Geom|Per|Dott|Dr|Rag|Avv)\b)([A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']{2,})(?:\s+.*)?$/i,
    'Studio Associato $1'
  );

  // "Studio [Tecnico|di Ingegneria|di Architettura|Progettazione] [Dott.] Ing./Arch./Geom./Per.Ind. <Persona>"
  // -> "Studio Ing. <Cognome>" o "Studio <Cognome>" (mai ridurre a "Studio" nudo)
  const studioTitleMatch = base.match(
    /^Studio\s+(?:(?:Tecnico|Tecnica|Associato|Associati|Professionale|Progettazione|di\s+Ingegneria|di\s+Architettura|di\s+Progettazione|d[’']Ingegneria|(?:Arch\.?|Ing\.?)\s+ed\s+Urb\.?)\s+)*(?:di\s+)?(?:Dott\.?(?:ssa)?\s+)?(Ing\.?|Arch\.?|Geom\.?|Per\.?\s*Ind\.?|Dott\.?(?:ssa)?)\s+(.+)$/i
  );
  if (studioTitleMatch) {
    const titleCompact = studioTitleMatch[1].replace(/\s+/g, '').replace(/\.?$/, '.');
    const titleLow = titleCompact.toLowerCase();
    const title =
      titleLow === 'per.ind.' || titleLow === 'perind.'
        ? 'Per.Ind.'
        : titleCompact.charAt(0).toUpperCase() + titleCompact.slice(1).toLowerCase();
    const firstPersonChunk = stripLegalSuffixes(studioTitleMatch[2])
      .split(/\s+(?:e|ed|&|Ing\.?|Arch\.?|Geom\.?|Per\.?\s*Ind\.?|Dott\.?(?:ssa)?|Rag\.?|Avv\.?)\b/i)[0]
      .trim();
    const cleanedTokens = firstPersonChunk
      .split(/\s+/)
      .filter(
        (w) =>
          w &&
          !/^(?:associati|associato|studio|tecnico)$/i.test(w) &&
          !/^[A-Za-z]\.?$/.test(w)
      );
    const personCandidate = cleanedTokens.join(' ');
    const verifiedStudioPerson = extractVerifiedDecisionMaker(
      personCandidate,
      null,
      null,
      cityHint
    );
    let studioSurname = '';
    if (verifiedStudioPerson && !isBareHonorificFalseDm(verifiedStudioPerson)) {
      studioSurname = extractSurnameWithoutTitle(verifiedStudioPerson);
    } else if (cleanedTokens.length >= 2 && SURNAME_PARTICLE_WORDS.has(cleanedTokens[0].toLowerCase())) {
      const capPart =
        cleanedTokens[0].charAt(0).toUpperCase() + cleanedTokens[0].slice(1).toLowerCase();
      studioSurname = `${capPart} ${cleanedTokens[1]}`;
    } else {
      studioSurname = cleanedTokens[0] || '';
    }
    if (studioSurname && /^[A-ZÀ-Ÿ]/.test(studioSurname)) {
      const cand = `Studio ${title} ${studioSurname}`;
      base =
        cand.split(/\s+/).length <= 3 && cand.length <= 28
          ? cand
          : `Studio ${studioSurname}`;
    }
  } else {
    // "Studio Arch. ed Urb. di A. D’Alonzo ..." senza titolo ripetuto dopo "di"
    const studioDiSurnameMatch = base.match(
      /^Studio\s+(?:(?:Tecnico|Arch\.?|Ing\.?|Geom\.?|Urb\.?|ed|Associato|Associati)\s+)+di\s+(.+)$/i
    );
    if (studioDiSurnameMatch) {
      const tailTokens = stripLegalSuffixes(studioDiSurnameMatch[1])
        .replace(/([A-Za-z])\.(?=[A-ZÀ-Ÿ])/g, '$1. ')
        .split(/\s+/)
        .filter((w) => w && !/^[A-Za-z]\.?$/.test(w));
      if (tailTokens.length > 0 && /^[A-ZÀ-Ÿ]/.test(tailTokens[0])) {
        base = `Studio ${tailTokens[0]}`;
      }
    }
  }

  // Per "<Categoria> [dei] Fratelli/F.lli <Particella+Cognome>" > 3 parole o > 30c (es. "Termoidraulica Fratelli dal Molin" -> "Termoidraulica Dal Molin", "Impresa F.lli Dello Sbarba" -> "Impresa Dello Sbarba")
  if (base.split(/\s+/).length > 3 || base.length > 30) {
    const catFlliMatch = base.match(
      /^([A-Za-zÀ-ÿ’']+)\s+(?:dei\s+)?(?:Fratelli|F\.?lli\.?)\s+((?:dal|dalla|da|de|di|del|della|dello|dei|degli|delle|lo|la)\s+[A-Za-zÀ-ÿ’']+|[A-Za-zÀ-ÿ’']+)(?:\s+.*)?$/i
    );
    if (catFlliMatch) {
      const catNorm = catFlliMatch[1].toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
      if (GENERIC_SUBJECT_ORG_WORDS.has(catNorm)) {
        const formattedSurname = catFlliMatch[2]
          .trim()
          .split(/\s+/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ');
        const cand = `${catFlliMatch[1]} ${formattedSurname}`;
        if (cand.length <= 30) {
          base = cand;
        }
      }
    }
  }

  // Per "<Gen1> <Gen2> F.lli <Cognome>..." (es. "Impianti Elettrici F.lli Rossi") compatta in "Impianti F.lli Rossi"
  const flliMatch = base.match(
    /^([A-Za-zÀ-ÿ’']+)\s+([A-Za-zÀ-ÿ’']+)\s+(F\.?lli|Fratelli)\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+)(?:\s+.*)?$/i
  );
  if (flliMatch) {
    const w0Norm = flliMatch[1].toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    const w1Norm = flliMatch[2].toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    if (GENERIC_SUBJECT_ORG_WORDS.has(w0Norm) && GENERIC_SUBJECT_ORG_WORDS.has(w1Norm)) {
      base = `${flliMatch[1]} ${flliMatch[3]} ${flliMatch[4]}`;
    }
  }

  // Se contiene "di <Persona Verificata>", rimuovi la coda SOLO SE è davvero una persona
  // e il prefisso ha almeno una parola distintiva (mai troncare "Tecnologie di Impiantistica" o "Impresa Edile di Michele Luigi"!)
  const diSplit =
    base.split(/\s+/).length <= 3 && base.length <= 30 && /\s+Di\s+[A-ZÀ-Ÿ][a-zà-ÿ’']+$/.test(base)
      ? null
      : base.match(/^([A-Za-z0-9]{2}|.{3,}?)\s+di\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.’'\s&,]+)$/i);
  if (diSplit) {
    const rawPrefixClean = stripLegalSuffixes(diSplit[1]);
    const prefixPart =
      /^[A-Za-z0-9]{2}$/.test(rawPrefixClean) &&
      !/^(?:di|de|da|il|lo|la|le|un|in|su|al|ai)$/i.test(rawPrefixClean)
        ? rawPrefixClean.toUpperCase()
        : rawPrefixClean;
    const tailPart = stripLegalSuffixes(diSplit[2]).replace(
      /\s+(?:impresa|ditta|studio|carpenteria|lattoneria|termoidraulica|idraulica|officina|assistenza|impianti|costruzioni|ristrutturazioni|lavorazioni|manutenzione|manutenzioni|forniture)\b.*$/i,
      ''
    ).trim();
    const rawVerifiedPerson = extractVerifiedDecisionMaker(tailPart, null, null, cityHint);
    const verifiedPerson = isBareHonorificFalseDm(rawVerifiedPerson) ? null : rawVerifiedPerson;
    const prefixDistinctive = hasDistinctiveCompanyWord(prefixPart) && prefixPart.length >= 2;
    const prefixWords = prefixPart.split(/\s+/).filter(Boolean);
    const prefixStartsWithPrep = /^(?:di|de|da|per|in|su|con|a)$/i.test(prefixWords[0] || '');
    const prefixHead =
      prefixWords.length >= 2 &&
      !LOWERCASE_COMPANY_CONNECTORS.has(prefixWords[1].toLowerCase()) &&
      `${prefixWords[0]} ${prefixWords[1]}`.length <= 22
        ? `${prefixWords[0]} ${prefixWords[1]}`
        : prefixWords[0] || '';
    if (verifiedPerson) {
      if (prefixDistinctive) {
        base = prefixPart;
      } else if (prefixHead && !prefixStartsWithPrep) {
        // "<Categoria generica> di [Titolo] <Persona>" -> "<Categoria> <Cognome>" (senza titolo, mai perdere il cognome)
        const surname = extractSurnameWithoutTitle(verifiedPerson);
        if (surname) {
          const candTwo = `${prefixHead} ${surname}`;
          const candOne = `${prefixWords[0]} ${surname}`;
          base =
            candTwo.split(/\s+/).length <= 3 && candTwo.length <= 30
              ? candTwo
              : candOne.split(/\s+/).length <= 3 && candOne.length <= 30
                ? candOne
                : base;
        }
      }
    } else if (!prefixDistinctive && prefixHead && !prefixStartsWithPrep) {
      // Gestione coppia di nomi "<Nome1> e/ed/& <Nome2> <Cognome>" (es. "Angelo e Ivan Iannizzi" -> "Iannizzi")
      const twoGivenMatch = tailPart.match(
        /^[A-ZÀ-Ÿ][a-zà-ÿ’']+\s+(?:e|ed|&)\s+[A-ZÀ-Ÿ][a-zà-ÿ’']+\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+(?:\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+)?)$/
      );
      const tailTokens = tailPart.split(/\s+/).filter(Boolean);
      const cityTokens = new Set(
        String(cityHint || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 3)
      );
      const tailIsCity =
        cityTokens.size > 0 && tailTokens.every((t) => cityTokens.has(t.toLowerCase()));
      const firstTail = twoGivenMatch
        ? twoGivenMatch[1]
        : tailIsCity
          ? undefined
          : tailTokens.find(
              (t) =>
                /^[A-ZÀ-Ÿ]/.test(t) &&
                hasDistinctiveCompanyWord(t) &&
                !cityTokens.has(t.toLowerCase())
            );
      if (firstTail) {
        const candTwo = `${prefixHead} ${firstTail}`;
        const candOne = `${prefixWords[0]} ${firstTail}`;
        base =
          candTwo.split(/\s+/).length <= 3 && candTwo.length <= 30
            ? candTwo
            : candOne.split(/\s+/).length <= 3 && candOne.length <= 30
              ? candOne
              : base;
      }
    }
  }

  base = stripLegalSuffixes(base);
  base = compressSubjectCompanyWords(base);
  if (base.length > 30) {
    base = base.slice(0, 29).trim();
  }

  base = trimTrailingCompanyStopwords(base);

  if (!base) {
    return 'il vostro team';
  }
  if (base.length < 3 && !/^[0-9][A-Z]$/.test(base)) {
    return `il team ${base}`;
  }
  return base;
}

function formatItalianCityName(rawCity?: string | null, province?: string | null): string {
  // Sanificazione centralizzata (prospectPersonalizer): "Zona Industriale", "A.s.i.", "Area P.i.p.", "Via ..." -> ''
  const sanitized = sanitizeProspectCity(rawCity, province);
  const trimmed = String(sanitized || '').trim().replace(/\s{2,}/g, ' ');
  if (!trimmed) return '';
  const lowerConnectors = new Set([
    'di',
    'del',
    'della',
    'dello',
    'dei',
    'degli',
    'delle',
    'da',
    'dal',
    'dalla',
    'in',
    'nel',
    'nella',
    'nello',
    'nei',
    'negli',
    'nelle',
    'su',
    'sul',
    'sulla',
    'per',
    'con',
    'il',
    'lo',
    'la',
    'i',
    'gli',
    'le',
    'a',
    'al',
    'alla',
    'e',
    'ed',
  ]);
  return trimmed
    .split(' ')
    .map((token, idx) =>
      token
        .split(/(['’\-])/)
        .map((part, pIdx) => {
          if (!part || part === "'" || part === '’' || part === '-') return part === "'" ? '’' : part;
          const low = part.toLowerCase();
          if (idx > 0 && pIdx === 0 && lowerConnectors.has(low)) return low;
          if (
            (low === 'nell' || low === 'dell' || low === 'all' || low === 'sull' || low === 'd' || low === 'ne') &&
            idx > 0
          ) {
            return low;
          }
          if (/^(?:x|xx|xxiii)$/i.test(part) && idx > 0) {
            return part.toUpperCase();
          }
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('')
    )
    .join(' ');
}
function startsWithItalianArticleEngine(text: string): boolean {
  return /^(?:il|lo|la|i|gli|le)\s+|^l['’]/i.test(text.trim());
}

function buildModernGreetingFallback(
  decisionMakerClean: string | null,
  salutoFromIntel?: string | null,
  pickIndexFn: (len: number) => number = () => 0
): string {
  const safeDm = isBareHonorificFalseDm(decisionMakerClean) ? null : decisionMakerClean;
  const fromIntel = String(salutoFromIntel || '').trim();
  if (
    fromIntel &&
    !/spettabile|cortese\s+attenzione|\bc\.?a\.?\b/i.test(fromIntel) &&
    !/^buongiorno\s+(?:sig\.?(?:\s+ra|ra)?|dott\.?(?:\s+ssa|ssa)?|dr\.?(?:\s+ssa|ssa)?|per\.?(?:\s+ind\.?|ind)?|ing\.?|geom\.?|arch\.?|rag\.?|avv\.?)\s*,?$/i.test(
      fromIntel
    ) &&
    !/\b(?:liquidazione|fallimento|concordato|archistudio|tecnistudio|edilstudio|lavorazione|lavorazioni|metalli|metallo|metal|legno|ferro|alluminio|acciaio|vetro|plastica|compositi|materiali|matriali)\b|\b[a-zà-ÿ]{4,}studio\b/i.test(
      fromIntel
    )
  ) {
    return fromIntel.endsWith(',') ? fromIntel : `${fromIntel},`;
  }
  return buildSalutoModerno(safeDm, pickIndexFn);
}

function buildFallbackProdottiMirati(
  cluster: CanonicalB2BCluster,
  civilBrandMatched: string | null
): string {
  return buildProdottiMiratiBrevi(cluster, civilBrandMatched);
}

function stripMarkdownAndForbiddenStep1Tokens(
  rawText: string,
  forbiddenLiterals: Array<string | null | undefined> = [],
  isDirectPerson = false
): string {
  let out = rawText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(→])\*([^*\n]+)\*(?=[\s.,;:)!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/[^\s<)"']+/gi, '')
    .replace(/(?<![@.-])\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<)"']*)?/gi, '')
    .replace(/(?<![@.-])\bizzodistribuzione\.(?:it|com)(?:\/[^\s<)"']*)?/gi, 'Izzo Distribuzione S.r.l.')
    .replace(/\d+\s*%/g, '')
    .replace(/%/g, '')
    .replace(/\bSpettabile\b/gi, 'Buongiorno')
    .replace(/\bVostra(?=\s+[a-zà-ÿ])/g, 'vostra')
    .replace(/\bVostro(?=\s+[a-zà-ÿ])/g, 'vostro')
    .replace(/\bVostri(?=\s+[a-zà-ÿ])/g, 'vostri')
    .replace(/\bVostre(?=\s+[a-zà-ÿ])/g, 'vostre')
    .replace(/\bpassword\b/gi, 'abilitazione riservata')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/(?<=[A-Za-zÀ-ÿ0-9])!+(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
    .replace(/[!*#]+/g, '')
    .replace(/\.+(?:srl|srls|spa|snc|sas)\b\.?/gi, '.')
    .replace(/\b((?:[A-Za-z0-9]{1,3}\.)+[A-Za-z0-9]{1,3})\s*\.{2,}\s*/g, '$1. ');

  if (!isDirectPerson) {
    out = out.replace(
      /(?<![.!?\n]\s*)(?<!^)(?<![A-Za-zÀ-ÿ])Vi(?=\s+(?:scriv|invi|propon|ringrazi|contatt|mand|gir|lasci|chied|segnal|ricord|conferm|trasmett))/g,
      'vi'
    );
  }

  for (const lit of forbiddenLiterals) {
    const cleanLit = String(lit || '').trim();
    if (cleanLit.length >= 4) {
      out = out.split(cleanLit).join('');
    }
  }

  return out
    .split('\n')
    .map((l) =>
      normalizeItalianArticulatedPrepositions(l)
        .replace(/^-{3,}$/, '')
        .replace(/,\s*,+/g, ',')
        .replace(/\.\.+/g, '.')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([,.;:?])/g, '$1')
        .trimEnd()
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converte testo puro in HTML minimale stile mail scritta a mano da Outlook:
 * `<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #111111;">`
 * con soli `<p>` e `<br/>` (e, solo se `singleAllowedUrl` è valorizzato in Step 1B / Step 2 / Step 20, 1 singolo `<a href>`).
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

function sanitizeSignatureRole(rawRole?: string | null): string {
  const cleaned = String(rawRole || '')
    .replace(/Izzo\s+Distribuzione(?:\s+S\.?r\.?l\.?)?/gi, '')
    .replace(/[—–|]/g, '')
    .replace(/\bcommerciale\b/g, 'Commerciale')
    .replace(/\bforniture\b/g, 'Forniture')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned || /^\[.*\]$/.test(cleaned)) {
    return 'Referente Commerciale B2B';
  }
  return cleaned;
}

function sanitizeOptOutNote(rawNote?: string | null, isDirectPerson = false): string {
  let note = String(rawNote || '').trim();
  if (!note || !note.includes('STOP') || /^\[.*\]$/.test(note)) {
    return DEFAULT_OPTOUT_B2B_NOTE;
  }
  note = note
    .replace(/^Comunicazione\s+commerciale\s+B2B/i, 'Informativa B2B')
    .replace(/^Messaggio\s+commerciale\s+B2B/i, 'Informativa B2B')
    .replace(/\bper\s+soli\s+operatori\b/gi, 'per i soli operatori')
    .replace(/Per\s+non\s+ricevere\s+ulteriori\s+messaggi/gi, 'Per interrompere gli invii')
    .replace(/\bulteriori\s+messaggi\b/gi, 'nuovi invii')
    .replace(/\bVostra(?=\s+[a-zà-ÿ])/g, 'vostra')
    .replace(/\bVostro(?=\s+[a-zà-ÿ])/g, 'vostro')
    .replace(/\bVostri(?=\s+[a-zà-ÿ])/g, 'vostri')
    .replace(/\bVostre(?=\s+[a-zà-ÿ])/g, 'vostre');

  if (!isDirectPerson) {
    note = note.replace(
      /(?<![.!?\n]\s*)(?<!^)(?<![A-Za-zÀ-ÿ])Vi(?=\s+(?:scriv|invi|propon|ringrazi|contatt|mand|gir|lasci|chied|segnal|ricord|conferm|trasmett))/g,
      'vi'
    );
  }

  if (/\bComunicazione\b.*\bcomunicazioni\b/i.test(note)) {
    return DEFAULT_OPTOUT_B2B_NOTE;
  }

  if (
    isDirectPerson &&
    /\b(vi|vostro|vostra|vostri|vostre|desideraste|rispondete|volete)\b/i.test(note)
  ) {
    return DEFAULT_OPTOUT_B2B_NOTE;
  }
  return note;
}

function buildCoherentSignatureBlock(params: {
  agentDisplayName: string;
  firmaReparto: string;
  agentPhoneFinal: string;
  senderEmailFinal: string;
  optOutNote: string;
  isDirectPerson?: boolean;
}): string {
  const roleClean = sanitizeSignatureRole(params.firmaReparto);
  const optOutClean = sanitizeOptOutNote(params.optOutNote, Boolean(params.isDirectPerson));
  return [
    `${params.agentDisplayName}`,
    `${roleClean} — Izzo Distribuzione S.r.l.`,
    `Tel / WhatsApp: ${params.agentPhoneFinal} — Email: ${params.senderEmailFinal}`,
    `${IZZO_LEGAL_COMPANY_LINE}`,
    '',
    `${optOutClean}`,
  ].join('\n');
}

function executeCombinatorialSynthesis(
  library: CachedLibrary,
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): CombinatorialEmailResult & { chosenTemplateId?: number } {
  const catCfg = resolveClusterConfig(input.categoryCluster);
  const discountFormulaLabel =
    Number(input.extraFirstPurchasePct) > 0
      ? `${input.baseDiscount}%+${input.extraFirstPurchasePct}%`
      : `${input.baseDiscount}%`;

  const seedCursor =
    typeof options?.deterministicSeed === 'number'
      ? { val: Math.abs(Math.floor(options.deterministicSeed)) || 1 }
      : null;

  const normalizedInput: BuildOutreachEmailInput = {
    ...input,
    city: formatItalianCityName(input.city, input.province),
  };

  const intel = composeProspectIntelligence(normalizedInput, (len) =>
    pickIndex(len, seedCursor)
  ) as ExtendedProspectIntel;

  const safeIntelDm = isBareHonorificFalseDm(intel.decisionMakerClean)
    ? null
    : intel.decisionMakerClean;
  const isDirectPerson = Boolean(safeIntelDm);

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

  // Garantisce sempre l'uso di template privi di vecchi segnaposto con %, S.r.l. nell'oggetto o credenziali
  const cleanCodeMatch = DEFAULT_EMAIL_TEMPLATES.find(
    (t) => t.code.toUpperCase() === chosenTemplate!.code.toUpperCase()
  );
  const activeBodySource =
    /\{(LOGIN_URL|OFFER_URL|SMART_CATALOG_URL|USERNAME|TEMP_PASSWORD|DISCOUNT_FORMULA|BASE_DISCOUNT|EXTRA_DISCOUNT|NET_DISCOUNT_PCT)\}|%|Spettabile|password|username/i.test(
      chosenTemplate.bodyTemplate
    ) && cleanCodeMatch
      ? cleanCodeMatch.bodyTemplate
      : chosenTemplate.bodyTemplate;
  const activeSubjectSource =
    /credenzial|pdf|abilitazion|password|username|%|—|\||Izzo\s+Distribuzione|S\.r\.l\./i.test(
      chosenTemplate.subjectTemplate
    ) && cleanCodeMatch
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

  const cityClean = formatItalianCityName(intel.cityClean, intel.provinceClean);
  const provClean = intel.provinceClean;
  const cityLabel = cityClean
    ? `${cityClean}${provClean ? ` (${provClean})` : ''}`
    : isDirectPerson
      ? 'la sua zona'
      : 'la vostra zona';
  const cityParen = cityClean ? ` (${cityClean})` : '';
  const areaSu = cityClean
    ? startsWithItalianArticleEngine(cityClean)
      ? `in zona ${cityClean}`
      : `su ${cityClean}`
    : 'sul territorio';
  const locPhrase = cityClean
    ? startsWithItalianArticleEngine(cityClean)
      ? `in zona ${cityClean}`
      : `su ${cityClean}`
    : 'sul territorio';

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
  const cleanMinOrderText = normalizeMinOrderPhrase(input.minOrderAmountText);
  const cleanFreeShippingText = sanitizeExternalCopy(
    input.freeShippingText,
    'spedizione tracciata in tutta Italia'
  );

  const companyCleanTypo = normalizeCompanyTypography(intel.companyClean);
  // Fallback neutro concordato Lei/voi per ragioni sociali puramente generiche
  // ("Elettroimpianti", "Forniture Elettriche", "Termoidraulica"): mai "per Termoidraulica"!
  const genericForms = buildGenericCompanyFallbackForms(isDirectPerson, intel.cluster);
  const neutralCompanyShort = genericForms.companyBodyShort;
  const neutralCompRefDi = genericForms.compRefDi;
  const intelShortSubjectRaw = String(intel.companyShortSubject || '').trim();
  const intelShortSubject = NEUTRAL_COMPANY_FORM_RE.test(intelShortSubjectRaw) ? '' : intelShortSubjectRaw;
  let companyShortForSubjectRaw = buildShortCompanyForSubject(
    intelShortSubject || companyCleanTypo,
    cityClean
  );
  if (!isDistinctiveCompanyLabel(companyShortForSubjectRaw) && companyCleanTypo) {
    const fromFullName = buildShortCompanyForSubject(companyCleanTypo, cityClean);
    if (isDistinctiveCompanyLabel(fromFullName)) {
      companyShortForSubjectRaw = fromFullName;
    }
  }
  const rawIntelBodyOrig = (intel.companyBodyShort || '').trim();
  const intelBodyIsNeutral = NEUTRAL_COMPANY_FORM_RE.test(rawIntelBodyOrig);
  const rawIntelBody = intelBodyIsNeutral ? '' : rawIntelBodyOrig;
  // Forme corpo per professionisti titolati dal personalizer: "l’Ing. Di Liello", "il Geom. Rossi", "la Dott.ssa Bianchi", "il Per. Nappi"
  const intelBodyIsTitled =
    /^(?:l['’](?:Ing|Arch|Avv)\.|il\s+(?:Geom|Rag|Dott|Per(?:\.?\s?(?:Ind|Ed))?)\.|la\s+Dott\.ssa)\s+\S/i.test(
      rawIntelBody
    );
  let rawCompanyBodyCandidate = stripLegalSuffixes(
    rawIntelBody.replace(/^(?:l['’]azienda|lo)\s+/i, '') || intelShortSubject || companyCleanTypo
  );
  if (!isDistinctiveCompanyLabel(rawCompanyBodyCandidate) && companyCleanTypo) {
    const fullBodyStripped = stripLegalSuffixes(companyCleanTypo);
    if (isDistinctiveCompanyLabel(fullBodyStripped)) {
      rawCompanyBodyCandidate = fullBodyStripped;
    }
  }
  const startsWithPrepOrParticle = (txt: string): boolean =>
    /^(?:di|de|del|della|dello|dei|degli|delle|da|dal|dalla)(?:\s+|[&.\-/])|^d['’]|^(?:di|de|del|da)\.\s*[a-zà-ÿ]/i.test(
      txt.trim()
    );
  const companyBodyShortRaw = intelBodyIsTitled
    ? normalizeCompanyTypography(rawIntelBody)
    : normalizeCompanyTypography(
        /^lo\s+studio\s+di\s+/i.test(rawIntelBody) || /^studio\s+di\s+/i.test(rawCompanyBodyCandidate)
          ? `lo ${rawCompanyBodyCandidate}`
          : /^l['’]azienda\s+/i.test(rawIntelBody)
            ? `l’azienda ${rawCompanyBodyCandidate}`
            : rawCompanyBodyCandidate.length >= 3
              ? /^(?:il|lo|i|gli|le)\s+|^l['’]/i.test(rawCompanyBodyCandidate) ||
                startsWithPrepOrParticle(rawCompanyBodyCandidate)
                ? `l’azienda ${rawCompanyBodyCandidate}`
                : rawCompanyBodyCandidate
              : rawCompanyBodyCandidate
                ? `l’azienda ${rawCompanyBodyCandidate}`
                : companyCleanTypo || neutralCompanyShort
      );

  const bareBodyForRef = companyBodyShortRaw.replace(/^(?:l['’]azienda|lo)\s+/i, '').trim();
  const fallbackCompRefDi = intelBodyIsTitled
    ? companyBodyShortRaw
        .replace(/^l['’]/i, 'dell’')
        .replace(/^il\s+/i, 'del ')
        .replace(/^la\s+/i, 'della ')
    : /^lo\s+studio\s+di\s+/i.test(companyBodyShortRaw) || /^studio\s+di\s+/i.test(bareBodyForRef)
    ? `dello ${bareBodyForRef}`
    : /^l['’]azienda\s+/i.test(companyBodyShortRaw)
      ? `del${companyBodyShortRaw}`
      : startsWithItalianArticleEngine(bareBodyForRef) ||
          startsWithPrepOrParticle(bareBodyForRef) ||
          /\s+di\s+/i.test(bareBodyForRef)
        ? `dell’azienda ${bareBodyForRef}`
        : `di ${bareBodyForRef}`;
  const rawIntelCompRef = normalizeCompanyTypography((intel.compRefDi || '').trim());
  const compRefDiRaw =
    rawIntelCompRef &&
    !NEUTRAL_COMP_REF_RE.test(rawIntelCompRef) &&
    !/^de\s+la\s+/i.test(rawIntelCompRef) &&
    !/^di\s+(?:di|de|del|della|dello|dei|degli|delle|da|dal|dalla)\b/i.test(rawIntelCompRef) &&
    !/^di\s+d['’]/i.test(rawIntelCompRef) &&
    !/^di\s+(?:di|de|del|da)\.\s*[a-zà-ÿ]/i.test(rawIntelCompRef) &&
    !/^di\s+.*\s+di\s+/i.test(rawIntelCompRef) &&
    !/^dell['’]azienda\s+studio\s+di\s+/i.test(rawIntelCompRef) &&
    !/\ba\.?\s*r\.?\s*l\.?\b/i.test(rawIntelCompRef) &&
    !/\b(?:societ[àa][’']?\s+cooperativa|soc\.?\s*cooperativa|cooperativa|coop\.?)\b/i.test(
      rawIntelCompRef
    ) &&
    !/\bs\.?\s*(?:r\.?\s*l\.?\s*s?|p\.?\s*a|n\.?\s*c|a\.?\s*s)\b/i.test(rawIntelCompRef)
      ? rawIntelCompRef
      : fallbackCompRefDi;

  const isGenericCompany =
    intelBodyIsNeutral ||
    Boolean((intel as { isGenericCompanyName?: boolean }).isGenericCompanyName) ||
    !isDistinctiveCompanyLabel(companyShortForSubjectRaw) ||
    (isGenericOnlyCompanyName(companyShortForSubjectRaw, cityClean) &&
      !isDistinctiveCompanyLabel(companyShortForSubjectRaw) &&
      !isDistinctiveCompanyLabel(bareBodyForRef));
  const companyShortForSubject = isGenericCompany ? neutralCompanyShort : companyShortForSubjectRaw;
  const companyBodyShort = isGenericCompany ? neutralCompanyShort : companyBodyShortRaw;
  const compRefDi = isGenericCompany ? neutralCompRefDi : compRefDiRaw;

  const companyAlreadyHasCity =
    !isGenericCompany &&
    cityClean.length >= 3 &&
    companyBodyShort.toLowerCase().includes(cityClean.toLowerCase());
  const resolvedIntelLoc = (intel.locPhrase || '').trim() || locPhrase;
  const resolvedIntelLocAfterCompany = isGenericCompany
    ? resolvedIntelLoc
    : intel.locPhraseAfterCompany !== undefined
      ? intel.locPhraseAfterCompany.trim()
      : companyAlreadyHasCity
        ? ''
        : resolvedIntelLoc;
  const bodyMentionsCompany = /\{(COMPANY_BODY_SHORT|COMP_REF_DI|COMPANY_NAME)\}/.test(
    activeBodySource
  );
  const effectiveLocPhrase = bodyMentionsCompany
    ? resolvedIntelLocAfterCompany
    : resolvedIntelLoc;

  const salutoModerno = buildModernGreetingFallback(
    safeIntelDm,
    intel.salutoModerno,
    (len) => pickIndex(len, seedCursor)
  );

  const microPresentazioneFallback =
    'società italiana specializzata nella vendita diretta all’ingrosso per i soli titolari di Partita IVA';
  const microPresentazioneIzzo = (
    (intel.microPresentazioneIzzo || '').trim() || microPresentazioneFallback
  )
    .replace(/\bper\s+soli\s+operatori\b/gi, 'per i soli titolari')
    .replace(/\balle\s+sole\s+Partite\s+IVA\b/gi, 'ai soli titolari di Partita IVA')
    .replace(/\bserie\s+civile\s+estetica\b/gi, 'serie civile')
    .replace(
      /\b(?:riservata\s+alle\s+(?:sole\s+)?(?:realtà|attività)|per\s+le\s+sole\s+(?:realtà|attività)|dedicato\s+esclusivamente\s+alle\s+realtà)\s+con\s+Partita\s+IVA\b/gi,
      (m) =>
        /^dedicato/i.test(m)
          ? 'rivolto esclusivamente ai titolari di Partita IVA'
          : 'per i soli titolari di Partita IVA'
    );

  const prodottiMirati = (
    (intel.prodottiMiratiBrevi || '').trim() ||
    buildFallbackProdottiMirati(intel.cluster, intel.civilBrandMatched)
  ).replace(/\bserie\s+civile\s+estetica\b/gi, 'serie civile');

  const fraseAggancioFallback = isDirectPerson
    ? `Conoscendo l’attività ${compRefDi}${effectiveLocPhrase ? ` ${effectiveLocPhrase}` : ''}, le scrivo perché serviamo ${intel.sectorPlural}`
    : `Avendo presente l’attività ${compRefDi}${effectiveLocPhrase ? ` ${effectiveLocPhrase}` : ''}, vi scrivo perché serviamo ${intel.sectorPlural}`;
  let fraseAggancioBreve = normalizeCompanyTypography(
    (intel.fraseAggancioBreve || '').trim() || fraseAggancioFallback
  )
    .replace(/\bnella\s+(?:sua|vostra)\s+zona\b/gi, 'sul territorio')
    .replace(/(presso\s+[^,.\n]+?)\s+presso\s+/gi, '$1 in zona ')
    .replace(/\bpresso\s+(L[’']Aquila|La\s+Spezia)\b/gi, 'in zona $1')
    .replace(/\ble\s+ferramenta\s+tecniche\b/gi, 'le rivendite di ferramenta')
    .replace(
      /\bdi\s+((?:Di|De|Del|Della|Dello|Dei|Degli|Delle|Da|Dal|Dalla)(?:\s+[A-ZÀ-Ÿ]|[&.\-/][A-Za-zÀ-ÿ0-9])|(?:Di|De|Del|Da)\.\s*[A-Za-zÀ-ÿ])/g,
      'dell’azienda $1'
    );
  if (companyAlreadyHasCity && cityClean) {
    const escapedCity = cityClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cityMentions = (
      fraseAggancioBreve.match(new RegExp(`\\b${escapedCity}\\b`, 'gi')) || []
    ).length;
    const mentionsCompanyInHook = fraseAggancioBreve
      .toLowerCase()
      .includes(bareBodyForRef.toLowerCase());
    if (mentionsCompanyInHook || cityMentions >= 2) {
      fraseAggancioBreve = fraseAggancioBreve
        .replace(new RegExp(`\\s+(?:su|in\\s+zona|presso)\\s+${escapedCity}\\b`, 'gi'), '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  }

  if (/\bserviz/i.test(companyBodyShort)) {
    fraseAggancioBreve = fraseAggancioBreve.replace(/\bserviamo\b/g, 'affianchiamo');
  }

  // Ragione sociale generica: sostituisce eventuali menzioni nude nel gancio con la forma neutra concordata
  if (isGenericCompany) {
    const genericCandidates = Array.from(
      new Set(
        [
          bareBodyForRef,
          rawIntelBodyOrig.replace(/^(?:l['’]azienda|lo)\s+/i, '').trim(),
          companyShortForSubjectRaw.replace(/^il\s+team\s+/i, '').trim(),
          intelShortSubjectRaw,
        ].filter((c) => c && c.length >= 3 && !NEUTRAL_COMPANY_FORM_RE.test(c))
      )
    ).sort((a, b) => b.length - a.length);
    for (const cand of genericCandidates) {
      const esc = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      fraseAggancioBreve = fraseAggancioBreve
        .replace(
          new RegExp(`(^|[^A-Za-zÀ-ÿ])(?:dell[’']azienda|dello|della|di)\\s+${esc}(?![A-Za-zÀ-ÿ])`, 'gi'),
          `$1${neutralCompRefDi}`
        )
        .replace(
          new RegExp(`(^|[^A-Za-zÀ-ÿ])(?:l[’']azienda|lo)\\s+${esc}(?![A-Za-zÀ-ÿ])`, 'gi'),
          `$1${neutralCompanyShort}`
        )
        .replace(new RegExp(`(^|[^A-Za-zÀ-ÿ])${esc}(?![A-Za-zÀ-ÿ])`, 'gi'), `$1${neutralCompanyShort}`);
    }
  }

  const domandaFinaleFallback = isDirectPerson
    ? 'Le fa comodo se le giro qui un estratto del listino riservato per un confronto prezzi veloce?'
    : 'Vi fa comodo se vi giro qui un estratto del listino riservato per un confronto prezzi veloce?';
  const domandaFinaleBreve =
    (intel.domandaFinaleBreve || '').trim() || domandaFinaleFallback;

  // Variabili grammaticali automatiche Lei / voi (zero mescolanze)
  const pronInd = isDirectPerson ? 'le' : 'vi';
  const pronIndCap = isDirectPerson ? 'Le' : 'Vi';
  const possF = isDirectPerson ? 'sua' : 'vostra';
  const possM = isDirectPerson ? 'suo' : 'vostro';
  const possMP = isDirectPerson ? 'suoi' : 'vostri';
  const possFP = isDirectPerson ? 'sue' : 'vostre';
  const verboVolere = isDirectPerson ? 'vuole' : 'volete';
  const verboVolereCong = isDirectPerson ? 'voglia' : 'vogliate';
  const verboPotere = isDirectPerson ? 'può' : 'potete';
  const verboPreferire = isDirectPerson ? 'preferisce' : 'preferite';
  const verboAvere = isDirectPerson ? 'ha' : 'avete';
  const verboGestire = isDirectPerson ? 'gestisce' : 'gestite';
  const verboOperare = isDirectPerson ? 'opera' : 'operate';
  const verboSeguire = isDirectPerson ? 'segue' : 'seguite';
  const verboValutare = isDirectPerson ? 'valuta' : 'valutate';
  const verboConsiderare = isDirectPerson ? 'considera' : 'considerate';
  const verboCercare = isDirectPerson ? 'cerca' : 'cercate';
  const verboRispondereImp = isDirectPerson ? 'mi risponda pure' : 'rispondetemi pure';
  const verboScrivereImp = isDirectPerson ? 'mi scriva pure' : 'scrivetemi pure';
  const girarePron = isDirectPerson ? 'girarle' : 'girarvi';
  const inviarePron = isDirectPerson ? 'inviarle' : 'inviarvi';
  const lasciarePron = isDirectPerson ? 'lasciarle' : 'lasciarvi';
  const mandarePron = isDirectPerson ? 'mandarle' : 'mandarvi';
  const trasmetterePron = isDirectPerson ? 'trasmetterle' : 'trasmettervi';
  const prepararePron = isDirectPerson ? 'prepararle' : 'prepararvi';
  const metterciProva = isDirectPerson ? 'mettermi alla prova' : 'metterci alla prova';
  const faComodoPron = isDirectPerson ? 'Le fa comodo' : 'Vi fa comodo';
  const faPiacerePron = isDirectPerson ? 'Le fa piacere' : 'Vi fa piacere';
  const interessaPron = isDirectPerson ? 'Le interessa' : 'Vi interessa';
  const utilePron = isDirectPerson ? 'Le è utile' : 'Vi è utile';
  const seFaComodo = isDirectPerson ? 'Se le fa comodo' : 'Se vi fa comodo';
  const seFaPiacere = isDirectPerson ? 'Se le fa piacere' : 'Se vi fa piacere';
  const seUtile = isDirectPerson ? 'Se le è utile' : 'Se vi è utile';
  const seVuole = isDirectPerson ? 'Se vuole' : 'Se volete';
  const sePreferisce = isDirectPerson ? 'Se preferisce' : 'Se preferite';

  const listinoRuoloLabel = intel.isReseller ? 'rivenditori' : 'operatori con Partita IVA';
  // Senza numeri né '%' nello Step 1
  const conditionNoPct = intel.isReseller
    ? `listino rivendita dedicato sul primo eventuale ordine, ${cleanMinOrderText}`
    : `condizione dedicata sul primo eventuale acquisto, ${cleanMinOrderText}`;

  const resolveClientVariables = (txt: string): string => {
    const map: Record<string, string> = {
      COMPANY_NAME: isGenericCompany ? neutralCompanyShort : intel.companyClean,
      COMPANY_SHORT: companyShortForSubject,
      COMPANY_BODY_SHORT: companyBodyShort,
      SALUTO_MODERNO: salutoModerno,
      SALUTO_PERSONALIZZATO: salutoModerno,
      SALUTO_UMANO_1A1: salutoModerno,
      INTESTAZIONE_OGGETTO: companyShortForSubject,
      MICRO_PRESENTAZIONE_IZZO: microPresentazioneIzzo,
      PRODOTTI_MIRATI: prodottiMirati,
      FRASE_AGGANCIO_BREVE: fraseAggancioBreve,
      DOMANDA_FINALE_BREVE: domandaFinaleBreve,
      CTA_BREVE: domandaFinaleBreve,
      AREA_SU: areaSu,
      AREA_BREVE: effectiveLocPhrase,
      LOC_PHRASE: effectiveLocPhrase,
      COMP_REF_DI: compRefDi,
      SECTOR_PLURAL: intel.sectorPlural,
      SECTOR_NOUN: intel.sectorNoun,
      PRON_IND: pronInd,
      PRON_IND_CAP: pronIndCap,
      POSS_F: possF,
      POSS_F_SG: possF,
      POSS_M: possM,
      POSS_MP: possMP,
      POSS_M_PL: possMP,
      POSS_FP: possFP,
      VERBO_VOLERE: verboVolere,
      VERBO_VOLERE_CONG: verboVolereCong,
      VERBO_POTERE: verboPotere,
      VERBO_PREFERIRE: verboPreferire,
      PREFERIRE_PRES: verboPreferire,
      VERBO_AVERE: verboAvere,
      VERBO_GESTIRE: verboGestire,
      VERBO_OPERARE: verboOperare,
      VERBO_SEGUIRE: verboSeguire,
      VERBO_VALUTARE: verboValutare,
      VERBO_CONSIDERARE: verboConsiderare,
      VERBO_CERCARE: verboCercare,
      VERBO_RISPONDERE_IMP: verboRispondereImp,
      VERBO_SCRIVERE_IMP: verboScrivereImp,
      GIRARE_PRON: girarePron,
      INVIARE_PRON: inviarePron,
      LASCIARE_PRON: lasciarePron,
      MANDARE_PRON: mandarePron,
      TRASMETTERE_PRON: trasmetterePron,
      PREPARARE_PRON: prepararePron,
      METTERCI_PROVA: metterciProva,
      FA_COMODO_PRON: faComodoPron,
      FA_PIACERE_PRON: faPiacerePron,
      INTERESSA_PRON: interessaPron,
      UTILE_PRON: utilePron,
      SE_FA_COMODO: seFaComodo,
      SE_FA_PIACERE: seFaPiacere,
      SE_UTILE: seUtile,
      SE_VUOLE: seVuole,
      SE_PREFERISCE: sePreferisce,
      // Variabili legacy mantenute per compatibilità (concordate e prive di '%')
      FRASE_CONTESTO_DB: fraseAggancioBreve,
      INCISO_CONTESTO_DB: intel.incisoContestoDb,
      CONTESTO_TERRITORIO_FALLBACK: fraseAggancioBreve,
      SCENARIO_MESTIERE_SETTORE: intel.scenarioMestiereSettore,
      SCOPO_FORNITURA_SETTORE: intel.scopoFornituraSettore,
      LINEE_PRODOTTI_IZZO: prodottiMirati,
      PRODOTTI_PROSA: prodottiMirati,
      PRODOTTI_COMPATTI: prodottiMirati,
      PRODOTTI_MATRICE_REPARTI: prodottiMirati,
      CHIUSURA_SETTORE: intel.chiusuraSettore,
      CITY: cityLabel,
      CITY_PAREN: cityParen,
      PROVINCE: provClean || 'IT',
      SECTOR_SHORT: catCfg.shortLabel,
      RECOMMENDED_FAMILY: catCfg.recommendedFamily,
      BRANDS_NOTE: prodottiMirati,
      DISCOUNT_FORMULA: 'condizione dedicata',
      BASE_DISCOUNT: 'riservato',
      EXTRA_DISCOUNT: 'dedicato',
      NET_DISCOUNT_PCT: 'riservato',
      LISTINO_RUOLO: listinoRuoloLabel,
      CONDIZIONE_BREVE: conditionNoPct,
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
      INVITO_RISPOSTA_PROSA: domandaFinaleBreve,
      INVITO_RISPOSTA_FLASH: domandaFinaleBreve,
      INVITO_RISPOSTA_PS: domandaFinaleBreve,
      CREDENZIALI_PROSA: domandaFinaleBreve,
      CREDENZIALI_RIGA_FLASH: domandaFinaleBreve,
      CREDENZIALI_PS: domandaFinaleBreve,
      CREDENZIALI_FILETTO: domandaFinaleBreve,
      SCHEDA_QUALIFICA_FORNITORE: prodottiMirati,
      CREDENTIALS_BLOCK: domandaFinaleBreve,
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

  // Sintesi Oggetto Step 1 (4-6 parole, 22-55 caratteri, zero trattini/S.r.l./%, zero parole tronche)
  const countSubjWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const companyShort3 =
    compressSubjectCompanyWords(companyShortForSubject) || companyShortForSubject;
  const companyWords = companyShort3.split(/\s+/).filter(Boolean);
  const companyHasArt = startsWithItalianArticleEngine(companyShort3);
  const isTeamShort = /^il\s+team\s+/i.test(companyShort3);
  const rawShort2 = isTeamShort
    ? companyShort3
    : !companyHasArt && companyWords.length > 2
      ? compressToTwoWordSubjectCompany(companyShort3)
      : companyShort3;
  const companyShort2 = rawShort2 || companyShort3;

  let rawSubjectWithTokens = replaceDynamicTokens(activeSubjectSource);
  // Anti-eco nell'oggetto quando la ragione sociale contiene già "Elettric*" o "Ferramenta" o " Studio"
  if (
    /elettric/i.test(companyShort3) &&
    /^(?:Forniture\s+elettriche|Materiale\s+elettrico|Elettrico\s+e\s+[A-Za-zÀ-ÿ]+)/i.test(
      rawSubjectWithTokens
    )
  ) {
    rawSubjectWithTokens = rawSubjectWithTokens.replace(
      /^(?:Forniture\s+elettriche|Materiale\s+elettrico|Elettrico\s+e\s+[A-Za-zÀ-ÿ]+)/i,
      'Prospetto forniture'
    );
  }
  if (/tecnic/i.test(companyShort3) && /\btecnic[a-zà-ÿ]*\b/i.test(rawSubjectWithTokens)) {
    rawSubjectWithTokens = rawSubjectWithTokens.replace(
      /^[^\{]+?(?=\s+per\s+\{COMPANY_SHORT\})/i,
      'Prospetto forniture'
    );
  }
  let resolvedSubject = polishSubjectTypography(
    resolveClientVariables(rawSubjectWithTokens.replace(/\{COMPANY_SHORT\}/g, companyShort3))
  );
  if (countSubjWords(resolvedSubject) > 6 || resolvedSubject.length > 55) {
    if (companyHasArt && !isTeamShort && companyShort3.length <= 28) {
      resolvedSubject = polishSubjectTypography(`Prospetto B2B per ${companyShort3}`);
    } else {
      resolvedSubject = polishSubjectTypography(
        resolveClientVariables(rawSubjectWithTokens.replace(/\{COMPANY_SHORT\}/g, companyShort2))
      );
    }
  }
  if (resolvedSubject.length < 22 || countSubjWords(resolvedSubject) < 4) {
    resolvedSubject = polishSubjectTypography(`Prospetto forniture per ${companyShort3}`);
  }
  if (countSubjWords(resolvedSubject) > 6 || resolvedSubject.length > 55) {
    const emergencyPrefix = /\bcatalog/i.test(activeBodySource)
      ? /\bprospett/i.test(activeBodySource)
        ? 'Selezione B2B'
        : 'Prospetto B2B'
      : 'Catalogo B2B';
    resolvedSubject = polishSubjectTypography(`${emergencyPrefix} per ${companyShort2}`);
  }

  // Anti-eco universale di radice (4 lettere) + zero doppio "per" nell'oggetto
  {
    const subjRootsOf = (txt: string): string[] =>
      txt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w && w !== 'b2b')
        .map((w) => w.replace(/[^a-z]/g, ''))
        .filter((w) => w.length >= 4)
        .map((w) => w.slice(0, 4));

    const perIdx = resolvedSubject.toLowerCase().indexOf(' per ');
    if (perIdx > 0) {
      const subjPrefixPart = resolvedSubject.slice(0, perIdx);
      const subjCompanyPart = resolvedSubject.slice(perIdx + 5);
      const hasInnerPer = /(?:^|\s)per(?:\s|$)/i.test(subjCompanyPart);
      const bodyLow = activeBodySource.toLowerCase();

      if (hasInnerPer) {
        // Zero doppio "per" nell'oggetto ("Astra per L’Edilizia", "Ponteggi per Edilizia", "Tutto per Infissi")
        const noPerPrefixes = [
          'Catalogo B2B dedicato a',
          'Listino B2B riservato a',
          'Proposta B2B dedicata a',
          'Selezione B2B riservata a',
          'Catalogo riservato a',
          'Listino dedicato a',
          'Proposta dedicata a',
          'Selezione riservata a',
          'Offerta riservata a',
          'Quotazioni dedicate a',
        ];
        const orderedNoPer = [
          ...noPerPrefixes.filter((p) => !bodyLow.includes(p.slice(0, 5).toLowerCase())),
          ...noPerPrefixes.filter((p) => bodyLow.includes(p.slice(0, 5).toLowerCase())),
        ];
        const compTargets = Array.from(new Set([subjCompanyPart, companyShort2].filter(Boolean)));
        let replacedNoPer = false;
        for (const compTarget of compTargets) {
          if (replacedNoPer) break;
          const compRoots = new Set(subjRootsOf(compTarget));
          const startsVowelA = /^a[a-zà-ÿ]/i.test(compTarget.trim());
          for (const pref of orderedNoPer) {
            if (subjRootsOf(pref).some((r) => compRoots.has(r))) continue;
            const euphonicPref = startsVowelA ? pref.replace(/\s+a$/, ' ad') : pref;
            const cand = polishSubjectTypography(`${euphonicPref} ${compTarget}`);
            const wc = countSubjWords(cand);
            if (cand.length >= 22 && cand.length <= 55 && wc >= 4 && wc <= 6) {
              resolvedSubject = cand;
              replacedNoPer = true;
              break;
            }
          }
        }
      } else {
        const companyRoots = new Set(subjRootsOf(subjCompanyPart));
        const collides = subjRootsOf(subjPrefixPart).some((r) => companyRoots.has(r));
        if (collides) {
          const altPrefixes = [
            'Catalogo B2B',
            'Listino B2B',
            'Prospetto B2B',
            'Selezione B2B',
            'Offerta B2B',
            'Forniture B2B',
            'Quotazioni B2B',
            'Soluzioni B2B',
          ];
          const ordered = [
            ...altPrefixes.filter((p) => !bodyLow.includes(p.slice(0, 5).toLowerCase())),
            ...altPrefixes.filter((p) => bodyLow.includes(p.slice(0, 5).toLowerCase())),
          ];
          const compTargets = Array.from(new Set([subjCompanyPart, companyShort2].filter(Boolean)));
          let replacedEcho = false;
          for (const compTarget of compTargets) {
            if (replacedEcho) break;
            const compRoots = new Set(subjRootsOf(compTarget));
            for (const pref of ordered) {
              if (subjRootsOf(pref).some((r) => compRoots.has(r))) continue;
              const cand = polishSubjectTypography(`${pref} per ${compTarget}`);
              const wc = countSubjWords(cand);
              if (cand.length >= 22 && cand.length <= 55 && wc >= 4 && wc <= 6) {
                resolvedSubject = cand;
                replacedEcho = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Sintesi Corpo Step 1
  const bodyAfterTokens = replaceDynamicTokens(activeBodySource);
  const resolvedBodyCoreRaw = polishBodyTypography(resolveClientVariables(bodyAfterTokens));
  const cleanBodyCore = stripMarkdownAndForbiddenStep1Tokens(
    resolvedBodyCoreRaw,
    [input.username, input.tempPasswordPlain],
    isDirectPerson
  );

  const signaturePlain = buildCoherentSignatureBlock({
    agentDisplayName,
    firmaReparto,
    agentPhoneFinal,
    senderEmailFinal,
    optOutNote,
    isDirectPerson,
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
  const discountFormulaLabel = extraPct > 0 ? `${baseDiscount}%+${extraPct}%` : `${baseDiscount}%`;

  const meta =
    input.richMetadata && typeof input.richMetadata === 'object'
      ? (input.richMetadata as Record<string, any>)
      : {};
  const vatOfficialName = meta.vat_official_name ? String(meta.vat_official_name) : null;
  const followupCityHint = formatItalianCityName(input.city, input.province);
  const followupCompanyInput = preCleanCompanyRawEngine(input.companyName);
  const companyForms = buildCompanyBodyForms(followupCompanyInput, vatOfficialName, followupCityHint);
  const companyCleanRaw =
    normalizeCompanyTypography(companyForms.companyBodyShort) ||
    cleanCompanyDisplayName(followupCompanyInput, vatOfficialName, followupCityHint);
  let companyShortRaw = buildShortCompanyForSubject(
    companyForms.companyShortSubject ||
      cleanCompanyShortSubject(followupCompanyInput, vatOfficialName, followupCityHint),
    followupCityHint
  );
  if (!isDistinctiveCompanyLabel(companyShortRaw) && followupCompanyInput) {
    const fromFullFollowup = buildShortCompanyForSubject(followupCompanyInput, followupCityHint);
    if (isDistinctiveCompanyLabel(fromFullFollowup)) {
      companyShortRaw = fromFullFollowup;
    }
  }
  const rawDecisionMaker = extractVerifiedDecisionMaker(
    input.decisionMaker || meta.decision_maker || null,
    input.companyName,
    vatOfficialName,
    followupCityHint
  );
  const decisionMaker = isBareHonorificFalseDm(rawDecisionMaker) ? null : rawDecisionMaker;
  const isDirectPerson = Boolean(decisionMaker);

  // Fallback neutro concordato per ragioni sociali puramente generiche (zero mix Lei/voi)
  const followupCluster = resolveClusterConfig(input.categoryCluster)?.cluster as CanonicalB2BCluster;
  const followupNeutral = buildGenericCompanyFallbackForms(isDirectPerson, followupCluster)
    .companyBodyShort;
  const companyCleanBare = companyCleanRaw.replace(/^(?:l['’]azienda|lo)\s+/i, '').trim();
  const followupIsGeneric =
    NEUTRAL_COMPANY_FORM_RE.test(companyCleanRaw.trim()) ||
    (!isDistinctiveCompanyLabel(companyShortRaw) && !isDistinctiveCompanyLabel(companyCleanBare));
  const companyClean = followupIsGeneric ? followupNeutral : companyCleanRaw;
  const companyShort = followupIsGeneric ? followupNeutral : companyShortRaw;

  const seedCursor =
    typeof input.deterministicSeed === 'number'
      ? { val: Math.abs(Math.floor(input.deterministicSeed)) || 1 }
      : input.prospectId
        ? { val: Math.abs(Math.floor(input.prospectId)) || 1 }
        : null;

  const greeting = buildModernGreetingFallback(decisionMaker, null, (len) =>
    pickIndex(len, seedCursor)
  );

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
    : `Re: Forniture riservate per ${companyShort}`;

  const rawSmartUrl = String(input.smartCatalogUrl || input.offerUrl || '').trim();
  const smartCatalogUrl = rawSmartUrl
    ? rawSmartUrl
    : input.trackingToken
      ? `https://www.izzodistribuzione.it/offerta/${encodeURIComponent(String(input.trackingToken).trim())}`
      : 'https://www.izzodistribuzione.it/offerta/demo';

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

  const minOrderClean = normalizeMinOrderPhrase(input.minOrderAmountText);

  return {
    companyClean,
    companyShort,
    decisionMaker,
    isDirectPerson,
    greeting,
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
 * - 50-75 parole di corpo, concordanza automatica `Lei` / `voi` in minuscolo
 * - 1 SOLO link pulito (`smartCatalogUrl`) in tutta l'email
 * - ZERO parola "Password" o "Username"
 */
export function generateConsentReplyEmail(
  input: ConsentReplyEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);

  const variants = ctx.isDirectPerson
    ? [
        [
          ctx.greeting,
          `grazie per il riscontro. Ecco la pagina riservata che ho preparato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da qui può entrare con 1 clic nel catalogo a prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF coi suoi dati di accesso da conservare.`,
          `Se ha una lista materiali su cui mettermi alla prova, me la giri pure in risposta.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `grazie per avermi risposto. Le lascio subito il collegamento riservato predisposto per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Aprendo la pagina può consultare con 1 clic il portale B2B coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) e scaricare il Catalistino PDF completo dei suoi dati di accesso da tenere in archivio.`,
          `Per preventivi su distinta resto reperibile qui o su WhatsApp.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `grazie del cortese riscontro. Trova qui il prospetto che ho abilitato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Dal collegamento può entrare con 1 clic nel listino B2B netto (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}) oppure salvare il Catalistino PDF, che riporta stampati all’interno i suoi dati di accesso da conservare.`,
          `Se vuole quotare qualche articolo specifico, mi scriva pure in risposta.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `la ringrazio per la risposta. Come anticipato, ecco la pagina riservata configurata per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da qui può entrare subito con 1 clic nel portale coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) e scaricare il Catalistino PDF coi dati di accesso stampati dentro da conservare.`,
          `Resto a sua disposizione ai recapiti in firma per ogni confronto.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `grazie per il rapido cenno. Ecco il collegamento diretto preparato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Aprendolo può visionare con 1 clic l’intero catalogo B2B già scontato (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF, dove trova anche i suoi dati di accesso da conservare.`,
          `Se preferisce inviare una lista materiali, mi risponda pure a questa mail.`,
          `Un cordiale saluto,`,
        ],
      ]
    : [
        [
          ctx.greeting,
          `grazie per il riscontro. Ecco la pagina riservata che ho preparato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da qui potete entrare con 1 clic nel catalogo a prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF coi vostri dati di accesso da conservare.`,
          `Se avete una lista materiali su cui metterci alla prova, giratemela pure in risposta.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `grazie per avermi risposto. Lascio subito qui il collegamento riservato predisposto per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Aprendo la pagina potete consultare con 1 clic il portale B2B coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) e scaricare il Catalistino PDF completo dei vostri dati di accesso da tenere in archivio.`,
          `Per preventivi su distinta resto reperibile qui o su WhatsApp.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `grazie del cortese riscontro. Trovate qui il prospetto che ho abilitato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Dal collegamento potete entrare con 1 clic nel listino B2B netto (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}) oppure salvare il Catalistino PDF, che riporta stampati all’interno i vostri dati di accesso da conservare.`,
          `Se volete quotare qualche articolo specifico, scrivetemi pure in risposta.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `vi ringrazio per la risposta. Come anticipato, ecco la pagina riservata configurata per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da qui potete entrare subito con 1 clic nel portale coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) e scaricare il Catalistino PDF coi dati di accesso stampati dentro da conservare.`,
          `Resto a vostra disposizione ai recapiti in firma per ogni confronto.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `grazie per il rapido cenno. Ecco il collegamento diretto preparato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Aprendolo potete visionare con 1 clic l’intero catalogo B2B già scontato (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF, dove trovate anche i vostri dati di accesso da conservare.`,
          `Se preferite inviare una lista materiali, rispondetemi pure a questa mail.`,
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
    isDirectPerson: ctx.isDirectPerson,
  });

  const bodyText = `${polishBodyTypography(chosenParagraphs.join('\n\n'))}\n\n${signaturePlain}`
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
 * - 50-75 parole di corpo, concordanza automatica `Lei` / `voi` in minuscolo
 * - 1 SOLO link pulito (`smartCatalogUrl`), zero insistenza
 * - ZERO parola "Password" o "Username"
 */
export function generateStep2FollowupEmail(
  input: Step2FollowupEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);

  const variants = ctx.isDirectPerson
    ? [
        [
          ctx.greeting,
          `riprendo brevemente la mia mail dei giorni scorsi per lasciarle già attivo il prospetto preparato per ${ctx.companyClean}, consultabile quando preferisce senza dover rispondere:\n${ctx.smartCatalogUrl}`,
          `Aprendo il collegamento può entrare con 1 clic nel portale B2B coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo ordine, ${ctx.minOrderClean}) o scaricare il Catalistino PDF coi suoi dati di accesso da archiviare.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `aggiungo solo una breve nota alla mail dei giorni scorsi per lasciarle già attivo il collegamento dedicato per ${ctx.companyClean}, senza farle perdere tempo a rispondere:\n${ctx.smartCatalogUrl}`,
          `Da qui può consultare con 1 clic il listino B2B netto (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) oppure scaricare il Catalistino PDF dove trova stampati i dati di accesso da conservare.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `torno rapidamente sulla mia presentazione di qualche giorno fa solo per lasciarle agli atti la pagina predisposta per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Dal collegamento può aprire con 1 clic il catalogo B2B coi suoi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o salvare il Catalistino PDF completo dei dati di accesso da conservare.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `a completamento della mia precedente comunicazione, le lascio il riferimento operativo preparato per ${ctx.companyClean} così resta comodo da guardare in autonomia quando vuole:\n${ctx.smartCatalogUrl}`,
          `Aprendo la pagina può entrare con 1 clic nel portale coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}) e scaricare il Catalistino PDF coi suoi dati di accesso stampati all’interno.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `riprendo con discrezione la mail inviata qualche giorno fa per metterle subito a disposizione il prospetto B2B configurato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da questa pagina può visionare con 1 clic i listini netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) oppure scaricare il Catalistino PDF, che include i dati di accesso da tenere in archivio.`,
          `Buon proseguimento,`,
        ],
        [
          ctx.greeting,
          `le lascio in coda alla precedente mail il collegamento diretto ai listini riservati che ho configurato per ${ctx.companyClean}, consultabile liberamente senza impegno:\n${ctx.smartCatalogUrl}`,
          `Con 1 clic può aprire il portale completo (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF dove sono riportati anche i suoi dati di accesso da conservare.`,
          `Cordiali saluti,`,
        ],
      ]
    : [
        [
          ctx.greeting,
          `riprendo brevemente la mia mail dei giorni scorsi per lasciarvi già attivo il prospetto preparato per ${ctx.companyClean}, consultabile quando preferite senza dover rispondere:\n${ctx.smartCatalogUrl}`,
          `Aprendo il collegamento potete entrare con 1 clic nel portale B2B coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo ordine, ${ctx.minOrderClean}) o scaricare il Catalistino PDF coi vostri dati di accesso da archiviare.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `aggiungo solo una breve nota alla mail dei giorni scorsi per lasciarvi già attivo il collegamento dedicato per ${ctx.companyClean}, senza farvi perdere tempo a rispondere:\n${ctx.smartCatalogUrl}`,
          `Da qui potete consultare con 1 clic il listino B2B netto (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) oppure scaricare il Catalistino PDF dove trovate stampati i dati di accesso da conservare.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `torno rapidamente sulla mia presentazione di qualche giorno fa solo per lasciarvi agli atti la pagina predisposta per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Dal collegamento potete aprire con 1 clic il catalogo B2B coi vostri prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o salvare il Catalistino PDF completo dei dati di accesso da conservare.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `a completamento della mia precedente comunicazione, vi lascio il riferimento operativo preparato per ${ctx.companyClean} così resta comodo da guardare in autonomia quando volete:\n${ctx.smartCatalogUrl}`,
          `Aprendo la pagina potete entrare con 1 clic nel portale coi prezzi netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale ordine, ${ctx.minOrderClean}) e scaricare il Catalistino PDF coi vostri dati di accesso stampati all’interno.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `riprendo con discrezione la mail inviata qualche giorno fa per mettervi subito a disposizione il prospetto B2B configurato per ${ctx.companyClean}:\n${ctx.smartCatalogUrl}`,
          `Da questa pagina potete visionare con 1 clic i listini netti (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) oppure scaricare il Catalistino PDF, che include i dati di accesso da tenere in archivio.`,
          `Buon proseguimento,`,
        ],
        [
          ctx.greeting,
          `vi lascio in coda alla precedente mail il collegamento diretto ai listini riservati che ho configurato per ${ctx.companyClean}, consultabile liberamente senza impegno:\n${ctx.smartCatalogUrl}`,
          `Con 1 clic potete aprire il portale completo (${ctx.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${ctx.minOrderClean}) o scaricare il Catalistino PDF dove sono riportati anche i vostri dati di accesso da conservare.`,
          `Cordiali saluti,`,
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
    isDirectPerson: ctx.isDirectPerson,
  });

  const bodyText = `${polishBodyTypography(chosenParagraphs.join('\n\n'))}\n\n${signaturePlain}`
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
 * - ~45-60 parole di corpo, concordanza automatica `Lei` / `voi` in minuscolo
 * - ZERO link cliccabili (0 http/https/<a href>)
 * - ZERO parola "Password" o "Username"
 * - ZERO frasi di addio definitivo ("non invierò", "archiviare la pratica", "chiudo i ricontatti")
 */
export function generateStep3WarmFollowupEmail(
  input: Step3WarmFollowupEmailInput
): SdrSequenceEmailOutput {
  const ctx = resolveFollowupCommonContext(input);

  const variants = ctx.isDirectPerson
    ? [
        [
          ctx.greeting,
          `le lascio solo un rapido saluto in merito al listino condiviso con ${ctx.companyClean}.`,
          `Se per un cantiere in corso o per il magazzino vuole confrontare i nostri prezzi su una lista materiali specifica, mi risponda pure qui (o su WhatsApp al ${ctx.agentPhoneFinal}) e le preparo io un preventivo dedicato senza impegno.`,
          `Buon proseguimento,`,
        ],
        [
          ctx.greeting,
          `passo solo per un breve riscontro operativo sul prospetto predisposto per ${ctx.companyClean}.`,
          `Se ha in valutazione una distinta materiali o qualche articolo ad alta rotazione su cui mettere alla prova i nostri prezzi netti, me la giri pure qui in risposta o su WhatsApp al ${ctx.agentPhoneFinal} per un preventivo dedicato senza impegno.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `le scrivo una riga veloce in seguito ai riferimenti B2B condivisi con ${ctx.companyClean}.`,
          `Qualora voglia verificare la nostra convenienza su un elenco di codici elettrici, LED, fissaggio o utensileria, può girarmelo qui o su WhatsApp al ${ctx.agentPhoneFinal} e le invio in giornata una quotazione dedicata senza impegno.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `le invio un breve saluto riguardo al prospetto configurato per ${ctx.companyClean}.`,
          `Se per i prossimi acquisti preferisce un confronto rapido su una sua lista materiali anziché cercare i singoli codici a catalogo, mi scriva pure qui o su WhatsApp al ${ctx.agentPhoneFinal} e le preparo io un preventivo netto senza impegno.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `mi faccio vivo brevemente in merito ai listini d’ingrosso predisposti per ${ctx.companyClean}.`,
          `Se ha una commessa o un riassortimento da quotare, mi giri pure la lista articoli in risposta a questa mail o su WhatsApp al ${ctx.agentPhoneFinal}: le preparo volentieri un preventivo riservato e senza impegno.`,
          `Buon lavoro,`,
        ],
      ]
    : [
        [
          ctx.greeting,
          `vi lascio solo un rapido saluto in merito al listino condiviso con ${ctx.companyClean}.`,
          `Se per un cantiere in corso o per il magazzino volete confrontare i nostri prezzi su una lista materiali specifica, rispondetemi pure qui (o su WhatsApp al ${ctx.agentPhoneFinal}) e vi preparo io un preventivo dedicato senza impegno.`,
          `Buon proseguimento,`,
        ],
        [
          ctx.greeting,
          `passo solo per un breve riscontro operativo sul prospetto predisposto per ${ctx.companyClean}.`,
          `Se avete in valutazione una distinta materiali o qualche articolo ad alta rotazione su cui mettere alla prova i nostri prezzi netti, giratemela pure qui in risposta o su WhatsApp al ${ctx.agentPhoneFinal} per un preventivo dedicato senza impegno.`,
          `Un cordiale saluto,`,
        ],
        [
          ctx.greeting,
          `vi scrivo una riga veloce in seguito ai riferimenti B2B condivisi con ${ctx.companyClean}.`,
          `Qualora vogliate verificare la nostra convenienza su un elenco di codici elettrici, LED, fissaggio o utensileria, potete girarmelo qui o su WhatsApp al ${ctx.agentPhoneFinal} e vi invio in giornata una quotazione dedicata senza impegno.`,
          `Buon lavoro,`,
        ],
        [
          ctx.greeting,
          `vi invio un breve saluto riguardo al prospetto configurato per ${ctx.companyClean}.`,
          `Se per i prossimi acquisti preferite un confronto rapido su una vostra lista materiali anziché cercare i singoli codici a catalogo, scrivetemi pure qui o su WhatsApp al ${ctx.agentPhoneFinal} e vi preparo io un preventivo netto senza impegno.`,
          `Cordiali saluti,`,
        ],
        [
          ctx.greeting,
          `mi faccio vivo brevemente in merito ai listini d’ingrosso predisposti per ${ctx.companyClean}.`,
          `Se avete una commessa o un riassortimento da quotare, giratemi pure la lista articoli in risposta a questa mail o su WhatsApp al ${ctx.agentPhoneFinal}: vi preparo volentieri un preventivo riservato e senza impegno.`,
          `Buon lavoro,`,
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
    isDirectPerson: ctx.isDirectPerson,
  });

  // Nota: Step 3 non ha simboli %, né link
  const cleanBodyCore = polishBodyTypography(chosenParagraphs.join('\n\n'))
    .replace(/https?:\/\/[^\s<)"']+/gi, '')
    .replace(/(?<![@.-])\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<)"']*)?/gi, '')
    .replace(/\bpassword\b/gi, 'abilitazione riservata')
    .replace(/\busername\b/gi, 'profilo riservato')
    .replace(/(?<=[A-Za-zÀ-ÿ0-9])!+(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
    .replace(/[!*#]+/g, '')
    .replace(/\.+(?:srl|srls|spa|snc|sas)\b\.?/gi, '.')
    .replace(/\b((?:[A-Za-z0-9]{1,3}\.)+[A-Za-z0-9]{1,3})\s*\.{2,}\s*/g, '$1. ');
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
  areaBreve: string;
  sectorNoun: string;
  prodottiMirati: string;
  discountFormulaLabel: string;
  minOrderClean: string;
  smartCatalogUrl: string;
  agentPhoneFinal: string;
  cycleNumber: number;
  pronInd: string;
  possMP: string;
  verboPotere: string;
  verboTrovare: string;
  verboOperare: string;
  verboAvereFut: string;
  lasciarePron: string;
  segnalarePron: string;
  rispondereImp: string;
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
      `a distanza di qualche mese dal precedente contatto, ${v.pronInd} lascio la nuova edizione del Catalistino PDF per ${v.companyClean} con scorte e prezzi netti attuali:\n${v.smartCatalogUrl}`,
      `Dalla pagina ${v.verboPotere} entrare con 1 clic nel portale o scaricare il PDF aggiornato coi ${v.possMP} dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Buon lavoro,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[1],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo i riferimenti condivisi nei mesi scorsi con ${v.companyClean} per ${v.segnalarePron} le scorte aggiornate a magazzino ${v.areaBreve}:\n${v.smartCatalogUrl}`,
      `Dal collegamento ${v.verboPotere} aprire con 1 clic i listini netti per ${v.prodottiMirati} o scaricare il Catalistino PDF coi dati di accesso (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[2],
    buildParagraphs: (v) => [
      v.greeting,
      `a qualche mese dal nostro ultimo messaggio, condivido con ${v.companyClean} il riepilogo degli articoli ad alta rotazione pronti a stock per ${v.sectorNoun}:\n${v.smartCatalogUrl}`,
      `Da qui ${v.verboPotere} aprire con 1 clic il portale B2B o scaricare il Catalistino PDF aggiornato coi ${v.possMP} dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[3],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo con discrezione il contatto dei mesi scorsi con ${v.companyClean} per gli acquisti ${v.areaBreve}, lasciando il nuovo Catalistino PDF per ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Dalla pagina ${v.verboPotere} entrare con 1 clic nel portale o scaricare il PDF coi dati di accesso interni (${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Buon lavoro,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[4],
    buildParagraphs: (v) => [
      v.greeting,
      `dopo alcuni mesi dal precedente contatto, lascio un promemoria per ${v.companyClean}: quotiamo in giornata liste materiali per ${v.sectorNoun}, e qui ${v.verboTrovare} il nuovo Catalistino PDF:\n${v.smartCatalogUrl}`,
      `Scaricando il file ${v.verboAvereFut} i prezzi netti attuali e i ${v.possMP} dati di accesso da conservare, oltre all’ingresso con 1 clic al portale (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[5],
    buildParagraphs: (v) => [
      v.greeting,
      `in seguito ai riferimenti condivisi nei mesi passati con ${v.companyClean}, ${v.pronInd} lascio la nuova edizione trimestrale del Catalistino PDF per ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Dal collegamento ${v.verboPotere} aprire con 1 clic il portale B2B o salvare il documento coi dati di accesso interni (${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[6],
    buildParagraphs: (v) => [
      v.greeting,
      `a oltre un trimestre dal precedente contatto, condivido con ${v.companyClean} i prezzi netti aggiornati sui riassortimenti di ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Aprendo la pagina ${v.verboPotere} entrare con 1 clic nel catalogo B2B o scaricare il Catalistino PDF coi ${v.possMP} dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Buon proseguimento,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[7],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo il filo dei contatti dei mesi scorsi con ${v.companyClean} per ${v.lasciarePron} il prospetto trimestrale dedicato al comparto ${v.sectorNoun}, anche a colli piccoli:\n${v.smartCatalogUrl}`,
      `Da qui ${v.verboPotere} consultare con 1 clic i prezzi netti o scaricare il Catalistino PDF aggiornato coi dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale ordine, ${v.minOrderClean}.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[8],
    buildParagraphs: (v) => [
      v.greeting,
      `dopo qualche mese dal precedente messaggio, lascio per ${v.companyClean} un promemoria come secondo fornitore B2B ${v.areaBreve} per ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Dalla pagina ${v.verboPotere} visionare con 1 clic il portale o scaricare il Catalistino PDF aggiornato coi ${v.possMP} dati di accesso (${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Cordialmente,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[9],
    buildParagraphs: (v) => [
      v.greeting,
      `torno con sobrietà sui riferimenti condivisi nei mesi scorsi con ${v.companyClean}, come canale B2B pronto per urgenze e integrazioni di scorta:\n${v.smartCatalogUrl}`,
      `Dal collegamento ${v.verboPotere} entrare con 1 clic nei listini per ${v.prodottiMirati} o salvare il Catalistino PDF coi dati di accesso interni (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Buon lavoro,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[10],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di alcuni mesi dal precedente contatto con ${v.companyClean}, ${v.pronInd} lascio il collegamento alle nostre linee B2B a margine protetto per Partite IVA:\n${v.smartCatalogUrl}`,
      `Da qui ${v.verboPotere} entrare con 1 clic nei listini per ${v.prodottiMirati} o scaricare il Catalistino PDF coi dati di accesso da conservare (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[11],
    buildParagraphs: (v) => [
      v.greeting,
      `facendo seguito al contatto dei mesi precedenti, condivido con ${v.companyClean} la revisione trimestrale del Catalistino PDF con giacenze e prezzi netti allineati ad oggi:\n${v.smartCatalogUrl}`,
      `Dalla pagina ${v.verboPotere} entrare con 1 clic nel portale per ${v.sectorNoun} o scaricare il documento coi ${v.possMP} dati di accesso interni (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[12],
    buildParagraphs: (v) => [
      v.greeting,
      `a qualche mese dal nostro precedente invio, lascio per ${v.companyClean} il prospetto prezzi netti B2B del trimestre per ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Aprendo il collegamento ${v.verboPotere} consultare con 1 clic il catalogo o scaricare il Catalistino PDF aggiornato coi dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Buon lavoro,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[13],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo brevemente il contatto dei mesi scorsi con ${v.companyClean} per ${v.lasciarePron} in archivio la nuova edizione del Catalistino PDF coi prezzi già scontati:\n${v.smartCatalogUrl}`,
      `Scaricando il documento ${v.verboTrovare} stampati i ${v.possMP} dati di accesso (oltre all’ingresso con 1 clic al portale B2B) con lo sconto ${v.discountFormulaLabel} a cascata sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Un cordiale saluto,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[14],
    buildParagraphs: (v) => [
      v.greeting,
      `a distanza di qualche mese dalla precedente nota per ${v.companyClean}, ${v.pronInd} segnalo scorte e listini netti attuali per ${v.prodottiMirati}:\n${v.smartCatalogUrl}`,
      `Dalla pagina riservata ${v.verboPotere} entrare con 1 clic nel portale B2B o scaricare il Catalistino PDF coi dati di accesso e lo sconto ${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}.`,
      `Cordiali saluti,`,
    ],
  },
  {
    ...QUARTERLY_LOOP_TEMPLATES[15],
    buildParagraphs: (v) => [
      v.greeting,
      `riprendo con garbo i contatti dei mesi scorsi verso ${v.companyClean} per ${v.lasciarePron} il quadro dell’assortimento pronto a stock ${v.areaBreve}:\n${v.smartCatalogUrl}`,
      `Dal collegamento ${v.verboPotere} verificare con 1 clic i prezzi netti per ${v.prodottiMirati} o salvare il Catalistino PDF coi ${v.possMP} dati di accesso (${v.discountFormulaLabel} sul primo eventuale acquisto, ${v.minOrderClean}).`,
      `Buon lavoro,`,
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
 * - 55-75 parole di corpo, concordanza automatica `Lei` / `voi` in minuscolo
 * - Anti-ripetizione matematica tramite `usedLoopTemplateCodes`
 * - Oggetto: `Re: <originalSubject pulito da doppi Re:>`
 * - 1 SOLO link pulito (`smartCatalogUrl`) in tutta l'email
 * - ZERO parola "Password" o "Username"
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
      city: formatItalianCityName(input.city) || null,
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
  ) as ExtendedProspectIntel;

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

  const isDirect = Boolean(intel.isDirectPerson ?? intel.decisionMakerClean);
  const companySafe = normalizeCompanyTypography(
    sanitizeLoopInlineFragment(intel.companyBodyShort || intel.companyClean) || 'la vostra azienda'
  );
  const greeting = buildModernGreetingFallback(
    intel.decisionMakerClean,
    intel.salutoModerno,
    (len) => pickIndex(len, cycleSeedCursor)
  );

  const cleanLoopCity = formatItalianCityName(sanitizeLoopInlineFragment(intel.cityClean));
  const loopCompanyHasCity =
    cleanLoopCity.length >= 3 &&
    companySafe.toLowerCase().includes(cleanLoopCity.toLowerCase());
  const areaBreve =
    cleanLoopCity && !loopCompanyHasCity
      ? startsWithItalianArticleEngine(cleanLoopCity)
        ? `in zona ${cleanLoopCity}`
        : `su ${cleanLoopCity}`
      : 'sul territorio';

  const prodottiMiratiRaw = (
    (intel.prodottiMiratiBrevi || '').trim() ||
    buildFallbackProdottiMirati(intel.cluster, intel.civilBrandMatched)
  ).replace(/\bserie\s+civile\s+estetica\b/gi, 'serie civile');

  const renderVars: QuarterlyLoopRenderVars = {
    greeting,
    companyClean: companySafe,
    areaBreve,
    sectorNoun: sanitizeLoopInlineFragment(intel.sectorNoun) || 'forniture tecniche',
    prodottiMirati: sanitizeLoopInlineFragment(prodottiMiratiRaw),
    discountFormulaLabel: ctx.discountFormulaLabel,
    minOrderClean: sanitizeLoopInlineFragment(ctx.minOrderClean) || 'senza minimo d’ordine',
    smartCatalogUrl: ctx.smartCatalogUrl,
    agentPhoneFinal: ctx.agentPhoneFinal,
    cycleNumber: resolvedCycle,
    pronInd: isDirect ? 'le' : 'vi',
    possMP: isDirect ? 'suoi' : 'vostri',
    verboPotere: isDirect ? 'può' : 'potete',
    verboTrovare: isDirect ? 'trova' : 'trovate',
    verboOperare: isDirect ? 'opera' : 'operate',
    verboAvereFut: isDirect ? 'avrà' : 'avrete',
    lasciarePron: isDirect ? 'lasciarle' : 'lasciarvi',
    segnalarePron: isDirect ? 'segnalarle' : 'segnalarvi',
    rispondereImp: isDirect ? 'mi risponda pure' : 'rispondetemi pure',
  };

  const rawParagraphs = chosenTpl.buildParagraphs(renderVars);

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
    isDirectPerson: isDirect,
  });

  const bodyText = `${sanitizedCore}\n\n${signaturePlain}`
    .replace(/\bpassword\b/gi, 'chiave riservata')
    .replace(/\busername\b/gi, 'profilo riservato');

  const bodyHtml = renderMinimalOutlookHtmlFromPlain(bodyText, {
    singleAllowedUrl: ctx.smartCatalogUrl,
  });

  const updatedUsedLoopTemplateCodes = [...normalizedUsed, chosenTpl.code];

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
