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
 * Popola in modo idempotente le 100 email madri e i 108 gruppi di parole dinamiche nel DB SDR.
 * Con `overwriteDefaults: true` riallinea tutte le 100 Email Madri (targetCategory = ALL)
 * e tutti i 108 gruppi lessicali ufficiali di Izzo Distribuzione S.r.l.
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

function renderCredentialsPlainBlock(vars: {
  boxTitle: string;
  isReseller: boolean;
  discountFormulaLabel: string;
  loginUrl: string;
  labelUsername: string;
  username: string;
  labelPassword: string;
  tempPasswordPlain: string;
  minOrderAmountText: string;
  smartCatalogUrl?: string | null;
  customCommercialNotes?: string | null;
}): string {
  const conditionLine = vars.isReseller
    ? `listino rivendita ${vars.discountFormulaLabel} a cascata, ${vars.minOrderAmountText.toLowerCase()}`
    : `sconto riservato ${vars.discountFormulaLabel} a cascata, ${vars.minOrderAmountText.toLowerCase()}`;

  const rows = [
    `${vars.boxTitle}:`,
    `- Portale B2B: ${vars.loginUrl}`,
    `- ${vars.labelUsername}: ${vars.username}`,
    `- ${vars.labelPassword}: ${vars.tempPasswordPlain}`,
    vars.smartCatalogUrl
      ? `- Estratto Catalistino PDF: ${vars.smartCatalogUrl}`
      : '',
    `- Condizione 1° ordine: ${conditionLine}`,
    vars.customCommercialNotes ? `- Nota commerciale: ${vars.customCommercialNotes}` : '',
  ].filter(Boolean);

  return rows.join('\n');
}

