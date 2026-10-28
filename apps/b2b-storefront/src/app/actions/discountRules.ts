'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getAgentClientsList, AgentManagedClient } from './newClient';
import {
  CatalogFacetOption,
  searchAgentCatalogProducts,
} from './catalogBuilder';
import {
  AgentDiscountRule,
  DiscountCalculationMode,
  DiscountClientScope,
  DiscountTargetProductMeta,
  DiscountTargetType,
  ensureDiscountRulesTable,
  getAgentDiscountRulesFromDb,
} from '@/lib/discountRules';

export interface SaveDiscountRuleInput {
  id?: string;
  name?: string;
  clientScope: DiscountClientScope;
  clientId?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  targetType: DiscountTargetType;
  targetSkus?: string[];
  targetProductsMeta?: DiscountTargetProductMeta[];
  targetBrands?: string[];
  targetProductGroups?: string[];
  targetFamilies?: string[];
  targetCategories?: string[];
  calculationMode: DiscountCalculationMode;
  discountValue: number;
  isActive?: boolean;
}

export async function getAgentDiscountManagementInitData(): Promise<{
  success: boolean;
  error?: string;
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  facets: {
    brands: CatalogFacetOption[];
    productGroups: CatalogFacetOption[];
    families: CatalogFacetOption[];
    categories: CatalogFacetOption[];
  };
  rules: AgentDiscountRule[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return {
      success: false,
      error: 'Accesso riservato agli agenti.',
      agentName: '',
      agentCode: '',
      clients: [],
      facets: { brands: [], productGroups: [], families: [], categories: [] },
      rules: [],
    };
  }

  const [clientsRes, facetSearchRes] = await Promise.all([
    getAgentClientsList(),
    searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: '',
      warehouse: 'ALL_WAREHOUSES',
      includeZeroStock: true,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'TAXONOMY_ASC',
      limit: 1,
    }),
  ]);

  const agentCode = clientsRes.agentCode || session.user.zucchettiCode || '';
  const agentName =
    clientsRes.agentName ||
    session.user.companyName ||
    `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
    session.user.username;

  const rules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);

  return {
    success: true,
    agentName,
    agentCode,
    clients: clientsRes.clients || [],
    facets: facetSearchRes.facets || {
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
    },
    rules,
  };
}

export async function saveAgentDiscountRuleAction(
  input: SaveDiscountRuleInput
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  await ensureDiscountRulesTable();

  const discountVal = Number(input.discountValue || 0);
  if (isNaN(discountVal) || discountVal <= 0 || discountVal > 95) {
    return {
      success: false,
      error: 'Inserisci una percentuale di sconto valida (tra 0.1% e 95%).',
    };
  }

  const clientScope: DiscountClientScope =
    input.clientScope === 'SINGLE_CLIENT' ? 'SINGLE_CLIENT' : 'ALL_CLIENTS';

  if (clientScope === 'SINGLE_CLIENT' && !input.clientId && !input.clientCode) {
    return {
      success: false,
      error: 'Seleziona il cliente a cui abbinare questa regola di sconto.',
    };
  }

  const cleanUpperArray = (arr?: string[]) =>
    Array.from(
      new Set((arr || []).map(s => String(s || '').trim().toUpperCase()).filter(Boolean))
    );

  const targetSkus = cleanUpperArray(input.targetSkus);
  const targetBrands = cleanUpperArray(input.targetBrands);
  const targetProductGroups = cleanUpperArray(input.targetProductGroups);
  const targetFamilies = cleanUpperArray(input.targetFamilies);
  const targetCategories = cleanUpperArray(input.targetCategories);

  const hasTarget =
    targetSkus.length > 0 ||
    targetBrands.length > 0 ||
    targetProductGroups.length > 0 ||
    targetFamilies.length > 0 ||
    targetCategories.length > 0;

  if (!hasTarget) {
    return {
      success: false,
      error:
        'Seleziona almeno un prodotto (SKU), un marchio, un gruppo merceologico, una famiglia o una categoria.',
    };
  }

  const targetProductsMeta: DiscountTargetProductMeta[] = Array.isArray(
    input.targetProductsMeta
  )
    ? input.targetProductsMeta.filter(
        m => m && m.sku && targetSkus.includes(String(m.sku).trim().toUpperCase())
      )
    : [];

  const calculationMode: DiscountCalculationMode =
    input.calculationMode === 'FIXED_OVERRIDE' ? 'FIXED_OVERRIDE' : 'EXTRA_CASCADE';

  const ruleId =
    input.id && input.id.trim()
      ? input.id.trim()
      : `drule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const agentCode = session.user.zucchettiCode || '';

  // Genera un nome descrittivo automatico se non specificato
  let autoName = (input.name || '').trim();
  if (!autoName) {
    const parts: string[] = [];
    if (targetSkus.length > 0) {
      parts.push(
        targetSkus.length === 1
          ? `Art. ${targetSkus[0]}`
          : `${targetSkus.length} Prodotti scelti`
      );
    }
    if (targetBrands.length > 0) parts.push(`Marchio: ${targetBrands.join(', ')}`);
    if (targetProductGroups.length > 0)
      parts.push(`Gruppo: ${targetProductGroups.join(', ')}`);
    if (targetFamilies.length > 0) parts.push(`Famiglia: ${targetFamilies.join(', ')}`);
    if (targetCategories.length > 0)
      parts.push(`Cat.: ${targetCategories.join(', ')}`);
    autoName = parts.join(' • ').slice(0, 120) || 'Regola Sconto';
  }

  const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "b2b_agent_discount_rules" (
        "id",
        "agentId",
        "agentCode",
        "name",
        "clientScope",
        "clientId",
        "clientCode",
        "clientName",
        "targetType",
        "targetSkus",
        "targetProductsMeta",
        "targetBrands",
        "targetProductGroups",
        "targetFamilies",
        "targetCategories",
        "calculationMode",
        "discountValue",
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb,
        $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "clientScope" = EXCLUDED."clientScope",
        "clientId" = EXCLUDED."clientId",
        "clientCode" = EXCLUDED."clientCode",
        "clientName" = EXCLUDED."clientName",
        "targetType" = EXCLUDED."targetType",
        "targetSkus" = EXCLUDED."targetSkus",
        "targetProductsMeta" = EXCLUDED."targetProductsMeta",
        "targetBrands" = EXCLUDED."targetBrands",
        "targetProductGroups" = EXCLUDED."targetProductGroups",
        "targetFamilies" = EXCLUDED."targetFamilies",
        "targetCategories" = EXCLUDED."targetCategories",
        "calculationMode" = EXCLUDED."calculationMode",
        "discountValue" = EXCLUDED."discountValue",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = CURRENT_TIMESTAMP`,
      ruleId,
      session.user.id,
      agentCode,
      autoName,
      clientScope,
      clientScope === 'SINGLE_CLIENT' ? input.clientId || null : null,
      clientScope === 'SINGLE_CLIENT' ? input.clientCode || null : null,
      clientScope === 'SINGLE_CLIENT' ? input.clientName || null : null,
      input.targetType || 'PRODUCTS',
      JSON.stringify(targetSkus),
      JSON.stringify(targetProductsMeta),
      JSON.stringify(targetBrands),
      JSON.stringify(targetProductGroups),
      JSON.stringify(targetFamilies),
      JSON.stringify(targetCategories),
      calculationMode,
      discountVal,
      isActive
    );

    revalidatePath('/account/discounts');
    revalidatePath('/account/catalog-builder');
    revalidatePath('/catalog');
    revalidatePath('/cart');

    const rules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);
    return { success: true, rules };
  } catch (err: any) {
    console.error('Errore saveAgentDiscountRuleAction:', err);
    return {
      success: false,
      error: err.message || 'Errore durante il salvataggio della regola di sconto.',
    };
  }
}

export async function toggleAgentDiscountRuleAction(
  ruleId: string,
  isActive: boolean
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  await ensureDiscountRulesTable();
  const agentCode = session.user.zucchettiCode || '';

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "b2b_agent_discount_rules"
       SET "isActive" = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2 AND ("agentId" = $3 OR ("agentCode" != '' AND "agentCode" = $4))`,
      Boolean(isActive),
      ruleId,
      session.user.id,
      agentCode
    );

    revalidatePath('/account/discounts');
    revalidatePath('/account/catalog-builder');
    revalidatePath('/catalog');
    revalidatePath('/cart');

    const rules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);
    return { success: true, rules };
  } catch (err: any) {
    console.error('Errore toggleAgentDiscountRuleAction:', err);
    return { success: false, error: err.message || 'Errore aggiornamento stato regola.' };
  }
}

export async function deleteAgentDiscountRuleAction(
  ruleId: string
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  await ensureDiscountRulesTable();
  const agentCode = session.user.zucchettiCode || '';

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "b2b_agent_discount_rules"
       WHERE "id" = $1 AND ("agentId" = $2 OR ("agentCode" != '' AND "agentCode" = $3))`,
      ruleId,
      session.user.id,
      agentCode
    );

    revalidatePath('/account/discounts');
    revalidatePath('/account/catalog-builder');
    revalidatePath('/catalog');
    revalidatePath('/cart');

    const rules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);
    return { success: true, rules };
  } catch (err: any) {
    console.error('Errore deleteAgentDiscountRuleAction:', err);
    return { success: false, error: err.message || 'Errore eliminazione regola.' };
  }
}
