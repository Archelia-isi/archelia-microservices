import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { shopifyPromoQueue } from '@archelia/core';

export default async function adminPromoRoutes(fastify: FastifyInstance) {
  
  fastify.post('/api/admin/promo/trigger', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        action: z.enum(['apply', 'revert'])
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    const { action } = request.body as { action: 'apply' | 'revert' };
    
    // Invece di eseguire il comando direttamente nel server web, mettiamo un job in coda su Redis.
    // Il worker-promo o chi per lui prenderà in carico l'operazione.
    await shopifyPromoQueue.add('promo-trigger', { action });

    return reply.send({
      success: true,
      message: `Azione promo '${action}' accodata con successo!`
    });
  });

  fastify.get('/api/admin/promo/health', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({
          status: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    return reply.send({ status: 'ok' });
  });
}
