import { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { env, log } from '@archelia/core';
import { 
  shopifyProductsQueue, 
  shopifyOrdersQueue, 
  shopifyCustomersQueue, 
  shopifyTrackingQueue 
} from '@archelia/core';

// Utility per validare HMAC di Shopify
function verifyShopifyWebhook(request: FastifyRequest): boolean {
  const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string;
  const rawBody = (request as any).rawBody; // Aggiunto da fastify-raw-body
  const secret = env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !rawBody || !secret) {
    log.warn('HMAC header, rawBody, or secret missing', { module: 'webhook-receiver' });
    return false;
  }

  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return generatedHash === hmacHeader;
}

export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  
  // Hook globale per tutte le rotte sotto /api/webhooks/shopify
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/webhooks/shopify')) {
      if (!verifyShopifyWebhook(request)) {
        log.warn('Unauthorized Shopify Webhook request', { url: request.url, module: 'webhook-receiver' });
        return reply.status(401).send({ error: 'Unauthorized HMAC' });
      }
    }
  });

  // --- Customers ---
  app.post('/api/webhooks/shopify/customers/create', async (request, reply) => {
    await shopifyCustomersQueue.add('customer-create', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/customers/update', async (request, reply) => {
    await shopifyCustomersQueue.add('customer-update', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Metaobjects (General purpose updates) ---
  app.post('/api/webhooks/shopify/metaobject-update', async (request, reply) => {
    await shopifyTrackingQueue.add('metaobject-update', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Orders ---
  app.post('/api/webhooks/shopify/orders/create', async (request, reply) => {
    await shopifyOrdersQueue.add('order-create', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Products ---
  app.post('/api/webhooks/shopify/products/create', async (request, reply) => {
    await shopifyProductsQueue.add('product-create', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/products/update', async (request, reply) => {
    await shopifyProductsQueue.add('product-update', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/products/delete', async (request, reply) => {
    await shopifyProductsQueue.add('product-delete', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Checkouts ---
  app.post('/api/webhooks/shopify/checkouts/create', async (request, reply) => {
    await shopifyTrackingQueue.add('checkout-create', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/checkouts/update', async (request, reply) => {
    await shopifyTrackingQueue.add('checkout-update', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Carts ---
  app.post('/api/webhooks/shopify/carts/update', async (request, reply) => {
    await shopifyTrackingQueue.add('cart-update', request.body);
    return reply.status(200).send({ success: true });
  });

  // --- Spies (Custom pixel events) ---
  app.post('/api/webhooks/shopify/custom_cart_spy', async (request, reply) => {
    await shopifyTrackingQueue.add('custom-cart-spy', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/custom_browse_spy', async (request, reply) => {
    await shopifyTrackingQueue.add('custom-browse-spy', request.body);
    return reply.status(200).send({ success: true });
  });

  app.post('/api/webhooks/shopify/analytics_spy', async (request, reply) => {
    await shopifyTrackingQueue.add('analytics-spy', request.body);
    return reply.status(200).send({ success: true });
  });
}
