import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env, log } from '@archelia/core';
import { shopifyPromoService, ShopifyPromoPayload } from '@archelia/shopify';
import { runAiBrainCron, triggerImmediateFlashDeal } from '@archelia/ai';

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// Code per le comunicazioni tra worker (Push Marketing e Indicizzazione Typesense)
const marketingQueue = new Queue('marketing-queue', { connection: connection as any });
const eqQueue = new Queue('equalizzatore-queue', { connection: connection as any });
const shopifyPromoQueue = new Queue('shopify-promo', { connection: connection as any });

log.info('🎁 Worker Promo in avvio...', { module: 'worker-promo' });

// Inizializza il Cron Scheduler Notturno
async function setupCronJobs() {
  // Schedulazione all'una di notte (01:00) per sicurezza timezone
  await shopifyPromoQueue.add('RUN_AUTO_PROMO_BRAIN', { isManualToday: false }, {
    repeat: { pattern: '0 1 * * *' }, 
    jobId: 'nightly-brain-cron'
  });
  log.info('🕒 Schedulatore Brain Notturno impostato (01:00 AM)', { module: 'worker-promo' });
}
setupCronJobs();

const worker = new Worker('shopify-promo', async (job) => {
  log.info(`Elaborazione job ${job.id} - ${job.name}`, { module: 'worker-promo' });

  switch (job.name) {
    case 'CREATE_MANUAL_PROMO': {
      const payload: ShopifyPromoPayload = job.data;
      const result = await shopifyPromoService.createPromo(payload);
      
      // Dopo aver creato una promo manuale, bisogna inviare le notifiche
      // se l'utente l'ha richiesto.
      if (job.data.inviaNotificaPush) {
        log.info('Richiesta invio Web Push Promozionale - Accodo job per worker-marketing...', { module: 'worker-promo' });
        await marketingQueue.add('SEND_WEB_PUSH', {
          title: payload.titolo,
          message: payload.descrizione || "Guarda l'offerta!",
          iconUrl: payload.badge_colore, // placeholder
          link: payload.link_cta || '/'
        });
      }

      // Infine scatenare la re-indicizzazione
      log.info('Accodamento job re-indicizzazione su Typesense...', { module: 'worker-promo' });
      await eqQueue.add('SYNC_PROMO_TYPESENSE', {});
      
      return result;
    }

    case 'RUN_AUTO_PROMO_BRAIN': {
      const isManual = job.data?.isManualToday || false;
      const result = await runAiBrainCron(isManual);
      
      if (result?.success) {
        // Se il cron AI ha pianificato nuove offerte lampo/giornaliere, 
        // schedula la notifica push per domani (quando diventeranno attive)
        // oppure notifica gli iscritti al canale Telegram/Push.
        await marketingQueue.add('SYNC_PROMO_PUSHES', {});
      }
      return result;
    }

    case 'TEST_FLASH_DEAL': {
      const result = await triggerImmediateFlashDeal();
      // Per il flash deal test informiamo Typesense di aggiornarsi
      await eqQueue.add('SYNC_PROMO_TYPESENSE', {});
      return result;
    }

    case 'CLEANUP_EXPIRED_PROMOS': {
      const result = await shopifyPromoService.deleteExpiredPromos();
      log.info(`Cleanup completato: ${result.deleted} cancellate.`, { module: 'worker-promo' });
      
      if (result.deleted > 0) {
        // Se abbiamo rimosso delle promozioni, diciamo a Typesense di aggiornarsi
        await eqQueue.add('SYNC_PROMO_TYPESENSE', {});
      }
      return result;
    }

    default:
      log.warn(`Job name sconosciuto: ${job.name}`, { module: 'worker-promo' });
      throw new Error(`Job name sconosciuto: ${job.name}`);
  }
}, { connection: connection as any });

worker.on('completed', (job) => {
  log.info(`Job ${job.id} (${job.name}) completato con successo`, { module: 'worker-promo' });
});

worker.on('failed', (job, err) => {
  log.error(`Job ${job?.id} (${job?.name}) fallito: ${err.message}`, { module: 'worker-promo' });
});
