import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, JwtPayload } from '../auth.js';

export async function adminPreferencesRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get('/api/admin/preferences', { 
    preHandler: [authenticate],
    schema: {
      response: {
        200: z.object({
          widgetConfig: z.any().nullable(),
          theme: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const userPayload = (request as any).user as JwtPayload;
    const username = userPayload.username;

    try {
      const pref = await prisma.userPreference.findUnique({ where: { username } });
      return reply.status(200).send({
        widgetConfig: pref?.widgetConfig ? JSON.parse(pref.widgetConfig) : null,
        theme: pref?.theme || 'dark',
      });
    } catch {
      return reply.status(200).send({ widgetConfig: null, theme: 'dark' });
    }
  });

  fastify.put('/api/admin/preferences', {
    preHandler: [authenticate],
    schema: {
      body: z.object({
        widgetConfig: z.any().optional(),
        theme: z.string().optional()
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

    await prisma.userPreference.upsert({
      where: { username },
      create: { username, ...data },
      update: data,
    });

    return reply.status(200).send({ success: true });
  });
}
