import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

console.log('📊 Worker Analytics in avvio...');

const worker = new Worker('analytics-queue', async (job) => {
  console.log(`elaborazione job ${job.id} - ${job.name}`);
  // TODO: Implementare generazione report PDF, tracking sessioni e log storici
}, { connection: connection as any });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completato con successo`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} fallito: ${err.message}`);
});
