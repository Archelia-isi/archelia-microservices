import { Queue, QueueOptions } from 'bullmq';
import { createRedisConnection } from './redis.js';

const connection = createRedisConnection();

const queueOptions: QueueOptions = {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Mantieni gli ultimi 100 job completati
    removeOnFail: 1000,    // Mantieni gli ultimi 1000 job falliti
  },
};

// ==========================================
// Dichiarazione Code (Queues) Globali
// ==========================================

export const shopifyProductsQueue = new Queue('shopify-products', queueOptions);
export const shopifyOrdersQueue = new Queue('shopify-orders', queueOptions);
export const shopifyCustomersQueue = new Queue('shopify-customers', queueOptions);
export const shopifyTrackingQueue = new Queue('shopify-tracking', queueOptions);
export const shopifyPromoQueue = new Queue('shopify-promo', queueOptions);
