import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';

export async function adminLogsRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  const LogEntrySchema = z.object({
    id: z.string(),
    level: z.string(),
    category: z.string().nullable(),
    message: z.string(),
    data: z.any().nullable(),
    createdAt: z.date(),
  });

  // Log recenti (assimilati a history nel nuovo stack stateless)
  fastify.get('/api/admin/logs', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        category: z.string().optional(),
        level: z.string().optional(),
        limit: z.coerce.number().default(100),
        search: z.string().optional()
      }),
      response: {
        200: z.object({
          entries: z.array(LogEntrySchema),
          counts: z.any()
        })
      }
    }
  }, async (request, reply) => {
    const { category, level, limit, search } = request.query;

    const where: any = {};
    if (category) where.category = category;
    // Nascondiamo i log molto voluminosi di infinity_db dalla vista globale se non filtrati
    else where.category = { not: 'infinity_db' };

    if (level) where.level = level;
    if (search) where.message = { contains: search, mode: 'insensitive' };

    const entries = await prisma.logEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return reply.status(200).send({ entries, counts: {} });
  });

  // Solo errori recenti
  fastify.get('/api/admin/logs/errors', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.array(LogEntrySchema)
      }
    }
  }, async (request, reply) => {
    const entries = await prisma.logEntry.findMany({
      where: { level: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reply.status(200).send(entries);
  });

  // Storico logs (paginazione)
  fastify.get('/api/admin/logs/history', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        category: z.string().optional(),
        level: z.string().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
      response: {
        200: z.object({
          data: z.array(LogEntrySchema),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { category, level, page, limit, search, from, to } = request.query;

    const where: any = {};
    if (category) where.category = category;
    if (level) where.level = level;
    if (search) where.message = { contains: search, mode: 'insensitive' };
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.logEntry.count({ where })
    ]);

    return reply.status(200).send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  // Download CSV dei logs
  fastify.get('/api/admin/logs/download/:date', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        date: z.string()
      }),
    }
  }, async (request, reply) => {
    const { date } = request.params;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    if (isNaN(startOfDay.getTime())) {
      return reply.status(400).send({ error: 'Data non valida' });
    }

    const logs = await prisma.logEntry.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { createdAt: 'asc' }
    });

    let csv = '\uFEFF';
    csv += 'Data,Ora,Livello,Categoria,Messaggio\r\n';
    for (const log of logs) {
      const dt = new Date(log.createdAt);
      const d = dt.toLocaleDateString('it-IT');
      const o = dt.toLocaleTimeString('it-IT');
      const msg = String(log.message).replace(/"/g, '""');
      csv += `${d},${o},${log.level},${log.category || ''},"${msg}"\r\n`;
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="log_${date}.csv"`);
    return reply.status(200).send(csv);
  });

  // Clear Logs
  fastify.delete('/api/admin/logs/clear', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({ category: z.string().optional() }),
      response: {
        200: z.object({ success: z.boolean(), cleared: z.string() })
      }
    }
  }, async (request, reply) => {
    const { category } = request.query;
    if (category) {
      await prisma.logEntry.deleteMany({ where: { category } });
    } else {
      await prisma.logEntry.deleteMany({});
    }
    return reply.status(200).send({ success: true, cleared: category || 'all' });
  });

  // Notifiche, Audit (stub in preparation)
  fastify.get('/api/admin/notifications', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.array(z.any()) }
    }
  }, async (request, reply) => {
    return reply.status(200).send([]);
  });

  fastify.get('/api/admin/audit', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ data: z.array(z.any()), total: z.number(), page: z.number(), totalPages: z.number() }) }
    }
  }, async (request, reply) => {
    return reply.status(200).send({ data: [], total: 0, page: 1, totalPages: 1 });
  });
}
