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
  generateConsentReplyEmail,
  generateStep2FollowupEmail,
  generateStep3WarmFollowupEmail,
  applySenderEmailToDraftSignature,
  seedCombinatorialLibraryInDb,
} from '@archelia/sdr-database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import {
  parseRawMimeEmail,
  classifyInboundEmail,
  type ParsedEmailAttachment,
} from './mimeParser';

const MODULE_NAME = 'worker-sdr-outreach';
const DEFAULT_AGENT_ID = 'cmtu64h1c0000jk0sb1ho1o49';
const DEFAULT_AGENT_CODE = '003';
const DEFAULT_AGENT_NAME = 'Daniele Savoia';
const SDR_CONSOLE_REDIS_KEY = 'sdr:console:logs';

const STEP_1_INITIAL = 1;
const STEP_2_FOLLOWUP = 2;
const STEP_3_WARM_FOLLOWUP = 3;
const STEP_1B_CONSENT_REPLY = 10;
const FOLLOWUP_SCHEDULER_ACTION = 'FOLLOWUP_SCHEDULER_TICK';

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
// 1. RISOLUZIONE AGENTE B2B & NOTIFICHE / INOLTRI INTEGRALI BREVO (CON GUARDIA INTERCETTORE)
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

const IS_SDR_LIVE = Boolean(env.ENABLE_SDR_LIVE_OUTREACH || env.ENABLE_GLOBAL_WRITES);
const SDR_INTERCEPT_TO = String(env.SDR_TEST_INTERCEPT_EMAIL || '').trim().toLowerCase();

function resolveSafeBrevoRecipient(targetAgentEmail: string): string {
  const finalRecipient = (SDR_INTERCEPT_TO || targetAgentEmail || '').trim().toLowerCase();
  if (SDR_INTERCEPT_TO && finalRecipient !== SDR_INTERCEPT_TO) {
    throw new Error(
      `BLOCCO SICUREZZA INTERCETTORE BREVO: destinatario ${finalRecipient} diverso da ${SDR_INTERCEPT_TO}`
    );
  }
  return finalRecipient;
}

function escapeHtml(s?: string | null): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Avviso informativo su Brevo a Daniele quando il cliente invia un Consenso Semplice ("Sì grazie")
 * e AI SDR pianifica in automatico la risposta Step 1B tra 15-25 minuti sulla stessa casella Aruba.
 */
