import { prisma } from '@archelia/database';
import { log } from '@archelia/core';

export class JobPlanter {
  /**
   * Helper sicuro per schedulare Email e Push (Carrelli, Winback, Browse)
   */
  static async plantCartJobs(customerEmail: string, payload: any, eventId: string) {
    try {
      const config = await prisma.marketingSettings.findUnique({ where: { id: "marketing_config" }});
      if (!config) return false;

      // === SEEDING EMAIL CARRELLO ===
      if (config.cartEnabled && config.cartSequence) {
        const sequence = typeof config.cartSequence === 'string' ? JSON.parse(config.cartSequence) : config.cartSequence;
        
        // 1. Eliminiamo i vecchi pending per questo utente e tipo
        await prisma.marketingJob.deleteMany({
          where: { jobType: 'ABANDONED_CART_EMAIL', status: 'PENDING', event: { customerEmail } }
        });

        // 2. Piantiamo i nuovi
        const jobsToCreate = [];
        for (const step of sequence) {
          const delayHours = step.delay || 0;
          const templateId = step.template;
          
          if (templateId) {
            const scheduledDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);
            jobsToCreate.push({
              jobType: 'ABANDONED_CART_EMAIL',
              status: 'PENDING',
              scheduledFor: scheduledDate,
              eventId: eventId,
              templateId: templateId
            });
          }
        }
        
        if (jobsToCreate.length > 0) {
          await prisma.marketingJob.createMany({ data: jobsToCreate });
          log.info(`[JobPlanter] Piantati ${jobsToCreate.length} Email Jobs per Carrello di ${customerEmail}`, { module: 'worker-marketing' });
        }
      }

      // === SEEDING PUSH CARRELLO ===
      if (config.pushCartEnabled && config.pushCartSequence) {
        // Cerchiamo le sottoscrizioni del cliente tramite l'email (se esiste il link).
        // Altrimenti, se lo shop ha il plugin web-push, dovremmo avere il deviceId.
        const subs = await prisma.webPushSubscription.findMany({
          where: { customerEmail }
        });

        if (subs.length > 0) {
          const sequence = typeof config.pushCartSequence === 'string' ? JSON.parse(config.pushCartSequence) : config.pushCartSequence;
          
          for (const sub of subs) {
            await prisma.pushJob.deleteMany({
              where: { deviceId: sub.deviceId, jobType: 'ABANDONED_CART_PUSH', status: 'PENDING' }
            });

            const pushesToCreate = [];
            for (const step of sequence) {
              const delayHours = step.delay || 0;
              const scheduledDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);
              pushesToCreate.push({
                deviceId: sub.deviceId,
                jobType: 'ABANDONED_CART_PUSH',
                payload: payload,
                status: 'PENDING',
                scheduledFor: scheduledDate
              });
            }

            if (pushesToCreate.length > 0) {
              await prisma.pushJob.createMany({ data: pushesToCreate });
              log.info(`[JobPlanter] Piantati ${pushesToCreate.length} Push Jobs per Carrello del device ${sub.deviceId}`, { module: 'worker-marketing' });
            }
          }
        }
      }

      return true;
    } catch (e: any) {
      log.error(`[JobPlanter] Errore critico nel piantare i seed del carrello: ${e.message}`, { error: e, module: 'worker-marketing' });
      return false;
    }
  }

  /**
   * Helper per ri-piantare un Evergreen Email (Loop Perpetuo)
   */
  static async replantEvergreenEmail(customerEmail: string, eventId: string) {
    try {
      const config = await prisma.marketingSettings.findUnique({ where: { id: "marketing_config" } });
      if (config && config.loopEnabled && config.loopTemplateId) {
        const nextDelay = config.loopIntervalDays;
        
        if (nextDelay > 0) {
            await prisma.marketingJob.deleteMany({
              where: {
                  jobType: "EVERGREEN_EMAIL",
                  status: "PENDING",
                  event: { customerEmail }
              }
            });

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + nextDelay);
            
            await prisma.marketingJob.create({
              data: {
                jobType: "EVERGREEN_EMAIL",
                status: "PENDING",
                scheduledFor: targetDate,
                eventId: eventId,
                templateId: config.loopTemplateId
              }
            });
            log.info(`[JobPlanter] Piantato seme Evergreen a +${nextDelay}g per ${customerEmail}`, { module: 'worker-marketing' });
        }
      }
    } catch (e: any) {
      log.error(`[JobPlanter] Impossibile piantare seme Evergreen per ${customerEmail}: ${e.message}`, { error: e, module: 'worker-marketing' });
    }
  }
}
