import { Queue } from 'bullmq';
import { env, logger } from '@archelia/core';

const queue = new Queue('equalizzatore-commands', {
  connection: { url: env.REDIS_URL || 'redis://localhost:6379' }
});

async function run() {
  logger.info('🧪 Innesco manuale: Aggiungo job RUN_BATCH alla coda...');
  
  // Limita a 2 prodotti per testare velocemente e non consumare troppi token
  await queue.add('RUN_BATCH', { limit: 2 });
  
  logger.info('✅ Job aggiunto con successo. Assicurati che il worker sia in esecuzione per elaborarlo.');
  process.exit(0);
}

run().catch(err => {
  logger.error(`❌ Errore durante l'innesco: ${err.message}`);
  process.exit(1);
});
