import { Job } from 'bullmq';
import { ISupplierStrategy } from './ISupplierStrategy.js';
import { prisma } from '@archelia/database';
import { zucchettiClient, zucchettiAuth } from '@archelia/zucchetti';
import { env, log as logger, imageService } from '@archelia/core';
import { v2 as cloudinary } from 'cloudinary';
// @ts-ignore
import sax from 'sax';
import crypto from 'crypto';

export class ElmarkStrategy implements ISupplierStrategy {
  getSupplierId(): string {
    return 'ELMARK';
  }

  async importCatalog(job: Job): Promise<void> {
    logger.info('[ElmarkStrategy] Inizio importazione catalogo (XML Stream)...', { module: 'sync' });
    
    // Step 1: Download XML (usiamo l'API Elmark ufficiale)
    const response = await fetch('https://api.elmarkgroup.eu/api/Elmark/GetItems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: 'elmarkstore-int'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Elmark API: ${response.statusText}`);
    }

    const rawText = await response.text();
    let xmlString: string = '';
    try {
      xmlString = JSON.parse(rawText);
    } catch (e) {
      xmlString = rawText;
    }

    logger.info(`[ElmarkStrategy] XML ottenuto. Lunghezza: ${xmlString.length} caratteri. Avvio parsing...`, { module: 'sync' });

    // Parse stream and batch insert
    const saxStream = sax.createStream(true, { trim: true });
    
    let objectStack: any[] = [];
    let currentObj: any = null;
    let currentText = '';
    let itemsToInsert: any[] = [];
    
    let processedCount = 0;
    
    const flushBatch = async () => {
      if (itemsToInsert.length === 0) return;
      const batch = [...itemsToInsert];
      itemsToInsert = [];
      
      try {
        const values: any[] = [];
        const placeholdersRaw = batch.map((item, i) => {
          const offset = i * 4;
          values.push(crypto.randomUUID(), item.id, JSON.stringify(item), 'false');
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}::jsonb, $${offset + 4}, NOW(), NOW())`;
        }).join(', ');

        const queryRaw = `
          INSERT INTO elmark_raw_products ("id", "elmarkId", "rawData", "processed", "createdAt", "updatedAt")
          VALUES ${placeholdersRaw}
          ON CONFLICT ("elmarkId") DO UPDATE 
          SET "rawData" = EXCLUDED."rawData", "updatedAt" = EXCLUDED."updatedAt";
        `;

        await prisma.$executeRawUnsafe(queryRaw, ...values);

        // --- FASE 1.5: INSERIMENTO SCHELETRO PRODOTTO ---
        // Estraiamo prezzo e giacenza per averli subito aggiornati per Zucchetti
        for (const item of batch) {
          try {
            const elmarkId = item.id;
            const sku = `ELM.${elmarkId}`;
            
            // Calcolo giacenza
            let totalStock = 0;
            if (item.availability && item.availability.quantity) {
              totalStock = parseFloat(item.availability.quantity) || 0;
            } else if (item.quantities) {
              const qties = item.quantities;
              if (Array.isArray(qties)) {
                totalStock = qties.reduce((acc: number, curr: any) => acc + (parseFloat(curr.qty) || 0), 0);
              } else if (qties.qty) {
                totalStock = parseFloat(qties.qty) || 0;
              }
            }

            // Calcolo Sconto d'acquisto (come vecchio Phase 1.5)
            const discgroup = item.discgroup || '';
            let purchaseDiscount = 0;
            if (discgroup === 'C' || discgroup === 'E2' || discgroup === 'F') purchaseDiscount = 0.25;
            if (discgroup === 'E1' || discgroup === 'L') purchaseDiscount = 0.50;

            let price = 0;
            if (item.endcustprice?.price_exclvat) {
              price = parseFloat(item.endcustprice.price_exclvat) || 0;
            } else if (Array.isArray(item.endcustprice) && item.endcustprice[0]?.price_exclvat) {
              price = parseFloat(item.endcustprice[0].price_exclvat) || 0;
            }

            // Dimensioni
            const netWeight = parseFloat(item.netweight || '0');
            const grossWeight = parseFloat(item.grossweight || '0');
            const volume = parseFloat(item.volume || '0');

            await prisma.product.upsert({
              where: { sku: sku },
              create: {
                sku: sku,
                zucchettiCode: sku, // Temporaneo finché non va in Zucchetti
                brand: 'ELMARK',
                title: item.title || item.name || '',
                price: price,
                stockEk: totalStock,
                netWeight: netWeight,
                grossWeight: grossWeight,
                volume: volume,
                imageUrl: item.picture_url || ''
              },
              update: {
                price: price,
                stockEk: totalStock,
                imageUrl: item.picture_url || ''
              }
            });

            // FASE 1.6: Allineamento giacenze e prezzi anche su elmark_processed_products
            // in modo che il frontend (che legge il record processato) abbia dati live.
            try {
              const purchasePrice = price - (price * purchaseDiscount);
              await prisma.elmarkProcessedProduct.update({
                where: { elmarkCode: elmarkId },
                data: {
                  price: price,
                  purchasePrice: purchasePrice,
                  stockEk: totalStock,
                  stock: totalStock, // elmark_processed_products ha stock e stockEk separati
                  discgroup: discgroup
                }
              });
            } catch (processedUpdateErr) {
              // Il record in elmark_processed_products potrebbe non esistere ancora se il prodotto è nuovo
              // e non è passato per l'equalizzatore. Ignoriamo silenziosamente l'errore P2025 (Record to update not found).
            }

          } catch (e: any) {
            logger.warn(`[ElmarkStrategy] Errore inserimento Product skeleton per ${item.id}: ${e.message}`);
          }
        }

        processedCount += batch.length;
        logger.info(`[ElmarkStrategy] Inserito batch di ${batch.length} record. Totale: ${processedCount}`, { module: 'sync' });
      } catch (e: any) {
        logger.error(`[ElmarkStrategy] Errore inserimento batch raw: ${e.message}`, { error: e, module: 'sync' });
      }
    };

    await new Promise<void>((resolve, reject) => {
      saxStream.on('error', (e: any) => reject(e));

      saxStream.on('end', async () => {
        await flushBatch();
        resolve();
      });

      saxStream.on('opentag', (node: any) => {
        if (node.name === 'item' && !currentObj) {
          currentObj = {};
          objectStack.push({ name: node.name, obj: currentObj });
        } else if (currentObj) {
          objectStack.push({ name: node.name, obj: {} });
        } else {
          objectStack.push({ name: node.name, obj: null });
        }
        currentText = '';
      });

      saxStream.on('text', (text: string) => currentText += text);
      saxStream.on('cdata', (text: string) => currentText += text);

      saxStream.on('closetag', (tagName: string) => {
        const popped = objectStack.pop();
        if (!popped) return;

        if (popped.name === 'item' && popped.obj === currentObj && currentObj !== null) {
          if (currentObj && currentObj.id) {
            itemsToInsert.push(currentObj);
          }
          currentObj = null;
        } else if (currentObj) {
          const parent = objectStack[objectStack.length - 1];
          if (parent && parent.obj) {
            const val = Object.keys(popped.obj).length === 0 ? currentText.trim() : popped.obj;
            if (parent.obj[popped.name] !== undefined) {
              if (!Array.isArray(parent.obj[popped.name])) {
                parent.obj[popped.name] = [parent.obj[popped.name]];
              }
              parent.obj[popped.name].push(val);
            } else {
              parent.obj[popped.name] = val;
            }
          }
        }
      });

      // Stream the string in chunks to avoid blocking the event loop
      const chunkSize = 1024 * 1024; // 1MB
      let offset = 0;

      const processChunk = async () => {
        try {
          if (offset >= xmlString.length) {
            if (itemsToInsert.length > 0) {
              await flushBatch();
            }
            saxStream.end();
            return;
          }
          const chunk = xmlString.substring(offset, offset + chunkSize);
          offset += chunkSize;
          
          saxStream.write(chunk);

          if (itemsToInsert.length >= 100) {
            await flushBatch();
          }

          setImmediate(processChunk);
        } catch (err) {
          reject(err);
        }
      };

      processChunk();
    });
    
    await job.updateProgress(100);
    logger.info(`[ElmarkStrategy] Importazione catalogo completata con successo. Totale record processati: ${processedCount}`, { module: 'sync' });
  }

  
  async pullFastStockAndPrices(job: Job): Promise<void> {
    logger.info('[ElmarkStrategy] Inizio pull rapido stock e prezzi (XML Stream)...', { module: 'sync' });
    
    const response = await fetch('https://api.elmarkgroup.eu/api/Elmark/GetItems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: 'elmarkstore-int'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Elmark API: ${response.statusText}`);
    }

    const rawText = await response.text();
    let xmlString: string = '';
    try {
      xmlString = JSON.parse(rawText);
    } catch (e) {
      xmlString = rawText;
    }

    logger.info(`[ElmarkStrategy] XML ottenuto per pull veloce. Lunghezza: ${xmlString.length}. Avvio parsing...`, { module: 'sync' });

    const saxStream = sax.createStream(true, { trim: true });
    
    let objectStack: any[] = [];
    let currentObj: any = null;
    let currentText = '';
    let itemsToUpdate: any[] = [];
    
    let processedCount = 0;
    
    const flushBatch = async () => {
      if (itemsToUpdate.length === 0) return;
      const batch = [...itemsToUpdate];
      itemsToUpdate = [];
      
      try {
        const productsValues: any[] = [];
        const productsPlaceholders: string[] = [];
        const processedValues: any[] = [];
        const processedPlaceholders: string[] = [];

        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          const elmarkId = item.id;
          const sku = `ELM.${elmarkId}`;
          
          let totalStock = 0;
          if (item.availability && item.availability.quantity) {
            totalStock = parseFloat(item.availability.quantity) || 0;
          } else if (item.quantities) {
            const qties = item.quantities;
            if (Array.isArray(qties)) {
              totalStock = qties.reduce((acc: number, curr: any) => acc + (parseFloat(curr.qty) || 0), 0);
            } else if (qties.qty) {
              totalStock = parseFloat(qties.qty) || 0;
            }
          }

          const discgroup = item.discgroup || '';
          let purchaseDiscount = 0;
          if (discgroup === 'C' || discgroup === 'E2' || discgroup === 'F') purchaseDiscount = 0.25;
          if (discgroup === 'E1' || discgroup === 'L') purchaseDiscount = 0.50;

          let price = 0;
          if (item.endcustprice?.price_exclvat) {
            price = parseFloat(item.endcustprice.price_exclvat) || 0;
          } else if (Array.isArray(item.endcustprice) && item.endcustprice[0]?.price_exclvat) {
            price = parseFloat(item.endcustprice[0].price_exclvat) || 0;
          }
          const purchasePrice = price - (price * purchaseDiscount);

          const offsetP = i * 5;
          processedValues.push(elmarkId, price, purchasePrice, totalStock, discgroup);
          processedPlaceholders.push(`($${offsetP + 1}::text, $${offsetP + 2}::numeric, $${offsetP + 3}::numeric, $${offsetP + 4}::numeric, $${offsetP + 5}::text)`);

          const offset = i * 3;
          productsValues.push(sku, price, totalStock);
          productsPlaceholders.push(`($${offset + 1}::text, $${offset + 2}::numeric, $${offset + 3}::numeric)`);
        }

        if (processedPlaceholders.length > 0) {
          const queryProcessed = `
            UPDATE elmark_processed_products AS p
            SET 
              price = c.price,
              "purchasePrice" = c."purchasePrice",
              "stockEk" = c."stockEk",
              stock = c."stockEk",
              discgroup = c.discgroup,
              "updatedAt" = NOW()
            FROM (VALUES ${processedPlaceholders.join(', ')}) AS c("elmarkCode", price, "purchasePrice", "stockEk", discgroup)
            WHERE p."elmarkCode" = c."elmarkCode";
          `;
          await prisma.$executeRawUnsafe(queryProcessed, ...processedValues);
          
          const queryProducts = `
            UPDATE products AS p
            SET 
              price = c.price,
              "stockEk" = c."stockEk",
              "updatedAt" = NOW()
            FROM (VALUES ${productsPlaceholders.join(', ')}) AS c("sku", price, "stockEk")
            WHERE p."sku" = c."sku";
          `;
          await prisma.$executeRawUnsafe(queryProducts, ...productsValues);
        }

        processedCount += batch.length;
        logger.info(`[ElmarkStrategy FastPull] Aggiornati ${batch.length} record. Totale: ${processedCount}`, { module: 'sync' });
      } catch (e: any) {
        logger.error(`[ElmarkStrategy FastPull] Errore aggiornamento batch raw: ${e.message}`, { error: e, module: 'sync' });
      }
    };

