import { Job } from 'bullmq';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { PushSender } from '../utils/PushSender.js';

export class ManualPushJob {
  static async process(job: Job) {
    const { title, message, iconUrl, link } = job.data;
    
    log.info(`[ManualPushJob] Avvio invio manuale: "${title}"`, { module: 'worker-marketing' });

    try {
      const allDevices = await prisma.webPushSubscription.findMany({
        select: { deviceId: true }
      });

      if (allDevices.length === 0) {
        log.warn(`[ManualPushJob] Nessun dispositivo iscritto trovato. Invio annullato.`, { module: 'worker-marketing' });
        return { success: false, reason: 'NO_DEVICES' };
      }

      log.info(`[ManualPushJob] Invio in corso a ${allDevices.length} dispositivi...`, { module: 'worker-marketing' });

      let successCount = 0;
      let failCount = 0;

      for (const device of allDevices) {
        // Invio diretto (senza AI copy, dato che il copy l'ha scritto l'umano)
        const success = await PushSender.sendPush(device.deviceId, title, message, link);
        if (success) successCount++;
        else failCount++;
      }

      log.info(`[ManualPushJob] ✅ Invio manuale completato. Inviati: ${successCount}, Falliti: ${failCount}`, { module: 'worker-marketing' });
      return { success: true, successCount, failCount };

    } catch (error: any) {
      log.error(`[ManualPushJob] Errore critico: ${error.message}`, { error, module: 'worker-marketing' });
      throw error;
    }
  }
}
