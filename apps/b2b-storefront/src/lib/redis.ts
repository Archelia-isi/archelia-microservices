import Redis from 'ioredis';

const redisHost = process.env.REDISHOST || 'localhost';
const redisPort = parseInt(process.env.REDISPORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || '';
const redisUser = process.env.REDISUSER || 'default';
const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl 
  ? new Redis(redisUrl, { lazyConnect: true })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      username: redisUser,
      lazyConnect: true
    });
