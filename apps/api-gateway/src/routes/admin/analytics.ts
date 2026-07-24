import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { requireAdmin } from '../auth';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export async function analyticsRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/admin/analytics/overview
  fastify.get('/api/admin/analytics/overview', {
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }),
      response: {
        200: z.any(),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { startDate, endDate } = request.query as { startDate?: string, endDate?: string };
      
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      // 1. Visite Reali dal DB (TrackingSession)
      const trackingFilter = Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {};
      const visits = await prisma.trackingSession.count({ where: trackingFilter });

      // 2. Ordini Reali dal DB (ZelZucchettiOrderQueue)
      const orderFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
      
      const [totalOrders, revenueAgg] = await Promise.all([
        prisma.zelZucchettiOrderQueue.count({ where: orderFilter }),
        prisma.zelZucchettiOrderQueue.aggregate({
          where: orderFilter,
          _sum: { totalPrice: true }
        })
      ]);

      const revenue = revenueAgg._sum.totalPrice || 0;

      // 3. Tasso di conversione reale
      const conversionRate = visits > 0 ? ((totalOrders / visits) * 100).toFixed(1) : 0;

      // 4. Trend (Grafico) - Dati raggruppati per gli ultimi 7 giorni rispetto alla endDate
      const endD = endDate ? new Date(endDate) : new Date();
      const trendDataMap: Record<string, { visits: number, sales: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(endD);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('it-IT', { weekday: 'short' });
        trendDataMap[dayStr] = { visits: 0, sales: 0 };
      }

      // Prendi i dati solo degli ultimi 7 giorni dal target per il grafico
      const sevenDaysAgo = new Date(endD);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [trendVisits, trendOrders] = await Promise.all([
        prisma.trackingSession.findMany({
          where: { startedAt: { gte: sevenDaysAgo, lte: endD } },
          select: { startedAt: true }
        }),
        prisma.zelZucchettiOrderQueue.findMany({
          where: { createdAt: { gte: sevenDaysAgo, lte: endD } },
          select: { createdAt: true, totalPrice: true }
        })
      ]);

      for (const v of trendVisits) {
        const dStr = v.startedAt.toLocaleDateString('it-IT', { weekday: 'short' });
        if (trendDataMap[dStr]) trendDataMap[dStr].visits++;
      }

      for (const o of trendOrders) {
        const dStr = o.createdAt.toLocaleDateString('it-IT', { weekday: 'short' });
        if (trendDataMap[dStr]) trendDataMap[dStr].sales += o.totalPrice || 0;
      }

      const trendData = Object.keys(trendDataMap).map(key => ({
        name: key,
        visits: trendDataMap[key].visits,
        sales: trendDataMap[key].sales
      }));

      // 5. Ripristina Carrelli (per il Funnel)
      const abandonedCarts = await prisma.cartSyncQueue.count({ where: { status: 'PENDING' } });
      const recoveredCarts = await prisma.cartSyncQueue.count({ where: { status: 'SYNCED' } });
      const emptyCarts = await prisma.cartSyncQueue.count({ where: { status: 'EMPTY' } });
      const totalCarts = abandonedCarts + recoveredCarts + emptyCarts;

      const response = {
        overview: {
          visits: visits,
          visitsTrend: 1.0,
          revenue: revenue,
          revenueTrend: 1.0,
          orders: totalOrders,
          ordersTrend: 1.0,
          conversionRate: parseFloat(conversionRate.toString()),
          conversionTrend: 1.0
        },
        funnel: {
          totalVisits: visits,
          totalCarts: totalCarts > 0 ? totalCarts : 0,
          abandonedCarts: abandonedCarts > 0 ? abandonedCarts : 0,
          recoveredCarts: recoveredCarts > 0 ? recoveredCarts : 0,
          purchases: totalOrders > 0 ? totalOrders : 0
        },
        trends: trendData
      };

      return reply.status(200).send(response);
    } catch (error: any) {
      log.error(`Errore fetch analytics: ${error.message}`, { module: 'api-gateway:analytics' });
      return reply.status(500).send({ error: 'Errore durante il fetch dei dati analytics.' });
    }
  });

  // POST /api/admin/analytics/report
  // Triggers the worker-analytics to generate the PDF report
  fastify.post('/api/admin/analytics/report', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
      const analyticsQueue = new Queue('analytics-queue', { connection: connection as any });

      // Incolonniamo il job
      const job = await analyticsQueue.add('GENERATE_REPORT_PDF', {});
      
      log.info(`[Analytics] Job ${job.id} inviato al worker-analytics per generazione PDF.`, { module: 'api-gateway:analytics' });
      
      return reply.status(200).send({ 
        success: true, 
        message: 'Richiesta di generazione report PDF inviata al worker. Verrà processata in background.' 
      });
    } catch (error: any) {
      log.error(`Errore trigger report PDF: ${error.message}`, { module: 'api-gateway:analytics' });
      return reply.status(500).send({ error: 'Errore durante la richiesta del report PDF.' });
    }
  });
}
