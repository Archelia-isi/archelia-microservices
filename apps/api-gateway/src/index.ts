import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { env, log } from '@archelia/core';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { adminPreferencesRoutes } from './routes/admin/preferences.js';
import { adminLogsRoutes } from './routes/admin/logs.js';
import { adminStatsRoutes } from './routes/admin/stats.js';
import { adminSyncRoutes } from './routes/admin/sync.js';
import { adminProductsRoutes } from './routes/admin/products.js';
import { adminOrdersRoutes } from './routes/admin/orders.js';
import { adminCustomersRoutes } from './routes/admin/customers.js';
import { adminSchedulerRoutes } from './routes/admin/scheduler.js';
import { adminSearchRoutes } from './routes/admin/search.js';
import { adminDatabaseRoutes } from './routes/admin/database.js';
import adminPromoRoutes from './routes/admin/promo.js';
import { adminEqualizzatoreRoutes } from './routes/admin/equalizzatore.js';

async function buildApp() {
  const app = Fastify({
    logger: false, // We use Pino from @archelia/core
  });

  // Add Zod type provider compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: true,
  });

  await app.register(cookie);

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  
  // Admin Routes
  await app.register(adminPreferencesRoutes);
  await app.register(adminLogsRoutes);
  await app.register(adminStatsRoutes);
  await app.register(adminSyncRoutes);
  await app.register(adminProductsRoutes);
  await app.register(adminOrdersRoutes);
  await app.register(adminCustomersRoutes);
  await app.register(adminSchedulerRoutes);
  await app.register(adminSearchRoutes);
  await app.register(adminDatabaseRoutes);
  await app.register(adminPromoRoutes);
  await app.register(adminEqualizzatoreRoutes);

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    const port = env.PORT ? Number(env.PORT) : 3000;

    await app.listen({
      port,
      host: '0.0.0.0',
    });

    log.info(`🚀 API Gateway avviato su porta ${port}`, { module: 'api-gateway' });
  } catch (error) {
    log.fatal('Errore fatale durante avvio API Gateway', { error, module: 'api-gateway' });
    process.exit(1);
  }
}

start();
