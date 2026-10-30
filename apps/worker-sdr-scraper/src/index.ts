import { Worker, Job } from 'bullmq';
import dns from 'dns/promises';
import { createRedisConnection, log, redis } from '@archelia/core';
import {
  sdrPrisma,
  resolveCommercialCategoryFromCluster,
} from '@archelia/sdr-database';

const MODULE_NAME = 'worker-sdr-scraper';

// Domini e pattern PEC / spazzatura da scartare rigorosamente (4 livelli Anti-PEC)
const PEC_DOMAIN_KEYWORDS = [
  'pec.',
  'legalmail.',
  'arubapec.',
  'postecert.',
  'cert.cna.',
  'confartigianato.pec',
  'sicurezzapostale.',
  'registerpec.',
  'namirialpec.',
  'infocert.',
  'telecompost.',
  'pecimprese.',
];

const JUNK_EMAIL_PREFIXES = [
  'noreply',
  'no-reply',
  'privacy@',
  'dpo@',
  'gdpr@',
  'abuse@',
  'postmaster@',
  'webmaster@',
  'sentry@',
  'wixpress',
];

export function isPecOrJunkEmail(email: string): { isPec: boolean; isJunk: boolean } {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) return { isPec: false, isJunk: true };
  const [local, domain] = clean.split('@');
  if (!local || !domain || !domain.includes('.')) return { isPec: false, isJunk: true };

  if (JUNK_EMAIL_PREFIXES.some(p => clean.startsWith(p) || clean.includes(p))) {
    return { isPec: false, isJunk: true };
  }

  const isPec =
    PEC_DOMAIN_KEYWORDS.some(k => domain.includes(k)) ||
    domain.startsWith('pec.') ||
    domain.endsWith('.pec.it') ||
    local === 'pec' ||
    local.endsWith('.pec');

  return { isPec, isJunk: false };
}

