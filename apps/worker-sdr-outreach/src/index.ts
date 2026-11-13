import 'dotenv/config';
import * as crypto from 'crypto';
import * as dns from 'dns';
import * as http from 'http';
import * as bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { Worker, Job } from 'bullmq';
import {
  createRedisConnection,
  env,
  log,
  sdrOutreachQueue,
  SDR_JOBS,
} from '@archelia/core';
import {
  sdrPrisma,
  resolveClusterConfig,
  decryptSdrSecret,
  computeEffectiveInboxDailyLimit,
  containsUnresolvedPlaceholders,
  generateCombinatorialOutreachEmail,
  seedCombinatorialLibraryInDb,
} from '@archelia/sdr-database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';

const MODULE_NAME = 'worker-sdr-outreach';
const DEFAULT_AGENT_ID = 'cmtu64h1c0000jk0sb1ho1o49';
const DEFAULT_AGENT_CODE = '003';
const DEFAULT_AGENT_NAME = 'Daniele Savoia';
const SDR_CONSOLE_REDIS_KEY = 'sdr:console:logs';

const redisClient = createRedisConnection();

function pushSdrConsoleLog(
  agent: string,
  message: string,
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO'
) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    agent,
    message,
    level,
  };
  redisClient
    .lpush(SDR_CONSOLE_REDIS_KEY, JSON.stringify(entry))
    .then(() => redisClient.ltrim(SDR_CONSOLE_REDIS_KEY, 0, 299))
    .catch(() => {});

  if (level === 'ERROR') {
    log.error(`[${agent}] ${message}`, { module: MODULE_NAME });
  } else if (level === 'WARN') {
    log.warn(`[${agent}] ${message}`, { module: MODULE_NAME });
  } else {
    log.info(`[${agent}] ${message}`, { module: MODULE_NAME });
  }
}

// ============================================================================
// 1. RISOLUZIONE AGENTE B2B & ALERT ISTANTANEO BREVO (TRACK 2 — DRY-RUN GUARDED)
// ============================================================================

interface ResolvedAgent {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
}

async function resolveAgentForProspect(
  agentId?: string | null,
  agentCode?: string | null
): Promise<ResolvedAgent> {
  if (agentId || agentCode) {
    const found = await b2bPrisma.b2BUser
      .findFirst({
        where: {
          role: 'AGENT',
          isActive: true,
          OR: [
            ...(agentId ? [{ id: agentId }] : []),
            ...(agentCode ? [{ zucchettiCode: agentCode }] : []),
          ],
        },
        select: {
          id: true,
          zucchettiCode: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phone: true,
          username: true,
        },
      })
      .catch(() => null);

    if (found) {
      const code = (found.zucchettiCode || '').trim() || DEFAULT_AGENT_CODE;
      const isSavoia =
        found.id === DEFAULT_AGENT_ID ||
        code === DEFAULT_AGENT_CODE ||
        found.username.toLowerCase().includes('savoia');
      const rawFullName =
        `${found.firstName || ''} ${found.lastName || ''}`.trim() ||
        (found.companyName || '').trim();
      const fullName = rawFullName || (isSavoia ? DEFAULT_AGENT_NAME : found.username);
      return {
        id: found.id,
        code,
        name: fullName,
        email:
          (found.email || '').trim() ||
          (isSavoia
            ? 'daniele.savoia@izzodistribuzione.com'
            : env.BREVO_SENDER_EMAIL || 'daniele.savoia@izzodistribuzione.com'),
        phone: (found.phone || '').trim() || '+39 389 0129832',
      };
    }
  }

  return {
    id: DEFAULT_AGENT_ID,
    code: DEFAULT_AGENT_CODE,
    name: DEFAULT_AGENT_NAME,
    email: 'daniele.savoia@izzodistribuzione.com',
    phone: '+39 389 0129832',
  };
}

async function sendBrevoReplyAlertToAgent(params: {
  agent: ResolvedAgent;
  companyName: string;
  city?: string | null;
  province?: string | null;
  fromEmail: string;
  phone?: string | null;
  subject: string;
  snippet: string;
  sentiment: string;
}): Promise<boolean> {
  if (!env.ENABLE_GLOBAL_WRITES) {
    pushSdrConsoleLog(
      'BREVO-ALERT',
      `[DRY-RUN] Alert risposta IMAP per Agente ${params.agent.name} (${params.agent.email}) simulato — Prospect: ${params.companyName} (${params.sentiment})`,
      'INFO'
    );
    return false;
  }

  if (!env.BREVO_API_KEY) {
    log.warn('BREVO_API_KEY assente: impossibile inviare notifica risposta a referente B2B', {
      module: MODULE_NAME,
    });
    return false;
  }

  const esc = (s?: string | null) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

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
        to: [{ email: params.agent.email, name: params.agent.name }],
        replyTo: { email: params.fromEmail, name: params.companyName },
        subject: `🔥 [RISPOSTA LEAD B2B] ${params.companyName} (${params.city || 'IT'}) ha risposto! [${params.sentiment}]`,
        tags: ['sdr-imap-reply-alert'],
        htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
          <h2 style="color: #15803d; margin-bottom: 6px;">💬 Nuova Risposta B2B intercettata da AI SDR!</h2>
          <p>Ciao <strong>${esc(params.agent.name)}</strong>, il Kill-Switch Atomico ha fermato i follow-up automatici e ti passa subito la conversazione:</p>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <div><strong>Azienda:</strong> ${esc(params.companyName)} (${esc(params.city)} ${esc(params.province)})</div>
            <div><strong>Email Mittente:</strong> <a href="mailto:${esc(params.fromEmail)}">${esc(params.fromEmail)}</a></div>
            <div><strong>Telefono:</strong> ${esc(params.phone || 'N/D')}</div>
            <div><strong>Sentiment rilevato:</strong> <strong>${esc(params.sentiment)}</strong></div>
            <div><strong>Oggetto:</strong> ${esc(params.subject)}</div>
          </div>
          <div style="background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 14px; font-size: 13px; white-space: pre-wrap;">${esc(params.snippet)}</div>
          <p style="font-size: 12px; color: #64748b; margin-top: 12px;">Puoi rispondere direttamente a questa email (Reply-To già impostato su ${esc(params.fromEmail)}).</p>
        </div>`,
      }),
    });
    return resp.ok;
  } catch (err: any) {
    log.error(`Errore Brevo Alert risposta IMAP: ${err.message}`, { module: MODULE_NAME });
    return false;
  }
}

// ============================================================================
// 2. HELPER USERNAME, PASSWORD, DNS MX, TIME-FENCING (EUROPE/ROME) & JITTER
// ============================================================================

function buildSmartPermanentUsername(companyName: string): string {
  let cleaned = (companyName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/F\.?\s*LLI\b/g, 'FRATELLI')
    .replace(/\./g, ' ')
    .replace(/&/g, ' ')
    .replace(
      /\b(SRLS|SRL|SPA|SNC|SAS|SAPA|SCARL|SS|SOC|COOP|COOPERATIVA|SOCIETA|RESPONSABILITA|LIMITATA|UNIPERSONALE|LIQUIDAZIONE|DITTA|INDIVIDUALE|IMPRESA)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  const diSplit = cleaned.split(/\s+DI\s+/);
  if (diSplit.length > 1 && diSplit[0] && diSplit[0].trim().length >= 3) {
    cleaned = diSplit[0].trim();
  }

  const stopWords = new Set(['del', 'della', 'dei', 'degli', 'delle', 'con', 'per', 'ed', 'da', 'in']);
  const words = cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (words.length >= 2) {
    const two = `${words[0]}.${words[1]}`;
    return two.length <= 22 ? two : words[0].slice(0, 18);
  }
  if (words.length === 1) {
    return words[0].slice(0, 20);
  }
  return `partner.${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Izzo!${suffix}`;
}

function generateTrackingToken(): string {
  return crypto.randomBytes(14).toString('base64url');
}

function buildSmartOfferUrls(token: string) {
  const b2bBase = (env.B2B_PUBLIC_URL || 'https://www.izzodistribuzione.it').replace(/\/$/, '');
  const apiBase = (env.API_PUBLIC_URL || 'https://api-gateway-v2-development.up.railway.app').replace(
    /\/$/,
    ''
  );
  return {
    storefrontOfferUrl: `${b2bBase}/offerta/${encodeURIComponent(token)}`,
    apiPdfDownloadUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf`,
  };
}

