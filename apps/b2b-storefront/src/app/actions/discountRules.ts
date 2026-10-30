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
  DiscountExpiryType,
  DiscountTargetClientMeta,
  DiscountTargetProductMeta,
  DiscountTargetType,
  doesRuleMatchClient,
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
  expiryType?: DiscountExpiryType;
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

  const [clientsRes, promoProspects, facetSearchRes, rules] = await Promise.all([
    getAgentClientsList(),
    prisma.b2BPromoProspect.findMany({
      where: {
        agentId: session.user.id,
        status: { in: ['CONTACTED', 'LOGGED_IN', 'ORDER_PENDING_APPROVAL'] },
      },
      orderBy: { emailSentAt: 'desc' },
    }),
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

  const mappedPromoClients: AgentManagedClient[] = promoProspects.map(p => ({
    id: p.id,
    hasB2BAccount: true,
    zucchettiCode: p.username,
    companyName: `[IN ATTIVAZIONE] ${p.companyName}`,
    vatNumber: p.vatNumber || '',
    codiceFiscale: p.fiscalCode || p.vatNumber || '',
    formaGiuridica: p.formaGiuridica || 'SRL',
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    address: p.address || '',
    zip: p.zip || '',
    city: p.city || '',
    province: p.province || '',
    phone: p.phone || '',
    telefonoFisso: '',
    email: p.email || '',
    pec: p.pecEmail || '',
    codiceDestinatario: p.codiceDestinatario || '0000000',
    username: p.username,
    tempPassword: p.tempPassword || '',
    mustChangePassword: p.mustChangePassword,
    customerType: p.commercialCategory === 'RIV' ? 'Rivenditore' : 'Installatore',
    categoriaCode: (p.commercialCategory || 'IST').toLowerCase(),
    discount: p.discount ?? 40,
    fido: 0,
    codicePagamento: '',
    isElmarkCustomer: false,
    elmarkDiscounts: {},
    isActive: true,
    ordersCount: 0,
    createdAt: p.createdAt.toISOString(),
  }));

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
    clients: [...(clientsRes.clients || []), ...mappedPromoClients],
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

  // Risoluzione tipo di scadenza e data opzionale
  let resolvedExpiryType: DiscountExpiryType = 'NONE';
  let parsedExpiresAt: Date | null = null;

  if (input.expiryType === 'FIRST_PURCHASE' || input.expiryType === 'NEXT_PURCHASE') {
    resolvedExpiryType = input.expiryType;
    parsedExpiresAt = null;
  } else if (input.expiresAt && String(input.expiresAt).trim()) {
    const rawExp = String(input.expiresAt).trim();
    if (rawExp === 'FIRST_PURCHASE' || rawExp === 'NEXT_PURCHASE') {
      resolvedExpiryType = rawExp;
      parsedExpiresAt = null;
    } else {
      const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawExp);
      const dt = dateOnly
        ? new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T23:59:59.999Z`)
        : new Date(rawExp);
      if (!isNaN(dt.getTime())) {
        resolvedExpiryType = 'DATE';
        parsedExpiresAt = dt;
      }
    }
  }

  // Risolvi i singoli clienti destinatari: ogni impostazione di sconto viene salvata per singolo cliente
  const agentClientsRes = await getAgentClientsList();
  const allAgentClients = agentClientsRes.clients || [];

  let resolvedTargetClients: DiscountTargetClientMeta[] = [];

  if (clientScope === 'ALL_CLIENTS') {
    resolvedTargetClients = allAgentClients.map(c => ({
      id: c.id,
      code: (c.zucchettiCode || '').trim().toUpperCase(),
      name: c.companyName,
      baseDiscount: Number(c.discount || 0),
      categoryCode: normalizeClientCategoryCode(c.categoriaCode || c.customerType, c.discount),
      categoryLabel: c.customerType || '',
    }));
  } else if (clientScope === 'CLIENT_CATEGORY') {
    resolvedTargetClients = allAgentClients
      .filter(c => {
        const catCode = normalizeClientCategoryCode(
          c.categoriaCode || c.customerType,
          c.discount
        );
        return catCode && clientCategories.includes(catCode);
      })
      .map(c => ({
        id: c.id,
        code: (c.zucchettiCode || '').trim().toUpperCase(),
        name: c.companyName,
        baseDiscount: Number(c.discount || 0),
        categoryCode: normalizeClientCategoryCode(c.categoriaCode || c.customerType, c.discount),
        categoryLabel: c.customerType || '',
      }));
  } else if (clientsMeta.length > 0) {
    resolvedTargetClients = clientsMeta.map(cm => ({
      id: String(cm.id || cm.code || '').trim(),
      code: String(cm.code || '').trim().toUpperCase(),
      name: String(cm.name || cm.code || '').trim(),
      baseDiscount: Number(cm.baseDiscount || 0),
      categoryCode: cm.categoryCode || '',
      categoryLabel: cm.categoryLabel || '',
    }));
  } else {
    const idSet = new Set(clientIds);
    const codeSet = new Set(clientCodes.map(c => c.toUpperCase()));
    const matchedFromPortfolio = allAgentClients.filter(
      c =>
        idSet.has(c.id) ||
        (c.zucchettiCode && codeSet.has(c.zucchettiCode.trim().toUpperCase()))
    );
    if (matchedFromPortfolio.length > 0) {
      resolvedTargetClients = matchedFromPortfolio.map(c => ({
        id: c.id,
        code: (c.zucchettiCode || '').trim().toUpperCase(),
        name: c.companyName,
        baseDiscount: Number(c.discount || 0),
        categoryCode: normalizeClientCategoryCode(c.categoriaCode || c.customerType, c.discount),
        categoryLabel: c.customerType || '',
      }));
    } else if (clientIds.length > 0 || clientCodes.length > 0) {
      resolvedTargetClients = [
        {
          id: clientIds[0] || clientCodes[0] || '',
          code: (clientCodes[0] || '').toUpperCase(),
          name: input.clientName || clientCodes[0] || 'Cliente',
        },
      ];
    }
  }

  // Deduplica per id / codice
  const uniqueClientsMap = new Map<string, DiscountTargetClientMeta>();
  for (const tc of resolvedTargetClients) {
    const key = (tc.code || tc.id).toUpperCase();
    if (key && !uniqueClientsMap.has(key)) {
      uniqueClientsMap.set(key, tc);
    }
  }
  const finalClientsList = Array.from(uniqueClientsMap.values());

  if (finalClientsList.length === 0) {
    return {
      success: false,
      error: 'Nessun cliente corrispondente ai criteri selezionati.',
    };
  }

  const upsertSingleClientRule = async (
    targetRuleId: string,
    clientMeta: DiscountTargetClientMeta
  ) => {
    const cId = clientMeta.id || clientMeta.code;
    const cCode = (clientMeta.code || '').toUpperCase();
    const cName = clientMeta.name || cCode || 'Cliente';

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
        "expiryType",
        "expiresAt",
        "consumedAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'SINGLE_CLIENT', $5, $6, $7,
        $8::jsonb, $9::jsonb, $10::jsonb, '[]'::jsonb, $11,
        $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
        $18, $19, $20, $21, $22, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "clientScope" = 'SINGLE_CLIENT',
        "clientId" = EXCLUDED."clientId",
        "clientCode" = EXCLUDED."clientCode",
        "clientName" = EXCLUDED."clientName",
        "clientIds" = EXCLUDED."clientIds",
        "clientCodes" = EXCLUDED."clientCodes",
        "clientsMeta" = EXCLUDED."clientsMeta",
        "clientCategories" = '[]'::jsonb,
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
        "expiryType" = EXCLUDED."expiryType",
        "expiresAt" = EXCLUDED."expiresAt",
        "consumedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP`,
      targetRuleId,
      session.user.id,
      agentCode,
      autoName,
      cId,
      cCode,
      cName,
      JSON.stringify(cId ? [cId] : []),
      JSON.stringify(cCode ? [cCode] : []),
      JSON.stringify([clientMeta]),
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
      resolvedExpiryType,
      parsedExpiresAt
    );
  };

  const executeBatchUpsert = async () => {
    if (input.id && input.id.trim() && finalClientsList.length === 1) {
      await upsertSingleClientRule(input.id.trim(), finalClientsList[0]);
    } else {
      if (input.id && input.id.trim()) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "b2b_agent_discount_rules" WHERE "id" = $1 AND ("agentId" = $2 OR ("agentCode" != '' AND "agentCode" = $3))`,
          input.id.trim(),
          session.user.id,
          agentCode
        );
      }
      for (let i = 0; i < finalClientsList.length; i++) {
        const cm = finalClientsList[i];
        const perClientRuleId = `drule_${Date.now()}_${i}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        await upsertSingleClientRule(perClientRuleId, cm);
      }
    }
  };

  try {
    try {
      await executeBatchUpsert();
    } catch (firstErr: any) {
      await ensureDiscountRulesTable(true);
      await executeBatchUpsert();
    }

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

/**
 * Rimuove uno sconto ESCLUSIVAMENTE per uno specifico cliente.
 * Se la regola era originariamente condivisa con più clienti (o categoria / tutti i clienti),
 * mantiene lo sconto attivo su tutti gli altri clienti e lo elimina solo dal cliente scelto.
 */
export async function removeDiscountFromClientAction(
  ruleId: string,
  clientId: string,
  clientCode?: string
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
    const existingRules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);
    const targetRule = existingRules.find(r => r.id === ruleId);
    if (!targetRule) {
      return { success: true, rules: existingRules };
    }

    const cleanTargetId = (clientId || '').trim();
    const cleanTargetCode = (clientCode || '').trim().toUpperCase();

    const clientsRes = await getAgentClientsList();
    const allClients = clientsRes.clients || [];

    // Trova tutti i clienti dell'agente a cui si applicava questa regola
    const matchingClients = allClients.filter(c => {
      const catCode = normalizeClientCategoryCode(
        c.categoriaCode || c.customerType,
        c.discount
      );
      return doesRuleMatchClient(targetRule, {
        clientId: c.id,
        clientCode: c.zucchettiCode,
        clientCategory: catCode,
        baseDiscount: c.discount,
      });
    });

    // Filtra via SOLO il cliente da cui vogliamo eliminare lo sconto
    const remainingClients = matchingClients.filter(c => {
      const cId = (c.id || '').trim();
      const cCode = (c.zucchettiCode || '').trim().toUpperCase();
      if (cleanTargetId && cId === cleanTargetId) return false;
      if (cleanTargetCode && cCode === cleanTargetCode) return false;
      return true;
    });

    // Elimina la regola originale
    await prisma.$executeRawUnsafe(
      `DELETE FROM "b2b_agent_discount_rules"
       WHERE "id" = $1 AND ("agentId" = $2 OR ("agentCode" != '' AND "agentCode" = $3))`,
      ruleId,
      session.user.id,
      agentCode
    );

    // Se c'erano altri clienti associati a quella regola, crea per ciascuno di loro la propria regola individuale
    for (let i = 0; i < remainingClients.length; i++) {
      const rc = remainingClients[i];
      const newRuleId = `drule_${Date.now()}_${i}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const cId = rc.id || rc.zucchettiCode;
      const cCode = (rc.zucchettiCode || '').trim().toUpperCase();
      const cName = rc.companyName || cCode || 'Cliente';
      const cm: DiscountTargetClientMeta = {
        id: cId,
        code: cCode,
        name: cName,
        baseDiscount: Number(rc.discount || 0),
        categoryCode: normalizeClientCategoryCode(
          rc.categoriaCode || rc.customerType,
          rc.discount
        ),
        categoryLabel: rc.customerType || '',
      };

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
          "expiryType",
          "expiresAt",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, 'SINGLE_CLIENT', $5, $6, $7,
          $8::jsonb, $9::jsonb, $10::jsonb, '[]'::jsonb, $11,
          $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
          $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        newRuleId,
        session.user.id,
        agentCode,
        targetRule.name,
        cId,
        cCode,
        cName,
        JSON.stringify(cId ? [cId] : []),
        JSON.stringify(cCode ? [cCode] : []),
        JSON.stringify([cm]),
        targetRule.targetType,
        JSON.stringify(targetRule.targetSkus || []),
        JSON.stringify(targetRule.targetProductsMeta || []),
        JSON.stringify(targetRule.targetBrands || []),
        JSON.stringify(targetRule.targetProductGroups || []),
        JSON.stringify(targetRule.targetFamilies || []),
        JSON.stringify(targetRule.targetCategories || []),
        targetRule.calculationMode,
        targetRule.discountValue,
        targetRule.isActive,
        targetRule.expiryType || (targetRule.expiresAt ? 'DATE' : 'NONE'),
        targetRule.expiresAt ? new Date(targetRule.expiresAt) : null
      );
    }

    revalidatePath('/', 'layout');
    revalidatePath('/account/discounts');
    revalidatePath('/account/clients');
    revalidatePath('/account/catalog-builder');
    revalidatePath('/catalog');
    revalidatePath('/cart');

    const updatedRules = await getAgentDiscountRulesFromDb(session.user.id, agentCode);
    return { success: true, rules: updatedRules };
  } catch (err: any) {
    console.error('Errore removeDiscountFromClientAction:', err);
    return {
      success: false,
      error: err.message || 'Errore durante la rimozione dello sconto dal cliente.',
    };
  }
}
