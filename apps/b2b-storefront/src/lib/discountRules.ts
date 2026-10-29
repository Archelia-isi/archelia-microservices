import { prisma } from '@archelia/b2b-database';
import {
  AgentDiscountRule,
  DiscountClientScope,
  DiscountExpiryType,
  DiscountTargetClientMeta,
  DiscountTargetProductMeta,
  DiscountTargetType,
  doesRuleMatchClient,
  isDiscountRuleExpired,
} from './discountRulesEngine';

export * from './discountRulesEngine';

let tableInitialized = false;

export async function ensureDiscountRulesTable(force = false): Promise<void> {
  if (tableInitialized && !force) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "b2b_agent_discount_rules" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "agentId" TEXT NOT NULL,
        "agentCode" TEXT NOT NULL DEFAULT '',
        "name" TEXT NOT NULL DEFAULT '',
        "clientScope" TEXT NOT NULL DEFAULT 'ALL_CLIENTS',
        "clientId" TEXT,
        "clientCode" TEXT,
        "clientName" TEXT,
        "clientIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "clientCodes" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "clientsMeta" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "clientCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetType" TEXT NOT NULL DEFAULT 'PRODUCTS',
        "targetSkus" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetProductsMeta" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetBrands" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetProductGroups" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetFamilies" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "targetCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "calculationMode" TEXT NOT NULL DEFAULT 'EXTRA_CASCADE',
        "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiryType" TEXT NOT NULL DEFAULT 'NONE',
        "expiresAt" TIMESTAMP(3),
        "consumedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "b2b_agent_discount_rules"
        ADD COLUMN IF NOT EXISTS "clientIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "clientCodes" JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "clientsMeta" JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "clientCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "expiryType" TEXT NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_b2b_agent_discount_rules_agent"
      ON "b2b_agent_discount_rules" ("agentId", "isActive");
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('Errore inizializzazione tabella b2b_agent_discount_rules:', err);
  }
}

