export type DiscountClientScope =
  | 'ALL_CLIENTS'
  | 'SINGLE_CLIENT'
  | 'SELECTED_CLIENTS'
  | 'CLIENT_CATEGORY';

export type DiscountTargetType =
  | 'ALL_CATALOG'
  | 'PRODUCTS'
  | 'BRAND'
  | 'PRODUCT_GROUP'
  | 'FAMILY'
  | 'CATEGORY';

export type DiscountCalculationMode = 'EXTRA_CASCADE' | 'FIXED_OVERRIDE';

export type DiscountExpiryType = 'NONE' | 'DATE' | 'FIRST_PURCHASE' | 'NEXT_PURCHASE';

export interface DiscountTargetProductMeta {
  sku: string;
  title: string;
  brand?: string;
  imageUrl?: string;
  listPrice?: number;
}

export interface DiscountTargetClientMeta {
  id: string;
  code: string;
  name: string;
  baseDiscount?: number;
  categoryCode?: string;
  categoryLabel?: string;
}

export interface AgentDiscountRule {
  id: string;
  agentId: string;
  agentCode: string;
  name: string;
  clientScope: DiscountClientScope;
  clientId: string | null;
  clientCode: string | null;
  clientName: string | null;
  clientIds: string[];
  clientCodes: string[];
  clientsMeta: DiscountTargetClientMeta[];
  clientCategories: string[];
  targetType: DiscountTargetType;
  targetSkus: string[];
  targetProductsMeta: DiscountTargetProductMeta[];
  targetBrands: string[];
  targetProductGroups: string[];
  targetFamilies: string[];
  targetCategories: string[];
  calculationMode: DiscountCalculationMode;
  discountValue: number;
  isActive: boolean;
  expiryType?: DiscountExpiryType;
  expiresAt?: string | null;
  consumedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDiscountInput {
  sku?: string;
  brand?: string;
  productGroup?: string;
  family?: string;
  category?: string;
  listPrice: number;
  catalogSource?: string;
  discgroup?: string;
}

export interface ClientDiscountMatchContext {
  clientId?: string | null;
  clientCode?: string | null;
  clientCategory?: string | null;
  baseDiscount?: number | null;
}

export interface EvaluatedProductPricing {
  listPrice: number;
  netPrice: number;
  discountPct: number;
  baseDiscountPct: number;
  ruleDiscountPct: number;
  calculationMode: 'BASE_ONLY' | 'EXTRA_CASCADE' | 'FIXED_OVERRIDE';
  discountLabel: string;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
  appliedRuleExpiryType: DiscountExpiryType;
  appliedRuleExpiresAt: string | null;
  appliedRuleExpiresFormatted: string | null;
}

/**
 * Estrae il codice categoria cliente normalizzato in maiuscolo (es. 'RIV', 'IST', 'GEN')
 * da un codice diretto ('riv'), da una descrizione ('RIV - Rivenditore', 'Installatore / Impiantista')
 * oppure, come fallback, dallo sconto base standard (50% -> RIV, 40% -> IST, 25% -> GEN).
 */
export function normalizeClientCategoryCode(
  rawCategory?: string | null,
  fallbackDiscount?: number | null
): string {
  const s = String(rawCategory || '').trim().toUpperCase();
  if (s) {
    if (s === 'RIV' || s.startsWith('RIV ') || s.startsWith('RIV-') || s.includes('RIVENDIT')) {
      return 'RIV';
    }
    if (
      s === 'IST' ||
      s.startsWith('IST ') ||
      s.startsWith('IST-') ||
      s.includes('INSTALLAT') ||
      s.includes('IMPIANTIST')
    ) {
      return 'IST';
    }
    if (s === 'GEN' || s.startsWith('GEN ') || s.startsWith('GEN-') || s.includes('GENERAL')) {
      return 'GEN';
    }
    const prefix = s.split(/[\s\-]/)[0]?.trim();
    if (prefix && prefix.length <= 6 && prefix !== 'NESSUNA') {
      return prefix;
    }
  }

  if (fallbackDiscount !== undefined && fallbackDiscount !== null) {
    const d = Number(fallbackDiscount);
    if (d === 50) return 'RIV';
    if (d === 40) return 'IST';
    if (d === 25) return 'GEN';
  }

  return '';
}

/**
 * Verifica se una regola è applicabile a un determinato cliente (per ID/Codice, per Categoria Cliente, o Tutti).
 */
export function doesRuleMatchClient(
  rule: AgentDiscountRule,
  clientContext?: ClientDiscountMatchContext
): boolean {
  if (rule.clientScope === 'ALL_CLIENTS') return true;

  if (rule.clientScope === 'CLIENT_CATEGORY') {
    const ruleCats = (rule.clientCategories || []).map(c =>
      normalizeClientCategoryCode(c)
    ).filter(Boolean);
    if (ruleCats.length === 0) return false;

    const ctxCat = normalizeClientCategoryCode(
      clientContext?.clientCategory,
      clientContext?.baseDiscount
    );
    if (!ctxCat) return false;
    return ruleCats.includes(ctxCat);
  }

  const ctxId = (clientContext?.clientId || '').trim();
  const ctxCode = (clientContext?.clientCode || '').trim().toUpperCase();
  if (!ctxId && !ctxCode) return false;

  const allIds = new Set<string>();
  if (rule.clientId) allIds.add(rule.clientId.trim());
  for (const id of rule.clientIds || []) {
    if (id) allIds.add(String(id).trim());
  }
  for (const meta of rule.clientsMeta || []) {
    if (meta?.id) allIds.add(String(meta.id).trim());
  }

  const allCodes = new Set<string>();
  if (rule.clientCode) allCodes.add(rule.clientCode.trim().toUpperCase());
  for (const code of rule.clientCodes || []) {
    if (code) allCodes.add(String(code).trim().toUpperCase());
  }
  for (const meta of rule.clientsMeta || []) {
    if (meta?.code) allCodes.add(String(meta.code).trim().toUpperCase());
  }

  const idMatches = Boolean(ctxId && allIds.has(ctxId));
  const codeMatches = Boolean(ctxCode && allCodes.has(ctxCode));

  return idMatches || codeMatches;
}

/**
 * Verifica se una regola di sconto è scaduta rispetto alla data/ora corrente o perché già consumata su un acquisto.
 * Se `expiresAt` è nullo o vuoto ("Senza scadenza") e non è consumata, ritorna `false`.
 */
export function isDiscountRuleExpired(
  rule: {
    expiryType?: DiscountExpiryType | null;
    expiresAt?: string | null;
    consumedAt?: string | null;
  },
  now: Date = new Date()
): boolean {
  if (rule.consumedAt) return true;
  if (rule.expiryType === 'FIRST_PURCHASE' || rule.expiryType === 'NEXT_PURCHASE') {
    return false;
  }
  if (!rule.expiresAt) return false;
  const raw = String(rule.expiresAt).trim();
  if (!raw || raw === 'FIRST_PURCHASE' || raw === 'NEXT_PURCHASE') return false;

  // Se è nel formato YYYY-MM-DD, considera valido fino alle 23:59:59.999 di quel giorno
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const expTime = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
        23,
        59,
        59,
        999
      ).getTime()
    : new Date(raw).getTime();

