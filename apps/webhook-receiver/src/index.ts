import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import { env, log } from '@archelia/core';
import { shopifyWebhooksRoutes } from './routes/webhooks.js';

async function buildApp() {
  const app = Fastify({
    logger: false, // Usiamo Pino da @archelia/core
  });

  // Questo plugin è fondamentale per validare l'HMAC di Shopify, 
  // perché ci serve il body grezzo prima che venga parsato come JSON
  await app.register(rawBody as any, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Registrazione rotte webhooks
  await app.register(shopifyWebhooksRoutes);
  
  // Registrazione rotte app proxy (cart sync in tempo reale)
  const { cartSyncRoutes } = await import('./routes/cartSync.js');
  await app.register(cartSyncRoutes);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', service: 'webhook-receiver' };
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    const port = env.PORT ? Number(env.PORT) : 3001; // Usiamo 3001 o la var d'ambiente

    await app.listen({
      port,
      host: '0.0.0.0',
    });

    log.info(`🚀 Webhook Receiver avviato su porta ${port}`, { module: 'webhook-receiver' });
  } catch (error) {
    log.fatal('Errore fatale durante avvio Webhook Receiver', { error, module: 'webhook-receiver' });
    process.exit(1);
  }
}

start();
