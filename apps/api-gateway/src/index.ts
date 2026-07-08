import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { env, log } from '@archelia/core';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';

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