async function verifyRecipientDomainMx(email: string): Promise<{ valid: boolean; mxHost?: string }> {
  const domain = (email.split('@')[1] || '').trim().toLowerCase();
  if (!domain || !domain.includes('.')) return { valid: false };

  const cacheKey = `sdr:mx:v1:${domain}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached === 'INVALID') return { valid: false };
    if (cached) return { valid: true, mxHost: cached };
  } catch {
    // ignore cache miss
  }

  try {
    const records = await dns.promises.resolveMx(domain);
    if (Array.isArray(records) && records.length > 0) {
      const sorted = [...records].sort((a, b) => a.priority - b.priority);
      const topMx = sorted[0]?.exchange || 'mx-ok';
      await redisClient.set(cacheKey, topMx, 'EX', 86400).catch(() => {});
      return { valid: true, mxHost: topMx };
    }
    await redisClient.set(cacheKey, 'INVALID', 'EX', 21600).catch(() => {});
    return { valid: false };
  } catch (err: any) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
      await redisClient.set(cacheKey, 'INVALID', 'EX', 21600).catch(() => {});
      return { valid: false };
    }
    // Transient DNS timeout -> allow attempt
    return { valid: true, mxHost: 'dns-timeout-allow' };
  }
}

function computeGaussianJitterSeconds(minSec = 180, maxSec = 420): number {
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const mean = (minSec + maxSec) / 2;
  const stdDev = (maxSec - minSec) / 5;
  const val = Math.round(mean + z0 * stdDev);
  return Math.max(minSec, Math.min(maxSec, val));
}

function parseWindowMinutes(winStr: string, fallbackStart: number, fallbackEnd: number): [number, number] {
  const m = String(winStr || '').match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return [fallbackStart, fallbackEnd];
  const s = Number(m[1]) * 60 + Number(m[2]);
  const e = Number(m[3]) * 60 + Number(m[4]);
  return s < e ? [s, e] : [fallbackStart, fallbackEnd];
}

function getRomeDateParts(now = new Date()): {
  dateKey: string;
  weekday: number; // 0=Sun, 1=Mon ... 6=Sat
  minutesOfDay: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const wkMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = wkMap[get('weekday')] ?? now.getDay();
  const hour = Number(get('hour') || 0);
  const minute = Number(get('minute') || 0);
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  return {
    dateKey,
    weekday,
    minutesOfDay: hour * 60 + minute,
  };
}

/**
 * Restituisce 0 se siamo dentro la finestra consentita Lun-Ven (08:30-12:30 o 14:00-17:30 Europe/Rome),
 * oppure i millisecondi mancanti alla prossima apertura utile.
 */
function computeTimeFencingDelayMs(config: {
  timeFencingEnabled?: boolean;
  morningWindow?: string | null;
  afternoonWindow?: string | null;
}): number {
  if (config.timeFencingEnabled === false) return 0;

  const { weekday, minutesOfDay } = getRomeDateParts();
  const [mStart, mEnd] = parseWindowMinutes(config.morningWindow || '08:30-12:30', 510, 750);
  const [aStart, aEnd] = parseWindowMinutes(config.afternoonWindow || '14:00-17:30', 840, 1050);

  // Sabato (6) -> Lunedì mattina mStart
  if (weekday === 6) {
    const minsUntilMonday = (24 * 60 - minutesOfDay) + 24 * 60 + mStart;
    return minsUntilMonday * 60 * 1000;
  }
  // Domenica (0) -> Lunedì mattina mStart
  if (weekday === 0) {
    const minsUntilMonday = (24 * 60 - minutesOfDay) + mStart;
    return minsUntilMonday * 60 * 1000;
  }

  // Lun-Ven: dentro finestra mattutina o pomeridiana -> 0 delay
  if ((minutesOfDay >= mStart && minutesOfDay < mEnd) || (minutesOfDay >= aStart && minutesOfDay < aEnd)) {
    return 0;
  }

  // Prima dell'apertura mattutina
  if (minutesOfDay < mStart) {
    return (mStart - minutesOfDay) * 60 * 1000;
  }

  // Pausa pranzo -> aspetta apertura pomeridiana
  if (minutesOfDay >= mEnd && minutesOfDay < aStart) {
    return (aStart - minutesOfDay) * 60 * 1000;
  }

  // Dopo chiusura pomeridiana: se Venerdì (5) aspetta Lunedì, altrimenti domani mattina
  const extraDays = weekday === 5 ? 2 : 0;
  const minsUntilNextMorning = (24 * 60 - minutesOfDay) + extraDays * 24 * 60 + mStart;
  return minsUntilNextMorning * 60 * 1000;
}

async function resetDailyInboxQuotasIfNeeded() {
  const { dateKey } = getRomeDateParts();
  const resetLock = `sdr:quota:reset:${dateKey}`;
  const acquired = await redisClient
    .set(resetLock, '1', 'EX', 172800, 'NX')
    .then((r) => r === 'OK')
    .catch(() => false);
  if (acquired) {
    const res = await sdrPrisma.sdrInboxAccount.updateMany({
      where: { sentToday: { gt: 0 } },
      data: { sentToday: 0 },
    });
    if (res.count > 0) {
      pushSdrConsoleLog(
        'QUOTA-RESET',
        `Azzerato contatore giornaliero sentToday su ${res.count} caselle Aruba per la data ${dateKey}.`,
        'INFO'
      );
    }
  }
}

// ============================================================================
// 3. PREPARAZIONE PACCHETTO OUTREACH (CREDENZIALI + REGOLA ALL_2GG + COPY ANTI-SPAM)
// ============================================================================

export async function prepareOutreachPackageForProspect(
  prospectId: number,
  overrideAgentId?: string | null,
  overrideAgentCode?: string | null
) {
  const [prospect, configRow] = await Promise.all([
    sdrPrisma.sdrProspect.findUnique({ where: { id: prospectId } }),
    sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
  ]);

  if (!prospect) {
    throw new Error(`Prospect SDR #${prospectId} non trovato.`);
  }
  const email = (prospect.ordinaryEmail || '').trim().toLowerCase();
  if (!email) {
    throw new Error(`Prospect SDR #${prospectId} (${prospect.companyName}) privo di email ordinaria.`);
  }

  const domain = email.split('@')[1] || '';
  const blacklisted = await sdrPrisma.sdrBlacklist.findFirst({
    where: {
      OR: [{ emailOrDomain: email }, ...(domain ? [{ emailOrDomain: domain }] : [])],
    },
  });
  if (blacklisted) {
    throw new Error(`Email/dominio in blacklist (${blacklisted.reason}): ${email}`);
  }

  const resolvedAgent = await resolveAgentForProspect(
    overrideAgentId || prospect.assignedAgentId || configRow?.defaultAgentId,
    overrideAgentCode || prospect.assignedAgentCode || configRow?.defaultAgentCode
  );

  const clusterCfg = resolveClusterConfig(prospect.categoryCluster, prospect.commercialCategory);
  const commercialCategory = clusterCfg.commercialCategory;
  const baseDiscount = clusterCfg.baseDiscount;

  const enableFirstPurchaseRule = configRow?.enableFirstPurchaseRule ?? true;
  const extraDiscountPct =
    commercialCategory === 'RIV'
      ? Number(configRow?.rivExtraDiscountPct ?? 10)
      : Number(configRow?.istExtraDiscountPct ?? 10);
  const discountFormulaLabel = `${baseDiscount}% + ${extraDiscountPct}%`;
  const catalistinoTitle = `Catalistino Illustrativo per ${prospect.companyName}`;
  const catalistinoSubtitle = `Invito a valutarci come fornitore B2B — Benvenuto 1° ordine ${discountFormulaLabel}`;
  const minOrderAmountText =
    configRow?.minOrderAmountText || "Nessun minimo d'ordine";
  const freeShippingText =
    configRow?.freeShippingText ||
    'Spedizione curata e tracciata in tutta Italia';
  const paymentTermsText =
    configRow?.paymentTermsText ||
    `Consultazione gratuita e referente dedicato ${resolvedAgent.name}`;
  const attachCatalogPdf = configRow?.attachCatalogPdf ?? true;

  let promo = await b2bPrisma.b2BPromoProspect.findFirst({
    where: {
      OR: [{ sdrProspectId: prospect.id }, { email }],
    },
  });

  let tempPassword = promo?.tempPassword || '';

  if (!promo) {
    const baseUsername = buildSmartPermanentUsername(prospect.companyName);
    let finalUsername = baseUsername;
    let counter = 0;
    while (counter < 50) {
      const [dupActive, dupPromo] = await Promise.all([
        b2bPrisma.b2BUser.findUnique({ where: { username: finalUsername }, select: { id: true } }),
        b2bPrisma.b2BPromoProspect.findUnique({
          where: { username: finalUsername },
          select: { id: true },
        }),
      ]);
      if (!dupActive && !dupPromo) break;
      counter++;
      finalUsername = `${baseUsername}.${counter}`;
    }

    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    promo = await b2bPrisma.b2BPromoProspect.create({
      data: {
        sdrProspectId: prospect.id,
        username: finalUsername,
        email,
        passwordHash,
        tempPassword,
        mustChangePassword: true,
        companyName: prospect.companyName,
        vatNumber: prospect.vatNumber,
        fiscalCode: prospect.fiscalCode || prospect.vatNumber,
        pecEmail: prospect.pecCamerale,
        categoryCluster: clusterCfg.cluster,
        commercialCategory,
        discount: baseDiscount,
        address: prospect.address,
        city: prospect.city,
        zip: prospect.cap,
        province: prospect.province,
        region: prospect.region,
        phone: prospect.phone,
        whatsappPhone: prospect.whatsappPhone,
        website: prospect.website,
        agentId: resolvedAgent.id,
        agentCode: resolvedAgent.code,
        status: 'CONTACTED',
        emailSentAt: new Date(),
      },
    });
  } else if (!tempPassword) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    promo = await b2bPrisma.b2BPromoProspect.update({
      where: { id: promo.id },
      data: {
        tempPassword,
        passwordHash,
        mustChangePassword: true,
        agentId: resolvedAgent.id,
        agentCode: resolvedAgent.code,
        commercialCategory,
        discount: baseDiscount,
      },
    });
  }

  // Regola di sconto FIRST_PURCHASE ristretta a ALL_2GG con clientCode = promo.username.toUpperCase()
  let firstPurchaseRuleId: string | null = promo.firstPurchaseRuleId || null;
  if (enableFirstPurchaseRule && extraDiscountPct > 0) {
    firstPurchaseRuleId = `sdr_fp_${promo.id}`;
    const ruleName = `Benvenuto Primo Ordine (${discountFormulaLabel}) — ${promo.companyName}`;
    const upperUsername = promo.username.toUpperCase();

    await b2bPrisma.b2BDiscountRule.upsert({
      where: { id: firstPurchaseRuleId },
      create: {
        id: firstPurchaseRuleId,
        name: ruleName,
        agentId: resolvedAgent.id,
        agentCode: resolvedAgent.code,
        clientScope: 'SINGLE_CLIENT',
        clientId: promo.id,
        clientName: promo.companyName,
        clientIds: [promo.id],
        clientCategories: [commercialCategory],
        targetType: 'ALL_2GG',
        calculationMode: 'EXTRA_CASCADE',
        discountValue: extraDiscountPct,
        expiryType: 'FIRST_PURCHASE',
        isActive: true,
      },
      update: {
        name: ruleName,
        agentId: resolvedAgent.id,
        agentCode: resolvedAgent.code,
        targetType: 'ALL_2GG',
        discountValue: extraDiscountPct,
        calculationMode: 'EXTRA_CASCADE',
        expiryType: 'FIRST_PURCHASE',
        isActive: true,
      },
    });

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
        firstPurchaseRuleId,
        resolvedAgent.id,
        resolvedAgent.code,
        ruleName,
        promo.id,
        upperUsername,
        `[IN ATTIVAZIONE] ${promo.companyName}`,
        JSON.stringify([promo.id]),
        JSON.stringify([upperUsername]),
        JSON.stringify([
          {
            id: promo.id,
            code: upperUsername,
            name: `[IN ATTIVAZIONE] ${promo.companyName}`,
            baseDiscount,
            categoryCode: commercialCategory,
            categoryLabel: commercialCategory === 'RIV' ? 'Rivenditore' : 'Installatore',
          },
        ]),
        JSON.stringify([commercialCategory]),
        extraDiscountPct
      );
    } catch (syncErr: any) {
      log.warn(`Avviso sync b2b_agent_discount_rules: ${syncErr.message}`, { module: MODULE_NAME });
    }

    await b2bPrisma.b2BPromoProspect.update({
      where: { id: promo.id },
      data: {
        firstPurchaseRuleId,
        orderDetailsSnapshot: {
          offerTitle: catalistinoSubtitle,
          minOrderAmountText,
          freeShippingText,
          paymentTermsText,
          baseDiscountNum: baseDiscount,
          extraFirstPurchasePct: extraDiscountPct,
          discountFormula: discountFormulaLabel,
          agentName: resolvedAgent.name,
        },
        attachedCatalogMeta: attachCatalogPdf
          ? {
              filename: `Catalistino_Riservato_${prospect.companyName
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .slice(0, 28)}.pdf`,
              catalogTitle: catalistinoTitle,
              catalogSubtitle: catalistinoSubtitle,
              warehouse: 'MAIN_2GG',
              stockDisplayMode: 'BADGE_ONLY',
              priceDisplayMode: 'LIST_AND_NET',
              discountFormula: discountFormulaLabel,
              baseDiscount,
              extraDiscountPct,
              maxProducts: Number(configRow?.catalogMaxProducts || 120),
            }
          : undefined,
      },
    });
  }

  const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
    where: { prospectId: prospect.id, sequenceStep: 1 },
  });
  const trackingToken = existingDraft?.trackingToken || generateTrackingToken();
  const smartUrls = buildSmartOfferUrls(trackingToken);

  const richMetaObj =
    prospect.richMetadata && typeof prospect.richMetadata === 'object'
      ? (prospect.richMetadata as Record<string, any>)
      : null;

  const tailored = await generateCombinatorialOutreachEmail({
    prospectId: prospect.id,
    companyName: prospect.companyName,
    city: prospect.city,
    province: prospect.province,
    region: prospect.region,
    website: prospect.website,
    atecoCode: prospect.atecoCode,
    categoryCluster: clusterCfg.cluster,
    brandsDetected: prospect.brandsDetected,
    decisionMaker: richMetaObj?.decision_maker || null,
    richMetadata: richMetaObj,
    username: promo.username,
    tempPasswordPlain: tempPassword,
    baseDiscount,
    extraFirstPurchasePct: enableFirstPurchaseRule ? extraDiscountPct : 0,
    offerTitle: catalistinoSubtitle,
    minOrderAmountText,
    freeShippingText,
    paymentTermsText,
    customCommercialNotes: configRow?.customCommercialNotes,
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
          templateCode: tailored.templateCode,
          attachedCatalogUrl: attachCatalogPdf ? smartUrls.apiPdfDownloadUrl : null,
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
          templateCode: tailored.templateCode,
          attachedCatalogUrl: attachCatalogPdf ? smartUrls.apiPdfDownloadUrl : null,
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
      baseDiscount,
      promoProspectId: promo.id,
      promotedUsername: promo.username,
      pipelineStatus: 'Credenziali_Create',
      assignedAgentId: resolvedAgent.id,
      assignedAgentCode: resolvedAgent.code,
    },
  });

  return {
    prospectId: prospect.id,
    promoProspectId: promo.id,
    username: promo.username,
    tempPassword,
    firstPurchaseRuleId,
    draftId: draft.id,
    trackingToken,
    smartOfferUrl: smartUrls.storefrontOfferUrl,
  };
}

