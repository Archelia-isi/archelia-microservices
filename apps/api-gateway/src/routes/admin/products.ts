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
    log.info('Cloudinary images requested', { module: 'api-gateway:products' });
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: 'dikvomlhu',
      api_key: '615533243888646',
      api_secret: 'V0tOJU7LIspzCKChEkwatu2ZnmE',
    });

    const existingFiles = new Set<string>();
    let nextCursor: string | undefined;
    do {
      const opts: any = { type: 'upload', prefix: 'prodotti/', max_results: 500 };
      if (nextCursor) opts.next_cursor = nextCursor;
      const result = await cloudinary.api.resources(opts);
      for (const res of result.resources) {
        const name = res.public_id.replace('prodotti/', '');
        existingFiles.add(name.toLowerCase());
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);
    return reply.status(200).send({ existingFiles: Array.from(existingFiles) });
  });

  // Upload Immagini (Multipart)
  fastify.post('/api/admin/upload-images', { 
    preHandler: [requireAdmin]
  }, async (request, reply) => {
    log.info('Image upload requested', { module: 'api-gateway:products' });
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: 'dikvomlhu',
      api_key: '615533243888646',
      api_secret: 'V0tOJU7LIspzCKChEkwatu2ZnmE',
    });
    const sharp = (await import('sharp')).default;
    const { imageService } = await import('@archelia/core');

    const PARALLEL_BATCH = 10;
    const CHUNK_THRESHOLD = 10_000_000;

    const parts = request.parts();
    type FileEntry = { filename: string; nameWithoutExt: string; buffer: Buffer };
    const toUpload: FileEntry[] = [];
    const results: { filename: string; status: 'uploaded' | 'error'; publicId?: string; error?: string }[] = [];
    let shouldRegenerateMap = false;

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'regenerateMap' && part.value === 'true') {
        shouldRegenerateMap = true;
        continue;
      }
      if (part.type !== 'file') continue;
      const filename = part.filename || 'unknown';
      let nameWithoutExt = filename.replace(/\.[^.]+$/, '');
      let buffer = await part.toBuffer();

      if (buffer.length > 9_000_000) {
        log.info(`📸 Ridimensionamento automatico per ${filename} (${Math.round(buffer.length / 1024 / 1024)}MB)...`, { module: 'api-gateway:products' });
        try {
          buffer = await sharp(buffer)
            .resize({ width: 2500, withoutEnlargement: true, fit: 'inside' })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 85 })
            .toBuffer();
        } catch (e: any) {
          log.warn(`⚠️ Impossibile ridimensionare ${filename}: ${e.message}`, { module: 'api-gateway:products' });
        }
      }

      toUpload.push({ filename, nameWithoutExt, buffer });
    }

    for (let i = 0; i < toUpload.length; i += PARALLEL_BATCH) {
      const batch = toUpload.slice(i, i + PARALLEL_BATCH);
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          const isLarge = file.buffer.length > CHUNK_THRESHOLD;
          const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'prodotti',
                public_id: file.nameWithoutExt,
                resource_type: 'image',
                overwrite: false,
                ...(isLarge && { chunk_size: 6_000_000 }),
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
          return { filename: file.filename, publicId: uploadResult.public_id };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        const file = batch[j];
        if (r.status === 'fulfilled') {
          results.push({ filename: file.filename, status: 'uploaded', publicId: r.value.publicId });
        } else {
          results.push({ filename: file.filename, status: 'error', error: String(r.reason) });
        }
      }
    }

    const uploaded = results.filter(r => r.status === 'uploaded').length;
    const errors = results.filter(r => r.status === 'error').length;
    let mapRegenerated = false;
    let mapStats = { articoli: 0, immagini: 0 };

    if (shouldRegenerateMap && uploaded > 0) {
      log.info('🔄 All upload chunks finished. Rigenerazione automatica mappa immagini...', { module: 'api-gateway:products' });
      try {
        let mapCursor: string | undefined;
        const allResources: any[] = [];
        do {
          const opts: any = { type: 'upload', prefix: 'prodotti/', max_results: 500 };
          if (mapCursor) opts.next_cursor = mapCursor;
          const result = await cloudinary.api.resources(opts);
          allResources.push(...result.resources);
          mapCursor = result.next_cursor;
        } while (mapCursor);

        const mappa: Record<string, string[]> = {};
        for (const res of allResources) {
          const publicId = res.public_id;
          const nomeFile = publicId.replace('prodotti/', '');
          const match = nomeFile.match(/^(.+?)\s*\(/);
          const codiceBreve = match ? match[1].trim() : nomeFile.trim();
          if (!mappa[codiceBreve]) mappa[codiceBreve] = [];
          mappa[codiceBreve].push(publicId);
        }
        for (const codice of Object.keys(mappa)) {
          mappa[codice].sort((a, b) => {
            const ma = a.match(/\((\d+)\)/); 
            const mb = b.match(/\((\d+)\)/); 
            return (ma ? parseInt(ma[1],10) : 0) - (mb ? parseInt(mb[1],10) : 0);
          });
        }

        const jsonStr = JSON.stringify(mappa, null, 2);
        await new Promise<void>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { public_id: 'prodotti/mappa_immagini.json', resource_type: 'raw', overwrite: true, invalidate: true },
            (error) => { if (error) reject(error); else resolve(); }
          );
          stream.end(Buffer.from(jsonStr));
        });

        imageService.setImageMapDirect(mappa);
        mapStats.articoli = Object.keys(mappa).length;
        mapStats.immagini = Object.values(mappa).reduce((s, arr) => s + arr.length, 0);
        mapRegenerated = true;
      } catch (e: any) {
        log.error(`⚠️ Rigenerazione mappa fallita: ${e.message}`, { module: 'api-gateway:products' });
      }
    }

    return reply.status(200).send({
      uploaded,
      errors,
      totalFiles: results.length,
      mapRegenerated,
      mapStats,
      results,
    });
  });

  // Refresh Mappa Immagini
  fastify.post('/api/admin/refresh-image-map', { preHandler: [requireAdmin] }, async (request, reply) => {
    log.info('🔄 Rigenerazione mappa immagini manuale...', { module: 'api-gateway:products' });
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: 'dikvomlhu',
      api_key: '615533243888646',
      api_secret: 'V0tOJU7LIspzCKChEkwatu2ZnmE',
    });
    const { imageService } = await import('@archelia/core');

    let nextCursor: string | undefined;
    const allResources: any[] = [];
    do {
      const opts: any = { type: 'upload', prefix: 'prodotti/', max_results: 500 };
      if (nextCursor) opts.next_cursor = nextCursor;
      const result = await cloudinary.api.resources(opts);
      allResources.push(...result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const mappa: Record<string, string[]> = {};
    for (const res of allResources) {
      const publicId = res.public_id;
      const nomeFile = publicId.replace('prodotti/', '');
      const match = nomeFile.match(/^(.+?)\s*\(/);
      if (!match) continue; 
      if (nomeFile.match(/\(1\)\s*$/)) continue;

      const codiceBreve = match[1].trim();
      if (!mappa[codiceBreve]) mappa[codiceBreve] = [];
      mappa[codiceBreve].push(publicId);
    }

    for (const codice of Object.keys(mappa)) {
      mappa[codice].sort((a, b) => {
        const ma = a.match(/\((\d+)\)/); 
        const mb = b.match(/\((\d+)\)/); 
        return (ma ? parseInt(ma[1],10) : 0) - (mb ? parseInt(mb[1],10) : 0);
      });
    }

    const jsonStr = JSON.stringify(mappa, null, 2);
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: 'prodotti/mappa_immagini.json', resource_type: 'raw', overwrite: true, invalidate: true },
        (error) => { if (error) reject(error); else resolve(); }
      );
      stream.end(Buffer.from(jsonStr));
    });

    imageService.setImageMapDirect(mappa);
    const articoli = Object.keys(mappa).length;
    const immagini = Object.values(mappa).reduce((s, arr) => s + arr.length, 0);
    return reply.status(200).send({ success: true, articoli, immagini });
  });

  // Report Immagini
  fastify.get('/api/admin/image-report', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { imageService } = await import('@archelia/core');
    await imageService.loadImageMap();
    const products = await prisma.product.findMany({ select: { sku: true, imageUrl: true } });
    
    const productsWithoutImages = products
      .filter(p => !p.imageUrl)
      .map(p => ({ sku: p.sku, shortCode: imageService.extractShortCode(p.sku) }));
      
    const productShortCodes = new Set(products.map(p => imageService.extractShortCode(p.sku).toUpperCase()));
    const map = await imageService.loadImageMap();
    const imagesWithoutProduct: { code: string; imageCount: number }[] = [];
    for (const [code, images] of Object.entries(map)) {
      if (!productShortCodes.has(code.toUpperCase())) {
        imagesWithoutProduct.push({ code, imageCount: images.length });
      }
    }

    return reply.status(200).send({
      summary: {
        totalProducts: products.length,
        productsWithImages: products.filter(p => p.imageUrl).length,
        productsWithoutImages: productsWithoutImages.length,
        totalImageCodes: Object.keys(map).length,
        imagesWithoutProduct: imagesWithoutProduct.length,
      },
      productsWithoutImages,
      imagesWithoutProduct,
    });
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