async function sendBrevoConsentInfoAlertToAgent(params: {
  agent: ResolvedAgent;
  companyName: string;
  city?: string | null;
  province?: string | null;
  fromEmail: string;
  inboxEmail: string;
  phone?: string | null;
  subject: string;
  fullText: string;
  delayMinutes: number;
  smartOfferUrl: string;
}): Promise<boolean> {
  if (!IS_SDR_LIVE) {
    pushSdrConsoleLog(
      'BREVO-ALERT',
      `[DRY-RUN] Avviso consenso "Sì" per Agente ${params.agent.name} simulato — Prospect: ${params.companyName} (risposta Step 1B tra ${params.delayMinutes} min)`,
      'INFO'
    );
    return false;
  }

  if (!env.BREVO_API_KEY) {
    log.warn('BREVO_API_KEY assente: impossibile inviare avviso consenso a referente B2B', {
      module: MODULE_NAME,
    });
    return false;
  }

  const finalRecipient = resolveSafeBrevoRecipient(params.agent.email);

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
        to: [{ email: finalRecipient, name: params.agent.name }],
        replyTo: { email: params.fromEmail, name: params.companyName },
        subject: `✅ [CONSENSO LISTINO] ${params.companyName} (${params.city || 'IT'}) ha risposto SÌ — Invio offerta automatico tra ${params.delayMinutes} min`,
        tags: ['sdr-imap-consent-alert'],
        textContent: [
          `Ciao ${params.agent.name},`,
          `${params.companyName} (${params.city || ''} ${params.province || ''}) ha risposto affermativamente alla tua presentazione su ${params.inboxEmail}.`,
          `AI SDR invierà automaticamente il collegamento riservato (${params.smartOfferUrl}) tra circa ${params.delayMinutes} minuti dalla stessa casella ${params.inboxEmail}.`,
          ``,
          `--- TESTO INTEGRALE DEL CLIENTE ---`,
          params.fullText,
        ].join('\n'),
        htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
          <h2 style="color: #15803d; margin-bottom: 6px;">✅ Consenso Ricevuto — Invio Offerta Pianificato (${params.delayMinutes} min)</h2>
          <p>Ciao <strong>${escapeHtml(params.agent.name)}</strong>, <strong>${escapeHtml(params.companyName)}</strong> ha risposto positivamente alla prima email. Il sistema risponderà in automatico dalla stessa casella <code>${escapeHtml(params.inboxEmail)}</code> tra <strong>${params.delayMinutes} minuti</strong> inviando il link all'offerta e al Catalistino PDF riservato.</p>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <div><strong>Azienda:</strong> ${escapeHtml(params.companyName)} (${escapeHtml(params.city)} ${escapeHtml(params.province)})</div>
            <div><strong>Email Cliente:</strong> <a href="mailto:${escapeHtml(params.fromEmail)}">${escapeHtml(params.fromEmail)}</a></div>
            <div><strong>Casella Aruba:</strong> ${escapeHtml(params.inboxEmail)}</div>
            <div><strong>Telefono / WhatsApp:</strong> ${escapeHtml(params.phone || 'N/D')}</div>
            <div><strong>Pagina Offerta Riservata:</strong> <a href="${escapeHtml(params.smartOfferUrl)}">${escapeHtml(params.smartOfferUrl)}</a></div>
            <div><strong>Oggetto:</strong> ${escapeHtml(params.subject)}</div>
          </div>
          <div style="background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 14px; font-size: 13px; white-space: pre-wrap;">${escapeHtml(params.fullText)}</div>
          <p style="font-size: 12px; color: #64748b; margin-top: 12px;">Il prospect è già visibile tra i <strong>Lead Caldi da Gestire</strong> sul Portale B2B. Se desideri rispondergli direttamente tu, il Reply-To di questa mail punta già a ${escapeHtml(params.fromEmail)}.</p>
        </div>`,
      }),
    });
    return resp.ok;
  } catch (err: any) {
    log.error(`Errore Brevo Consent Alert IMAP: ${err.message}`, { module: MODULE_NAME });
    return false;
  }
}

/**
 * Inoltro IMMEDIATO e INTEGRALE (senza alcun taglio a 600 caratteri + tutti gli allegati MIME in Base64)
 * via Brevo API a Daniele quando un cliente pone una domanda specifica o allega distinte/documenti.
 */
async function sendBrevoFullForwardToAgent(params: {
  agent: ResolvedAgent;
  companyName: string;
  city?: string | null;
  province?: string | null;
  fromEmail: string;
  inboxEmail: string;
  phone?: string | null;
  subject: string;
  fullText: string;
  sentiment: string;
  attachments: ParsedEmailAttachment[];
  oversizedAttachmentsSkipped?: string[];
}): Promise<boolean> {
  if (!IS_SDR_LIVE) {
    pushSdrConsoleLog(
      'BREVO-FORWARD',
      `[DRY-RUN] Inoltro integrale risposta IMAP per Agente ${params.agent.name} simulato — Prospect: ${params.companyName} (${params.sentiment}, allegati: ${params.attachments.length})`,
      'INFO'
    );
    return false;
  }

  if (!env.BREVO_API_KEY) {
    log.warn('BREVO_API_KEY assente: impossibile inoltrare risposta integrale a referente B2B', {
      module: MODULE_NAME,
    });
    return false;
  }

  const finalRecipient = resolveSafeBrevoRecipient(params.agent.email);
  const fullBodyUntruncated = params.fullText || '(Messaggio privo di corpo testuale — controlla gli allegati)';

  const attachmentsListHtml =
    params.attachments.length > 0
      ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
           <strong>📎 Allegati inoltrati (${params.attachments.length}):</strong>
           <ul style="margin: 6px 0 0 18px; padding: 0;">
             ${params.attachments
               .map(
                 (a) =>
                   `<li>${escapeHtml(a.name)} <span style="color:#64748b;">(${Math.max(
                     1,
                     Math.round(a.sizeBytes / 1024)
                   )} KB)</span></li>`
               )
               .join('')}
           </ul>
         </div>`
      : '';

  const oversizedNoteHtml =
    params.oversizedAttachmentsSkipped && params.oversizedAttachmentsSkipped.length > 0
      ? `<p style="color: #b45309; font-size: 12px; margin-top: 8px;">⚠️ Allegati oltre i 18MB rimasti nella casella Aruba ${escapeHtml(
          params.inboxEmail
        )}: ${escapeHtml(params.oversizedAttachmentsSkipped.join(', '))}</p>`
      : '';

  const brevoPayload: Record<string, any> = {
    sender: {
      name: env.BREVO_SENDER_NAME || 'Izzo Distribuzione AI SDR',
      email: env.BREVO_SENDER_EMAIL || 'noreply@izzodistribuzione.it',
    },
    to: [{ email: finalRecipient, name: params.agent.name }],
    replyTo: { email: params.fromEmail, name: params.companyName },
    subject: `🔥 [RISPOSTA LEAD B2B${params.attachments.length > 0 ? ` + ${params.attachments.length} ALLEGATI` : ''}] ${params.companyName} (${params.city || 'IT'}) — ${params.subject}`,
    tags: ['sdr-imap-reply-forward'],
    textContent: [
      `Ciao ${params.agent.name},`,
      `Nuova risposta diretta intercettata su ${params.inboxEmail}. Il Kill-Switch Atomico ha fermato tutti gli invii automatici e ti passa subito la conversazione.`,
      `Azienda: ${params.companyName} (${params.city || ''} ${params.province || ''})`,
      `Email Cliente (Reply-To): ${params.fromEmail}`,
      `Telefono: ${params.phone || 'N/D'}`,
      `Allegati inclusi: ${params.attachments.length}`,
      ``,
      `================ TESTO INTEGRALE DEL CLIENTE ================`,
      fullBodyUntruncated,
    ].join('\n'),
    htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 680px;">
      <h2 style="color: #15803d; margin-bottom: 6px;">💬 Risposta Cliente B2B — Conversazione Passata a Te!</h2>
      <p>Ciao <strong>${escapeHtml(params.agent.name)}</strong>, il Kill-Switch Atomico ha fermato ogni follow-up automatico per questo prospect e ti inoltra qui sotto il <strong>messaggio integrale${params.attachments.length > 0 ? ' completo di allegati' : ''}</strong>:</p>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px; margin: 16px 0;">
        <div><strong>Azienda:</strong> ${escapeHtml(params.companyName)} (${escapeHtml(params.city)} ${escapeHtml(params.province)})</div>
        <div><strong>Email Cliente:</strong> <a href="mailto:${escapeHtml(params.fromEmail)}">${escapeHtml(params.fromEmail)}</a></div>
        <div><strong>Casella Aruba Ricevente:</strong> ${escapeHtml(params.inboxEmail)}</div>
        <div><strong>Telefono / WhatsApp:</strong> ${escapeHtml(params.phone || 'N/D')}</div>
        <div><strong>Classificazione:</strong> <strong>${escapeHtml(params.sentiment)}</strong></div>
        <div><strong>Oggetto Originale:</strong> ${escapeHtml(params.subject)}</div>
        ${attachmentsListHtml}
        ${oversizedNoteHtml}
      </div>
      <div style="background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 16px; font-size: 13.5px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(fullBodyUntruncated)}</div>
      <p style="font-size: 12px; color: #64748b; margin-top: 12px;">Puoi cliccare direttamente <strong>Rispondi</strong> nel tuo client email: il campo Reply-To è già impostato sull'indirizzo del cliente (<code>${escapeHtml(params.fromEmail)}</code>).</p>
    </div>`,
  };

  if (params.attachments.length > 0) {
    brevoPayload.attachment = params.attachments.map((att) => ({
      name: att.name,
      content: att.content,
    }));
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify(brevoPayload),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      log.warn(`Brevo forward HTTP ${resp.status}: ${errText.slice(0, 300)}`, {
        module: MODULE_NAME,
      });
    }
    return resp.ok;
  } catch (err: any) {
    log.error(`Errore Brevo inoltro integrale IMAP: ${err.message}`, { module: MODULE_NAME });
    return false;
  }
}

// ============================================================================
// 2. HELPER USERNAME, PASSWORD, MILLIONVERIFIER, DNS MX, TIME-FENCING & JITTER
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

function prospectHasPhoneOrWhatsapp(prospect: {
  phone?: string | null;
  whatsappPhone?: string | null;
}): boolean {
  return Boolean(
    (prospect.phone && prospect.phone.trim().length >= 5) ||
      (prospect.whatsappPhone && prospect.whatsappPhone.trim().length >= 5)
  );
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

/**
 * Verifica Automatica Pre-Invio MillionVerifier ("man mano che invii"):
 * - Se `emailVerifyStatus === 'VALID'`, procede senza consumare ulteriori crediti.
 * - Se `emailVerifyStatus === 'INVALID'`, blocca subito prima di Aruba e sposta in `Senza_Email` se ha telefono.
 * - Se `emailVerifyStatus === 'CATCH_ALL'`, procede senza consumare altri crediti ma applicando il limite max 1/giorno per casella.
 * - Se non ancora verificato: interroga MillionVerifier v3 se l'API Key è configurata, altrimenti fallback DNS MX.
 */
async function verifyProspectEmailBeforeSend(params: {
  prospect: {
    id: number;
    companyName: string;
    ordinaryEmail: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    emailVerifyStatus: string | null;
    emailVerifiedAt: Date | null;
    promoProspectId: string | null;
  };
  draftId: number;
  recipientEmail: string;
  config: {
    enableMillionVerifier?: boolean | null;
    millionVerifierApiKey?: string | null;
  } | null;
}): Promise<{
  allowed: boolean;
  isCatchAll: boolean;
  mxHost?: string;
  reason?: string;
}> {
  const { prospect, draftId, recipientEmail, config } = params;
  const currentStatus = (prospect.emailVerifyStatus || '').trim().toUpperCase();
  const hasPhone = prospectHasPhoneOrWhatsapp(prospect);
  const domain = recipientEmail.split('@')[1] || '';

  const blockInvalidProspect = async (reasonLabel: string, provider: string, blacklistDomain = false) => {
    await Promise.all([
      sdrPrisma.sdrProspect.update({
        where: { id: prospect.id },
        data: {
          emailVerifyStatus: 'INVALID',
          emailVerifiedAt: prospect.emailVerifiedAt || new Date(),
          emailVerifyProvider: provider,
          pipelineStatus: 'Bounce_Invalido',
          autoFollowupPaused: true,
          ...(hasPhone ? { section: 'Senza_Email' } : {}),
        },
      }),
      sdrPrisma.sdrOutreachDraft.updateMany({
        where: {
          prospectId: prospect.id,
          status: { notIn: ['Inviata', 'Inviata_Dry_Run'] },
        },
        data: { status: 'Annullato_KillSwitch' },
      }),
      prospect.promoProspectId
        ? b2bPrisma.b2BPromoProspect
            .update({
              where: { id: prospect.promoProspectId },
              data: { autoFollowupPaused: true },
            })
            .catch(() => {})
        : Promise.resolve(),
      blacklistDomain && domain
        ? sdrPrisma.sdrBlacklist
            .upsert({
              where: { emailOrDomain: domain },
              create: { emailOrDomain: domain, reason: reasonLabel },
              update: { reason: reasonLabel },
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);

    pushSdrConsoleLog(
      'EMAIL-VERIFY',
      `Bloccato invio PRIMA di Aruba per ${recipientEmail} (${prospect.companyName}): ${reasonLabel}${
        hasPhone ? ' -> Spostato in "Solo Telefono / WhatsApp" (Senza_Email)!' : '.'
      }`,
      'WARN'
    );
  };

  if (currentStatus === 'VALID') {
    return { allowed: true, isCatchAll: false, mxHost: 'email-verify-cached-valid' };
  }

  if (currentStatus === 'INVALID') {
    await blockInvalidProspect('Email già marcata INVALID', 'cached-invalid');
    return { allowed: false, isCatchAll: false, reason: 'Email prospect già marcata INVALID' };
  }

  if (currentStatus === 'CATCH_ALL') {
    return { allowed: true, isCatchAll: true, mxHost: 'email-verify-cached-catchall' };
  }

  const storedMvKey = config?.millionVerifierApiKey
    ? decryptSdrSecret(config.millionVerifierApiKey)
    : '';
  const mvApiKey = (
    process.env.EMAIL_VALIDATION_API_KEY ||
    process.env.MILLIONVERIFIER_API_KEY ||
    storedMvKey ||
    ''
  ).trim();
  const mvEnabled = config?.enableMillionVerifier !== false;

  if (mvEnabled && mvApiKey) {
    const isEmailValidationOrgKey =
      mvApiKey.startsWith('ev_live_') || mvApiKey.startsWith('ev_test_');

    if (isEmailValidationOrgKey) {
      // Provider primario: email-validation.org (EU GDPR Data Residency `api-eu` + fallback `api`)
      const endpoints = [
        'https://api-eu.email-validation.org/v1/validate',
        'https://api.email-validation.org/v1/validate',
      ];

      for (const endpoint of endpoints) {
        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              Authorization: `Bearer ${mvApiKey}`,
            },
            body: JSON.stringify({ email: recipientEmail }),
            signal: AbortSignal.timeout(15000),
          });

          if (!resp.ok) {
            if (resp.status >= 500 && endpoint === endpoints[0]) {
              continue; // Tenta fallback globale su errore 5xx EU
            }
            log.warn(
              `email-validation.org HTTP ${resp.status} su bozza #${draftId}: attivo fallback DNS MX`,
              { module: MODULE_NAME }
            );
            break;
          }

          const evData = (await resp.json()) as {
            status?: string;
            reason?: string;
            action?: string;
            disposable?: boolean;
            mx_record?: string | null;
            error?: { code?: string; message?: string } | string;
          };

          const evStatus = String(evData?.status || '').trim().toLowerCase();
          const evAction = String(evData?.action || '').trim().toLowerCase();
          const evReason = String(evData?.reason || '').trim();

          if (!evData?.error && evStatus) {
            const now = new Date();

            if (evStatus === 'valid' && evData.disposable !== true && evAction !== 'remove') {
              await sdrPrisma.sdrProspect.update({
                where: { id: prospect.id },
                data: {
                  emailVerifyStatus: 'VALID',
                  emailVerifiedAt: now,
                  emailVerifyProvider: 'email-validation.org',
                },
              });
              pushSdrConsoleLog(
                'EMAIL-VALIDATION',
                `🟢 Email VALID verificata su email-validation.org per ${prospect.companyName} (${recipientEmail}). Procedo con l'invio.`,
                'SUCCESS'
              );
              return {
                allowed: true,
                isCatchAll: false,
                mxHost: evData.mx_record || 'email-validation-eu-valid',
              };
            }

            if (
              evStatus === 'invalid' ||
              evStatus === 'disposable' ||
              evData.disposable === true ||
              evAction === 'remove'
            ) {
              const detail = `${evStatus}${evReason ? ` (${evReason})` : ''}`;
              await sdrPrisma.sdrBlacklist
                .upsert({
                  where: { emailOrDomain: recipientEmail },
                  create: {
                    emailOrDomain: recipientEmail,
                    reason: `email-validation.org pre-send: ${detail}`,
                  },
                  update: { reason: `email-validation.org pre-send: ${detail}` },
                })
                .catch(() => {});

              await blockInvalidProspect(
                `email-validation.org: ${detail}`,
                'email-validation.org',
                false
              );
              return {
                allowed: false,
                isCatchAll: false,
                reason: `email-validation.org ha classificato l'email come ${detail}`,
              };
            }

            if (evStatus === 'catch_all' || evStatus === 'unknown') {
              await sdrPrisma.sdrProspect.update({
                where: { id: prospect.id },
                data: {
                  emailVerifyStatus: 'CATCH_ALL',
                  emailVerifiedAt: now,
                  emailVerifyProvider: 'email-validation.org',
                },
              });
              pushSdrConsoleLog(
                'EMAIL-VALIDATION',
                `🟡 Email ${evStatus.toUpperCase()} per ${prospect.companyName} (${recipientEmail}) -> applicata soglia prudenziale max 1 CATCH_ALL/giorno per casella.`,
                'INFO'
              );
              return {
                allowed: true,
                isCatchAll: true,
                mxHost: evData.mx_record || `email-validation-${evStatus}`,
              };
            }
          }

          log.warn(
            `email-validation.org risposta anomala su bozza #${draftId}: attivo fallback DNS MX`,
            { module: MODULE_NAME }
          );
          break;
        } catch (evErr: any) {
          if (endpoint === endpoints[0]) continue;
          log.warn(
            `Timeout/errore rete email-validation.org (${evErr.message}): attivo fallback DNS MX`,
            { module: MODULE_NAME }
          );
        }
      }
    } else {
      // Provider classico MillionVerifier (`api.millionverifier.com`)
      try {
        const mvUrl = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(
          mvApiKey
        )}&email=${encodeURIComponent(recipientEmail)}&timeout=10`;

        const resp = await fetch(mvUrl, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });

        if (resp.ok) {
          const mvData = (await resp.json()) as {
            result?: string;
            error?: string;
            subresult?: string;
          };
          const mvResult = String(mvData?.result || '').trim().toLowerCase();

          if (!mvData?.error && mvResult && mvResult !== 'error') {
            const now = new Date();

            if (mvResult === 'ok') {
              await sdrPrisma.sdrProspect.update({
                where: { id: prospect.id },
                data: {
                  emailVerifyStatus: 'VALID',
                  emailVerifiedAt: now,
                  emailVerifyProvider: 'millionverifier',
                },
              });
              pushSdrConsoleLog(
                'MILLIONVERIFIER',
                `🟢 Email VALID verificata per ${prospect.companyName} (${recipientEmail}). Procedo con l'invio.`,
                'SUCCESS'
              );
              return { allowed: true, isCatchAll: false, mxHost: 'millionverifier-ok' };
            }

            if (mvResult === 'invalid' || mvResult === 'disposable') {
              await sdrPrisma.sdrBlacklist
                .upsert({
                  where: { emailOrDomain: recipientEmail },
                  create: {
                    emailOrDomain: recipientEmail,
                    reason: `MillionVerifier pre-send: ${mvResult}`,
                  },
                  update: { reason: `MillionVerifier pre-send: ${mvResult}` },
                })
                .catch(() => {});

              await blockInvalidProspect(`MillionVerifier: ${mvResult}`, 'millionverifier', false);
              return {
                allowed: false,
                isCatchAll: false,
                reason: `MillionVerifier ha classificato l'email come ${mvResult}`,
              };
            }

            if (mvResult === 'catch_all' || mvResult === 'unknown') {
              await sdrPrisma.sdrProspect.update({
                where: { id: prospect.id },
                data: {
                  emailVerifyStatus: 'CATCH_ALL',
                  emailVerifiedAt: now,
                  emailVerifyProvider: 'millionverifier',
                },
              });
              pushSdrConsoleLog(
                'MILLIONVERIFIER',
                `🟡 Email ${mvResult.toUpperCase()} per ${prospect.companyName} (${recipientEmail}) -> applicata soglia prudenziale max 1 CATCH_ALL/giorno per casella.`,
                'INFO'
              );
              return { allowed: true, isCatchAll: true, mxHost: `millionverifier-${mvResult}` };
            }
          } else {
            log.warn(
              `MillionVerifier risposta anomala su bozza #${draftId} (${mvData?.error || mvResult}): attivo fallback DNS MX`,
              { module: MODULE_NAME }
            );
          }
        } else {
          log.warn(`MillionVerifier HTTP ${resp.status} su bozza #${draftId}: attivo fallback DNS MX`, {
            module: MODULE_NAME,
          });
        }
      } catch (mvErr: any) {
        log.warn(`Timeout/errore rete MillionVerifier (${mvErr.message}): attivo fallback DNS MX`, {
          module: MODULE_NAME,
        });
      }
    }
  } else {
    const noticeLock = await redisClient
      .set('sdr:mv:missing-key-notice', '1', 'EX', 600, 'NX')
      .catch(() => 'OK');
    if (noticeLock === 'OK') {
      pushSdrConsoleLog(
        'EMAIL-VERIFY',
        !mvEnabled
          ? 'Verifica Email API disattivata da configurazione: eseguo verifica DNS MX gratuita.'
          : 'Verifica Email API pronta in standby (API Key non ancora inserita): eseguo verifica DNS MX e si attiverà automaticamente appena inserita la chiave.',
        'INFO'
      );
    }
  }

  // Controllo DNS MX di protezione reputazione 6 domini Aruba
  const mxCheck = await verifyRecipientDomainMx(recipientEmail);
  if (!mxCheck.valid) {
    await blockInvalidProspect('Pre-Send DNS MX assente/invalido', 'dns-mx', true);
    return { allowed: false, isCatchAll: false, reason: 'Dominio destinatario privo di record MX' };
  }

  return { allowed: true, isCatchAll: false, mxHost: mxCheck.mxHost };
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
 * Restituisce 0 se `referenceDate` cade dentro la finestra lavorativa Lun-Ven (Europe/Rome),
 * oppure i millisecondi mancanti alla prossima apertura utile.
 */
