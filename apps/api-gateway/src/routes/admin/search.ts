import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminSearchRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Stato Typesense
  fastify.get('/api/admin/typesense/status', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 
        200: z.object({
          ok: z.boolean(),
          collection: z.any().nullable(),
          stats: z.any().nullable()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { getTypesenseStatus } = await import('@archelia/typesense');
      const status = await getTypesenseStatus();
      return reply.status(200).send({ 
        ok: status.status === 'online', 
        collection: { name: 'products', num_documents: status.documentCount }, 
        stats: status 
      });
    } catch(e: any) {
      log.error(`Errore recupero stato Typesense: ${e.message}`, { module: 'api-gateway:search' });
      return reply.status(200).send({ ok: false, collection: null, stats: null });
    }
  });

  // Trigger Sincronizzazione Typesense
  fastify.post('/api/admin/typesense/sync', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesto trigger Typesense Sync', { module: 'api-gateway:search' });
    const { Queue } = await import('bullmq');
    const { redis } = await import('@archelia/core');
    const typesenseQueue = new Queue('typesense-commands', { connection: redis as any });
    await typesenseQueue.add('SYNC_TYPESENSE', { source: 'admin-ui' });
    return reply.status(200).send({ success: true, message: 'Sync Typesense accodato.' });
  });

  // Trigger Sincronizzazione Fast Promo Typesense
  fastify.post('/api/admin/typesense/sync-promo', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesto trigger Typesense Fast Sync Promo', { module: 'api-gateway:search' });
    const { Queue } = await import('bullmq');
    const { redis } = await import('@archelia/core');
    const typesenseQueue = new Queue('typesense-commands', { connection: redis as any });
    await typesenseQueue.add('SYNC_TYPESENSE_PROMO', { source: 'admin-ui' });
    return reply.status(200).send({ success: true, message: 'Fast Sync Promozioni accodato.' });
  });

  // Search Diretta su Typesense
  fastify.get('/api/admin/typesense/search', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({ q: z.string().min(1) }),
      response: { 
        200: z.any(),
        400: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { q } = request.query;
    try {
      log.info(`Ricerca Typesense per query: ${q}`, { module: 'api-gateway:search' });
      const { searchProducts } = await import('@archelia/typesense');
      const results = await searchProducts(q, { includeUnpublished: true });
      return reply.status(200).send(results);
    } catch (e: any) {
      log.error(`Errore ricerca Typesense: ${e.message}`, { module: 'api-gateway:search' });
      return reply.status(400).send({ error: e.message });
    }
  });
}
