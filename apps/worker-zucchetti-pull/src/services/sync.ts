import { logger, redis } from '@archelia/core';
import { prisma } from '@archelia/database';
import { zucchettiClient } from '@archelia/zucchetti';

const LISTINI_ECOMMERCE = ['ARC', 'VAELK'];
const MAGAZZINI_ABILITATI = ['PR', 'EK'];

export interface ZucchettiArticle {
  arcodart: string;
  arcodar2: string;
  ardesart: string;
  ardessup?: string;
  ardescat?: string;
  arunmis1: string;
  arunmis2?: string;
  armoltip: string;
  arcodmar?: string;
  argrumer?: string;
  arcodfam?: string;
  arcatomo?: string;
  arpubweb: string;
  armetatitle?: string;
  arkeyword?: string;
  armetadescri?: string;
  liprezzo: string;
  licodlis: string;
  slcodmag: string;
  slqtaper: string;
  slqtrper: string;
  slqtiper: string;
  arpeslor?: string;
  utdc?: string;
  utdv?: string;
}

export class ZucchettiPullService {
  private async fetchAllArticles(): Promise<ZucchettiArticle[]> {
    logger.info(`🔄 Fetch MASSIVO articoli (no paginazione)...`);
    const page = await zucchettiClient.query('zzna_art_sal', {
      offset: '0',
      limit: '100000',
      pcpupdtms: '01-01-2000 00:00:00'
    }) as { data?: ZucchettiArticle[] } | ZucchettiArticle[];

    let allArticles: ZucchettiArticle[] = [];
    if (Array.isArray(page)) {
      allArticles = page;
    } else if (page && Array.isArray(page.data)) {
      allArticles = page.data;
    }

    if (!Array.isArray(allArticles) || allArticles.length === 0) {
      logger.error('❌ Chiamata massiva vuota o non valida!');
      return [];
    }

    logger.info(`✅ Totale scaricati da Zucchetti in un blocco: ${allArticles.length} record`);
    return allArticles;
  }