function computeTimeFencingDelayMs(
  config: {
    timeFencingEnabled?: boolean;
    morningWindow?: string | null;
    afternoonWindow?: string | null;
  },
  referenceDate = new Date()
): number {
  if (config.timeFencingEnabled === false) return 0;

  const { weekday, minutesOfDay } = getRomeDateParts(referenceDate);
  const [mStart, mEnd] = parseWindowMinutes(config.morningWindow || '08:30-12:30', 510, 750);
  const [aStart, aEnd] = parseWindowMinutes(config.afternoonWindow || '14:00-17:30', 840, 1050);

  if (weekday === 6) {
    const minsUntilMonday = 24 * 60 - minutesOfDay + 24 * 60 + mStart;
    return minsUntilMonday * 60 * 1000;
  }
  if (weekday === 0) {
    const minsUntilMonday = 24 * 60 - minutesOfDay + mStart;
    return minsUntilMonday * 60 * 1000;
  }

  if (
    (minutesOfDay >= mStart && minutesOfDay < mEnd) ||
    (minutesOfDay >= aStart && minutesOfDay < aEnd)
  ) {
    return 0;
  }

  if (minutesOfDay < mStart) {
    return (mStart - minutesOfDay) * 60 * 1000;
  }

  if (minutesOfDay >= mEnd && minutesOfDay < aStart) {
    return (aStart - minutesOfDay) * 60 * 1000;
  }

  const extraDays = weekday === 5 ? 2 : 0;
  const minsUntilNextMorning = 24 * 60 - minutesOfDay + extraDays * 24 * 60 + mStart;
  return minsUntilNextMorning * 60 * 1000;
}

