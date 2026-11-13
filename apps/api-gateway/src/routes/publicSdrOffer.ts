import { FastifyInstance } from 'fastify';
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

async function trackCatalogOpenAndNotifyAgent(token: string, skipIncrement = false) {
  const cleanToken = (token || '').trim();
  if (!cleanToken || cleanToken.length < 6) return null;

  const draft = await sdrPrisma.sdrOutreachDraft.findUnique({
    where: { trackingToken: cleanToken },
    include: { prospect: true },
  });

  if (!draft || !draft.prospect) return null;
  const prospect = draft.prospect;

  let openCount = draft.catalogOpenCount || 0;
  let openedAt = draft.catalogOpenedAt || new Date();

  if (!skipIncrement) {
    const updatedDraft = await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: {
        catalogOpenedAt: draft.catalogOpenedAt || new Date(),
        catalogOpenCount: { increment: 1 },
      },
    });
    openCount = updatedDraft.catalogOpenCount;
    openedAt = updatedDraft.catalogOpenedAt || new Date();

    if (
      prospect.pipelineStatus === 'Da_Contattare' ||
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

    addSdrLog(
      'TRACKER-PDF',
      `[👀 APERTURA CATALISTINO] ${prospect.companyName} (${prospect.city}, ${prospect.province}) ha aperto il Catalistino Riservato 2gg (apertura #${openCount})!`,
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
        subject: `👀 [CALDO] ${prospect.companyName} (${prospect.city}) ha appena aperto il Catalistino 2gg!`,
        tag: 'sdr-catalog-opened',
        htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px;">
          <h2 style="color: #15803d; margin-bottom: 8px;">👀 Apertura Catalistino Riservato Rilevata!</h2>
          <p>Ciao <strong>${escapeHtml(agent.name)}</strong>, il prospect ha appena cliccato e consultato il suo <strong>Catalistino Riservato Pronta Consegna 2gg</strong>:</p>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <div><strong>Azienda:</strong> ${escapeHtml(prospect.companyName)}</div>
            <div><strong>Località:</strong> ${escapeHtml(prospect.city)} (${escapeHtml(prospect.province)}) — ${escapeHtml(prospect.region)}</div>
            <div><strong>Cluster:</strong> ${escapeHtml(catCfg.label)} [${catCfg.commercialCategory} ${catCfg.baseDiscount}% + ${extraPct}%]</div>
            <div><strong>Telefono / WhatsApp:</strong> ${escapeHtml(prospect.phone || prospect.whatsappPhone || 'N/D')}</div>
            <div><strong>Email:</strong> ${escapeHtml(prospect.ordinaryEmail || 'N/D')}</div>
            <div><strong>Username Portale B2B:</strong> <code>${escapeHtml(prospect.promotedUsername || 'N/D')}</code></div>
            <div><strong>Aperture registrate:</strong> <strong>${openCount}</strong> (ultima: ${openedAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })})</div>
          </div>
          <p style="font-size: 13px; color: #475569;">Suggerimento: questo è il momento migliore per una chiamata conoscitiva veloce mentre stanno guardando i prezzi netti riservati.</p>
        </div>`,
      });
    }
  }

  const [promoProspect, config, agent] = await Promise.all([
    prospect.promoProspectId
      ? b2bPrisma.b2BPromoProspect.findUnique({
          where: { id: prospect.promoProspectId },
          select: {
            username: true,
            status: true,
            discount: true,
          },
        })
      : Promise.resolve(null),
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
  const username = promoProspect?.username || prospect.promotedUsername || '';

  return {
    draft,
    prospect,
    agent,
    config,
    catCfg,
    openCount,
    openedAt,
    baseDiscount,
    extraDiscount,
    discountFormula: `${baseDiscount}% + ${extraDiscount}%`,
    effectiveNetPct,
    username,
    loginUrl: username
      ? `${b2bBase}/login?u=${encodeURIComponent(username)}`
      : `${b2bBase}/login`,
  };
}

export async function publicSdrOfferRoutes(fastify: FastifyInstance) {
  // 1. JSON Metadata + Open Tracking (used by b2b-storefront /offerta/[token])
  fastify.get('/api/public/sdr/offerta/:token/meta', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const ctx = await trackCatalogOpenAndNotifyAgent(token, false);
      if (!ctx) {
        return reply
          .status(404)
          .send({ success: false, error: 'Offerta riservata non trovata o link scaduto.' });
      }

      const apiBase = (
        env.API_PUBLIC_URL || 'https://api-gateway-v2-development.up.railway.app'
      ).replace(/\/$/, '');

      return reply.send({
        success: true,
        offer: {
          companyName: ctx.prospect.companyName,
          city: ctx.prospect.city,
          province: ctx.prospect.province,
          clusterLabel: ctx.catCfg.label,
          commercialCategory: ctx.catCfg.commercialCategory,
          baseDiscount: ctx.baseDiscount,
          extraDiscount: ctx.extraDiscount,
          discountFormula: ctx.discountFormula,
          effectiveNetPct: ctx.effectiveNetPct,
          offerTitle:
            ctx.config?.offerTitle || 'Offerta esclusiva valida per il primo acquisto',
          minOrderAmountText:
            ctx.config?.minOrderAmountText || "Nessun minimo d'ordine sul tuo 1° acquisto",
          freeShippingText:
            ctx.config?.freeShippingText ||
            'Spedizione rapida 24/48h da Deposito Principale (Pronta Consegna 2gg)',
          username: ctx.username,
          loginUrl: ctx.loginUrl,
          pdfInlineUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf`,
          pdfDownloadUrl: `${apiBase}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?download=1`,
          agentName: ctx.agent.name,
          agentEmail: ctx.agent.email,
          agentPhone: ctx.agent.phone,
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

  // 2. Direct Binary PDF Stream
  fastify.get('/api/public/sdr/offerta/:token/pdf', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const q = request.query as { download?: string; track?: string };
      const ctx = await trackCatalogOpenAndNotifyAgent(token, q.track === '0');
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

  // 3. Branded Responsive HTML Landing Page (works standalone even before Storefront deploy)
  fastify.get('/api/public/sdr/offerta/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const ctx = await trackCatalogOpenAndNotifyAgent(token, false);
      if (!ctx) {
        return reply
          .status(404)
          .type('text/html; charset=utf-8')
          .send(
            `<!doctype html><html lang="it"><head><meta charset="utf-8"/><title>Offerta Riservata B2B — Izzo Distribuzione</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Link offerta non trovato o non più attivo</h2><p>Accedi direttamente su <a href="https://www.izzodistribuzione.it/login">www.izzodistribuzione.it</a></p></body></html>`
          );
      }

      const pdfInlinePath = `/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?track=0`;
      const pdfDownloadPath = `/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?download=1&track=0`;

      const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Catalistino Riservato a ${escapeHtml(ctx.prospect.companyName)} — Izzo Distribuzione B2B</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #0f172a; }
    .topbar { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 20px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .brand span { color: #4ade80; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; transition: transform 0.15s ease; }
    .btn-primary { background: #16a34a; color: #fff; }
    .btn-secondary { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.25); }
    .container { max-width: 1180px; margin: 20px auto; padding: 0 16px; }
    .hero { background: #fff; border-radius: 16px; padding: 22px 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; margin-bottom: 18px; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .meta { color: #475569; font-size: 14px; line-height: 1.55; }
    .promo-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 12px; padding: 14px 18px; min-width: 270px; }
    .promo-val { font-size: 24px; font-weight: 900; color: #15803d; }
    .viewer { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; height: calc(100vh - 250px); min-height: 620px; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="brand">IZZO DISTRIBUZIONE <span>B2B</span> — I.S.I. S.r.l.</div>
      <div style="font-size:12px;opacity:0.8;">Referente dedicato: ${escapeHtml(ctx.agent.name)} (${escapeHtml(ctx.agent.email)})</div>
    </div>
    <div class="actions">
      <a class="btn btn-secondary" href="${pdfDownloadPath}">📥 Scarica PDF Riservato (2gg)</a>
      <a class="btn btn-primary" href="${escapeHtml(ctx.loginUrl)}" target="_blank" rel="noopener">🔐 Accedi al Portale B2B${ctx.username ? ` (${escapeHtml(ctx.username)})` : ''}</a>
    </div>
  </div>
  <div class="container">
    <div class="hero">
      <div>
        <div class="badge">PRONTA CONSEGNA 2GG • OFFERTA 1° ACQUISTO RISERVATA</div>
        <h1>Catalistino Riservato a ${escapeHtml(ctx.prospect.companyName)}</h1>
        <div class="meta">
          ✅ <strong>${escapeHtml(ctx.config?.minOrderAmountText || "Nessun minimo d'ordine sul tuo 1° acquisto")}</strong><br/>
          🚚 ${escapeHtml(ctx.config?.freeShippingText || 'Spedizione rapida 24/48h da Deposito Principale')}<br/>
          🏷️ Prezzi netti già calcolati con Sconto Base <strong>${ctx.baseDiscount}%</strong> + Extra 1° Acquisto <strong>+${ctx.extraDiscount}%</strong>
        </div>
      </div>
      <div class="promo-box">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Sconto Attivo a Carrello</div>
        <div class="promo-val">${escapeHtml(ctx.discountFormula)}</div>
        <div style="font-size:12px;color:#334155;">Pari al <strong>${ctx.effectiveNetPct}% netto</strong> sui prodotti 2gg</div>
      </div>
    </div>
    <div class="viewer">
      <iframe src="${pdfInlinePath}" title="Catalistino PDF Riservato"></iframe>
    </div>
  </div>
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
