import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { authenticate, requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminOrdersRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Elenco Ordini
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
    const storeContext = request.headers['x-store-context'] as string;
    
    console.log('[DEBUG] X-Store-Context received:', storeContext, 'Headers:', request.headers);

    if (storeContext === 'B2B') {
      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        // ... (we can add basic search for b2b if needed, currently skip)
      }

      const [data, total] = await Promise.all([
        b2bPrisma.b2BOrder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { user: true, items: true }
        }),
        b2bPrisma.b2BOrder.count({ where })
      ]);

      const formattedData = data.map((o: any) => ({
        id: o.id,
        orderNumber: `#${o.id.slice(-6).toUpperCase()}`,
        shopifyOrderId: o.id, // For UI compatibility
        createdAt: o.createdAt,
        totalPrice: o.totalAmount + o.totalIva,
        subtotalPrice: o.totalAmount,
        currency: 'EUR',
        status: o.status,
        fulfillmentStatus: o.status === 'APPROVED' ? 'unfulfilled' : 'pending',
        user: o.user, // Pass the full user object for B2B
        items: o.items, // Pass the full items array for B2B
        shopifyCustomer: o.user ? {
          firstName: o.user.firstName,
          lastName: o.user.lastName,
          email: o.user.email,
          companyName: o.user.companyName
        } : null,
        zucchettiQueue: { status: o.status === 'APPROVED' ? 'PENDING' : 'WAITING' }, // Mock queue for UI
      }));

      return reply.status(200).send({
        data: formattedData,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    }

    // Default RETAIL logic
    const where: any = {};
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shopifyOrderId: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } }
      ];
    }

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

    const customerIds = data.map(o => o.shopifyCustomerId).filter(Boolean) as string[];
    const customers = await prisma.zelShopifyCustomer.findMany({
      where: { shopifyId: { in: customerIds } }
    });
    
    const customerMap = new Map(customers.map(c => [c.shopifyId, c]));

    const enrichedData = data.map(o => {
      const cust = o.shopifyCustomerId ? customerMap.get(o.shopifyCustomerId) : null;
      return {
        ...o,
        shopifyCustomer: cust || null
      };
    });

    return reply.status(200).send({
      data: enrichedData,
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
}