function computeDelayUntilNextBusinessDayMorningMs(config: {
  morningWindow?: string | null;
}): number {
  const { weekday, minutesOfDay } = getRomeDateParts();
  const [mStart] = parseWindowMinutes(config.morningWindow || '08:30-12:30', 510, 750);
  let extraDays = 0;
  if (weekday === 5) extraDays = 2; // Venerdì -> Lunedì
  else if (weekday === 6) extraDays = 1; // Sabato -> Lunedì
  const mins = 24 * 60 - minutesOfDay + extraDays * 24 * 60 + mStart;
  return Math.max(3600 * 1000, mins * 60 * 1000);
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

async function getInboxIdsWithCatchAllSentToday(dateKey: string): Promise<Set<number>> {
  const busySet = new Set<number>();
  const dayStartUtc = new Date(`${dateKey}T00:00:00.000Z`);

  const sentCatchAllDrafts = await sdrPrisma.sdrOutreachDraft
    .findMany({
      where: {
        sentAt: { gte: dayStartUtc },
        senderInboxId: { not: null },
        prospect: { emailVerifyStatus: 'CATCH_ALL' },
      },
      select: { senderInboxId: true },
    })
    .catch(() => []);

  for (const row of sentCatchAllDrafts) {
    if (row.senderInboxId) busySet.add(row.senderInboxId);
  }
  return busySet;
}

async function hasInboxSentCatchAllToday(inboxId: number, dateKey: string): Promise<boolean> {
  const redisKey = `sdr:catchall:${dateKey}:inbox:${inboxId}`;
  const cached = await redisClient.get(redisKey).catch(() => null);
  if (cached) return true;
  const dbSet = await getInboxIdsWithCatchAllSentToday(dateKey);
  return dbSet.has(inboxId);
}

async function markInboxSentCatchAllToday(inboxId: number, dateKey: string): Promise<void> {
  const redisKey = `sdr:catchall:${dateKey}:inbox:${inboxId}`;
  await redisClient.set(redisKey, '1', 'EX', 172800).catch(() => {});
}

// ============================================================================
// 3. PREPARAZIONE PACCHETTO OUTREACH (CREDENZIALI + REGOLA ALL_2GG + STEP 1 ANTI-SPAM)
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

  const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
    where: { prospectId: prospect.id, sequenceStep: STEP_1_INITIAL },
  });
  const trackingToken = existingDraft?.trackingToken || generateTrackingToken();
  const smartUrls = buildSmartOfferUrls(trackingToken);

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
        smartOfferToken: trackingToken,
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
        smartOfferToken: trackingToken,
      },
    });
  } else if (promo.smartOfferToken !== trackingToken) {
    promo = await b2bPrisma.b2BPromoProspect.update({
      where: { id: promo.id },
      data: { smartOfferToken: trackingToken },
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
        smartOfferToken: trackingToken,
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

  let pinnedSenderEmail: string | null = null;
  if (existingDraft?.senderInboxId) {
    const pinnedMb = await sdrPrisma.sdrInboxAccount
      .findUnique({ where: { id: existingDraft.senderInboxId }, select: { email: true } })
      .catch(() => null);
    pinnedSenderEmail = pinnedMb?.email || null;
  }

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
    senderInboxEmail: pinnedSenderEmail,
    sequenceStep: STEP_1_INITIAL,
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
          assignedAgentName: resolvedAgent.name,
          status: 'Bozza_Pronta',
        },
      })
    : await sdrPrisma.sdrOutreachDraft.create({
        data: {
          prospectId: prospect.id,
          sequenceStep: STEP_1_INITIAL,
          subject: tailored.subject,
          bodyText: tailored.bodyText,
          bodyHtml: tailored.bodyHtml,
          templateCode: tailored.templateCode,
          attachedCatalogUrl: attachCatalogPdf ? smartUrls.apiPdfDownloadUrl : null,
          trackingToken,
          assignedAgentId: resolvedAgent.id,
          assignedAgentCode: resolvedAgent.code,
          assignedAgentName: resolvedAgent.name,
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
// 4. SELEZIONE CASELLA POOL 60 ARUBA (COERENZA CASELLA + MAX 1 CATCH-ALL/G) & SMTP
// ============================================================================

async function selectAvailableArubaMailbox(options?: {
  preferredInboxId?: number | null;
  isCatchAll?: boolean;
  isConsentReply?: boolean;
  speedProfile?: string | null;
}) {
  await resetDailyInboxQuotasIfNeeded();
  const { dateKey } = getRomeDateParts();

  const accounts = await sdrPrisma.sdrInboxAccount.findMany({
    where: { isActive: true },
  });

  const catchAllBusySet = options?.isCatchAll
    ? await getInboxIdsWithCatchAllSentToday(dateKey)
    : new Set<number>();

  // Se il cliente è già assegnato a una specifica casella Aruba (Step 1B / Step 2 / Step 3), manteniamo SEMPRE la stessa casella!
  if (options?.preferredInboxId) {
    const pinnedAcc = accounts.find((a) => a.id === options.preferredInboxId);
    if (pinnedAcc) {
      const ramp = computeEffectiveInboxDailyLimit(pinnedAcc, options.speedProfile);
      // Per risposte dirette a un consenso "Sì" (Step 1B) consentiamo l'invio sulla casella conversazionale anche se ha toccato la soglia fredda
      if (!options.isConsentReply && pinnedAcc.sentToday >= ramp.effectiveDailyLimit) {
        return {
          selected: null,
          rescheduleReason: 'PINNED_INBOX_QUOTA_REACHED' as const,
        };
      }
      if (
        options.isCatchAll &&
        !options.isConsentReply &&
        (catchAllBusySet.has(pinnedAcc.id) || (await hasInboxSentCatchAllToday(pinnedAcc.id, dateKey)))
      ) {
        return {
          selected: null,
          rescheduleReason: 'CATCH_ALL_DAILY_LIMIT_REACHED' as const,
        };
      }
      return {
        selected: {
          acc: pinnedAcc,
          effectiveLimit: ramp.effectiveDailyLimit,
          warmupWeek: ramp.warmupWeek,
          ratio: pinnedAcc.sentToday / Math.max(1, ramp.effectiveDailyLimit),
        },
        rescheduleReason: null,
      };
    }
  }

  const withQuota = accounts
    .map((acc) => {
      const ramp = computeEffectiveInboxDailyLimit(acc, options?.speedProfile);
      return {
        acc,
        effectiveLimit: ramp.effectiveDailyLimit,
        warmupWeek: ramp.warmupWeek,
        ratio: acc.sentToday / Math.max(1, ramp.effectiveDailyLimit),
      };
    })
    .filter((c) => c.acc.sentToday < c.effectiveLimit);

  if (withQuota.length === 0) {
    return { selected: null, rescheduleReason: 'DAILY_POOL_QUOTA_REACHED' as const };
  }

  let eligible = withQuota;
  if (options?.isCatchAll) {
    const filtered: typeof withQuota = [];
    for (const cand of withQuota) {
      if (catchAllBusySet.has(cand.acc.id)) continue;
      if (await hasInboxSentCatchAllToday(cand.acc.id, dateKey)) continue;
      filtered.push(cand);
    }
    eligible = filtered;
    if (eligible.length === 0) {
      return { selected: null, rescheduleReason: 'CATCH_ALL_DAILY_LIMIT_REACHED' as const };
    }
  }

  eligible.sort((a, b) => {
    if (Math.abs(a.ratio - b.ratio) > 0.01) return a.ratio - b.ratio;
    const tA = a.acc.lastSentAt ? a.acc.lastSentAt.getTime() : 0;
    const tB = b.acc.lastSentAt ? b.acc.lastSentAt.getTime() : 0;
    return tA - tB;
  });

  return { selected: eligible[0] || null, rescheduleReason: null };
}

async function resolveConversationHeadersAndInboxForDraft(draft: {
  id: number;
  prospectId: number;
  sequenceStep: number;
  senderInboxId: number | null;
}) {
  const priorSentDrafts = await sdrPrisma.sdrOutreachDraft.findMany({
    where: {
      prospectId: draft.prospectId,
      id: { not: draft.id },
      status: { in: ['Inviata', 'Inviata_Dry_Run', 'Risposta_Ricevuta'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      sequenceStep: true,
      senderInboxId: true,
      messageIdHeader: true,
    },
  });

  const pinnedInboxId =
    draft.senderInboxId ||
    priorSentDrafts.find((d) => d.sequenceStep === STEP_1_INITIAL && d.senderInboxId)?.senderInboxId ||
    priorSentDrafts.find((d) => d.senderInboxId)?.senderInboxId ||
    null;

  if (draft.sequenceStep === STEP_1_INITIAL) {
    return { pinnedInboxId, inReplyTo: undefined, references: undefined };
  }

  const sentMsgIds = priorSentDrafts
    .map((d) => (d.messageIdHeader || '').trim())
    .filter(Boolean);

  if (draft.sequenceStep === STEP_1B_CONSENT_REPLY) {
    const latestInboundReply = await sdrPrisma.sdrInboxEvent.findFirst({
      where: {
        prospectId: draft.prospectId,
        eventType: 'REPLY',
      },
      orderBy: { createdAt: 'desc' },
      select: { messageId: true },
    });
    const inboundId =
      latestInboundReply?.messageId && latestInboundReply.messageId.startsWith('<')
        ? latestInboundReply.messageId
        : null;
    const inReplyTo = inboundId || sentMsgIds[0] || undefined;
    const references = Array.from(new Set([...sentMsgIds, ...(inboundId ? [inboundId] : [])]));
    return {
      pinnedInboxId,
      inReplyTo,
      references: references.length > 0 ? references.join(' ') : undefined,
    };
  }

  // Step 2 (+5gg) o Step 3 (+5gg Caldi): In-Reply-To sul primo messaggio (o ultimo inviato)
  const step1MsgId =
    priorSentDrafts.find((d) => d.sequenceStep === STEP_1_INITIAL)?.messageIdHeader ||
    sentMsgIds[0] ||
    undefined;

  return {
    pinnedInboxId,
    inReplyTo: step1MsgId || undefined,
    references: sentMsgIds.length > 0 ? sentMsgIds.join(' ') : undefined,
  };
}

async function dispatchSingleOutreachEmail(
  draftId: number,
  dispatchOpts?: {
    preferredInboxId?: number | null;
    inReplyTo?: string | null;
    references?: string[] | string | null;
  }
) {
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

  const isConsentReply =
    draft.sequenceStep === STEP_1B_CONSENT_REPLY ||
    String(draft.templateCode || '').toUpperCase().startsWith('STEP1B_');

  // Rispetto assoluto di Kill-Switch / Template Disarmati / Già Inviata
  if (
    draft.status === 'Annullato_KillSwitch' ||
    draft.status === 'Template_Da_Attivare' ||
    draft.status === 'Risposta_Ricevuta' ||
    draft.status === 'Inviata' ||
    draft.status === 'Inviata_Dry_Run'
  ) {
    return { skipped: true, reason: `Stato bozza: ${draft.status}` };
  }

  if (
    draft.prospect.pipelineStatus === 'Opt_Out' ||
    draft.prospect.pipelineStatus === 'Bounce_Invalido' ||
    (!isConsentReply && draft.prospect.pipelineStatus === 'Ha_Risposto')
  ) {
    return { skipped: true, reason: `Pipeline prospect: ${draft.prospect.pipelineStatus}` };
  }

  // Controllo incrociato su b2b_promo_prospects per blocco chiamata Daniele / pausa follow-up automatici
  const promoState = draft.prospect.promoProspectId
    ? await b2bPrisma.b2BPromoProspect
        .findUnique({
          where: { id: draft.prospect.promoProspectId },
          select: {
            autoFollowupPaused: true,
            agentContactedAt: true,
            convertedToUserId: true,
            firstOrderId: true,
          },
        })
        .catch(() => null)
    : null;

  if (draft.prospect.autoFollowupPaused || promoState?.autoFollowupPaused) {
    await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: { status: 'Annullato_KillSwitch' },
    });
    return { skipped: true, reason: 'Follow-up automatici messi in pausa (Kill-Switch / Agente)' };
  }

  if (
    draft.sequenceStep >= STEP_2_FOLLOWUP &&
    draft.sequenceStep !== STEP_1B_CONSENT_REPLY &&
    (draft.prospect.agentContactedAt ||
      promoState?.agentContactedAt ||
      promoState?.convertedToUserId ||
      promoState?.firstOrderId)
  ) {
    await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: { status: 'Annullato_KillSwitch' },
    });
    return { skipped: true, reason: 'Prospect già contattato da Daniele o convertito con ordine' };
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
    throw new Error(
      `Safety Guard: Draft #${draftId} bloccata per placeholder non risolti o credenziali mancanti.`
    );
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

  // 1. Verifica Automatica Pre-Invio MillionVerifier ("man mano che invii") + fallback DNS MX
  const verifyOutcome = await verifyProspectEmailBeforeSend({
    prospect: draft.prospect,
    draftId: draft.id,
    recipientEmail,
    config,
  });

  if (!verifyOutcome.allowed) {
    return { skipped: true, reason: verifyOutcome.reason || 'Email non valida pre-send' };
  }

  // Risolvi eventuale casella Aruba fissata per il cliente + header In-Reply-To / References
  const threadCtx = await resolveConversationHeadersAndInboxForDraft(draft);
  const effectivePreferredInboxId =
    dispatchOpts?.preferredInboxId || threadCtx.pinnedInboxId || null;

  const mailboxResult = await selectAvailableArubaMailbox({
    preferredInboxId: effectivePreferredInboxId,
    isCatchAll: verifyOutcome.isCatchAll,
    isConsentReply,
    speedProfile: config?.speedProfile,
  });

  const selected = mailboxResult.selected;

  // MODALITÀ DRY-RUN SE ENABLE_SDR_LIVE_OUTREACH === false
  if (!IS_SDR_LIVE) {
    const senderLabel = selected ? selected.acc.email : 'pool-aruba-dryrun@izzodistribuzioneb2b.it';
    const alignedDry = applySenderEmailToDraftSignature(
      draft.bodyText,
      draft.bodyHtml,
      senderLabel
    );

    pushSdrConsoleLog(
      'DRY-RUN-SMTP',
      `[DRY-RUN] Da: ${senderLabel} -> A: ${recipientEmail} (${draft.prospect.companyName}) | Step: ${draft.sequenceStep} | Verify: ${verifyOutcome.mxHost} | Oggetto: "${draft.subject}"`,
      'SUCCESS'
    );

    await Promise.all([
      sdrPrisma.sdrOutreachDraft.update({
        where: { id: draft.id },
        data: {
          status: 'Inviata_Dry_Run',
          bodyText: alignedDry.bodyText,
          bodyHtml: alignedDry.bodyHtml,
          senderInboxId: selected?.acc.id || effectivePreferredInboxId || null,
          sentAt: new Date(),
        },
      }),
      sdrPrisma.sdrProspect.update({
        where: { id: draft.prospectId },
        data: {
          ...(draft.prospect.pipelineStatus !== 'Ha_Risposto' &&
          draft.prospect.pipelineStatus !== 'Catalogo_Aperto'
            ? { pipelineStatus: 'Inviata_Dry_Run' }
            : {}),
          ...(draft.sequenceStep === STEP_3_WARM_FOLLOWUP ? { autoFollowupPaused: true } : {}),
        },
      }),
    ]);

    return {
      dryRun: true,
      draftId: draft.id,
      senderEmail: senderLabel,
      recipientEmail,
      mxHost: verifyOutcome.mxHost,
    };
  }

  // INVIO REALE: Time-Fencing Lun-Ven + Jitter + Aruba SSL 465
  const fenceDelayMs =
    SDR_INTERCEPT_TO && !isConsentReply ? 0 : computeTimeFencingDelayMs(config || {});
  if (fenceDelayMs > 0) {
    const jitterMs = isConsentReply
      ? crypto.randomInt(30, 180) * 1000
      : computeGaussianJitterSeconds(
          config?.jitterMinSeconds || 180,
          config?.jitterMaxSeconds || 420
        ) * 1000;
    const nextSchedule = new Date(Date.now() + fenceDelayMs + jitterMs);
    await sdrPrisma.sdrOutreachDraft
      .update({ where: { id: draft.id }, data: { scheduledFor: nextSchedule } })
      .catch(() => {});
    await sdrOutreachQueue.add(
      SDR_JOBS.DISPATCH_SINGLE,
      {
        action: SDR_JOBS.DISPATCH_SINGLE,
        draftId: draft.id,
        preferredInboxId: effectivePreferredInboxId,
        inReplyTo: dispatchOpts?.inReplyTo || threadCtx.inReplyTo,
        references: dispatchOpts?.references || threadCtx.references,
      },
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
    const isCatchAllCap = mailboxResult.rescheduleReason === 'CATCH_ALL_DAILY_LIMIT_REACHED';
    const rescheduleDelayMs = isCatchAllCap
      ? computeDelayUntilNextBusinessDayMorningMs(config || {}) +
        computeGaussianJitterSeconds(180, 600) * 1000
      : 6 * 3600 * 1000;

    await sdrPrisma.sdrOutreachDraft
      .update({
        where: { id: draft.id },
        data: { scheduledFor: new Date(Date.now() + rescheduleDelayMs) },
      })
      .catch(() => {});

    await sdrOutreachQueue.add(
      SDR_JOBS.DISPATCH_SINGLE,
      {
        action: SDR_JOBS.DISPATCH_SINGLE,
        draftId: draft.id,
        preferredInboxId: effectivePreferredInboxId,
        inReplyTo: dispatchOpts?.inReplyTo || threadCtx.inReplyTo,
        references: dispatchOpts?.references || threadCtx.references,
      },
      { delay: rescheduleDelayMs, jobId: `quota-${draft.id}-${Date.now()}` }
    );

    pushSdrConsoleLog(
      isCatchAllCap ? 'CATCH-ALL-CAP' : 'QUOTA-CAP',
      isCatchAllCap
        ? `Raggiunto il limite prudenziale di 1 invio CATCH_ALL/giorno per casella Aruba. Draft #${draft.id} (${draft.prospect.companyName}) riprogrammata al prossimo giorno lavorativo.`
        : `Tetto giornaliero Ramp-Up raggiunto (${mailboxResult.rescheduleReason}). Draft #${draft.id} riprogrammata.`,
      'WARN'
    );
    return { rescheduled: true, reason: mailboxResult.rescheduleReason };
  }

  const inbox = selected.acc;
  const smtpPassword = decryptSdrSecret(inbox.smtpPasswordEnc);
  if (!smtpPassword || smtpPassword === 'DRY_RUN_TOKEN') {
    throw new Error(`Password SMTP non configurata per la casella ${inbox.email}`);
  }

  // 2. Allineamento rigoroso della Firma nel testo e nell'HTML alla casella Aruba mittente (`inbox.email`)
  const alignedMail = applySenderEmailToDraftSignature(
    draft.bodyText,
    draft.bodyHtml,
    inbox.email
  );

  // BLOCCO FISICO ANTI-INVIO A TERZI QUANDO SDR_TEST_INTERCEPT_EMAIL È ATTIVO
  const finalSmtpRecipient = SDR_INTERCEPT_TO || recipientEmail;
  if (SDR_INTERCEPT_TO && finalSmtpRecipient !== SDR_INTERCEPT_TO) {
    throw new Error(
      `BLOCCO SICUREZZA INTERCETTORE: destinatario ${finalSmtpRecipient} diverso da ${SDR_INTERCEPT_TO}`
    );
  }

  const senderDomain = inbox.email.split('@')[1] || 'izzodistribuzioneb2b.it';
  const customMessageId = `<sdr.${draft.id}.${Date.now()}.${crypto
    .randomBytes(4)
    .toString('hex')}@${senderDomain}>`;

  const resolvedInReplyTo = (dispatchOpts?.inReplyTo || threadCtx.inReplyTo || '').trim() || undefined;
  const rawRefs = dispatchOpts?.references || threadCtx.references;
  const resolvedReferences = Array.isArray(rawRefs)
    ? rawRefs.filter(Boolean).join(' ')
    : (rawRefs || '').trim() || undefined;

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
      to: finalSmtpRecipient,
      replyTo: inbox.email,
      subject: draft.subject,
      text: alignedMail.bodyText,
      html: alignedMail.bodyHtml || undefined,
      messageId: customMessageId,
      ...(resolvedInReplyTo ? { inReplyTo: resolvedInReplyTo } : {}),
      ...(resolvedReferences ? { references: resolvedReferences } : {}),
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        ...(SDR_INTERCEPT_TO ? { 'X-SDR-Original-Company-Email': recipientEmail } : {}),
      },
    });
    transporter.close();

    const { dateKey } = getRomeDateParts();
    if (verifyOutcome.isCatchAll) {
      await markInboxSentCatchAllToday(inbox.id, dateKey);
    }

    const keepWarmOrRepliedStatus =
      draft.prospect.pipelineStatus === 'Ha_Risposto' ||
      draft.prospect.pipelineStatus === 'Catalogo_Aperto';

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
          status: SDR_INTERCEPT_TO ? 'Inviata_Dry_Run' : 'Inviata',
          bodyText: alignedMail.bodyText,
          bodyHtml: alignedMail.bodyHtml,
          senderInboxId: inbox.id,
          messageIdHeader: customMessageId,
          sentAt: new Date(),
        },
      }),
      sdrPrisma.sdrProspect.update({
        where: { id: draft.prospectId },
        data: {
          ...(!keepWarmOrRepliedStatus
            ? { pipelineStatus: SDR_INTERCEPT_TO ? 'Inviata_Dry_Run' : 'Email_Inviata' }
            : {}),
          // Dopo lo Step 3 (Giorno +5 Solo Caldi), stop definitivo agli invii automatici!
          ...(draft.sequenceStep === STEP_3_WARM_FOLLOWUP ? { autoFollowupPaused: true } : {}),
        },
      }),
      draft.sequenceStep === STEP_3_WARM_FOLLOWUP && draft.prospect.promoProspectId
        ? b2bPrisma.b2BPromoProspect
            .update({
              where: { id: draft.prospect.promoProspectId },
              data: { autoFollowupPaused: true },
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);

    pushSdrConsoleLog(
      'SMTP-ARUBA',
      SDR_INTERCEPT_TO
        ? `[INTERCETTATO -> ${finalSmtpRecipient}] Step ${draft.sequenceStep} da ${inbox.email} (per ${draft.prospect.companyName}, email reale ${recipientEmail} NON contattata)`
        : `Step ${draft.sequenceStep} inviato da ${inbox.email} (${inbox.sentToday + 1}/${selected.effectiveLimit} W${selected.warmupWeek}) -> ${recipientEmail} (${draft.prospect.companyName})`,
      'SUCCESS'
    );

    return {
      dryRun: false,
      interceptedTo: SDR_INTERCEPT_TO || null,
      draftId: draft.id,
      sequenceStep: draft.sequenceStep,
      senderEmail: inbox.email,
      recipientEmail: finalSmtpRecipient,
      originalCompanyEmail: recipientEmail,
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

  if (!IS_SDR_LIVE) {
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

  const activeCount = Math.max(
    1,
    await sdrPrisma.sdrInboxAccount.count({ where: { isActive: true } })
  );
  const baseFenceDelay = SDR_INTERCEPT_TO ? 0 : computeTimeFencingDelayMs(config || {});
  const minJ = config?.jitterMinSeconds || 180;
  const maxJ = config?.jitterMaxSeconds || 420;

  let queued = 0;
  for (let idx = 0; idx < draftIds.length; idx++) {
    const did = Number(draftIds[idx]);
    if (Number.isNaN(did)) continue;
    const waveNumber = Math.floor(idx / activeCount);
    const slotJitterMs = SDR_INTERCEPT_TO
      ? idx * 4500
      : waveNumber * computeGaussianJitterSeconds(minJ, maxJ) * 1000 +
        Math.floor(Math.random() * 45000);

    const scheduledAt = new Date(Date.now() + baseFenceDelay + slotJitterMs);
    await sdrPrisma.sdrOutreachDraft
      .update({ where: { id: did }, data: { scheduledFor: scheduledAt } })
      .catch(() => {});

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
// 5. SENTINELLA IMAP EVOLUTA: CONSENSO "SÌ" (15-25 MIN) VS DOMANDA CON ALLEGATI
// ============================================================================

async function syncReplyOnB2BPromoProspect(
  prospect: { id: number; promoProspectId: string | null },
  data: {
    lastReplyAt?: Date;
    lastReplySnippet?: string;
    lastReplySentiment?: string;
    smartOfferToken?: string;
    autoFollowupPaused?: boolean;
    isActive?: boolean;
    status?: 'EXPIRED';
  }
) {
  try {
    if (prospect.promoProspectId) {
      await b2bPrisma.b2BPromoProspect.update({
        where: { id: prospect.promoProspectId },
        data,
      });
      return;
    }
    await b2bPrisma.b2BPromoProspect.updateMany({
      where: { sdrProspectId: prospect.id },
      data,
    });
  } catch (err: any) {
    log.warn(`Avviso sync b2b_promo_prospects per prospect #${prospect.id}: ${err.message}`, {
      module: MODULE_NAME,
    });
  }
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
        const fromName = (msg.envelope?.from?.[0]?.name || '').trim();
        if (!fromAddr || fromAddr === inbox.email.toLowerCase()) continue;

        const msgId = String(msg.envelope?.messageId || `imap-${inbox.id}-${msg.uid}`).trim();

        // Idempotenza: se il messaggio è già registrato in sdr_inbox_events, non rielaborarlo
        const alreadyProcessed = await sdrPrisma.sdrInboxEvent
          .findUnique({ where: { messageId: msgId }, select: { id: true } })
          .catch(() => null);
        if (alreadyProcessed) continue;

        // Scarica e parsa l'INTERO messaggio raw senza alcun taglio a 12KB né a 600 caratteri!
        const parsed = parseRawMimeEmail(msg.source);
        const subject = String(
          parsed.headers['subject'] || msg.envelope?.subject || '(Nessun oggetto)'
        ).trim();
        const envelopeInReplyTo = String(msg.envelope?.inReplyTo || '').trim();
        const primaryInReplyTo = parsed.inReplyTo || envelopeInReplyTo;
        const candidateThreadIds = Array.from(
          new Set(
            [primaryInReplyTo, envelopeInReplyTo, ...parsed.messageIdsInThread].filter((x) =>
              Boolean(x && x.trim())
            )
          )
        );

        const fullText = parsed.fullText;
        const freshReplyText = parsed.freshReplyText || fullText;
        const snippetPreview = (freshReplyText || fullText)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500);

        const isMailerDaemon = /mailer-daemon|postmaster|maildelivery/i.test(fromAddr);
        const classification = classifyInboundEmail({
          fromEmail: fromAddr,
          subject,
          freshReplyText,
          fullText,
          attachmentsCount: parsed.attachments.length,
          autoSubmitted: parsed.autoSubmitted,
        });

        // Correlazione al prospect (In-Reply-To / References -> Email mittente -> Intercettore test / Bounce)
        let matchedDraft =
          candidateThreadIds.length > 0
            ? await sdrPrisma.sdrOutreachDraft.findFirst({
                where: { messageIdHeader: { in: candidateThreadIds } },
                include: { prospect: true },
              })
            : null;

        let matchedProspect = matchedDraft?.prospect || null;
        if (!matchedProspect && !isMailerDaemon) {
          matchedProspect = await sdrPrisma.sdrProspect.findFirst({
            where: { ordinaryEmail: { equals: fromAddr, mode: 'insensitive' } },
          });

          // Supporto test sicuro con SDR_TEST_INTERCEPT_EMAIL quando il client di posta non invia In-Reply-To
          if (!matchedProspect && SDR_INTERCEPT_TO && fromAddr === SDR_INTERCEPT_TO) {
            const cleanSubj = subject.replace(/^(?:re|r|fwd|i):\s*/gi, '').trim();
            const recentTestDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
              where: {
                senderInboxId: inbox.id,
                ...(cleanSubj ? { subject: { contains: cleanSubj, mode: 'insensitive' } } : {}),
              },
              orderBy: { sentAt: 'desc' },
              include: { prospect: true },
            });
            if (recentTestDraft?.prospect) {
              matchedDraft = recentTestDraft;
              matchedProspect = recentTestDraft.prospect;
            }
          }
        } else if (!matchedProspect && isMailerDaemon) {
          const bouncedEmailMatch = fullText.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
          );
          const targetBounced = (bouncedEmailMatch || []).find(
            (e) =>
              e.toLowerCase() !== inbox.email.toLowerCase() &&
              !e.toLowerCase().includes('aruba.it') &&
              e.toLowerCase() !== SDR_INTERCEPT_TO
          );
          if (targetBounced) {
            matchedProspect = await sdrPrisma.sdrProspect.findFirst({
              where: { ordinaryEmail: { equals: targetBounced.toLowerCase(), mode: 'insensitive' } },
            });
          }
        }

        const now = new Date();

        // CASO A1: Out Of Office
        if (classification === 'Out_Of_Office') {
          if (matchedProspect) {
            await syncReplyOnB2BPromoProspect(matchedProspect, {
              lastReplyAt: now,
              lastReplySnippet: snippetPreview,
              lastReplySentiment: 'Out_Of_Office',
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
                snippet: snippetPreview,
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

        // CASO A2: Hard / Soft Bounce
        if (classification === 'Bounce') {
          if (matchedProspect) {
            const hasPhone = prospectHasPhoneOrWhatsapp(matchedProspect);
            await Promise.all([
              sdrPrisma.sdrProspect.update({
                where: { id: matchedProspect.id },
                data: {
                  pipelineStatus: 'Bounce_Invalido',
                  emailVerifyStatus: 'INVALID',
                  emailVerifiedAt: now,
                  emailVerifyProvider: 'imap-bounce',
                  autoFollowupPaused: true,
                  ...(hasPhone ? { section: 'Senza_Email' } : {}),
                },
              }),
              sdrPrisma.sdrOutreachDraft.updateMany({
                where: {
                  prospectId: matchedProspect.id,
                  status: { notIn: ['Inviata', 'Inviata_Dry_Run'] },
                },
                data: { status: 'Annullato_KillSwitch' },
              }),
              syncReplyOnB2BPromoProspect(matchedProspect, {
                lastReplyAt: now,
                lastReplySnippet: snippetPreview,
                lastReplySentiment: 'Bounce',
                autoFollowupPaused: true,
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
                snippet: snippetPreview,
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

        // CASO A3: Opt-Out / Rifiuto ("STOP", "Non interessati", "No grazie")
        if (classification === 'Opt_Out') {
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
                where: { prospectId: matchedProspect.id, sequenceStep: STEP_1_INITIAL },
                data: {
                  status: 'Annullato_KillSwitch',
                  replyReceivedAt: now,
                  replySnippet: snippetPreview.slice(0, 400),
                },
              }),
              sdrPrisma.sdrProspect.update({
                where: { id: matchedProspect.id },
                data: {
                  pipelineStatus: 'Opt_Out',
                  autoFollowupPaused: true,
                },
              }),
              syncReplyOnB2BPromoProspect(matchedProspect, {
                lastReplyAt: now,
                lastReplySnippet: snippetPreview,
                lastReplySentiment: 'Opt_Out',
                autoFollowupPaused: true,
                isActive: false,
                status: 'EXPIRED',
              }),
            ]);
          }

          if (!SDR_INTERCEPT_TO || fromAddr !== SDR_INTERCEPT_TO) {
            await sdrPrisma.sdrBlacklist
              .upsert({
                where: { emailOrDomain: fromAddr },
                create: { emailOrDomain: fromAddr, reason: 'Opt-Out su risposta email IMAP' },
                update: { reason: 'Opt-Out su risposta email IMAP' },
              })
              .catch(() => {});
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
                snippet: snippetPreview,
                eventType: 'OPT_OUT',
                sentiment: 'Opt_Out',
                killSwitchTriggered: true,
                agentAlertSent: false,
                messageUid: msg.uid,
                messageId: msgId,
              },
              update: {},
            })
            .catch(() => {});

          pushSdrConsoleLog(
            'OPT-OUT',
            `Richiesta Opt-Out ricevuta su ${inbox.email} da ${matchedProspect?.companyName || fromAddr}. Invii fermati definitivamente.`,
            'WARN'
          );
          newEvents++;
          continue;
        }

        // CASO B: CONSENSO SEMPLICE ("Sì grazie", "Mandate pure", "Ok inviate listino") -> Risposta Step 1B tra 15-25 min!
        if (classification === 'Consenso_Invio' && matchedProspect) {
          if (!matchedProspect.promoProspectId) {
            await prepareOutreachPackageForProspect(matchedProspect.id).catch(() => {});
            const refreshed = await sdrPrisma.sdrProspect.findUnique({
              where: { id: matchedProspect.id },
            });
            if (refreshed) matchedProspect = refreshed;
          }

          const [step1Draft, config, agent, existingConsentDraft] = await Promise.all([
            sdrPrisma.sdrOutreachDraft.findFirst({
              where: { prospectId: matchedProspect.id, sequenceStep: STEP_1_INITIAL },
            }),
            sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
            resolveAgentForProspect(
              matchedProspect.assignedAgentId,
              matchedProspect.assignedAgentCode
            ),
            sdrPrisma.sdrOutreachDraft.findFirst({
              where: {
                prospectId: matchedProspect.id,
                sequenceStep: STEP_1B_CONSENT_REPLY,
                status: { notIn: ['Annullato_KillSwitch'] },
              },
            }),
          ]);

          let masterToken = step1Draft?.trackingToken || '';
          if (!masterToken) {
            masterToken = generateTrackingToken();
            if (step1Draft) {
              await sdrPrisma.sdrOutreachDraft.update({
                where: { id: step1Draft.id },
                data: { trackingToken: masterToken },
              });
            }
          }
          const smartUrls = buildSmartOfferUrls(masterToken);

          // Annulla eventuali Step 2 / Step 3 freddi in coda e aggiorna Step 1 + B2BPromoProspect
          await Promise.all([
            sdrPrisma.sdrOutreachDraft.updateMany({
              where: {
                prospectId: matchedProspect.id,
                sequenceStep: { in: [STEP_2_FOLLOWUP, STEP_3_WARM_FOLLOWUP] },
                status: { notIn: ['Inviata', 'Inviata_Dry_Run'] },
              },
              data: { status: 'Annullato_KillSwitch' },
            }),
            step1Draft
              ? sdrPrisma.sdrOutreachDraft.update({
                  where: { id: step1Draft.id },
                  data: {
                    status: 'Risposta_Ricevuta',
                    replyReceivedAt: now,
                    replySnippet: snippetPreview.slice(0, 400),
                  },
                })
              : Promise.resolve(),
            sdrPrisma.sdrProspect.update({
              where: { id: matchedProspect.id },
              data: { pipelineStatus: 'Ha_Risposto' },
            }),
            syncReplyOnB2BPromoProspect(matchedProspect, {
              lastReplyAt: now,
              lastReplySnippet: snippetPreview,
              lastReplySentiment: 'Consenso_Invio',
              smartOfferToken: masterToken,
            }),
          ]);

          const humanDelaySeconds = 15 * 60 + crypto.randomInt(0, 10 * 60 + 1); // 15-25 minuti
          const humanDelayMs = humanDelaySeconds * 1000;
          const fenceAfterHumanMs = computeTimeFencingDelayMs(
            config || {},
            new Date(Date.now() + humanDelayMs)
          );
          const totalDelayMs = humanDelayMs + fenceAfterHumanMs;
          const delayMinutes = Math.max(15, Math.round(totalDelayMs / 60000));

          if (!existingConsentDraft) {
            const clusterCfg = resolveClusterConfig(
              matchedProspect.categoryCluster,
              matchedProspect.commercialCategory
            );
            const extraPct =
              clusterCfg.commercialCategory === 'RIV'
                ? Number(config?.rivExtraDiscountPct ?? 10)
                : Number(config?.istExtraDiscountPct ?? 10);
            const richMetaObj =
              matchedProspect.richMetadata && typeof matchedProspect.richMetadata === 'object'
                ? (matchedProspect.richMetadata as Record<string, any>)
                : null;

            const consentEmail = generateConsentReplyEmail({
              prospectId: matchedProspect.id,
              companyName: matchedProspect.companyName,
              city: matchedProspect.city,
              province: matchedProspect.province,
              categoryCluster: clusterCfg.cluster,
              commercialCategory: clusterCfg.commercialCategory,
              decisionMaker: richMetaObj?.decision_maker || null,
              richMetadata: richMetaObj,
              originalSubject: matchedDraft?.subject || step1Draft?.subject || subject,
              smartCatalogUrl: smartUrls.storefrontOfferUrl,
              trackingToken: masterToken,
              baseDiscount: clusterCfg.baseDiscount,
              extraFirstPurchasePct: config?.enableFirstPurchaseRule === false ? 0 : extraPct,
              minOrderAmountText: config?.minOrderAmountText || "Nessun minimo d'ordine",
              agentName: agent.name,
              agentPhone: agent.phone,
              agentEmail: inbox.email,
              senderInboxEmail: inbox.email,
            });

            const consentDraft = await sdrPrisma.sdrOutreachDraft.create({
              data: {
                prospectId: matchedProspect.id,
                sequenceStep: STEP_1B_CONSENT_REPLY,
                subject: consentEmail.subject,
                bodyText: consentEmail.bodyText,
                bodyHtml: consentEmail.bodyHtml,
                templateCode: consentEmail.templateCode,
                attachedCatalogUrl: smartUrls.apiPdfDownloadUrl,
                trackingToken: null,
                senderInboxId: inbox.id,
                scheduledFor: new Date(Date.now() + totalDelayMs),
                assignedAgentId: agent.id,
                assignedAgentCode: agent.code,
                assignedAgentName: agent.name,
                status: 'Bozza_Pronta',
              },
            });

            const threadRefs = Array.from(
              new Set(
                [
                  step1Draft?.messageIdHeader,
                  matchedDraft?.messageIdHeader,
                  ...candidateThreadIds,
                  ...(msgId.startsWith('<') ? [msgId] : []),
                ].filter((x): x is string => Boolean(x && x.trim()))
              )
            );

            await sdrOutreachQueue.add(
              SDR_JOBS.DISPATCH_SINGLE,
              {
                action: SDR_JOBS.DISPATCH_SINGLE,
                draftId: consentDraft.id,
                preferredInboxId: inbox.id,
                inReplyTo: msgId.startsWith('<')
                  ? msgId
                  : matchedDraft?.messageIdHeader || step1Draft?.messageIdHeader,
                references: threadRefs,
              },
              {
                delay: totalDelayMs,
                jobId: `consent-step1b-${consentDraft.id}`,
              }
            );
          }

          const alertSent = await sendBrevoConsentInfoAlertToAgent({
            agent,
            companyName: matchedProspect.companyName,
            city: matchedProspect.city,
            province: matchedProspect.province,
            fromEmail: fromAddr,
            inboxEmail: inbox.email,
            phone: matchedProspect.phone || matchedProspect.whatsappPhone,
            subject,
            fullText,
            delayMinutes,
            smartOfferUrl: smartUrls.storefrontOfferUrl,
          });

          await sdrPrisma.sdrInboxEvent
            .upsert({
              where: { messageId: msgId },
              create: {
                inboxAccountId: inbox.id,
                prospectId: matchedProspect.id,
                draftId: matchedDraft?.id || step1Draft?.id || null,
                fromEmail: fromAddr,
                toEmail: inbox.email,
                subject,
                snippet: snippetPreview,
                eventType: 'REPLY',
                sentiment: 'Consenso_Invio',
                killSwitchTriggered: false,
                agentAlertSent: alertSent,
                messageUid: msg.uid,
                messageId: msgId,
              },
              update: {},
            })
            .catch(() => {});

          pushSdrConsoleLog(
            'CONSENSO-SI',
            `Consenso affermativo da ${matchedProspect.companyName} su ${inbox.email} -> Step 1B con link offerta pianificato sulla stessa casella tra ${delayMinutes} min!`,
            'SUCCESS'
          );
          newEvents++;
          continue;
        }

        // CASO C: DOMANDA SPECIFICA O RISPOSTA CON ALLEGATI -> Kill-Switch Atomico + Inoltro Integrale + Allegati a Daniele!
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
              where: { prospectId: matchedProspect.id, sequenceStep: STEP_1_INITIAL },
              data: {
                status: 'Risposta_Ricevuta',
                replyReceivedAt: now,
                replySnippet: snippetPreview.slice(0, 400),
              },
            }),
            sdrPrisma.sdrProspect.update({
              where: { id: matchedProspect.id },
              data: {
                pipelineStatus: 'Ha_Risposto',
                autoFollowupPaused: true,
              },
            }),
            syncReplyOnB2BPromoProspect(matchedProspect, {
              lastReplyAt: now,
              lastReplySnippet: snippetPreview,
              lastReplySentiment: 'Domanda_Specifica',
              autoFollowupPaused: true,
            }),
          ]);
        }

        const agent = await resolveAgentForProspect(
          matchedProspect?.assignedAgentId,
          matchedProspect?.assignedAgentCode
        );

        const alertSent = await sendBrevoFullForwardToAgent({
          agent,
          companyName: matchedProspect?.companyName || fromName || fromAddr,
          city: matchedProspect?.city,
          province: matchedProspect?.province,
          fromEmail: fromAddr,
          inboxEmail: inbox.email,
          phone: matchedProspect?.phone || matchedProspect?.whatsappPhone,
          subject,
          fullText,
          sentiment: 'Domanda_Specifica',
          attachments: parsed.attachments,
          oversizedAttachmentsSkipped: parsed.oversizedAttachmentsSkipped,
        });

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
              snippet: snippetPreview,
              eventType: 'REPLY',
              sentiment: 'Domanda_Specifica',
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
          `Domanda specifica / risposta (${parsed.attachments.length} allegati) su ${inbox.email} da ${
            matchedProspect?.companyName || fromAddr
          } -> Kill-Switch attivato e testo integrale inoltrato a ${agent.name}!`,
          'SUCCESS'
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
// 6. SCHEDULER AUTOMATICO STEP 2 (GIORNO +5) E STEP 3 (GIORNO +5 SOLO CALDI)
// ============================================================================

