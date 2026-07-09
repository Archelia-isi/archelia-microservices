import Redis from 'ioredis';
import { env } from './env.js';
import { log } from './logger.js';

if (!env.REDIS_URL) {
  log.warn('⚠️ REDIS_URL is not defined! Redis connections will fail if instantiated.');
}

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create a singleton connection for standard operations
export const redis = new Redis(env.REDIS_URL, redisOptions);

redis.on('error', (err) => {
  log.error(`❌ Redis connection error: ${err.message}`);
});

redis.on('connect', () => {
  log.info('✅ Connected to Redis successfully.');
});

// Helper for BullMQ to create separate connections
export const createRedisConnection = () => {
  return new Redis(env.REDIS_URL, redisOptions);
};
