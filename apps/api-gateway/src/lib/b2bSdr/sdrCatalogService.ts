import * as crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sdrPrisma, resolveClusterConfig, decryptSdrSecret } from '@archelia/sdr-database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { env, log } from '@archelia/core';
import {
  searchAgentCatalogProducts,
  generateAgentCatalogPdfAction,
  CatalogProductItem,
} from '../b2bAgentSuite/catalogBuilder.js';
import {
  DEFAULT_AGENT_ID,
  DEFAULT_AGENT_CODE,
  DEFAULT_AGENT_NAME,
} from '../b2bAgentSuite/agentClients.js';
import { addSdrLog, redisConnection } from './searchEngine.js';

export interface SdrAgentInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  isDefault: boolean;
}

const CLUSTER_CATALOG_SEARCH_HINTS: Record<string, string[]> = {
  Installatore_Elettrico: ['magnetotermico', 'differenziale', 'quadro', 'proiettore led'],
  Grossista_Materiale_Elettrico: ['interruttore', 'pannello led', 'strip led', 'proiettore'],
  Showroom_Illuminazione: ['lampadario', 'plafoniera', 'strip led', 'faretto'],
  Fotovoltaico_Rinnovabili: ['scaricatore', 'quadro', 'interruttore', 'cavo'],
  Termoidraulica_Clima: ['contattore', 'magnetotermico', 'quadro', 'scatola'],
  Sicurezza_Domotica: ['alimentatore', 'proiettore sensore', 'scatola stagna', 'led'],
  Quadrista_Automazione: ['contattore', 'rele', 'pulsante', 'quadro'],
  Impresa_Edile: ['proiettore led', 'quadro cantiere', 'spina', 'plafoniera stagna'],
  Rivendita_Edile: ['proiettore led', 'plafoniera', 'multipresa', 'quadro'],
  Ferramenta_Tecnica: ['lampadina led', 'multipresa', 'proiettore', 'torcia'],
  Ascensorista: ['emergenza led', 'plafoniera stagna', 'rele', 'alimentatore'],
  Facility_Manutenzione: ['pannello led 60x60', 'plafoniera stagna', 'emergenza', 'lampadina led'],
};

export async function getAvailableB2BAgents(): Promise<SdrAgentInfo[]> {
  const dbAgents = await b2bPrisma.b2BUser.findMany({
    where: { role: 'AGENT', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      zucchettiCode: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      username: true,
    },
  });

  const map = new Map<string, SdrAgentInfo>();

  // Always guarantee Daniele Savoia as primary default option (internal code 003 never shown externally)
  map.set(DEFAULT_AGENT_ID, {
    id: DEFAULT_AGENT_ID,
    code: DEFAULT_AGENT_CODE,
    name: 'Daniele Savoia',
    email: 'daniele.savoia@izzodistribuzione.com',
    phone: '+39 389 0129832',
    username: 'savoia.daniele',
    isDefault: true,
  });

  for (const ag of dbAgents) {
    const code = (ag.zucchettiCode || '').trim() || (ag.id === DEFAULT_AGENT_ID ? DEFAULT_AGENT_CODE : '');
    const isSavoia =
      ag.id === DEFAULT_AGENT_ID ||
      code === DEFAULT_AGENT_CODE ||
      ag.username.toLowerCase().includes('savoia');
    const rawFullName =
      `${ag.firstName || ''} ${ag.lastName || ''}`.trim() ||
      (ag.companyName || '').trim();
    const fullName = rawFullName || (isSavoia ? 'Daniele Savoia' : ag.username);
    const resolvedEmail =
      (ag.email || '').trim() ||
      (isSavoia
        ? 'daniele.savoia@izzodistribuzione.com'
        : env.BREVO_SENDER_EMAIL || 'daniele.savoia@izzodistribuzione.com');
    const resolvedPhone =
      (ag.phone || '').trim() || (isSavoia ? '+39 389 0129832' : '+39 389 0129832');

    map.set(ag.id, {
      id: ag.id,
      code: code || '003',
      name: fullName,
      email: resolvedEmail,
      phone: resolvedPhone,
      username: ag.username,
      isDefault: isSavoia,
    });
  }

  return Array.from(map.values()).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function resolveSdrAgent(
  agentIdOrCode?: string | null
): Promise<SdrAgentInfo> {
  const agents = await getAvailableB2BAgents();
  if (agentIdOrCode) {
    const needle = agentIdOrCode.trim().toLowerCase();
    const matched = agents.find(
      (a) =>
        a.id.toLowerCase() === needle ||
        a.code.toLowerCase() === needle ||
        a.username.toLowerCase() === needle
    );
    if (matched) return matched;
  }
  return agents[0];
}

export function generateTrackingToken(): string {
  return crypto.randomBytes(14).toString('base64url');
}

export function buildSmartCatalogOfferUrls(trackingToken: string): {
  storefrontOfferUrl: string;
  apiOfferUrl: string;
  apiPdfDownloadUrl: string;
} {
  const b2bBase = (env.B2B_PUBLIC_URL || 'https://www.izzodistribuzione.it').replace(/\/$/, '');
  const apiBase = (env.API_PUBLIC_URL || 'https://api-gateway-v2-development.up.railway.app').replace(
    /\/$/,
    ''
  );
  return {
    storefrontOfferUrl: `${b2bBase}/offerta/${encodeURIComponent(trackingToken)}`,
    apiOfferUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(trackingToken)}`,
    apiPdfDownloadUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(trackingToken)}/pdf`,
  };
}

