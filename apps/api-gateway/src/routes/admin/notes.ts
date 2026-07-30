import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';

export async function adminNotesRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Get all notes
  fastify.get('/api/admin/notes', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.array(z.any())
      }
    }
  }, async (request, reply) => {
    const notes = await prisma.note.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    return reply.status(200).send(notes);
  });

  // Create a note
  fastify.post('/api/admin/notes', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        title: z.string(),
        content: z.string(),
        color: z.string().optional(),
        isPinned: z.boolean().default(false)
      }),
      response: {
        200: z.any()
      }
    }
  }, async (request, reply) => {
    const { title, content, color, isPinned } = request.body;
    const newNote = await prisma.note.create({
      data: {
        title,
        content,
        color,
        isPinned
      }
    });
    return reply.status(200).send(newNote);
  });

  // Update a note
  fastify.put('/api/admin/notes/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        color: z.string().optional(),
        isPinned: z.boolean().optional()
      }),
      response: {
        200: z.any()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;
    
    const updated = await prisma.note.update({
      where: { id },
      data: body
    });
    return reply.status(200).send(updated);
  });

  // Delete a note
  fastify.delete('/api/admin/notes/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ success: z.boolean() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    await prisma.note.delete({ where: { id } });
    return reply.status(200).send({ success: true });
  });
}
