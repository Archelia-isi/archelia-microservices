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

  /**
   * Sincronizza i Push per le Promozioni.
   * Cerca eventi AI Promo non schedulati e programma i job per il futuro (o immediati se flash).
   */
  static async syncPromoPushes() {
    try {
      const unscheduledPromos = await prisma.aiPromoEvent.findMany({
        where: {
          isPushScheduled: false,
          endsAt: { gt: new Date() }
        }
      });

      if (unscheduledPromos.length === 0) return;

      const allDevices = await prisma.webPushSubscription.findMany({
        select: { deviceId: true }
      });

      if (allDevices.length === 0) return;

      log.info(`[JobPlanter] Sincronizzazione Pushes per ${unscheduledPromos.length} promozioni su ${allDevices.length} devices attivi.`, { module: 'worker-marketing' });

      for (const promo of unscheduledPromos) {
        let scheduleTimes: Date[] = [];

        if (promo.promoType === 'DAILY_DEAL') {
             const baseDate = new Date(promo.startsAt);
             const at9 = new Date(baseDate); at9.setHours(9, 0, 0, 0);
             const at13 = new Date(baseDate); at13.setHours(13, 0, 0, 0);
             const at20 = new Date(baseDate); at20.setHours(20, 0, 0, 0);
             
             scheduleTimes = [at9, at13, at20];
             
             const now = new Date();
             scheduleTimes = scheduleTimes.filter(t => t > now);
             
             if (scheduleTimes.length === 0 && promo.endsAt > now) {
                scheduleTimes = [new Date(now.getTime() + 10 * 60000)];
             }

        } else if (promo.promoType === 'FLASH_DEAL' || promo.promoType === 'STANDARD_HOURLY') {
             scheduleTimes = [promo.startsAt];
             const now = new Date();
             if (scheduleTimes[0] <= now) {
                 scheduleTimes[0] = new Date(now.getTime() + 5 * 60000);
             }
        }

        const jobsToCreate: any[] = [];
        for (const device of allDevices) {
           for (const st of scheduleTimes) {
               jobsToCreate.push({
                   deviceId: device.deviceId,
                   jobType: 'PROMO_PUSH',
                   payload: {
                       promoId: promo.id,
                       promoType: promo.promoType,
                       title: promo.title,
                       description: promo.description
                   },
                   status: "PENDING",
                   scheduledFor: st
               });
           }
        }

        if (jobsToCreate.length > 0) {
            await prisma.pushJob.createMany({
                data: jobsToCreate
            });
        }

        await prisma.aiPromoEvent.update({
            where: { id: promo.id },
            data: { isPushScheduled: true }
        });
      }

    } catch(e: any) {
        log.error(`[JobPlanter] Fallita sincronizzazione Promo Pushes: ${e.message}`, { error: e, module: 'worker-marketing' });
    }
  }
}
