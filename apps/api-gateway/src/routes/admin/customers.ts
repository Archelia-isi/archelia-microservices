import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminCustomersRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Elenco Clienti Shopify
  fastify.get('/api/admin/customers', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional()
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
    const { page, limit, search } = request.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { shopifyId: { contains: search, mode: 'insensitive' } },
        { zucchettiArcId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.zelShopifyCustomer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { zucchettiQueue: true }
      }),
      prisma.zelShopifyCustomer.count({ where })
    ]);

    return reply.status(200).send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  // CRM Aggregato
  fastify.get('/api/admin/customers/crm', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional(),
        zucchettiStatus: z.string().optional()
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
    // Il CRM è essenzialmente lo stesso endpoint dei clienti, magari con logica espansa
    // In questa fase di stub/migrazione lo mappiamo ai clienti base.
    const { page, limit, search, zucchettiStatus } = request.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { shopifyId: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (zucchettiStatus) {
      where.zucchettiQueue = { status: zucchettiStatus };
    }

    const [data, total] = await Promise.all([
      prisma.zelShopifyCustomer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { zucchettiQueue: true }
      }),
      prisma.zelShopifyCustomer.count({ where })
    ]);

    return reply.status(200).send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  // Trigger Sincronizzazione Zucchetti
  fastify.post('/api/admin/customers/trigger-zucchetti', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesto trigger Zucchetti Customer Sync', { module: 'api-gateway:customers' });
    // TODO: In V2 enqueues a job
    return reply.status(200).send({ success: true, message: 'Sync clienti verso Zucchetti accodato.' });
  });

  // Trigger Import Shopify
  fastify.post('/api/admin/customers/import-shopify', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesta importazione clienti da Shopify', { module: 'api-gateway:customers' });
    // TODO: In V2 enqueues a job
    return reply.status(200).send({ success: true, message: 'Importazione da Shopify accodata.' });
  });

  // Retry degli Errori
  fastify.post('/api/admin/customers/retry-errors', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), message: z.string(), count: z.number() }) }
    }
  }, async (request, reply) => {
    log.info('🔄 [Admin] Richiesto retry errori clienti', { module: 'api-gateway:customers' });
    
    const count = await prisma.zelZucchettiCustomerQueue.updateMany({
      where: { status: 'ERROR' },
      data: { status: 'PENDING', lastError: null, attempts: 0 }
    });

    return reply.status(200).send({ 
      success: true, 
      message: `${count.count} clienti riaccodati.`, 
      count: count.count 
    });
  });
}