function renderCredentialsHtmlBlock(
  variant: HtmlLayoutVariant,
  vars: {
    boxTitle: string;
    ctaLabel: string;
    companyName: string;
    isReseller: boolean;
    discountFormulaLabel: string;
    loginUrl: string;
    labelUsername: string;
    username: string;
    labelPassword: string;
    tempPasswordPlain: string;
    minOrderAmountText: string;
    smartCatalogUrl?: string | null;
    customCommercialNotes?: string | null;
  }
): string {
  const conditionLine = vars.isReseller
    ? `listino rivendita ${vars.discountFormulaLabel} a cascata, ${vars.minOrderAmountText.toLowerCase()}`
    : `sconto riservato ${vars.discountFormulaLabel} a cascata, ${vars.minOrderAmountText.toLowerCase()}`;

  const ctaHtml = vars.smartCatalogUrl
    ? `<div style="margin: 12px 0 2px 0;">
        <a href="${escapeHtml(vars.smartCatalogUrl)}" target="_blank" rel="noopener" style="display: inline-block; background: ${
          variant === 'accent_stripe'
            ? '#1e3a8a'
            : variant === 'clean_table'
              ? '#166534'
              : variant === 'compact_memo'
                ? '#334155'
                : '#0f172a'
        }; color: #ffffff; font-weight: 600; text-decoration: none; padding: 9px 16px; border-radius: 5px; font-size: 13px;">
          ${escapeHtml(vars.ctaLabel)}
        </a>
      </div>`
    : '';

  if (variant === 'plain_personal') {
    return `<div style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #334155; background: #f8fafc; font-size: 13.8px; line-height: 1.65;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)}:</div>
      <div>• <strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #0f172a; font-weight: 600;">https://www.izzodistribuzione.it/login</a></div>
      <div>• <strong>${escapeHtml(vars.labelUsername)}:</strong> <code>${escapeHtml(vars.username)}</code></div>
      <div>• <strong>${escapeHtml(vars.labelPassword)}:</strong> <code>${escapeHtml(vars.tempPasswordPlain)}</code></div>
      ${vars.smartCatalogUrl ? `<div>• <strong>Estratto Catalistino PDF:</strong> <a href="${escapeHtml(vars.smartCatalogUrl)}" style="color: #0f172a;">${escapeHtml(vars.smartCatalogUrl)}</a></div>` : ''}
      <div>• <strong>Condizione 1° ordine:</strong> ${escapeHtml(conditionLine)}</div>
      ${vars.customCommercialNotes ? `<div>• <strong>Nota:</strong> ${escapeHtml(vars.customCommercialNotes)}</div>` : ''}
    </div>`;
  }

  if (variant === 'compact_memo') {
    return `<div style="margin: 15px 0; padding: 14px 16px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc;">
      <div style="font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}</div>
      <div style="font-size: 13.5px; line-height: 1.65;">
        <strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #1e293b; font-weight: 600;">www.izzodistribuzione.it/login</a><br/>
        <strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code> &nbsp;|&nbsp;
        <strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code><br/>
        <strong>Condizione 1° ordine:</strong> ${escapeHtml(conditionLine)}
      </div>
      ${ctaHtml}
    </div>`;
  }

  if (variant === 'accent_stripe') {
    return `<div style="margin: 16px 0; border: 1px solid #cbd5e1; border-top: 3px solid #1e3a8a; border-radius: 6px; padding: 15px 16px; background: #f8fafc; font-size: 13.8px; line-height: 1.65;">
      <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)}</div>
      <div><strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #1e3a8a; font-weight: 600;">https://www.izzodistribuzione.it/login</a></div>
      <div><strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code></div>
      <div><strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code></div>
      <div><strong>Condizione 1° ordine:</strong> ${escapeHtml(conditionLine)}</div>
      ${vars.customCommercialNotes ? `<div><strong>Nota:</strong> ${escapeHtml(vars.customCommercialNotes)}</div>` : ''}
      ${ctaHtml}
    </div>`;
  }

  if (variant === 'clean_table') {
    return `<div style="margin: 16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 13.5px;">
        <tr style="background: #f1f5f9;">
          <td colspan="2" style="padding: 8px 12px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1;">
            ${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; width: 36%;">Portale B2B</td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0;"><a href="${escapeHtml(vars.loginUrl)}" style="color: #166534; font-weight: 600;">www.izzodistribuzione.it/login</a></td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${escapeHtml(vars.labelUsername)}</td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0;"><code>${escapeHtml(vars.username)}</code></td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${escapeHtml(vars.labelPassword)}</td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0;"><code>${escapeHtml(vars.tempPasswordPlain)}</code></td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; color: #475569;">Condizione 1° ordine</td>
          <td style="padding: 7px 12px; color: #0f172a; font-weight: 600;">${escapeHtml(conditionLine)}</td>
        </tr>
      </table>
      ${ctaHtml}
    </div>`;
  }

  // Default: executive_card
  return `<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0f172a; border-radius: 6px; padding: 15px 16px; margin: 16px 0; font-size: 13.8px; line-height: 1.65;">
    <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}</div>
    <div>• <strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #0f172a; font-weight: 600;">https://www.izzodistribuzione.it/login</a></div>
    <div>• <strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code></div>
    <div>• <strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code></div>
    <div>• <strong>Condizione 1° ordine:</strong> ${escapeHtml(conditionLine)}</div>
    ${vars.customCommercialNotes ? `<div>• <strong>Nota:</strong> ${escapeHtml(vars.customCommercialNotes)}</div>` : ''}
    ${ctaHtml}
  </div>`;
}

