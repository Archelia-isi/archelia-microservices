import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminOrdersRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Elenco Ordini Shopify
  fastify.get('/api/admin/orders', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional(),
        status: z.string().optional()
      }),
      response: {
        200: z.object({
          data: z.array(z.any()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { page, limit, search, status } = request.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { shopifyOrderId: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shopifyCustomerId: { contains: search, mode: 'insensitive' } }
      ];
    }
    // TODO: Aggiungere filtro status (es. su zucchettiQueue.status se necessario)

    const [data, total] = await Promise.all([
      prisma.zelShopifyOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { zucchettiQueue: true }
      }),
      prisma.zelShopifyOrder.count({ where })
    ]);

    return reply.status(200).send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  // Retry singolo ordine verso Zucchetti
  fastify.post('/api/admin/orders/:id/retry', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        id: z.string() // shopifyOrderId
      }),
      response: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    const queueItem = await prisma.zelZucchettiOrderQueue.findUnique({
      where: { shopifyOrderId: id }
    });

    if (!queueItem) {
      return reply.status(404).send({ error: 'Ordine non trovato nella coda Zucchetti' });
    }

    await prisma.zelZucchettiOrderQueue.update({
      where: { shopifyOrderId: id },
      data: { status: 'PENDING', lastError: null, attempts: 0 }
    });

    log.info(`🔄 [Admin] Richiesto retry ordine ${id}`, { module: 'api-gateway:orders' });

    // TODO: In V2, enqueue job in Redis for Worker Orders to pick up immediately

    return reply.status(200).send({ success: true, message: 'Ordine riaccodato con successo per Zucchetti.' });
  });

  // Recupero forzato vecchi ordini da Shopify
  fastify.post('/api/admin/orders/recover', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({ success: z.boolean(), message: z.string(), count: z.number() }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { shopifyClient } = await import('@archelia/shopify');
      const { Queue } = await import('bullmq');
      const { redis } = await import('@archelia/core');
      
      const shopifyOrdersQueue = new Queue('shopify-orders', { connection: redis as any });
      
      log.info('Avvio recupero ordini vecchi da Shopify (API Gateway)...');
      
      // Scarica gli ultimi 20 ordini da Shopify
      const response: any = await shopifyClient.get('/orders.json?status=any&limit=20');
      const orders = response.orders || [];

      let queued = 0;
      for (const order of orders) {
        // Aggiungiamo alla coda simulando il payload del webhook
        await shopifyOrdersQueue.add('order-create', order);
        queued++;
      }

      log.info(`Recupero completato. Accodati ${queued} ordini.`);
      return reply.status(200).send({ 
        success: true, 
        message: `Recupero avviato! ${queued} ordini storici sono stati messi in coda per l'elaborazione.`,
        count: queued
      });
    } catch (err: any) {
      log.error('Errore durante il recupero ordini:', err);
      return reply.status(500).send({ error: err.message || 'Errore di sistema' });
    }
  });
}
