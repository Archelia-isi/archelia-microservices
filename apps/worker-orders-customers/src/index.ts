import { Worker } from 'bullmq';
import { redis, logger } from '@archelia/core';
import { processCustomerSync } from './mappers/customer.js';
import { processOrderSync, ZucchettiCustomerNotReadyError } from './mappers/order.js';

logger.info('🚀 Avvio Worker Orders/Customers per integrazione Zucchetti...');

const customerWorker = new Worker('shopify-customers', async job => {
  const customerPayload = job.data;
  const shopifyId = customerPayload.id?.toString();

  if (!shopifyId) {
    logger.warn('CustomerWorker: ricevuto payload senza ID. Job ignorato.');
    return;
  }

  logger.debug(`Ricevuto job customer-create/update per ID: ${shopifyId}`);
  await processCustomerSync(shopifyId);
}, {
  connection: redis as any,
  concurrency: 5 // Elabora fino a 5 clienti in parallelo
});

customerWorker.on('completed', job => {
  logger.info(`✅ CustomerWorker: Job ${job.id} completato con successo.`);
});

customerWorker.on('failed', (job, err) => {
  logger.error(`❌ CustomerWorker: Job ${job?.id} fallito — ${err.message}`);
});


const orderWorker = new Worker('shopify-orders', async job => {
  const orderPayload = job.data;
  
  if (!orderPayload.id) {
    logger.warn('OrderWorker: ricevuto payload senza ID. Job ignorato.');
    return;
  }

  logger.debug(`Ricevuto job order-create per ID: ${orderPayload.id}`);
  await processOrderSync(orderPayload);
}, {
  connection: redis as any,
  concurrency: 2, // Manteniamo la concorrenza bassa per l'ERP
  settings: {
    backoffStrategy: (attemptsMade, type, err) => {
      if (err instanceof ZucchettiCustomerNotReadyError) {
        return attemptsMade * 10000;
      }
      return Math.pow(2, attemptsMade) * 1000;
    }
  }
});

orderWorker.on('completed', job => {
  logger.info(`✅ OrderWorker: Job ${job.id} completato con successo.`);
});

orderWorker.on('failed', (job, err) => {
  if (err instanceof ZucchettiCustomerNotReadyError) {
    logger.warn(`⏳ OrderWorker: Job ${job?.id} in attesa (Interlock). Riproverà a breve.`);
  } else {
    logger.error(`❌ OrderWorker: Job ${job?.id} fallito — ${err.message}`);
  }
});

logger.info('✅ Worker Orders/Customers in ascolto su Redis.');

// Gestione gracefully shutdown
const shutdown = () => {
  logger.info('Spegnimento Worker...');
  Promise.all([
    customerWorker.close(),
    orderWorker.close()
  ]).then(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
