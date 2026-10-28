import { prisma } from '@archelia/b2b-database';
import {
  AgentDiscountRule,
  DiscountClientScope,
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
        "expiresAt" TIMESTAMP(3),
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
        ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
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
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function getAgentDiscountRulesFromDb(
  agentId: string,
  agentCode?: string
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
    return (rows || []).map(mapRowToAgentDiscountRule);
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

    const mapped = (rows || []).map(mapRowToAgentDiscountRule);
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
