import { log, env } from '@archelia/core';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { productSyncService } from './sync.js';

// Connessione a Redis
const redisUrl = env.REDIS_URL;
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

log.info('🚀 worker-shopify-push in avvio...', { module: 'worker-shopify-push' });

const worker = new Worker(
  'shopify-commands',
  async (job: Job) => {
    log.info(`Ricevuto job ${job.name} (ID: ${job.id})`, { module: 'worker-shopify-push', data: job.data });

    switch (job.name) {
      case 'SYNC_ALL_PRODUCTS':
        await productSyncService.syncProducts();
        break;
      case 'SYNC_STOCK_ONLY':
        await productSyncService.syncStockOnly();
        break;
      case 'SYNC_DIFFERENTIAL_STOCK':
        await productSyncService.syncDifferentialStock();
        break;
      case 'SYNC_DIFFERENTIAL_PRICES':
        await productSyncService.syncDifferentialPrices();
        break;

      default:
        log.warn(`Job name non supportato: ${job.name}`, { module: 'worker-shopify-push' });
    }
  },
  { connection: connection as any }
);

worker.on('completed', (job) => {
  log.info(`✅ Job ${job.name} (ID: ${job.id}) completato con successo.`, { module: 'worker-shopify-push' });
});

worker.on('failed', (job, err) => {
  log.error(`❌ Job ${job?.name} (ID: ${job?.id}) fallito: ${err.message}`, { module: 'worker-shopify-push' });
});

process.on('SIGINT', async () => {
  log.info('Spegnimento worker-shopify-push...', { module: 'worker-shopify-push' });
  await worker.close();
  connection.quit();
  process.exit(0);
});