export async function verifyDomainMxCached(domain: string): Promise<{
  hasMx: boolean;
  isPecMx: boolean;
  mxRecords: string[];
}> {
  const cleanDomain = (domain || '').trim().toLowerCase();
  if (!cleanDomain) return { hasMx: false, isPecMx: false, mxRecords: [] };

  const cacheKey = `sdr:mx:${cleanDomain}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  try {
    const records = await dns.resolveMx(cleanDomain);
    const mxHosts = records
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.exchange.toLowerCase());
    const hasMx = mxHosts.length > 0;
    const isPecMx = mxHosts.some(h =>
      PEC_DOMAIN_KEYWORDS.some(k => h.includes(k.replace(/\.$/, '')))
    );
    const result = { hasMx, isPecMx, mxRecords: mxHosts };
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 7 * 86400);
    } catch {}
    return result;
  } catch {
    const negResult = { hasMx: false, isPecMx: false, mxRecords: [] };
    try {
      await redis.set(cacheKey, JSON.stringify(negResult), 'EX', 3600);
    } catch {}
    return negResult;
  }
}

export function checkItalianVatLuhn(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  if (vat === '00000000000') return false;
  let sumEven = 0;
  let sumOdd = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat.charAt(i), 10);
    if (i % 2 === 0) sumOdd += digit;
    else {
      const d = digit * 2;
      sumEven += d > 9 ? d - 9 : d;
    }
  }
  const check = (10 - ((sumOdd + sumEven) % 10)) % 10;
  return check === parseInt(vat.charAt(10), 10);
}

/**
 * Estrae email standard (non PEC) e P.IVA dal sito web aziendale o da ricerca web
 */
async function enrichSingleProspectWeb(prospectId: number): Promise<{
  foundEmail: string | null;
  foundPec: string | null;
  foundVat: string | null;
  foundWebsite: string | null;
}> {
  const prospect = await sdrPrisma.sdrProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) {
    return { foundEmail: null, foundPec: null, foundVat: null, foundWebsite: null };
  }

  const website = (prospect.website || '').trim();
  let foundEmail: string | null = null;
  let foundPec: string | null = null;
  let foundVat: string | null = prospect.vatNumber || null;

  // Se non ha sito web, cerca gratuitamente su DuckDuckGo HTML / Bing
  if (!website) {
    try {
      const q = encodeURIComponent(
        `${prospect.companyName} ${prospect.city || ''} ${prospect.province || ''} contatti email`
      );
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const rawE of emails) {
          const e = rawE.toLowerCase();
          const check = isPecOrJunkEmail(e);
          if (check.isJunk) continue;
          if (check.isPec) {
            if (!foundPec) foundPec = e;
            continue;
          }
          const domain = e.split('@')[1];
          const mx = await verifyDomainMxCached(domain);
          if (mx.hasMx && !mx.isPecMx) {
            foundEmail = e;
            break;
          }
        }
      }
    } catch {}
  }

  // Se ha un sito web, scarica home per estrarre email e P.IVA
  if (website && !foundEmail) {
    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`;
    try {
      const res = await fetch(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const rawE of emails) {
          const e = rawE.toLowerCase();
          const check = isPecOrJunkEmail(e);
          if (check.isJunk) continue;
          if (check.isPec) {
            if (!foundPec) foundPec = e;
            continue;
          }
          const domain = e.split('@')[1];
          const mx = await verifyDomainMxCached(domain);
          if (mx.hasMx && !mx.isPecMx) {
            foundEmail = e;
            break;
          }
        }

        if (!foundVat) {
          const vatCandidates = html.match(/\b\d{11}\b/g) || [];
          for (const v of vatCandidates) {
            if (checkItalianVatLuhn(v)) {
              foundVat = v;
              break;
            }
          }
        }
      }
    } catch {}
  }

  const resolved = resolveCommercialCategoryFromCluster(prospect.categoryCluster);

  if (foundEmail) {
    await sdrPrisma.sdrProspect.update({
      where: { id: prospect.id },
      data: {
        ordinaryEmail: foundEmail,
        pecCamerale: foundPec || prospect.pecCamerale,
        vatNumber: foundVat || prospect.vatNumber,
        commercialCategory: resolved.commercialCategory,
        baseDiscount: resolved.baseDiscount,
        section: 'Email_Pronta',
        isPecVerified: true,
        auditPassed: true,
        sentinelAttempts: { increment: 1 },
        lastSentinelCheckAt: new Date(),
      },
    });
  } else if (foundPec && !prospect.ordinaryEmail) {
    await sdrPrisma.sdrProspect.update({
      where: { id: prospect.id },
      data: {
        pecCamerale: foundPec,
        pecRejectedLog: `PEC scartata da Sentinella: ${foundPec}`,
        vatNumber: foundVat || prospect.vatNumber,
        commercialCategory: resolved.commercialCategory,
        baseDiscount: resolved.baseDiscount,
        section: 'PEC_Scartata',
        sentinelAttempts: { increment: 1 },
        lastSentinelCheckAt: new Date(),
      },
    });
  } else {
    await sdrPrisma.sdrProspect.update({
      where: { id: prospect.id },
      data: {
        sentinelAttempts: { increment: 1 },
        lastSentinelCheckAt: new Date(),
      },
    });
  }

  return {
    foundEmail,
    foundPec,
    foundVat,
    foundWebsite: website || null,
  };
}

/**
 * Job Handler per sdr-scraper-queue e sdr-sentinel-queue
 */
