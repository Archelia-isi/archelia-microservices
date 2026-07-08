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
export const log = {
  trace: (msg: string, data?: any) => logger.trace(data || {}, msg),
  debug: (msg: string, data?: any) => logger.debug(data || {}, msg),
  info: (msg: string, data?: any) => logger.info(data || {}, msg),
  warn: (msg: string, data?: any) => logger.warn(data || {}, msg),
  error: (msg: string, data?: any) => logger.error(data || {}, msg),
  fatal: (msg: string, data?: any) => logger.fatal(data || {}, msg),
};