let _followupSchedulerRunning = false;

export async function runAutomatedFollowupScheduler() {
  if (_followupSchedulerRunning) return { skipped: true };
  _followupSchedulerRunning = true;

  try {
    const config = await sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } });
    const step2DelayDays = Math.max(1, Number(config?.step2DelayDays ?? 5));
    const step3WarmDelayDays = Math.max(1, Number(config?.step3WarmDelayDays ?? 5));

    const step2Cutoff = new Date(Date.now() - step2DelayDays * 86_400_000);
    const step3WarmCutoff = new Date(Date.now() - step3WarmDelayDays * 86_400_000);

    const activeInboxes = await sdrPrisma.sdrInboxAccount.findMany({
      select: { id: true, email: true, isActive: true },
    });
    const inboxMap = new Map(activeInboxes.map((mb) => [mb.id, mb]));

    const createdStep2Ids: number[] = [];
    const createdStep3Ids: number[] = [];

    // ------------------------------------------------------------------------
    // FASE A: STEP 2 (`sequenceStep = 2`, Giorno +5)
    // Prospect con Step 1 `Inviata` da >= step2DelayDays, zero risposte,
    // zero aperture catalogo/login, non in Opt-Out/Bounce, autoFollowupPaused === false,
    // e nessuna bozza `sequenceStep >= 2`.
    // ------------------------------------------------------------------------
    const step2Candidates = await sdrPrisma.sdrOutreachDraft.findMany({
      where: {
        sequenceStep: STEP_1_INITIAL,
        status: 'Inviata',
        sentAt: { lte: step2Cutoff },
        replyReceivedAt: null,
        catalogOpenCount: 0,
        prospect: {
          autoFollowupPaused: false,
          agentContactedAt: null,
          pipelineStatus: {
            notIn: ['Opt_Out', 'Bounce_Invalido', 'Ha_Risposto', 'Catalogo_Aperto'],
          },
          NOT: { emailVerifyStatus: 'INVALID' },
          drafts: {
            none: {
              sequenceStep: { gte: STEP_2_FOLLOWUP },
            },
          },
        },
      },
      include: { prospect: true },
      orderBy: { sentAt: 'asc' },
      take: 80,
    });

    for (const step1Draft of step2Candidates) {
      const prospect = step1Draft.prospect;
      if (!prospect || !prospect.ordinaryEmail) continue;

      // Verifica nessun evento REPLY/BOUNCE/OPT_OUT in sdr_inbox_events
      const blockingEvent = await sdrPrisma.sdrInboxEvent.findFirst({
        where: {
          prospectId: prospect.id,
          eventType: { in: ['REPLY', 'OPT_OUT', 'BOUNCE'] },
        },
        select: { id: true },
      });
      if (blockingEvent) continue;

      // Verifica stato sul portale B2B (nessun login/apertura/chiamata/pausa/ordine)
      const promo = prospect.promoProspectId
        ? await b2bPrisma.b2BPromoProspect.findUnique({
            where: { id: prospect.promoProspectId },
          })
        : await b2bPrisma.b2BPromoProspect.findFirst({
            where: { sdrProspectId: prospect.id },
          });

      if (
        promo &&
        (promo.autoFollowupPaused ||
          promo.agentContactedAt != null ||
          promo.lastReplyAt != null ||
          promo.catalogOpenCount > 0 ||
          promo.loginCount > 0 ||
          promo.firstOrderId != null ||
          promo.convertedToUserId != null ||
          promo.status === 'CONVERTED' ||
          promo.status === 'EXPIRED')
      ) {
        continue;
      }

      let masterToken = step1Draft.trackingToken || '';
      if (!masterToken) {
        masterToken = generateTrackingToken();
        await sdrPrisma.sdrOutreachDraft.update({
          where: { id: step1Draft.id },
          data: { trackingToken: masterToken },
        });
      }
      if (promo && promo.smartOfferToken !== masterToken) {
        await b2bPrisma.b2BPromoProspect
          .update({ where: { id: promo.id }, data: { smartOfferToken: masterToken } })
          .catch(() => {});
      }

      const smartUrls = buildSmartOfferUrls(masterToken);
      const agent = await resolveAgentForProspect(
        step1Draft.assignedAgentId || prospect.assignedAgentId,
        step1Draft.assignedAgentCode || prospect.assignedAgentCode
      );
      const pinnedInbox = step1Draft.senderInboxId
        ? inboxMap.get(step1Draft.senderInboxId)
        : undefined;

      const clusterCfg = resolveClusterConfig(
        prospect.categoryCluster,
        prospect.commercialCategory
      );
      const extraPct =
        clusterCfg.commercialCategory === 'RIV'
          ? Number(config?.rivExtraDiscountPct ?? 10)
          : Number(config?.istExtraDiscountPct ?? 10);
      const richMetaObj =
        prospect.richMetadata && typeof prospect.richMetadata === 'object'
          ? (prospect.richMetadata as Record<string, any>)
          : null;

      const step2Email = generateStep2FollowupEmail({
        prospectId: prospect.id,
        companyName: prospect.companyName,
        city: prospect.city,
        province: prospect.province,
        categoryCluster: clusterCfg.cluster,
        commercialCategory: clusterCfg.commercialCategory,
        decisionMaker: richMetaObj?.decision_maker || null,
        richMetadata: richMetaObj,
        originalSubject: step1Draft.subject,
        smartCatalogUrl: smartUrls.storefrontOfferUrl,
        trackingToken: masterToken,
        baseDiscount: clusterCfg.baseDiscount,
        extraFirstPurchasePct: config?.enableFirstPurchaseRule === false ? 0 : extraPct,
        minOrderAmountText: config?.minOrderAmountText || "Nessun minimo d'ordine",
        agentName: agent.name,
        agentPhone: agent.phone,
        agentEmail: pinnedInbox?.email || agent.email,
        senderInboxEmail: pinnedInbox?.email || null,
      });

      const createdDraft = await sdrPrisma.sdrOutreachDraft.create({
        data: {
          prospectId: prospect.id,
          sequenceStep: STEP_2_FOLLOWUP,
          subject: step2Email.subject,
          bodyText: step2Email.bodyText,
          bodyHtml: step2Email.bodyHtml,
          templateCode: step2Email.templateCode,
          attachedCatalogUrl: smartUrls.apiPdfDownloadUrl,
          trackingToken: null,
          senderInboxId: step1Draft.senderInboxId,
          assignedAgentId: agent.id,
          assignedAgentCode: agent.code,
          assignedAgentName: agent.name,
          status: 'Bozza_Pronta',
        },
      });

      createdStep2Ids.push(createdDraft.id);
    }

    // ------------------------------------------------------------------------
    // FASE B: STEP 3 (`sequenceStep = 3`, Giorno +5 Solo Caldi)
    // Prospect che hanno aperto davvero il Catalistino PDF (`catalogOpenCount > 0`)
    // o fatto login sul portale (`loginCount > 0`) da >= step3WarmDelayDays,
    // hanno 0 ordini in `b2b_orders`, non hanno risposto via mail,
    // `agentContactedAt == null` e `autoFollowupPaused === false` (in ENTRAMBI i DB),
    // e non hanno già `sequenceStep = 3`.
    // ------------------------------------------------------------------------
    const [warmPromosFromB2B, warmDraftsFromSdr] = await Promise.all([
      b2bPrisma.b2BPromoProspect.findMany({
        where: {
          isActive: true,
          autoFollowupPaused: false,
          agentContactedAt: null,
          lastReplyAt: null,
          firstOrderId: null,
          convertedToUserId: null,
          status: { in: ['CONTACTED', 'LOGGED_IN'] },
          OR: [
            { catalogOpenCount: { gt: 0 }, catalogOpenedAt: { lte: step3WarmCutoff } },
            { loginCount: { gt: 0 }, firstLoginAt: { lte: step3WarmCutoff } },
            { loginCount: { gt: 0 }, firstLoginAt: null, lastLoginAt: { lte: step3WarmCutoff } },
          ],
        },
        take: 80,
      }),
      sdrPrisma.sdrOutreachDraft.findMany({
        where: {
          catalogOpenCount: { gt: 0 },
          catalogOpenedAt: { lte: step3WarmCutoff },
          prospect: {
            autoFollowupPaused: false,
            agentContactedAt: null,
            pipelineStatus: { notIn: ['Opt_Out', 'Bounce_Invalido', 'Ha_Risposto'] },
            drafts: { none: { sequenceStep: STEP_3_WARM_FOLLOWUP } },
          },
        },
        select: { prospectId: true },
        take: 80,
      }),
    ]);

    const candidateSdrProspectIds = Array.from(
      new Set([
        ...warmPromosFromB2B.map((p) => p.sdrProspectId),
        ...warmDraftsFromSdr.map((d) => d.prospectId),
      ])
    );

    for (const sdrPid of candidateSdrProspectIds) {
      const prospect = await sdrPrisma.sdrProspect.findUnique({
        where: { id: sdrPid },
        include: { drafts: { orderBy: { createdAt: 'asc' } } },
      });

      if (!prospect || !prospect.ordinaryEmail) continue;
      if (
        prospect.autoFollowupPaused ||
        prospect.agentContactedAt != null ||
        prospect.emailVerifyStatus === 'INVALID' ||
        prospect.pipelineStatus === 'Opt_Out' ||
        prospect.pipelineStatus === 'Bounce_Invalido' ||
        prospect.pipelineStatus === 'Ha_Risposto'
      ) {
        continue;
      }

      // Non deve già avere Step 3 né risposte su bozze precedenti
      if (prospect.drafts.some((d) => d.sequenceStep === STEP_3_WARM_FOLLOWUP)) continue;
      if (prospect.drafts.some((d) => d.replyReceivedAt != null)) continue;

      // Deve avere almeno una mail effettivamente inviata da cui ereditare `senderInboxId` e `subject`
      const sentDrafts = prospect.drafts.filter((d) => d.status === 'Inviata');
      if (sentDrafts.length === 0) continue;

      const replyOrBounceEvent = await sdrPrisma.sdrInboxEvent.findFirst({
        where: {
          prospectId: prospect.id,
          eventType: { in: ['REPLY', 'OPT_OUT', 'BOUNCE'] },
        },
        select: { id: true },
      });
      if (replyOrBounceEvent) continue;

      const promo = prospect.promoProspectId
        ? await b2bPrisma.b2BPromoProspect.findUnique({
            where: { id: prospect.promoProspectId },
          })
        : await b2bPrisma.b2BPromoProspect.findFirst({
            where: { sdrProspectId: prospect.id },
          });

      if (!promo || !promo.isActive) continue;
      if (
        promo.autoFollowupPaused ||
        promo.agentContactedAt != null ||
        promo.lastReplyAt != null ||
        promo.firstOrderId != null ||
        promo.convertedToUserId != null ||
        promo.status === 'CONVERTED' ||
        promo.status === 'ORDER_PENDING_APPROVAL' ||
        promo.status === 'EXPIRED'
      ) {
        continue;
      }

      // Verifica che l'apertura reale PDF o il login siano avvenuti da almeno step3WarmDelayDays
      const draftOpenedAt = prospect.drafts
        .filter((d) => d.catalogOpenCount > 0 && d.catalogOpenedAt)
        .map((d) => d.catalogOpenedAt!.getTime())
        .sort((a, b) => a - b)[0];
      const promoOpenedAt =
        promo.catalogOpenCount > 0 && promo.catalogOpenedAt
          ? promo.catalogOpenedAt.getTime()
          : undefined;
      const promoLoginAt =
        promo.loginCount > 0
          ? (promo.firstLoginAt || promo.lastLoginAt)?.getTime()
          : undefined;

      const earliestEngagementMs = [draftOpenedAt, promoOpenedAt, promoLoginAt]
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => a - b)[0];

      if (!earliestEngagementMs || earliestEngagementMs > step3WarmCutoff.getTime()) {
        continue;
      }

      // Verifica 0 ordini in `b2b_orders`
      const ordersCount = await b2bPrisma.b2BOrder.count({
        where: {
          OR: [
            { promoProspectId: promo.id },
            ...(promo.convertedToUserId ? [{ userId: promo.convertedToUserId }] : []),
            ...(prospect.promotedB2bUserId ? [{ userId: prospect.promotedB2bUserId }] : []),
          ],
        },
      });
      if (ordersCount > 0) continue;

      const anchorDraft =
        sentDrafts.find((d) => d.sequenceStep === STEP_1_INITIAL) || sentDrafts[0];
      const pinnedInboxId =
        anchorDraft.senderInboxId ||
        sentDrafts.find((d) => d.senderInboxId)?.senderInboxId ||
        null;
      const pinnedInbox = pinnedInboxId ? inboxMap.get(pinnedInboxId) : undefined;

      const agent = await resolveAgentForProspect(
        anchorDraft.assignedAgentId || prospect.assignedAgentId,
        anchorDraft.assignedAgentCode || prospect.assignedAgentCode
      );
      const clusterCfg = resolveClusterConfig(
        prospect.categoryCluster,
        prospect.commercialCategory
      );
      const extraPct =
        clusterCfg.commercialCategory === 'RIV'
          ? Number(config?.rivExtraDiscountPct ?? 10)
          : Number(config?.istExtraDiscountPct ?? 10);
      const richMetaObj =
        prospect.richMetadata && typeof prospect.richMetadata === 'object'
          ? (prospect.richMetadata as Record<string, any>)
          : null;

      const step3Email = generateStep3WarmFollowupEmail({
        prospectId: prospect.id,
        companyName: prospect.companyName,
        city: prospect.city,
        province: prospect.province,
        categoryCluster: clusterCfg.cluster,
        commercialCategory: clusterCfg.commercialCategory,
        decisionMaker: richMetaObj?.decision_maker || null,
        richMetadata: richMetaObj,
        originalSubject: anchorDraft.subject,
        baseDiscount: clusterCfg.baseDiscount,
        extraFirstPurchasePct: config?.enableFirstPurchaseRule === false ? 0 : extraPct,
        minOrderAmountText: config?.minOrderAmountText || "Nessun minimo d'ordine",
        agentName: agent.name,
        agentPhone: agent.phone,
        agentEmail: pinnedInbox?.email || agent.email,
        senderInboxEmail: pinnedInbox?.email || null,
      });

      const createdStep3 = await sdrPrisma.sdrOutreachDraft.create({
        data: {
          prospectId: prospect.id,
          sequenceStep: STEP_3_WARM_FOLLOWUP,
          subject: step3Email.subject,
          bodyText: step3Email.bodyText,
          bodyHtml: step3Email.bodyHtml,
          templateCode: step3Email.templateCode,
          attachedCatalogUrl: null,
          trackingToken: null,
          senderInboxId: pinnedInboxId,
          assignedAgentId: agent.id,
          assignedAgentCode: agent.code,
          assignedAgentName: agent.name,
          status: 'Bozza_Pronta',
        },
      });

      createdStep3Ids.push(createdStep3.id);
    }

    const allToSchedule = [...createdStep2Ids, ...createdStep3Ids];
    if (allToSchedule.length > 0) {
      await scheduleDispatchBatchWithJitter(allToSchedule);
      pushSdrConsoleLog(
        'FOLLOWUP-SCHEDULER',
        `Generati e pianificati automaticamente ${createdStep2Ids.length} Step 2 (+${step2DelayDays}gg) e ${createdStep3Ids.length} Step 3 Caldi (+${step3WarmDelayDays}gg) sulle medesime caselle Aruba.`,
        'SUCCESS'
      );
    }

    return {
      step2Created: createdStep2Ids.length,
      step3Created: createdStep3Ids.length,
    };
  } catch (err: any) {
    log.error(`Errore runAutomatedFollowupScheduler: ${err.message}`, { module: MODULE_NAME });
    return { error: err.message };
  } finally {
    _followupSchedulerRunning = false;
  }
}

