import { FastifyInstance, FastifyRequest } from 'fastify';
import { sdrPrisma, resolveClusterConfig } from '@archelia/sdr-database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { env, log } from '@archelia/core';
import {
  generateProspectReservedCatalogPdf,
  resolveSdrAgent,
  sendBrevoAgentAlert,
} from '../lib/b2bSdr/sdrCatalogService.js';
import { addSdrLog, redisConnection } from '../lib/b2bSdr/searchEngine.js';

function escapeHtml(str?: string | null): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SECURITY_SCANNER_UA_REGEX =
  /SafeLinks|Microsoft\s*Office|ms-office|OfficeProtocolDiscovery|Outlook-iOS-Android|Mimecast|Barracuda|Proofpoint|Defender|ATP|TrendMicro|Sophos|Symantec|FireEye|CiscoIronPort|GoogleImageProxy|YahooMailProxy|Slackbot|WhatsApp|TelegramBot|Facebot|Twitterbot|LinkedInBot|Discordbot|curl|wget|python|aiohttp|httpx|axios|Go-http-client|Java\/|PhantomJS|HeadlessChrome|Prerender|\bbot\b|crawler|spider/i;

const SSR_RUNTIME_UA_REGEX = /^(?:node|undici|node-fetch|Next\.js)/i;

export function isAutomatedSecurityScanner(
  request: FastifyRequest,
  draft?: { sentAt?: Date | string | null } | null,
  options?: { allowNextProxyPost?: boolean }
): boolean {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const purpose = String(
    request.headers['purpose'] ||
      request.headers['sec-purpose'] ||
      request.headers['x-purpose'] ||
      request.headers['x-moz'] ||
      ''
  ).toLowerCase();
  if (purpose.includes('prefetch') || purpose.includes('preview')) {
    return true;
  }

  if (
    String(request.headers['x-sdr-ssr'] || '') === '1' ||
    String(request.headers['x-nextjs-ssr'] || '') === '1' ||
    String((request.query as Record<string, unknown> | undefined)?.skipTrack || '') === '1'
  ) {
    return true;
  }

  const bodyObj =
    request.body && typeof request.body === 'object'
      ? (request.body as Record<string, unknown>)
      : null;
  const forwardedUa = String(
    request.headers['x-original-user-agent'] ||
      request.headers['x-forwarded-user-agent'] ||
      (bodyObj?.userAgent as string | undefined) ||
      ''
  ).trim();
  const rawUa = String(request.headers['user-agent'] || '').trim();
  const effectiveUa = forwardedUa || rawUa;

  if (!effectiveUa || effectiveUa.length < 4) {
    return true;
  }

  if (SECURITY_SCANNER_UA_REGEX.test(effectiveUa)) {
    return true;
  }

  // Server-side Next.js fetches (SSR of /offerta/[token]/page.tsx) carry UA "node" or "undici"
  if (SSR_RUNTIME_UA_REGEX.test(effectiveUa) && !options?.allowNextProxyPost) {
    return true;
  }

  // Gateway antivirus sandboxes often click links within 0-3s of SMTP delivery
  if (draft?.sentAt) {
    const elapsedMs = Date.now() - new Date(draft.sentAt).getTime();
    if (elapsedMs >= 0 && elapsedMs < 3500) {
      return true;
    }
  }

  return false;
}

