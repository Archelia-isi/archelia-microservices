import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { log, redis } from '@archelia/core';
import { authenticate, JwtPayload } from '../auth.js';

export async function adminPreferencesRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get('/api/admin/preferences', { 
    preHandler: [authenticate],
    schema: {
      response: {
        200: z.object({
          widgetConfig: z.any().nullable(),
          theme: z.string(),
          osSettings: z.any().nullable()
        })
      }
    }
  }, async (request, reply) => {
    const userPayload = (request as any).user as JwtPayload;
    const username = userPayload.username;

    try {
      const pref = await prisma.userPreference.findUnique({ where: { username } });
      
      // Carichiamo anche osSettings da Redis
      let osSettings = null;
      try {
        const redisData = await (redis as any).get(`osSettings:${username}`);
        if (redisData) {
          osSettings = JSON.parse(redisData);
        }
      } catch (redisErr) {
        log.error('Errore nel caricare osSettings da Redis', redisErr);
      }

      return reply.status(200).send({
        widgetConfig: pref?.widgetConfig ? JSON.parse(pref.widgetConfig) : null,
        theme: pref?.theme || 'dark',
        osSettings
      });
    } catch {
      return reply.status(200).send({ widgetConfig: null, theme: 'dark', osSettings: null });
    }
  });

  fastify.put('/api/admin/preferences', {
    preHandler: [authenticate],
    schema: {
      body: z.object({
        widgetConfig: z.any().optional(),
        theme: z.string().optional(),
        osSettings: z.any().optional()
      }),
      response: {
        200: z.object({ success: z.boolean() })
      }
    }
  }, async (request, reply) => {
    const userPayload = (request as any).user as JwtPayload;
    const username = userPayload.username;

    const data: any = {};
    if (request.body.widgetConfig !== undefined) data.widgetConfig = JSON.stringify(request.body.widgetConfig);
    if (request.body.theme !== undefined) data.theme = request.body.theme;

    if (Object.keys(data).length > 0) {
      await prisma.userPreference.upsert({
        where: { username },
        create: { username, ...data },
        update: data,
      });
    }

    if (request.body.osSettings !== undefined) {
      try {
        await (redis as any).set(`osSettings:${username}`, JSON.stringify(request.body.osSettings));
      } catch (redisErr) {
        log.error('Errore nel salvare osSettings su Redis', redisErr);
      }
    }

    return reply.status(200).send({ success: true });
  });
}
