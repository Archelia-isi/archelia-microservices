import { FastifyInstance } from 'fastify';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { sdrPrisma } from '@archelia/sdr-database';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense';
import {
  env,
  log,
  sdrSentinelQueue,
  sdrCopywriterQueue,
  sdrOutreachQueue,
} from '@archelia/core';
import * as bcrypt from 'bcryptjs';
import { authenticate } from '../auth.js';

const DANIELE_SAVOIA_AGENT_ID = 'cmtu64h1c0000jk0sb1ho1o49';
const DANIELE_SAVOIA_AGENT_CODE = '003';

function normalizeBaseUsername(companyName: string): string {
  const clean = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(
      /\b(srl|s\.r\.l\.|srls|s\.r\.l\.s\.|spa|s\.p\.a\.|snc|s\.n\.c\.|sas|s\.a\.s\.|ditta individuale|di|soc\.|coop\.|unipersonale)\b/gi,
      ''
    )
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  return clean.slice(0, 24) || 'cliente.b2b';
}

async function generateUniquePermanentUsername(
  companyName: string,
  province?: string | null
): Promise<string> {
  const base = normalizeBaseUsername(companyName);
  const prov = (province || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
  const candidates = [
    base,
    prov ? `${base}.${prov}` : `${base}.b2b`,
    `${base}.${Math.floor(100 + Math.random() * 900)}`,
    `${base}.${Math.floor(1000 + Math.random() * 9000)}`,
  ];

  for (const candidate of candidates) {
    const [existingUser, existingPromo] = await Promise.all([
      b2bPrisma.b2BUser.findUnique({ where: { username: candidate }, select: { id: true } }),
      b2bPrisma.b2BPromoProspect.findUnique({
        where: { username: candidate },
        select: { id: true },
      }),
    ]);
    if (!existingUser && !existingPromo) {
      return candidate;
    }
  }
  return `${base}.${Date.now().toString().slice(-5)}`;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Izzo!${suffix}`;
}

export async function adminB2BSdrRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ============================================================================
  // 1. AI SDR B2B — STATS & PANORAMICA
  // ============================================================================
  fastify.get('/api/admin/sdr/stats', async (_request, reply) => {
    try {
      const [
        totalProspects,
        emailProntaCount,
        senzaEmailCount,
        pecScartataCount,
        istCount,
        rivCount,
        clusterGroups,
        pipelineGroups,
        draftsCount,
        sentinelRuns,
        inboxAccounts,
        blacklistCount,
        promoTotal,
        promoContacted,
        promoLoggedIn,
        promoPendingOrder,
        promoConverted,
        outreachConfig,
      ] = await Promise.all([
        sdrPrisma.sdrProspect.count(),
        sdrPrisma.sdrProspect.count({ where: { section: 'Email_Pronta' } }),
        sdrPrisma.sdrProspect.count({ where: { section: 'Senza_Email' } }),
        sdrPrisma.sdrProspect.count({ where: { section: 'PEC_Scartata' } }),
        sdrPrisma.sdrProspect.count({ where: { commercialCategory: 'IST' } }),
        sdrPrisma.sdrProspect.count({ where: { commercialCategory: 'RIV' } }),
        sdrPrisma.sdrProspect.groupBy({
          by: ['categoryCluster', 'commercialCategory'],
          _count: { _all: true },
        }),
        sdrPrisma.sdrProspect.groupBy({
          by: ['pipelineStatus'],
          _count: { _all: true },
        }),
        sdrPrisma.sdrOutreachDraft.count(),
        sdrPrisma.sdrSentinelRun.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        sdrPrisma.sdrInboxAccount.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        sdrPrisma.sdrBlacklist.count(),
        b2bPrisma.b2BPromoProspect.count(),
        b2bPrisma.b2BPromoProspect.count({
          where: { status: 'CONTACTED', loginCount: 0 },
        }),
        b2bPrisma.b2BPromoProspect.count({
          where: { OR: [{ status: 'LOGGED_IN' }, { loginCount: { gt: 0 } }] },
        }),
        b2bPrisma.b2BPromoProspect.count({
          where: { status: 'ORDER_PENDING_APPROVAL' },
        }),
        b2bPrisma.b2BPromoProspect.count({
          where: { status: 'CONVERTED' },
        }),
        sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
      ]);

      return reply.send({
        success: true,
        enableGlobalWrites: env.ENABLE_GLOBAL_WRITES,
        kpis: {
          totalProspects,
          emailProntaCount,
          senzaEmailCount,
          pecScartataCount,
          istCount,
          rivCount,
          draftsCount,
          blacklistCount,
          promoTotal,
          promoContacted,
          promoLoggedIn,
          promoPendingOrder,
          promoConverted,
        },
        clusters: clusterGroups.map((g) => ({
          cluster: g.categoryCluster,
          commercialCategory: g.commercialCategory,
          count: g._count._all,
        })),
        pipeline: pipelineGroups.map((p) => ({
          status: p.pipelineStatus,
          count: p._count._all,
        })),
        sentinelRuns,
        inboxAccounts,
        outreachConfig,
      });
    } catch (error: any) {
      log.error(`Errore GET /api/admin/sdr/stats: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 2. AI SDR B2B — ESPLORA 120.714 PROSPECTS
  // ============================================================================
  fastify.get('/api/admin/sdr/prospects', async (request, reply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt(q.page || '1', 10));
      const limit = Math.min(100, Math.max(10, parseInt(q.limit || '30', 10)));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (q.section && q.section !== 'ALL') where.section = q.section;
      if (q.commercialCategory && q.commercialCategory !== 'ALL') {
        where.commercialCategory = q.commercialCategory;
      }
      if (q.categoryCluster && q.categoryCluster !== 'ALL') {
        where.categoryCluster = q.categoryCluster;
      }
      if (q.pipelineStatus && q.pipelineStatus !== 'ALL') {
        where.pipelineStatus = q.pipelineStatus;
      }
      if (q.region && q.region !== 'ALL') {
        where.region = { contains: q.region, mode: 'insensitive' };
      }
      if (q.province && q.province !== 'ALL') {
        where.province = { equals: q.province, mode: 'insensitive' };
      }
      if (q.search && q.search.trim().length > 0) {
        const s = q.search.trim();
        where.OR = [
          { companyName: { contains: s, mode: 'insensitive' } },
          { ordinaryEmail: { contains: s, mode: 'insensitive' } },
          { vatNumber: { contains: s, mode: 'insensitive' } },
          { city: { contains: s, mode: 'insensitive' } },
          { promotedUsername: { contains: s, mode: 'insensitive' } },
        ];
      }

      const [prospects, total] = await Promise.all([
        sdrPrisma.sdrProspect.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ leadScore: 'desc' }, { updatedAt: 'desc' }],
          include: {
            drafts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        }),
        sdrPrisma.sdrProspect.count({ where }),
      ]);

      // Enrich with b2b_promo_prospects live status if promoProspectId is present
      const promoIds = prospects
        .map((p) => p.promoProspectId)
        .filter((id): id is string => Boolean(id));

      const promoMap = new Map<string, any>();
      if (promoIds.length > 0) {
        const promos = await b2bPrisma.b2BPromoProspect.findMany({
          where: { id: { in: promoIds } },
          select: {
            id: true,
            username: true,
            tempPassword: true,
            mustChangePassword: true,
            status: true,
            firstLoginAt: true,
            lastLoginAt: true,
            loginCount: true,
            emailSentAt: true,
            convertedAt: true,
          },
        });
        for (const pr of promos) {
          promoMap.set(pr.id, pr);
        }
      }

      const enriched = prospects.map((p) => ({
        ...p,
        latestDraft: (p as any).drafts?.[0] || null,
        promoProspect: p.promoProspectId ? promoMap.get(p.promoProspectId) || null : null,
      }));

      return reply.send({
        success: true,
        prospects: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      log.error(`Errore GET /api/admin/sdr/prospects: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 3. AI SDR B2B — CLIENTI IN ATTIVAZIONE (CONTATTATI VS 1° ACCESSO)
  // ============================================================================
  fastify.get('/api/admin/sdr/promo-prospects', async (request, reply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const search = (q.search || '').trim();

      const where: any = {};
      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { vatNumber: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ];
      }

      const allPromos = await b2bPrisma.b2BPromoProspect.findMany({
        where,
        orderBy: [{ lastLoginAt: 'desc' }, { createdAt: 'desc' }],
        take: 250,
        include: {
          carts: {
            include: { items: true },
          },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      });

      // Fetch associated FIRST_PURCHASE discount rules
      const promoIds = allPromos.map((p) => p.id);
      const rules =
        promoIds.length > 0
          ? await b2bPrisma.b2BDiscountRule.findMany({
              where: {
                clientScope: 'SINGLE_CLIENT',
                clientId: { in: promoIds },
              },
            })
          : [];
      const ruleByClient = new Map<string, any>();
      for (const r of rules) {
        if (r.clientId) ruleByClient.set(r.clientId, r);
      }

      const enriched = allPromos.map((p) => {
        const cartItemsCount = p.carts.reduce((acc, c) => acc + c.items.length, 0);
        const cartTotalUnits = p.carts.reduce(
          (acc, c) => acc + c.items.reduce((sum, item) => sum + item.quantity, 0),
          0
        );
        return {
          ...p,
          cartItemsCount,
          cartTotalUnits,
          firstPurchaseRule: ruleByClient.get(p.id) || null,
        };
      });

      const loggedIn = enriched.filter(
        (p) =>
          p.status === 'LOGGED_IN' ||
          p.status === 'ORDER_PENDING_APPROVAL' ||
          (p.loginCount > 0 && p.status !== 'CONVERTED')
      );
      const contacted = enriched.filter(
        (p) => p.status === 'CONTACTED' && p.loginCount === 0
      );
      const converted = enriched.filter((p) => p.status === 'CONVERTED');

      return reply.send({
        success: true,
        loggedIn,
        contacted,
        converted,
      });
    } catch (error: any) {
      log.error(`Errore GET /api/admin/sdr/promo-prospects: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 4. AI SDR B2B — CONFIGURAZIONE OFFERTA, SCONTO 1° ACQUISTO & CATALOGO ALLEGATO
  // ============================================================================
  fastify.get('/api/admin/sdr/config', async (_request, reply) => {
    try {
      let config = await sdrPrisma.sdrOutreachConfig.findUnique({
        where: { id: 'default' },
      });
      if (!config) {
        config = await sdrPrisma.sdrOutreachConfig.create({
          data: { id: 'default' },
        });
      }
      return reply.send({ success: true, config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.put('/api/admin/sdr/config', async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const config = await sdrPrisma.sdrOutreachConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          enableFirstPurchaseRule: Boolean(body.enableFirstPurchaseRule ?? true),
          istExtraDiscountPct: Number(body.istExtraDiscountPct ?? 10),
          rivExtraDiscountPct: Number(body.rivExtraDiscountPct ?? 10),
          discountCalculationMode: 'EXTRA_CASCADE',
          discountTargetType: 'ALL_2GG',
          discountTargetFiltersJson: { warehouseFilter: 'MAIN_2GG', only2gg: true },
          offerTitle: String(
            body.offerTitle || 'Offerta esclusiva valida per il primo acquisto'
          ),
          minOrderAmountText: String(
            body.minOrderAmountText || "Nessun minimo d'ordine sul tuo 1° acquisto"
          ),
          freeShippingText: String(
            body.freeShippingText ||
              'Spedizione rapida 24/48h in tutta Italia da Deposito Principale (2gg)'
          ),
          paymentTermsText: String(
            body.paymentTermsText ||
              'Condizioni B2B riservate con referente dedicato Daniele Savoia'
          ),
          customCommercialNotes: body.customCommercialNotes
            ? String(body.customCommercialNotes)
            : null,
          attachCatalogPdf: Boolean(body.attachCatalogPdf ?? true),
          catalogSelectionMode: 'ALL_2GG',
          globalCatalogFiltersJson: { warehouseFilter: 'MAIN_2GG', stockDisplayMode: 'BADGE_ONLY' },
          clusterCatalogPresetsJson: {},
          catalogWarehouse: 'MAIN_2GG',
          catalogStockMode: 'BADGE_ONLY',
          catalogIncludeZeroStock: false,
          catalogMaxProducts: Number(body.catalogMaxProducts ?? 250),
          catalogPriceMode: 'LIST_AND_NET',
          timeFencingEnabled: Boolean(body.timeFencingEnabled ?? true),
          morningWindow: String(body.morningWindow || '08:30-12:30'),
          afternoonWindow: String(body.afternoonWindow || '14:00-17:30'),
          sentinelEnabled: Boolean(body.sentinelEnabled ?? true),
        },
        update: {
          enableFirstPurchaseRule:
            body.enableFirstPurchaseRule !== undefined
              ? Boolean(body.enableFirstPurchaseRule)
              : undefined,
          istExtraDiscountPct:
            body.istExtraDiscountPct !== undefined ? Number(body.istExtraDiscountPct) : undefined,
          rivExtraDiscountPct:
            body.rivExtraDiscountPct !== undefined ? Number(body.rivExtraDiscountPct) : undefined,
          discountCalculationMode: 'EXTRA_CASCADE',
          discountTargetType: 'ALL_2GG',
          discountTargetFiltersJson: { warehouseFilter: 'MAIN_2GG', only2gg: true },
          offerTitle: body.offerTitle,
          minOrderAmountText: body.minOrderAmountText,
          freeShippingText: body.freeShippingText,
          paymentTermsText: body.paymentTermsText,
          customCommercialNotes: body.customCommercialNotes,
          attachCatalogPdf:
            body.attachCatalogPdf !== undefined ? Boolean(body.attachCatalogPdf) : undefined,
          catalogSelectionMode: 'ALL_2GG',
          catalogWarehouse: 'MAIN_2GG',
          catalogStockMode: 'BADGE_ONLY',
          catalogIncludeZeroStock: false,
          catalogMaxProducts:
            body.catalogMaxProducts !== undefined ? Number(body.catalogMaxProducts) : 250,
          catalogPriceMode: 'LIST_AND_NET',
          timeFencingEnabled:
            body.timeFencingEnabled !== undefined ? Boolean(body.timeFencingEnabled) : undefined,
          morningWindow: body.morningWindow,
          afternoonWindow: body.afternoonWindow,
          sentinelEnabled:
            body.sentinelEnabled !== undefined ? Boolean(body.sentinelEnabled) : undefined,
        },
      });
      return reply.send({ success: true, config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 5. AI SDR B2B — GENERA CREDENZIALI + SCONTO 1° ACQUISTO + BOZZA EMAIL + CATALOGO
  // ============================================================================
  fastify.post('/api/admin/sdr/prepare-outreach', async (request, reply) => {
    try {
      const body = request.body as {
        prospectIds?: number[];
        commercialCategory?: string;
        categoryCluster?: string;
        limit?: number;
      };

      const config =
        (await sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } })) ||
        (await sdrPrisma.sdrOutreachConfig.create({ data: { id: 'default' } }));

      let targetIds = Array.isArray(body.prospectIds)
        ? body.prospectIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
        : [];

      if (targetIds.length === 0) {
        const where: any = {
          section: 'Email_Pronta',
          ordinaryEmail: { not: null },
        };
        if (body.commercialCategory && body.commercialCategory !== 'ALL') {
          where.commercialCategory = body.commercialCategory;
        }
        if (body.categoryCluster && body.categoryCluster !== 'ALL') {
          where.categoryCluster = body.categoryCluster;
        }
        const rows = await sdrPrisma.sdrProspect.findMany({
          where,
          take: Math.min(50, Math.max(1, Number(body.limit || 10))),
          orderBy: { leadScore: 'desc' },
          select: { id: true },
        });
        targetIds = rows.map((r) => r.id);
      }

      if (targetIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Nessun prospect con Email_Pronta selezionato.',
        });
      }

      // Enqueue on BullMQ worker-sdr-outreach
      await sdrCopywriterQueue.add('PREPARE_OUTREACH', {
        prospectIds: targetIds,
        configId: 'default',
      });

      // Process up to 20 immediately so UI sees instant results
      const immediateIds = targetIds.slice(0, 20);
      const prospects = await sdrPrisma.sdrProspect.findMany({
        where: { id: { in: immediateIds } },
      });

      const preparedResults: any[] = [];
      for (const prospect of prospects) {
        if (!prospect.ordinaryEmail) continue;
        const emailLower = prospect.ordinaryEmail.trim().toLowerCase();

        const isRIV = prospect.commercialCategory === 'RIV';
        const baseDiscountNum = isRIV ? 50 : 40;
        const extraFirstPurchasePct = isRIV
          ? Number(config.rivExtraDiscountPct || 10)
          : Number(config.istExtraDiscountPct || 10);

        let promoProspect = await b2bPrisma.b2BPromoProspect.findFirst({
          where: {
            OR: [{ sdrProspectId: prospect.id }, { email: emailLower }],
          },
        });

        const tempPasswordPlain = promoProspect?.tempPassword || generateTempPassword();
        if (!promoProspect) {
          const username = await generateUniquePermanentUsername(
            prospect.companyName,
            prospect.province
          );
          const passwordHash = await bcrypt.hash(tempPasswordPlain, 10);

          promoProspect = await b2bPrisma.b2BPromoProspect.create({
            data: {
              sdrProspectId: prospect.id,
              username,
              passwordHash,
              tempPassword: tempPasswordPlain,
              mustChangePassword: true,
              email: emailLower,
              companyName: prospect.companyName,
              vatNumber: prospect.vatNumber,
              fiscalCode: prospect.fiscalCode,
              pecEmail: prospect.pecCamerale,
              phone: prospect.phone || prospect.whatsappPhone,
              address: prospect.address,
              city: prospect.city,
              zip: prospect.cap,
              province: prospect.province,
              region: prospect.region,
              commercialCategory: isRIV ? 'RIV' : 'IST',
              categoryCluster: prospect.categoryCluster,
              discount: baseDiscountNum,
              agentId: DANIELE_SAVOIA_AGENT_ID,
              agentCode: DANIELE_SAVOIA_AGENT_CODE,
              status: 'CONTACTED',
              emailSentAt: new Date(),
            },
          });
        }

        const discountFormulaLabel = `${baseDiscountNum}% + ${extraFirstPurchasePct}%`;
        const effectiveNetPct = Number(
          (100 - (100 - baseDiscountNum) * (1 - extraFirstPurchasePct / 100)).toFixed(2)
        );
        const catalistinoTitle = `Catalistino Riservato a ${prospect.companyName}`;
        const catalistinoSubtitle = `Offerta esclusiva valida per il primo acquisto — Sconto Riservato ${discountFormulaLabel}`;

        // Auto-generate FIRST_PURCHASE discount rule (X% + Y%, Solo 2gg, Scadenza: Sul 1° Acquisto)
        // collegata sia a b2b_discount_rules (OS) sia a b2b_agent_discount_rules (Storefront B2B)
        let firstPurchaseRuleId: string | null = promoProspect.firstPurchaseRuleId || null;
        if (config.enableFirstPurchaseRule && extraFirstPurchasePct > 0) {
          const ruleId = `sdr_fp_${promoProspect.id}`;
          const ruleName = `Primo Acquisto (${discountFormulaLabel} Solo 2gg) — ${prospect.companyName}`;

          const newRule = await b2bPrisma.b2BDiscountRule.upsert({
            where: { id: ruleId },
            create: {
              id: ruleId,
              name: ruleName,
              agentId: DANIELE_SAVOIA_AGENT_ID,
              agentCode: DANIELE_SAVOIA_AGENT_CODE,
              clientScope: 'SINGLE_CLIENT',
              clientId: promoProspect.id,
              clientName: prospect.companyName,
              clientIds: [promoProspect.id],
              clientCategories: [isRIV ? 'RIV' : 'IST'],
              targetType: 'ALL_CATALOG',
              calculationMode: 'EXTRA_CASCADE',
              discountValue: extraFirstPurchasePct,
              expiryType: 'FIRST_PURCHASE',
              isActive: true,
            },
            update: {
              name: ruleName,
              discountValue: extraFirstPurchasePct,
              calculationMode: 'EXTRA_CASCADE',
              expiryType: 'FIRST_PURCHASE',
              isActive: true,
            },
          });
          firstPurchaseRuleId = newRule.id;

          try {
            await b2bPrisma.$executeRawUnsafe(
              `INSERT INTO b2b_agent_discount_rules (
                "id", "agentId", "agentCode", "name", "clientScope", "clientId", "clientCode", "clientName",
                "clientIds", "clientCodes", "clientsMeta", "clientCategories",
                "targetType", "targetSkus", "targetProductsMeta", "targetBrands", "targetProductGroups", "targetFamilies", "targetCategories",
                "calculationMode", "discountValue", "isActive", "expiryType", "createdAt", "updatedAt"
              ) VALUES (
                $1, $2, $3, $4, 'SINGLE_CLIENT', $5, $6, $7,
                $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb,
                'ALL_CATALOG', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
                'EXTRA_COMPOUND', $12, TRUE, 'FIRST_PURCHASE', NOW(), NOW()
              )
              ON CONFLICT ("id") DO UPDATE SET
                "name" = EXCLUDED."name",
                "discountValue" = EXCLUDED."discountValue",
                "calculationMode" = 'EXTRA_COMPOUND',
                "expiryType" = 'FIRST_PURCHASE',
                "isActive" = TRUE,
                "updatedAt" = NOW()`,
              ruleId,
              DANIELE_SAVOIA_AGENT_ID,
              DANIELE_SAVOIA_AGENT_CODE,
              ruleName,
              promoProspect.id,
              promoProspect.username.toUpperCase(),
              prospect.companyName,
              JSON.stringify([promoProspect.id]),
              JSON.stringify([promoProspect.username.toUpperCase()]),
              JSON.stringify([
                {
                  id: promoProspect.id,
                  code: promoProspect.username.toUpperCase(),
                  companyName: prospect.companyName,
                  category: isRIV ? 'RIV' : 'IST',
                  baseDiscount: baseDiscountNum,
                },
              ]),
              JSON.stringify([isRIV ? 'RIV' : 'IST']),
              extraFirstPurchasePct
            );
          } catch (syncErr: any) {
            log.warn(`Avviso sync b2b_agent_discount_rules: ${syncErr.message}`);
          }
        }

        const catalogFilename = `Catalistino_Riservato_${prospect.companyName
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .slice(0, 28)}.pdf`;

        await b2bPrisma.b2BPromoProspect.update({
          where: { id: promoProspect.id },
          data: {
            firstPurchaseRuleId,
            orderDetailsSnapshot: {
              offerTitle: catalistinoSubtitle,
              minOrderAmountText: config.minOrderAmountText,
              freeShippingText: config.freeShippingText,
              paymentTermsText: config.paymentTermsText,
              baseDiscountNum,
              extraFirstPurchasePct,
              discountFormula: discountFormulaLabel,
              effectiveNetPct,
            },
            attachedCatalogMeta: {
              filename: catalogFilename,
              catalogTitle: catalistinoTitle,
              catalogSubtitle: catalistinoSubtitle,
              warehouse: 'MAIN_2GG',
              stockDisplayMode: 'BADGE_ONLY',
              priceDisplayMode: 'LIST_AND_NET',
              discountFormula: discountFormulaLabel,
              baseDiscount: baseDiscountNum,
              extraDiscountPct: extraFirstPurchasePct,
              maxProducts: 250,
            },
          },
        });

        const subject = `${catalistinoTitle} — Offerta valida per il primo acquisto (Sconto ${discountFormulaLabel})`;

        const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
  <p>Gentile Team di <strong>${prospect.companyName}</strong>,</p>
  <p>Siamo <strong>Izzo Distribuzione</strong> (<em>I.S.I. S.r.l.</em>), distributore B2B specializzato in materiale elettrico, illuminazione professionale e ferramenta tecnica.</p>
  <p>Abbiamo predisposto il <strong>${catalistinoTitle}</strong> e attivato il Vostro accesso riservato al portale B2B con <strong>Sconto Riservato ${discountFormulaLabel}</strong> valido sul Vostro primo acquisto su tutti i prodotti in <strong>Pronta Consegna 2gg</strong>.</p>
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <div style="font-weight: 800; color: #15803d; margin-bottom: 4px;">${catalistinoTitle}</div>
    <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 10px;">${catalistinoSubtitle}</div>
    <div><strong>Portale B2B:</strong> <a href="https://www.izzodistribuzione.it/login">https://www.izzodistribuzione.it/login</a></div>
    <div><strong>Username (definitiva):</strong> <code>${promoProspect.username}</code></div>
    <div><strong>Password Provvisoria (da personalizzare al 1° accesso):</strong> <code>${tempPasswordPlain}</code></div>
    <div style="margin-top: 10px; font-size: 13px; color: #475569;">
      🏷️ <strong>Sconto Attivo 1° Acquisto:</strong> <strong>${discountFormulaLabel}</strong> automatico a carrello su tutti i prodotti 2gg<br/>
      📦 <strong>Condizione Ordine:</strong> ${config.minOrderAmountText}<br/>
      🚚 <strong>Consegna:</strong> ${config.freeShippingText}<br/>
      👤 <strong>Referente Commerciale:</strong> ${config.paymentTermsText}
    </div>
  </div>
  ${
    config.attachCatalogPdf
      ? `<p>📎 In allegato trovate il <strong>${catalistinoTitle} (${catalogFilename})</strong> con tutti i prodotti in pronta consegna 2gg e lo sconto <strong>${discountFormulaLabel}</strong> già calcolato.</p>`
      : ''
  }
  <p>Cordiali saluti,<br/><strong>Daniele Savoia</strong> — Divisione B2B Izzo Distribuzione (I.S.I. S.r.l.)</p>
</div>`;

        const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
          where: { prospectId: prospect.id, sequenceStep: 1 },
        });

        const draft = existingDraft
          ? await sdrPrisma.sdrOutreachDraft.update({
              where: { id: existingDraft.id },
              data: {
                subject,
                bodyText: `Credenziali B2B Izzo Distribuzione per ${prospect.companyName}: Username ${promoProspect.username} | Password provvisoria ${tempPasswordPlain} | Sconto base ${baseDiscountNum}% + Extra 1° Acquisto +${extraFirstPurchasePct}%`,
                bodyHtml,
                attachedCatalogUrl: config.attachCatalogPdf ? catalogFilename : null,
                status: 'Bozza_Pronta',
              },
            })
          : await sdrPrisma.sdrOutreachDraft.create({
              data: {
                prospectId: prospect.id,
                sequenceStep: 1,
                subject,
                bodyText: `Credenziali B2B Izzo Distribuzione per ${prospect.companyName}: Username ${promoProspect.username} | Password provvisoria ${tempPasswordPlain} | Sconto base ${baseDiscountNum}% + Extra 1° Acquisto +${extraFirstPurchasePct}%`,
                bodyHtml,
                attachedCatalogUrl: config.attachCatalogPdf ? catalogFilename : null,
                status: 'Bozza_Pronta',
              },
            });

        await sdrPrisma.sdrProspect.update({
          where: { id: prospect.id },
          data: {
            promoProspectId: promoProspect.id,
            promotedUsername: promoProspect.username,
            pipelineStatus: 'Credenziali_Create',
          },
        });

        preparedResults.push({
          prospectId: prospect.id,
          companyName: prospect.companyName,
          email: emailLower,
          username: promoProspect.username,
          tempPassword: tempPasswordPlain,
          commercialCategory: promoProspect.commercialCategory,
          baseDiscount: baseDiscountNum,
          extraFirstPurchasePct,
          effectiveNetPct,
          firstPurchaseRuleId,
          draftId: draft.id,
          catalogFilename,
        });
      }

      return reply.send({
        success: true,
        preparedCount: preparedResults.length,
        totalQueued: targetIds.length,
        preparedResults,
      });
    } catch (error: any) {
      log.error(`Errore POST /api/admin/sdr/prepare-outreach: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 6. AI SDR B2B — DISPATCH EMAILS (RISPETTANDO ENABLE_GLOBAL_WRITES DRY-RUN)
  // ============================================================================
  fastify.post('/api/admin/sdr/dispatch-outreach', async (request, reply) => {
    try {
      const body = request.body as { draftIds?: number[] };
      let draftIds = Array.isArray(body.draftIds)
        ? body.draftIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
        : [];

      if (draftIds.length === 0) {
        const readyDrafts = await sdrPrisma.sdrOutreachDraft.findMany({
          where: { status: { in: ['Bozza_Pronta', 'READY_TO_SEND', 'DRAFT'] } },
          take: 50,
          select: { id: true },
        });
        draftIds = readyDrafts.map((d) => d.id);
      }

      if (draftIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Nessuna bozza pronta per l’invio.',
        });
      }

      await sdrOutreachQueue.add('DISPATCH_OUTREACH', { draftIds });

      const newStatus = env.ENABLE_GLOBAL_WRITES ? 'In_Coda_SMTP' : 'Inviata_Dry_Run';
      await sdrPrisma.sdrOutreachDraft.updateMany({
        where: { id: { in: draftIds } },
        data: {
          status: newStatus,
          sentAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        dispatchedCount: draftIds.length,
        dryRun: !env.ENABLE_GLOBAL_WRITES,
        message: env.ENABLE_GLOBAL_WRITES
          ? `${draftIds.length} email accodate per l'invio SMTP.`
          : `[DRY-RUN SICUREZZA] ${draftIds.length} email simulate con successo (ENABLE_GLOBAL_WRITES=false).`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 7. AI SDR B2B — SENTINELLA 24/7, SCRAPER & CASELLE EMAIL
  // ============================================================================
  fastify.post('/api/admin/sdr/sentinel/trigger', async (request, reply) => {
    try {
      const body = (request.body || {}) as { batchSize?: number; targetRegion?: string };
      const batchSize = Math.min(200, Math.max(5, Number(body.batchSize || 25)));

      await sdrSentinelQueue.add('SENTINEL_BATCH', {
        batchSize,
        targetRegion: body.targetRegion,
      });

      const lastRun = await sdrPrisma.sdrSentinelRun.findFirst({
        orderBy: { cycleNumber: 'desc' },
      });

      const run = await sdrPrisma.sdrSentinelRun.create({
        data: {
          cycleNumber: (lastRun?.cycleNumber || 0) + 1,
          processedCount: batchSize,
          upgradedEmailCount: 0,
          pecFilteredCount: 0,
          websitesFoundCount: 0,
          durationMs: 0,
        },
      });

      return reply.send({
        success: true,
        run,
        message: `Batch Sentinella (${batchSize} lead Senza_Email) accodato su worker-sdr-scraper.`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/drafts', async (request, reply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const status = q.status;
      const where: any = {};
      if (status && status !== 'ALL') where.status = status;

      const drafts = await sdrPrisma.sdrOutreachDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          prospect: true,
        },
      });
      return reply.send({ success: true, drafts });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/inboxes', async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const inbox = await sdrPrisma.sdrInboxAccount.create({
        data: {
          email: String(body.email).trim().toLowerCase(),
          displayName: String(body.displayName || 'Daniele Savoia — Izzo Distribuzione'),
          smtpHost: String(body.smtpHost || 'smtp.ionos.it'),
          smtpPort: Number(body.smtpPort || 465),
          smtpUser: String(body.smtpUser || body.email),
          smtpPasswordEnc: String(body.smtpPasswordEnc || 'DRY_RUN_TOKEN'),
          imapHost: String(body.imapHost || 'imap.ionos.it'),
          imapPort: Number(body.imapPort || 993),
          dailyLimit: Number(body.dailyLimit || 45),
          isActive: true,
        },
      });
      return reply.send({ success: true, inbox });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 8. B2B DISCOUNTS ENGINE (REPLICA BACKEND IN ARCHELIA OS)
  // ============================================================================
  fastify.get('/api/admin/b2b-discounts/init', async (_request, reply) => {
    try {
      const [rules, clients, promoProspects, agents] = await Promise.all([
        b2bPrisma.b2BDiscountRule.findMany({
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        }),
        b2bPrisma.b2BUser.findMany({
          where: { role: 'USER' },
          select: {
            id: true,
            companyName: true,
            username: true,
            email: true,
            customerType: true,
            discount: true,
            zucchettiCode: true,
          },
          orderBy: { companyName: 'asc' },
          take: 500,
        }),
        b2bPrisma.b2BPromoProspect.findMany({
          where: { status: { not: 'CONVERTED' } },
          select: {
            id: true,
            companyName: true,
            username: true,
            email: true,
            commercialCategory: true,
            discount: true,
            status: true,
            loginCount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
        b2bPrisma.b2BUser.findMany({
          where: { role: { in: ['AGENT', 'ADMIN'] } },
          select: {
            id: true,
            companyName: true,
            username: true,
            zucchettiCode: true,
            role: true,
          },
        }),
      ]);

      // Fetch Typesense facets for brand, product_group, family, category
      let facets = {
        brands: [] as { value: string; count: number }[],
        productGroups: [] as { value: string; count: number }[],
        families: [] as { value: string; count: number }[],
        categories: [] as { value: string; count: number }[],
      };

      try {
        const tsRes = await typesenseClient
          .collections(PRODUCTS_COLLECTION_NAME)
          .documents()
          .search({
            q: '*',
            query_by: 'title,sku',
            filter_by: 'catalog_source:=zucchetti',
            facet_by: 'brand,product_group,family,category',
            max_facet_values: 250,
            per_page: 0,
          });

        const getFacetList = (fieldName: string) => {
          const f = (tsRes.facet_counts || []).find((fc: any) => fc.field_name === fieldName);
          return (f?.counts || []).map((c: any) => ({
            value: String(c.value),
            count: Number(c.count),
          }));
        };

        facets = {
          brands: getFacetList('brand'),
          productGroups: getFacetList('product_group'),
          families: getFacetList('family'),
          categories: getFacetList('category'),
        };
      } catch (e: any) {
        log.warn(`Impossibile caricare facet Typesense per b2b-discounts: ${e.message}`);
      }

      return reply.send({
        success: true,
        rules,
        clients,
        promoProspects,
        agents,
        facets,
        commercialCategories: [
          { code: 'IST', label: 'Installatori & Professionisti (Base 40%)', baseDiscount: 40 },
          { code: 'RIV', label: 'Rivenditori & Ferramenta (Base 50%)', baseDiscount: 50 },
        ],
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-discounts/rules', async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const ruleId = body.id ? String(body.id) : `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const data = {
        name: String(body.name || 'Regola Sconto B2B').trim(),
        agentId: String(body.agentId || DANIELE_SAVOIA_AGENT_ID),
        agentCode: String(body.agentCode || DANIELE_SAVOIA_AGENT_CODE),
        clientScope: String(body.clientScope || body.clientScopeType || 'ALL_CLIENTS'),
        clientId: body.clientId || body.targetClientId ? String(body.clientId || body.targetClientId) : null,
        clientName: body.clientName ? String(body.clientName) : null,
        clientIds: Array.isArray(body.clientIds)
          ? body.clientIds
          : body.clientId || body.targetClientId
          ? [String(body.clientId || body.targetClientId)]
          : [],
        clientCategories: Array.isArray(body.clientCategories)
          ? body.clientCategories
          : body.targetCategory
          ? [String(body.targetCategory)]
          : [],
        targetType: String(body.targetType || 'ALL_CATALOG'),
        targetSkus: Array.isArray(body.targetSkus) ? body.targetSkus : [],
        targetBrands: Array.isArray(body.targetBrands) ? body.targetBrands : [],
        targetProductGroups: Array.isArray(body.targetProductGroups)
          ? body.targetProductGroups
          : [],
        targetFamilies: Array.isArray(body.targetFamilies) ? body.targetFamilies : [],
        targetCategories: Array.isArray(body.targetCategories) ? body.targetCategories : [],
        calculationMode: String(body.calculationMode || 'EXTRA_CASCADE'),
        discountValue: Number(body.discountValue ?? body.discountPercent ?? 5),
        expiryType: String(body.expiryType || body.expiryMode || 'NONE'),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      };

      const rule = await b2bPrisma.b2BDiscountRule.upsert({
        where: { id: ruleId },
        create: { id: ruleId, ...data },
        update: data,
      });

      try {
        const calcMode =
          data.calculationMode === 'EXTRA_CASCADE' ? 'EXTRA_COMPOUND' : data.calculationMode;
        await b2bPrisma.$executeRawUnsafe(
          `INSERT INTO b2b_agent_discount_rules (
            "id", "agentId", "agentCode", "name", "clientScope", "clientId", "clientName",
            "clientIds", "clientCodes", "clientsMeta", "clientCategories",
            "targetType", "targetSkus", "targetProductsMeta", "targetBrands", "targetProductGroups", "targetFamilies", "targetCategories",
            "calculationMode", "discountValue", "isActive", "expiryType", "expiresAt", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8::jsonb, '[]'::jsonb, '[]'::jsonb, $9::jsonb,
            $10, $11::jsonb, '[]'::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb,
            $16, $17, $18, $19, $20, NOW(), NOW()
          )
          ON CONFLICT ("id") DO UPDATE SET
            "name" = EXCLUDED."name",
            "clientScope" = EXCLUDED."clientScope",
            "clientId" = EXCLUDED."clientId",
            "clientName" = EXCLUDED."clientName",
            "clientIds" = EXCLUDED."clientIds",
            "clientCategories" = EXCLUDED."clientCategories",
            "targetType" = EXCLUDED."targetType",
            "calculationMode" = EXCLUDED."calculationMode",
            "discountValue" = EXCLUDED."discountValue",
            "isActive" = EXCLUDED."isActive",
            "expiryType" = EXCLUDED."expiryType",
            "expiresAt" = EXCLUDED."expiresAt",
            "updatedAt" = NOW()`,
          ruleId,
          data.agentId,
          data.agentCode,
          data.name,
          data.clientScope,
          data.clientId,
          data.clientName,
          JSON.stringify(data.clientIds),
          JSON.stringify(data.clientCategories),
          data.targetType,
          JSON.stringify(data.targetSkus),
          JSON.stringify(data.targetBrands),
          JSON.stringify(data.targetProductGroups),
          JSON.stringify(data.targetFamilies),
          JSON.stringify(data.targetCategories),
          calcMode,
          data.discountValue,
          data.isActive,
          data.expiryType,
          data.expiresAt
        );
      } catch (syncErr: any) {
        log.warn(`Sync b2b_agent_discount_rules su POST rule: ${syncErr.message}`);
      }

      return reply.send({ success: true, rule });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.patch('/api/admin/b2b-discounts/rules/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await b2bPrisma.b2BDiscountRule.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Regola non trovata' });
      }
      const nextActive = !existing.isActive;
      const updated = await b2bPrisma.b2BDiscountRule.update({
        where: { id },
        data: { isActive: nextActive },
      });
      try {
        await b2bPrisma.$executeRawUnsafe(
          `UPDATE b2b_agent_discount_rules
           SET "isActive" = $2,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          id,
          nextActive
        );
      } catch (_e) {
        // ignore if not present in storefront table
      }
      return reply.send({ success: true, rule: updated });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.delete('/api/admin/b2b-discounts/rules/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await b2bPrisma.b2BDiscountRule.delete({ where: { id } });
      try {
        await b2bPrisma.$executeRawUnsafe(
          `DELETE FROM b2b_agent_discount_rules WHERE "id" = $1`,
          id
        );
      } catch (_e) {
        // ignore
      }
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 9. B2B CATALOG PDF BUILDER (REPLICA BACKEND IN ARCHELIA OS)
  // ============================================================================
  fastify.post('/api/admin/b2b-catalog/search', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        query?: string;
        warehouseFilter?: 'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG';
        brands?: string[];
        productGroups?: string[];
        families?: string[];
        categories?: string[];
        limit?: number;
        commercialCategory?: 'IST' | 'RIV';
        extraDiscountPct?: number;
        calculationMode?: 'EXTRA_CASCADE' | 'EXTRA_ADDITIVE' | 'FIXED_TOTAL';
      };

      const warehouseFilter = body.warehouseFilter || 'MAIN_2GG';
      const filterParts: string[] = ['catalog_source:=zucchetti', 'price:>0'];
      if (warehouseFilter === 'MAIN_2GG') {
        filterParts.push('stock_main:>0');
      } else if (warehouseFilter === 'EXTERNAL_7GG') {
        filterParts.push('stock_ek:>0');
      } else {
        filterParts.push('stock:>0');
      }

      if (Array.isArray(body.brands) && body.brands.length > 0) {
        filterParts.push(`brand:=[${body.brands.map((b) => `\`${b}\``).join(',')}]`);
      }
      if (Array.isArray(body.productGroups) && body.productGroups.length > 0) {
        filterParts.push(
          `product_group:=[${body.productGroups.map((g) => `\`${g}\``).join(',')}]`
        );
      }
      if (Array.isArray(body.families) && body.families.length > 0) {
        filterParts.push(`family:=[${body.families.map((f) => `\`${f}\``).join(',')}]`);
      }
      if (Array.isArray(body.categories) && body.categories.length > 0) {
        filterParts.push(`category:=[${body.categories.map((c) => `\`${c}\``).join(',')}]`);
      }

      const perPage = Math.min(250, Math.max(10, Number(body.limit || 250)));
      const searchRes = await typesenseClient
        .collections(PRODUCTS_COLLECTION_NAME)
        .documents()
        .search({
          q: body.query && body.query.trim() ? body.query.trim() : '*',
          query_by: 'title,sku,brand,product_group,family,category',
          filter_by: filterParts.join(' && '),
          sort_by: 'stock_main:desc,stock:desc',
          per_page: perPage,
        });

      const baseDiscount = body.commercialCategory === 'RIV' ? 50 : 40;
      const extraPct = Number(body.extraDiscountPct || 0);
      const mode = body.calculationMode || 'EXTRA_CASCADE';
      const discountFormula =
        extraPct > 0 ? `${baseDiscount}% + ${extraPct}%` : `${baseDiscount}%`;

      let effectiveDiscountPct = baseDiscount;
      if (extraPct > 0) {
        if (mode === 'FIXED_TOTAL') {
          effectiveDiscountPct = extraPct;
        } else if (mode === 'EXTRA_ADDITIVE') {
          effectiveDiscountPct = Math.min(90, baseDiscount + extraPct);
        } else {
          effectiveDiscountPct = Number(
            (100 - (100 - baseDiscount) * (1 - extraPct / 100)).toFixed(2)
          );
        }
      }

      const products = (searchRes.hits || []).map((h: any) => {
        const doc = h.document;
        const listPrice = Number(doc.price_b2b || doc.price || 0);
        const netPrice = Number((listPrice * (1 - effectiveDiscountPct / 100)).toFixed(2));
        return {
          id: doc.id,
          sku: doc.sku,
          title: doc.title || doc.original_name,
          brand: doc.brand || 'Izzo',
          productGroup: doc.product_group || '',
          family: doc.family || '',
          category: doc.category || '',
          imageUrl: doc.image_url || '',
          stockMain: Number(doc.stock_main || 0),
          stockEk: Number(doc.stock_ek || 0),
          stockTotal: Number(doc.stock || 0),
          listPrice,
          baseDiscount,
          extraDiscountPct: extraPct,
          discountFormula,
          effectiveDiscountPct,
          netPrice,
        };
      });

      return reply.send({
        success: true,
        found: searchRes.found || products.length,
        discountFormula,
        effectiveDiscountPct,
        products,
      });
    } catch (error: any) {
      log.error(`Errore POST /api/admin/b2b-catalog/search: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
