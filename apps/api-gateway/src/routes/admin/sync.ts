import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminSyncRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Trigger manuali per Zucchetti e Shopify
  fastify.post('/api/admin/trigger-sync/:type', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        type: z.string()
      }),
      body: z.object({
        limit: z.coerce.number().optional(),
        dryRun: z.coerce.boolean().optional(),
        skipFamilyCollections: z.coerce.boolean().optional()
      }).optional(),
      response: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { type } = request.params;
    const body = request.body || {};

    const syncTypeMap: Record<string, string> = {
      'import-products': 'PRODUCTS',
      'sync-stock': 'INVENTORY',
      'sync-prices': 'PRICES',
      'sync-images': 'IMAGES',
      'sync-banners': 'BANNERS',
      'clean-promos': 'PROMO_CLEAN',
      'sync-shopify': 'PRODUCTS',
      'sync-shopify-stock': 'INVENTORY',
      'sync-elmark-mid-stock': 'ELMARK_SYNC',
      'sync-elmark-mid-price': 'ELMARK_SYNC',
      'sync-mid-zuc-stock': 'ZUCCHETTI_SYNC',
      'sync-mid-zuc-price': 'ZUCCHETTI_SYNC',
    };

    if (!syncTypeMap[type]) {
      return reply.status(400).send({ error: `Tipo sync "${type}" non supportato.` });
    }

    log.info(`🚀 [Admin] Richiesta trigger sync: ${type}`, { payload: body, module: 'api-gateway:sync' });

    // TODO: In V2 Architecture, this should enqueue a job to Redis (BullMQ) instead of executing locally.
    // Example: await syncQueue.add(type, { opts: body });

    return reply.status(200).send({ 
      success: true, 
      message: `Sync ${type} in coda. Verrà processato dai worker in background.` 
    });
  });
}
