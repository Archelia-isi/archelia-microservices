import 'dotenv/config';
import { processInfinityDbJob } from './src/jobs/InfinityDbJob.js';

async function runTest() {
  console.log('--- AVVIO TEST SIMULATO SINCRO INFINITY DB ---');
  // Mock Job object for BullMQ
  const mockJob = {
    id: 'test-job-123',
    data: { command: 'ZUCCHETTI_INFINITY_DB', source: 'manual-test' }
  } as any;

  try {
    const result = await processInfinityDbJob(mockJob);
    console.log('\\n--- RISULTATO TEST ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Errore durante il test:', error);
  } finally {
    process.exit(0);
  }
}

runTest();