function formatTextBlockToHtml(blockText: string): string {
  const lines = blockText.split('\n').map((l) => l.trim()).filter(Boolean);
  const allBullets = lines.length > 0 && lines.every((l) => /^[-•]\s+/.test(l));
  if (allBullets) {
    const items = lines
      .map((l) => {
        const content = escapeHtml(l.replace(/^[-•]\s+/, '')).replace(
          /\*\*([^*]+)\*\*/g,
          '<strong>$1</strong>'
        );
        return `<li style="margin-bottom: 6px;">${content}</li>`;
      })
      .join('\n');
    return `<ul style="margin: 8px 0 14px 0; padding-left: 20px;">\n${items}\n</ul>`;
  }

  // Blocco misto intro + elenco puntato nello stesso paragrafo
  const firstBulletIdx = lines.findIndex((l) => /^[-•]\s+/.test(l));
  if (firstBulletIdx > 0) {
    const introLines = lines.slice(0, firstBulletIdx);
    const bulletLines = lines.slice(firstBulletIdx);
    if (bulletLines.every((l) => /^[-•]\s+/.test(l))) {
      const introHtml = escapeHtml(introLines.join('\n'))
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      const items = bulletLines
        .map((l) => {
          const content = escapeHtml(l.replace(/^[-•]\s+/, '')).replace(
            /\*\*([^*]+)\*\*/g,
            '<strong>$1</strong>'
          );
          return `<li style="margin-bottom: 6px;">${content}</li>`;
        })
        .join('\n');
      return `<p style="margin: 0 0 8px 0;">${introHtml}</p>\n<ul style="margin: 4px 0 14px 0; padding-left: 20px;">\n${items}\n</ul>`;
    }
  }

  const formatted = escapeHtml(blockText)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return `<p style="margin: 0 0 12px 0;">${formatted}</p>`;
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

  const boxTitle = drawTokenValue('TITOLO_BOX_OFFERTA');
  const ctaLabel = drawTokenValue('CTA_BOTTONE_PDF');
  const labelUsername = drawTokenValue('LABEL_USERNAME');
  const labelPassword = drawTokenValue('LABEL_PASSWORD');
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

  const rawAgentEmail = (input.agentEmail || '').trim();
  const agentEmailFinal =
    rawAgentEmail &&
    !rawAgentEmail.toLowerCase().includes('noreply') &&
    !rawAgentEmail.toLowerCase().startsWith('info@')
      ? rawAgentEmail
      : 'daniele.savoia@izzodistribuzione.com';

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
  const cleanCustomNotes = input.customCommercialNotes
    ? sanitizeExternalCopy(input.customCommercialNotes, '')
    : null;

  const loginUrl = `https://www.izzodistribuzione.it/login?u=${encodeURIComponent(input.username)}`;

  const resolveClientVariables = (txt: string, credentialsPlaceholder: string): string => {
    const map: Record<string, string> = {
      COMPANY_NAME: intel.companyClean,
      SALUTO_PERSONALIZZATO: intel.salutoPersonalizzato,
      INTESTAZIONE_OGGETTO: intel.intestazioneOggetto,
      FRASE_CONTESTO_DB: intel.fraseContestoDb,
      INCISO_CONTESTO_DB: intel.incisoContestoDb,
      SCOPO_FORNITURA_SETTORE: intel.scopoFornituraSettore,
      LINEE_PRODOTTI_IZZO: intel.lineeProdottiIzzo,
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
      OFFER_TITLE: cleanOfferTitle,
      MIN_ORDER_TEXT: cleanMinOrderText,
      SHIPPING_TEXT: cleanFreeShippingText,
      PAYMENT_TERMS_TEXT: sanitizeExternalCopy(
        input.paymentTermsText,
        'Condizioni B2B riservate'
      ),
      LOGIN_URL: loginUrl,
      USERNAME: input.username,
      TEMP_PASSWORD: input.tempPasswordPlain,
      SMART_CATALOG_URL: input.smartCatalogUrl || loginUrl,
      AGENT_NAME: agentDisplayName,
      AGENT_PHONE: agentPhoneFinal,
      AGENT_EMAIL: agentEmailFinal,
      CREDENTIALS_BLOCK: credentialsPlaceholder,
    };

    return txt.replace(/\{([A-Z0-9_]+)\}/g, (full, varName: string) => {
      return Object.prototype.hasOwnProperty.call(map, varName) ? map[varName] : full;
    });
  };

  // Sintesi Oggetto
  const rawSubjectWithTokens = replaceDynamicTokens(chosenTemplate.subjectTemplate);
  const resolvedSubject = polishSubjectTypography(
    resolveClientVariables(rawSubjectWithTokens, '')
  );

  // Sintesi Corpo
  let rawBodyTemplate = chosenTemplate.bodyTemplate;
  if (!rawBodyTemplate.includes('{CREDENTIALS_BLOCK}')) {
    rawBodyTemplate = `${rawBodyTemplate.trim()}\n\n{CREDENTIALS_BLOCK}`;
  }
  const bodyAfterTokens = replaceDynamicTokens(rawBodyTemplate);

  const plainCredentials = renderCredentialsPlainBlock({
    boxTitle,
    isReseller: intel.isReseller,
    discountFormulaLabel,
    loginUrl,
    labelUsername,
    username: input.username,
    labelPassword,
    tempPasswordPlain: input.tempPasswordPlain,
    minOrderAmountText: cleanMinOrderText,
    smartCatalogUrl: input.smartCatalogUrl,
    customCommercialNotes: cleanCustomNotes,
  });

  const resolvedBodyCore = polishBodyTypography(
    resolveClientVariables(bodyAfterTokens, plainCredentials)
  );

  const signaturePlainLines = [
    '',
    agentDisplayName,
    `${firmaReparto} — Izzo Distribuzione S.r.l.`,
    `Tel / WhatsApp: ${agentPhoneFinal} — Email: ${agentEmailFinal}`,
    `Portale B2B: https://www.izzodistribuzione.it`,
    `Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049`,
    '',
    optOutNote,
  ];

  const bodyText = `${resolvedBodyCore}\n${signaturePlainLines.join('\n')}`;

  // Sintesi HTML con 5 layout istituzionali
  const layoutVariant = (
    ['executive_card', 'plain_personal', 'compact_memo', 'accent_stripe', 'clean_table'].includes(
      chosenTemplate.htmlLayoutVariant
    )
      ? chosenTemplate.htmlLayoutVariant
      : 'executive_card'
  ) as HtmlLayoutVariant;

  const htmlSentinel = '___SDR_HTML_CREDENTIALS_SLOT___';
  const bodyForHtmlCore = polishBodyTypography(
    resolveClientVariables(bodyAfterTokens, htmlSentinel)
  );

  const htmlCredentials = renderCredentialsHtmlBlock(layoutVariant, {
    boxTitle,
    ctaLabel,
    companyName: intel.companyClean,
    isReseller: intel.isReseller,
    discountFormulaLabel,
    loginUrl,
    labelUsername,
    username: input.username,
    labelPassword,
    tempPasswordPlain: input.tempPasswordPlain,
    minOrderAmountText: cleanMinOrderText,
    smartCatalogUrl: input.smartCatalogUrl,
    customCommercialNotes: cleanCustomNotes,
  });

  const htmlParagraphs = bodyForHtmlCore
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed === htmlSentinel) return htmlCredentials;
      if (trimmed.includes(htmlSentinel)) {
        const parts = trimmed.split(htmlSentinel);
        return parts
          .map((part, idx) => {
            const pClean = part.trim();
            const pHtml = pClean ? formatTextBlockToHtml(pClean) : '';
            return idx < parts.length - 1 ? `${pHtml}${htmlCredentials}` : pHtml;
          })
          .join('\n');
      }
      return formatTextBlockToHtml(trimmed);
    })
    .filter(Boolean)
    .join('\n');

  const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.62; max-width: 650px; font-size: 14.5px;">
  ${htmlParagraphs}
  <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 13.5px; line-height: 1.55; color: #1e293b;">
    <strong style="color: #0f172a; font-size: 14.5px;">${escapeHtml(agentDisplayName)}</strong><br/>
    <span>${escapeHtml(firmaReparto)} — <strong>Izzo Distribuzione S.r.l.</strong></span><br/>
    <span>Tel / WhatsApp: <a href="tel:${escapeHtml(agentPhoneFinal.replace(/\s+/g, ''))}" style="color: #0f172a; text-decoration: none;">${escapeHtml(agentPhoneFinal)}</a> — Email: <a href="mailto:${escapeHtml(agentEmailFinal)}" style="color: #0f172a; text-decoration: none;">${escapeHtml(agentEmailFinal)}</a></span><br/>
    <span>Portale B2B: <a href="https://www.izzodistribuzione.it" target="_blank" rel="noopener" style="color: #0f172a; font-weight: 600; text-decoration: none;">https://www.izzodistribuzione.it</a></span><br/>
    <span style="display: inline-block; margin-top: 4px; font-size: 12px; color: #475569;">Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049</span>
  </div>
  <p style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b;">
    ${escapeHtml(optOutNote)}
  </p>
</div>`;

  const cleanPlainText = bodyText.replace(/\*\*([^*]+)\*\*/g, '$1');

  return {
    subject: resolvedSubject,
    bodyText: cleanPlainText,
    bodyHtml,
    discountFormulaLabel,
    templateCode: chosenTemplate.code,
    templateName: chosenTemplate.name,
    angleGroup: chosenTemplate.angleGroup,
    htmlLayoutVariant: layoutVariant,
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

/**
 * Motore Combinatorio Principale DB-backed (100 Email Madri × 108 Gruppi di Parole Dinamiche + Intelligence DB Prospect).
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
