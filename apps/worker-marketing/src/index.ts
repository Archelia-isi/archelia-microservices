import { Worker } from 'bullmq';
import { log, env, createRedisConnection } from '@archelia/core';
import { CartSyncJob } from './jobs/CartSyncJob.js';
import { EmailSenderJob } from './jobs/EmailSenderJob.js';
import { PushNotificationJob } from './jobs/PushNotificationJob.js';
import { MarketingScheduler } from './scheduler.js';

const connection = createRedisConnection();

async function startWorkers() {
  log.info('📣 Avvio Worker Marketing...', { module: 'worker-marketing' });

  // 1. Worker per il Tracking di Shopify (es. Cart Sync)
  const trackingWorker = new Worker('shopify-tracking', async (job) => {
    log.info(`Elaborazione job tracking: ${job.name} (ID: ${job.id})`, { module: 'worker-marketing' });

    if (job.name === 'app-cart-sync' || job.name === 'cart-update' || job.name === 'checkout-update') {
      return await CartSyncJob.process(job);
    }

    log.warn(`Job name non gestito dal worker marketing (tracking): ${job.name}`);
  }, { connection: connection as any });

  trackingWorker.on('completed', (job) => {
    log.info(`✅ Job ${job.name} completato con successo`, { module: 'worker-marketing' });
  });

  trackingWorker.on('failed', (job, err) => {
    log.error(`❌ Job ${job?.name} fallito: ${err.message}`, { error: err, module: 'worker-marketing' });
  });

  // 2. Worker per il Marketing vero e proprio (Email, Loop, Push)
  const marketingWorker = new Worker('marketing-queue', async (job) => {
    log.info(`Elaborazione job marketing: ${job.name} (ID: ${job.id})`, { module: 'worker-marketing' });
    
    if (job.name === 'EMAIL') {
       return await EmailSenderJob.process(job);
    }
    if (job.name === 'PUSH') {
       return await PushNotificationJob.process(job);
    }

    log.warn(`Job name non gestito dal worker marketing (marketing): ${job.name}`);
  }, { connection: connection as any });

  marketingWorker.on('completed', (job) => {
    log.info(`✅ Job Marketing ${job.name} completato con successo`, { module: 'worker-marketing' });
  });

  marketingWorker.on('failed', (job, err) => {
    log.error(`❌ Job Marketing ${job?.name} fallito: ${err.message}`, { error: err, module: 'worker-marketing' });
  });

  // 3. Avvio Scheduler per le automazioni
  log.info('🕒 Avvio Marketing Scheduler (ogni 5 minuti)', { module: 'worker-marketing' });
  setInterval(async () => {
    await MarketingScheduler.processPendingJobs();
  }, 5 * 60 * 1000); // Ogni 5 minuti
  // Esecuzione immediata al boot
  setTimeout(() => MarketingScheduler.processPendingJobs(), 2000);
}

startWorkers().catch(err => {
  log.fatal(`Errore irreversibile avvio worker: ${err.message}`, { error: err, module: 'worker-marketing' });
  process.exit(1);
});
