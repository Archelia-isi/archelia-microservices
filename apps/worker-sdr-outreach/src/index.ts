import { Worker, Job } from 'bullmq';
import * as crypto from 'crypto';
import { createRedisConnection, env, log } from '@archelia/core';
import {
  sdrPrisma,
  resolveCommercialCategoryFromCluster,
} from '@archelia/sdr-database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';

const MODULE_NAME = 'worker-sdr-outreach';
const DANIELE_SAVOIA_ID = 'cmtu64h1c0000jk0sb1ho1o49';
const DANIELE_SAVOIA_CODE = '003';

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
    .filter(w => w.length >= 2 && !stopWords.has(w));

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
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

async function hashPasswordBcryptOrFallback(plain: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(plain, 10);
  } catch {
    return crypto.createHash('sha256').update(plain).digest('hex');
  }
}

/**
 * Crea o recupera il record in b2b_promo_prospects (assegnato a Daniele Savoia),
 * genera lo username definitivo, la password temporanea e la regola di sconto "Sul primo acquisto" (FIRST_PURCHASE),
 * e compila la bozza email + catalogo PDF allegato secondo sdr_outreach_configs.
 */
export async function prepareOutreachPackageForProspect(prospectId: number) {
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

  // Controlla blacklist
  const blacklisted = await sdrPrisma.sdrBlacklist.findFirst({
    where: {
      OR: [{ emailOrDomain: email }, { emailOrDomain: email.split('@')[1] || '' }],
    },
  });
  if (blacklisted) {
    throw new Error(`Email/dominio in blacklist (${blacklisted.reason}): ${email}`);
  }

  const resolvedCat = resolveCommercialCategoryFromCluster(prospect.categoryCluster);
  const commercialCategory = resolvedCat.commercialCategory;
  const baseDiscount = resolvedCat.baseDiscount;

  const enableFirstPurchaseRule = configRow?.enableFirstPurchaseRule ?? true;
  const extraDiscountPct =
    commercialCategory === 'RIV'
      ? Number(configRow?.rivExtraDiscountPct ?? 10)
      : Number(configRow?.istExtraDiscountPct ?? 10);
  const discountFormulaLabel = `${baseDiscount}% + ${extraDiscountPct}%`;
  const catalistinoTitle = `Catalistino Riservato a ${prospect.companyName}`;
  const catalistinoSubtitle = `Offerta esclusiva valida per il primo acquisto — Sconto Riservato ${discountFormulaLabel}`;
  const minOrderAmountText =
    configRow?.minOrderAmountText || "Nessun minimo d'ordine sul tuo 1° acquisto";
  const freeShippingText =
    configRow?.freeShippingText ||
    'Spedizione rapida 24/48h in tutta Italia da Deposito Principale (2gg)';
  const paymentTermsText =
    configRow?.paymentTermsText || 'Condizioni B2B riservate con referente dedicato Daniele Savoia';
  const attachCatalogPdf = configRow?.attachCatalogPdf ?? true;

  // 1. Verifica se esiste già in b2b_promo_prospects
  let promo = await b2bPrisma.b2BPromoProspect.findUnique({
    where: { sdrProspectId: prospect.id },
  });

  let tempPassword = promo?.tempPassword || '';

  if (!promo) {
    // Genera username definitivo unico sia su b2b_users sia su b2b_promo_prospects
    const baseUsername = buildSmartPermanentUsername(prospect.companyName);
    let finalUsername = baseUsername;
    let counter = 0;
    while (counter < 50) {
      const [dupActive, dupPromo] = await Promise.all([
        b2bPrisma.b2BUser.findUnique({ where: { username: finalUsername } }),
        b2bPrisma.b2BPromoProspect.findUnique({ where: { username: finalUsername } }),
      ]);
      if (!dupActive && !dupPromo) break;
      counter++;
      finalUsername = `${baseUsername}${counter}`;
    }

    tempPassword = generateTempPassword();
    const passwordHash = await hashPasswordBcryptOrFallback(tempPassword);

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
        categoryCluster: prospect.categoryCluster,
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
        agentId: configRow?.defaultAgentId || DANIELE_SAVOIA_ID,
        agentCode: configRow?.defaultAgentCode || DANIELE_SAVOIA_CODE,
        orderDetailsSnapshot: {
          offerTitle: catalistinoSubtitle,
          minOrderAmountText,
          freeShippingText,
          paymentTermsText,
          baseDiscount,
          extraDiscountPct: enableFirstPurchaseRule ? extraDiscountPct : 0,
          discountFormula: discountFormulaLabel,
        },
        attachedCatalogMeta: attachCatalogPdf
          ? {
              fileName: `Catalistino_Riservato_${prospect.companyName
                .replace(/[^a-zA-Z0-9]/g, '_')
                .slice(0, 28)}.pdf`,
              catalogTitle: catalistinoTitle,
              catalogSubtitle: catalistinoSubtitle,
              warehouse: 'MAIN_2GG',
              stockDisplayMode: 'BADGE_ONLY',
              priceDisplayMode: 'LIST_AND_NET',
              discountFormula: discountFormulaLabel,
              baseDiscount,
              extraDiscountPct,
              maxProducts: 250,
            }
          : undefined,
        status: 'CONTACTED',
      },
    });
  }

  // 2. Auto-genera la regola di sconto "Sul primo acquisto" (FIRST_PURCHASE, X% + Y%, Solo 2gg)
  // sia in b2b_discount_rules (OS) sia in b2b_agent_discount_rules (Storefront B2B)
  let firstPurchaseRuleId: string | null = null;
  if (enableFirstPurchaseRule && extraDiscountPct > 0) {
    firstPurchaseRuleId = `sdr_fp_${promo.id}`;
    const ruleName = `Primo Acquisto (${discountFormulaLabel} Solo 2gg) — ${promo.companyName}`;

    await b2bPrisma.b2BDiscountRule.upsert({
      where: { id: firstPurchaseRuleId },
      create: {
        id: firstPurchaseRuleId,
        name: ruleName,
        agentId: promo.agentId,
        agentCode: promo.agentCode,
        clientScope: 'SINGLE_CLIENT',
        clientId: promo.id,
        clientName: promo.companyName,
        clientIds: [promo.id],
        clientCategories: [commercialCategory],
        targetType: 'ALL_CATALOG',
        calculationMode: 'EXTRA_CASCADE',
        discountValue: extraDiscountPct,
        expiryType: 'FIRST_PURCHASE',
        isActive: true,
      },
      update: {
        name: ruleName,
        discountValue: extraDiscountPct,
        calculationMode: 'EXTRA_CASCADE',
        expiryType: 'FIRST_PURCHASE',
        isActive: true,
      },
    });

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
      firstPurchaseRuleId,
      promo.agentId,
      promo.agentCode,
      ruleName,
      promo.id,
      promo.username.toUpperCase(),
      promo.companyName,
      JSON.stringify([promo.id]),
      JSON.stringify([promo.username.toUpperCase()]),
      JSON.stringify([
        {
          id: promo.id,
          code: promo.username.toUpperCase(),
          companyName: promo.companyName,
          category: commercialCategory,
          baseDiscount,
        },
      ]),
      JSON.stringify([commercialCategory]),
      extraDiscountPct
    );

    await b2bPrisma.b2BPromoProspect.update({
      where: { id: promo.id },
      data: { firstPurchaseRuleId },
    });
  }

  // 3. Compila il testo e l'HTML dell'email B2B personalizzata + metadati Catalistino PDF allegato
  const catalogFileName = attachCatalogPdf
    ? `Catalistino_Riservato_${prospect.companyName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 28)}.pdf`
    : null;

  const netEffectivePct = Number(
    (
      100 -
      (100 - baseDiscount) * (1 - (enableFirstPurchaseRule ? extraDiscountPct : 0) / 100)
    ).toFixed(1)
  );

  const subject = `${catalistinoTitle} — Offerta valida per il primo acquisto (Sconto ${discountFormulaLabel})`;

  const bodyText = [
    `Gentile ${prospect.companyName},`,
    ``,
    `Izzo Distribuzione S.r.l. (fornitura all'ingrosso di materiale elettrico, illuminazione tecnica e ferramenta per professionisti e rivenditori) ha predisposto il ${catalistinoTitle} e attivato il vostro profilo riservato sul portale B2B www.izzodistribuzione.it.`,
    ``,
    `=== ${catalistinoTitle.toUpperCase()} ===`,
    `${catalistinoSubtitle}`,
    `• Categoria assegnata: ${commercialCategory} (Sconto Riservato 1° Acquisto: ${discountFormulaLabel} su tutti i prodotti in pronta consegna 2gg, netto -${netEffectivePct}%)`,
    `• ${minOrderAmountText}`,
    `• ${freeShippingText}`,
    `• ${paymentTermsText}`,
    ``,
    `=== CREDENZIALI DI ACCESSO AL PORTALE B2B ===`,
    `• Portale B2B: https://www.izzodistribuzione.it/login`,
    `• Username (definitivo): ${promo.username}`,
    `• Password Temporanea 1° Accesso: ${tempPassword || '(già inviata)'}`,
    `(Al primo accesso il sistema vi chiederà di scegliere la vostra password personale in conformità GDPR).`,
    ``,
    attachCatalogPdf
      ? `In allegato trovate il ${catalistinoTitle} (${catalogFileName}) con tutti i prodotti disponibili in pronta consegna 2gg e lo sconto ${discountFormulaLabel}.`
      : null,
    ``,
    `Un cordiale saluto,`,
    `Daniele Savoia — Responsabile Commerciale B2B`,
    `Izzo Distribuzione S.r.l.`,
  ]
    .filter(l => l !== null)
    .join('\n');

  const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; max-width: 640px; margin: 0 auto; line-height: 1.55;">
    <p>Gentile <strong>${prospect.companyName}</strong>,</p>
    <p><strong>Izzo Distribuzione S.r.l.</strong> ha predisposto il <strong>${catalistinoTitle}</strong> e attivato il vostro profilo riservato sul portale B2B dedicato a installatori, professionisti e rivenditori di materiale elettrico, illuminazione e ferramenta.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 18px 0;">
      <div style="font-weight: 800; font-size: 15px; color: #15803d; margin-bottom: 4px;">${catalistinoTitle}</div>
      <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 10px;">${catalistinoSubtitle}</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 14px;">
        <li>Sconto Riservato 1° Acquisto: <strong>${discountFormulaLabel}</strong> su tutti i prodotti in Pronta Consegna 2gg (netto <strong>-${netEffectivePct}%</strong>)</li>
        <li>${minOrderAmountText}</li>
        <li>${freeShippingText}</li>
        <li>${paymentTermsText}</li>
      </ul>
    </div>
    <div style="background: #111827; color: #ffffff; border-radius: 10px; padding: 18px; margin: 18px 0;">
      <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #fbbf24; margin-bottom: 10px;">Le Vostre Credenziali Riservate Portale B2B</div>
      <div style="font-size: 14px; margin-bottom: 6px;">🔗 Portale: <a href="https://www.izzodistribuzione.it/login" style="color: #fbbf24; font-weight: bold;">www.izzodistribuzione.it/login</a></div>
      <div style="font-size: 15px; margin-bottom: 6px;">👤 Username definitivo: <code style="background: #1f2937; padding: 3px 8px; border-radius: 4px; color: #ffffff; font-weight: bold;">${promo.username}</code></div>
      <div style="font-size: 15px; margin-bottom: 8px;">🔑 Password Temporanea: <code style="background: #1f2937; padding: 3px 8px; border-radius: 4px; color: #fbbf24; font-weight: bold;">${
        tempPassword || 'Impostata dal cliente'
      }</code></div>
      <div style="font-size: 11px; color: #9ca3af;">Nota GDPR: Al primo accesso il sistema vi chiederà automaticamente di impostare una password personale.</div>
    </div>
    ${
      attachCatalogPdf
        ? `<p style="font-size: 13px; color: #374151;">📎 <strong>Allegato:</strong> <code>${catalogFileName}</code> (${catalistinoTitle} — ${catalistinoSubtitle}).</p>`
        : ''
    }
    <p style="margin-top: 20px;">Un cordiale saluto,<br/><strong>Daniele Savoia</strong> — Referente Commerciale B2B<br/>Izzo Distribuzione S.r.l.</p>
  </div>`;

  // Salva o aggiorna la bozza su sdr_outreach_drafts
  const existingDraft = await sdrPrisma.sdrOutreachDraft.findFirst({
    where: { prospectId: prospect.id, sequenceStep: 1 },
  });

  const draft = existingDraft
    ? await sdrPrisma.sdrOutreachDraft.update({
        where: { id: existingDraft.id },
        data: {
          subject,
          bodyText,
          bodyHtml,
          attachedCatalogUrl: catalogFileName,
          status: 'Bozza_Pronta',
        },
      })
    : await sdrPrisma.sdrOutreachDraft.create({
        data: {
          prospectId: prospect.id,
          sequenceStep: 1,
          subject,
          bodyText,
          bodyHtml,
          attachedCatalogUrl: catalogFileName,
          status: 'Bozza_Pronta',
        },
      });

  // Aggiorna sdr_prospects con promoProspectId e promotedUsername
  await sdrPrisma.sdrProspect.update({
    where: { id: prospect.id },
    data: {
      promoProspectId: promo.id,
      promotedUsername: promo.username,
      pipelineStatus: 'Credenziali_Create',
      assignedAgentId: promo.agentId,
      assignedAgentCode: promo.agentCode,
    },
  });

  return {
    prospectId: prospect.id,
    promoProspectId: promo.id,
    username: promo.username,
    tempPassword,
    firstPurchaseRuleId,
    draftId: draft.id,
    catalogFileName,
  };
}

/**
 * Dispatcher Outreach SMTP (con verifica rigorosa ENABLE_GLOBAL_WRITES per Dry-Run)
 */
async function dispatchOutreachEmail(draftId: number) {
  const draft = await sdrPrisma.sdrOutreachDraft.findUnique({
    where: { id: draftId },
    include: { prospect: true },
  });
  if (!draft) {
    throw new Error(`Draft #${draftId} non trovata`);
  }

  // Assicura che il prospect abbia il pacchetto credenziali + sconto 1° acquisto + catalogo pronto
  const pkg = await prepareOutreachPackageForProspect(draft.prospectId);

  if (!env.ENABLE_GLOBAL_WRITES) {
    log.info(
      `[DRY-RUN][ENABLE_GLOBAL_WRITES=false] Simulazione invio email B2B a ${draft.prospect.ordinaryEmail} (User: ${pkg.username}, Sconto 1° Acquisto: ${pkg.firstPurchaseRuleId || 'N/A'}, Allegato: ${pkg.catalogFileName || 'Nessuno'})`,
      {
        module: MODULE_NAME,
        draftId,
        prospectId: draft.prospectId,
        username: pkg.username,
      }
    );

    await sdrPrisma.sdrOutreachDraft.update({
      where: { id: draft.id },
      data: {
        status: 'Inviata_DryRun',
        sentAt: new Date(),
      },
    });

    await sdrPrisma.sdrProspect.update({
      where: { id: draft.prospectId },
      data: {
        pipelineStatus: 'Contattato',
      },
    });

    return { dryRun: true, ...pkg };
  }

  // Se ENABLE_GLOBAL_WRITES === true, seleziona un account SMTP attivo sotto soglia giornaliera
  const inbox = await sdrPrisma.sdrInboxAccount.findFirst({
    where: { isActive: true },
    orderBy: { sentToday: 'asc' },
  });

  if (inbox) {
    await sdrPrisma.sdrInboxAccount.update({
      where: { id: inbox.id },
      data: {
        sentToday: { increment: 1 },
        lastSentAt: new Date(),
      },
    });
  }

  await sdrPrisma.sdrOutreachDraft.update({
    where: { id: draft.id },
    data: {
      status: 'Inviata',
      senderInboxId: inbox?.id || null,
      sentAt: new Date(),
    },
  });

  await sdrPrisma.sdrProspect.update({
    where: { id: draft.prospectId },
    data: {
      pipelineStatus: 'Contattato',
    },
  });

  log.info(
    `[SDR Outreach] Email B2B inviata a ${draft.prospect.ordinaryEmail} (User: ${pkg.username})`,
    { module: MODULE_NAME, draftId, prospectId: draft.prospectId }
  );

  return { dryRun: false, ...pkg };
}

