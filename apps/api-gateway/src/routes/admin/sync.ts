import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth.js';
import { log, redis } from '@archelia/core';
import { Queue } from 'bullmq';

const zucchettiQueue = new Queue('zucchetti-commands', { connection: redis as any });

const shopifyQueue = new Queue('shopify-commands', { connection: redis as any });

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

    log.info(`🚀 [Admin] Richiesta trigger sync: ${type}`, { payload: body, module: 'api-gateway:sync' });

    if (type === 'import-products') {
      await zucchettiQueue.add('zucchetti-pull', { command: 'IMPORT_PRODUCTS' });
    } else if (type === 'sync-stock') {
      await zucchettiQueue.add('zucchetti-pull', { command: 'SYNC_INVENTORY' });
    } else if (type === 'sync-prices') {
      await zucchettiQueue.add('zucchetti-pull', { command: 'SYNC_PRICING' });
    } else if (type === 'sync-shopify') {
      await shopifyQueue.add('SYNC_ALL_PRODUCTS', {});
    } else if (type === 'sync-shopify-stock') {
      await shopifyQueue.add('SYNC_STOCK_ONLY', {});
    } else if (type === 'clean-promos') {
      const promoQueue = new Queue('shopify-promo', { connection: redis as any });
      await promoQueue.add('promo-commands', { command: 'CLEANUP_EXPIRED_PROMOS' });
    } else {
      log.warn(`Trigger per ${type} non ancora implementato su BullMQ. Coda simulata.`);
      return reply.status(400).send({ error: `Tipo sync "${type}" non supportato.` });
    }

    return reply.status(200).send({ 
      success: true, 
      message: `Sync ${type} inserito in coda. Verrà processato dai worker in background.` 
    });
  });
}
