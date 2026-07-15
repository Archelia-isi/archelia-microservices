import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@archelia/database';
import { logger, imageService } from '@archelia/core';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dikvomlhu',
  api_key: '615533243888646',
  api_secret: 'V0tOJU7LIspzCKChEkwatu2ZnmE',
});
export default async function imagesRoutes(fastify: FastifyInstance) {
  // GET /api/admin/cloudinary-images
  fastify.get('/cloudinary-images', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('📸 Scaricamento lista immagini esistenti da Cloudinary...');
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
      return { existingFiles: Array.from(existingFiles) };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore durante il fetch da Cloudinary' });
    }
  });

  // POST /api/admin/upload-images
  fastify.post('/upload-images', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
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
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
        let buffer = await part.toBuffer();

        if (buffer.length > 9_000_000) {
          logger.info(`📸 Ridimensionamento automatico per ${filename} (${Math.round(buffer.length / 1024 / 1024)}MB)...`);
          try {
            buffer = await sharp(buffer)
              .resize({ width: 2500, withoutEnlargement: true, fit: 'inside' })
              .flatten({ background: '#ffffff' })
              .jpeg({ quality: 85 })
              .toBuffer();
            logger.info(`📸 Ridimensionato a ${Math.round(buffer.length / 1024)}KB`);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            logger.warn(`⚠️ Impossibile ridimensionare ${filename}: ${errMsg}`);
          }
        }

        toUpload.push({ filename, nameWithoutExt, buffer });
      }

      logger.info(`📸 Ricevuti ${toUpload.length} file dal frontend, inizio caricamento...`);

      for (let i = 0; i < toUpload.length; i += PARALLEL_BATCH) {
        const batch = toUpload.slice(i, i + PARALLEL_BATCH);
        const batchNum = Math.floor(i / PARALLEL_BATCH) + 1;
        const totalBatches = Math.ceil(toUpload.length / PARALLEL_BATCH);
        logger.info(`📸 Batch ${batchNum}/${totalBatches} — ${batch.length} file...`);

        const batchResults = await Promise.allSettled(
          batch.map(async (file) => {
            const isLarge = file.buffer.length > CHUNK_THRESHOLD;

            const uploadResult = await new Promise<any>((resolve, reject) => {
              // Usa upload_stream con timeout esplicito o passa a data URI. 
              // Convertiamo il buffer in stream in modo corretto per evitare hang.
              const { Readable } = require('stream');
              const stream = new Readable();
              stream.push(file.buffer);
              stream.push(null);

              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'prodotti',
                  public_id: file.nameWithoutExt,
                  resource_type: 'auto', // Support any file safely
                  overwrite: false,
                  ...(isLarge && { chunk_size: 6_000_000 }),
                  timeout: 60000 // 60 seconds timeout
                },
                (error: any, result: any) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              
              // Handle stream errors
              uploadStream.on('error', (err) => reject(err));
              
              stream.pipe(uploadStream);
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
            const msg = r.reason instanceof Error ? r.reason.message : (r.reason?.message || r.reason?.error?.message || JSON.stringify(r.reason));
            results.push({ filename: file.filename, status: 'error', error: msg });
            logger.error(`❌ ${file.filename}: ${msg}`);
          }
        }
      }

      const uploaded = results.filter(r => r.status === 'uploaded').length;
      const errors = results.filter(r => r.status === 'error').length;
      logger.info(`📸 Chunk completato: ${uploaded} caricate, ${errors} errori`);

      let mapRegenerated = false;
      let mapStats = { articoli: 0, immagini: 0 };

      if (shouldRegenerateMap && uploaded > 0) {
        logger.info('🔄 All upload chunks finished. Rigenerazione automatica mappa immagini...');
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
              (error: any) => { if (error) reject(error); else resolve(); }
            );
            stream.end(Buffer.from(jsonStr));
          });

          imageService.setImageMapDirect(mappa);
          mapStats.articoli = Object.keys(mappa).length;
          mapStats.immagini = Object.values(mappa).reduce((s, arr) => s + arr.length, 0);
          mapRegenerated = true;
          logger.info(`✅ Mappa rigenerata: ${mapStats.articoli} articoli, ${mapStats.immagini} immagini`);
        } catch (mapError) {
          logger.error(`⚠️ Rigenerazione mappa fallita: ${mapError instanceof Error ? mapError.message : mapError}`);
        }
      }

      return {
        uploaded,
        errors,
        totalFiles: results.length,
        mapRegenerated,
        mapStats,
        results,
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore interno server' });
    }
  });

  // POST /api/admin/refresh-image-map
  fastify.post('/refresh-image-map', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('🔄 Rigenerazione mappa immagini manuale...');

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
          (error: any) => { if (error) reject(error); else resolve(); }
        );
        stream.end(Buffer.from(jsonStr));
      });

      imageService.setImageMapDirect(mappa);
      const articoli = Object.keys(mappa).length;
      const totImmagini = Object.values(mappa).reduce((s, arr) => s + arr.length, 0);
      logger.info(`✅ Mappa rigenerata: ${articoli} articoli, ${totImmagini} immagini`);

      return { success: true, articoli, immagini: totImmagini };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore rigenerazione mappa' });
    }
  });

  // GET /api/admin/image-report
  fastify.get('/image-report', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
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

      return {
        summary: {
          totalProducts: products.length,
          productsWithImages: products.filter(p => p.imageUrl).length,
          productsWithoutImages: productsWithoutImages.length,
          totalImageCodes: Object.keys(map).length,
          imagesWithoutProduct: imagesWithoutProduct.length,
        },
        productsWithoutImages,
        imagesWithoutProduct,
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Errore caricamento report' });
    }
  });
}
