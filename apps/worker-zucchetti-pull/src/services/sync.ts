import { logger } from '@archelia/core';
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
}

export const zucchettiPullService = new ZucchettiPullService();
