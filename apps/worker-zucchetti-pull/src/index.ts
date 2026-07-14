import { Worker } from 'bullmq';
import { redis, logger } from '@archelia/core';
import { zucchettiPullService } from './services/sync.js';

logger.info('🔄 Avvio Worker Zucchetti Pull...');

const pullWorker = new Worker('zucchetti-commands', async job => {
  const { command } = job.data;
  
  if (command === 'IMPORT_PRODUCTS') {
    logger.info(`Ricevuto comando ${command} (Job ID: ${job.id})`);
    const result = await zucchettiPullService.importProducts();
    return result;
  }
  
  if (command === 'SYNC_INVENTORY') {
    logger.info(`Ricevuto comando ${command} (Job ID: ${job.id})`);
    const result = await zucchettiPullService.syncInventory();
    return result;
  }

  if (command === 'SYNC_PRICING') {
    logger.info(`Ricevuto comando ${command} (Job ID: ${job.id})`);
    const result = await zucchettiPullService.syncPricing();
    return result;
  }
  
  logger.warn(`Comando sconosciuto ricevuto: ${command}`);
  return null;
}, {
  connection: redis as any,
  concurrency: 1 // Solo un import massivo per volta
});

pullWorker.on('completed', (job, result) => {
  logger.info(`✅ Job ${job.id} (${job.data.command}) completato con successo. Risultato: ${JSON.stringify(result)}`);
});

pullWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} (${job?.data?.command}) fallito: ${err.message}`);
});

logger.info('✅ Worker Zucchetti Pull in ascolto su coda "zucchetti-commands"');

const shutdown = () => {
  logger.info('Spegnimento Worker...');
  pullWorker.close().then(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
