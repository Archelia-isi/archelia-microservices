import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { log, redis } from '@archelia/core';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';

const zucchettiQueue = new Queue('zucchetti-commands', { connection: redis as any });
const shopifyQueue = new Queue('shopify-commands', { connection: redis as any });
const marketingQueue = new Queue('marketing-queue', { connection: redis as any });
const promoQueue = new Queue('shopify-promo', { connection: redis as any });
const typesenseQueue = new Queue('typesense-commands', { connection: redis as any });

const JOB_MAPPINGS: Record<string, { queue: Queue, command: string, label: string, isManualOnly?: boolean, defaultInterval?: number, defaultUnit?: string }> = {
  'sync-mid-zuc': { queue: zucchettiQueue, command: 'IMPORT_PRODUCTS', label: '📥 Import Prodotti Zucchetti', defaultInterval: 1, defaultUnit: 'days' },
  'sync-promo': { queue: promoQueue, command: 'CLEANUP_EXPIRED_PROMOS', label: '🧹 Pulizia Promozioni', defaultInterval: 24, defaultUnit: 'hours' },
  'sync-mid-zuc-stock': { queue: zucchettiQueue, command: 'SYNC_INVENTORY', label: '📦 Sync Giacenze', defaultInterval: 30, defaultUnit: 'minutes' },
  'sync-mid-zuc-price': { queue: zucchettiQueue, command: 'SYNC_PRICING', label: '💰 Sync Prezzi', defaultInterval: 3, defaultUnit: 'days' },
  'sync-shopify-push': { queue: shopifyQueue, command: 'SYNC_ALL_PRODUCTS', label: '🛍️ Sync Shopify (Tutto)', defaultInterval: 1, defaultUnit: 'days' },
  'sync-stock': { queue: shopifyQueue, command: 'SYNC_STOCK_ONLY', label: '📦 Sync Stock Shopify', defaultInterval: 30, defaultUnit: 'minutes' },
};

function toCronExpression(value: number, unit: string, startTime?: string | null): string {
  let minute = '0';
  let hour = '0';

  if (startTime) {
    const parts = startTime.split(':');
    if (parts.length === 2) {
      hour = parseInt(parts[0], 10).toString();
      minute = parseInt(parts[1], 10).toString();
    }
  }

  switch (unit) {
    case 'minutes': return `*/${value} * * * *`;
    case 'hours':   return `${minute} */${value} * * *`;
    case 'days':    return `${minute} ${hour} */${value} * *`;
    default:        return `*/${value} * * * *`;
  }
}

async function applyJobSchedule(jobId: string, config: any) {
  const mapping = JOB_MAPPINGS[jobId];
  if (!mapping) return;

  // Rimuovi eventuali job ripetibili precedenti per questo ID
  const repeatableJobs = await mapping.queue.getRepeatableJobs();
  for (const rj of repeatableJobs) {
    if (rj.name === mapping.command) {
      await mapping.queue.removeRepeatableByKey(rj.key);
    }
  }

  // Se disabilitato, abbiamo già rimosso, quindi ok.
  if (!config.enabled) return;

  if (config.intervalUnit === 'seconds') {
    await mapping.queue.add(mapping.command, { command: mapping.command, source: 'scheduler' }, {
      repeat: { every: config.intervalValue * 1000 }
    });
    log.info(`⏰ Schedulato ${jobId} ogni ${config.intervalValue} secondi`, { module: 'api-gateway:scheduler' });
  } else {
    const cronPattern = toCronExpression(config.intervalValue, config.intervalUnit, config.startTime);
    await mapping.queue.add(mapping.command, { command: mapping.command, source: 'scheduler' }, {
      repeat: { pattern: cronPattern }
    });
    log.info(`⏰ Schedulato ${jobId} con cron "${cronPattern}"`, { module: 'api-gateway:scheduler' });
  }
}

