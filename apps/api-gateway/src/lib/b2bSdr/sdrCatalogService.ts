import * as crypto from 'crypto';
import { sdrPrisma, resolveClusterConfig } from '@archelia/sdr-database';
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

  // Always guarantee Daniele Savoia (003) as primary default option
  map.set(DEFAULT_AGENT_ID, {
    id: DEFAULT_AGENT_ID,
    code: DEFAULT_AGENT_CODE,
    name: DEFAULT_AGENT_NAME,
    email: env.BREVO_SENDER_EMAIL || 'daniele.savoia@izzodistribuzione.it',
    phone: '+39 0823 123456',
    username: 'daniele.savoia',
    isDefault: true,
  });

  for (const ag of dbAgents) {
    const fullName =
      `${ag.firstName || ''} ${ag.lastName || ''}`.trim() ||
      (ag.companyName || '').trim() ||
      ag.username;
    const code = (ag.zucchettiCode || '').trim() || (ag.id === DEFAULT_AGENT_ID ? DEFAULT_AGENT_CODE : '');
    map.set(ag.id, {
      id: ag.id,
      code: code || '003',
      name: fullName,
      email: (ag.email || '').trim() || env.BREVO_SENDER_EMAIL || 'info@izzodistribuzione.it',
      phone: (ag.phone || '').trim() || '',
      username: ag.username,
      isDefault: ag.id === DEFAULT_AGENT_ID || code === DEFAULT_AGENT_CODE,
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
  if (!env.ENABLE_GLOBAL_WRITES) {
    addSdrLog(
      'BREVO-ALERT',
      `[DRY-RUN] Notifica Agente bloccata da ENABLE_GLOBAL_WRITES=false -> A: ${params.toEmail} | Oggetto: "${params.subject}"`,
      'INFO'
    );
    return {
      sent: false,
      dryRun: true,
      detail: 'ENABLE_GLOBAL_WRITES=false (Dry-Run attivo)',
    };
  }

  if (!env.BREVO_API_KEY) {
    log.warn(`BREVO_API_KEY non configurata: impossibile inviare alert "${params.subject}"`, {
      module: 'api-gateway:sdr:brevo',
    });
    return {
      sent: false,
      dryRun: false,
      detail: 'BREVO_API_KEY assente',
    };
  }

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
        to: [{ email: params.toEmail, name: params.toName }],
        subject: params.subject,
        htmlContent: params.htmlContent,
        tags: params.tag ? [params.tag] : ['sdr-agent-alert'],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return { sent: false, dryRun: false, detail: `HTTP ${resp.status}: ${txt.slice(0, 140)}` };
    }
    return { sent: true, dryRun: false, detail: 'Inviata via Brevo API' };
  } catch (err: any) {
    return { sent: false, dryRun: false, detail: err.message };
  }
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
  const discountFormula = `${baseDiscount}% + ${extraDiscount}%`;

  const agent = await resolveSdrAgent(prospect.assignedAgentId || prospect.assignedAgentCode);
  const maxProducts = Math.min(160, Math.max(24, Number(config?.catalogMaxProducts || 120)));

  const safeCompanySlug = prospect.companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  const pdfFileName = `Catalistino_Riservato_2gg_${safeCompanySlug || prospect.id}.pdf`;

  const cacheKey = `sdr:catalog:pdf:v1:${prospect.id}:${baseDiscount}:${extraDiscount}:${maxProducts}:${agent.code}`;
  if (!options.forceRefresh) {
    try {
      const cachedRaw = await redisConnection.get(cacheKey);
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
      discountExpiresFormatted: 'Sul primo acquisto (Solo 2gg)',
      stockMain: p.stockMain,
      stockEk: 0,
      stockTotal: p.stockMain,
      catalogSource: 'zucchetti' as const,
      imageUrl: p.imageUrl || undefined,
      productId: p.id,
      productUrl: `${b2bBase}/products/${encodeURIComponent(p.id)}`,
    };
  });

  if (itemsForPdf.length === 0) {
    throw new Error(
      'Nessun articolo in Pronta Consegna 2gg disponibile su Typesense per generare il Catalistino PDF.'
    );
  }

  const pdfRes = await generateAgentCatalogPdfAction({
    catalogTitle: `Catalistino Riservato a ${prospect.companyName}`,
    catalogSubtitle: `${config?.offerTitle || 'Offerta esclusiva valida per il primo acquisto'} — Sconto ${discountFormula} Pronta Consegna 2gg`,
    clientName: `${prospect.companyName}${prospect.city ? ` (${prospect.city})` : ''}`,
    clientCode: (prospect.promotedUsername || '').toUpperCase() || undefined,
    agentName: `${agent.name} (Cod. ${agent.code})`,
    filterSummary: `Selezione Pronta Consegna 2gg (Deposito Principale 24/48h) • Sconto Riservato ${discountFormula} (${effectiveDiscountPct}% netto) valido sul 1° Acquisto`,
    priceMode: 'LIST_AND_NET',
    stockMode: 'BADGE_ONLY',
    baseDiscount,
    extraDiscount,
    items: itemsForPdf,
  });

  if (!pdfRes.success || !pdfRes.pdfBase64) {
    throw new Error(pdfRes.error || 'Generazione binaria PDF non riuscita.');
  }

  try {
    await redisConnection.set(
      cacheKey,
      JSON.stringify({ pdfBase64: pdfRes.pdfBase64, itemsCount: itemsForPdf.length }),
      'EX',
      7200
    );
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
    agent,
  };
}