  if (isNaN(expTime)) return false;
  return now.getTime() > expTime;
}

/**
 * Formatta la scadenza di una regola di sconto ("Fino al GG/MM/AAAA", "Sul primo acquisto", "Sul prossimo acquisto").
 * Ritorna `null` se la regola è senza scadenza.
 */
export function formatDiscountRuleExpiryDate(
  expiresAt?: string | null,
  expiryType?: DiscountExpiryType | null
): string | null {
  if (expiryType === 'FIRST_PURCHASE' || expiresAt === 'FIRST_PURCHASE') {
    return 'Sul primo acquisto';
  }
  if (expiryType === 'NEXT_PURCHASE' || expiresAt === 'NEXT_PURCHASE') {
    return 'Sul prossimo acquisto';
  }
  if (!expiresAt) return null;
  const raw = String(expiresAt).trim();
  if (!raw) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (dateOnlyMatch) {
    return `Fino al ${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `Fino al ${day}/${month}/${year}`;
}

/**
 * Calcola il punteggio di specificità di una regola per un dato prodotto e cliente.
 * Ritorna -1 se la regola NON si applica al prodotto o al cliente.
 * Gerarchia destinatario:
 * - Cliente singolo (+1100) > Selezione di più clienti (+1000) > Categoria Cliente (+600) > Tutti i clienti (+0)
 * Gerarchia articoli:
 * - Prodotto Singolo SKU (+500) > Categoria L3 (+40) > Famiglia L2 (+30) > Gruppo L1 (+20) > Marchio (+10) > Tutto il Catalogo (+1)
 */
export function scoreRuleForProduct(
  rule: AgentDiscountRule,
  product: ProductDiscountInput,
  clientContext?: ClientDiscountMatchContext
): number {
  if (!rule.isActive || rule.discountValue <= 0 || isDiscountRuleExpired(rule)) return -1;

  // 1. Verifica destinatario cliente
  let clientScore = 0;
  if (rule.clientScope !== 'ALL_CLIENTS') {
    if (!doesRuleMatchClient(rule, clientContext)) {
      return -1;
    }
    if (rule.clientScope === 'CLIENT_CATEGORY') {
      clientScore = 600;
    } else {
      const countClients = Math.max(
        rule.clientIds?.length || 0,
        rule.clientCodes?.length || 0,
        rule.clientId || rule.clientCode ? 1 : 0
      );
      clientScore = countClients <= 1 ? 1100 : 1000;
    }
  }

  // 2. Se la regola è su TUTTO IL CATALOGO
  if (rule.targetType === 'ALL_CATALOG') {
    return clientScore + 1;
  }

  // 3. Verifica target prodotto specifici
  const pSku = (product.sku || '').trim().toUpperCase();
  const pBrand = (product.brand || '').trim().toUpperCase();
  const pGroup = (product.productGroup || '').trim().toUpperCase();
  const pFamily = (product.family || '').trim().toUpperCase();
  const pCategory = (product.category || '').trim().toUpperCase();

  let targetScore = 0;
  let hasAnyTargetConstraint = false;

  if (rule.targetSkus && rule.targetSkus.length > 0) {
    hasAnyTargetConstraint = true;
    if (!pSku || !rule.targetSkus.includes(pSku)) {
      return -1;
    }
    targetScore += 500;
  }

  if (rule.targetCategories && rule.targetCategories.length > 0) {
    hasAnyTargetConstraint = true;
    if (!pCategory || !rule.targetCategories.includes(pCategory)) {
      return -1;
    }
    targetScore += 40;
  }

  if (rule.targetFamilies && rule.targetFamilies.length > 0) {
    hasAnyTargetConstraint = true;
    if (!pFamily || !rule.targetFamilies.includes(pFamily)) {
      return -1;
    }
    targetScore += 30;
  }

  if (rule.targetProductGroups && rule.targetProductGroups.length > 0) {
    hasAnyTargetConstraint = true;
    if (!pGroup || !rule.targetProductGroups.includes(pGroup)) {
      return -1;
    }
    targetScore += 20;
  }

  if (rule.targetBrands && rule.targetBrands.length > 0) {
    hasAnyTargetConstraint = true;
    if (!pBrand || !rule.targetBrands.includes(pBrand)) {
      return -1;
    }
    targetScore += 10;
  }

  if (!hasAnyTargetConstraint) {
    return -1;
  }

  return clientScore + targetScore;
}

/**
 * Calcola il prezzo finale di un prodotto applicando lo Sconto Base fisso del cliente
 * e l'eventuale regola di sconto più specifica attiva (o un eventuale extra sconto fallback).
 */
export function evaluateProductDiscountWithRules(
  product: ProductDiscountInput,
  baseDiscount: number,
  rules: AgentDiscountRule[],
  clientContext?: ClientDiscountMatchContext,
  fallbackExtraDiscountPct?: number
): EvaluatedProductPricing {
  const listPrice = Math.max(0, Number(product.listPrice || 0));
  const safeBase = Math.max(0, Math.min(95, Number(baseDiscount || 0)));
  const safeFallbackExtra = Math.max(0, Math.min(95, Number(fallbackExtraDiscountPct || 0)));

  const enrichedContext: ClientDiscountMatchContext = {
    ...clientContext,
    baseDiscount: clientContext?.baseDiscount ?? safeBase,
  };

  let winningRule: AgentDiscountRule | null = null;
  let bestScore = -1;

  for (const rule of rules || []) {
    const score = scoreRuleForProduct(rule, product, enrichedContext);
    if (score > bestScore) {
      bestScore = score;
      winningRule = rule;
    }
  }

  if (!winningRule) {
    if (safeFallbackExtra > 0) {
      const afterBase = listPrice * (1 - safeBase / 100);
      const netPrice = Number((afterBase * (1 - safeFallbackExtra / 100)).toFixed(4));
      const effectivePct =
        listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
      const label = safeBase > 0 ? `${safeBase}+${safeFallbackExtra}%` : `${safeFallbackExtra}%`;
      return {
        listPrice,
        netPrice,
        discountPct: Math.max(0, effectivePct),
        baseDiscountPct: safeBase,
        ruleDiscountPct: safeFallbackExtra,
        calculationMode: 'EXTRA_CASCADE',
        discountLabel: label,
        appliedRuleId: null,
        appliedRuleName: null,
        appliedRuleExpiryType: 'NONE',
        appliedRuleExpiresAt: null,
        appliedRuleExpiresFormatted: null,
      };
    }

    const netPrice = Number((listPrice * (1 - safeBase / 100)).toFixed(4));
    const effectivePct =
      listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
    return {
      listPrice,
      netPrice,
      discountPct: Math.max(0, effectivePct),
      baseDiscountPct: safeBase,
      ruleDiscountPct: 0,
      calculationMode: 'BASE_ONLY',
      discountLabel: safeBase > 0 ? `${safeBase}%` : '0%',
      appliedRuleId: null,
      appliedRuleName: null,
      appliedRuleExpiryType: 'NONE',
      appliedRuleExpiresAt: null,
      appliedRuleExpiresFormatted: null,
    };
  }

  const ruleVal = Math.max(0, Math.min(95, Number(winningRule.discountValue || 0)));
  const appliedRuleExpiryType: DiscountExpiryType =
    winningRule.expiryType || (winningRule.expiresAt ? 'DATE' : 'NONE');
  const appliedRuleExpiresAt =
    appliedRuleExpiryType === 'FIRST_PURCHASE' || appliedRuleExpiryType === 'NEXT_PURCHASE'
      ? appliedRuleExpiryType
      : winningRule.expiresAt
        ? String(winningRule.expiresAt).trim()
        : null;
  const appliedRuleExpiresFormatted = formatDiscountRuleExpiryDate(
    winningRule.expiresAt,
    appliedRuleExpiryType
  );

  if (winningRule.calculationMode === 'FIXED_OVERRIDE') {
    const netPrice = Number((listPrice * (1 - ruleVal / 100)).toFixed(4));
    const effectivePct =
      listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
    return {
      listPrice,
      netPrice,
      discountPct: Math.max(0, effectivePct),
      baseDiscountPct: safeBase,
      ruleDiscountPct: ruleVal,
      calculationMode: 'FIXED_OVERRIDE',
      discountLabel: `${ruleVal}%`,
      appliedRuleId: winningRule.id,
      appliedRuleName: winningRule.name,
      appliedRuleExpiryType,
      appliedRuleExpiresAt,
      appliedRuleExpiresFormatted,
    };
  }

  // EXTRA_CASCADE: Sconto Base fisso del cliente + Extra Sconto della regola a cascata
  const afterBase = listPrice * (1 - safeBase / 100);
  const netPrice = Number((afterBase * (1 - ruleVal / 100)).toFixed(4));
  const effectivePct =
    listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
  const label =
    safeBase > 0 ? `${safeBase}+${ruleVal}%` : `${ruleVal}%`;

  return {
    listPrice,
    netPrice,
    discountPct: Math.max(0, effectivePct),
    baseDiscountPct: safeBase,
    ruleDiscountPct: ruleVal,
    calculationMode: 'EXTRA_CASCADE',
    discountLabel: label,
    appliedRuleId: winningRule.id,
    appliedRuleName: winningRule.name,
    appliedRuleExpiryType,
    appliedRuleExpiresAt,
    appliedRuleExpiresFormatted,
  };
}