// ============================================================================
// 4. SELEZIONE CASELLA POOL 60 ARUBA + DISPATCHER SMTP SSL (CON DRY-RUN RIGOROSO)
// ============================================================================

async function selectAvailableArubaMailbox() {
  await resetDailyInboxQuotasIfNeeded();

  const accounts = await sdrPrisma.sdrInboxAccount.findMany({
    where: { isActive: true },
  });

  const candidates = accounts
    .map((acc) => {
      const ramp = computeEffectiveInboxDailyLimit(acc);
      return {
        acc,
        effectiveLimit: ramp.effectiveDailyLimit,
        warmupWeek: ramp.warmupWeek,
        ratio: acc.sentToday / Math.max(1, ramp.effectiveDailyLimit),
      };
    })
    .filter((c) => c.acc.sentToday < c.effectiveLimit)
    .sort((a, b) => {
      if (Math.abs(a.ratio - b.ratio) > 0.01) return a.ratio - b.ratio;
      const tA = a.acc.lastSentAt ? a.acc.lastSentAt.getTime() : 0;
      const tB = b.acc.lastSentAt ? b.acc.lastSentAt.getTime() : 0;
      return tA - tB;
    });

  return candidates[0] || null;
}

async function dispatchSingleOutreachEmail(draftId: number) {
  const [draft, config] = await Promise.all([
    sdrPrisma.sdrOutreachDraft.findUnique({
      where: { id: draftId },
      include: { prospect: true },
    }),
    sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
  ]);

  if (!draft || !draft.prospect) {
    throw new Error(`Draft #${draftId} non trovata.`);
  }

  // Rispetto assoluto di Kill-Switch / Template Disarmati / Opt-Out
  if (
    draft.status === 'Annullato_KillSwitch' ||
    draft.status === 'Template_Da_Attivare' ||
    draft.status === 'Risposta_Ricevuta' ||
    draft.status === 'Inviata'
  ) {
    return { skipped: true, reason: `Stato bozza: ${draft.status}` };
  }

  if (
    draft.prospect.pipelineStatus === 'Opt_Out' ||
    draft.prospect.pipelineStatus === 'Bounce_Invalido' ||
    draft.prospect.pipelineStatus === 'Ha_Risposto'
  ) {
    return { skipped: true, reason: `Pipeline prospect: ${draft.prospect.pipelineStatus}` };
  }

  // Hard Safety Guard contro qualsiasi placeholder residuo ({{...}} o DEMO_USERNAME)
  if (
    containsUnresolvedPlaceholders(draft.subject) ||
    containsUnresolvedPlaceholders(draft.bodyText) ||
    containsUnresolvedPlaceholders(draft.bodyHtml) ||
    !draft.prospect.promoProspectId
  ) {
    await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: { status: 'Template_Da_Attivare' },
    });
    throw new Error(`Safety Guard: Draft #${draftId} bloccata per placeholder non risolti o credenziali mancanti.`);
  }

  const recipientEmail = (draft.prospect.ordinaryEmail || '').trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error(`Prospect #${draft.prospectId} privo di email ordinaria valida.`);
  }

  // Verifica Blacklist
  const domain = recipientEmail.split('@')[1] || '';
  const blacklisted = await sdrPrisma.sdrBlacklist.findFirst({
    where: {
      OR: [{ emailOrDomain: recipientEmail }, ...(domain ? [{ emailOrDomain: domain }] : [])],
    },
  });
  if (blacklisted) {
    await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: { status: 'Annullato_KillSwitch' },
    });
    return { skipped: true, reason: `In blacklist: ${blacklisted.reason}` };
  }

  // Pre-Send DNS MX Check per proteggere reputazione dei 6 domini Aruba
  const mxCheck = await verifyRecipientDomainMx(recipientEmail);
  if (!mxCheck.valid) {
    await Promise.all([
      sdrPrisma.sdrProspect.update({
        where: { id: draft.prospectId },
        data: { pipelineStatus: 'Bounce_Invalido' },
      }),
      sdrPrisma.sdrOutreachDraft.update({
        where: { id: draft.id },
        data: { status: 'Annullato_KillSwitch' },
      }),
      domain
        ? sdrPrisma.sdrBlacklist
            .upsert({
              where: { emailOrDomain: domain },
              create: { emailOrDomain: domain, reason: 'Pre-Send DNS MX assente/invalido' },
              update: { reason: 'Pre-Send DNS MX assente/invalido' },
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);
    pushSdrConsoleLog(
      'MX-GUARD',
      `Bloccato invio a ${recipientEmail} (${draft.prospect.companyName}): dominio ${domain} privo di record MX valido!`,
      'WARN'
    );
    return { skipped: true, reason: 'Dominio destinatario privo di record MX' };
  }

  // Seleziona la casella migliore dal Pool 60 Aruba
  const selected = await selectAvailableArubaMailbox();

  // MODALITÀ DRY-RUN OBBLIGATORIA SE ENABLE_GLOBAL_WRITES === false
  if (!env.ENABLE_GLOBAL_WRITES) {
    const senderLabel = selected ? selected.acc.email : 'pool-aruba-dryrun@izzodistribuzioneb2b.it';
    pushSdrConsoleLog(
      'DRY-RUN-SMTP',
      `[DRY-RUN] Da: ${senderLabel} -> A: ${recipientEmail} (${draft.prospect.companyName}) | MX: ${mxCheck.mxHost} | Oggetto: "${draft.subject}"`,
      'SUCCESS'
    );

    await Promise.all([
      sdrPrisma.sdrOutreachDraft.update({
        where: { id: draft.id },
        data: {
          status: 'Inviata_Dry_Run',
          senderInboxId: selected?.acc.id || null,
          sentAt: new Date(),
        },
      }),
      sdrPrisma.sdrProspect.update({
        where: { id: draft.prospectId },
        data: {
          pipelineStatus: 'Inviata_Dry_Run',
        },
      }),
    ]);

    return {
      dryRun: true,
      draftId: draft.id,
      senderEmail: senderLabel,
      recipientEmail,
      mxHost: mxCheck.mxHost,
    };
  }

  // INVIO REALE (ENABLE_GLOBAL_WRITES === true): Time-Fencing Lun-Ven + Jitter + Aruba SSL 465
  const fenceDelayMs = computeTimeFencingDelayMs(config || {});
  if (fenceDelayMs > 0) {
    const jitterMs =
      computeGaussianJitterSeconds(
        config?.jitterMinSeconds || 180,
        config?.jitterMaxSeconds || 420
      ) * 1000;
    await sdrOutreachQueue.add(
      SDR_JOBS.DISPATCH_SINGLE,
      { action: SDR_JOBS.DISPATCH_SINGLE, draftId: draft.id },
      { delay: fenceDelayMs + jitterMs, jobId: `fence-${draft.id}-${Date.now()}` }
    );
    pushSdrConsoleLog(
      'TIME-FENCING',
      `Draft #${draft.id} (${draft.prospect.companyName}) riprogrammata tra ${Math.round(
        (fenceDelayMs + jitterMs) / 60000
      )} min (fuori finestra lavorativa Lun-Ven Europe/Rome).`,
      'INFO'
    );
    return { rescheduled: true, delayMs: fenceDelayMs + jitterMs };
  }

  if (!selected) {
    // Pool giornaliero saturo -> riprogramma tra 6 ore
    await sdrOutreachQueue.add(
      SDR_JOBS.DISPATCH_SINGLE,
      { action: SDR_JOBS.DISPATCH_SINGLE, draftId: draft.id },
      { delay: 6 * 3600 * 1000 }
    );
    pushSdrConsoleLog(
      'QUOTA-CAP',
      `Tutte le caselle Aruba attive hanno raggiunto il tetto giornaliero Ramp-Up. Draft #${draft.id} riprogrammata.`,
      'WARN'
    );
    return { rescheduled: true, reason: 'Daily pool quota reached' };
  }

  const inbox = selected.acc;
  const smtpPassword = decryptSdrSecret(inbox.smtpPasswordEnc);
  if (!smtpPassword || smtpPassword === 'DRY_RUN_TOKEN') {
    throw new Error(`Password SMTP non configurata per la casella ${inbox.email}`);
  }

  const senderDomain = inbox.email.split('@')[1] || 'izzodistribuzioneb2b.it';
  const customMessageId = `<sdr.${draft.id}.${Date.now()}.${crypto
    .randomBytes(4)
    .toString('hex')}@${senderDomain}>`;

  const transporter = nodemailer.createTransport({
    host: inbox.smtpHost,
    port: inbox.smtpPort,
    secure: inbox.smtpPort === 465,
    auth: {
      user: inbox.smtpUser,
      pass: smtpPassword,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({
      from: `"${inbox.displayName}" <${inbox.email}>`,
      to: recipientEmail,
      replyTo: inbox.email,
      subject: draft.subject,
      text: draft.bodyText,
      html: draft.bodyHtml || undefined,
      messageId: customMessageId,
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });
    transporter.close();

    await Promise.all([
      sdrPrisma.sdrInboxAccount.update({
        where: { id: inbox.id },
        data: {
          sentToday: { increment: 1 },
          lastSentAt: new Date(),
          consecutiveErrors: 0,
        },
      }),
      sdrPrisma.sdrOutreachDraft.update({
        where: { id: draft.id },
        data: {
          status: 'Inviata',
          senderInboxId: inbox.id,
          messageIdHeader: customMessageId,
          sentAt: new Date(),
        },
      }),
      sdrPrisma.sdrProspect.update({
        where: { id: draft.prospectId },
        data: {
          pipelineStatus: 'Email_Inviata',
        },
      }),
    ]);

    pushSdrConsoleLog(
      'SMTP-ARUBA',
      `Email inviata con successo da ${inbox.email} (${inbox.sentToday + 1}/${selected.effectiveLimit} W${selected.warmupWeek}) -> ${recipientEmail} (${draft.prospect.companyName})`,
      'SUCCESS'
    );

    return {
      dryRun: false,
      draftId: draft.id,
      senderEmail: inbox.email,
      recipientEmail,
      messageId: customMessageId,
    };
  } catch (smtpErr: any) {
    transporter.close();
    await sdrPrisma.sdrInboxAccount
      .update({
        where: { id: inbox.id },
        data: {
          consecutiveErrors: { increment: 1 },
          lastTestError: String(smtpErr.message || '').slice(0, 400),
        },
      })
      .catch(() => {});
    throw smtpErr;
  }
}

async function scheduleDispatchBatchWithJitter(draftIds: number[]) {
  const config = await sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } });

  // In Dry-Run eseguiamo subito la simulazione per dare feedback istantaneo in console e DB
  if (!env.ENABLE_GLOBAL_WRITES) {
    const results = [];
    for (const did of draftIds) {
      try {
        const r = await dispatchSingleOutreachEmail(Number(did));
        results.push({ success: true, ...r });
      } catch (e: any) {
        results.push({ success: false, draftId: did, error: e.message });
      }
    }
    return { dryRun: true, count: results.length, results };
  }

  // Con scritture globali attive, scaglioniamo i job con Jitter Gaussiano (180-420s per slot casella)
  const activeCount = Math.max(
    1,
    await sdrPrisma.sdrInboxAccount.count({ where: { isActive: true } })
  );
  const baseFenceDelay = computeTimeFencingDelayMs(config || {});
  const minJ = config?.jitterMinSeconds || 180;
  const maxJ = config?.jitterMaxSeconds || 420;

  let queued = 0;
  for (let idx = 0; idx < draftIds.length; idx++) {
    const did = Number(draftIds[idx]);
    if (Number.isNaN(did)) continue;
    const waveNumber = Math.floor(idx / activeCount);
    const slotJitterMs =
      waveNumber * computeGaussianJitterSeconds(minJ, maxJ) * 1000 +
      Math.floor(Math.random() * 45000);

    await sdrOutreachQueue.add(
      SDR_JOBS.DISPATCH_SINGLE,
      { action: SDR_JOBS.DISPATCH_SINGLE, draftId: did },
      { delay: baseFenceDelay + slotJitterMs, jobId: `send-${did}-${Date.now()}` }
    );
    queued++;
  }

  pushSdrConsoleLog(
    'SCHEDULER',
    `Pianificati ${queued} invii singoli su ${activeCount} caselle Aruba con Jitter Gaussiano (${minJ}-${maxJ}s).`,
    'INFO'
  );
  return { dryRun: false, scheduledCount: queued };
}

// ============================================================================
// 5. IMAP LISTENER & ATOMIC KILL-SWITCH SULLE 60 CASELLE ARUBA (CONCURRENCY MAX 4)
// ============================================================================

function classifyReplySentiment(
  subject: string,
  bodyText: string
): 'Bounce' | 'Out_Of_Office' | 'Opt_Out' | 'Interessato' | 'Info_Richiesta' {
  const combined = `${subject}\n${bodyText}`.toLowerCase();

  if (
    /undelivered|delivery status notification|mail delivery failed|failure notice|user unknown|550 5\.1\.1|indirizzo inesistente|casella piena/i.test(
      combined
    )
  ) {
    return 'Bounce';
  }

  if (
    /assente dall'ufficio|fuori sede|out of office|risposta automatica|automatic reply|chiusura estiva|chiusi per ferie/i.test(
      combined
    )
  ) {
    return 'Out_Of_Office';
  }

  if (
    /non siamo interessati|non interessati|cancellatemi|rimuovetemi|disiscriv|unsubscribe|non inviate|stop email|gdpr|rimuovere il nostro indirizzo/i.test(
      combined
    )
  ) {
    return 'Opt_Out';
  }

  if (
    /interessat|preventivo|listino|contattateci|chiamate|ordine|fornitura|sconto|accedere|apertura conto|disponibilit/i.test(
      combined
    )
  ) {
    return 'Interessato';
  }

  return 'Info_Richiesta';
}

