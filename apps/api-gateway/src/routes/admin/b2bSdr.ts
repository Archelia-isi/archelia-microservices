import { FastifyInstance } from 'fastify';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import {
  sdrPrisma,
  resolveClusterConfig,
  encryptSdrSecret,
  decryptSdrSecret,
  computeEffectiveInboxDailyLimit,
  containsUnresolvedPlaceholders,
  buildTailoredOutreachEmail,
} from '@archelia/sdr-database';
import {
  env,
  log,
  sdrSentinelQueue,
  sdrCopywriterQueue,
  sdrOutreachQueue,
  SDR_JOBS,
} from '@archelia/core';
import * as bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { authenticate } from '../auth.js';
import {
  getAvailableB2BAgents,
  resolveSdrAgent,
  generateTrackingToken,
  buildSmartCatalogOfferUrls,
  generateProspectReservedCatalogPdf,
} from '../../lib/b2bSdr/sdrCatalogService.js';
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
  getRecentSdrLogsAsync,
  addSdrLog,
  evaluateAntiPec,
  computeProspectLeadScore,
  unpackProspectRichData,
  toggleSentinelState,
  startAutopilotMode,
  stopAutopilotMode,
  simulateInboxReply,
  getInboxReplyEvents,
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

function sanitizeInboxAccount(acc: any) {
  const ramp = computeEffectiveInboxDailyLimit(acc);
  const { smtpPasswordEnc, imapPasswordEnc, ...safe } = acc;
  return {
    ...safe,
    hasPasswordConfigured: Boolean(
      smtpPasswordEnc && smtpPasswordEnc !== 'DRY_RUN_TOKEN' && smtpPasswordEnc.length > 8
    ),
    effectiveDailyLimit: ramp.effectiveDailyLimit,
    warmupWeek: ramp.warmupWeek,
    daysActive: ramp.daysActive,
  };
}

