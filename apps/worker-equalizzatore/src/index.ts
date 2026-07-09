import { Worker, Job } from 'bullmq';
import { logger, env, createRedisConnection } from '@archelia/core';
import { PipelineEngine } from './services/PipelineEngine.js';

logger.info('🚀 Avvio worker-equalizzatore in corso...');

// Mappa dei comandi supportati dall'Equalizzatore
const worker = new Worker(
  'equalizzatore-commands',
  async (job: Job) => {
    logger.info(`Ricevuto job [${job.name}] (ID: ${job.id})`);
    try {
      switch (job.name) {
        case 'RUN_BATCH':
          logger.info('Esecuzione Batch Equalizzatore...');
          await PipelineEngine.startBatch();
          break;
        case 'RETRY_ERRORS':
          logger.info('Esecuzione Retry su prodotti in errore...');
          await PipelineEngine.retryAllErrorsBatch();
          break;
        case 'RUN_SINGLE':
          const { elmarkCode, rawData, imageUrl, customInstructions } = job.data;
          logger.info(`Esecuzione singola per prodotto ${elmarkCode}`);
          await PipelineEngine.processProduct(elmarkCode, rawData, imageUrl, customInstructions);
          break;
        case 'STOP_PIPELINE':
          logger.info('Richiesto stop manuale della pipeline');
          PipelineEngine.stopBatch();
          break;
        default:
          logger.warn(`Job name sconosciuto: ${job.name}`);
      }
    } catch (error: any) {
      logger.error(`Fallimento esecuzione job [${job.name}]: ${error.message}`);
      throw error;
    }
  },
  {
    connection: createRedisConnection() as any,
    concurrency: 1, // L'equalizzatore esegue task pesanti, meglio tenere concorrenza 1 o gestirla internamente
  }
);

worker.on('completed', (job: Job) => {
  logger.info(`✅ Job ${job.id} [${job.name}] completato con successo`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`❌ Job ${job?.id} [${job?.name}] fallito con errore: ${err.message}`);
});

process.on('SIGINT', async () => {
  logger.info('Chiusura worker in corso...');
  await worker.close();
  process.exit(0);
});