  async importProducts(): Promise<{ created: number; updated: number; errors: number }> {
    const result = { created: 0, updated: 0, errors: 0 };

    try {
      logger.info('📥 Avvio IMPORT PRODOTTI ZUCCHETTI → DB');

      const allArticles = await this.fetchAllArticles();
      if (allArticles.length === 0) {
        logger.warn('⚠️ Nessun articolo trovato da Zucchetti');
        return result;
      }

      const rawFilteredArticles = allArticles.filter(
        (a) => LISTINI_ECOMMERCE.includes(a.licodlis) && MAGAZZINI_ABILITATI.includes(a.slcodmag)
      );

      const skuMap = new Map<string, any>();
      
      for (const a of rawFilteredArticles) {
        const sku = a.arcodar2;
        let agg = skuMap.get(sku);
        
        let price = parseFloat(a.liprezzo) || 0;
        let moltip = parseFloat(a.armoltip) || 1;
        if (a.arunmis2 && moltip > 0 && moltip !== 1) {
            price = parseFloat((price * moltip).toFixed(2));
        }

        const esistenza = parseFloat(a.slqtaper) || 0;
        const riservata = parseFloat(a.slqtrper) || 0;
        const impegnata = parseFloat(a.slqtiper) || 0;
        let stockNetto = Math.max(0, Math.floor(esistenza - riservata - impegnata));
        if (a.arunmis2 && moltip > 0 && moltip !== 1) {
            stockNetto = Math.floor(stockNetto / moltip);
        }

        if (!agg) {
          agg = {
            baseArticle: a,
            price: price,
            priceList: a.licodlis,
            stockPr: 0, rawStockPr: 0, reservedStockPr: 0, committedStockPr: 0,
            stockEk: 0, rawStockEk: 0, reservedStockEk: 0, committedStockEk: 0,
            seenPr: false,
            seenEk: false
          };
          skuMap.set(sku, agg);
        } else {
          if (price > agg.price) {
            agg.price = price;
            agg.priceList = a.licodlis;
          }
        }

        if (a.slcodmag === 'PR' && !agg.seenPr) {
          agg.stockPr = stockNetto;
          agg.rawStockPr = esistenza;
          agg.reservedStockPr = riservata;
          agg.committedStockPr = impegnata;
          agg.seenPr = true;
        } else if (a.slcodmag === 'EK' && !agg.seenEk) {
          agg.stockEk = stockNetto;
          agg.rawStockEk = esistenza;
          agg.reservedStockEk = riservata;
          agg.committedStockEk = impegnata;
          agg.seenEk = true;
        }
      }
      
      const articles = Array.from(skuMap.values());
      logger.info(`📊 FILTRO E-COMMERCE+PR: ${articles.length} articoli unici da importare`);

      const BATCH_SIZE = 50; 
      let progressCounter = 0;
      
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
         const batch = articles.slice(i, i + BATCH_SIZE);
         const skus = batch.map(a => a.baseArticle.arcodar2);
         
         try {
           const existingProducts = await prisma.product.findMany({
             where: { sku: { in: skus } },
             select: { sku: true }
           });
           const existingSkus = new Set(existingProducts.map(p => p.sku));
           
           const txs = batch.map(agg => {
              const article = agg.baseArticle;
              
              if (existingSkus.has(article.arcodar2)) result.updated++;
              else result.created++;
              
              return prisma.product.upsert({
                where: { sku: article.arcodar2 },
                update: {
                  title: article.armetatitle || article.ardesart,
                  originalName: article.ardesart,
                  description: article.ardescat || null,
                  technicalDesc: article.ardessup || null,
                  metaDescription: article.armetadescri || null,
                  keywords: article.arkeyword || null,
                  brand: article.arcodmar || null,
                  productGroup: article.argrumer || null,
                  family: article.arcodfam || null,
                  category: article.arcatomo || null,
                  unit: article.arunmis1 || null,
                  unit2: article.arunmis2 || null,
                  unitMultiplier: parseFloat(article.armoltip) || 1,
                  price: agg.price,
                  priceList: agg.priceList,
                  stock: agg.stockPr,
                  rawStock: agg.rawStockPr,
                  reservedStock: agg.reservedStockPr,
                  committedStock: agg.committedStockPr,
                  stockEk: agg.stockEk,
                  rawStockEk: agg.rawStockEk,
                  reservedStockEk: agg.reservedStockEk,
                  committedStockEk: agg.committedStockEk,
                  grossWeight: article.arpeslor ? parseFloat(article.arpeslor) : 0,
                  publishedOnWeb: article.arpubweb === 'S',
                  zucchettiUpdatedAt: article.utdv || null,
                },
                create: {
                  zucchettiCode: article.arcodart,
                  sku: article.arcodar2,
                  title: article.armetatitle || article.ardesart,
                  originalName: article.ardesart,
                  description: article.ardescat || null,
                  technicalDesc: article.ardessup || null,
                  metaDescription: article.armetadescri || null,
                  keywords: article.arkeyword || null,
                  brand: article.arcodmar || null,
                  productGroup: article.argrumer || null,
                  family: article.arcodfam || null,
                  category: article.arcatomo || null,
                  unit: article.arunmis1 || null,
                  unit2: article.arunmis2 || null,
                  unitMultiplier: parseFloat(article.armoltip) || 1,
                  price: agg.price,
                  priceList: agg.priceList,
                  stock: agg.stockPr,
                  rawStock: agg.rawStockPr,
                  reservedStock: agg.reservedStockPr,
                  committedStock: agg.committedStockPr,
                  stockEk: agg.stockEk,
                  rawStockEk: agg.rawStockEk,
                  reservedStockEk: agg.reservedStockEk,
                  committedStockEk: agg.committedStockEk,
                  grossWeight: article.arpeslor ? parseFloat(article.arpeslor) : 0,
                  publishedOnWeb: article.arpubweb === 'S',
                  zucchettiCreatedAt: article.utdc || null,
                  zucchettiUpdatedAt: article.utdv || null,
                },
              });
           });
           
           await prisma.$transaction(txs);
           
           progressCounter += batch.length;
           logger.info(`   💾 Progresso: ${progressCounter}/${articles.length} (creati: ${result.created}, aggiornati: ${result.updated})`);
           
         } catch(error: any) {
            logger.warn(`⚠️ Transazione fallita sul blocco di ${batch.length} articoli. Avvio recupero sequenziale...`);
            
            for (const agg of batch) {
              const article = agg.baseArticle;
              try {
                await prisma.product.upsert({
                  where: { sku: article.arcodar2 },
                  update: {
                    zucchettiCode: article.arcodart,
                    title: article.armetatitle || article.ardesart,
                    originalName: article.ardesart,
                    description: article.ardescat || null,
                    technicalDesc: article.ardessup || null,
                    metaDescription: article.armetadescri || null,
                    brand: article.arcodmar || null,
                    family: article.arcodfam || null,
                    category: article.arcatomo || null,
                    unit: article.arunmis1 || null,
                    unit2: article.arunmis2 || null,
                    unitMultiplier: parseFloat(article.armoltip) || 1,
                    price: agg.price,
                    priceList: agg.priceList,
                    stock: agg.stockPr,
                    rawStock: agg.rawStockPr,
                    reservedStock: agg.reservedStockPr,
                    committedStock: agg.committedStockPr,
                    stockEk: agg.stockEk,
                    rawStockEk: agg.rawStockEk,
                    reservedStockEk: agg.reservedStockEk,
                    committedStockEk: agg.committedStockEk,
                    grossWeight: article.arpeslor ? parseFloat(article.arpeslor) : 0,
                    publishedOnWeb: article.arpubweb === 'S',
                    zucchettiUpdatedAt: article.utdv || null,
                  },
                  create: {
                    zucchettiCode: article.arcodart,
                    sku: article.arcodar2,
                    title: article.armetatitle || article.ardesart,
                    originalName: article.ardesart,
                    description: article.ardescat || null,
                    technicalDesc: article.ardessup || null,
                    metaDescription: article.armetadescri || null,
                    brand: article.arcodmar || null,
                    family: article.arcodfam || null,
                    category: article.arcatomo || null,
                    unit: article.arunmis1 || null,
                    unit2: article.arunmis2 || null,
                    unitMultiplier: parseFloat(article.armoltip) || 1,
                    price: agg.price,
                    priceList: agg.priceList,
                    stock: agg.stockPr,
                    rawStock: agg.rawStockPr,
                    reservedStock: agg.reservedStockPr,
                    committedStock: agg.committedStockPr,
                    stockEk: agg.stockEk,
                    rawStockEk: agg.rawStockEk,
                    reservedStockEk: agg.reservedStockEk,
                    committedStockEk: agg.committedStockEk,
                    grossWeight: article.arpeslor ? parseFloat(article.arpeslor) : 0,
                    publishedOnWeb: article.arpubweb === 'S',
                    zucchettiCreatedAt: article.utdc || null,
                    zucchettiUpdatedAt: article.utdv || null,
                  },
                });
                result.updated++;
              } catch(singleErr: any) {
                result.errors++;
                logger.error(`❌ Errore isolato SKU ${article.arcodar2 || article.arcodart}: ${singleErr.message}`);
              }
            }
            progressCounter += batch.length;
         }
      }

      logger.info(`✅ Import completato: ${result.created} nuovi, ${result.updated} aggiornati, ${result.errors} errori.`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      logger.error(`❌ Errore fatale import prodotti: ${message}`);
      throw error;
    }
  }

