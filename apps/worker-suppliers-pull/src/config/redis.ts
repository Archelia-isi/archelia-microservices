import Redis from 'ioredis';
import { env } from '@archelia/core';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

// Connessione generica per BullMQ
export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Gestione errori Redis
connection.on('error', (err) => {
  console.error('[Redis] Errore connessione:', err);
});

connection.on('connect', () => {
  console.log('[Redis] Connesso con successo a', redisUrl);
});
