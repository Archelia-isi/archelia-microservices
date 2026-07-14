import { Worker, Job } from 'bullmq';
import { log, createRedisConnection } from '@archelia/core';
import { runBulkSync } from '@archelia/typesense';

log.info('🚀 Avvio worker-typesense in corso...', { module: 'worker-typesense' });

const worker = new Worker(
  'typesense-commands',
  async (job: Job) => {
    log.info(`Ricevuto job [${job.name}] (ID: ${job.id})`, { module: 'worker-typesense' });
    try {
      switch (job.name) {
        case 'SYNC_TYPESENSE':
          log.info('Avvio Bulk Sync su Typesense...', { module: 'worker-typesense' });
          await runBulkSync();
          log.info('Bulk Sync Typesense completato.', { module: 'worker-typesense' });
          break;
        default:
          log.warn(`Job name sconosciuto: ${job.name}`, { module: 'worker-typesense' });
      }
    } catch (error: any) {
      log.error(`Fallimento esecuzione job [${job.name}]: ${error.message}`, { module: 'worker-typesense' });
      throw error;
    }
  },
  {
    connection: createRedisConnection() as any,
    concurrency: 1, // È bene non parallelizzare il bulk sync per evitare di sovraccaricare il DB o Typesense
  }
);

worker.on('completed', (job: Job) => {
  log.info(`✅ Job ${job.id} [${job.name}] completato con successo`, { module: 'worker-typesense' });
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  log.error(`❌ Job ${job?.id} [${job?.name}] fallito con errore: ${err.message}`, { module: 'worker-typesense' });
});

process.on('SIGINT', async () => {
  log.info('Chiusura worker in corso...', { module: 'worker-typesense' });
  await worker.close();
  process.exit(0);
});