  async syncInventory(): Promise<{ updated: number; skipped: number; errors: number; total: number }> {
    const result = { updated: 0, skipped: 0, errors: 0, total: 0 };
    try {
      logger.info('📦 Avvio SYNC GIACENZE DIFFERENZIALE ZUCCHETTI → DB');
      
      let pcpupdtms = '01-01-2000 00:00:00';
      const lastSyncStr = await redis.get('zucchetti:last_inventory_sync');
      
      if (lastSyncStr) {
        const d = new Date(parseInt(lastSyncStr, 10));
        d.setHours(d.getHours() - 3); // 3 hours margin
        
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        
        pcpupdtms = `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
      }

      logger.info(`📦 Fetch giacenze modificate dal: ${pcpupdtms}...`);
      
      const page = await zucchettiClient.query('zzna_art_sal', {
        offset: '0', limit: '100000', pcpupdtms
      }) as { data?: ZucchettiArticle[] } | ZucchettiArticle[];

      let articles: ZucchettiArticle[] = [];
      if (Array.isArray(page)) articles = page;
      else if (page && Array.isArray(page.data)) articles = page.data;

      result.total = articles.length;

      if (articles.length === 0) {
        logger.info('✅ Nessuna variazione di giacenza trovata.');
        await redis.set('zucchetti:last_inventory_sync', Date.now().toString());
        return result;
      }

      const filtered = articles.filter(a => MAGAZZINI_ABILITATI.includes(a.slcodmag));
      
      // Load current SKUs to ensure we only update existing ones
      const skusSet = new Set(filtered.map(a => a.arcodar2));
      const existingProducts = await prisma.product.findMany({
        where: { sku: { in: Array.from(skusSet) } },
        select: { sku: true }
      });
      const validSkus = new Set(existingProducts.map(p => p.sku));

      const skuAggregated = new Map<string, any>();
      for (const a of filtered) {
        const sku = a.arcodar2;
        if (!sku || !validSkus.has(sku)) {
          result.skipped++;
          continue;
        }

        const rawStock = parseFloat(a.slqtaper) || 0;
        const reservedStock = parseFloat(a.slqtrper) || 0;
        const committedStock = parseFloat(a.slqtiper) || 0;
        const moltip = parseFloat(a.armoltip) || 1;
        const hasUm2 = !!(a.arunmis2 && a.arunmis2.trim() !== '');

        let stockNetto = Math.max(0, Math.floor(rawStock - reservedStock - committedStock));
        if (hasUm2 && moltip > 0 && moltip !== 1) {
          stockNetto = Math.floor(stockNetto / moltip);
        }

        const cacheKey = `${sku}_${a.slcodmag}`;
        skuAggregated.set(cacheKey, { sku, mag: a.slcodmag, rawStock, reservedStock, committedStock, stockNetto });
      }

      const updates = Array.from(skuAggregated.values());
      const CONCURRENCY = 10;
      
      for (let i = 0; i < updates.length; i += CONCURRENCY) {
        const batch = updates.slice(i, i + CONCURRENCY);
        const promises = batch.map(u => {
          const data = u.mag === 'PR' 
            ? { stock: u.stockNetto, rawStock: u.rawStock, reservedStock: u.reservedStock, committedStock: u.committedStock }
            : { stockEk: u.stockNetto, rawStockEk: u.rawStock, reservedStockEk: u.reservedStock, committedStockEk: u.committedStock };
          
          return prisma.product.updateMany({ where: { sku: u.sku }, data });
        });

        const batchResults = await Promise.allSettled(promises);
        for (const res of batchResults) {
          if (res.status === 'fulfilled') result.updated++;
          else result.errors++;
        }
      }

      await redis.set('zucchetti:last_inventory_sync', Date.now().toString());
      logger.info(`✅ Sync giacenze completato: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori.`);
      return result;

    } catch (error) {
      logger.error(`❌ Errore fatale sync giacenze: ${(error as Error).message}`);
      throw error;
    }
  }

  async syncPricing(): Promise<{ updated: number; skipped: number; errors: number; total: number }> {
    const result = { updated: 0, skipped: 0, errors: 0, total: 0 };
    try {
      logger.info('💰 Avvio SYNC PREZZI DIFFERENZIALE ZUCCHETTI → DB');
      
      let pcpupdtms = '01-01-2000 00:00:00';
      const lastSyncStr = await redis.get('zucchetti:last_pricing_sync');
      
      if (lastSyncStr) {
        const d = new Date(parseInt(lastSyncStr, 10));
        d.setHours(d.getHours() - 3); 
        
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        
        pcpupdtms = `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
      }

      logger.info(`💰 Fetch prezzi modificati dal: ${pcpupdtms}...`);
      
      const page = await zucchettiClient.query('zzna_art_sal', {
        offset: '0', limit: '100000', pcpupdtms
      }) as { data?: ZucchettiArticle[] } | ZucchettiArticle[];

      let articles: ZucchettiArticle[] = [];
      if (Array.isArray(page)) articles = page;
      else if (page && Array.isArray(page.data)) articles = page.data;

      result.total = articles.length;

      if (articles.length === 0) {
        logger.info('✅ Nessuna variazione di prezzo trovata.');
        await redis.set('zucchetti:last_pricing_sync', Date.now().toString());
        return result;
      }

      const filtered = articles.filter(a => LISTINI_ECOMMERCE.includes(a.licodlis));
      
      const skusSet = new Set(filtered.map(a => a.arcodar2));
      const existingProducts = await prisma.product.findMany({
        where: { sku: { in: Array.from(skusSet) } },
        select: { id: true, sku: true, price: true }
      });
      const oldPriceMap = new Map(existingProducts.map(p => [p.sku, { id: p.id, price: p.price }]));

      const skuAggregated = new Map<string, any>();
      for (const a of filtered) {
        const sku = a.arcodar2;
        if (!sku || !oldPriceMap.has(sku)) {
          result.skipped++;
          continue;
        }

        let newPrice = parseFloat(a.liprezzo) || 0;
        const moltip = parseFloat(a.armoltip) || 1;
        if (a.arunmis2 && moltip > 0 && moltip !== 1) {
          newPrice = parseFloat((newPrice * moltip).toFixed(2));
        }

        const existing = skuAggregated.get(sku);
        if (!existing || newPrice > existing.newPrice) {
          skuAggregated.set(sku, { sku, newPrice, priceList: a.licodlis });
        }
      }

      const updates = Array.from(skuAggregated.values());
      const historyData: any[] = [];
      const changelogData: any[] = [];
      const CONCURRENCY = 15;
      
      for (let i = 0; i < updates.length; i += CONCURRENCY) {
        const batch = updates.slice(i, i + CONCURRENCY);
        const promises = batch.map(u => prisma.product.updateMany({
           where: { sku: u.sku },
           data: { price: u.newPrice, priceList: u.priceList }
        }));

        const batchResults = await Promise.allSettled(promises);
        for (let j = 0; j < batchResults.length; j++) {
          if (batchResults[j].status === 'fulfilled') {
             result.updated++;
             const old = oldPriceMap.get(batch[j].sku);
             if (old && old.price !== batch[j].newPrice) {
                historyData.push({ productId: old.id, oldPrice: old.price, newPrice: batch[j].newPrice });
                changelogData.push({ productId: old.id, field: 'price', oldValue: String(old.price), newValue: String(batch[j].newPrice), source: 'PRICE_SYNC' });
             }
          } else {
             result.errors++;
          }
        }
      }

      if (historyData.length > 0) {
        try {
           await prisma.$transaction([
             prisma.priceHistory.createMany({ data: historyData, skipDuplicates: true }),
             prisma.productChange.createMany({ data: changelogData, skipDuplicates: true })
           ]);
        } catch(e) {
           logger.error(`⚠️ Errore salvataggio storico prezzi`);
        }
      }

      await redis.set('zucchetti:last_pricing_sync', Date.now().toString());
      logger.info(`✅ Sync prezzi completato: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori.`);
      return result;

    } catch (error) {
      logger.error(`❌ Errore fatale sync prezzi: ${(error as Error).message}`);
      throw error;
    }
  }
}

export const zucchettiPullService = new ZucchettiPullService();
