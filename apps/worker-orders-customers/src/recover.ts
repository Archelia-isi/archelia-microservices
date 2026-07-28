import { shopifyClient } from '@archelia/shopify';
import { Queue } from 'bullmq';
import { redis, logger } from '@archelia/core';

async function recoverOrders() {
  logger.info('Avvio recupero ordini vecchi da Shopify...');
  const shopifyOrdersQueue = new Queue('shopify-orders', { connection: redis as any });

  try {
    // Scarica gli ultimi 20 ordini da Shopify
    const response: any = await shopifyClient.get('/orders.json?status=any&limit=20');
    const orders = response.orders || [];

    logger.info(`Trovati ${orders.length} ordini. Invio alla coda...`);

    for (const order of orders) {
      await shopifyOrdersQueue.add('order-create', order);
      logger.info(`Ordine ${order.name} (ID: ${order.id}) inviato alla coda shopify-orders.`);
    }

    logger.info('Recupero completato. Il worker li smaltirà automaticamente.');
  } catch (err) {
    logger.error('Errore durante il recupero ordini:', err);
  } finally {
    process.exit(0);
  }
}

recoverOrders();
