import { Job } from 'bullmq';
import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { EmailSender } from '../utils/EmailSender.js';
import { MarketingTagEngine } from '../utils/TagEngine.js';

export class EmailSenderJob {
  static async process(job: Job) {
    const { jobId, jobData } = job.data;
    
    log.info(`[EmailSenderJob] Avvio elaborazione job DB ${jobId}`, { module: 'worker-marketing' });

    try {
      const marketingJob = await prisma.marketingJob.findUnique({
        where: { id: jobId },
        include: {
          event: true,
          template: true
        }
      });

      if (!marketingJob || marketingJob.status === "CANCELled") {
        log.warn(`[EmailSenderJob] Job ${jobId} non trovato o cancellato.`, { module: 'worker-marketing' });
        return { success: false, reason: 'CANCELLED_OR_NOT_FOUND' };
      }

      if (!marketingJob.template) {
         throw new Error("Nessun template associato a questo Job.");
      }

      if (!marketingJob.event) {
         throw new Error("Nessun evento associato a questo Job.");
      }

      // Costruiamo il payload
      const customerEmail = marketingJob.event.customerEmail;
      if (!customerEmail) {
         throw new Error("customerEmail mancante nell'evento.");
      }

      const htmlContent = marketingJob.template.htmlContent || "";
      const subjectRaw = marketingJob.template.subject || "Aggiornamento da Archelia";

      const eventPayload = typeof marketingJob.event.payload === 'string' 
        ? JSON.parse(marketingJob.event.payload) 
        : marketingJob.event.payload;

      // Sostituiamo i tag dinamici
      const htmlCompiled = await MarketingTagEngine.compileHtml(htmlContent, customerEmail, eventPayload);
      const subjectCompiled = await MarketingTagEngine.compileHtml(subjectRaw, customerEmail, eventPayload);

      // Invio effettivo con Brevo
      await EmailSender.send({
        to: [{ email: customerEmail }],
        subject: subjectCompiled,
        htmlContent: htmlCompiled
      });

      // Aggiorniamo DB
      await prisma.marketingJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          updatedAt: new Date(),
          lastError: null,
          attempts: marketingJob.attempts + 1
        }
      });

      log.info(`[EmailSenderJob] ✅ Email inviata con successo a ${customerEmail}`, { module: 'worker-marketing' });
      return { success: true };

    } catch (error: any) {
      log.error(`[EmailSenderJob] ❌ Fallimento invio: ${error.message}`, { error, module: 'worker-marketing' });

      // Aggiorniamo status DB
      await prisma.marketingJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          lastError: error.message,
          attempts: { increment: 1 },
          updatedAt: new Date()
        }
      });

      throw error;
    }
  }
}
