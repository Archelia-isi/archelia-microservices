import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';
import { env, log, createRedisConnection } from '@archelia/core';

// Set up BullMQ queue for manual triggers
const equalizzatoreQueue = new Queue('equalizzatore-commands', {
  connection: createRedisConnection() as any,
});

export async function adminEqualizzatoreRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    '/api/admin/equalizzatore/staging',
    {
      // TODO: Add auth middleware when available
      // preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const stagingItems = await prisma.equalizzatoreStaging.findMany({
          orderBy: { createdAt: 'desc' },
          where: { reviewStatus: 'PENDING' },
          take: 50,
        });

        const enhancedItems = await Promise.all(
          stagingItems.map(async (item) => {
            const raw = await prisma.elmarkRawProduct.findUnique({
              where: { elmarkId: item.sourceId },
            });

            let imageUrl = null;
            if (raw && raw.rawData) {
              const parsedRaw = typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : raw.rawData;
              imageUrl = parsedRaw?.picture_url || null;
            }

            return {
              ...item,
              originalRawData: raw ? (typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : raw.rawData) : null,
              imageUrl,
            };
          })
        );

        return { success: true, data: enhancedItems };
      } catch (error: any) {
        log.error('Errore fetch equalizzatore staging', { error: error.message, stack: error.stack });
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  fastify.put(
    '/api/admin/equalizzatore/staging/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          approvedPayload: z.any().optional(),
          reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
          pipelineStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR']).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { approvedPayload, reviewStatus, pipelineStatus } = request.body;

      try {
        const updated = await prisma.equalizzatoreStaging.update({
          where: { id },
          data: {
            ...(approvedPayload !== undefined && { approvedPayload }),
            ...(reviewStatus !== undefined && { reviewStatus }),
            ...(pipelineStatus !== undefined && { pipelineStatus }),
          },
        });
        return { success: true, data: updated };
      } catch (error: any) {
        log.error('Errore update equalizzatore staging', { error: error.message });
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  fastify.post(
    '/api/admin/equalizzatore/trigger',
    {
      schema: {
        body: z.object({
          action: z.enum(['RUN_BATCH', 'RUN_SINGLE']),
          sku: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { action, sku } = request.body;

      try {
        if (action === 'RUN_SINGLE') {
          if (!sku) {
            return reply.status(400).send({ success: false, error: 'SKU is required for RUN_SINGLE' });
          }
          await equalizzatoreQueue.add('process-single', { sku });
          log.info(`Accodato RUN_SINGLE per ${sku}`, { module: 'api-gateway' });
        } else if (action === 'RUN_BATCH') {
          await equalizzatoreQueue.add('process-batch', {});
          log.info(`Accodato RUN_BATCH`, { module: 'api-gateway' });
        }
        return { success: true, message: `Azione ${action} innescata con successo su Redis.` };
      } catch (error: any) {
        log.error('Errore trigger equalizzatore', { error: error.message });
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );
}
