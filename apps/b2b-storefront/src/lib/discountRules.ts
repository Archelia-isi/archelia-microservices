import { prisma } from '@archelia/b2b-database';
import {
  AgentDiscountRule,
  DiscountTargetProductMeta,
  DiscountTargetType,
} from './discountRulesEngine';

export * from './discountRulesEngine';

let tableInitialized = false;

export async function ensureDiscountRulesTable(): Promise<void> {
  if (tableInitialized) return;
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
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
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

function parseJsonStringArray(val: any): string[] {
  if (Array.isArray(val)) {
    return val.map(v => String(v || '').trim().toUpperCase()).filter(Boolean);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map(v => String(v || '').trim().toUpperCase()).filter(Boolean);
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

export function mapRowToAgentDiscountRule(row: any): AgentDiscountRule {
  return {
    id: String(row.id),
    agentId: String(row.agentId || ''),
    agentCode: String(row.agentCode || ''),
    name: String(row.name || ''),
    clientScope:
      row.clientScope === 'SINGLE_CLIENT' ? 'SINGLE_CLIENT' : 'ALL_CLIENTS',
    clientId: row.clientId ? String(row.clientId) : null,
    clientCode: row.clientCode ? String(row.clientCode) : null,
    clientName: row.clientName ? String(row.clientName) : null,
    targetType: (row.targetType as DiscountTargetType) || 'PRODUCTS',
    targetSkus: parseJsonStringArray(row.targetSkus),
    targetProductsMeta: parseProductsMeta(row.targetProductsMeta),
    targetBrands: parseJsonStringArray(row.targetBrands),
    targetProductGroups: parseJsonStringArray(row.targetProductGroups),
    targetFamilies: parseJsonStringArray(row.targetFamilies),
    targetCategories: parseJsonStringArray(row.targetCategories),
    calculationMode:
      row.calculationMode === 'FIXED_OVERRIDE' ? 'FIXED_OVERRIDE' : 'EXTRA_CASCADE',
    discountValue: Number(row.discountValue || 0),
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function getAgentDiscountRulesFromDb(
  agentId: string,
  agentCode?: string
): Promise<AgentDiscountRule[]> {
  await ensureDiscountRulesTable();
  try {
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
  } catch (err) {
    console.error('Errore lettura b2b_agent_discount_rules:', err);
    return [];
  }
}

/**
 * Carica le regole di sconto attive applicabili a uno specifico cliente B2B
 * (sia quelle create dal suo agente per 'SINGLE_CLIENT' su quel cliente, sia quelle 'ALL_CLIENTS' del suo agente).
 */
export async function getActiveDiscountRulesForClientUser(clientUser: {
  id: string;
  zucchettiCode?: string | null;
  agentId?: string | null;
}): Promise<AgentDiscountRule[]> {
  await ensureDiscountRulesTable();
  try {
    const clientId = clientUser.id || '';
    const clientCode = (clientUser.zucchettiCode || '').trim().toUpperCase();
    const agentId = clientUser.agentId || '';

    if (agentId) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "b2b_agent_discount_rules"
         WHERE "isActive" = true
           AND (
             ("agentId" = $1 AND "clientScope" = 'ALL_CLIENTS')
             OR ("clientScope" = 'SINGLE_CLIENT' AND ("clientId" = $2 OR ($3 != '' AND UPPER("clientCode") = $3)))
           )
         ORDER BY "updatedAt" DESC`,
        agentId,
        clientId,
        clientCode
      );
      return (rows || []).map(mapRowToAgentDiscountRule);
    } else {
      // Se il cliente non ha agentId diretto sul record ma una regola punta al suo clientCode/clientId
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "b2b_agent_discount_rules"
         WHERE "isActive" = true
           AND (
             ("clientScope" = 'SINGLE_CLIENT' AND ("clientId" = $1 OR ($2 != '' AND UPPER("clientCode") = $2)))
             OR "clientScope" = 'ALL_CLIENTS'
           )
         ORDER BY "updatedAt" DESC`,
        clientId,
        clientCode
      );
      return (rows || []).map(mapRowToAgentDiscountRule);
    }
  } catch (err) {
    console.error('Errore getActiveDiscountRulesForClientUser:', err);
    return [];
  }
}
