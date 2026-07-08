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
    // TODO: In V2 queries the Typesense Client (via Worker or local Client)
    log.info('Richiesto stato Typesense', { module: 'api-gateway:search' });
    return reply.status(200).send({ ok: true, collection: null, stats: null });
  });

  // Trigger Sincronizzazione Typesense
  fastify.post('/api/admin/typesense/sync', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesto trigger Typesense Sync', { module: 'api-gateway:search' });
    // TODO: In V2 enqueues a job for the Equalizzatore Worker
    return reply.status(200).send({ success: true, message: 'Sync Typesense accodato.' });
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
    // TODO: In V2 execute search through Typesense Client
    log.info(`Ricerca Typesense per query: ${q}`, { module: 'api-gateway:search' });
    return reply.status(200).send({ hits: [] });
  });
}
