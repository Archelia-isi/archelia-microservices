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
  DiscountTargetClientMeta,
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
  clientIds?: string[];
  clientCodes?: string[];
  clientsMeta?: DiscountTargetClientMeta[];
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

  const cleanArray = (arr?: string[], uppercase = true) =>
    Array.from(
      new Set(
        (arr || [])
          .map(s => {
            const v = String(s || '').trim();
            return uppercase ? v.toUpperCase() : v;
          })
          .filter(Boolean)
      )
    );

  const clientIds = cleanArray(
    input.clientIds && input.clientIds.length > 0
      ? input.clientIds
      : input.clientId
        ? [input.clientId]
        : [],
    false
  );
  const clientCodes = cleanArray(
    input.clientCodes && input.clientCodes.length > 0
      ? input.clientCodes
      : input.clientCode
        ? [input.clientCode]
        : [],
    true
  );
  const clientsMeta: DiscountTargetClientMeta[] = Array.isArray(input.clientsMeta)
    ? input.clientsMeta
    : [];

  const clientScope: DiscountClientScope =
    input.clientScope === 'ALL_CLIENTS'
      ? 'ALL_CLIENTS'
      : clientIds.length > 1 || clientCodes.length > 1
        ? 'SELECTED_CLIENTS'
        : 'SINGLE_CLIENT';

  if (clientScope !== 'ALL_CLIENTS' && clientIds.length === 0 && clientCodes.length === 0) {
    return {
      success: false,
      error: 'Seleziona almeno un cliente a cui abbinare questa regola di sconto.',
    };
  }

  const targetType: DiscountTargetType = input.targetType || 'PRODUCTS';
  const targetSkus = targetType === 'ALL_CATALOG' ? [] : cleanArray(input.targetSkus, true);
  const targetBrands = targetType === 'ALL_CATALOG' ? [] : cleanArray(input.targetBrands, true);
  const targetProductGroups =
    targetType === 'ALL_CATALOG' ? [] : cleanArray(input.targetProductGroups, true);
  const targetFamilies =
    targetType === 'ALL_CATALOG' ? [] : cleanArray(input.targetFamilies, true);
  const targetCategories =
    targetType === 'ALL_CATALOG' ? [] : cleanArray(input.targetCategories, true);

  const hasTarget =
    targetType === 'ALL_CATALOG' ||
    targetSkus.length > 0 ||
    targetBrands.length > 0 ||
    targetProductGroups.length > 0 ||
    targetFamilies.length > 0 ||
    targetCategories.length > 0;

  if (!hasTarget) {
    return {
      success: false,
      error:
        'Seleziona "Tutto il Catalogo" oppure almeno un prodotto (SKU), marchio, gruppo merceologico, famiglia o categoria.',
    };
  }

  const targetProductsMeta: DiscountTargetProductMeta[] =
    targetType === 'ALL_CATALOG'
      ? []
      : Array.isArray(input.targetProductsMeta)
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
    if (targetType === 'ALL_CATALOG') {
      autoName = 'Tutto il Catalogo';
    } else {
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
  }

  const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;
  const primaryClientId = clientScope !== 'ALL_CLIENTS' ? clientIds[0] || null : null;
  const primaryClientCode = clientScope !== 'ALL_CLIENTS' ? clientCodes[0] || null : null;
  const primaryClientName =
    clientScope !== 'ALL_CLIENTS'
      ? clientsMeta.length === 1
        ? clientsMeta[0].name
        : clientsMeta.length > 1
          ? `${clientsMeta.length} Clienti selezionati`
          : input.clientName || null
      : null;

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
        "clientIds",
        "clientCodes",
        "clientsMeta",
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
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10::jsonb, $11::jsonb, $12,
        $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
        $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "clientScope" = EXCLUDED."clientScope",
        "clientId" = EXCLUDED."clientId",
        "clientCode" = EXCLUDED."clientCode",
        "clientName" = EXCLUDED."clientName",
        "clientIds" = EXCLUDED."clientIds",
        "clientCodes" = EXCLUDED."clientCodes",
        "clientsMeta" = EXCLUDED."clientsMeta",
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
      primaryClientId,
      primaryClientCode,
      primaryClientName,
      JSON.stringify(clientScope !== 'ALL_CLIENTS' ? clientIds : []),
      JSON.stringify(clientScope !== 'ALL_CLIENTS' ? clientCodes : []),
      JSON.stringify(clientScope !== 'ALL_CLIENTS' ? clientsMeta : []),
      targetType,
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