    await new Promise<void>((resolve, reject) => {
      saxStream.on('error', (e: any) => reject(e));
      saxStream.on('end', async () => {
        await flushBatch();
        resolve();
      });

      saxStream.on('opentag', (node: any) => {
        if (node.name === 'item' && !currentObj) {
          currentObj = {};
          objectStack.push({ name: node.name, obj: currentObj });
        } else if (currentObj) {
          objectStack.push({ name: node.name, obj: {} });
        } else {
          objectStack.push({ name: node.name, obj: null });
        }
        currentText = '';
      });

      saxStream.on('text', (text: string) => currentText += text);
      saxStream.on('cdata', (text: string) => currentText += text);

      saxStream.on('closetag', (tagName: string) => {
        const popped = objectStack.pop();
        if (!popped) return;

        if (popped.name === 'item' && popped.obj === currentObj && currentObj !== null) {
          if (currentObj && currentObj.id) {
            itemsToUpdate.push(currentObj);
          }
          currentObj = null;
        } else if (currentObj) {
          const parent = objectStack[objectStack.length - 1];
          if (parent && parent.obj) {
            const val = Object.keys(popped.obj).length === 0 ? currentText.trim() : popped.obj;
            if (parent.obj[popped.name] !== undefined) {
              if (!Array.isArray(parent.obj[popped.name])) {
                parent.obj[popped.name] = [parent.obj[popped.name]];
              }
              parent.obj[popped.name].push(val);
            } else {
              parent.obj[popped.name] = val;
            }
          }
        }
      });

      const chunkSize = 1024 * 1024; // 1MB
      let offset = 0;

      const processChunk = async () => {
        try {
          if (offset >= xmlString.length) {
            if (itemsToUpdate.length > 0) {
              await flushBatch();
            }
            saxStream.end();
            return;
          }
          const chunk = xmlString.substring(offset, offset + chunkSize);
          offset += chunkSize;
          
          saxStream.write(chunk);

          if (itemsToUpdate.length >= 200) {
            await flushBatch();
          }

          setImmediate(processChunk);
        } catch (err) {
          reject(err);
        }
      };

      processChunk();
    });

