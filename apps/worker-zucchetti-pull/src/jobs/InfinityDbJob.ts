import { Job } from 'bullmq';
import { prisma } from '@archelia/database';
import { log, env } from '@archelia/core';
import { imageService } from '@archelia/core';

const CLOUDINARY_CLOUD = 'dikvomlhu';

function encodePublicId(publicId: string): string {
  return publicId.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

export async function processInfinityDbJob(job: Job) {
  const syncId = `SYNC-FDW-${Date.now()}`;
  log.info(`[${syncId}] 🚀 Avvio Sync Cloudinary JSON -> Neon FDW MappedImage (infinity_db)...`, { module: 'worker-zucchetti-pull' });

  if (env.ENABLE_GLOBAL_WRITES !== true) {
    log.warn(`[${syncId}] ⚠️ ENABLE_GLOBAL_WRITES is non-true. Skips writes to DB.`, { module: 'worker-zucchetti-pull' });
    return { success: false, reason: 'ENABLE_GLOBAL_WRITES not true' };
  }

  try {
    const startTime = Date.now();

    const imageMap = await imageService.loadImageMap();
    const articles = Object.keys(imageMap);
    
    if (articles.length === 0) {
      log.warn(`[${syncId}] ⚠️ Fallimento Sync: La mappa Cloudinary risulta vuota o inaccessibile. Annullamento pulizia per protezione dati.`, { module: 'worker-zucchetti-pull' });
      return { success: false, error: 'Mappa JSON vuota' };
    }

    log.info(`[${syncId}] 📊 Trovati ${articles.length} articoli madre nel JSON Cloudinary. Elaborazione varianti e risoluzioni in corso...`, { module: 'worker-zucchetti-pull' });

    const recordsToUpsert: any[] = [];
    for (const arcodart of articles) {
      const publicIds = imageMap[arcodart];
      if (!publicIds || !publicIds.length) continue;

      for (const pid of publicIds) {
        if (/\(1\)\s*$/.test(pid)) {
          continue;
        }

        const encId = encodePublicId(pid);
        
        recordsToUpsert.push({
          arcodart: arcodart,
          arfulres: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_webp,q_auto/${encId}.webp`,
          ar200pix: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_200,f_webp,q_auto/${encId}.webp`,
          ar400pix: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_400,f_webp,q_auto/${encId}.webp`,
          ar500pix: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_500,f_webp,q_auto/${encId}.webp`,
          ar600pix: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_600,f_webp,q_auto/${encId}.webp`
        });
      }
    }

    log.info(`[${syncId}] ⚙️ Traduzione completata: Generati ${recordsToUpsert.length} record transazionali pronti per l'iniezione.`, { module: 'worker-zucchetti-pull' });

    const validImageUrls = new Set(recordsToUpsert.map(r => r.arfulres));
    const existingRecords = await prisma.mappedImage.findMany({ select: { arfulres: true } });
    
    const urlsToDelete = existingRecords
      .filter(r => !validImageUrls.has(r.arfulres))
      .map(r => r.arfulres);

    let deletedCount = 0;
    if (urlsToDelete.length > 0) {
      const delChunkSize = 1000;
      for (let i = 0; i < urlsToDelete.length; i += delChunkSize) {
        const chunk = urlsToDelete.slice(i, i + delChunkSize);
        const delRes = await prisma.mappedImage.deleteMany({
          where: { arfulres: { in: chunk } }
        });
        deletedCount += delRes.count;
      }
      log.info(`[${syncId}] 🧹 Pulizia profonda: Eliminati ${deletedCount} vecchi record foto obsoleti non più presenti sulla mappa.`, { module: 'worker-zucchetti-pull' });
    }

    const chunkSize = 1500;
    let chunkInsertCount = 0;
    for (let i = 0; i < recordsToUpsert.length; i += chunkSize) {
      const chunk = recordsToUpsert.slice(i, i + chunkSize);
      
      const insertStatus = await prisma.mappedImage.createMany({
        data: chunk,
        skipDuplicates: true 
      });
      
      chunkInsertCount += insertStatus.count;
    }

    const execTimeMs = Date.now() - startTime;
    log.info(`[${syncId}] ✅ Sincronizzazione conclusa con successo in ${Math.round(execTimeMs/1000)}s! Inserite ${chunkInsertCount} nuove varianti.`, { module: 'worker-zucchetti-pull' });

    return { 
      success: true, 
      recordsCount: recordsToUpsert.length, 
      newInserted: chunkInsertCount, 
      deleted: deletedCount 
    };

  } catch (error: any) {
    log.error(`[${syncId}] ❌ Errore fatale Sincronizzazione Neon FDW: ${error.message}`, { module: 'worker-zucchetti-pull', data: error });
    return { success: false, error: error.message };
  }
}