// ============================================================================
// 7. BULLMQ WORKERS, SCHEDULER PERIODICI & SERVER HEALTH RAILWAY
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
    return await dispatchSingleOutreachEmail(Number(data.draftId), {
      preferredInboxId: data.preferredInboxId ? Number(data.preferredInboxId) : null,
      inReplyTo: data.inReplyTo || null,
      references: data.references || null,
    });
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

  if (action === FOLLOWUP_SCHEDULER_ACTION) {
    return await runAutomatedFollowupScheduler();
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
          enableSdrLiveOutreach: IS_SDR_LIVE,
          sdrTestInterceptEmail: SDR_INTERCEPT_TO || null,
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

  // Schedula ciclo IMAP Sentinella/Kill-Switch ogni 3 minuti
  setInterval(() => {
    sdrOutreachQueue
      .add(
        SDR_JOBS.IMAP_POLL_TICK,
        { action: SDR_JOBS.IMAP_POLL_TICK },
        { jobId: `imap-poll-${Math.floor(Date.now() / 180000)}`, removeOnComplete: true }
      )
      .catch(() => {});
  }, 3 * 60 * 1000);

  // Schedula ciclo automatico Step 2 (Giorno +5) e Step 3 (Giorno +5 Solo Caldi) + reset quote ogni 30 minuti
  setInterval(() => {
    resetDailyInboxQuotasIfNeeded().catch(() => {});
    sdrOutreachQueue
      .add(
        FOLLOWUP_SCHEDULER_ACTION,
        { action: FOLLOWUP_SCHEDULER_ACTION },
        { jobId: `followup-sched-${Math.floor(Date.now() / 1800000)}`, removeOnComplete: true }
      )
      .catch(() => {});
  }, 30 * 60 * 1000);

  log.info(
    `🚀 Worker AI-SDR Outreach & Sentinella IMAP 3-Tempi (Pool 60 Caselle Aruba | SDR_LIVE=${IS_SDR_LIVE} | INTERCEPT_TO=${SDR_INTERCEPT_TO || 'OFF'} | GLOBAL_WRITES=${env.ENABLE_GLOBAL_WRITES}) avviato!`,
    { module: MODULE_NAME }
  );
}

startWorker().catch((err) => {
  log.error(`Errore fatale avvio ${MODULE_NAME}: ${err.message}`, { module: MODULE_NAME });
  process.exit(1);
});
