import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';
import os from 'os';

export async function adminStatsRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Global Dashboard Stats
  fastify.get('/api/admin/stats', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({
          stats: z.object({
            totalProducts: z.number(),
            publishedProducts: z.number(),
            withoutImages: z.number(),
            withoutPrice: z.number(),
            withoutStock: z.number(),
            customers: z.number(),
            syncLogs: z.number(),
            ordersToday: z.number(),
            revenueToday: z.number(),
            ordersTotal: z.number(),
            revenueTotal: z.number()
          }),
          server: z.object({
            uptime: z.number(),
            memory: z.number(),
            cpuLoad: z.number()
          }),
          latencyMs: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      publishedProducts,
      withoutImages,
      withoutPrice,
      withoutStock,
      customers,
      syncLogs,
      ordersTodayList,
      allOrdersList
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { publishedOnWeb: true } }),
      prisma.product.count({ where: { imageUrl: null } }),
      prisma.product.count({ where: { price: 0 } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.zelShopifyCustomer.count(),
      prisma.syncLog.count(),
      prisma.orderQueue.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { payload: true }
      }),
      prisma.zelShopifyOrder.aggregate({
        _sum: { totalPrice: true },
        _count: { id: true }
      })
    ]);

    const ordersToday = ordersTodayList.length;
    let revenueToday = 0;
    ordersTodayList.forEach(order => {
      const payload: any = order.payload;
      if (payload && payload.total_price) {
        revenueToday += parseFloat(payload.total_price);
      }
    });

    const ordersTotal = allOrdersList._count.id;
    const revenueTotal = allOrdersList._sum.totalPrice || 0;

    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const loadAvg = os.loadavg()[0];

    return reply.status(200).send({
      stats: {
        totalProducts,
        publishedProducts,
        withoutImages,
        withoutPrice,
        withoutStock,
        customers,
        syncLogs,
        ordersToday,
        revenueToday,
        ordersTotal,
        revenueTotal
      },
      server: {
        uptime: process.uptime(),
        memory: Math.round(memoryUsage * 100) / 100,
        cpuLoad: Math.round(loadAvg * 100) / 100
      },
      latencyMs: Date.now() - startTime
    });
  });

  // Sync History
  fastify.get('/api/admin/sync-history', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        limit: z.coerce.number().default(20)
      }),
      response: {
        200: z.array(z.object({
          id: z.string(),
          type: z.string(),
          status: z.string(),
          startedAt: z.date(),
          endedAt: z.date().nullable(),
          durationMs: z.number().nullable(),
          recordsProcessed: z.number().nullable(),
          errorDetails: z.string().nullable()
        }))
      }
    }
  }, async (request, reply) => {
    const { limit } = request.query;
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit
    });
    
    const mappedLogs = logs.map(l => ({
      id: l.id,
      type: l.type,
      status: l.status,
      startedAt: l.startedAt,
      endedAt: l.endedAt,
      durationMs: l.endedAt ? l.endedAt.getTime() - l.startedAt.getTime() : null,
      recordsProcessed: l.created + l.updated,
      errorDetails: l.error || l.details
    }));

    return reply.status(200).send(mappedLogs);
  });

  // Health Detail
  fastify.get('/api/admin/health-detail', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({
          status: z.string(),
          checks: z.record(z.string(), z.any()),
          timestamp: z.date()
        })
      }
    }
  }, async (request, reply) => {
    // Stub implementation for now
    return reply.status(200).send({
      status: 'OK',
      checks: {
        database: { status: 'up' },
        redis: { status: 'up' }
      },
      timestamp: new Date()
    });
  });

  // Report PDF
  fastify.get('/api/admin/stats/report-pdf', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({
          success: z.boolean(),
          pdfBase64: z.string().optional(),
          filename: z.string().optional(),
          message: z.string().optional()
        }),
        500: z.object({
          success: z.boolean(),
          message: z.string().optional()
        })
      }
    }
  }, async (request, reply) => {
    const { QueueEvents, Queue } = await import('bullmq');
    const { env } = await import('@archelia/core');
    
    const analyticsQueue = new Queue('analytics-queue', { connection: { url: env.REDIS_URL || 'redis://localhost:6379' } as any });
    const queueEvents = new QueueEvents('analytics-queue', { connection: { url: env.REDIS_URL || 'redis://localhost:6379' } as any });

    try {
      const job = await analyticsQueue.add('GENERATE_REPORT_PDF', {});
      const result = await job.waitUntilFinished(queueEvents, 10000); // Aspettiamo max 10 secondi
      
      return reply.status(200).send({
        success: true,
        pdfBase64: result.pdfBase64,
        filename: result.filename
      });
    } catch (e: any) {
      return reply.status(500).send({
        success: false,
        message: 'Timeout o errore durante la generazione del report PDF.'
      });
    } finally {
      await queueEvents.close();
    }
  });
}
