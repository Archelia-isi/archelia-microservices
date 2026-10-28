export type DiscountClientScope = 'ALL_CLIENTS' | 'SINGLE_CLIENT' | 'SELECTED_CLIENTS';

export type DiscountTargetType =
  | 'ALL_CATALOG'
  | 'PRODUCTS'
  | 'BRAND'
  | 'PRODUCT_GROUP'
  | 'FAMILY'
  | 'CATEGORY';

export type DiscountCalculationMode = 'EXTRA_CASCADE' | 'FIXED_OVERRIDE';

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
}

/**
 * Verifica se una regola è applicabile a un determinato cliente.
 */
export function doesRuleMatchClient(
  rule: AgentDiscountRule,
  clientContext?: { clientId?: string | null; clientCode?: string | null }
): boolean {
  if (rule.clientScope === 'ALL_CLIENTS') return true;

  const ctxId = (clientContext?.clientId || '').trim();
  const ctxCode = (clientContext?.clientCode || '').trim().toUpperCase();
  if (!ctxId && !ctxCode) return false;

  const allIds = new Set<string>();
  if (rule.clientId) allIds.add(rule.clientId.trim());
  for (const id of rule.clientIds || []) {
    if (id) allIds.add(String(id).trim());
  }

  const allCodes = new Set<string>();
  if (rule.clientCode) allCodes.add(rule.clientCode.trim().toUpperCase());
  for (const code of rule.clientCodes || []) {
    if (code) allCodes.add(String(code).trim().toUpperCase());
  }

  const idMatches = Boolean(ctxId && allIds.has(ctxId));
  const codeMatches = Boolean(ctxCode && allCodes.has(ctxCode));

  return idMatches || codeMatches;
}

/**
 * Calcola il punteggio di specificità di una regola per un dato prodotto e cliente.
 * Ritorna -1 se la regola NON si applica al prodotto o al cliente.
 * Gerarchia:
 * - Cliente singolo (+1100) > Selezione di più clienti (+1000) > Tutti i clienti (+0)
 * - Prodotto Singolo SKU (+500) > Categoria L3 (+40) > Famiglia L2 (+30) > Gruppo L1 (+20) > Marchio (+10) > Tutto il Catalogo (+1)
 */
export function scoreRuleForProduct(
  rule: AgentDiscountRule,
  product: ProductDiscountInput,
  clientContext?: { clientId?: string | null; clientCode?: string | null }
): number {
  if (!rule.isActive || rule.discountValue <= 0) return -1;

  // 1. Verifica destinatario cliente
  let clientScore = 0;
  if (rule.clientScope !== 'ALL_CLIENTS') {
    if (!doesRuleMatchClient(rule, clientContext)) {
      return -1;
    }
    const countClients = Math.max(
      rule.clientIds?.length || 0,
      rule.clientCodes?.length || 0,
      rule.clientId || rule.clientCode ? 1 : 0
    );
    clientScore = countClients <= 1 ? 1100 : 1000;
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
  clientContext?: { clientId?: string | null; clientCode?: string | null },
  fallbackExtraDiscountPct?: number
): EvaluatedProductPricing {
  const listPrice = Math.max(0, Number(product.listPrice || 0));
  const safeBase = Math.max(0, Math.min(95, Number(baseDiscount || 0)));
  const safeFallbackExtra = Math.max(0, Math.min(95, Number(fallbackExtraDiscountPct || 0)));

  let winningRule: AgentDiscountRule | null = null;
  let bestScore = -1;

  for (const rule of rules || []) {
    const score = scoreRuleForProduct(rule, product, clientContext);
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
      const label = safeBase > 0 ? `${safeBase}% + ${safeFallbackExtra}%` : `${safeFallbackExtra}%`;
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
    };
  }

  const ruleVal = Math.max(0, Math.min(95, Number(winningRule.discountValue || 0)));

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
      discountLabel: `${ruleVal}% (Fisso)`,
      appliedRuleId: winningRule.id,
      appliedRuleName: winningRule.name,
    };
  }

  // EXTRA_CASCADE: Sconto Base fisso del cliente + Extra Sconto della regola a cascata
  const afterBase = listPrice * (1 - safeBase / 100);
  const netPrice = Number((afterBase * (1 - ruleVal / 100)).toFixed(4));
  const effectivePct =
    listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
  const label =
    safeBase > 0 ? `${safeBase}% + ${ruleVal}%` : `${ruleVal}%`;

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
  };
}
