import { FastifyInstance } from 'fastify';
import { prisma } from '@archelia/database';
import { generateMjmlEmail } from '@archelia/ai';

export const marketingRoutes = async (fastify: FastifyInstance) => {
  
  // Endpoint per la generazione MJML con Intelligenza Artificiale
  fastify.post<{ Body: { prompt: string } }>('/api/v1/admin/marketing/generate-email', async (request, reply) => {
    try {
      const { prompt } = request.body;
      if (!prompt) {
        return reply.status(400).send({ success: false, error: 'Prompt mancante' });
      }

      const result = await generateMjmlEmail(prompt);
      return { success: true, data: result };

    } catch (error: any) {
      request.log.error(`[Admin] Errore generazione MJML: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore durante la generazione AI' });
    }
  });

  // Endpoint per le Email (MarketingJob)
  fastify.get('/api/v1/admin/marketing/jobs', async (request, reply) => {
    try {
      const jobs = await prisma.marketingJob.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          event: true,
          template: true
        }
      });
      return { success: true, data: jobs };
    } catch (error: any) {
      request.log.error(`[Admin] Errore recupero Marketing Jobs: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

  // Endpoint per le Notifiche Push (PushJob)
  fastify.get('/api/v1/admin/marketing/pushes', async (request, reply) => {
    try {
      const pushes = await prisma.pushJob.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' }
      });
      return { success: true, data: pushes };
    } catch (error: any) {
      request.log.error(`[Admin] Errore recupero Push Jobs: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

  // Endpoint per la coda dei carrelli
  fastify.get('/api/v1/admin/marketing/carts', async (request, reply) => {
    try {
      const carts = await prisma.cartSyncQueue.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' }
      });
      return { success: true, data: carts };
    } catch (error: any) {
      request.log.error(`[Admin] Errore recupero CartSyncQueue: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

  // Endpoint per la configurazione Marketing (Settings)
  fastify.get('/api/v1/admin/marketing/config', async (request, reply) => {
    try {
      let config = await prisma.marketingSettings.findUnique({
        where: { id: 'marketing_config' }
      });
      if (!config) {
        config = await prisma.marketingSettings.create({
          data: { id: 'marketing_config' }
        });
      }
      return { success: true, data: config };
    } catch (error: any) {
      request.log.error(`[Admin] Errore recupero MarketingConfig: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

  fastify.put<{ Body: any }>('/api/v1/admin/marketing/config', async (request, reply) => {
    try {
      const updates = request.body;
      const config = await prisma.marketingSettings.upsert({
        where: { id: 'marketing_config' },
        update: updates as any,
        create: { id: 'marketing_config', ...(updates as any) }
      });
      return { success: true, data: config };
    } catch (error: any) {
      request.log.error(`[Admin] Errore salvataggio MarketingConfig: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

  // Endpoint per eliminare in massa i job
  fastify.delete<{ Body: { ids: string[] } }>('/api/v1/admin/marketing/jobs', async (request, reply) => {
    try {
      const { ids } = request.body;
      if (!ids || !Array.isArray(ids)) {
         return reply.status(400).send({ success: false, error: 'ids array mancante' });
      }
      await prisma.marketingJob.deleteMany({
        where: { id: { in: ids } }
      });
      return { success: true };
    } catch (error: any) {
      request.log.error(`[Admin] Errore eliminazione jobs: ${error.message}`);
      return reply.status(500).send({ success: false, error: 'Errore interno del server' });
    }
  });

}
