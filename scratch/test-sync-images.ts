import 'dotenv/config';
import { imageService } from '../apps/worker-zucchetti-pull/src/services/imageService.js';
import { prisma } from '@archelia/database';

async function testSyncImages() {
  console.log("Inizio test manuale Sync Immagini...");
  
  try {
    const result = await imageService.syncImages();
    console.log("Risultato:", result);
    
    // Controlliamo quanti prodotti hanno le immagini nel DB
    const withImagesCount = await prisma.product.count({
      where: {
        imageUrl: { not: null }
      }
    });
    
    console.log(`\nTotale prodotti con imageUrl nel DB Neon: ${withImagesCount}`);
    
  } catch (error: any) {
    console.error("Errore durante il test:", error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testSyncImages();
