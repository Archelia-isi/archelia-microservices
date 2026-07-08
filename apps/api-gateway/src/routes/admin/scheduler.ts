import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminSchedulerRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Stato dello Scheduler
  fastify.get('/api/admin/scheduler', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.array(z.any()) }
    }
  }, async (request, reply) => {
    // TODO: In V2 get the state of BullMQ queues/repeatable jobs
    return reply.status(200).send([
      { id: 'sync-customers', status: 'idle', interval: '10m', nextRun: new Date() }
    ]);
  });

  // Toggle Job
  fastify.get('/api/admin/scheduler/toggle', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({ id: z.string() }),
      response: { 200: z.object({ success: z.boolean(), state: z.any() }) }
    }
  }, async (request, reply) => {
    const { id } = request.query;
    log.info(`Toggling scheduler job ${id}`, { module: 'api-gateway:scheduler' });
    return reply.status(200).send({ success: true, state: [] });
  });

  // Aggiorna Intervallo
  fastify.get('/api/admin/scheduler/update-interval', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({ id: z.string(), interval: z.string() }),
      response: { 200: z.object({ success: z.boolean(), state: z.any() }) }
    }
  }, async (request, reply) => {
    const { id, interval } = request.query;
    log.info(`Updating interval for ${id} to ${interval}`, { module: 'api-gateway:scheduler' });
    return reply.status(200).send({ success: true, state: [] });
  });

  // Esegui Subito
  fastify.get('/api/admin/scheduler/run-now', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({ id: z.string() }),
      response: { 200: z.object({ success: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    const { id } = request.query;
    log.info(`Running job immediately ${id}`, { module: 'api-gateway:scheduler' });
    return reply.status(200).send({ success: true, message: 'Job avviato in background' });
  });

  // Kill All
  fastify.get('/api/admin/scheduler/kill-all', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.object({ success: z.boolean(), state: z.any() }) }
    }
  }, async (request, reply) => {
    log.info(`Killing all jobs`, { module: 'api-gateway:scheduler' });
    return reply.status(200).send({ success: true, state: [] });
  });
}