export async function sendBrevoAgentAlert(params: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  tag?: string;
}): Promise<{ sent: boolean; dryRun: boolean; detail: string }> {
  const isSdrLive = Boolean(env.ENABLE_SDR_LIVE_OUTREACH || env.ENABLE_GLOBAL_WRITES);
  const interceptTo = String(env.SDR_TEST_INTERCEPT_EMAIL || '').trim().toLowerCase();
  const effectiveToEmail = interceptTo || params.toEmail;
  if (!isSdrLive) {
    addSdrLog(
      'BREVO-ALERT',
      `[DRY-RUN] Notifica Agente bloccata da ENABLE_SDR_LIVE_OUTREACH=false -> A: ${params.toEmail} | Oggetto: "${params.subject}"`,
      'INFO'
    );
    return {
      sent: false,
      dryRun: true,
      detail: 'ENABLE_SDR_LIVE_OUTREACH=false (Dry-Run attivo)',
    };
  }

  if (env.BREVO_API_KEY) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: env.BREVO_SENDER_NAME || 'Izzo Distribuzione AI SDR',
            email: env.BREVO_SENDER_EMAIL || 'noreply@izzodistribuzione.it',
          },
          to: [{ email: effectiveToEmail, name: params.toName }],
          subject: params.subject,
          htmlContent: params.htmlContent,
          tags: params.tag ? [params.tag] : ['sdr-agent-alert'],
        }),
      });

      if (resp.ok) {
        return { sent: true, dryRun: false, detail: 'Inviata via Brevo API' };
      }
    } catch {
      // fallback to Aruba SSL below
    }
  }

  try {
    const inbox = await sdrPrisma.sdrInboxAccount.findFirst({
      where: { isActive: true },
      orderBy: { consecutiveErrors: 'asc' },
    });
    if (!inbox) {
      return { sent: false, dryRun: false, detail: 'Nessuna casella Aruba attiva per fallback alert' };
    }
    const smtpPass = decryptSdrSecret(inbox.smtpPasswordEnc);
    if (!smtpPass || smtpPass === 'DRY_RUN_TOKEN') {
      return { sent: false, dryRun: false, detail: 'Password SMTP assente su casella Aruba' };
    }
    const transporter = nodemailer.createTransport({
      host: inbox.smtpHost,
      port: inbox.smtpPort,
      secure: inbox.smtpPort === 465,
      auth: { user: inbox.smtpUser || inbox.email, pass: smtpPass },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
    });
    await transporter.sendMail({
      from: `"Izzo Distribuzione AI SDR" <${inbox.email}>`,
      to: `"${params.toName}" <${effectiveToEmail}>`,
      subject: params.subject,
      html: params.htmlContent,
    });
    transporter.close();
    return { sent: true, dryRun: false, detail: `Inviata via Aruba SSL (${inbox.email})` };
  } catch (err: any) {
    return { sent: false, dryRun: false, detail: err.message };
  }
}

export function buildProspectCatalogPdfCacheKey(params: {
  prospectId: number;
  outreachCycle?: number | null;
  baseDiscount: number;
  extraDiscount: number;
  maxProducts: number;
  agentCode: string;
  credsFingerprint: string;
}): string {
  const cycle = Math.max(1, Number(params.outreachCycle || 1));
  return `sdr:catalog:pdf:v5:${params.prospectId}:c${cycle}:${params.baseDiscount}:${params.extraDiscount}:${params.maxProducts}:${params.agentCode}:${params.credsFingerprint}`;
}

