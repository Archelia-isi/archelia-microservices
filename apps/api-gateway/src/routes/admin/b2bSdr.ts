import { FastifyInstance } from 'fastify';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { sdrPrisma } from '@archelia/sdr-database';
import {
  env,
  log,
  sdrSentinelQueue,
  sdrCopywriterQueue,
  sdrOutreachQueue,
} from '@archelia/core';
import * as bcrypt from 'bcryptjs';
import { authenticate } from '../auth.js';
import {
  getAgentDiscountManagementInitData,
  saveAgentDiscountRuleAction,
  toggleAgentDiscountRuleAction,
  deleteAgentDiscountRuleAction,
  removeDiscountFromClientAction,
} from '../../lib/b2bAgentSuite/discountRulesService.js';
import {
  getAgentCatalogInitData,
  searchAgentCatalogProducts,
  searchCatalogPredictiveAction,
  generateAgentCatalogPdfAction,
} from '../../lib/b2bAgentSuite/catalogBuilder.js';
import {
  getRegioni,
  getProvince,
  getComuni,
  getZonaSummary,
  getTerritoryMapStats,
  getComuniStatsByProvince,
  getMapsBudgetState,
  updateMapsBudgetState,
  getMapsBollaturaCounts,
  getSearchPipelineStatus,
  startSearchPipeline,
  stopSearchPipeline,
  runProfilerEnrichmentBatch,
  runMasterAuditBatch,
  runSingleProspectAudit,
  getProspectFullDossier,
  getRecentSdrLogs,
  addSdrLog,
  evaluateAntiPec,
  computeProspectLeadScore,
} from '../../lib/b2bSdr/searchEngine.js';

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
      if (q.city && q.city !== 'ALL') {
        where.city = { equals: q.city, mode: 'insensitive' };
      }
      if (q.mapsFilter && q.mapsFilter !== 'ALL') {
        if (q.mapsFilter === 'verified_maps') {
          where.AND = [
            ...(where.AND || []),
            {
              OR: [
                { sourceEngine: { contains: 'Google Maps', mode: 'insensitive' } },
                { sourceUrl: { contains: 'google.com/maps', mode: 'insensitive' } },
              ],
            },
          ];
        } else if (q.mapsFilter === 'certified_free') {
          where.AND = [
            ...(where.AND || []),
            {
              NOT: {
                OR: [
                  { sourceEngine: { contains: 'Google Maps', mode: 'insensitive' } },
                  { sourceUrl: { contains: 'google.com/maps', mode: 'insensitive' } },
                ],
              },
            },
            {
              OR: [
                { section: 'Email_Pronta' },
                { website: { not: null } },
                { vatNumber: { not: null } },
              ],
            },
          ];
        } else if (q.mapsFilter === 'unverified_maps') {
          where.AND = [
            ...(where.AND || []),
            {
              NOT: {
                OR: [
                  { sourceEngine: { contains: 'Google Maps', mode: 'insensitive' } },
                  { sourceUrl: { contains: 'google.com/maps', mode: 'insensitive' } },
                ],
              },
            },
            { section: { not: 'Email_Pronta' } },
            { website: null },
            { vatNumber: null },
          ];
        }
      }
      if (q.search && q.search.trim().length > 0) {
        const s = q.search.trim();
        where.OR = [
          { companyName: { contains: s, mode: 'insensitive' } },
          { ordinaryEmail: { contains: s, mode: 'insensitive' } },
          { vatNumber: { contains: s, mode: 'insensitive' } },
          { city: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
          { atecoCode: { contains: s, mode: 'insensitive' } },
          { promotedUsername: { contains: s, mode: 'insensitive' } },
        ];
      }

      const sortBy = q.sortBy || 'email_first';
      let orderBy: any = [{ leadScore: 'desc' }, { updatedAt: 'desc' }];
      if (sortBy === 'email_first') {
        orderBy = [{ section: 'asc' }, { leadScore: 'desc' }, { companyName: 'asc' }];
      } else if (sortBy === 'score_desc') {
        orderBy = [{ leadScore: 'desc' }, { id: 'desc' }];
      } else if (sortBy === 'recent') {
        orderBy = [{ id: 'desc' }];
      } else if (sortBy === 'city_asc') {
        orderBy = [{ city: 'asc' }, { province: 'asc' }, { companyName: 'asc' }];
      } else if (sortBy === 'city_desc') {
        orderBy = [{ city: 'desc' }, { province: 'asc' }, { companyName: 'asc' }];
      } else if (sortBy === 'province_asc') {
        orderBy = [{ province: 'asc' }, { city: 'asc' }, { companyName: 'asc' }];
      } else if (sortBy === 'region_asc') {
        orderBy = [{ region: 'asc' }, { city: 'asc' }, { companyName: 'asc' }];
      } else if (sortBy === 'name_asc') {
        orderBy = [{ companyName: 'asc' }];
      } else if (sortBy === 'name_desc') {
        orderBy = [{ companyName: 'desc' }];
      }

      const [prospects, total] = await Promise.all([
        sdrPrisma.sdrProspect.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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

      const enriched = prospects.map((p) => {
        const isMaps =
          (p.sourceEngine || '').toLowerCase().includes('google maps') ||
          (p.sourceUrl || '').toLowerCase().includes('google.com/maps');
        const mapsVerificationStatus = isMaps
          ? 'Verificato_Maps'
          : p.section === 'Email_Pronta' || p.website || p.vatNumber
            ? 'Certificato_Gratis'
            : 'Non_Controllato_Maps';
        return {
          ...p,
          mapsVerificationStatus,
          latestDraft: (p as any).drafts?.[0] || null,
          promoProspect: p.promoProspectId ? promoMap.get(p.promoProspectId) || null : null,
        };
      });

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
                'EXTRA_CASCADE', $12, TRUE, 'FIRST_PURCHASE', NOW(), NOW()
              )
              ON CONFLICT ("id") DO UPDATE SET
                "name" = EXCLUDED."name",
                "discountValue" = EXCLUDED."discountValue",
                "calculationMode" = 'EXTRA_CASCADE',
                "expiryType" = 'FIRST_PURCHASE',
                "isActive" = TRUE,
                "updatedAt" = NOW()`,
              ruleId,
              DANIELE_SAVOIA_AGENT_ID,
              DANIELE_SAVOIA_AGENT_CODE,
              ruleName,
              promoProspect.id,
              promoProspect.username.toUpperCase(),
              `[IN ATTIVAZIONE] ${prospect.companyName}`,
              JSON.stringify([promoProspect.id]),
              JSON.stringify([promoProspect.username.toUpperCase()]),
              JSON.stringify([
                {
                  id: promoProspect.id,
                  code: promoProspect.username.toUpperCase(),
                  name: `[IN ATTIVAZIONE] ${prospect.companyName}`,
                  baseDiscount: baseDiscountNum,
                  categoryCode: isRIV ? 'RIV' : 'IST',
                  categoryLabel: isRIV ? 'Rivenditore' : 'Installatore',
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
  // 8. B2B DISCOUNTS ENGINE (1:1 BACKEND DELL'AGENTE B2B)
  // ============================================================================
  fastify.get('/api/admin/b2b-discounts/init', async (_request, reply) => {
    try {
      const data = await getAgentDiscountManagementInitData();
      return reply.send(data);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-discounts/save', async (request, reply) => {
    try {
      const res = await saveAgentDiscountRuleAction(request.body as any);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-discounts/toggle', async (request, reply) => {
    try {
      const { ruleId, isActive } = request.body as { ruleId: string; isActive: boolean };
      const res = await toggleAgentDiscountRuleAction(ruleId, isActive);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-discounts/delete', async (request, reply) => {
    try {
      const { ruleId } = request.body as { ruleId: string };
      const res = await deleteAgentDiscountRuleAction(ruleId);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-discounts/remove-from-client', async (request, reply) => {
    try {
      const { ruleId, clientId, clientCode } = request.body as {
        ruleId: string;
        clientId?: string | null;
        clientCode?: string | null;
      };
      const res = await removeDiscountFromClientAction(ruleId, String(clientId || ''), clientCode || undefined);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  // ============================================================================
  // 9. B2B CATALOG PDF BUILDER (1:1 BACKEND DELL'AGENTE B2B)
  // ============================================================================
  fastify.get('/api/admin/b2b-catalog/init', async (_request, reply) => {
    try {
      const data = await getAgentCatalogInitData();
      return reply.send(data);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  fastify.post('/api/admin/b2b-catalog/search', async (request, reply) => {
    try {
      const res = await searchAgentCatalogProducts(request.body as any);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message, items: [], totalFound: 0 });
    }
  });

  fastify.post('/api/admin/b2b-catalog/predictive', async (request, reply) => {
    try {
      const { query, warehouse, includeZeroStock } = (request.body || {}) as {
        query: string;
        warehouse?: any;
        includeZeroStock?: boolean;
      };
      const res = await searchCatalogPredictiveAction(query, warehouse, includeZeroStock);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message, items: [] });
    }
  });

  fastify.post('/api/admin/b2b-catalog/generate-pdf', async (request, reply) => {
    try {
      const res = await generateAgentCatalogPdfAction(request.body as any);
      return reply.send(res);
    } catch (error: any) {
      log.error(`Errore POST /api/admin/b2b-catalog/generate-pdf: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ ok: false, error: error.message });
    }
  });

  // ============================================================================
  // 10. AI SDR B2B — CATALOGO GEOGRAFICO ISTAT (REGIONI -> PROVINCE -> COMUNI)
  // ============================================================================
  fastify.get('/api/admin/sdr/geo/regioni', async (_request, reply) => {
    try {
      const regioni = getRegioni();
      return reply.send({ success: true, regioni });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/geo/province', async (request, reply) => {
    try {
      const q = request.query as { regione?: string };
      const province = getProvince(q.regione);
      return reply.send({ success: true, province });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/geo/comuni', async (request, reply) => {
    try {
      const q = request.query as { provincia?: string; regione?: string };
      const comuni = getComuni(q.provincia, q.regione);
      return reply.send({ success: true, comuni });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/geo/zona', async (request, reply) => {
    try {
      const q = request.query as {
        regione?: string;
        provincia?: string;
        comune?: string;
      };
      const summary = await getZonaSummary(q.regione, q.provincia, q.comune);
      return reply.send({ success: true, summary });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/territory-map', async (request, reply) => {
    try {
      const q = request.query as { force?: string };
      const mapData = await getTerritoryMapStats(q.force === '1');
      return reply.send({ success: true, ...mapData });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/territory-comuni', async (request, reply) => {
    try {
      const q = request.query as { provincia?: string };
      if (!q.provincia) {
        return reply.status(400).send({ success: false, error: 'Sigla provincia richiesta' });
      }
      const comuni = await getComuniStatsByProvince(q.provincia);
      return reply.send({ success: true, provincia: q.provincia.toUpperCase(), comuni });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 11. AI SDR B2B — MOTORE DI RICERCA, MAPS BUDGET/BOLLATURA & CONSOLE LIVE
  // ============================================================================
  fastify.get('/api/admin/sdr/search/status', async (_request, reply) => {
    try {
      const [status, bollatura] = await Promise.all([
        Promise.resolve(getSearchPipelineStatus()),
        getMapsBollaturaCounts(),
      ]);
      return reply.send({
        success: true,
        status,
        bollatura,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/search/start', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        regione?: string | null;
        provincia?: string | null;
        comune?: string | null;
        categoria?: string | null;
        max_results?: number;
      };
      const res = await startSearchPipeline({
        regione: body.regione,
        provincia: body.provincia,
        comune: body.comune,
        categoria: body.categoria,
        maxResults: Number(body.max_results || 50),
        fullItalyScan: false,
      });
      return reply.send({ success: true, ...res });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/search/start-italy', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        categoria?: string | null;
        max_results?: number;
      };
      const res = await startSearchPipeline({
        regione: 'TUTTA_ITALIA',
        provincia: null,
        comune: null,
        categoria: body.categoria || 'ALL',
        maxResults: Number(body.max_results || 100),
        fullItalyScan: true,
      });
      return reply.send({ success: true, ...res });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/search/stop', async (_request, reply) => {
    try {
      const status = stopSearchPipeline();
      return reply.send({ success: true, status });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/maps-budget', async (_request, reply) => {
    try {
      const [budget, bollatura] = await Promise.all([
        Promise.resolve(getMapsBudgetState()),
        getMapsBollaturaCounts(),
      ]);
      return reply.send({ success: true, budget, bollatura });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/maps-budget', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        mode?: 'free_tier' | 'daily_budget';
        daily_budget_eur?: number;
      };
      const budget = updateMapsBudgetState(
        body.mode || 'free_tier',
        Number(body.daily_budget_eur || 0)
      );
      const bollatura = await getMapsBollaturaCounts();
      return reply.send({ success: true, budget, bollatura });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/logs', async (request, reply) => {
    try {
      const q = request.query as { limit?: string };
      const logs = getRecentSdrLogs(Number(q.limit || 120));
      return reply.send({ success: true, logs });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 12. AI SDR B2B — CENTRO AGENTI (PROFILER, MASTER AUDIT 15/15, DOSSIER)
  // ============================================================================
  fastify.post('/api/admin/sdr/agents/profiler', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        regione?: string;
        provincia?: string;
        comune?: string;
        limit?: number;
      };
      addSdrLog(
        'PROFILER',
        `Avvio manuale Agente Profiler & Anti-PEC 4 Livelli su ${body.comune || body.provincia || body.regione || 'Tutta Italia'}...`,
        'INFO'
      );
      const result = await runProfilerEnrichmentBatch({
        regione: body.regione,
        provincia: body.provincia,
        comune: body.comune,
        limit: Number(body.limit || 30),
      });
      return reply.send({
        success: true,
        result,
        message: `Profiler completato: ${result.processed} siti analizzati, ${result.upgraded} nuove email ordinarie certificate Anti-PEC.`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/agents/audit', async (request, reply) => {
    try {
      const body = (request.body || {}) as { limit?: number };
      const res = await runMasterAuditBatch(Number(body.limit || 200));
      return reply.send({
        success: true,
        ...res,
        message: `Master Audit 15/15 completato su ${res.audited} aziende (${res.repaired} auto-riparate).`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/prospects/:id/dossier', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospectId = Number(id);
      if (Number.isNaN(prospectId)) {
        return reply.status(400).send({ success: false, error: 'ID prospect non valido' });
      }
      const dossier = await getProspectFullDossier(prospectId);
      return reply.send({ success: true, ...dossier });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/prospects/:id/audit', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospectId = Number(id);
      const audit = await runSingleProspectAudit(prospectId);
      return reply.send({ success: true, audit });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/prospects/:id/email', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospectId = Number(id);
      const body = (request.body || {}) as { email?: string };
      const rawEmail = (body.email || '').trim().toLowerCase();

      const check = evaluateAntiPec(rawEmail);
      if (!check.isValidSyntax) {
        return reply.status(400).send({
          success: false,
          error: `Indirizzo email non valido (${check.reason}).`,
        });
      }

      const existing = await sdrPrisma.sdrProspect.findUnique({
        where: { id: prospectId },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Azienda non trovata.' });
      }

      if (check.isPec) {
        await sdrPrisma.sdrProspect.update({
          where: { id: prospectId },
          data: {
            pecCamerale: check.cleanEmail,
            pecRejectedLog: `${check.cleanEmail} (${check.reason})`,
            section: existing.ordinaryEmail ? 'Email_Pronta' : 'PEC_Scartata',
          },
        });
        addSdrLog(
          'ANTI-PEC',
          `[PEC RILEVATA] ${existing.companyName}: l'indirizzo ${check.cleanEmail} è una PEC (${check.reason}). Salvata in archivio camerale.`,
          'WARN'
        );
        return reply.send({
          success: true,
          isPec: true,
          reason: check.reason,
          message: `Attenzione: ${check.cleanEmail} è una casella PEC (${check.reason}). È stata salvata come PEC camerale ma non verrà usata per invio commerciale.`,
        });
      }

      const newScore = computeProspectLeadScore({
        ordinaryEmail: check.cleanEmail,
        phone: existing.phone,
        whatsappPhone: existing.whatsappPhone,
        website: existing.website,
        vatNumber: existing.vatNumber,
        brandsDetected: existing.brandsDetected,
        address: existing.address,
      });

      await sdrPrisma.sdrProspect.update({
        where: { id: prospectId },
        data: {
          ordinaryEmail: check.cleanEmail,
          isPecVerified: true,
          section: 'Email_Pronta',
          leadScore: Math.max(existing.leadScore, newScore),
        },
      });

      addSdrLog(
        'COPYWRITER',
        `[EMAIL AGGIUNTA] ${existing.companyName} -> ${check.cleanEmail} certificata Anti-PEC. Pronta per generazione credenziali e Catalistino.`,
        'SUCCESS'
      );

      const dossier = await getProspectFullDossier(prospectId);
      return reply.send({
        success: true,
        isPec: false,
        reason: check.reason,
        message: `Email ordinaria ${check.cleanEmail} salvata e certificata Anti-PEC! Ora puoi generare subito Credenziali B2B e Catalistino 1° Acquisto.`,
        dossier,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
