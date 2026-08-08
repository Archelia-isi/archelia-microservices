import { Worker, Queue } from 'bullmq';
import { connection } from './config/redis.js';
import { logger } from '@archelia/core';
import { ElmarkStrategy } from './strategies/ElmarkStrategy.js';

// Esempio coda base
const QUEUE_NAME = 'suppliers-pull-queue';

async function bootstrap() {
  logger.info(`[Worker Suppliers Pull] Avvio in corso... Coda in ascolto: ${QUEUE_NAME}`, undefined, 'worker');

  const pullQueue = new Queue(QUEUE_NAME, { connection });

  // Schedulazione Cron Job: ogni notte alle 02:00 per Elmark
  await pullQueue.add('pull-elmark-nightly', { supplier: 'ELMARK', action: 'FULL_SYNC' }, {
    repeat: { pattern: '0 2 * * *' },
    jobId: 'cron-elmark-pull'
  });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      logger.info(`[Worker Suppliers Pull] Inizio elaborazione Job ${job.id} - ${job.name}`, { data: job.data }, 'worker');
      
      const { supplier, action } = job.data;
      
      try {
        if (!supplier) {
          throw new Error('Parametro supplier mancante nel job data');
        }

        let strategy;
        if (supplier === 'ELMARK') {
          strategy = new ElmarkStrategy();
        } else {
          throw new Error(`Strategia non trovata per il fornitore: ${supplier}`);
        }

        logger.info(`[Worker Suppliers Pull] Esecuzione strategia per il fornitore: ${supplier}`, undefined, 'worker');
        
        // Se non è specificata un'azione o è FULL_SYNC, esegue tutto in catena
        if (!action || action === 'FULL_SYNC') {
          await strategy.importCatalog(job);
          if (strategy.syncStockAndPrices) await strategy.syncStockAndPrices(job);
          if (strategy.syncImages) await strategy.syncImages(job);
        } else if (action === 'IMPORT_CATALOG') {
          await strategy.importCatalog(job);
        } else if (action === 'SYNC_STOCK' && strategy.syncStockAndPrices) {
          await strategy.syncStockAndPrices(job);
        } else if (action === 'SYNC_IMAGES' && strategy.syncImages) {
          await strategy.syncImages(job);
        }
        
        return { success: true, supplier, action };
      } catch (error: any) {
        logger.error(`[Worker Suppliers Pull] Errore nel job ${job.id}: ${error.message}`, { error }, 'worker');
        throw error;
      }
    },
    { 
      connection,
      concurrency: 1 // Evita conflitti sul DB per il pull massivo
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[Worker Suppliers Pull] Job ${job.id} completato con successo.`, undefined, 'worker');
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Worker Suppliers Pull] Job ${job?.id} fallito: ${err.message}`, { error: err }, 'worker');
  });
  
  // Gestione chiusura graziosa
  process.on('SIGINT', async () => {
    logger.info('[Worker Suppliers Pull] Chiusura in corso...');
    await worker.close();
    await connection.quit();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  logger.error('[Worker Suppliers Pull] Fatal error in bootstrap', { error: err }, 'worker');
  process.exit(1);
});