async function pollSingleArubaInboxImap(inbox: {
  id: number;
  email: string;
  imapHost: string;
  imapPort: number;
  imapUser: string | null;
  smtpUser: string;
  imapPasswordEnc: string | null;
  smtpPasswordEnc: string;
  lastImapUid: number;
}) {
  const imapPass = decryptSdrSecret(inbox.imapPasswordEnc || inbox.smtpPasswordEnc);
  if (!imapPass || imapPass === 'DRY_RUN_TOKEN') return { checked: false, newEvents: 0 };

  const client = new ImapFlow({
    host: inbox.imapHost,
    port: inbox.imapPort,
    secure: inbox.imapPort === 993,
    auth: {
      user: inbox.imapUser || inbox.smtpUser || inbox.email,
      pass: imapPass,
    },
    logger: false,
  });

  let highestUid = inbox.lastImapUid || 0;
  let newEvents = 0;

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen('INBOX', { readOnly: true });

    // Se è il primo sync assoluto e ci sono messaggi storici, inizializziamo il cursore agli ultimi 20 UID
    if (highestUid === 0 && mailbox.uidNext && mailbox.uidNext > 25) {
      highestUid = mailbox.uidNext - 25;
    }

    if (mailbox.exists > 0 && (!mailbox.uidNext || highestUid < mailbox.uidNext - 1)) {
      const range = `${highestUid + 1}:*`;
      for await (const msg of client.fetch(
        range,
        { uid: true, envelope: true, source: true },
        { uid: true }
      )) {
        if (msg.uid <= inbox.lastImapUid) continue;
        if (msg.uid > highestUid) highestUid = msg.uid;

        const fromAddr = (msg.envelope?.from?.[0]?.address || '').trim().toLowerCase();
        if (!fromAddr || fromAddr === inbox.email.toLowerCase()) continue;

        const subject = String(msg.envelope?.subject || '(Nessun oggetto)');
        const inReplyTo = String(msg.envelope?.inReplyTo || '').trim();
        const msgId = String(msg.envelope?.messageId || `imap-${inbox.id}-${msg.uid}`);
        const rawSource = msg.source ? msg.source.toString('utf8').slice(0, 12000) : '';
        // Estrae testo leggibile dal body grezzo rimuovendo header tecnici lunghi
        const bodyStartIdx = rawSource.indexOf('\r\n\r\n');
        const bodyClean = (bodyStartIdx >= 0 ? rawSource.slice(bodyStartIdx + 4) : rawSource)
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);

        const isMailerDaemon = /mailer-daemon|postmaster/i.test(fromAddr);
        const classification = isMailerDaemon
          ? 'Bounce'
          : classifyReplySentiment(subject, bodyClean);

        // Trova prospect associato (tramite In-Reply-To oppure indirizzo email mittente oppure email citata nel bounce)
        let matchedDraft = inReplyTo
          ? await sdrPrisma.sdrOutreachDraft.findFirst({
              where: { messageIdHeader: inReplyTo },
              include: { prospect: true },
            })
          : null;

        let matchedProspect = matchedDraft?.prospect || null;
        if (!matchedProspect && !isMailerDaemon) {
          matchedProspect = await sdrPrisma.sdrProspect.findFirst({
            where: { ordinaryEmail: { equals: fromAddr, mode: 'insensitive' } },
          });
        } else if (!matchedProspect && isMailerDaemon) {
          const bouncedEmailMatch = bodyClean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          const targetBounced = (bouncedEmailMatch || []).find(
            (e) => e.toLowerCase() !== inbox.email.toLowerCase() && !e.includes('aruba.it')
          );
          if (targetBounced) {
            matchedProspect = await sdrPrisma.sdrProspect.findFirst({
              where: { ordinaryEmail: { equals: targetBounced.toLowerCase(), mode: 'insensitive' } },
            });
          }
        }

        if (classification === 'Out_Of_Office') {
          await sdrPrisma.sdrInboxEvent
            .upsert({
              where: { messageId: msgId },
              create: {
                inboxAccountId: inbox.id,
                prospectId: matchedProspect?.id || null,
                draftId: matchedDraft?.id || null,
                fromEmail: fromAddr,
                toEmail: inbox.email,
                subject,
                snippet: bodyClean,
                eventType: 'OUT_OF_OFFICE',
                sentiment: 'Out_Of_Office',
                killSwitchTriggered: false,
                messageUid: msg.uid,
                messageId: msgId,
              },
              update: {},
            })
            .catch(() => {});
          continue;
        }

        if (classification === 'Bounce') {
          if (matchedProspect) {
            await Promise.all([
              sdrPrisma.sdrProspect.update({
                where: { id: matchedProspect.id },
                data: { pipelineStatus: 'Bounce_Invalido' },
              }),
              sdrPrisma.sdrOutreachDraft.updateMany({
                where: { prospectId: matchedProspect.id, status: { notIn: ['Inviata'] } },
                data: { status: 'Annullato_KillSwitch' },
              }),
              matchedProspect.ordinaryEmail
                ? sdrPrisma.sdrBlacklist
                    .upsert({
                      where: { emailOrDomain: matchedProspect.ordinaryEmail.toLowerCase() },
                      create: {
                        emailOrDomain: matchedProspect.ordinaryEmail.toLowerCase(),
                        reason: 'Hard Bounce IMAP Aruba',
                      },
                      update: { reason: 'Hard Bounce IMAP Aruba' },
                    })
                    .catch(() => {})
                : Promise.resolve(),
            ]);
          }

          await sdrPrisma.sdrInboxEvent
            .upsert({
              where: { messageId: msgId },
              create: {
                inboxAccountId: inbox.id,
                prospectId: matchedProspect?.id || null,
                draftId: matchedDraft?.id || null,
                fromEmail: fromAddr,
                toEmail: inbox.email,
                subject,
                snippet: bodyClean,
                eventType: 'BOUNCE',
                sentiment: 'Bounce',
                killSwitchTriggered: true,
                messageUid: msg.uid,
                messageId: msgId,
              },
              update: {},
            })
            .catch(() => {});

          pushSdrConsoleLog(
            'IMAP-BOUNCE',
            `Hard Bounce rilevato su ${inbox.email} (${matchedProspect?.companyName || fromAddr}). Inserito in Blacklist protettiva.`,
            'WARN'
          );
          newEvents++;
          continue;
        }

        // REPLY UMANA o OPT-OUT -> KILL-SWITCH ATOMICO!
        const isOptOut = classification === 'Opt_Out';
        if (matchedProspect) {
          await Promise.all([
            sdrPrisma.sdrOutreachDraft.updateMany({
              where: {
                prospectId: matchedProspect.id,
                status: { notIn: ['Inviata', 'Inviata_Dry_Run'] },
              },
              data: { status: 'Annullato_KillSwitch' },
            }),
            sdrPrisma.sdrOutreachDraft.updateMany({
              where: { prospectId: matchedProspect.id, sequenceStep: 1 },
              data: {
                status: isOptOut ? 'Annullato_KillSwitch' : 'Risposta_Ricevuta',
                replyReceivedAt: new Date(),
                replySnippet: bodyClean.slice(0, 400),
              },
            }),
            sdrPrisma.sdrProspect.update({
              where: { id: matchedProspect.id },
              data: {
                pipelineStatus: isOptOut ? 'Opt_Out' : 'Ha_Risposto',
              },
            }),
            isOptOut
              ? sdrPrisma.sdrBlacklist
                  .upsert({
                    where: { emailOrDomain: fromAddr },
                    create: { emailOrDomain: fromAddr, reason: 'Opt-Out su risposta email IMAP' },
                    update: { reason: 'Opt-Out su risposta email IMAP' },
                  })
                  .catch(() => {})
              : Promise.resolve(),
          ]);
        }

        let alertSent = false;
        if (!isOptOut && matchedProspect) {
          const agent = await resolveAgentForProspect(
            matchedProspect.assignedAgentId,
            matchedProspect.assignedAgentCode
          );
          alertSent = await sendBrevoReplyAlertToAgent({
            agent,
            companyName: matchedProspect.companyName,
            city: matchedProspect.city,
            province: matchedProspect.province,
            fromEmail: fromAddr,
            phone: matchedProspect.phone || matchedProspect.whatsappPhone,
            subject,
            snippet: bodyClean,
            sentiment: classification,
          });
        }

        await sdrPrisma.sdrInboxEvent
          .upsert({
            where: { messageId: msgId },
            create: {
              inboxAccountId: inbox.id,
              prospectId: matchedProspect?.id || null,
              draftId: matchedDraft?.id || null,
              fromEmail: fromAddr,
              toEmail: inbox.email,
              subject,
              snippet: bodyClean,
              eventType: isOptOut ? 'OPT_OUT' : 'REPLY',
              sentiment: classification,
              killSwitchTriggered: true,
              agentAlertSent: alertSent,
              messageUid: msg.uid,
              messageId: msgId,
            },
            update: {},
          })
          .catch(() => {});

        pushSdrConsoleLog(
          'KILL-SWITCH',
          `Risposta IMAP su ${inbox.email} da ${matchedProspect?.companyName || fromAddr} -> Sentiment: ${classification}. Kill-Switch attivato!`,
          isOptOut ? 'WARN' : 'SUCCESS'
        );
        newEvents++;
      }
    }

    await client.logout();
    await sdrPrisma.sdrInboxAccount.update({
      where: { id: inbox.id },
      data: {
        lastImapSyncAt: new Date(),
        lastImapUid: highestUid,
      },
    });
    return { checked: true, newEvents };
  } catch (err: any) {
    try {
      client.close();
    } catch {
      // ignore
    }
    log.warn(`Avviso sync IMAP su ${inbox.email}: ${err.message}`, { module: MODULE_NAME });
    return { checked: false, newEvents: 0 };
  }
}