async function processOutreachJob(job: Job) {
  const { action, prospectId, prospectIds, draftId, draftIds } = job.data || {};

  if (action === 'PREPARE_PACKAGE' && prospectId) {
    return await prepareOutreachPackageForProspect(Number(prospectId));
  }

  if (action === 'PREPARE_BATCH' && Array.isArray(prospectIds)) {
    const results = [];
    for (const pid of prospectIds) {
      try {
        const r = await prepareOutreachPackageForProspect(Number(pid));
        results.push({ success: true, ...r });
      } catch (e: any) {
        results.push({ success: false, prospectId: pid, error: e.message });
      }
    }
    return { count: results.length, results };
  }

  if (action === 'SEND_DRAFT' && draftId) {
    return await dispatchOutreachEmail(Number(draftId));
  }

  if (action === 'SEND_BATCH' && Array.isArray(draftIds)) {
    const results = [];
    for (const did of draftIds) {
      try {
        const r = await dispatchOutreachEmail(Number(did));
        results.push({ success: true, ...r });
      } catch (e: any) {
        results.push({ success: false, draftId: did, error: e.message });
      }
    }
    return { count: results.length, results };
  }

  return { status: 'noop' };
}

async function startWorker() {
  const connection = createRedisConnection();

  const copywriterWorker = new Worker('sdr-copywriter-queue', processOutreachJob, {
    connection: connection as any,
    concurrency: 3,
  });

  const outreachWorker = new Worker('sdr-outreach-queue', processOutreachJob, {
    connection: connection as any,
    concurrency: 2,
  });

  copywriterWorker.on('completed', job => {
    log.info(`[SDR Copywriter] Job ${job.id} completato`, { module: MODULE_NAME });
  });

  copywriterWorker.on('failed', (job, err) => {
    log.error(`[SDR Copywriter] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  outreachWorker.on('completed', job => {
    log.info(`[SDR Outreach] Job ${job.id} completato`, { module: MODULE_NAME });
  });

  outreachWorker.on('failed', (job, err) => {
    log.error(`[SDR Outreach] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  log.info('🚀 Worker AI-SDR Copywriter & Outreach B2B avviato in ascolto su Redis', {
    module: MODULE_NAME,
  });
}

startWorker().catch(err => {
  log.error(`Errore fatale avvio ${MODULE_NAME}: ${err.message}`, { module: MODULE_NAME });
  process.exit(1);
});