export async function adminB2BSdrRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ============================================================================
  // 1. AI SDR B2B — STATS, PANORAMICA & LISTA AGENTI B2B
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
        activeBozzaProntaCount,
        catalogOpenedCount,
        sentinelRuns,
        rawInboxAccounts,
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
        sdrPrisma.sdrOutreachDraft.count({ where: { status: 'Bozza_Pronta' } }),
        sdrPrisma.sdrOutreachDraft.count({ where: { catalogOpenCount: { gt: 0 } } }),
        sdrPrisma.sdrSentinelRun.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        sdrPrisma.sdrInboxAccount.findMany({
          orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
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

      const inboxAccounts = rawInboxAccounts.map(sanitizeInboxAccount);
      const totalDailyCapacity = inboxAccounts
        .filter((a) => a.isActive)
        .reduce((sum, a) => sum + Number(a.effectiveDailyLimit || 0), 0);
      const sentTodayTotal = inboxAccounts.reduce((sum, a) => sum + Number(a.sentToday || 0), 0);

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
          activeBozzaProntaCount,
          catalogOpenedCount,
          blacklistCount,
          promoTotal,
          promoContacted,
          promoLoggedIn,
          promoPendingOrder,
          promoConverted,
          activeInboxesCount: inboxAccounts.filter((a) => a.isActive).length,
          totalInboxesCount: inboxAccounts.length,
          totalDailyCapacity,
          sentTodayTotal,
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

  fastify.get('/api/admin/sdr/b2b-agents', async (_request, reply) => {
    try {
      const agents = await getAvailableB2BAgents();
      return reply.send({ success: true, agents });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message, agents: [] });
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
      if (q.vatOnly === '1') where.vatNumber = { not: null };
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

      // Base geo/search filter for summary KPIs & cluster pill bar
      const summaryWhere: any = {};
      if (q.region && q.region !== 'ALL') {
        summaryWhere.region = { contains: q.region, mode: 'insensitive' };
      }
      if (q.province && q.province !== 'ALL') {
        summaryWhere.province = { equals: q.province, mode: 'insensitive' };
      }
      if (q.city && q.city !== 'ALL') {
        summaryWhere.city = { equals: q.city, mode: 'insensitive' };
      }
      if (q.search && q.search.trim().length > 0) {
        summaryWhere.OR = where.OR;
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

      const clusterWhere: any = { ...summaryWhere };
      if (q.section && q.section !== 'ALL') clusterWhere.section = q.section;

      const [prospects, total, sectionGroups, vatCount, clusterGroups] = await Promise.all([
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
        sdrPrisma.sdrProspect.groupBy({
          by: ['section'],
          where: summaryWhere,
          _count: { _all: true },
        }),
        sdrPrisma.sdrProspect.count({
          where: {
            ...summaryWhere,
            vatNumber: { not: null },
          },
        }),
        sdrPrisma.sdrProspect.groupBy({
          by: ['categoryCluster'],
          where: clusterWhere,
          _count: { _all: true },
        }),
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
        const unpacked = unpackProspectRichData(p);
        return {
          ...unpacked,
          latestDraft: (p as any).drafts?.[0] || null,
          promoProspect: p.promoProspectId ? promoMap.get(p.promoProspectId) || null : null,
        };
      });

      let sumTotal = 0;
      let sumReady = 0;
      let sumPhone = 0;
      let sumPec = 0;
      for (const sg of sectionGroups) {
        sumTotal += sg._count._all;
        if (sg.section === 'Email_Pronta') sumReady += sg._count._all;
        else if (sg.section === 'Senza_Email') sumPhone += sg._count._all;
        else if (sg.section === 'PEC_Scartata') sumPec += sg._count._all;
      }

      const clusterCounts: Record<string, number> = {};
      for (const cg of clusterGroups) {
        const key = cg.categoryCluster || 'Altro';
        clusterCounts[key] = (clusterCounts[key] || 0) + cg._count._all;
      }

      return reply.send({
        success: true,
        prospects: enriched,
        summary: {
          total: sumTotal,
          ready: sumReady,
          phoneOnly: sumPhone,
          pecOnly: sumPec,
          vatCount,
          viesCount: vatCount,
          clusterCounts,
        },
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

      // Fetch associated FIRST_PURCHASE discount rules & SDR Catalistino Tracking
      const promoIds = allPromos.map((p) => p.id);
      const sdrProspectIds = allPromos
        .map((p) => p.sdrProspectId)
        .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));

      const [rules, sdrDrafts] = await Promise.all([
        promoIds.length > 0
          ? b2bPrisma.b2BDiscountRule.findMany({
              where: {
                clientScope: 'SINGLE_CLIENT',
                clientId: { in: promoIds },
              },
            })
          : Promise.resolve([]),
        sdrProspectIds.length > 0
          ? sdrPrisma.sdrOutreachDraft.findMany({
              where: {
                prospectId: { in: sdrProspectIds },
                sequenceStep: 1,
              },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                prospectId: true,
                trackingToken: true,
                catalogOpenedAt: true,
                catalogOpenCount: true,
                status: true,
                sentAt: true,
                assignedAgentId: true,
                assignedAgentCode: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const ruleByClient = new Map<string, any>();
      for (const r of rules) {
        if (r.clientId) ruleByClient.set(r.clientId, r);
      }

      const draftBySdrId = new Map<number, any>();
      for (const dr of sdrDrafts) {
        if (!draftBySdrId.has(dr.prospectId)) {
          draftBySdrId.set(dr.prospectId, dr);
        }
      }

      const enriched = allPromos.map((p) => {
        const cartItemsCount = p.carts.reduce((acc, c) => acc + c.items.length, 0);
        const cartTotalUnits = p.carts.reduce(
          (acc, c) => acc + c.items.reduce((sum, item) => sum + item.quantity, 0),
          0
        );
        const sdrDraft = p.sdrProspectId ? draftBySdrId.get(p.sdrProspectId) || null : null;
        const smartUrls = sdrDraft?.trackingToken
          ? buildSmartCatalogOfferUrls(sdrDraft.trackingToken)
          : null;
        return {
          ...p,
          cartItemsCount,
          cartTotalUnits,
          firstPurchaseRule: ruleByClient.get(p.id) || null,
          trackingToken: sdrDraft?.trackingToken || null,
          catalogOpenedAt: sdrDraft?.catalogOpenedAt || null,
          catalogOpenCount: Number(sdrDraft?.catalogOpenCount || 0),
          outreachDraftStatus: sdrDraft?.status || null,
          smartOfferUrl: smartUrls?.storefrontOfferUrl || smartUrls?.apiOfferUrl || null,
          catalogPdfUrl: smartUrls?.apiPdfDownloadUrl || null,
        };
      });

      const loggedIn = enriched.filter(
        (p) =>
          p.status === 'LOGGED_IN' ||
          p.status === 'ORDER_PENDING_APPROVAL' ||
          (p.loginCount > 0 && p.status !== 'CONVERTED')
      );
      const openedCatalog = enriched.filter(
        (p) => p.catalogOpenCount > 0 && p.status !== 'CONVERTED'
      );
      const contacted = enriched.filter(
        (p) => p.status === 'CONTACTED' && p.loginCount === 0
      );
      const converted = enriched.filter((p) => p.status === 'CONVERTED');

      return reply.send({
        success: true,
        loggedIn,
        openedCatalog,
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
          defaultAgentId: body.defaultAgentId ? String(body.defaultAgentId) : undefined,
          defaultAgentCode: body.defaultAgentCode ? String(body.defaultAgentCode) : undefined,
        },
      });
      return reply.send({ success: true, config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 5. AI SDR B2B — GENERA CREDENZIALI + SCONTO 1° ACQUISTO (ALL_2GG) + BOZZA ANTI-SPAM + SMART LINK
  // ============================================================================
  fastify.post('/api/admin/sdr/prepare-outreach', async (request, reply) => {
    try {
      const body = request.body as {
        prospectIds?: number[];
        commercialCategory?: string;
        categoryCluster?: string;
        limit?: number;
        agentId?: string;
        agentCode?: string;
      };

      const config =
        (await sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } })) ||
        (await sdrPrisma.sdrOutreachConfig.create({ data: { id: 'default' } }));

      const resolvedAgent = await resolveSdrAgent(
        body.agentId || body.agentCode || config.defaultAgentId || config.defaultAgentCode
      );

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
          take: Math.min(100, Math.max(1, Number(body.limit || 20))),
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

      // Process up to 20 immediately so UI sees instant results; queue ONLY remaining (>20) on worker
      const immediateIds = targetIds.slice(0, 20);
      const remainingIds = targetIds.slice(20);

      if (remainingIds.length > 0) {
        await sdrCopywriterQueue.add(SDR_JOBS.PREPARE_BATCH, {
          action: SDR_JOBS.PREPARE_BATCH,
          prospectIds: remainingIds,
          agentId: resolvedAgent.id,
          agentCode: resolvedAgent.code,
          configId: 'default',
        });
      }

      const prospects = await sdrPrisma.sdrProspect.findMany({
        where: { id: { in: immediateIds } },
      });

      const preparedResults: any[] = [];
      const skippedBlacklist: string[] = [];

      for (const prospect of prospects) {
        if (!prospect.ordinaryEmail) continue;
        const emailLower = prospect.ordinaryEmail.trim().toLowerCase();
        const domainLower = emailLower.split('@')[1] || '';

        // Guard Blacklist / Opt-Out / Hard Bounce
        const bl = await sdrPrisma.sdrBlacklist.findFirst({
          where: {
            OR: [{ emailOrDomain: emailLower }, { emailOrDomain: domainLower }],
          },
        });
        if (bl) {
          skippedBlacklist.push(`${emailLower} (${bl.reason})`);
          continue;
        }

        // Canonical 11-Cluster resolution (Rivendita_Edile, Ferramenta, Illuminazione => RIV 50%)
        const clusterCfg = resolveClusterConfig(prospect.categoryCluster);
        const isRIV =
          prospect.commercialCategory === 'RIV' || clusterCfg.commercialCategory === 'RIV';
        const commercialCategory: 'IST' | 'RIV' = isRIV ? 'RIV' : 'IST';
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
              whatsappPhone: prospect.whatsappPhone,
              website: prospect.website,
              address: prospect.address,
              city: prospect.city,
              zip: prospect.cap,
              province: prospect.province,
              region: prospect.region,
              commercialCategory,
              categoryCluster: clusterCfg.cluster,
              discount: baseDiscountNum,
              agentId: resolvedAgent.id,
              agentCode: resolvedAgent.code,
              status: 'CONTACTED',
              emailSentAt: new Date(),
            },
          });
        } else if (
          promoProspect.agentId !== resolvedAgent.id ||
          promoProspect.commercialCategory !== commercialCategory ||
          promoProspect.discount !== baseDiscountNum
        ) {
          promoProspect = await b2bPrisma.b2BPromoProspect.update({
            where: { id: promoProspect.id },
            data: {
              agentId: resolvedAgent.id,
              agentCode: resolvedAgent.code,
              commercialCategory,
              categoryCluster: clusterCfg.cluster,
              discount: baseDiscountNum,
            },
          });
        }

        const discountFormulaLabel = `${baseDiscountNum}% + ${extraFirstPurchasePct}%`;
        const effectiveNetPct = Number(
          (100 - (100 - baseDiscountNum) * (1 - extraFirstPurchasePct / 100)).toFixed(2)
        );
        const catalistinoTitle = `Catalistino Riservato a ${prospect.companyName}`;
        const catalistinoSubtitle = `Offerta esclusiva valida per il primo acquisto — Sconto Riservato ${discountFormulaLabel}`;

        // Regola FIRST_PURCHASE rigorosamente ristretta a ALL_2GG ("Solo Pronta Consegna 2gg")
        // allineata sia su b2b_discount_rules (OS) sia su b2b_agent_discount_rules (Storefront B2B)
        let firstPurchaseRuleId: string | null = promoProspect.firstPurchaseRuleId || null;
        if (config.enableFirstPurchaseRule && extraFirstPurchasePct > 0) {
          const ruleId = `sdr_fp_${promoProspect.id}`;
          const ruleName = `Primo Acquisto (${discountFormulaLabel} Solo 2gg) — ${prospect.companyName}`;
          const upperUsername = promoProspect.username.toUpperCase();

          const newRule = await b2bPrisma.b2BDiscountRule.upsert({
            where: { id: ruleId },
            create: {
              id: ruleId,
              name: ruleName,
              agentId: resolvedAgent.id,
              agentCode: resolvedAgent.code,
              clientScope: 'SINGLE_CLIENT',
              clientId: promoProspect.id,
              clientName: prospect.companyName,
              clientIds: [promoProspect.id],
              clientCategories: [commercialCategory],
              targetType: 'ALL_2GG',
              calculationMode: 'EXTRA_CASCADE',
              discountValue: extraFirstPurchasePct,
              expiryType: 'FIRST_PURCHASE',
              isActive: true,
            },
            update: {
              name: ruleName,
              agentId: resolvedAgent.id,
              agentCode: resolvedAgent.code,
              targetType: 'ALL_2GG',
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
                'ALL_2GG', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
                'EXTRA_CASCADE', $12, TRUE, 'FIRST_PURCHASE', NOW(), NOW()
              )
              ON CONFLICT ("id") DO UPDATE SET
                "agentId" = EXCLUDED."agentId",
                "agentCode" = EXCLUDED."agentCode",
                "name" = EXCLUDED."name",
                "clientCode" = EXCLUDED."clientCode",
                "clientCodes" = EXCLUDED."clientCodes",
                "clientsMeta" = EXCLUDED."clientsMeta",
                "targetType" = 'ALL_2GG',
                "discountValue" = EXCLUDED."discountValue",
                "calculationMode" = 'EXTRA_CASCADE',
                "expiryType" = 'FIRST_PURCHASE',
                "isActive" = TRUE,
                "updatedAt" = NOW()`,
              ruleId,
              resolvedAgent.id,
              resolvedAgent.code,
              ruleName,
              promoProspect.id,
              upperUsername,
              `[IN ATTIVAZIONE] ${prospect.companyName}`,
              JSON.stringify([promoProspect.id]),
              JSON.stringify([upperUsername]),
              JSON.stringify([
                {
                  id: promoProspect.id,
                  code: upperUsername,
                  name: `[IN ATTIVAZIONE] ${prospect.companyName}`,
                  baseDiscount: baseDiscountNum,
                  categoryCode: commercialCategory,
                  categoryLabel: isRIV ? 'Rivenditore' : 'Installatore',
                },
              ]),
              JSON.stringify([commercialCategory]),
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
              agentName: resolvedAgent.name,
              agentEmail: resolvedAgent.email,
              agentPhone: resolvedAgent.phone,
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
              maxProducts: Number(config.catalogMaxProducts || 250),
            },
          },
        });

        const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
          where: { prospectId: prospect.id, sequenceStep: 1 },
        });
        const trackingToken = existingDraft?.trackingToken || generateTrackingToken();
        const smartUrls = buildSmartCatalogOfferUrls(trackingToken);

        const unpackedMeta = unpackProspectRichData(prospect);
        const tailored = buildTailoredOutreachEmail({
          prospectId: prospect.id,
          companyName: prospect.companyName,
          city: prospect.city,
          province: prospect.province,
          categoryCluster: clusterCfg.cluster,
          brandsDetected: prospect.brandsDetected,
          decisionMaker: unpackedMeta.decisionMaker,
          username: promoProspect.username,
          tempPasswordPlain,
          baseDiscount: baseDiscountNum,
          extraFirstPurchasePct: config.enableFirstPurchaseRule ? extraFirstPurchasePct : 0,
          offerTitle: catalistinoSubtitle,
          minOrderAmountText: config.minOrderAmountText,
          freeShippingText: config.freeShippingText,
          paymentTermsText: config.paymentTermsText,
          customCommercialNotes: config.customCommercialNotes,
          smartCatalogUrl: smartUrls.storefrontOfferUrl,
          agentName: resolvedAgent.name,
          agentCode: resolvedAgent.code,
          agentEmail: resolvedAgent.email,
          agentPhone: resolvedAgent.phone,
        });

        const draft = existingDraft
          ? await sdrPrisma.sdrOutreachDraft.update({
              where: { id: existingDraft.id },
              data: {
                subject: tailored.subject,
                bodyText: tailored.bodyText,
                bodyHtml: tailored.bodyHtml,
                attachedCatalogUrl: config.attachCatalogPdf ? smartUrls.apiPdfDownloadUrl : null,
                trackingToken,
                assignedAgentId: resolvedAgent.id,
                assignedAgentCode: resolvedAgent.code,
                status: 'Bozza_Pronta',
              },
            })
          : await sdrPrisma.sdrOutreachDraft.create({
              data: {
                prospectId: prospect.id,
                sequenceStep: 1,
                subject: tailored.subject,
                bodyText: tailored.bodyText,
                bodyHtml: tailored.bodyHtml,
                attachedCatalogUrl: config.attachCatalogPdf ? smartUrls.apiPdfDownloadUrl : null,
                trackingToken,
                assignedAgentId: resolvedAgent.id,
                assignedAgentCode: resolvedAgent.code,
                status: 'Bozza_Pronta',
              },
            });

        await sdrPrisma.sdrProspect.update({
          where: { id: prospect.id },
          data: {
            commercialCategory,
            baseDiscount: baseDiscountNum,
            promoProspectId: promoProspect.id,
            promotedUsername: promoProspect.username,
            assignedAgentId: resolvedAgent.id,
            assignedAgentCode: resolvedAgent.code,
            pipelineStatus: 'Credenziali_Create',
          },
        });

        preparedResults.push({
          prospectId: prospect.id,
          companyName: prospect.companyName,
          email: emailLower,
          username: promoProspect.username,
          tempPassword: tempPasswordPlain,
          commercialCategory,
          baseDiscount: baseDiscountNum,
          extraFirstPurchasePct,
          effectiveNetPct,
          firstPurchaseRuleId,
          draftId: draft.id,
          trackingToken,
          smartOfferUrl: smartUrls.storefrontOfferUrl,
          catalogPdfUrl: smartUrls.apiPdfDownloadUrl,
          catalogFilename,
          assignedAgent: resolvedAgent.name,
        });
      }

      addSdrLog(
        'COPYWRITER',
        `Preparati ${preparedResults.length} pacchetti B2B completi (Credenziali + Sconto ALL_2GG + Smart Link Catalistino — Agente: ${resolvedAgent.name}).${
          remainingIds.length > 0 ? ` Altri ${remainingIds.length} in coda worker.` : ''
        }`,
        'SUCCESS'
      );

      return reply.send({
        success: true,
        preparedCount: preparedResults.length,
        queuedBackgroundCount: remainingIds.length,
        skippedBlacklistCount: skippedBlacklist.length,
        totalQueued: targetIds.length,
        agent: resolvedAgent,
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
  // 6. AI SDR B2B — DISPATCH EMAILS (HARD GUARD ANTI-PLACEHOLDER + DRY-RUN)
  // ============================================================================
  fastify.post('/api/admin/sdr/dispatch-outreach', async (request, reply) => {
    try {
      const body = request.body as { draftIds?: number[]; limit?: number };
      const requestedIds = Array.isArray(body.draftIds)
        ? body.draftIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
        : [];

      const candidateDrafts = await sdrPrisma.sdrOutreachDraft.findMany({
        where:
          requestedIds.length > 0
            ? { id: { in: requestedIds }, status: 'Bozza_Pronta' }
            : { status: 'Bozza_Pronta' },
        take: requestedIds.length > 0 ? Math.min(500, requestedIds.length) : Math.min(200, Number(body.limit || 50)),
        orderBy: { updatedAt: 'desc' },
        include: {
          prospect: {
            select: {
              id: true,
              companyName: true,
              ordinaryEmail: true,
              promoProspectId: true,
              promotedUsername: true,
            },
          },
        },
      });

      if (candidateDrafts.length === 0) {
        return reply.status(400).send({
          success: false,
          error:
            'Nessuna bozza attiva con stato Bozza_Pronta trovata. Genera prima Credenziali B2B + Catalistino (prepare-outreach).',
        });
      }

      const validDraftIds: number[] = [];
      const blockedReasons: string[] = [];

      for (const d of candidateDrafts) {
        const hasPlaceholders =
          containsUnresolvedPlaceholders(d.subject) ||
          containsUnresolvedPlaceholders(d.bodyText) ||
          containsUnresolvedPlaceholders(d.bodyHtml);
        if (hasPlaceholders) {
          blockedReasons.push(`Draft #${d.id} (${d.prospect?.companyName || ''}): contiene placeholder non risolti`);
          await sdrPrisma.sdrOutreachDraft.update({
            where: { id: d.id },
            data: { status: 'Template_Da_Attivare' },
          });
          continue;
        }
        if (!d.prospect?.promoProspectId || !d.prospect?.ordinaryEmail) {
          blockedReasons.push(
            `Draft #${d.id} (${d.prospect?.companyName || ''}): credenziali B2B o email ordinaria mancanti`
          );
          continue;
        }
        validDraftIds.push(d.id);
      }

      if (validDraftIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: `Tutte le bozze selezionate sono state bloccate dal Safety Guard (${blockedReasons.slice(0, 3).join(' | ')}).`,
          blockedCount: blockedReasons.length,
        });
      }

      const newStatus = env.ENABLE_GLOBAL_WRITES ? 'In_Coda_SMTP' : 'Inviata_Dry_Run';
      await sdrPrisma.sdrOutreachDraft.updateMany({
        where: { id: { in: validDraftIds } },
        data: env.ENABLE_GLOBAL_WRITES
          ? { status: newStatus }
          : { status: newStatus, sentAt: new Date() },
      });

      await sdrOutreachQueue.add(SDR_JOBS.DISPATCH_BATCH, {
        action: SDR_JOBS.DISPATCH_BATCH,
        draftIds: validDraftIds,
      });

      addSdrLog(
        'OUTREACH',
        env.ENABLE_GLOBAL_WRITES
          ? `Accodate ${validDraftIds.length} email B2B verificate sul Pool 60 Caselle Aruba (Time-Fencing + Jitter attivi).`
          : `[DRY-RUN SICUREZZA] Simulate e accodate ${validDraftIds.length} email B2B sul Pool Aruba (ENABLE_GLOBAL_WRITES=false).`,
        'SUCCESS'
      );

      return reply.send({
        success: true,
        dispatchedCount: validDraftIds.length,
        blockedUnsafeCount: blockedReasons.length,
        dryRun: !env.ENABLE_GLOBAL_WRITES,
        message: env.ENABLE_GLOBAL_WRITES
          ? `${validDraftIds.length} email B2B accodate sul Pool 60 Caselle Aruba con Time-Fencing e Jitter anti-spam.`
          : `[DRY-RUN SICUREZZA] ${validDraftIds.length} email simulate sul Pool Aruba (ENABLE_GLOBAL_WRITES=false).`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 6B. AI SDR B2B — DOWNLOAD CATALISTINO PDF REALE & SMART LINK TRACCIATO
  // ============================================================================
  fastify.get('/api/admin/sdr/prospects/:id/catalog-pdf', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const q = request.query as { force?: string };
      const prospectId = Number(id);
      if (Number.isNaN(prospectId)) {
        return reply.status(400).send({ success: false, error: 'ID prospect non valido' });
      }

      const pdfRes = await generateProspectReservedCatalogPdf({
        prospectId,
        forceRefresh: q.force === '1',
      });

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${pdfRes.pdfFileName}"`)
        .header('Cache-Control', 'private, max-age=1800')
        .send(pdfRes.pdfBuffer);
    } catch (error: any) {
      log.error(`Errore GET /api/admin/sdr/prospects/:id/catalog-pdf: ${error.message}`, {
        module: 'api-gateway:b2bSdr',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/prospects/:id/smart-link', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospectId = Number(id);
      if (Number.isNaN(prospectId)) {
        return reply.status(400).send({ success: false, error: 'ID prospect non valido' });
      }

      const prospect = await sdrPrisma.sdrProspect.findUnique({ where: { id: prospectId } });
      if (!prospect) {
        return reply.status(404).send({ success: false, error: 'Azienda non trovata' });
      }

      let draft = await sdrPrisma.sdrOutreachDraft.findFirst({
        where: { prospectId, sequenceStep: 1 },
        orderBy: { createdAt: 'desc' },
      });

      const token = draft?.trackingToken || generateTrackingToken();
      if (draft && !draft.trackingToken) {
        draft = await sdrPrisma.sdrOutreachDraft.update({
          where: { id: draft.id },
          data: { trackingToken: token },
        });
      } else if (!draft) {
        const agent = await resolveSdrAgent(prospect.assignedAgentId || prospect.assignedAgentCode);
        draft = await sdrPrisma.sdrOutreachDraft.create({
          data: {
            prospectId,
            sequenceStep: 1,
            subject: `Catalistino Riservato a ${prospect.companyName}`,
            bodyText: '',
            trackingToken: token,
            assignedAgentId: agent.id,
            assignedAgentCode: agent.code,
            status: 'Template_Da_Attivare',
          },
        });
      }

      const urls = buildSmartCatalogOfferUrls(token);
      return reply.send({
        success: true,
        trackingToken: token,
        ...urls,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // 7. AI SDR B2B — SENTINELLA 24/7, BOZZE & POOL 60 CASELLE ARUBA (AES-256-GCM + TEST SSL)
  // ============================================================================
  fastify.post('/api/admin/sdr/sentinel/trigger', async (request, reply) => {
    try {
      const body = (request.body || {}) as { batchSize?: number; targetRegion?: string };
      const batchSize = Math.min(200, Math.max(5, Number(body.batchSize || 25)));

      await sdrSentinelQueue.add(SDR_JOBS.SENTINEL_BATCH, {
        action: SDR_JOBS.SENTINEL_BATCH,
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
        orderBy: { updatedAt: 'desc' },
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
      const emailClean = String(body.email || '').trim().toLowerCase();
      if (!emailClean || !emailClean.includes('@')) {
        return reply.status(400).send({ success: false, error: 'Indirizzo email casella non valido.' });
      }

      const rawSmtpPass = String(body.smtpPassword || body.password || '').trim();
      const rawImapPass = String(body.imapPassword || rawSmtpPass || '').trim();
      const smtpPasswordEnc = rawSmtpPass ? encryptSdrSecret(rawSmtpPass) : 'DRY_RUN_TOKEN';
      const imapPasswordEnc = rawImapPass ? encryptSdrSecret(rawImapPass) : smtpPasswordEnc;

      const inbox = await sdrPrisma.sdrInboxAccount.create({
        data: {
          email: emailClean,
          displayName: String(body.displayName || 'Daniele Savoia — Izzo Distribuzione'),
          smtpHost: String(body.smtpHost || 'smtps.aruba.it').trim(),
          smtpPort: Number(body.smtpPort || 465),
          smtpUser: String(body.smtpUser || emailClean).trim(),
          smtpPasswordEnc,
          imapHost: String(body.imapHost || 'imaps.aruba.it').trim(),
          imapPort: Number(body.imapPort || 993),
          imapUser: String(body.imapUser || body.smtpUser || emailClean).trim(),
          imapPasswordEnc,
          dailyLimit: Math.max(1, Math.min(50, Number(body.dailyLimit || 5))),
          targetDailyLimit: Math.max(1, Math.min(50, Number(body.targetDailyLimit || 15))),
          warmupEnabled: body.warmupEnabled !== undefined ? Boolean(body.warmupEnabled) : true,
          warmupStartedAt: new Date(),
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        },
      });
      return reply.send({ success: true, inbox: sanitizeInboxAccount(inbox) });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.put('/api/admin/sdr/inboxes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const inboxId = Number(id);
      if (Number.isNaN(inboxId)) {
        return reply.status(400).send({ success: false, error: 'ID casella non valido.' });
      }
      const body = (request.body || {}) as Record<string, any>;
      const updateData: Record<string, any> = {};

      if (body.displayName !== undefined) updateData.displayName = String(body.displayName);
      if (body.smtpHost !== undefined) updateData.smtpHost = String(body.smtpHost).trim();
      if (body.smtpPort !== undefined) updateData.smtpPort = Number(body.smtpPort);
      if (body.smtpUser !== undefined) updateData.smtpUser = String(body.smtpUser).trim();
      if (body.imapHost !== undefined) updateData.imapHost = String(body.imapHost).trim();
      if (body.imapPort !== undefined) updateData.imapPort = Number(body.imapPort);
      if (body.imapUser !== undefined) updateData.imapUser = String(body.imapUser).trim();
      if (body.dailyLimit !== undefined) {
        updateData.dailyLimit = Math.max(1, Math.min(50, Number(body.dailyLimit)));
      }
      if (body.targetDailyLimit !== undefined) {
        updateData.targetDailyLimit = Math.max(1, Math.min(50, Number(body.targetDailyLimit)));
      }
      if (body.warmupEnabled !== undefined) {
        updateData.warmupEnabled = Boolean(body.warmupEnabled);
      }
      if (body.isActive !== undefined) {
        updateData.isActive = Boolean(body.isActive);
      }

      const rawSmtpPass = String(body.smtpPassword || body.password || '').trim();
      const rawImapPass = String(body.imapPassword || '').trim();
      if (rawSmtpPass) {
        updateData.smtpPasswordEnc = encryptSdrSecret(rawSmtpPass);
        if (!rawImapPass) {
          updateData.imapPasswordEnc = updateData.smtpPasswordEnc;
        }
      }
      if (rawImapPass) {
        updateData.imapPasswordEnc = encryptSdrSecret(rawImapPass);
      }

      const updated = await sdrPrisma.sdrInboxAccount.update({
        where: { id: inboxId },
        data: updateData,
      });

      return reply.send({ success: true, inbox: sanitizeInboxAccount(updated) });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.delete('/api/admin/sdr/inboxes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const inboxId = Number(id);
      if (Number.isNaN(inboxId)) {
        return reply.status(400).send({ success: false, error: 'ID casella non valido.' });
      }
      await sdrPrisma.sdrInboxAccount.delete({ where: { id: inboxId } });
      return reply.send({ success: true, deletedId: inboxId });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/inboxes/speed-gear', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        gear?: 'prudente' | 'intermedia' | 'rampup_auto' | 'regime';
      };
      const gear = body.gear || 'rampup_auto';

      let updateData: Record<string, any>;
      let label: string;
      if (gear === 'prudente') {
        updateData = { warmupEnabled: false, dailyLimit: 5, targetDailyLimit: 15 };
        label = 'Marcia 1 Prudente (5 email/giorno per casella = 300/giorno)';
      } else if (gear === 'intermedia') {
        updateData = { warmupEnabled: false, dailyLimit: 10, targetDailyLimit: 15 };
        label = 'Marcia 2 Intermedia (10 email/giorno per casella = 600/giorno)';
      } else if (gear === 'regime') {
        updateData = { warmupEnabled: false, dailyLimit: 15, targetDailyLimit: 15 };
        label = 'Marcia 3 Regime Pieno (15 email/giorno per casella = 900/giorno)';
      } else {
        updateData = { warmupEnabled: true, dailyLimit: 5, targetDailyLimit: 15 };
        label = 'Ramp-Up Automatico 3 Settimane (5 -> 10 -> 15 email/giorno)';
      }

      const res = await sdrPrisma.sdrInboxAccount.updateMany({
        data: updateData,
      });

      addSdrLog('OUTREACH', `Selettore Velocità Pool Aruba aggiornato: ${label} (${res.count} caselle).`, 'SUCCESS');

      const refreshed = await sdrPrisma.sdrInboxAccount.findMany({
        orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
      });
      const sanitized = refreshed.map(sanitizeInboxAccount);
      const totalDailyCapacity = sanitized
        .filter((a) => a.isActive)
        .reduce((sum, a) => sum + Number(a.effectiveDailyLimit || 0), 0);

      return reply.send({
        success: true,
        gear,
        updatedCount: res.count,
        totalDailyCapacity,
        message: label,
        inboxAccounts: sanitized,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/inboxes/:id/test', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const inboxId = Number(id);
      if (Number.isNaN(inboxId)) {
        return reply.status(400).send({ success: false, error: 'ID casella non valido.' });
      }

      const inbox = await sdrPrisma.sdrInboxAccount.findUnique({ where: { id: inboxId } });
      if (!inbox) {
        return reply.status(404).send({ success: false, error: 'Casella non trovata.' });
      }

      const smtpPass = decryptSdrSecret(inbox.smtpPasswordEnc);
      const imapPass = decryptSdrSecret(inbox.imapPasswordEnc || inbox.smtpPasswordEnc);

      if (!smtpPass || smtpPass === 'DRY_RUN_TOKEN') {
        return reply.status(400).send({
          success: false,
          error: 'Password SMTP/IMAP non configurata su questa casella.',
        });
      }

      const startedAt = Date.now();
      let smtpOk = false;
      let imapOk = false;
      let inboxMessages = 0;
      const errors: string[] = [];

      // 1. Test SSL/TLS handshake su smtps.aruba.it:465 (read-only verify, nessun invio)
      try {
        const transporter = nodemailer.createTransport({
          host: inbox.smtpHost,
          port: inbox.smtpPort,
          secure: inbox.smtpPort === 465,
          auth: {
            user: inbox.smtpUser,
            pass: smtpPass,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });
        await transporter.verify();
        transporter.close();
        smtpOk = true;
      } catch (smtpErr: any) {
        errors.push(`SMTP (${inbox.smtpHost}:${inbox.smtpPort}): ${smtpErr.message}`);
      }

      // 2. Test SSL handshake su imaps.aruba.it:993 (read-only INBOX open)
      const imapClient = new ImapFlow({
        host: inbox.imapHost,
        port: inbox.imapPort,
        secure: inbox.imapPort === 993,
        auth: {
          user: inbox.imapUser || inbox.smtpUser || inbox.email,
          pass: imapPass,
        },
        logger: false,
      });

      try {
        await imapClient.connect();
        const mb = await imapClient.mailboxOpen('INBOX', { readOnly: true });
        inboxMessages = Number(mb.exists || 0);
        await imapClient.logout();
        imapOk = true;
      } catch (imapErr: any) {
        errors.push(`IMAP (${inbox.imapHost}:${inbox.imapPort}): ${imapErr.message}`);
        try {
          imapClient.close();
        } catch {
          // ignore
        }
      }

      const latencyMs = Date.now() - startedAt;
      const allOk = smtpOk && imapOk;
      const updated = await sdrPrisma.sdrInboxAccount.update({
        where: { id: inbox.id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: allOk ? 'OK' : 'ERROR',
          lastTestError: allOk ? null : errors.join(' | ').slice(0, 500),
        },
      });

      return reply.send({
        success: allOk,
        smtpOk,
        imapOk,
        inboxMessages,
        latencyMs,
        error: allOk ? null : errors.join(' | '),
        inbox: sanitizeInboxAccount(updated),
      });
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
      const status = await stopSearchPipeline();
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
      const budget = await updateMapsBudgetState(
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
      const logs = await getRecentSdrLogsAsync(Number(q.limit || 120));
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

  // ============================================================================
  // 13. AI SDR B2B — SALVA BOZZA EMAIL PERSONALIZZATA, SENTINEL TOGGLE, AUTOPILOT, KILL-SWITCH & EXPORT
  // ============================================================================
  fastify.put('/api/admin/sdr/prospects/:id/draft', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospectId = Number(id);
      const body = (request.body || {}) as {
        subject?: string;
        bodyText?: string;
        recipientEmail?: string;
      };

      const p = await sdrPrisma.sdrProspect.findUnique({ where: { id: prospectId } });
      if (!p) {
        return reply.status(404).send({ success: false, error: 'Azienda non trovata' });
      }

      if (body.recipientEmail && body.recipientEmail.includes('@')) {
        const cleanRec = body.recipientEmail.trim().toLowerCase();
        const ev = evaluateAntiPec(cleanRec);
        if (ev.isValidSyntax && !ev.isPec) {
          await sdrPrisma.sdrProspect.update({
            where: { id: prospectId },
            data: { ordinaryEmail: ev.cleanEmail, section: 'Email_Pronta', isPecVerified: true },
          });
        }
      }

      const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
        where: { prospectId, sequenceStep: 1 },
        orderBy: { createdAt: 'desc' },
      });

      const subject = String(body.subject || `Catalistino Riservato a ${p.companyName} — Offerta 1° Acquisto`);
      const bodyText = String(body.bodyText || '');
      if (containsUnresolvedPlaceholders(subject) || containsUnresolvedPlaceholders(bodyText)) {
        return reply.status(400).send({
          success: false,
          error:
            'La bozza contiene ancora variabili template non risolte ({{...}} o DEMO_USERNAME). Clicca su "Genera Credenziali + Bozza" prima di salvare.',
        });
      }
      const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #0f172a; max-width: 640px;">${bodyText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</div>`;

      const draft = existingDraft
        ? await sdrPrisma.sdrOutreachDraft.update({
            where: { id: existingDraft.id },
            data: { subject, bodyText, bodyHtml, status: 'Bozza_Pronta' },
          })
        : await sdrPrisma.sdrOutreachDraft.create({
            data: {
              prospectId,
              sequenceStep: 1,
              subject,
              bodyText,
              bodyHtml,
              trackingToken: generateTrackingToken(),
              status: 'Bozza_Pronta',
            },
          });

      addSdrLog(
        'COPYWRITER',
        `[BOZZA AGGIORNATA] Bozza email salvata manualmente per ${p.companyName} (#${p.id}).`,
        'SUCCESS'
      );

      return reply.send({
        success: true,
        draft,
        message: 'Bozza email salvata con successo!',
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/sentinel/toggle', async (request, reply) => {
    try {
      const body = (request.body || {}) as { enabled?: boolean };
      const status = await toggleSentinelState(body.enabled);
      return reply.send({ success: true, status });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/autopilot/start', async (request, reply) => {
    try {
      const body = (request.body || {}) as { province?: string; category?: string };
      const res = await startAutopilotMode(body.province, body.category);
      return reply.send({ success: true, ...res });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/autopilot/stop', async (_request, reply) => {
    try {
      const res = await stopAutopilotMode();
      return reply.send({ success: true, ...res });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/sdr/agents/mock-reply', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        prospectId?: number;
        sentiment?: 'Interessato' | 'Non_Interessato';
      };
      const pid = Number(body.prospectId || 0);
      if (!pid || Number.isNaN(pid)) {
        return reply.status(400).send({ success: false, error: 'Inserisci un ID Prospect valido.' });
      }
      const event = await simulateInboxReply(pid, body.sentiment || 'Interessato');
      const events = await getInboxReplyEvents();
      return reply.send({
        success: true,
        event,
        events,
        message: `Kill-Switch Atomico attivato per ${event.companyName} (#${event.prospectId})! Sentiment: ${event.sentiment}.`,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/inbox-events', async (_request, reply) => {
    try {
      const events = await getInboxReplyEvents();
      return reply.send({
        success: true,
        events,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/sdr/export', async (request, reply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const format = (q.format || 'csv').toLowerCase();
      const maxRows = Math.min(10000, Math.max(10, parseInt(q.limit || '2500', 10)));

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
      if (q.vatOnly === '1') {
        where.vatNumber = { not: null };
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
        ];
      }

      const rows = await sdrPrisma.sdrProspect.findMany({
        where,
        take: maxRows,
        orderBy: [{ leadScore: 'desc' }, { id: 'asc' }],
      });

      const unpackedRows = rows.map((r) => unpackProspectRichData(r));

      if (format === 'json') {
        return reply
          .header('Content-Type', 'application/json; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="izzo_sdr_leads_${Date.now()}.json"`)
          .send(JSON.stringify(unpackedRows, null, 2));
      }

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return /[",\n;]/.test(str) ? `"${str}"` : str;
      };

      const headers = [
        'ID',
        'Ragione_Sociale',
        'Ragione_Sociale_VIES',
        'Partita_IVA',
        'Stato_VIES',
        'Codice_ATECO',
        'Descrizione_ATECO',
        'Numero_REA',
        'Codice_SDI',
        'Forma_Giuridica',
        'Decision_Maker',
        'Dipendenti',
        'Fatturato',
        'Utile_Esercizio',
        'Cluster_B2B',
        'Categoria_Commerciale',
        'Sconto_Base',
        'Indirizzo',
        'CAP',
        'Comune',
        'Provincia',
        'Regione',
        'Email_Ordinaria',
        'Fonte_Email',
        'PEC_Camerale',
        'Telefono',
        'Cellulare_WhatsApp',
        'Sito_Web',
        'Scheda_Directory',
        'Fonti_Dati',
        'Lead_Score',
        'Sezione',
      ];

      const lines = [headers.join(';')];
      for (const r of unpackedRows) {
        lines.push(
          [
            r.id,
            r.companyName,
            r.vatOfficialName,
            r.vatNumber ? `IT${r.vatNumber}` : '',
            r.vatStatus,
            r.atecoCode,
            r.atecoDescription,
            r.reaNumber,
            r.sdiCode,
            r.legalForm,
            r.decisionMaker,
            r.employeesRange,
            r.revenue,
            r.netProfit,
            r.categoryCluster,
            r.commercialCategory,
            `${r.baseDiscount}%`,
            r.address,
            r.cap,
            r.city,
            r.province,
            r.region,
            r.ordinaryEmail,
            r.emailSourceUrl,
            r.pecCamerale,
            r.phone,
            r.whatsappPhone || r.mobilePhone,
            r.website,
            r.listingUrl,
            (r.sources || []).join(', '),
            r.leadScore,
            r.section,
          ]
            .map(escapeCsv)
            .join(';')
        );
      }

      const csvContent = '\uFEFF' + lines.join('\n');
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="izzo_sdr_leads_${Date.now()}.csv"`)
        .send(csvContent);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
