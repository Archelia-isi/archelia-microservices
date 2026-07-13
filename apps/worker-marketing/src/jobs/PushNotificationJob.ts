import { Job } from 'bullmq';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { PushSender } from '../utils/PushSender.js';

export class PushNotificationJob {
  static async process(job: Job) {
    const { pushJobId, jobType } = job.data;
    
    log.info(`[PushNotificationJob] Avvio elaborazione job Push DB ${pushJobId}`, { module: 'worker-marketing' });

    try {
      const pJob = await prisma.pushJob.findUnique({
        where: { id: pushJobId }
      });

      if (!pJob || pJob.status !== 'PROCESSING') {
        log.warn(`[PushNotificationJob] Job ${pushJobId} non elaborabile.`, { module: 'worker-marketing' });
        return { success: false, reason: 'INVALID_STATUS' };
      }

      // Generazione dinamica con AI (Gemini)
      const aiCopy = await PushSender.generateAiCopy({ 
        jobType: pJob.jobType, 
        payload: pJob.payload 
      });

      // Invio della notifica via VAPID
      const success = await PushSender.sendPush(pJob.deviceId, aiCopy.title, aiCopy.body);

      // Aggiornamento status sul DB
      await prisma.pushJob.update({
        where: { id: pushJobId },
        data: {
          status: success ? "COMPLETED" : "FAILED",
          updatedAt: new Date()
        }
      });

      log.info(`[PushNotificationJob] Notifica ${success ? 'inviata' : 'fallita'} per ${pJob.deviceId}`, { module: 'worker-marketing' });
      return { success };

    } catch (error: any) {
      log.error(`[PushNotificationJob] Errore critico nel job ${pushJobId}: ${error.message}`, { error, module: 'worker-marketing' });
      
      await prisma.pushJob.update({
        where: { id: pushJobId },
        data: { status: 'FAILED' }
      });

      throw error;
    }
  }
}
