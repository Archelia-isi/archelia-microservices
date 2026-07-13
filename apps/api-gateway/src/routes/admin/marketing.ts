import { FastifyInstance } from 'fastify';
import { prisma } from '@archelia/database';

export const marketingRoutes = async (fastify: FastifyInstance) => {
  
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

}
