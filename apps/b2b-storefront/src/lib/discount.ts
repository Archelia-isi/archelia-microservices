import { verifySession } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from '@archelia/b2b-database';
import {
  AgentDiscountRule,
  EvaluatedProductPricing,
  evaluateProductDiscountWithRules,
  getActiveDiscountRulesForClientUser,
  getAgentDiscountRulesFromDb,
} from '@/lib/discountRules';

export async function getEffectiveDiscount() {
  const session = await verifySession();
  if (!session) return 0;

  let baseDiscount = session.user.discount || 0;

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedDiscountStr = cookieStore.get('impersonatedClientDiscount')?.value;
    if (impersonatedDiscountStr) {
      baseDiscount = parseFloat(impersonatedDiscountStr) || 0;
    }
  }

  return baseDiscount;
}

export async function getExtraAgentDiscount() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return 0;

  const cookieStore = cookies();
  const extraStr = cookieStore.get('agentExtraDiscount')?.value;
  return extraStr ? parseFloat(extraStr) || 0 : 0;
}

export async function getEffectiveElmarkDiscounts(): Promise<Record<string, number>> {
  const session = await verifySession();
  if (!session) return {};

  let discounts = (session.user.elmarkDiscounts as Record<string, number>) || {};

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
    if (impersonatedClientCode) {
      const impUser = await prisma.b2BUser.findUnique({
        where: { zucchettiCode: impersonatedClientCode },
        select: { elmarkDiscounts: true }
      });
      if (impUser) {
        discounts = (impUser.elmarkDiscounts as Record<string, number>) || {};
      }
    }
  }

  return discounts;
}

export interface EffectiveClientDiscountContext {
  isAuthenticated: boolean;
  baseDiscount: number;
  extraAgentDiscount: number;
  elmarkDiscounts: Record<string, number>;
  clientId: string | null;
  clientCode: string | null;
  rules: AgentDiscountRule[];
}

/**
 * Risolve il contesto sconti completo per la sessione attiva (Cliente B2B oppure Agente in impersonificazione):
 * - Sconto base fisso del cliente (non modificabile)
 * - Sconti Elmark effettivi (tramite getEffectiveElmarkDiscounts)
 * - Regole di sconto attive create dall'agente (per prodotto singolo/selezione, marchio, gruppo, famiglia, categoria)
 */
export async function getEffectiveClientDiscountContext(): Promise<EffectiveClientDiscountContext> {
  const session = await verifySession();
  if (!session) {
    return {
      isAuthenticated: false,
      baseDiscount: 0,
      extraAgentDiscount: 0,
      elmarkDiscounts: {},
      clientId: null,
      clientCode: null,
      rules: [],
    };
  }

  const [baseDiscount, extraAgentDiscount, elmarkDiscounts] = await Promise.all([
    getEffectiveDiscount(),
    getExtraAgentDiscount(),
    getEffectiveElmarkDiscounts(),
  ]);

  let clientId: string | null = session.user.id || null;
  let clientCode: string | null = session.user.zucchettiCode || null;
  let rules: AgentDiscountRule[] = [];

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
    const allAgentRules = await getAgentDiscountRulesFromDb(
      session.user.id,
      session.user.zucchettiCode || ''
    );

    if (impersonatedClientCode) {
      const impUser = await prisma.b2BUser.findUnique({
        where: { zucchettiCode: impersonatedClientCode },
        select: { id: true, zucchettiCode: true },
      });
      clientId = impUser?.id || null;
      clientCode = impUser?.zucchettiCode || impersonatedClientCode;
      rules = allAgentRules.filter(r => r.isActive);
    } else {
      clientId = null;
      clientCode = null;
      rules = allAgentRules.filter(r => r.isActive && r.clientScope === 'ALL_CLIENTS');
    }
  } else {
    rules = await getActiveDiscountRulesForClientUser({
      id: session.user.id,
      zucchettiCode: session.user.zucchettiCode,
      agentId: (session.user as any).agentId || null,
    });
  }

  return {
    isAuthenticated: true,
    baseDiscount,
    extraAgentDiscount,
    elmarkDiscounts,
    clientId,
    clientCode,
    rules,
  };
}

/**
 * Calcola il prezzo scontato di un documento prodotto Typesense (sia ZUCCHETTI sia ELMARK)
 * tenendo conto dello sconto base fisso del cliente e delle regole di sconto dell'agente.
 */
export function evaluateTypesenseProductWithContext(
  doc: any,
  storeMode: 'ZUCCHETTI' | 'ELMARK',
  ctx: EffectiveClientDiscountContext,
  itemExtraDiscountOverride?: number | null
): EvaluatedProductPricing & { originalPriceB2b: number } {
  const originalPriceB2b =
    storeMode === 'ELMARK'
      ? Number(doc.price) > 0
        ? Number(doc.price)
        : Number(doc.price_b2b || 0)
      : Number(doc.price_b2b) > 0
        ? Number(doc.price_b2b)
        : Number(doc.price || 0);

  const dGroup = String(doc.discgroup || '').trim();
  const effectiveBase =
    storeMode === 'ELMARK'
      ? Number(ctx.elmarkDiscounts[dGroup] || 0)
      : Number(ctx.baseDiscount || 0);

  const fallbackExtra =
    storeMode === 'ZUCCHETTI'
      ? itemExtraDiscountOverride !== undefined && itemExtraDiscountOverride !== null
        ? Number(itemExtraDiscountOverride || 0)
        : Number(ctx.extraAgentDiscount || 0)
      : 0;

  const evaluated = evaluateProductDiscountWithRules(
    {
      sku: String(doc.sku || ''),
      brand: String(doc.brand || ''),
      productGroup: String(doc.product_group || doc.productGroup || ''),
      family: String(doc.family || ''),
      category: String(doc.category || ''),
      listPrice: originalPriceB2b,
      catalogSource: storeMode === 'ELMARK' ? 'elmark' : 'zucchetti',
      discgroup: dGroup,
    },
    effectiveBase,
    ctx.rules,
    { clientId: ctx.clientId, clientCode: ctx.clientCode },
    fallbackExtra
  );

  return {
    ...evaluated,
    originalPriceB2b,
  };
}
