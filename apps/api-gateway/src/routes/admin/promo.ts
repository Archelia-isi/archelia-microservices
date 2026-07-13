import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { shopifyPromoQueue } from '@archelia/core';

export default async function adminPromoRoutes(fastify: FastifyInstance) {
  
  fastify.post('/api/admin/promo/trigger', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        action: z.enum(['apply', 'revert'])
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    const { action } = request.body as { action: 'apply' | 'revert' };
    
    // Invece di eseguire il comando direttamente nel server web, mettiamo un job in coda su Redis.
    // Il worker-promo o chi per lui prenderà in carico l'operazione.
    await shopifyPromoQueue.add('promo-trigger', { action });

    return reply.send({
      success: true,
      message: `Azione promo '${action}' accodata con successo!`
    });
  });

  fastify.get('/api/admin/promo/health', {
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({
          status: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    return reply.send({ status: 'ok' });
  });

  // NUOVO: Endpoint per creare una promozione manuale
  fastify.post('/api/admin/promo/manual', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        titolo: z.string(),
        descrizione: z.string().optional(),
        tipo_promozione: z.enum(['sconto_percentuale', 'sconto_fisso', '3x2', 'spedizione_gratuita', 'bundle', 'flash_deal', 'taglio_prezzo']),
        valore_sconto: z.number().optional(),
        codice_sconto: z.string().optional(),
        collezione_target: z.string().optional(),
        famiglia_target: z.string().optional(),
        prodotti_target: z.array(z.string()).optional(),
        data_inizio: z.string().optional(),
        data_fine: z.string().optional(),
        badge_testo: z.string().optional(),
        badge_colore: z.string().optional(),
        priorita: z.number().optional(),
        inviaNotificaPush: z.boolean().optional(),
      })
    }
  }, async (request, reply) => {
    await shopifyPromoQueue.add('CREATE_MANUAL_PROMO', request.body);
    return reply.send({ success: true, message: 'Creazione promozione manuale accodata.' });
  });

  // NUOVO: Endpoint per avviare il brain AI manualmente (Test)
  fastify.post('/api/admin/promo/auto/run', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    await shopifyPromoQueue.add('RUN_AUTO_PROMO_BRAIN', { isManualToday: true });
    return reply.send({ success: true, message: 'Auto Promo Brain avviato.' });
  });

  // NUOVO: Endpoint per forzare il Flash Deal
  fastify.post('/api/admin/promo/flash/run', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    await shopifyPromoQueue.add('TEST_FLASH_DEAL', {});
    return reply.send({ success: true, message: 'Flash Deal forzato avviato.' });
  });

  // NUOVO: Endpoint per salvare in tempo reale le impostazioni delle automazioni promozionali
  fastify.post('/api/admin/promo/auto/settings', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { isDatabaseSafeToWrite, log } = await import('@archelia/core');
    const { prisma } = await import('@archelia/database');

    if (!isDatabaseSafeToWrite()) {
      log.info('🛡️ [DRY-RUN] Intercettato salvataggio impostazioni PromoAuto (DB Produzione protetto).', { module: 'api-gateway' });
      return reply.send({ success: true, message: 'Dry-run: impostazioni "salvate" nei log.' });
    }

    try {
      const payload = request.body as any;
      await prisma.autoPromoSettings.upsert({
        where: { id: 'singleton' },
        update: payload,
        create: { id: 'singleton', ...payload }
      });
      return reply.send({ success: true, message: 'Impostazioni salvate con successo.' });
    } catch (e: any) {
      log.error(`Errore nel salvataggio delle impostazioni: ${e.message}`, { module: 'api-gateway' });
      return reply.status(500).send({ success: false, message: 'Errore interno.' });
    }
  });
}