async function trackCatalogOpenAndNotifyAgent(
  token: string,
  skipIncrement = true,
  request?: FastifyRequest,
  allowNextProxyPost = false
) {
  const cleanToken = (token || '').trim();
  if (!cleanToken || cleanToken.length < 6) return null;

  const draft = await sdrPrisma.sdrOutreachDraft.findUnique({
    where: { trackingToken: cleanToken },
    include: { prospect: true },
  });

  if (!draft || !draft.prospect) return null;
  const prospect = draft.prospect;

  const scannerDetected = request
    ? isAutomatedSecurityScanner(request, draft, { allowNextProxyPost })
    : false;
  const shouldIncrement = !skipIncrement && !scannerDetected;

  const promoProspectLookup = prospect.promoProspectId
    ? await b2bPrisma.b2BPromoProspect.findUnique({
        where: { id: prospect.promoProspectId },
        select: {
          id: true,
          username: true,
          tempPassword: true,
          mustChangePassword: true,
          status: true,
          discount: true,
        },
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
        select: {
          id: true,
          username: true,
          tempPassword: true,
          mustChangePassword: true,
          status: true,
          discount: true,
        },
      });

  let openCount = draft.catalogOpenCount || 0;
  let openedAt = draft.catalogOpenedAt || new Date();
  let incrementedNow = false;

  if (shouldIncrement) {
    // 2s micro-debounce against React StrictMode double-effects while allowing real re-opens
    const microDedupKey = `sdr:engage:micro:${draft.id}`;
    const isDuplicateBurst = await redisConnection
      .set(microDedupKey, '1', 'EX', 2, 'NX')
      .then((res: string | null) => res !== 'OK')
      .catch(() => false);

    if (!isDuplicateBurst) {
      const now = new Date();
      const updatedDraft = await sdrPrisma.sdrOutreachDraft.update({
        where: { id: draft.id },
        data: {
          catalogOpenedAt: now,
          catalogOpenCount: { increment: 1 },
        },
      });
      openCount = updatedDraft.catalogOpenCount;
      openedAt = updatedDraft.catalogOpenedAt || now;
      incrementedNow = true;

      if (
        prospect.pipelineStatus === 'Da_Contattare' ||
        prospect.pipelineStatus === 'Nuovo' ||
        prospect.pipelineStatus === 'Pronto_Invio' ||
        prospect.pipelineStatus === 'Contattato' ||
        prospect.pipelineStatus === 'Credenziali_Create' ||
        prospect.pipelineStatus === 'Email_Inviata' ||
        prospect.pipelineStatus === 'Inviata_Dry_Run'
      ) {
        await sdrPrisma.sdrProspect
          .update({
            where: { id: prospect.id },
            data: { pipelineStatus: 'Catalogo_Aperto' },
          })
          .catch(() => {});
      }

      // Sincronizza subito catalogOpenCount, catalogOpenedAt e smartOfferToken su b2b_promo_prospects
      if (promoProspectLookup?.id) {
        await b2bPrisma.b2BPromoProspect
          .update({
            where: { id: promoProspectLookup.id },
            data: {
              catalogOpenCount: openCount,
              catalogOpenedAt: openedAt,
              smartOfferToken: cleanToken,
            } as any,
          })
          .catch((syncErr: any) => {
            log.warn(
              `Sync b2b_promo_prospects apertura catalogo non riuscita: ${syncErr.message}`,
              { module: 'api-gateway:sdr:offer' }
            );
          });
      } else {
        await b2bPrisma.b2BPromoProspect
          .updateMany({
            where: { sdrProspectId: prospect.id },
            data: {
              catalogOpenCount: openCount,
              catalogOpenedAt: openedAt,
              smartOfferToken: cleanToken,
            } as any,
          })
          .catch(() => {});
      }

      addSdrLog(
        'TRACKER-PDF',
        `[👀 APERTURA UMANA CATALISTINO] ${prospect.companyName} (${prospect.city}, ${prospect.province}) ha consultato l'Offerta / Catalistino Riservato (apertura #${openCount})!`,
        'SUCCESS'
      );

      // Rate-limit instant Brevo alert per draft (1 alert every 30 min max)
      const alertLockKey = `sdr:alert:open:${draft.id}`;
      const alreadyAlertedRecently = await redisConnection
        .set(alertLockKey, '1', 'EX', 1800, 'NX')
        .then((res: string | null) => res !== 'OK')
        .catch(() => false);

      if (!alreadyAlertedRecently) {
        const agent = await resolveSdrAgent(
          draft.assignedAgentId ||
            draft.assignedAgentCode ||
            prospect.assignedAgentId ||
            prospect.assignedAgentCode
        );
        const catCfg = resolveClusterConfig(prospect.categoryCluster, prospect.commercialCategory);
        const config = await sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } });
        const extraPct =
          catCfg.commercialCategory === 'RIV'
            ? Number(config?.rivExtraDiscountPct ?? 10)
            : Number(config?.istExtraDiscountPct ?? 10);

        await sendBrevoAgentAlert({
          toEmail: agent.email,
          toName: agent.name,
          subject: `👀 [CALDO] ${prospect.companyName} (${prospect.city}) ha appena aperto il Catalistino Riservato!`,
          tag: 'sdr-catalog-opened',
          htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px;">
            <h2 style="color: #15803d; margin-bottom: 8px;">👀 Apertura Reale Catalistino Riservato!</h2>
            <p>Ciao <strong>${escapeHtml(agent.name)}</strong>, il prospect ha appena aperto in un browser reale la sua offerta e il <strong>Catalistino Riservato</strong>:</p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px; margin: 16px 0;">
              <div><strong>Azienda:</strong> ${escapeHtml(prospect.companyName)}</div>
              <div><strong>Località:</strong> ${escapeHtml(prospect.city)} (${escapeHtml(prospect.province)}) — ${escapeHtml(prospect.region)}</div>
              <div><strong>Cluster:</strong> ${escapeHtml(catCfg.label)} [${catCfg.commercialCategory} ${catCfg.baseDiscount}% + ${extraPct}%]</div>
              <div><strong>Telefono / WhatsApp:</strong> ${escapeHtml(prospect.phone || prospect.whatsappPhone || 'N/D')}</div>
              <div><strong>Email:</strong> ${escapeHtml(prospect.ordinaryEmail || 'N/D')}</div>
              <div><strong>Username Portale B2B:</strong> <code>${escapeHtml(promoProspectLookup?.username || prospect.promotedUsername || 'N/D')}</code></div>
              <div><strong>Aperture umane registrate:</strong> <strong>${openCount}</strong> (ultima: ${openedAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })})</div>
            </div>
            <p style="font-size: 13px; color: #475569;">Suggerimento: trovi il lead già evidenziato tra i <strong>Lead Caldi da Gestire</strong> nella tua Area Agente sul Portale B2B.</p>
          </div>`,
        });
      }
    }
  } else if (scannerDetected && !skipIncrement) {
    addSdrLog(
      'ANTI-SCANNER',
      `[🛡️ BOT/ANTIVIRUS IGNORATO] Ignorata scansione automatica per ${prospect.companyName} (metodo=${request?.method}, UA="${String(request?.headers['user-agent'] || '').slice(0, 60)}").`,
      'INFO'
    );
  }

  const [config, agent] = await Promise.all([
    sdrPrisma.sdrOutreachConfig.findUnique({ where: { id: 'default' } }),
    resolveSdrAgent(
      draft.assignedAgentId ||
        draft.assignedAgentCode ||
        prospect.assignedAgentId ||
        prospect.assignedAgentCode
    ),
  ]);

  const catCfg = resolveClusterConfig(prospect.categoryCluster, prospect.commercialCategory);
  const baseDiscount = catCfg.baseDiscount;
  const extraDiscount =
    catCfg.commercialCategory === 'RIV'
      ? Number(config?.rivExtraDiscountPct ?? 10)
      : Number(config?.istExtraDiscountPct ?? 10);
  const effectiveNetPct = Number(
    (100 - (100 - baseDiscount) * (1 - extraDiscount / 100)).toFixed(1)
  );
  const b2bBase = (env.B2B_PUBLIC_URL || 'https://www.izzodistribuzione.it').replace(/\/$/, '');
  const username = promoProspectLookup?.username || prospect.promotedUsername || '';
  const tempPassword = promoProspectLookup?.tempPassword || null;
  const mustChangePassword = Boolean(promoProspectLookup?.mustChangePassword ?? true);
  const promoProspectId = promoProspectLookup?.id || prospect.promoProspectId || null;

  return {
    draft,
    prospect,
    promoProspect: promoProspectLookup,
    promoProspectId,
    agent,
    config,
    catCfg,
    openCount,
    openedAt,
    incrementedNow,
    scannerDetected,
    baseDiscount,
    extraDiscount,
    discountFormula: `${baseDiscount}% + ${extraDiscount}%`,
    effectiveNetPct,
    username,
    tempPassword,
    mustChangePassword,
    b2bBase,
    loginUrl: username
      ? `${b2bBase}/login?u=${encodeURIComponent(username)}`
      : `${b2bBase}/login`,
    autoLoginUrl: `${b2bBase}/api/offerta/${encodeURIComponent(cleanToken)}/auto-login`,
  };
}

function formatCleanOfferTexts(config?: {
  offerTitle?: string | null;
  minOrderAmountText?: string | null;
  freeShippingText?: string | null;
} | null) {
  const offerTitle =
    (config?.offerTitle || '').trim() ||
    'Invito conoscitivo e sconto di benvenuto sul primo ordine';
  const cleanMinOrder =
    (config?.minOrderAmountText || "Nessun minimo d'ordine")
      .replace(/\(?\s*(?:solo\s*)?2gg\s*\)?/gi, '')
      .trim() || "Nessun minimo d'ordine";
  const cleanShipping =
    (config?.freeShippingText || 'Spedizione curata e tracciata in tutta Italia')
      .replace(/\(?\s*(?:pronta\s+consegna\s*)?2gg\s*\)?/gi, '')
      .replace(/\b24\/48\s*(?:h|ore)\b/gi, '')
      .replace(/da\s+Deposito\s+Principale/gi, 'in tutta Italia')
      .replace(/\s{2,}/g, ' ')
      .trim() || 'Spedizione curata e tracciata in tutta Italia';

  return { offerTitle, cleanMinOrder, cleanShipping };
}

export async function publicSdrOfferRoutes(fastify: FastifyInstance) {
  // 1. JSON Metadata Read-Only per SSR Storefront (skipIncrement = true per non contare mai SSR o antivirus!)
  fastify.get('/api/public/sdr/offerta/:token/meta', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const ctx = await trackCatalogOpenAndNotifyAgent(token, true, request);
      if (!ctx) {
        return reply
          .status(404)
          .send({ success: false, error: 'Offerta riservata non trovata o link scaduto.' });
      }

      const apiBase = (
        env.API_PUBLIC_URL || 'https://api-gateway-v2-development.up.railway.app'
      ).replace(/\/$/, '');

      const { offerTitle, cleanMinOrder, cleanShipping } = formatCleanOfferTexts(ctx.config);

      return reply.send({
        success: true,
        offer: {
          companyName: ctx.prospect.companyName,
          city: ctx.prospect.city,
          province: ctx.prospect.province,
          commercialCategory: ctx.catCfg.commercialCategory,
          categoryCluster: ctx.catCfg.cluster,
          clusterLabel: ctx.catCfg.label,
          username: ctx.username,
          tempPassword: ctx.tempPassword,
          mustChangePassword: ctx.mustChangePassword,
          promoProspectId: ctx.promoProspectId,
          baseDiscount: ctx.baseDiscount,
          extraDiscount: ctx.extraDiscount,
          extraFirstPurchasePct: ctx.extraDiscount,
          discountFormula: ctx.discountFormula,
          effectiveNetPct: ctx.effectiveNetPct,
          offerTitle,
          minOrderText: cleanMinOrder,
          minOrderAmountText: cleanMinOrder,
          shippingText: cleanShipping,
          freeShippingText: cleanShipping,
          assignedAgentName: ctx.agent.name,
          agentName: ctx.agent.name,
          assignedAgentEmail: ctx.agent.email,
          agentEmail: ctx.agent.email,
          assignedAgentPhone: ctx.agent.phone,
          agentPhone: ctx.agent.phone,
          loginUrl: ctx.loginUrl,
          autoLoginUrl: ctx.autoLoginUrl,
          pdfInlineUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?track=0`,
          pdfDownloadUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?download=1`,
          openCount: ctx.openCount,
        },
      });
    } catch (error: any) {
      log.error(`Errore GET /api/public/sdr/offerta/:token/meta: ${error.message}`, {
        module: 'api-gateway:sdr:offer',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 1B. Endpoint Pubblico Beacon Presenza Umana Reale (chiamato dopo 1.5s dal browser reale o dal proxy Next)
  fastify.post('/api/public/sdr/offerta/:token/engage', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const ctx = await trackCatalogOpenAndNotifyAgent(token, false, request, true);
      if (!ctx) {
        return reply
          .status(404)
          .send({ success: false, error: 'Offerta riservata non trovata.' });
      }

      return reply.send({
        success: true,
        tracked: ctx.incrementedNow,
        scannerFiltered: ctx.scannerDetected,
        openCount: ctx.openCount,
        openedAt: ctx.openedAt,
      });
    } catch (error: any) {
      log.error(`Errore POST /api/public/sdr/offerta/:token/engage: ${error.message}`, {
        module: 'api-gateway:sdr:offer',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 2. Direct Binary PDF Stream (conta apertura solo su download esplicito ?download=1 da browser umano)
  fastify.get('/api/public/sdr/offerta/:token/pdf', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const q = request.query as { download?: string; track?: string };
      const isExplicitHumanDownload = q.download === '1' && q.track !== '0';
      const ctx = await trackCatalogOpenAndNotifyAgent(
        token,
        !isExplicitHumanDownload,
        request
      );
      if (!ctx) {
        return reply
          .status(404)
          .send({ success: false, error: 'Catalistino riservato non trovato.' });
      }

      const generated = await generateProspectReservedCatalogPdf({
        prospectId: ctx.prospect.id,
      });

      const disposition = q.download === '1' ? 'attachment' : 'inline';
      return reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `${disposition}; filename="${generated.pdfFileName}"`
        )
        .header('Cache-Control', 'private, max-age=1800')
        .send(generated.pdfBuffer);
    } catch (error: any) {
      log.error(`Errore GET /api/public/sdr/offerta/:token/pdf: ${error.message}`, {
        module: 'api-gateway:sdr:offer',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // 3. Branded Responsive HTML Landing Page Standalone (anti-scanner + credenziali + beacon 1.5s)
  fastify.get('/api/public/sdr/offerta/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      // skipIncrement = true on GET HTML: il conteggio avviene solo via JS beacon /engage dopo 1.5s di presenza reale!
      const ctx = await trackCatalogOpenAndNotifyAgent(token, true, request);
      if (!ctx) {
        return reply
          .status(404)
          .type('text/html; charset=utf-8')
          .send(
            `<!doctype html><html lang="it"><head><meta charset="utf-8"/><title>Offerta Riservata B2B — Izzo Distribuzione</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Link offerta non trovato o non più attivo</h2><p>Accedi direttamente su <a href="https://www.izzodistribuzione.it/login">www.izzodistribuzione.it</a></p></body></html>`
          );
      }

      const encodedToken = encodeURIComponent(token);
      const pdfInlinePath = `/api/public/sdr/offerta/${encodedToken}/pdf?track=0`;
      const pdfDownloadPath = `/api/public/sdr/offerta/${encodedToken}/pdf?download=1`;
      const engagePath = `/api/public/sdr/offerta/${encodedToken}/engage`;

      const { cleanMinOrder, cleanShipping } = formatCleanOfferTexts(ctx.config);
      const passLabel = ctx.tempPassword
        ? ctx.tempPassword
        : 'Password personale già attivata';

      const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Catalistino Illustrativo per ${escapeHtml(ctx.prospect.companyName)} — Izzo Distribuzione S.r.l.</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #0f172a; }
    .topbar { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 20px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .brand span { color: #4ade80; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; border: 0; cursor: pointer; }
    .btn-primary { background: #16a34a; color: #fff; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35); }
    .btn-secondary { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.28); }
    .container { max-width: 1180px; margin: 20px auto; padding: 0 16px 28px; }
    .hero { background: #fff; border-radius: 16px; padding: 22px 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; margin-bottom: 16px; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .meta { color: #475569; font-size: 14px; line-height: 1.6; }
    .promo-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 12px; padding: 14px 18px; min-width: 270px; }
    .promo-val { font-size: 24px; font-weight: 900; color: #15803d; }
    .creds-card { background: #ffffff; border-radius: 16px; padding: 18px 22px; border: 2px solid #16a34a; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(22, 163, 74, 0.08); }
    .creds-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin-top: 10px; }
    .cred-item { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .cred-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; }
    .cred-val { font-size: 14.5px; font-weight: 800; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .copy-btn { background: #e2e8f0; border: 0; border-radius: 6px; padding: 5px 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; color: #0f172a; }
    .save-notice { margin-top: 12px; background: #fefce8; border: 1px solid #fde047; color: #854d0e; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; }
    .viewer { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; height: calc(100vh - 280px); min-height: 620px; }
    iframe { width: 100%; height: 100%; border: 0; }
    .legal-footer { margin-top: 18px; text-align: center; font-size: 12.5px; color: #475569; line-height: 1.6; padding: 12px 16px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="brand">IZZO DISTRIBUZIONE <span>S.r.l.</span> — Portale B2B</div>
      <div style="font-size:12px;opacity:0.85;">Referente commerciale: ${escapeHtml(ctx.agent.name)} • Tel / WhatsApp: ${escapeHtml(ctx.agent.phone || '+39 389 0129832')} (${escapeHtml(ctx.agent.email)})</div>
    </div>
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(ctx.autoLoginUrl)}">🚀 Entra Subito nel Portale coi Tuoi Prezzi (1 Clic)</a>
      <a class="btn btn-secondary" href="${pdfDownloadPath}">📥 Scarica Catalistino PDF (con Credenziali)</a>
    </div>
  </div>
  <div class="container">
    <div class="hero">
      <div>
        <div class="badge">CONSULTAZIONE GRATUITA E SENZA IMPEGNO • INVITO FORNITORE B2B</div>
        <h1>Catalistino Illustrativo per ${escapeHtml(ctx.prospect.companyName)}</h1>
        <div class="meta">
          ✅ <strong>Accesso B2B gratuito predisposto per Vostra comodità, senza alcun costo né vincolo</strong><br/>
          🚚 ${escapeHtml(cleanMinOrder)} • ${escapeHtml(cleanShipping)}<br/>
          🏷️ Prezzi netti B2B calcolati con Sconto Base <strong>${ctx.baseDiscount}%</strong> + Benvenuto 1° Ordine <strong>+${ctx.extraDiscount}%</strong>
        </div>
      </div>
      <div class="promo-box">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Sconto di Benvenuto 1° Ordine</div>
        <div class="promo-val">${escapeHtml(ctx.discountFormula)}</div>
        <div style="font-size:12px;color:#334155;">Pari al <strong>${ctx.effectiveNetPct}% netto</strong> da listino (zero minimo d’ordine)</div>
      </div>
    </div>

    ${
      ctx.username
        ? `<div class="creds-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="font-weight:800;font-size:15px;color:#15803d;">🔐 Le Tue Credenziali Riservate per il Portale B2B</div>
        <a href="${escapeHtml(ctx.loginUrl)}" style="font-size:12.5px;font-weight:700;color:#15803d;">www.izzodistribuzione.it/login ↗</a>
      </div>
      <div class="creds-grid">
        <div class="cred-item">
          <div>
            <div class="cred-label">Utente Riservato</div>
            <div class="cred-val" id="sdr-user">${escapeHtml(ctx.username)}</div>
          </div>
          <button type="button" class="copy-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(ctx.username)})">Copia</button>
        </div>
        <div class="cred-item">
          <div>
            <div class="cred-label">Password Provvisoria</div>
            <div class="cred-val" id="sdr-pass">${escapeHtml(passLabel)}</div>
          </div>
          ${
            ctx.tempPassword
              ? `<button type="button" class="copy-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(ctx.tempPassword)})">Copia</button>`
              : ''
          }
        </div>
      </div>
      <div class="save-notice">
        💡 Per salvare e conservare le tue credenziali riservate scarica il Catalistino PDF — le trovi stampate anche all'interno del documento!
      </div>
    </div>`
        : ''
    }

    <div class="viewer">
      <iframe src="${pdfInlinePath}" title="Catalistino PDF Illustrativo"></iframe>
    </div>
    <div class="legal-footer">
      <strong>Izzo Distribuzione S.r.l.</strong> — Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049<br/>
      Tel / WhatsApp: +39 389 0129832 • Email: daniele.savoia@izzodistribuzione.com • Portale B2B: <a href="https://www.izzodistribuzione.it" style="color:#15803d;font-weight:600;">www.izzodistribuzione.it</a>
    </div>
  </div>
  <script>
    (function () {
      if (navigator.webdriver) return;
      var fired = false;
      function sendEngage() {
        if (fired || document.visibilityState === 'hidden') return;
        fired = true;
        fetch(${JSON.stringify(engagePath)}, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'standalone_offer_page', userAgent: navigator.userAgent }),
          keepalive: true
        }).catch(function () {});
      }
      function armTimer() {
        setTimeout(function () {
          if (document.visibilityState !== 'hidden') sendEngage();
        }, 1500);
      }
      if (document.visibilityState !== 'hidden') {
        armTimer();
      } else {
        document.addEventListener('visibilitychange', function onVis() {
          if (document.visibilityState !== 'hidden') {
            document.removeEventListener('visibilitychange', onVis);
            armTimer();
          }
        });
      }
    })();
  </script>
</body>
</html>`;

      return reply.type('text/html; charset=utf-8').send(html);
    } catch (error: any) {
      log.error(`Errore GET /api/public/sdr/offerta/:token: ${error.message}`, {
        module: 'api-gateway:sdr:offer',
      });
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