export async function invalidateProspectCatalogPdfCache(prospectId: number): Promise<number> {
  const matchPattern = `sdr:catalog:pdf:*:${prospectId}:*`;
  let cursor = '0';
  let deleted = 0;
  try {
    do {
      const scanRes = await Promise.race<[string, string[]] | null>([
        redisConnection.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (!scanRes) break;
      const [nextCursor, keys] = scanRes;
      cursor = nextCursor;
      if (Array.isArray(keys) && keys.length > 0) {
        const delCount = await Promise.race<number>([
          redisConnection.del(...keys),
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 1000)),
        ]);
        deleted += delCount;
      }
    } while (cursor !== '0');
  } catch {
    // Non-fatal Redis scan failure
  }
  return deleted;
}

export async function generateProspectReservedCatalogPdf(options: {
  prospectId: number;
  forceRefresh?: boolean;
}): Promise<{
  pdfBuffer: Buffer;
  pdfFileName: string;
  itemsCount: number;
  discountFormula: string;
  baseDiscount: number;
  extraDiscount: number;
  effectiveDiscountPct: number;
  outreachCycle: number;
  cacheKey: string;
  agent: SdrAgentInfo;
}> {
  const [prospect, config] = await Promise.all([
    sdrPrisma.sdrProspect.findUnique({ where: { id: options.prospectId } }),
    sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
  ]);

  if (!prospect) {
    throw new Error(`Prospect #${options.prospectId} non trovato.`);
  }

  const catCfg = resolveClusterConfig(prospect.categoryCluster, prospect.commercialCategory);
  const isRIV = catCfg.commercialCategory === 'RIV';
  const baseDiscount = isRIV ? 50 : 40;
  const extraDiscount = isRIV
    ? Number(config?.rivExtraDiscountPct ?? 10)
    : Number(config?.istExtraDiscountPct ?? 10);
  const effectiveDiscountPct = Number(
    (100 - (100 - baseDiscount) * (1 - extraDiscount / 100)).toFixed(2)
  );
  const discountFormula = extraDiscount > 0 ? `${baseDiscount}%+${extraDiscount}%` : `${baseDiscount}%`;

  const agent = await resolveSdrAgent(prospect.assignedAgentId || prospect.assignedAgentCode);
  const maxProducts = Math.min(160, Math.max(24, Number(config?.catalogMaxProducts || 120)));

  const promoProspect = prospect.promoProspectId
    ? await b2bPrisma.b2BPromoProspect.findUnique({
        where: { id: prospect.promoProspectId },
        select: { username: true, tempPassword: true },
      })
    : await b2bPrisma.b2BPromoProspect.findFirst({
        where: {
          OR: [
            { sdrProspectId: prospect.id },
            ...(prospect.ordinaryEmail
              ? [{ email: prospect.ordinaryEmail.trim().toLowerCase() }]
              : []),
          ],
        },
        select: { username: true, tempPassword: true },
      });

  const resolvedUsername = (promoProspect?.username || prospect.promotedUsername || '').trim();
  const resolvedTempPassword = promoProspect?.tempPassword || null;
  const credsFingerprint = crypto
    .createHash('sha256')
    .update(`${resolvedUsername}|${resolvedTempPassword || 'ACTIVATED'}`)
    .digest('hex')
    .slice(0, 10);

  const safeCompanySlug = prospect.companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  const pdfFileName = `Catalistino_Illustrativo_${safeCompanySlug || prospect.id}.pdf`;

  const outreachCycle = Math.max(1, Number((prospect as any).outreachCycle || 1));
  const cacheKey = buildProspectCatalogPdfCacheKey({
    prospectId: prospect.id,
    outreachCycle,
    baseDiscount,
    extraDiscount,
    maxProducts,
    agentCode: agent.code,
    credsFingerprint,
  });
  if (!options.forceRefresh) {
    try {
      const cachedRaw = await Promise.race<string | null>([
        redisConnection.get(cacheKey),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as {
          pdfBase64: string;
          itemsCount: number;
        };
        if (parsed?.pdfBase64) {
          return {
            pdfBuffer: Buffer.from(parsed.pdfBase64, 'base64'),
            pdfFileName,
            itemsCount: parsed.itemsCount,
            discountFormula,
            baseDiscount,
            extraDiscount,
            effectiveDiscountPct,
            outreachCycle,
            cacheKey,
            agent,
          };
        }
      }
    } catch {
      // Proceed to fresh generation
    }
  }

  // 1. Collect cluster-relevant 100% MAIN_2GG products (Zucchetti main warehouse > 0)
  const productMap = new Map<string, CatalogProductItem>();
  const hints =
    catCfg.catalogKeywords && catCfg.catalogKeywords.length > 0
      ? catCfg.catalogKeywords
      : CLUSTER_CATALOG_SEARCH_HINTS[catCfg.cluster] || [];

  for (const kw of hints) {
    if (productMap.size >= maxProducts) break;
    const res = await searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: kw,
      warehouse: 'MAIN_2GG',
      includeZeroStock: false,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'STOCK_DESC',
      limit: Math.ceil(maxProducts / Math.max(1, hints.length)),
    });
    for (const p of res.products || []) {
      if (p.stockMain > 0 && p.listPrice > 0 && !productMap.has(p.sku)) {
        productMap.set(p.sku, p);
        if (productMap.size >= maxProducts) break;
      }
    }
  }

  // 2. Top-up with general best-stocked 2gg items so catalog is always full and authoritative
  if (productMap.size < Math.min(60, maxProducts)) {
    const topRes = await searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: '',
      warehouse: 'MAIN_2GG',
      includeZeroStock: false,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'STOCK_DESC',
      limit: maxProducts,
    });
    for (const p of topRes.products || []) {
      if (p.stockMain > 0 && p.listPrice > 0 && !productMap.has(p.sku)) {
        productMap.set(p.sku, p);
        if (productMap.size >= maxProducts) break;
      }
    }
  }

  const b2bBase = (env.B2B_PUBLIC_URL || 'https://www.izzodistribuzione.it').replace(/\/$/, '');
  const selectedProducts = Array.from(productMap.values()).slice(0, maxProducts);

  const itemsForPdf = selectedProducts.map((p) => {
    const netPrice = Number(
      (p.listPrice * (1 - baseDiscount / 100) * (1 - extraDiscount / 100)).toFixed(2)
    );
    return {
      sku: p.sku,
      title: p.title,
      brand: p.brandLabel || p.brand || 'IZZO / ELMARK',
      categoryLabel: p.categoryLabel || p.familyLabel || catCfg.label,
      technicalDesc: p.technicalDesc || p.description || '',
      unit: p.unit || 'PZ',
      listPrice: p.listPrice,
      netPrice,
      discountPct: effectiveDiscountPct,
      discountLabel: discountFormula,
      discountExpiresFormatted: 'Benvenuto 1° ordine',
      stockMain: p.stockMain,
      stockEk: 0,
      stockTotal: p.stockMain,
      catalogSource: 'zucchetti' as const,
      imageUrl: p.imageUrl || undefined,
      productId: p.id,
      productUrl: `${b2bBase}/product/${encodeURIComponent(p.id)}`,
    };
  });

  if (itemsForPdf.length === 0) {
    throw new Error(
      'Nessun articolo immediatamente disponibile su Typesense per generare il Catalistino PDF.'
    );
  }

  const portalLoginUrl = `${b2bBase}/login`;
  const reservedCredentials = resolvedUsername
    ? {
        portalUrl: portalLoginUrl,
        username: resolvedUsername,
        tempPassword: resolvedTempPassword,
        discountFormula,
        agentName: agent.name,
        agentPhone: agent.phone || '+39 389 0129832',
      }
    : undefined;

  const pdfRes = await generateAgentCatalogPdfAction({
    catalogTitle: `Catalistino Illustrativo per ${prospect.companyName}`,
    catalogSubtitle: `Invito a valutare Izzo Distribuzione S.r.l. come fornitore — Sconto di benvenuto ${discountFormula} sul 1° ordine`,
    clientName: `${prospect.companyName}${prospect.city ? ` (${prospect.city})` : ''}`,
    clientCode: resolvedUsername.toUpperCase() || undefined,
    agentName: `${agent.name} — Izzo Distribuzione S.r.l.`,
    filterSummary: `Consultazione gratuita e senza impegno • Articoli in pronta disponibilità • Sconto di benvenuto ${discountFormula} (${effectiveDiscountPct}% netto) senza minimo d'ordine`,
    priceMode: 'LIST_AND_NET',
    stockMode: 'BADGE_ONLY',
    baseDiscount,
    extraDiscount,
    reservedCredentials,
    items: itemsForPdf,
  });

  if (!pdfRes.success || !pdfRes.pdfBase64) {
    throw new Error(pdfRes.error || 'Generazione binaria PDF non riuscita.');
  }

  try {
    await Promise.race([
      redisConnection.set(
        cacheKey,
        JSON.stringify({ pdfBase64: pdfRes.pdfBase64, itemsCount: itemsForPdf.length }),
        'EX',
        7200
      ),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  } catch {
    // Non-fatal cache write failure
  }

  return {
    pdfBuffer: Buffer.from(pdfRes.pdfBase64, 'base64'),
    pdfFileName,
    itemsCount: itemsForPdf.length,
    discountFormula,
    baseDiscount,
    extraDiscount,
    effectiveDiscountPct,
    outreachCycle,
    cacheKey,
    agent,
  };
}
