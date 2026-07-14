import { Worker, Job } from 'bullmq';
import { logger, createRedisConnection } from '@archelia/core';
import { PipelineEngine } from './services/PipelineEngine.js';
import { runBulkSync } from '@archelia/typesense';

logger.info('🚀 Avvio worker-equalizzatore in corso...');

// Mappa dei comandi supportati dall'Equalizzatore
const equalizzatoreWorker = new Worker(
  'equalizzatore-commands',
  async (job: Job) => {
    logger.info(`Ricevuto job [${job.name}] (ID: ${job.id}) sulla coda equalizzatore-commands`);
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

equalizzatoreWorker.on('completed', (job: Job) => {
  logger.info(`✅ Job ${job.id} [${job.name}] completato con successo (equalizzatore-commands)`);
});

equalizzatoreWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`❌ Job ${job?.id} [${job?.name}] fallito con errore: ${err.message} (equalizzatore-commands)`);
});

// Worker per la sincronizzazione del catalogo su Typesense
const typesenseWorker = new Worker(
  'typesense-commands',
  async (job: Job) => {
    logger.info(`Ricevuto job [${job.name}] (ID: ${job.id}) sulla coda typesense-commands`);
    try {
      switch (job.name) {
        case 'SYNC_TYPESENSE':
          logger.info('Avvio Bulk Sync su Typesense...');
          await runBulkSync();
          logger.info('Bulk Sync Typesense completato.');
          break;
        default:
          logger.warn(`Job name sconosciuto per Typesense: ${job.name}`);
      }
    } catch (error: any) {
      logger.error(`Fallimento esecuzione job Typesense [${job.name}]: ${error.message}`);
      throw error;
    }
  },
  {
    connection: createRedisConnection() as any,
    concurrency: 1,
  }
);

typesenseWorker.on('completed', (job: Job) => {
  logger.info(`✅ Job ${job.id} [${job.name}] completato con successo (typesense-commands)`);
});

typesenseWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`❌ Job ${job?.id} [${job?.name}] fallito con errore: ${err.message} (typesense-commands)`);
});

process.on('SIGINT', async () => {
  logger.info('Chiusura workers in corso...');
  await Promise.all([
    equalizzatoreWorker.close(),
    typesenseWorker.close()
  ]);
  process.exit(0);
});