function parseJsonStringArray(val: any, uppercase = true): string[] {
  if (Array.isArray(val)) {
    return val
      .map(v => {
        const s = String(v || '').trim();
        return uppercase ? s.toUpperCase() : s;
      })
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed
          .map(v => {
            const s = String(v || '').trim();
            return uppercase ? s.toUpperCase() : s;
          })
          .filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parseProductsMeta(val: any): DiscountTargetProductMeta[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function parseClientsMeta(val: any): DiscountTargetClientMeta[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export function mapRowToAgentDiscountRule(row: any): AgentDiscountRule {
  const rawScope = String(row.clientScope || 'ALL_CLIENTS');
  const clientScope: DiscountClientScope =
    rawScope === 'SINGLE_CLIENT' ||
    rawScope === 'SELECTED_CLIENTS' ||
    rawScope === 'CLIENT_CATEGORY'
      ? (rawScope as DiscountClientScope)
      : 'ALL_CLIENTS';

  const parsedIds = parseJsonStringArray(row.clientIds, false);
  const parsedCodes = parseJsonStringArray(row.clientCodes, true);
  const parsedMeta = parseClientsMeta(row.clientsMeta);
  const clientCategories = parseJsonStringArray(row.clientCategories, true);

  const singleId = row.clientId ? String(row.clientId) : null;
  const singleCode = row.clientCode ? String(row.clientCode) : null;
  const singleName = row.clientName ? String(row.clientName) : null;

  const clientIds =
    parsedIds.length > 0 ? parsedIds : singleId ? [singleId] : [];
  const clientCodes =
    parsedCodes.length > 0 ? parsedCodes : singleCode ? [singleCode.toUpperCase()] : [];
  const clientsMeta: DiscountTargetClientMeta[] =
    parsedMeta.length > 0
      ? parsedMeta
      : singleId || singleCode
        ? [
            {
              id: singleId || singleCode || '',
              code: singleCode || '',
              name: singleName || singleCode || '',
            },
          ]
        : [];

  const rawExpiryType = String(row.expiryType || '').trim().toUpperCase();
  const expiryType: DiscountExpiryType =
    rawExpiryType === 'FIRST_PURCHASE' ||
    rawExpiryType === 'NEXT_PURCHASE' ||
    rawExpiryType === 'DATE'
      ? (rawExpiryType as DiscountExpiryType)
      : row.expiresAt
        ? 'DATE'
        : 'NONE';

  return {
    id: String(row.id),
    agentId: String(row.agentId || ''),
    agentCode: String(row.agentCode || ''),
    name: String(row.name || ''),
    clientScope,
    clientId: singleId || (clientIds[0] ?? null),
    clientCode: singleCode || (clientCodes[0] ?? null),
    clientName: singleName || (clientsMeta[0]?.name ?? null),
    clientIds,
    clientCodes,
    clientsMeta,
    clientCategories,
    targetType: (row.targetType as DiscountTargetType) || 'PRODUCTS',
    targetSkus: parseJsonStringArray(row.targetSkus, true),
    targetProductsMeta: parseProductsMeta(row.targetProductsMeta),
    targetBrands: parseJsonStringArray(row.targetBrands, true),
    targetProductGroups: parseJsonStringArray(row.targetProductGroups, true),
    targetFamilies: parseJsonStringArray(row.targetFamilies, true),
    targetCategories: parseJsonStringArray(row.targetCategories, true),
    calculationMode:
      row.calculationMode === 'FIXED_OVERRIDE' ? 'FIXED_OVERRIDE' : 'EXTRA_CASCADE',
    discountValue: Number(row.discountValue || 0),
    isActive: Boolean(row.isActive),
    expiryType,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    consumedAt: row.consumedAt ? new Date(row.consumedAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function hydrateRulesWithPurchaseConsumption(
  rules: AgentDiscountRule[],
  options?: {
    excludeOrderId?: string | null;
    fallbackClientId?: string | null;
    fallbackClientCode?: string | null;
  }
): Promise<AgentDiscountRule[]> {
  const purchaseBasedRules = (rules || []).filter(
    r =>
      (r.expiryType === 'FIRST_PURCHASE' || r.expiryType === 'NEXT_PURCHASE') &&
      !r.consumedAt
  );
  if (purchaseBasedRules.length === 0) return rules;

  const clientIdsSet = new Set<string>();
  const clientCodesSet = new Set<string>();

  if (options?.fallbackClientId) clientIdsSet.add(String(options.fallbackClientId).trim());
  if (options?.fallbackClientCode) {
    clientCodesSet.add(String(options.fallbackClientCode).trim().toUpperCase());
  }

  for (const r of purchaseBasedRules) {
    if (r.clientId) clientIdsSet.add(String(r.clientId).trim());
    for (const id of r.clientIds || []) {
      if (id) clientIdsSet.add(String(id).trim());
    }
    if (r.clientCode) clientCodesSet.add(String(r.clientCode).trim().toUpperCase());
    for (const code of r.clientCodes || []) {
      if (code) clientCodesSet.add(String(code).trim().toUpperCase());
    }
  }

  const clientIdsArr = Array.from(clientIdsSet).filter(Boolean);
  const clientCodesArr = Array.from(clientCodesSet).filter(Boolean);
  if (clientIdsArr.length === 0 && clientCodesArr.length === 0) {
    return rules;
  }

  try {
    const orderRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT
         o."id" AS "orderId",
         o."userId" AS "userId",
         UPPER(COALESCE(u."zucchettiCode", '')) AS "clientCode",
         o."createdAt" AS "createdAt",
         o."updatedAt" AS "updatedAt"
       FROM "b2b_orders" o
       LEFT JOIN "b2b_users" u ON u."id" = o."userId"
       WHERE o."status" IN ('PENDING_AGENT_REVIEW', 'APPROVED', 'SENT_TO_ZUCCHETTI')
         AND ($1::text IS NULL OR o."id" != $1)
         AND (
           o."userId" = ANY($2::text[])
           OR UPPER(COALESCE(u."zucchettiCode", '')) = ANY($3::text[])
         )`,
      options?.excludeOrderId || null,
      clientIdsArr,
      clientCodesArr
    );

    const ordersByUserId = new Map<string, { createdAt: Date; effectiveAt: Date }[]>();
    const ordersByClientCode = new Map<string, { createdAt: Date; effectiveAt: Date }[]>();

    for (const row of orderRows || []) {
      const createdAt = new Date(row.createdAt);
      const updatedAt = row.updatedAt ? new Date(row.updatedAt) : createdAt;
      const effectiveAt = updatedAt.getTime() > createdAt.getTime() ? updatedAt : createdAt;
      const entry = { createdAt, effectiveAt };

      if (row.userId) {
        const list = ordersByUserId.get(String(row.userId)) || [];
        list.push(entry);
        ordersByUserId.set(String(row.userId), list);
      }
      if (row.clientCode) {
        const code = String(row.clientCode).trim().toUpperCase();
        const list = ordersByClientCode.get(code) || [];
        list.push(entry);
        ordersByClientCode.set(code, list);
      }
    }

    return rules.map(rule => {
      if (
        (rule.expiryType !== 'FIRST_PURCHASE' && rule.expiryType !== 'NEXT_PURCHASE') ||
        rule.consumedAt
      ) {
        return rule;
      }

      const candidateIds = new Set<string>(
        [rule.clientId, ...(rule.clientIds || [])].filter(Boolean) as string[]
      );
      const candidateCodes = new Set<string>(
        [rule.clientCode, ...(rule.clientCodes || [])]
          .filter(Boolean)
          .map(c => String(c).trim().toUpperCase())
      );

      if (candidateIds.size === 0 && candidateCodes.size === 0) {
        if (options?.fallbackClientId) candidateIds.add(String(options.fallbackClientId).trim());
        if (options?.fallbackClientCode) {
          candidateCodes.add(String(options.fallbackClientCode).trim().toUpperCase());
        }
      }

      const matchedOrders: { createdAt: Date; effectiveAt: Date }[] = [];
      for (const id of Array.from(candidateIds)) {
        const list = ordersByUserId.get(id);
        if (list) matchedOrders.push(...list);
      }
      for (const code of Array.from(candidateCodes)) {
        const list = ordersByClientCode.get(code);
        if (list) matchedOrders.push(...list);
      }

      if (matchedOrders.length === 0) return rule;

      if (rule.expiryType === 'FIRST_PURCHASE') {
        const earliest = matchedOrders.reduce((min, cur) =>
          cur.createdAt.getTime() < min.createdAt.getTime() ? cur : min
        );
        return {
          ...rule,
          consumedAt: earliest.createdAt.toISOString(),
        };
      }

      if (rule.expiryType === 'NEXT_PURCHASE') {
        const ruleActivatedTime = new Date(rule.updatedAt || rule.createdAt).getTime();
        const orderAfterRule = matchedOrders.find(
          o => o.effectiveAt.getTime() >= ruleActivatedTime
        );
        if (orderAfterRule) {
          return {
            ...rule,
            consumedAt: orderAfterRule.effectiveAt.toISOString(),
          };
        }
      }

      return rule;
    });
  } catch (err) {
    console.error('Errore hydrateRulesWithPurchaseConsumption:', err);
    return rules;
  }
}

export async function getAgentDiscountRulesFromDb(
  agentId: string,
  agentCode?: string,
  options?: {
    excludeOrderId?: string | null;
    fallbackClientId?: string | null;
    fallbackClientCode?: string | null;
  }
): Promise<AgentDiscountRule[]> {
  const queryRules = async () => {
    const cleanCode = (agentCode || '').trim();
    const rows: any[] = cleanCode
      ? await prisma.$queryRawUnsafe(
          `SELECT * FROM "b2b_agent_discount_rules" WHERE "agentId" = $1 OR ("agentCode" != '' AND "agentCode" = $2) ORDER BY "createdAt" DESC`,
          agentId,
          cleanCode
        )
      : await prisma.$queryRawUnsafe(
          `SELECT * FROM "b2b_agent_discount_rules" WHERE "agentId" = $1 ORDER BY "createdAt" DESC`,
          agentId
        );
    const mapped = (rows || []).map(mapRowToAgentDiscountRule);
    return await hydrateRulesWithPurchaseConsumption(mapped, options);
  };

  try {
    return await queryRules();
  } catch (err) {
    try {
      await ensureDiscountRulesTable(true);
      return await queryRules();
    } catch (retryErr) {
      console.error('Errore lettura b2b_agent_discount_rules:', retryErr);
      return [];
    }
  }
}

/**
 * Carica le regole di sconto attive applicabili a uno specifico cliente B2B
 * (sia quelle create dal suo agente per lui/più clienti scelti, sia per la sua Categoria Cliente, sia 'ALL_CLIENTS').
 */
export async function getActiveDiscountRulesForClientUser(clientUser: {
  id: string;
  zucchettiCode?: string | null;
  agentId?: string | null;
  customerType?: string | null;
  discount?: number | null;
}): Promise<AgentDiscountRule[]> {
  const queryClientRules = async () => {
    const clientId = clientUser.id || '';
    const clientCode = (clientUser.zucchettiCode || '').trim().toUpperCase();
    const agentId = clientUser.agentId || '';
    const clientCategory = clientUser.customerType || '';
    const baseDiscount = clientUser.discount ?? null;

    const rows: any[] = agentId
      ? await prisma.$queryRawUnsafe(
          `SELECT * FROM "b2b_agent_discount_rules"
           WHERE "isActive" = true
             AND ("agentId" = $1 OR "clientScope" != 'ALL_CLIENTS')
           ORDER BY "updatedAt" DESC`,
          agentId
        )
      : await prisma.$queryRawUnsafe(
          `SELECT * FROM "b2b_agent_discount_rules"
           WHERE "isActive" = true
           ORDER BY "updatedAt" DESC`
        );

    const mapped = await hydrateRulesWithPurchaseConsumption(
      (rows || []).map(mapRowToAgentDiscountRule),
      {
        fallbackClientId: clientId,
        fallbackClientCode: clientCode,
      }
    );
    return mapped.filter(rule => {
      if (isDiscountRuleExpired(rule)) return false;
      if (rule.clientScope === 'ALL_CLIENTS') {
        return !agentId || rule.agentId === agentId;
      }
      if (rule.clientScope === 'CLIENT_CATEGORY') {
        if (agentId && rule.agentId && rule.agentId !== agentId) return false;
      }
      return doesRuleMatchClient(rule, {
        clientId,
        clientCode,
        clientCategory,
        baseDiscount,
      });
    });
  };

  try {
    return await queryClientRules();
  } catch (err) {
    try {
      await ensureDiscountRulesTable(true);
      return await queryClientRules();
    } catch (retryErr) {
      console.error('Errore getActiveDiscountRulesForClientUser:', retryErr);
      return [];
    }
  }
}
