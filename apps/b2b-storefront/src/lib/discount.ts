import { verifySession } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from '@archelia/b2b-database';
import {
  AgentDiscountRule,
  EvaluatedProductPricing,
  doesRuleMatchClient,
  evaluateProductDiscountWithRules,
  getActiveDiscountRulesForClientUser,
  getAgentDiscountRulesFromDb,
  isDiscountRuleExpired,
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
  clientCategory: string | null;
  rules: AgentDiscountRule[];
}

/**
 * Risolve il contesto sconti completo per la sessione attiva (Cliente B2B oppure Agente in impersonificazione):
 * - Sconto base fisso del cliente (non modificabile)
 * - Categoria cliente (es. RIV - Rivenditore, IST - Installatore/Impiantista, GEN - Generale)
 * - Sconti Elmark effettivi (tramite getEffectiveElmarkDiscounts)
 * - Regole di sconto attive create dall'agente (per tutto il catalogo, prodotto singolo/selezione, marchio, gruppo, famiglia, categoria)
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
      clientCategory: null,
      rules: [],
    };
  }

  let baseDiscount = session.user.discount || 0;
  let extraAgentDiscount = 0;
  let elmarkDiscounts: Record<string, number> =
    (session.user.elmarkDiscounts as Record<string, number>) || {};

  let clientId: string | null = session.user.id || null;
  let clientCode: string | null = session.user.zucchettiCode || null;
  let clientCategory: string | null = (session.user as any).customerType || null;
  let rules: AgentDiscountRule[] = [];

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedDiscountStr = cookieStore.get('impersonatedClientDiscount')?.value;
    if (impersonatedDiscountStr) {
      baseDiscount = parseFloat(impersonatedDiscountStr) || 0;
    }
    const extraStr = cookieStore.get('agentExtraDiscount')?.value;
    extraAgentDiscount = extraStr ? parseFloat(extraStr) || 0 : 0;

    const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
    const reviewingOrderId = cookieStore.get('reviewingOrderId')?.value || null;

    const [allAgentRules, impUser, impPromo] = await Promise.all([
      getAgentDiscountRulesFromDb(session.user.id, session.user.zucchettiCode || '', {
        excludeOrderId: reviewingOrderId,
        fallbackClientCode: impersonatedClientCode || null,
      }),
      impersonatedClientCode
        ? prisma.b2BUser.findUnique({
            where: { zucchettiCode: impersonatedClientCode },
            select: {
              id: true,
              zucchettiCode: true,
              customerType: true,
              elmarkDiscounts: true,
            },
          })
        : Promise.resolve(null),
      impersonatedClientCode
        ? prisma.b2BPromoProspect.findFirst({
            where: {
              OR: [
                { id: impersonatedClientCode },
                { username: { equals: impersonatedClientCode, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              username: true,
              commercialCategory: true,
              discount: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (impersonatedClientCode) {
      if (impUser) {
        elmarkDiscounts = (impUser.elmarkDiscounts as Record<string, number>) || {};
        clientId = impUser.id;
        clientCode = impUser.zucchettiCode || impersonatedClientCode;
        clientCategory = impUser.customerType || null;
      } else if (impPromo) {
        clientId = impPromo.id;
        clientCode = impPromo.username.toUpperCase();
        clientCategory = impPromo.commercialCategory || null;
        if (!impersonatedDiscountStr && impPromo.discount) {
          baseDiscount = impPromo.discount;
        }
      } else {
        clientId = null;
        clientCode = impersonatedClientCode;
        clientCategory = null;
      }
      rules = allAgentRules.filter(
        r =>
          r.isActive &&
          !isDiscountRuleExpired(r) &&
          doesRuleMatchClient(r, {
            clientId,
            clientCode,
            clientCategory,
            baseDiscount,
          })
      );
    } else {
      clientId = null;
      clientCode = null;
      clientCategory = null;
      rules = allAgentRules.filter(
        r => r.isActive && !isDiscountRuleExpired(r) && r.clientScope === 'ALL_CLIENTS'
      );
    }
  } else {
    rules = await getActiveDiscountRulesForClientUser({
      id: session.user.id,
      zucchettiCode: session.user.zucchettiCode,
      agentId: (session.user as any).agentId || null,
      customerType: (session.user as any).customerType || null,
      discount: baseDiscount,
    });
  }

  return {
    isAuthenticated: true,
    baseDiscount,
    extraAgentDiscount,
    elmarkDiscounts,
    clientId,
    clientCode,
    clientCategory,
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
    Number(doc.originalPriceB2b) > 0
      ? Number(doc.originalPriceB2b)
      : storeMode === 'ELMARK'
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
    {
      clientId: ctx.clientId,
      clientCode: ctx.clientCode,
      clientCategory: ctx.clientCategory,
      baseDiscount: effectiveBase,
    },
    fallbackExtra
  );

  return {
    ...evaluated,
    originalPriceB2b,
  };
}

/**
 * Estrae da Typesense i prodotti destinatari delle regole di sconto attive per il cliente
 * (prodotti singoli scelti per SKU, marchi, gruppi merceologici, famiglie o categorie),
 * così da mostrarli direttamente anche nei caroselli del cliente ("Scelti per te" / "In Evidenza").
 */
