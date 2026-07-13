import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';
import { createRedisConnection } from '@archelia/core';

export class MarketingScheduler {
  private static marketingQueue = new Queue('marketing-queue', { 
    connection: createRedisConnection() as any 
  });

  static async processPendingJobs() {
    log.info('[MarketingScheduler] Ricerca di Job Marketing e Push schedulati...', { module: 'worker-marketing' });

    try {
      // --- 1. Email e Marketing Jobs ---
      const pendingJobs = await prisma.marketingJob.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() }
        },
        take: 50,
        orderBy: { scheduledFor: 'asc' },
        include: { event: true } // Serve per lo skip dei risolti
      });

      if (pendingJobs.length > 0) {
        log.info(`[MarketingScheduler] Trovati ${pendingJobs.length} Marketing Job da accodare.`, { module: 'worker-marketing' });

        for (const job of pendingJobs) {
          // Se l'evento è risolto (es. ha comprato), annulla
          if (job.event?.resolved) {
            log.info(`[Marketing Scheduler] Job ${job.id} annullato: evento completato.`, { module: 'worker-marketing' });
            await prisma.marketingJob.update({
              where: { id: job.id },
              data: { status: 'CANCELled' }
            });
            continue;
          }

          // Accodiamo su BullMQ
          await this.marketingQueue.add('EMAIL', {
            jobId: job.id,
            jobType: job.jobType
          });

          // Segniamo come PROCESSING sul DB
          await prisma.marketingJob.update({
            where: { id: job.id },
            data: { status: 'PROCESSING' }
          });
        }
      }

      // --- 2. Push Notification Jobs ---
      const pendingPushes = await prisma.pushJob.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() }
        },
        take: 50,
        orderBy: { scheduledFor: 'asc' }
      });

      if (pendingPushes.length > 0) {
        log.info(`[MarketingScheduler] Trovati ${pendingPushes.length} Push Job da accodare.`, { module: 'worker-marketing' });

        for (const pJob of pendingPushes) {
          await this.marketingQueue.add('PUSH', {
            pushJobId: pJob.id,
            jobType: pJob.jobType
          });

          await prisma.pushJob.update({
            where: { id: pJob.id },
            data: { status: 'PROCESSING' }
          });
        }
      }

    } catch (error: any) {
      log.error(`[MarketingScheduler] Errore nello scheduler: ${error.message}`, { error, module: 'worker-marketing' });
    }
  }
}
