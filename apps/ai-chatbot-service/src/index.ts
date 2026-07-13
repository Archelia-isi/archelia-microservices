import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

console.log('🤖 AI Chatbot Service Worker in avvio...');

const worker = new Worker('ai-chatbot-queue', async (job) => {
  console.log(`elaborazione job ${job.id} - ${job.name}`);
  // TODO: Implementare logica RAG e risposte AI
}, { connection: connection as any });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completato con successo`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} fallito: ${err.message}`);
});
