import { Job } from 'bullmq';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';

export class CartSyncJob {
  static async process(job: Job) {
    const { customerId, customerEmail, cartData } = job.data;
    const source = job.name; // 'app-cart-sync' o 'checkout-update' ecc

    log.info(`[CartSyncJob] Ricevuto aggiornamento carrello per customer ${customerId} (${customerEmail})`, { module: 'worker-marketing' });

    try {
      // Calcoliamo lo stato in base al contenuto
      const itemCount = cartData.item_count ?? (cartData.items?.length ?? cartData.lines?.length ?? -1);
      const isAbandoned = itemCount > 0;
      
      const status = isAbandoned ? 'PENDING' : 'EMPTY';

      // Aggiorniamo o creiamo il record su Prisma per il Marketing Nurturing
      await prisma.cartSyncQueue.upsert({
        where: { customerId: customerId.toString() },
        create: {
          customerId: customerId.toString(),
          cartPayload: cartData,
          source: source,
          status: status,
          attempts: 0
        },
        update: {
          cartPayload: cartData,
          source: source,
          status: status,
          updatedAt: new Date(),
          attempts: 0 // Reset attempts se l'utente ha modificato il carrello
        }
      });

      // Se vogliamo anche loggarlo negli eventi di marketing:
      if (isAbandoned) {
        await prisma.marketingEvent.create({
          data: {
            customerId: customerId.toString(),
            customerEmail: customerEmail,
            eventType: 'CART_UPDATED',
            payload: cartData,
          }
        });
      }

      log.info(`[CartSyncJob] Carrello salvato su DB. customerId=${customerId}, status=${status}`, { module: 'worker-marketing' });

      // TODO: Push to Shopify Metafields (via worker-shopify-push o qui direttamente)
      
      return { success: true, status };
    } catch (error: any) {
      log.error(`[CartSyncJob] Errore salvataggio carrello: ${error.message}`, { error, module: 'worker-marketing' });
      throw error;
    }
  }
}