async function processScraperJob(job: Job) {
  const { action, prospectId, batchSize = 50, cluster, provincia } = job.data || {};

  if (action === 'ENRICH_SINGLE' && prospectId) {
    log.info(`[SDR Scraper] Arricchimento singolo prospect #${prospectId}`, {
      module: MODULE_NAME,
      prospectId,
    });
    const res = await enrichSingleProspectWeb(Number(prospectId));
    return res;
  }

  if (action === 'SENTINEL_BATCH' || job.name === 'sentinel-batch') {
    const startMs = Date.now();
    const lastRun = await sdrPrisma.sdrSentinelRun.findFirst({ orderBy: { id: 'desc' } });
    const nextCycle = (lastRun?.cycleNumber || 0) + 1;

    log.info(
      `[Sentinella 24/7] Avviato ciclo batch #${nextCycle} (batchSize=${batchSize}, cluster=${cluster || 'ALL'})`,
      { module: MODULE_NAME, cycleNumber: nextCycle }
    );

    const whereClause: any = {
      section: 'Senza_Email',
    };
    if (cluster && cluster !== 'ALL') {
      whereClause.categoryCluster = cluster;
    }
    if (provincia && provincia !== 'ALL') {
      whereClause.province = provincia;
    }

    const prospects = await sdrPrisma.sdrProspect.findMany({
      where: whereClause,
      take: Math.min(Number(batchSize) || 50, 250),
      orderBy: [{ sentinelAttempts: 'asc' }, { leadScore: 'desc' }, { id: 'asc' }],
    });

    let processed = 0;
    let foundCount = 0;
    let pecCount = 0;
    let websitesFound = 0;

    for (const p of prospects) {
      const res = await enrichSingleProspectWeb(p.id);
      processed++;
      if (res.foundEmail) foundCount++;
      else if (res.foundPec) pecCount++;
      if (res.foundWebsite) websitesFound++;
    }

    const run = await sdrPrisma.sdrSentinelRun.create({
      data: {
        cycleNumber: nextCycle,
        processedCount: processed,
        upgradedEmailCount: foundCount,
        pecFilteredCount: pecCount,
        websitesFoundCount: websitesFound,
        durationMs: Date.now() - startMs,
      },
    });

    log.info(
      `[Sentinella 24/7] Completato ciclo #${nextCycle}: ${processed} analizzati, ${foundCount} nuove email B2B validate, ${pecCount} PEC scartate.`,
      { module: MODULE_NAME, runId: run.id, processed, foundCount, pecCount }
    );

    return { runId: run.id, processed, foundCount, pecCount };
  }

  if (action === 'REAUDIT_CLUSTERS') {
    log.info('[MasterAudit 15/15] Riallineamento deterministico cluster IST (40%) / RIV (50%)...', {
      module: MODULE_NAME,
    });
    const rivClusters = ['Ferramenta', 'Rivendita_Edile', 'Illuminazione'];
    const [rivRes, istRes] = await Promise.all([
      sdrPrisma.sdrProspect.updateMany({
        where: { categoryCluster: { in: rivClusters } },
        data: { commercialCategory: 'RIV', baseDiscount: 50 },
      }),
      sdrPrisma.sdrProspect.updateMany({
        where: { categoryCluster: { notIn: rivClusters } },
        data: { commercialCategory: 'IST', baseDiscount: 40 },
      }),
    ]);
    log.info(
      `[MasterAudit 15/15] Riallineamento completato: ${istRes.count} IST (40%), ${rivRes.count} RIV (50%).`,
      { module: MODULE_NAME }
    );
    return { istUpdated: istRes.count, rivUpdated: rivRes.count };
  }

  return { status: 'noop' };
}

async function startWorker() {
  const connection = createRedisConnection();

  const scraperWorker = new Worker('sdr-scraper-queue', processScraperJob, {
    connection: connection as any,
    concurrency: 4,
  });

  const sentinelWorker = new Worker('sdr-sentinel-queue', processScraperJob, {
    connection: connection as any,
    concurrency: 2,
  });

  scraperWorker.on('completed', job => {
    log.info(`[SDR Scraper] Job ${job.id} completato con successo`, { module: MODULE_NAME });
  });

  scraperWorker.on('failed', (job, err) => {
    log.error(`[SDR Scraper] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  sentinelWorker.on('completed', job => {
    log.info(`[Sentinella 24/7] Job ${job.id} completato`, { module: MODULE_NAME });
  });

  sentinelWorker.on('failed', (job, err) => {
    log.error(`[Sentinella 24/7] Job ${job?.id} fallito: ${err.message}`, { module: MODULE_NAME });
  });

  log.info('🚀 Worker AI-SDR Scraper & Sentinella 24/7 avviato in ascolto su Redis', {
    module: MODULE_NAME,
  });
}

startWorker().catch(err => {
  log.error(`Errore fatale avvio ${MODULE_NAME}: ${err.message}`, { module: MODULE_NAME });
  process.exit(1);
});
