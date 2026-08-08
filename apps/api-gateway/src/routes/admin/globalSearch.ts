import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { searchProducts } from '@archelia/typesense';
import { requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminGlobalSearchRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get('/api/admin/search/global', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        q: z.string().min(1),
        limit: z.coerce.number().default(5)
      }),
      response: {
        200: z.object({
          results: z.array(z.object({
            type: z.enum(['PRODUCT', 'ORDER', 'CUSTOMER']),
            id: z.string(),
            title: z.string(),
            subtitle: z.string(),
            image: z.string().optional()
          }))
        })
      }
    }
  }, async (request, reply) => {
    const { q, limit } = request.query;
    const cleanSearch = q.trim();
    const results: any[] = [];

    try {
      // 1. Eseguiamo in parallelo le query
      const [productsRes, ordersRes, customersRes] = await Promise.all([
        // Ricerca Typesense per i prodotti
        searchProducts(cleanSearch, { includeUnpublished: true }).then((res: any) => {
          if (limit) {
            res.hits = res.hits?.slice(0, limit);
          }
          return res;
        }).catch((e: any) => {
           log.error(`[GlobalSearch] Typesense error: ${e.message}`);
           return { hits: [] };
        }),
        // Ricerca Prisma per gli Ordini
        prisma.zelShopifyOrder.findMany({
          where: {
            OR: [
              { orderNumber: { contains: cleanSearch, mode: 'insensitive' } },
              { orderNumber: { contains: cleanSearch.replace('#', ''), mode: 'insensitive' } },
              { shopifyOrderId: { contains: cleanSearch, mode: 'insensitive' } }
            ]
          },
          take: limit
        }).catch((e: any) => {
           log.error(`[GlobalSearch] DB Orders error: ${e.message}`);
           return [];
        }),
        // Ricerca Prisma per i Clienti
        prisma.zelShopifyCustomer.findMany({
          where: {
            OR: [
              { email: { contains: cleanSearch, mode: 'insensitive' } },
              { firstName: { contains: cleanSearch, mode: 'insensitive' } },
              { lastName: { contains: cleanSearch, mode: 'insensitive' } },
              { zucchettiArcId: { contains: cleanSearch, mode: 'insensitive' } },
              { shopifyId: { contains: cleanSearch, mode: 'insensitive' } }
            ]
          },
          take: limit
        }).catch((e: any) => {
           log.error(`[GlobalSearch] DB Customers error: ${e.message}`);
           return [];
        })
      ]);

      // 2. Normalizzazione Prodotti
      const productHits = productsRes?.hits || [];
      for (const hit of productHits) {
        const doc = hit.document;
        results.push({
          type: 'PRODUCT',
          id: String(doc.id),
          title: doc.title || doc.original_name || doc.sku,
          subtitle: `SKU: ${doc.sku} - €${(doc.price || 0).toFixed(2)}`,
          image: doc.image_url
        });
      }

      // 3. Normalizzazione Ordini
      for (const order of ordersRes) {
        results.push({
          type: 'ORDER',
          id: order.id,
          title: `Ordine #${order.orderNumber || order.shopifyOrderId}`,
          subtitle: `Cliente ID: ${order.shopifyCustomerId || 'Sconosciuto'} - €${(Number(order.totalPrice) || 0).toFixed(2)}`
        });
      }

      // 4. Normalizzazione Clienti
      for (const customer of customersRes) {
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Utente Senza Nome';
        const code = customer.zucchettiArcId ? `Codice: ${customer.zucchettiArcId}` : 'Nessun codice ERP';
        results.push({
          type: 'CUSTOMER',
          id: customer.shopifyId,
          title: name,
          subtitle: `${customer.email || 'Nessuna email'} - ${code}`
        });
      }
      
      return reply.send({ results });

    } catch (e: any) {
      log.error(`Errore in global search: ${e.message}`, { module: 'api-gateway:search' });
      return reply.send({ results: [] });
    }
  });
}
