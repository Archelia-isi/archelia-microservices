'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import {
  getAgentClientsList,
  AgentManagedClient,
  CommercialCategoryOption,
} from './newClient';
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
  normalizeClientCategoryCode,
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
  clientCategories?: string[];
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
  expiresAt?: string | null;
}

export async function getAgentDiscountManagementInitData(): Promise<{
  success: boolean;
  error?: string;
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  clientCategories: CommercialCategoryOption[];
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
      clientCategories: [],
      facets: { brands: [], productGroups: [], families: [], categories: [] },
      rules: [],
    };
  }

  const sessionAgentCode = session.user.zucchettiCode || '';

  const [clientsRes, facetSearchRes, rules] = await Promise.all([
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
      limit: 0,
    }),
    getAgentDiscountRulesFromDb(session.user.id, sessionAgentCode),
  ]);

  const agentCode = clientsRes.agentCode || sessionAgentCode;
  const agentName =
    clientsRes.agentName ||
    session.user.companyName ||
    `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
    session.user.username;

  const rawCategories = clientsRes.categories || [
    { code: 'riv', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
    { code: 'ist', label: 'IST - Installatore / Impiantista (Sconto base 40%)', discount: 40 },
    { code: 'gen', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
  ];

  // Rendiamo più chiara l'etichetta IST come "IST - Installatore / Impiantista"
  const clientCategories: CommercialCategoryOption[] = rawCategories
    .filter(c => Boolean(c.code && c.code.trim()))
    .map(c => {
      const upper = c.code.trim().toUpperCase();
      if (upper === 'IST') {
        return {
          ...c,
          code: 'IST',
          label: `IST - Installatore / Impiantista (Sconto base ${c.discount}%)`,
        };
      }
      if (upper === 'RIV') {
        return {
          ...c,
          code: 'RIV',
          label: `RIV - Rivenditore (Sconto base ${c.discount}%)`,
        };
      }
      if (upper === 'GEN') {
        return {
          ...c,
          code: 'GEN',
          label: `GEN - Generale (Sconto base ${c.discount}%)`,
        };
      }
      return {
        ...c,
        code: upper,
      };
    });

  return {
    success: true,
    agentName,
    agentCode,
    clients: clientsRes.clients || [],
    clientCategories,
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

  const clientCategories = Array.from(
    new Set(
      (input.clientCategories || [])
        .map(c => normalizeClientCategoryCode(c))
        .filter(Boolean)
    )
  );

  let clientScope: DiscountClientScope = 'ALL_CLIENTS';
  if (input.clientScope === 'ALL_CLIENTS') {
    clientScope = 'ALL_CLIENTS';
  } else if (input.clientScope === 'CLIENT_CATEGORY') {
    clientScope = 'CLIENT_CATEGORY';
    if (clientCategories.length === 0) {
      return {
        success: false,
        error:
          'Seleziona almeno una Categoria Cliente (es. Rivenditore, Installatore / Impiantista, Generale).',
      };
    }
  } else {
    clientScope =
      clientIds.length > 1 || clientCodes.length > 1
        ? 'SELECTED_CLIENTS'
        : 'SINGLE_CLIENT';
    if (clientIds.length === 0 && clientCodes.length === 0) {
      return {
        success: false,
        error: 'Seleziona almeno un cliente a cui abbinare questa regola di sconto.',
      };
    }
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

  // Risoluzione data di scadenza opzionale (fine giornata 23:59:59.999 se passata come YYYY-MM-DD, oppure null per "Senza scadenza")
  let parsedExpiresAt: Date | null = null;
  if (input.expiresAt && String(input.expiresAt).trim()) {
    const rawExp = String(input.expiresAt).trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawExp);
    const dt = dateOnly
      ? new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T23:59:59.999Z`)
      : new Date(rawExp);
    if (!isNaN(dt.getTime())) {
      parsedExpiresAt = dt;
    }
  }

  const isSpecificClients =
    clientScope === 'SINGLE_CLIENT' || clientScope === 'SELECTED_CLIENTS';
  const primaryClientId = isSpecificClients ? clientIds[0] || null : null;
  const primaryClientCode = isSpecificClients ? clientCodes[0] || null : null;
  const primaryClientName = isSpecificClients
    ? clientsMeta.length === 1
      ? clientsMeta[0].name
      : clientsMeta.length > 1
        ? `${clientsMeta.length} Clienti selezionati`
        : input.clientName || null
    : clientScope === 'CLIENT_CATEGORY'
      ? `Cat. Clienti: ${clientCategories.join(', ')}`
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
        "clientCategories",
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
        "expiresAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13,
        $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19::jsonb,
        $20, $21, $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
        "clientCategories" = EXCLUDED."clientCategories",
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
        "expiresAt" = EXCLUDED."expiresAt",
        "updatedAt" = CURRENT_TIMESTAMP`,
      ruleId,
      session.user.id,
      agentCode,
      autoName,
      clientScope,
      primaryClientId,
      primaryClientCode,
      primaryClientName,
      JSON.stringify(isSpecificClients ? clientIds : []),
      JSON.stringify(isSpecificClients ? clientCodes : []),
      JSON.stringify(isSpecificClients ? clientsMeta : []),
      JSON.stringify(clientScope === 'CLIENT_CATEGORY' ? clientCategories : []),
      targetType,
      JSON.stringify(targetSkus),
      JSON.stringify(targetProductsMeta),
      JSON.stringify(targetBrands),
      JSON.stringify(targetProductGroups),
      JSON.stringify(targetFamilies),
      JSON.stringify(targetCategories),
      calculationMode,
      discountVal,
      isActive,
      parsedExpiresAt
    );

    revalidatePath('/', 'layout');
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

    revalidatePath('/', 'layout');
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

    revalidatePath('/', 'layout');
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
