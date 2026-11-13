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
 */
export async function seedCombinatorialLibraryInDb(options?: {
  syncMissing?: boolean;
}): Promise<{ templatesCount: number; tokensCount: number }> {
  const syncMissing = options?.syncMissing ?? true;

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
        targetCategory: tpl.targetCategory,
        htmlLayoutVariant: tpl.htmlLayoutVariant,
        subjectTemplate: tpl.subjectTemplate,
        bodyTemplate: tpl.bodyTemplate,
        isActive: true,
      })),
      skipDuplicates: true,
    });
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

    // Garantisce copertura anche di eventuali token standard non ancora presenti
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

  // Media prudenziale: ~20 slot dinamici sostituiti per singola email
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

function polishSubjectTypography(rawSubject: string): string {
  const cleaned = rawSubject
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function polishBodyTypography(rawBody: string): string {
  const lines = rawBody.split('\n').map((line) =>
    line
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

function renderCredentialsPlainBlock(vars: {
  boxTitle: string;
  companyName: string;
  offerTitle: string;
  discountFormulaLabel: string;
  effectiveNetPct: number;
  loginUrl: string;
  labelUsername: string;
  username: string;
  labelPassword: string;
  tempPasswordPlain: string;
  minOrderAmountText: string;
  freeShippingText: string;
  smartCatalogUrl?: string | null;
  customCommercialNotes?: string | null;
  agentName: string;
  agentCode: string;
}): string {
  const rows = [
    `--- ${vars.boxTitle} (${vars.companyName.toUpperCase()}) ---`,
    `• Offerta attiva: ${vars.offerTitle}`,
    `• Sconto 1° Acquisto (Solo Pronta Consegna 2gg): ${vars.discountFormulaLabel} in cascata (${vars.effectiveNetPct}% netto da listino)`,
    `• Portale B2B: ${vars.loginUrl}`,
    `• ${vars.labelUsername}: ${vars.username}`,
    `• ${vars.labelPassword}: ${vars.tempPasswordPlain}`,
    `• Minimo d'ordine: ${vars.minOrderAmountText}`,
    `• Spedizione: ${vars.freeShippingText}`,
    `• Referente dedicato: ${vars.agentName} (Cod. ${vars.agentCode})`,
    vars.smartCatalogUrl
      ? `• Catalistino PDF Riservato 2gg: ${vars.smartCatalogUrl}`
      : '',
    vars.customCommercialNotes ? `• Nota dedicata: ${vars.customCommercialNotes}` : '',
  ].filter(Boolean);

  return rows.join('\n');
}

function renderCredentialsHtmlBlock(
  variant: HtmlLayoutVariant,
  vars: {
    boxTitle: string;
    ctaLabel: string;
    companyName: string;
    offerTitle: string;
    discountFormulaLabel: string;
    effectiveNetPct: number;
    loginUrl: string;
    labelUsername: string;
    username: string;
    labelPassword: string;
    tempPasswordPlain: string;
    minOrderAmountText: string;
    freeShippingText: string;
    smartCatalogUrl?: string | null;
    customCommercialNotes?: string | null;
    agentName: string;
    agentCode: string;
  }
): string {
  const ctaHtml = vars.smartCatalogUrl
    ? `<div style="margin: 14px 0 4px 0;">
        <a href="${escapeHtml(vars.smartCatalogUrl)}" target="_blank" rel="noopener" style="display: inline-block; background: ${
          variant === 'accent_stripe'
            ? '#1d4ed8'
            : variant === 'clean_table'
              ? '#15803d'
              : variant === 'compact_memo'
                ? '#b45309'
                : '#0f172a'
        }; color: #ffffff; font-weight: 700; text-decoration: none; padding: 11px 18px; border-radius: 7px; font-size: 13.5px;">
          ${escapeHtml(vars.ctaLabel)}
        </a>
      </div>`
    : '';

  if (variant === 'plain_personal') {
    return `<div style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #334155; background: #f8fafc;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}</div>
      <div>• <strong>Sconto 1° Acquisto (Solo 2gg):</strong> ${escapeHtml(vars.discountFormulaLabel)} (${vars.effectiveNetPct}% netto)</div>
      <div>• <strong>Accesso Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #0f172a; font-weight: 700;">www.izzodistribuzione.it/login</a></div>
      <div>• <strong>${escapeHtml(vars.labelUsername)}:</strong> <code>${escapeHtml(vars.username)}</code></div>
      <div>• <strong>${escapeHtml(vars.labelPassword)}:</strong> <code>${escapeHtml(vars.tempPasswordPlain)}</code></div>
      <div>• <strong>Condizioni:</strong> ${escapeHtml(vars.minOrderAmountText)} — ${escapeHtml(vars.freeShippingText)}</div>
      ${vars.customCommercialNotes ? `<div>• <strong>Nota:</strong> ${escapeHtml(vars.customCommercialNotes)}</div>` : ''}
      ${ctaHtml}
    </div>`;
  }

  if (variant === 'compact_memo') {
    return `<div style="margin: 15px 0; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fffbeb;">
      <div style="font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">${escapeHtml(vars.boxTitle)}</div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${escapeHtml(vars.companyName)} — Sconto ${escapeHtml(vars.discountFormulaLabel)} su Pronta Consegna 2gg</div>
      <div style="font-size: 13.5px; line-height: 1.55;">
        <strong>Portale:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #b45309; font-weight: 700;">www.izzodistribuzione.it/login</a><br/>
        <strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#fef3c7;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code> &nbsp;|&nbsp;
        <strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#fef3c7;padding:1px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code><br/>
        <span style="color:#475569;font-size:12.5px;">${escapeHtml(vars.minOrderAmountText)} • ${escapeHtml(vars.freeShippingText)}</span>
      </div>
      ${ctaHtml}
    </div>`;
  }

  if (variant === 'accent_stripe') {
    return `<div style="margin: 18px 0; border: 1px solid #bfdbfe; border-top: 4px solid #1d4ed8; border-radius: 8px; padding: 16px; background: #f8fafc;">
      <div style="font-weight: 800; color: #1e40af; font-size: 14.5px; margin-bottom: 4px;">${escapeHtml(vars.boxTitle)}</div>
      <div style="font-size: 13px; color: #334155; margin-bottom: 10px;">${escapeHtml(vars.offerTitle)} — <strong>${escapeHtml(vars.discountFormulaLabel)}</strong> (${vars.effectiveNetPct}% netto su stock 2gg)</div>
      <div><strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #1d4ed8; font-weight: 700;">www.izzodistribuzione.it/login</a></div>
      <div><strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#dbeafe;padding:2px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code></div>
      <div><strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#dbeafe;padding:2px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code></div>
      <div style="margin-top: 8px; font-size: 12.5px; color: #475569;">${escapeHtml(vars.minOrderAmountText)} • ${escapeHtml(vars.freeShippingText)} • Ref. ${escapeHtml(vars.agentName)}</div>
      ${ctaHtml}
    </div>`;
  }

  if (variant === 'clean_table') {
    return `<div style="margin: 18px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 13.5px;">
        <tr style="background: #f1f5f9;">
          <td colspan="2" style="padding: 9px 12px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1;">${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}</td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; width: 38%;">Sconto 1° Acquisto (Solo 2gg)</td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #15803d;">${escapeHtml(vars.discountFormulaLabel)} (${vars.effectiveNetPct}% netto)</td>
        </tr>
        <tr>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">Portale B2B</td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0;"><a href="${escapeHtml(vars.loginUrl)}" style="color: #15803d; font-weight: 700;">www.izzodistribuzione.it/login</a></td>
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
          <td style="padding: 7px 12px; color: #475569;">Condizioni &amp; Consegna</td>
          <td style="padding: 7px 12px; color: #334155;">${escapeHtml(vars.minOrderAmountText)} • ${escapeHtml(vars.freeShippingText)}</td>
        </tr>
      </table>
      ${ctaHtml}
    </div>`;
  }

  // Default: executive_card
  return `<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 18px 0;">
    <div style="font-weight: 800; color: #15803d; font-size: 14.5px; margin-bottom: 4px;">${escapeHtml(vars.boxTitle)} — ${escapeHtml(vars.companyName)}</div>
    <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 10px;">${escapeHtml(vars.offerTitle)} — Sconto ${escapeHtml(vars.discountFormulaLabel)} (${vars.effectiveNetPct}% netto)</div>
    <div><strong>Portale B2B:</strong> <a href="${escapeHtml(vars.loginUrl)}" style="color: #15803d; font-weight: 700;">www.izzodistribuzione.it/login</a></div>
    <div><strong>${escapeHtml(vars.labelUsername)}:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(vars.username)}</code></div>
    <div><strong>${escapeHtml(vars.labelPassword)}:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(vars.tempPasswordPlain)}</code></div>
    <div style="margin-top: 10px; font-size: 13px; color: #334155;">
      • <strong>Sconto Attivo 1° Acquisto:</strong> <strong>${escapeHtml(vars.discountFormulaLabel)}</strong> automatico a carrello sui prodotti in <strong>Pronta Consegna 2gg</strong><br/>
      • <strong>Condizione Ordine:</strong> ${escapeHtml(vars.minOrderAmountText)}<br/>
      • <strong>Consegna:</strong> ${escapeHtml(vars.freeShippingText)}<br/>
      • <strong>Referente:</strong> ${escapeHtml(vars.agentName)} (Cod. ${escapeHtml(vars.agentCode)})
      ${vars.customCommercialNotes ? `<br/>• <strong>Nota:</strong> ${escapeHtml(vars.customCommercialNotes)}` : ''}
    </div>
    ${ctaHtml}
  </div>`;
}

function executeCombinatorialSynthesis(
  library: CachedLibrary,
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): CombinatorialEmailResult & { chosenTemplateId?: number } {
  const catCfg = resolveClusterConfig(input.categoryCluster);
  const commercialCategory = catCfg.commercialCategory;
  const discountFormulaLabel = `${input.baseDiscount}% + ${input.extraFirstPurchasePct}%`;
  const effectiveNetPct = Number(
    (100 - (100 - input.baseDiscount) * (1 - input.extraFirstPurchasePct / 100)).toFixed(1)
  );

  const seedCursor =
    typeof options?.deterministicSeed === 'number'
      ? { val: Math.abs(Math.floor(options.deterministicSeed)) || 1 }
      : null;

  // 1. Selezione di una delle 100 Email Madri compatibile col listino del cliente (ALL oppure IST / RIV)
  let chosenTemplate: ActiveEmailTemplateRecord | undefined;
  if (options?.forceTemplateCode) {
    chosenTemplate = library.templates.find(
      (t) => t.code.toUpperCase() === String(options.forceTemplateCode).toUpperCase()
    );
  }
  if (!chosenTemplate) {
    const eligible = library.templates.filter(
      (t) =>
        t.targetCategory === 'ALL' ||
        t.targetCategory.toUpperCase() === commercialCategory
    );
    const pool = eligible.length > 0 ? eligible : library.templates;
    chosenTemplate = pool[pickIndex(pool.length, seedCursor)] || buildFallbackLibrary().templates[0];
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

  // Elementi strutturali dinamici (anche etichette box, bottone CTA, firma e opt-out cambiano sempre!)
  const boxTitle = drawTokenValue('TITOLO_BOX_OFFERTA');
  const ctaLabel = drawTokenValue('CTA_BOTTONE_PDF');
  const labelUsername = drawTokenValue('LABEL_USERNAME');
  const labelPassword = drawTokenValue('LABEL_PASSWORD');
  const firmaReparto = drawTokenValue('REPARTO_FIRMA');
  const optOutNote = drawTokenValue('NOTA_LEGALE_OPTOUT');

  const cityClean = (input.city || '').trim();
  const provClean = (input.province || '').trim();
  const cityLabel = cityClean
    ? `${cityClean}${provClean ? ` (${provClean})` : ''}`
    : 'la Vostra zona';
  const cityParen = cityClean ? ` (${cityClean})` : '';

  const brandsNote = input.brandsDetected
    ? `Tenendo conto dei marchi e delle tipologie che trattate (${input.brandsDetected
        .split(',')
        .slice(0, 4)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ')}), abbiamo evidenziato le linee ad alta rotazione immediatamente spedibili dal nostro deposito centrale.`
    : `All’interno del prospetto trova in particolare le famiglie ad alta rotazione (${catCfg.recommendedFamily}) con disponibilità verificata nel nostro Deposito Principale 2gg.`;

  const loginUrl = `https://www.izzodistribuzione.it/login?u=${encodeURIComponent(input.username)}`;

  const resolveClientVariables = (txt: string, credentialsPlaceholder: string): string => {
    const map: Record<string, string> = {
      COMPANY_NAME: input.companyName,
      CITY: cityLabel,
      CITY_PAREN: cityParen,
      PROVINCE: provClean || 'IT',
      SECTOR_SHORT: catCfg.shortLabel,
      RECOMMENDED_FAMILY: catCfg.recommendedFamily,
      BRANDS_NOTE: brandsNote,
      DISCOUNT_FORMULA: discountFormulaLabel,
      BASE_DISCOUNT: String(input.baseDiscount),
      EXTRA_DISCOUNT: String(input.extraFirstPurchasePct),
      NET_DISCOUNT_PCT: String(effectiveNetPct),
      OFFER_TITLE: input.offerTitle,
      MIN_ORDER_TEXT: input.minOrderAmountText,
      SHIPPING_TEXT: input.freeShippingText,
      PAYMENT_TERMS_TEXT: input.paymentTermsText,
      LOGIN_URL: loginUrl,
      USERNAME: input.username,
      TEMP_PASSWORD: input.tempPasswordPlain,
      SMART_CATALOG_URL: input.smartCatalogUrl || loginUrl,
      AGENT_NAME: input.agentName,
      AGENT_CODE: input.agentCode,
      AGENT_PHONE: input.agentPhone || '',
      CREDENTIALS_BLOCK: credentialsPlaceholder,
    };

    return txt.replace(/\{([A-Z0-9_]+)\}/g, (full, varName: string) => {
      return Object.prototype.hasOwnProperty.call(map, varName) ? map[varName] : full;
    });
  };

  // 2. Sintesi Oggetto (sostituisce prima [TOKEN] e poi {VARIABILI})
  const rawSubjectWithTokens = replaceDynamicTokens(chosenTemplate.subjectTemplate);
  const resolvedSubject = polishSubjectTypography(resolveClientVariables(rawSubjectWithTokens, ''));

  // 3. Sintesi Corpo Email
  let rawBodyTemplate = chosenTemplate.bodyTemplate;
  if (!rawBodyTemplate.includes('{CREDENTIALS_BLOCK}')) {
    rawBodyTemplate = `${rawBodyTemplate.trim()}\n\n{CREDENTIALS_BLOCK}`;
  }
  const bodyAfterTokens = replaceDynamicTokens(rawBodyTemplate);

  const plainCredentials = renderCredentialsPlainBlock({
    boxTitle,
    companyName: input.companyName,
    offerTitle: input.offerTitle,
    discountFormulaLabel,
    effectiveNetPct,
    loginUrl,
    labelUsername,
    username: input.username,
    labelPassword,
    tempPasswordPlain: input.tempPasswordPlain,
    minOrderAmountText: input.minOrderAmountText,
    freeShippingText: input.freeShippingText,
    smartCatalogUrl: input.smartCatalogUrl,
    customCommercialNotes: input.customCommercialNotes,
    agentName: input.agentName,
    agentCode: input.agentCode,
  });

  const resolvedBodyCore = polishBodyTypography(
    resolveClientVariables(bodyAfterTokens, plainCredentials)
  );

  const signaturePlainLines = [
    `${input.agentName} — ${firmaReparto} (Cod. ${input.agentCode})`,
    `Izzo Distribuzione — I.S.I. S.r.l.${input.agentPhone ? ` | Tel. ${input.agentPhone}` : ''}`,
    '',
    optOutNote,
  ];

  const bodyText = `${resolvedBodyCore}\n${signaturePlainLines.join('\n')}`;

  // 4. Sintesi HTML con 5 layout differenti per azzerare anche il fingerprint DOM
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
    companyName: input.companyName,
    offerTitle: input.offerTitle,
    discountFormulaLabel,
    effectiveNetPct,
    loginUrl,
    labelUsername,
    username: input.username,
    labelPassword,
    tempPasswordPlain: input.tempPasswordPlain,
    minOrderAmountText: input.minOrderAmountText,
    freeShippingText: input.freeShippingText,
    smartCatalogUrl: input.smartCatalogUrl,
    customCommercialNotes: input.customCommercialNotes,
    agentName: input.agentName,
    agentCode: input.agentCode,
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
            const pHtml = pClean
              ? `<p style="margin: 0 0 12px 0;">${escapeHtml(pClean).replace(/\n/g, '<br/>')}</p>`
              : '';
            return idx < parts.length - 1 ? `${pHtml}${htmlCredentials}` : pHtml;
          })
          .join('\n');
      }
      const formatted = escapeHtml(trimmed)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 12px 0;">${formatted}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 650px; font-size: 14.5px;">
  ${htmlParagraphs}
  <p style="margin-top: 14px;">
    <strong>${escapeHtml(input.agentName)}</strong><br/>
    <span style="color:#475569;font-size:13px;">${escapeHtml(firmaReparto)} (Cod. ${escapeHtml(input.agentCode)}) — Izzo Distribuzione (I.S.I. S.r.l.)${
      input.agentPhone ? ` • ${escapeHtml(input.agentPhone)}` : ''
    }</span>
  </p>
  <p style="margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b;">
    ${escapeHtml(optOutNote)}
  </p>
</div>`;

  // Rimuove eventuali markdown ** residui dal plain text
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
    chosenTemplateId: chosenTemplate.id,
  };
}

/**
 * Motore Combinatorio Principale DB-backed (100 Email Madri × 108 Gruppi di Parole Dinamiche).
 */
export async function generateCombinatorialOutreachEmail(
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): Promise<CombinatorialEmailResult> {
  const library = await loadCombinatorialLibraryFromDb();
  const result = executeCombinatorialSynthesis(library, input, options);

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

/**
 * Wrapper sincrono retrocompatibile che utilizza comunque tutti i 100 modelli e i 108 gruppi di parole.
 */
export function generateCombinatorialOutreachEmailSync(
  input: BuildOutreachEmailInput,
  options?: GenerateCombinatorialOptions
): CombinatorialEmailResult {
  const library = memoryCache || buildFallbackLibrary();
  return executeCombinatorialSynthesis(library, input, options);
}
