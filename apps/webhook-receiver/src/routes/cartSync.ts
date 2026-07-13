import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env, log } from '@archelia/core';
import { shopifyTrackingQueue } from '@archelia/core';
import jwt from 'jsonwebtoken';

const APP_SYNC_SECRET = env.APP_CART_SYNC_SECRET;
const SHOPIFY_TOKEN_ISSUER = `https://${env.SHOPIFY_SHOP_DOMAIN || 'archeliatest.myshopify.com'}/admin`;

export async function cartSyncRoutes(app: FastifyInstance) {
  app.post('/api/v1/sync/cart', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const body = request.body as any;

      if (!body || !body.customerId || !body.customerEmail || !body.cartData) {
        return reply.status(400).send({
          success: false,
          message: 'Richiesta non valida. customerId, customerEmail e cartData sono obbligatori.'
        });
      }

      let isAuthenticated = false;
      let authMethod = '';
      const numericCustomerId = Number(body.customerId);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ success: false, message: 'Token mancante' });
      }

      const token = authHeader.split(' ')[1];

      // 1. Check Shared Secret (App proxy fallback)
      if (APP_SYNC_SECRET && token === APP_SYNC_SECRET) {
        isAuthenticated = true;
        authMethod = 'SHARED_SECRET';
      } 
      // 2. Check Shopify JWT (Storefront App Block)
      else if (token.startsWith('shcat_') || token.split('.').length === 3) {
        try {
          const decoded = jwt.decode(token) as jwt.JwtPayload;
          
          if (!decoded) throw new Error('Decode failed');

          const nowSec = Math.floor(Date.now() / 1000);
          if (decoded.exp && decoded.exp < nowSec) {
            throw new Error('Token scaduto');
          }
          if (decoded.iss && !decoded.iss.includes('myshopify.com')) {
            throw new Error('Issuer non valido');
          }

          // La validazione del cliente
          const jwtCustomerId = decoded.sub ? Number(decoded.sub) : null;
          if (jwtCustomerId && jwtCustomerId !== numericCustomerId) {
            log.warn(`[CART SYNC] Mismatch customerId: JWT=${jwtCustomerId} body=${numericCustomerId}`);
            throw new Error('Customer ID mismatch');
          }

          isAuthenticated = true;
          authMethod = 'SHOPIFY_JWT';
        } catch (err: any) {
          log.warn(`[CART SYNC] JWT non valido: ${err.message}`, { module: 'webhook-receiver' });
        }
      }

      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          message: 'Autenticazione fallita.'
        });
      }

      const payload = typeof body.cartData === 'string' ? JSON.parse(body.cartData) : body.cartData;
      const incomingItemCount = payload.item_count || 0;

      log.info(`🔍 [APP CART SYNC] auth=${authMethod} | customerId=${numericCustomerId} | email=${body.customerEmail} | item_count=${incomingItemCount}`, { module: 'webhook-receiver' });

      // Spingiamo il job nella coda di tracking
      await shopifyTrackingQueue.add('app-cart-sync', {
        customerId: numericCustomerId,
        customerEmail: body.customerEmail,
        cartData: payload
      });

      return reply.status(200).send({ success: true, message: 'Cart in sync' });

    } catch (error: any) {
      log.error(`[CART SYNC] Errore critico: ${error.message}`, { error, module: 'webhook-receiver' });
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
