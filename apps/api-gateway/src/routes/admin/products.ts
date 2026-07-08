import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { authenticate, requireAdmin } from '../auth.js';
import { log } from '@archelia/core';

export async function adminProductsRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Elenco prodotti paginato e con ricerca
  fastify.get('/api/admin/products', { 
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional(),
        brand: z.string().optional(),
        family: z.string().optional()
      }),
      response: {
        200: z.object({
          data: z.array(z.any()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { page, limit, search, brand, family } = request.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (brand) where.brand = brand;
    if (family) where.family = family;

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { sku: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where })
    ]);

    return reply.status(200).send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  // Dettaglio prodotto singolo
  fastify.get('/api/admin/products/:id', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        id: z.string()
      }),
      response: {
        200: z.any(),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const product = await prisma.product.findUnique({
      where: { id: request.params.id }
    });
    
    if (!product) {
      return reply.status(404).send({ error: 'Prodotto non trovato' });
    }
    
    return reply.status(200).send(product);
  });

  // Immagini Cloudinary
  fastify.get('/api/admin/cloudinary-images', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.object({ existingFiles: z.array(z.string()) })
      }
    }
  }, async (request, reply) => {
    // TODO: Implement Cloudinary SDK logic
    log.info('Cloudinary images requested', { module: 'api-gateway:products' });
    return reply.status(200).send({ existingFiles: [] });
  });

  // Upload Immagini (Multipart)
  fastify.post('/api/admin/upload-images', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.any()
      }
    }
  }, async (request, reply) => {
    // TODO: Implement Image Upload logic with Sharp and Cloudinary
    log.info('Image upload requested', { module: 'api-gateway:products' });
    return reply.status(200).send({ status: 'queued' });
  });

  // Export Prodotti CSV
  fastify.get('/api/admin/export/products-csv', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.string()
      }
    }
  }, async (request, reply) => {
    const products = await prisma.product.findMany({
      select: { sku: true, title: true, price: true, stock: true, brand: true }
    });

    let csv = '\uFEFFSKU,Titolo,Prezzo,Giacenza,Marca\r\n';
    for (const p of products) {
      const title = String(p.title || '').replace(/"/g, '""');
      csv += `${p.sku},"${title}",${p.price},${p.stock},${p.brand}\r\n`;
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="prodotti.csv"');
    return reply.status(200).send(csv);
  });
}
