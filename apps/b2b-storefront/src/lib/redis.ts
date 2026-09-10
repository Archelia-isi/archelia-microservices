import Redis from 'ioredis';

const redisHost = process.env.REDISHOST || 'localhost';
const redisPort = parseInt(process.env.REDISPORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || '';
const redisUser = process.env.REDISUSER || 'default';
const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl 
  ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      username: redisUser,
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });

redis.on('error', (err) => {
  console.error('Redis connection error in Next.js:', err);
});
