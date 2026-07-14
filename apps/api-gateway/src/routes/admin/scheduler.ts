import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { log, redis } from '@archelia/core';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';

const zucchettiQueue = new Queue('zucchetti-commands', { connection: redis as any });
const shopifyQueue = new Queue('shopify-commands', { connection: redis as any });

const JOB_MAPPINGS: Record<string, { queue: Queue, command: string, label: string }> = {
  'import-products': { queue: zucchettiQueue, command: 'IMPORT_PRODUCTS', label: '📥 Import Prodotti Zucchetti' },
  'sync-shopify': { queue: shopifyQueue, command: 'SYNC_ALL_PRODUCTS', label: '🛍️ Sync Shopify (Tutto)' },
  'sync-stock-shopify': { queue: shopifyQueue, command: 'SYNC_STOCK_ONLY', label: '📦 Sync Stock Shopify' },
};

function toCronExpression(value: number, unit: string): string {
  switch (unit) {
    case 'minutes': return `*/${value} * * * *`;
    case 'hours':   return `0 */${value} * * *`;
    case 'days':    return `0 0 */${value} * *`;
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

  const cronPattern = toCronExpression(config.intervalValue, config.intervalUnit);
  await mapping.queue.add(mapping.command, { command: mapping.command, source: 'scheduler' }, {
    repeat: { pattern: cronPattern }
  });
  log.info(`⏰ Schedulato ${jobId} con cron "${cronPattern}"`, { module: 'api-gateway:scheduler' });
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

    const state = Object.keys(JOB_MAPPINGS).map(jobId => {
      const c = configMap.get(jobId);
      return {
        id: jobId,
        label: JOB_MAPPINGS[jobId].label,
        enabled: c?.enabled || false,
        intervalValue: c?.intervalValue || 30,
        intervalUnit: c?.intervalUnit || 'minutes',
        status: c?.enabled ? 'active' : 'idle'
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
      body: z.object({ id: z.string(), intervalValue: z.number(), intervalUnit: z.string() }),
      response: { 200: z.object({ success: z.boolean() }) }
    }
  }, async (request, reply) => {
    const { id, intervalValue, intervalUnit } = request.body;
    log.info(`Updating interval for ${id} to ${intervalValue} ${intervalUnit}`, { module: 'api-gateway:scheduler' });

    const config = await prisma.schedulerConfig.upsert({
      where: { jobId: id },
      update: { intervalValue, intervalUnit },
      create: { jobId: id, enabled: false, intervalValue, intervalUnit }
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
    if (!mapping) return reply.status(400).send({ success: false, message: 'Job ID non valido' } as any);

    log.info(`Running job immediately ${id}`, { module: 'api-gateway:scheduler' });
    await mapping.queue.add(mapping.command, { command: mapping.command, source: 'manual' });
    
    return reply.status(200).send({ success: true, message: 'Job avviato in background' });
  });
}