export async function initScheduler() {
  try {
    const configs = await prisma.schedulerConfig.findMany();
    log.info(`Sincronizzazione ${configs.length} job schedulati dal DB verso BullMQ (Redis)...`, { module: 'api-gateway:scheduler' });
    
    for (const config of configs) {
      if (config.enabled) {
        await applyJobSchedule(config.jobId, config);
      }
    }
    log.info(`✅ Sincronizzazione scheduler completata.`, { module: 'api-gateway:scheduler' });
  } catch (err: any) {
    log.error(`Errore durante initScheduler: ${err.message}`, { module: 'api-gateway:scheduler' });
  }
}

export async function adminSchedulerRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Stato dello Scheduler
  fastify.get('/api/v1/admin/scheduler', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.array(z.any()) }
    }
  }, async (request, reply) => {
    const configs = await prisma.schedulerConfig.findMany();
    const configMap = new Map(configs.map(c => [c.jobId, c]));

    // Fetch all repeatable jobs to find next run times
    const queues = [zucchettiQueue, shopifyQueue, promoQueue, typesenseQueue];
    const allRepeatableJobs = (await Promise.all(queues.map(q => q.getRepeatableJobs()))).flat();

    const state = Object.keys(JOB_MAPPINGS)
      .map(jobId => {
        const mapping = JOB_MAPPINGS[jobId];
        const c = configMap.get(jobId);
        
        // Find if it has an active repeatable job
        const activeRepeatableJob = allRepeatableJobs.find(rj => rj.name === mapping.command);

        return {
          id: jobId,
          label: mapping.label,
          enabled: c?.enabled || false,
          intervalValue: c?.intervalValue || mapping.defaultInterval || 30,
          intervalUnit: c?.intervalUnit || mapping.defaultUnit || 'minutes',
          startTime: c?.startTime || null,
          status: c?.enabled ? 'active' : 'idle',
          isManualOnly: mapping.isManualOnly || false,
          cronExpression: activeRepeatableJob ? activeRepeatableJob.pattern : null,
          nextRun: activeRepeatableJob ? activeRepeatableJob.next : null,
        };
      });

    return reply.status(200).send(state);
  });

  // Toggle Job
  fastify.post('/api/v1/admin/scheduler/toggle', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({ id: z.string(), enabled: z.boolean() }),
      response: { 200: z.object({ success: z.boolean() }) }
    }
  }, async (request, reply) => {
    const { id, enabled } = request.body;
    log.info(`Toggling scheduler job ${id} -> ${enabled}`, { module: 'api-gateway:scheduler' });

    const config = await prisma.schedulerConfig.upsert({
      where: { jobId: id },
      update: { enabled },
      create: { jobId: id, enabled, intervalValue: 30, intervalUnit: 'minutes' }
    });

    await applyJobSchedule(id, config);
    return reply.status(200).send({ success: true });
  });

  // Aggiorna Intervallo
  fastify.post('/api/v1/admin/scheduler/update-interval', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({ id: z.string(), intervalValue: z.number(), intervalUnit: z.string(), startTime: z.string().nullable().optional() }),
      response: { 200: z.object({ success: z.boolean() }) }
    }
  }, async (request, reply) => {
    const { id, intervalValue, intervalUnit, startTime } = request.body;
    log.info(`Updating interval for ${id} to ${intervalValue} ${intervalUnit} (startTime: ${startTime})`, { module: 'api-gateway:scheduler' });

    const config = await prisma.schedulerConfig.upsert({
      where: { jobId: id },
      update: { intervalValue, intervalUnit, startTime: startTime || null },
      create: { jobId: id, enabled: false, intervalValue, intervalUnit, startTime: startTime || null }
    });

    await applyJobSchedule(id, config);
    return reply.status(200).send({ success: true });
  });

  // Esegui Subito
  fastify.post('/api/v1/admin/scheduler/run-now', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({ id: z.string() }),
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    const { id } = request.body;
    const mapping = JOB_MAPPINGS[id];
    if (!mapping) return reply.status(200).send({ success: false, message: 'Job ID non valido' });

    log.info(`Running job immediately ${id}`, { module: 'api-gateway:scheduler' });
    await mapping.queue.add(mapping.command, { command: mapping.command, source: 'manual' });
    
    return reply.status(200).send({ success: true, message: 'Job avviato in background' });
  });
}
