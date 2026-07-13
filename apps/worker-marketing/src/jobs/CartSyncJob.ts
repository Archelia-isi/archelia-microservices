import { Job } from 'bullmq';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { shopifyGraphQL } from '@archelia/shopify';

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

      // Sincronizzazione con Shopify tramite Metafield (App <-> Sito)
      const customerGid = customerId.toString().includes('gid://')
        ? customerId.toString()
        : `gid://shopify/Customer/${customerId}`;

      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [
          {
            ownerId: customerGid,
            namespace: 'custom',
            key: 'cart_sync',
            type: 'json',
            value: JSON.stringify(cartData),
          },
        ],
      };

      try {
        // [READ-ONLY BLOCK] 
        // Blocco di sicurezza temporaneo: non scriviamo nulla su Shopify in Produzione
        // durante la fase di sviluppo V2.
        
        // const result = await shopifyGraphQL.query(mutation, variables);
        // const errors = (result as any)?.metafieldsSet?.userErrors;
        // if (errors && errors.length > 0) {
        //   log.warn(`[CartSyncJob] Shopify Metafield warning: ${JSON.stringify(errors)}`, { module: 'worker-marketing' });
        // } else {
        //   log.info(`[CartSyncJob] Carrello sincronizzato con successo su Shopify Metafields (custom.cart_sync)`, { module: 'worker-marketing' });
        // }
        
        log.info(`[CartSyncJob] 🛡️ [BLOCCO SICUREZZA] Sincronizzazione carrello verso Shopify intercettata e bloccata (READ-ONLY mode).`, { module: 'worker-marketing' });
      } catch (gqlErr: any) {
        log.error(`[CartSyncJob] Errore sincronizzazione Shopify Metafields: ${gqlErr.message}`, { error: gqlErr, module: 'worker-marketing' });
        // Non blocchiamo il job se Shopify fallisce temporaneamente
      }
      
      return { success: true, status };
    } catch (error: any) {
      log.error(`[CartSyncJob] Errore salvataggio carrello: ${error.message}`, { error, module: 'worker-marketing' });
      throw error;
    }
  }
}
