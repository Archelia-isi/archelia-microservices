import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { log, redis } from '@archelia/core';
import { Queue } from 'bullmq';

const suppliersQueue = new Queue('suppliers-pull-queue', { connection: redis as any });

export async function adminSuppliersRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Trigger manuali per i Fornitori
  fastify.post('/api/admin/suppliers/sync', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        supplier: z.string(),
        action: z.string() // es. FULL_SYNC, STOCK_PRICES, IMAGES
      }),
      response: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { supplier, action } = request.body;

    log.info(`🚀 [Admin] Richiesta trigger sync fornitore: ${supplier} (${action})`, { module: 'api-gateway:suppliers' });

    await suppliersQueue.add('pull-manual', { supplier, action });

    return reply.status(200).send({ 
      success: true, 
      message: `Sync ${action} per ${supplier} inserito in coda. Verrà processato dal worker in background.` 
    });
  });
}