let _imapPollRunning = false;
async function pollAllActiveImapInboxes() {
  if (_imapPollRunning) return { skipped: true };
  _imapPollRunning = true;

  try {
    const inboxes = await sdrPrisma.sdrInboxAccount.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    const CONCURRENCY = 4;
    let totalEvents = 0;
    let checkedCount = 0;

    for (let i = 0; i < inboxes.length; i += CONCURRENCY) {
      const chunk = inboxes.slice(i, i + CONCURRENCY);
      const chunkRes = await Promise.all(chunk.map((mb) => pollSingleArubaInboxImap(mb)));
      for (const r of chunkRes) {
        if (r.checked) checkedCount++;
        totalEvents += r.newEvents;
      }
    }

    return { checkedCount, totalInboxes: inboxes.length, totalEvents };
  } finally {
    _imapPollRunning = false;
  }
}

// ============================================================================
// 6. BULLMQ WORKERS, SCHEDULER PERIODICO IMAP & SERVER HEALTH RAILWAY
// ============================================================================

async function processCopywriterJob(job: Job) {
  const data = job.data || {};
  const action = data.action || job.name;

  if (action === SDR_JOBS.PREPARE_PACKAGE && data.prospectId) {
    return await prepareOutreachPackageForProspect(
      Number(data.prospectId),
      data.agentId,
      data.agentCode
    );
  }

  if (
    (action === SDR_JOBS.PREPARE_BATCH || action === 'PREPARE_OUTREACH') &&
    Array.isArray(data.prospectIds)
  ) {
    const results = [];
    for (const pid of data.prospectIds) {
      try {
        const r = await prepareOutreachPackageForProspect(
          Number(pid),
          data.agentId,
          data.agentCode
        );
        results.push({ success: true, ...r });
      } catch (e: any) {
        results.push({ success: false, prospectId: pid, error: e.message });
      }
    }
    pushSdrConsoleLog(
      'COPYWRITER-WORKER',
      `Completato batch background: ${results.filter((x) => x.success).length}/${results.length} pacchetti B2B generati.`,
      'SUCCESS'
    );
    return { count: results.length, results };
  }

  return { status: 'noop', action };
}