export async function fetchRuleTargetedProductsForCarousel(
  ctx: EffectiveClientDiscountContext,
  storeMode: 'ZUCCHETTI' | 'ELMARK',
  limit: number = 12
): Promise<any[]> {
  if (!ctx.isAuthenticated || !ctx.rules || ctx.rules.length === 0 || storeMode === 'ELMARK') {
    return [];
  }

  const activeSpecificRules = ctx.rules.filter(
    r =>
      r.isActive &&
      !isDiscountRuleExpired(r) &&
      r.discountValue > 0 &&
      r.targetType !== 'ALL_CATALOG'
  );
  if (activeSpecificRules.length === 0) {
    return [];
  }

  const escapeVal = (v: string) => `\`${String(v || '').replace(/`/g, '').trim()}\``;

  const targetSkus = Array.from(
    new Set(
      activeSpecificRules
        .flatMap(r => r.targetSkus || [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
    )
  );
  const targetBrands = Array.from(
    new Set(
      activeSpecificRules
        .flatMap(r => r.targetBrands || [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
    )
  );
  const targetGroups = Array.from(
    new Set(
      activeSpecificRules
        .flatMap(r => r.targetProductGroups || [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
    )
  );
  const targetFamilies = Array.from(
    new Set(
      activeSpecificRules
        .flatMap(r => r.targetFamilies || [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
    )
  );
  const targetCategories = Array.from(
    new Set(
      activeSpecificRules
        .flatMap(r => r.targetCategories || [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
    )
  );

  try {
    const { typesenseClient, PRODUCTS_COLLECTION_NAME } = await import(
      '@archelia/typesense/dist/client.js'
    );

    const searches: Promise<any>[] = [];

    if (targetSkus.length > 0) {
      const skuList = targetSkus.slice(0, 60).map(escapeVal).join(',');
      searches.push(
        typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q: '*',
            query_by: 'sku,title',
            filter_by: `catalog_source:=zucchetti && stock:>0 && sku:=[${skuList}]`,
            sort_by: 'stock_main:desc,stock:desc,natural_sku:asc',
            per_page: Math.min(50, Math.max(limit, targetSkus.length)),
          })
      );
    }

    const taxonomyOrClauses: string[] = [];
    if (targetBrands.length > 0) {
      taxonomyOrClauses.push(`brand:=[${targetBrands.slice(0, 40).map(escapeVal).join(',')}]`);
    }
    if (targetGroups.length > 0) {
      taxonomyOrClauses.push(
        `product_group:=[${targetGroups.slice(0, 40).map(escapeVal).join(',')}]`
      );
    }
    if (targetFamilies.length > 0) {
      taxonomyOrClauses.push(`family:=[${targetFamilies.slice(0, 40).map(escapeVal).join(',')}]`);
    }
    if (targetCategories.length > 0) {
      taxonomyOrClauses.push(
        `category:=[${targetCategories.slice(0, 40).map(escapeVal).join(',')}]`
      );
    }

    if (taxonomyOrClauses.length > 0) {
      searches.push(
        typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q: '*',
            query_by: 'sku,title',
            filter_by: `catalog_source:=zucchetti && stock_main:>0 && (${taxonomyOrClauses.join(' || ')})`,
            sort_by: 'stock_main:desc,natural_sku:asc',
            per_page: 40,
          })
      );
    }

    if (searches.length === 0) return [];

    const results = await Promise.all(searches);
    const seen = new Set<string>();
    const collected: any[] = [];

    for (const res of results) {
      for (const hit of res?.hits || []) {
        const doc = hit?.document;
        if (!doc) continue;
        const key = String(doc.sku || doc.id || '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        collected.push({ ...doc });
        if (collected.length >= limit) break;
      }
      if (collected.length >= limit) break;
    }

    return collected;
  } catch (err) {
    console.warn('Avviso fetchRuleTargetedProductsForCarousel:', err);
    return [];
  }
}
