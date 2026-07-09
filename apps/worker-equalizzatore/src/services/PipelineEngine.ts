import { prisma } from '@archelia/database';
import { logger } from '@archelia/core';
import { Phase1Taxonomy } from './Phase1Taxonomy.js';
import { Phase2Vision } from './Phase2Vision.js';
import { Phase3Copywriter } from './Phase3Copywriter.js';

export class PipelineEngine {
  static isStopped: boolean = false;

  /**
   * Ferma il processo massivo in corso
   */
  static stopBatch() {
    this.isStopped = true;
  }

  /**
   * Avvia il processo su un batch di prodotti
   */
  static async startBatch(limit: number = 20000, filters: any = {}) {
    this.isStopped = false;
    
    // Contiamo quanti ne mancano
    const totalCount = await prisma.elmarkRawProduct.count({
      where: { aiProcessed: false }
    });
    
    if (totalCount === 0) {
      logger.info('[Equalizzatore] Nessun prodotto da elaborare.');
      return;
    }

    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'TEXT_GENERATION',
      progress: 0,
      total: totalCount,
      message: `Avvio generazione massiva testi per ${totalCount} prodotti (in chunk per sicurezza)...`
    });

    const CHUNK_SIZE = 500;
    const CONCURRENCY = 24;
    let completed = 0;
    const executing = new Set<Promise<void>>();

    // Elaboriamo a blocchi di CHUNK_SIZE per evitare Memory OOM
    while (completed < limit && !this.isStopped) {
      const takeAmount = Math.min(CHUNK_SIZE, limit - completed);
      const rawProducts = await prisma.elmarkRawProduct.findMany({
        where: { aiProcessed: false },
        take: takeAmount
      });

      if (rawProducts.length === 0) break;

      for (const prod of rawProducts) {
        if (this.isStopped) {
          logger.info('[Equalizzatore] Batch fermato forzatamente.');
          break;
        }
        
        const p = this.processProduct(prod.elmarkId, prod.rawData).finally(async () => {
          completed++;
          await ProgressEmitter.emit({
            isActive: true,
            type: 'TEXT_GENERATION',
            progress: completed,
            total: totalCount,
            message: `Elaborazione testi in corso (${completed}/${totalCount})...`
          });
          executing.delete(p);
        });
        executing.add(p);
        
        if (executing.size >= CONCURRENCY) {
          await Promise.race(executing);
        }
      }
      
      // Attendiamo che il blocco corrente si svuoti prima di pescare il prossimo chunk dal DB
      await Promise.all(executing);
    }
    
    await Promise.all(executing);
    
    await ProgressEmitter.emit({
      isActive: false,
      type: 'TEXT_GENERATION',
      progress: completed,
      total: totalCount,
      message: this.isStopped ? 'Generazione interrotta manualmente.' : 'Generazione completata!'
    });
    
    logger.info(`[Equalizzatore] Batch terminato per ${completed} prodotti.`);
  }

  static async retryAllErrorsBatch() {
    this.isStopped = false;
    
    // Recupera tutti i prodotti in errore
    const errorStaging = await prisma.equalizzatoreStaging.findMany({
      where: { pipelineStatus: 'ERROR' },
      select: { sourceId: true }
    });

    if (errorStaging.length === 0) {
      logger.info('[Equalizzatore] Nessun prodotto in errore trovato da riavviare.');
      return;
    }

    const CONCURRENCY = 24; 
    const executing = new Set<Promise<void>>();
    const total = errorStaging.length;
    let completed = 0;

    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'TEXT_GENERATION',
      progress: 0,
      total,
      message: `Avvio rielaborazione massiva per ${total} prodotti in errore...`
    });
    
    for (const staging of errorStaging) {
      if (this.isStopped) {
        logger.info('[Equalizzatore] Batch errori fermato forzatamente.');
        break;
      }
      
      const rawProduct = await prisma.elmarkRawProduct.findUnique({
        where: { elmarkId: staging.sourceId }
      });
      
      if (!rawProduct) {
        completed++;
        continue;
      }

      let imageUrl = null;
      if (rawProduct.rawData) {
        const parsedRaw = typeof rawProduct.rawData === 'string' ? JSON.parse(rawProduct.rawData as string) : rawProduct.rawData;
        imageUrl = parsedRaw.picture_url || null;
      }
      
      const p = this.processProduct(rawProduct.elmarkId, rawProduct.rawData, imageUrl).finally(async () => {
        completed++;
        await ProgressEmitter.emit({
          isActive: true,
          type: 'TEXT_GENERATION',
          progress: completed,
          total,
          message: `Rielaborazione errori in corso (${completed}/${total})...`
        });
        executing.delete(p);
      });
      executing.add(p);
      
      if (executing.size >= CONCURRENCY) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    
    await ProgressEmitter.emit({
      isActive: false,
      type: 'TEXT_GENERATION',
      progress: total,
      total,
      message: this.isStopped ? 'Rielaborazione interrotta.' : 'Rielaborazione completata!'
    });
    
    logger.info(`[Equalizzatore] Batch errori terminato per ${total} prodotti.`);
  }

  /**
   * Processa un singolo prodotto attraverso le 3 fasi e lo salva in Staging
   */
  static async processProduct(elmarkCode: string, rawData: any, imageUrl?: string, customInstructions?: string) {
    try {
      logger.info(`[Equalizzatore] Inizio elaborazione prodotto ${elmarkCode}`);
      
      const stagingRecord = await prisma.equalizzatoreStaging.upsert({
        where: { sourceId: elmarkCode },
        update: { pipelineStatus: 'PROCESSING', reviewStatus: 'PENDING_TEXT' },
        create: { 
          sourceId: elmarkCode, 
          pipelineStatus: 'PROCESSING',
          reviewStatus: 'PENDING_TEXT' 
        }
      });

      // FASE 1: Gemini 2.5 Flash (Tassonomia e Logica)
      const phase1Result = await Phase1Taxonomy.run(elmarkCode, rawData);
      
      // FASE 2: Gemini 2.5 Flash Vision (Estetica)
      const phase2Result = await Phase2Vision.run(elmarkCode, imageUrl || '');

      // FASE 3: Claude 3.5 Sonnet (Copywriting)
      const phase3Result = await Phase3Copywriter.run(elmarkCode, phase1Result, phase2Result, 2, customInstructions);

      // Salva in staging in attesa di review umana
      await prisma.equalizzatoreStaging.update({
        where: { id: stagingRecord.id },
        data: {
          phase1Payload: phase1Result,
          phase2Payload: phase2Result,
          phase3Payload: phase3Result,
          pipelineStatus: 'COMPLETED'
        }
      });

      await prisma.elmarkRawProduct.update({
        where: { elmarkId: elmarkCode },
        data: { aiProcessed: true }
      });

      logger.info(`[Equalizzatore] Prodotto ${elmarkCode} pronto per la review umana`);

    } catch (error: any) {
      logger.error(`[Equalizzatore] Errore su prodotto ${elmarkCode}: ${error.message}`);
      await prisma.equalizzatoreStaging.update({
        where: { sourceId: elmarkCode },
        data: { pipelineStatus: 'ERROR', errorMessage: error.message }
      });
    }
  }
}