async function processOutreachJob(job: Job) {
  const data = job.data || {};
  const action = data.action || job.name;

  if (
    (action === SDR_JOBS.DISPATCH_SINGLE || action === 'SEND_DRAFT') &&
    data.draftId
  ) {
    return await dispatchSingleOutreachEmail(Number(data.draftId));
  }

  if (
    (action === SDR_JOBS.DISPATCH_BATCH ||
      action === 'DISPATCH_OUTREACH' ||
      action === 'SEND_BATCH') &&
    Array.isArray(data.draftIds)
  ) {
    return await scheduleDispatchBatchWithJitter(data.draftIds);
  }

  if (action === SDR_JOBS.IMAP_POLL_TICK) {
    return await pollAllActiveImapInboxes();
  }

  if (action === SDR_JOBS.DAILY_RESET_QUOTA) {
    await resetDailyInboxQuotasIfNeeded();
    return { resetChecked: true };
  }

  return { status: 'noop', action };
}

function startHealthServerIfConfigured() {
  const port = Number(process.env.PORT || 0);
  if (!port) return;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          service: MODULE_NAME,
          enableGlobalWrites: env.ENABLE_GLOBAL_WRITES,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, '0.0.0.0', () => {
    log.info(`Healthcheck HTTP ${MODULE_NAME} attivo su porta ${port}`, { module: MODULE_NAME });
  });
}

