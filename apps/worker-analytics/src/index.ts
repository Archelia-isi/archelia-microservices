import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env, log } from '@archelia/core';
import { prisma } from '@archelia/database';
import PDFDocument from 'pdfkit';

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });

log.info('📊 Worker Analytics in avvio...', { module: 'worker-analytics' });

const worker = new Worker('analytics-queue', async (job) => {
  log.info(`Elaborazione job ${job.id} - ${job.name}`, { module: 'worker-analytics' });

  switch (job.name) {
    case 'GENERATE_REPORT_PDF': {
      return new Promise(async (resolve, reject) => {
        try {
          // Raccogliamo qualche statistica dal DB
          const totalProducts = await prisma.product.count();
          const publishedProducts = await prisma.product.count({ where: { publishedOnWeb: true } });
          const totalCustomers = await prisma.zelShopifyCustomer.count();
          
          // Ultimi 5 sync log
          const recentSyncs = await prisma.syncLog.findMany({
            take: 5,
            orderBy: { startedAt: 'desc' }
          });

          // Creiamo il PDF in memoria
          const doc = new PDFDocument({ margin: 50 });
          const buffers: Buffer[] = [];
          
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            // Restituiamo il PDF come stringa Base64
            resolve({
              success: true,
              pdfBase64: pdfData.toString('base64'),
              filename: `report_archelia_${new Date().toISOString().split('T')[0]}.pdf`
            });
          });

          // Disegniamo il PDF
          doc.fontSize(24).text('Archelia Analytics Report', { align: 'center' });
          doc.moveDown();
          
          doc.fontSize(12).text(`Data di generazione: ${new Date().toLocaleString('it-IT')}`);
          doc.moveDown(2);

          doc.fontSize(16).text('1. Statistiche Globali', { underline: true });
          doc.moveDown();
          doc.fontSize(12).text(`Totale Prodotti a Sistema: ${totalProducts}`);
          doc.text(`Prodotti Pubblicati su Web: ${publishedProducts}`);
          doc.text(`Clienti Registrati: ${totalCustomers}`);
          doc.moveDown(2);

          doc.fontSize(16).text('2. Ultimi Eventi di Sincronizzazione', { underline: true });
          doc.moveDown();
          
          recentSyncs.forEach(sync => {
            doc.fontSize(10).text(`[${sync.startedAt.toLocaleString('it-IT')}] ${sync.type} - Stato: ${sync.status}`);
            doc.fontSize(9).fillColor('gray').text(`Creati: ${sync.created} | Aggiornati: ${sync.updated} | Errori: ${sync.errors}`);
            doc.fillColor('black').moveDown(0.5);
          });

          doc.moveDown(2);
          doc.fontSize(10).fillColor('gray').text('Generato automaticamente dal Worker Analytics di Archelia.', { align: 'center' });

          doc.end();

        } catch (error: any) {
          log.error(`Errore generazione PDF: ${error.message}`, { module: 'worker-analytics' });
          reject(error);
        }
      });
    }

    default:
      log.warn(`Job name sconosciuto: ${job.name}`, { module: 'worker-analytics' });
      throw new Error(`Job name sconosciuto: ${job.name}`);
  }
}, { connection: connection as any });

worker.on('completed', (job) => {
  log.info(`Job ${job.id} (${job.name}) completato con successo`, { module: 'worker-analytics' });
});

worker.on('failed', (job, err) => {
  log.error(`Job ${job?.id} (${job?.name}) fallito: ${err.message}`, { module: 'worker-analytics' });
});