    await job.updateProgress(100);
    logger.info(`[ElmarkStrategy FastPull] Completato con successo. Totale: ${processedCount}`, { module: 'sync' });
  }

  async syncStockAndPrices(job: Job): Promise<void> {
    logger.info('[ElmarkStrategy] Sincronizzazione Stock verso Zucchetti in corso...', { module: 'sync' });
    
    try {
      const limit = 500;
      let offset = 0;
      let hasMore = true;
      let totalSent = 0;

      const company = env.ZUCCHETTI_SP_COMPANY || 'A0001';
      const token = await zucchettiAuth.getToken(company);

      while (hasMore) {
        const products = await prisma.product.findMany({
          where: { brand: 'ELMARK' },
          select: { sku: true, stockEk: true },
          take: limit,
          skip: offset
        });

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        let xmlLines: string[] = [];
        const targetAppId = company === 'A0001' ? '00009' : env.ZUCCHETTI_APPLICATION_ID;

        xmlLines.push(`<?xml version="1.0" encoding="utf-8"?>`);
        xmlLines.push(`<ADHOC_SALDI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${targetAppId}">`);

        for (const p of products) {
          if (!p.sku) continue;
          xmlLines.push(`  <Add_ADHOC_SALDI SLCODICE_K="${p.sku}" SLCODMAG_K="EK" SLQTAPER="${p.stockEk}" />`);
        }

        xmlLines.push(`</ADHOC_SALDI>`);
        const xmlPayload = xmlLines.join('\n');

        await zucchettiClient.importData(token, xmlPayload, 'SERVLET');
        
        totalSent += products.length;
        offset += limit;
        logger.info(`[ElmarkStrategy] Inviati ${products.length} record giacenze a Zucchetti. Totale inviati: ${totalSent}`);
        await job.updateProgress(Math.min(99, Math.floor((totalSent / 14000) * 100)));
      }

      logger.info('[ElmarkStrategy] Sincronizzazione Stock verso Zucchetti completata.', { module: 'sync' });
      await job.updateProgress(100);
    } catch (e: any) {
      logger.error(`[ElmarkStrategy] Errore syncStockAndPrices: ${e.message}`, { error: e, module: 'sync' });
      throw e;
    }
  }

  async syncImages(job: Job): Promise<void> {
    logger.info('[ElmarkStrategy] Sincronizzazione Immagini su Cloudinary in corso...', { module: 'sync' });
    
    try {
      const limit = 50; // Batch piccolo perché l'upload è lento
      let offset = 0;
      let hasMore = true;
      let totalUploaded = 0;

      while (hasMore) {
        // Peschiamo solo i prodotti che hanno un URL immagine esterno (es. http://) 
        // e non ancora un URL di Cloudinary (res.cloudinary.com)
        const products = await prisma.product.findMany({
          where: { 
            brand: 'ELMARK',
            imageUrl: { startsWith: 'http' },
            NOT: { imageUrl: { contains: 'res.cloudinary.com' } }
          },
          select: { id: true, sku: true, imageUrl: true },
          take: limit,
          skip: offset
        });

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        const uploadPromises = products.map(async (p) => {
          if (!p.imageUrl) return;
          try {
            // Usa un public_id coerente col nostro standard
            const shortCode = imageService.extractShortCode(p.sku);
            const publicId = `prodotti/${shortCode}_${p.sku}`;
            
            const result = await cloudinary.uploader.upload(p.imageUrl, {
              public_id: publicId,
              folder: 'prodotti',
              overwrite: true
            });

            await prisma.product.update({
              where: { id: p.id },
              data: { imageUrl: result.secure_url }
            });
            totalUploaded++;
          } catch (err: any) {
            logger.warn(`[ElmarkStrategy] Fallito upload immagine per ${p.sku}: ${err.message}`);
          }
        });

        await Promise.all(uploadPromises);
        
        offset += limit;
        logger.info(`[ElmarkStrategy] Caricate ${uploadPromises.length} immagini. Totale: ${totalUploaded}`);
        await job.updateProgress(Math.min(99, Math.floor((totalUploaded / 14000) * 100)));
      }

      logger.info('[ElmarkStrategy] Sincronizzazione Immagini completata.', { module: 'sync' });
      await job.updateProgress(100);
    } catch (e: any) {
      logger.error(`[ElmarkStrategy] Errore syncImages: ${e.message}`, { error: e, module: 'sync' });
      throw e;
    }
  }
}