async function startWorker() {
  startHealthServerIfConfigured();
  await seedCombinatorialLibraryInDb({ syncMissing: true }).catch((err) => {
    log.warn(`Seed libreria combinatoria 100x108 differito: ${err?.message || err}`, {
      module: MODULE_NAME,
    });
  });
  await resetDailyInboxQuotasIfNeeded();

  const copywriterConn = createRedisConnection();
  const outreachConn = createRedisConnection();

  const copywriterWorker = new Worker('sdr-copywriter-queue', processCopywriterJob, {
    connection: copywriterConn as any,
    concurrency: 3,
  });

  const outreachWorker = new Worker('sdr-outreach-queue', processOutreachJob, {
    connection: outreachConn as any,
    concurrency: 3,
  });

  copywriterWorker.on('failed', (job, err) => {
    log.error(`[SDR Copywriter] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  outreachWorker.on('failed', (job, err) => {
    log.error(`[SDR Outreach] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  // Schedula ciclo IMAP Kill-Switch ogni 3 minuti e controllo reset quote ogni 30 minuti
  setInterval(() => {
    sdrOutreachQueue
      .add(
        SDR_JOBS.IMAP_POLL_TICK,
        { action: SDR_JOBS.IMAP_POLL_TICK },
        { jobId: `imap-poll-${Math.floor(Date.now() / 180000)}`, removeOnComplete: true }
      )
      .catch(() => {});
  }, 3 * 60 * 1000);

  setInterval(() => {
    resetDailyInboxQuotasIfNeeded().catch(() => {});
  }, 30 * 60 * 1000);

  log.info(
    `🚀 Worker AI-SDR Outreach & IMAP Kill-Switch (Pool 60 Caselle Aruba | ENABLE_GLOBAL_WRITES=${env.ENABLE_GLOBAL_WRITES}) avviato!`,
    { module: MODULE_NAME }
  );
}

startWorker().catch((err) => {
  log.error(`Errore fatale avvio ${MODULE_NAME}: ${err.message}`, { module: MODULE_NAME });
  process.exit(1);
});
