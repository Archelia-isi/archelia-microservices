import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';
import { redis } from '@archelia/core';

// Pass redis as connection to bullmq
const zucchettiQueue = new Queue('zucchetti-commands', { connection: redis as any });

export default async function infinityRoutes(fastify: FastifyInstance) {
  // GET /api/admin/infinity/data (Paginato + Ricerca)
  fastify.get('/data', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 50, search = '' } = request.query as { page?: number; limit?: number; search?: string };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const whereClause = search ? {
        arcodart: {
          contains: search,
          mode: 'insensitive' as const
        }
      } : {};

      const [records, total] = await Promise.all([
        prisma.mappedImage.findMany({
          where: whereClause,
          skip,
          take: limitNum,
          orderBy: { arcodart: 'asc' }
        }),
        prisma.mappedImage.count({ where: whereClause })
      ]);

      return {
        data: records,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno' });
    }
  });

  // GET /api/admin/infinity/status
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Conta totale record in MappedImage
      const recordsCount = await prisma.mappedImage.count();

      // Recupera se il cron job è abilitato
      const schedulerRecord = await prisma.schedulerConfig.findUnique({
        where: { jobId: 'zucchetti-infinity-db' }
      });
      const enabled = schedulerRecord ? schedulerRecord.enabled : false;

      return {
        enabled,
        records: recordsCount,
        lastSync: schedulerRecord?.updatedAt || null,
        intervalValue: schedulerRecord?.intervalValue || 30,
        intervalUnit: schedulerRecord?.intervalUnit || 'minutes'
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno' });
    }
  });

  // POST /api/admin/infinity/toggle
  fastify.post('/toggle', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { enabled } = request.body as { enabled: boolean };
      const jobId = 'zucchetti-infinity-db';
      
      const config = await prisma.schedulerConfig.upsert({
        where: { jobId },
        update: { enabled },
        create: {
          jobId,
          enabled,
          intervalValue: 30,
          intervalUnit: 'minutes'
        }
      });

      // Se disabilitato, rimuoviamo il repeatable job da BullMQ
      if (!enabled) {
        const repeatableJobs = await zucchettiQueue.getRepeatableJobs();
        const jobToRemove = repeatableJobs.find(j => j.id === jobId);
        if (jobToRemove) {
          await zucchettiQueue.removeRepeatableByKey(jobToRemove.key);
        }
      } else {
        // Se riattivato, lo re-scheduliamo
        let cronPattern = `*/${config.intervalValue} * * * *`;
        if (config.intervalUnit === 'hours') cronPattern = `0 */${config.intervalValue} * * *`;
        if (config.intervalUnit === 'days') cronPattern = `0 0 */${config.intervalValue} * *`;

        await zucchettiQueue.add('ZUCCHETTI_INFINITY_DB', { command: 'ZUCCHETTI_INFINITY_DB', source: 'infinity-app' }, {
          repeat: { pattern: cronPattern }
        });
      }

      return reply.send({ success: true, enabled });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno' });
    }
  });

  // POST /api/admin/infinity/update-interval
  fastify.post('/update-interval', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { intervalValue, intervalUnit } = request.body as { intervalValue: number, intervalUnit: string };
      const jobId = 'zucchetti-infinity-db';
      
      const config = await prisma.schedulerConfig.upsert({
        where: { jobId },
        update: { intervalValue, intervalUnit },
        create: {
          jobId,
          enabled: false,
          intervalValue,
          intervalUnit
        }
      });

      // Se è attivo, dobbiamo ricreare il job
      if (config.enabled) {
        const repeatableJobs = await zucchettiQueue.getRepeatableJobs();
        const jobToRemove = repeatableJobs.find(j => j.id === jobId || j.name === 'ZUCCHETTI_INFINITY_DB');
        if (jobToRemove) {
          await zucchettiQueue.removeRepeatableByKey(jobToRemove.key);
        }

        let cronPattern = `*/${config.intervalValue} * * * *`;
        if (config.intervalUnit === 'hours') cronPattern = `0 */${config.intervalValue} * * *`;
        if (config.intervalUnit === 'days') cronPattern = `0 0 */${config.intervalValue} * *`;

        await zucchettiQueue.add('ZUCCHETTI_INFINITY_DB', { command: 'ZUCCHETTI_INFINITY_DB', source: 'infinity-app' }, {
          repeat: { pattern: cronPattern }
        });
      }

      return reply.send({ success: true, config });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno' });
    }
  });

  // POST /api/admin/infinity/sync-now
  fastify.post('/sync-now', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await zucchettiQueue.add('ZUCCHETTI_INFINITY_DB', { source: 'manual' }, {
        removeOnComplete: true,
        removeOnFail: 10
      });
      return { success: true, message: 'Sync manuale accodato' };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno' });
    }
  });
}
