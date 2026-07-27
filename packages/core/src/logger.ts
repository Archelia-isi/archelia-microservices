import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Logger universale semplificato per i Microservizi V2.
 * Output diretto su stdout per integrarsi nativamente con i log manager di Railway e Docker.
 * Eventuali "log aggregati" verranno intercettati da worker-analytics tramite eventi Redis.
 */

let redisClient: any = null;

const publishToRedis = (level: string, msg: string, data?: any) => {
  const payload = JSON.stringify({
    level,
    message: msg,
    category: data?.module || 'system',
    details: data || {},
    createdAt: new Date().toISOString()
  });

  if (redisClient) {
    if (redisClient.status === 'ready') {
      redisClient.publish('archelia:logs', payload).catch(() => {});
    }
  } else {
    // Lazy load per evitare dipendenze circolari
    import('./redis.js').then(({ redis }) => {
      redisClient = redis;
      if (redisClient.status === 'ready') {
        redisClient.publish('archelia:logs', payload).catch(() => {});
      }
    }).catch(() => {});
  }
};

export const log = {
  trace: (msg: string, data?: any) => { logger.trace(data || {}, msg); publishToRedis('TRACE', msg, data); },
  debug: (msg: string, data?: any) => { logger.debug(data || {}, msg); publishToRedis('DEBUG', msg, data); },
  info: (msg: string, data?: any) => { logger.info(data || {}, msg); publishToRedis('INFO', msg, data); },
  warn: (msg: string, data?: any) => { logger.warn(data || {}, msg); publishToRedis('WARN', msg, data); },
  error: (msg: string, data?: any) => { logger.error(data || {}, msg); publishToRedis('ERROR', msg, data); },
  fatal: (msg: string, data?: any) => { logger.fatal(data || {}, msg); publishToRedis('FATAL', msg, data); },
};
