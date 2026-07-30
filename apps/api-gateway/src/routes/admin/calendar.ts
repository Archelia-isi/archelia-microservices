import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';

export async function adminCalendarRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Get all events
  fastify.get('/api/admin/calendar', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.array(z.any())
      }
    }
  }, async (request, reply) => {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { start: 'asc' }
    });
    return reply.status(200).send(events);
  });

  // Create an event
  fastify.post('/api/admin/calendar', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        title: z.string(),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        color: z.string().optional(),
        allDay: z.boolean().default(false)
      }),
      response: {
        200: z.any()
      }
    }
  }, async (request, reply) => {
    const { title, description, start, end, color, allDay } = request.body;
    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        color,
        allDay
      }
    });
    return reply.status(200).send(newEvent);
  });

  // Update an event
  fastify.put('/api/admin/calendar/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        color: z.string().optional(),
        allDay: z.boolean().optional()
      }),
      response: {
        200: z.any()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;
    
    const updateData: any = { ...body };
    if (body.start) updateData.start = new Date(body.start);
    if (body.end) updateData.end = new Date(body.end);

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData
    });
    return reply.status(200).send(updated);
  });

  // Delete an event
  fastify.delete('/api/admin/calendar/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ success: z.boolean() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    await prisma.calendarEvent.delete({ where: { id } });
    return reply.status(200).send({ success: true });
  });
}
