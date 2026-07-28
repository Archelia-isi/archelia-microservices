import { FastifyInstance } from 'fastify';
import { prisma } from '@archelia/database';

export async function adminSettingsRoutes(app: FastifyInstance) {
  
  app.get('/settings', async (request, reply) => {
    try {
      const settings = await prisma.globalSettings.findUnique({
        where: { id: 'default' }
      });
      
      let config = {};
      if (settings?.config) {
        try {
          config = JSON.parse(settings.config);
        } catch (e) {
          console.error("Errore parsing GlobalSettings", e);
        }
      } else {
        // Default iniziale se non esiste nulla
        config = {
          orderNotificationEmails: ['salvatore@immobiliareizzo.com', 'fdn.izzo@gmail.com'],
          telegramChatId: ''
        };
      }
      
      return reply.send(config);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch global settings' });
    }
  });

  app.post('/settings', async (request, reply) => {
    try {
      const newConfig = request.body;
      
      await prisma.globalSettings.upsert({
        where: { id: 'default' },
        update: {
          config: JSON.stringify(newConfig)
        },
        create: {
          id: 'default',
          config: JSON.stringify(newConfig)
        }
      });
      
      return reply.send({ success: true });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update global settings' });
    }
  });
}
