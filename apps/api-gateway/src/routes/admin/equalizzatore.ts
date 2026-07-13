import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma } from '@archelia/database';
import { Queue } from 'bullmq';
import { env, log, createRedisConnection } from '@archelia/core';
import Redis from 'ioredis';
import { PassThrough } from 'stream';

// Set up BullMQ queue for manual triggers
const equalizzatoreQueue = new Queue('equalizzatore-commands', {
  connection: createRedisConnection() as any,
});

const clients = new Set<PassThrough>();

let pub: Redis | null = null;
let sub: Redis | null = null;

if (env.REDIS_URL) {
  try {
    const redisConfig = {
      family: 0,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 1000, 3000);
      }
    };

    pub = new Redis(env.REDIS_URL, redisConfig);
    sub = new Redis(env.REDIS_URL, redisConfig);

    sub.subscribe('equalizzatore-locks', 'equalizzatore-progress', (err) => {
      if (err) log.error('Redis subscription error', { error: err.message });
      else log.info('✅ Subscribed to Redis channels');
    });

    sub.on('message', (channel, message) => {
      for (const client of clients) {
        client.write(`data: ${message}\n\n`);
      }
    });
  } catch (error: any) {
    log.error('Failed to initialize Redis clients', { error: error.message });
  }
}

function broadcast(message: any) {
  const payload = JSON.stringify(message);
  if (pub) {
    pub.publish('equalizzatore-locks', payload).catch(err => log.error('Redis publish error', { error: err.message }));
  } else {
    for (const client of clients) {
      client.write(`data: ${payload}\n\n`);
    }
  }
}

export async function adminEqualizzatoreRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // SSE endpoint for Real-Time progress
  fastify.get('/api/admin/equalizzatore/sse', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    const stream = new PassThrough();
    reply.send(stream);
    clients.add(stream);

    stream.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

    request.raw.on('close', () => {
      clients.delete(stream);
    });
  });

  // Get Progress
  fastify.get('/api/admin/equalizzatore/progress', async (request, reply) => {
    if (pub) {
      const val = await pub.get('equalizzatore-current-progress');
      if (val) return { success: true, data: JSON.parse(val) };
    }
    return { success: true, data: { type: 'PROGRESS_UPDATE', payload: { isActive: false, progress: 0, total: 0, message: '' } } };
  });

  // Reset Progress
  fastify.post('/api/admin/equalizzatore/reset-progress', async (request, reply) => {
    if (pub) {
      const resetPayload = JSON.stringify({ type: 'PROGRESS_UPDATE', payload: { isActive: false, progress: 0, total: 0, message: '' } });
      await pub.set('equalizzatore-current-progress', resetPayload);
      await pub.publish('equalizzatore-progress', resetPayload);
    }
    return { success: true };
  });

  fastify.get('/api/admin/equalizzatore/taxonomy', async (request, reply) => {
    try {
      const dbGroups = await prisma.productCategory.findMany({ select: { code: true, name: true }, orderBy: { name: 'asc' } });
      const dbFamilies = await prisma.family.findMany({ select: { code: true, name: true }, orderBy: { name: 'asc' } });
      const dbCategories = await prisma.homogeneousCategory.findMany({ select: { code: true, name: true }, orderBy: { name: 'asc' } });
      
      const groupsMap = new Map<string, any>(dbGroups.map(g => [g.code, { ...g, isNew: false }]));
      const familiesMap = new Map<string, any>(dbFamilies.map(f => [f.code, { ...f, isNew: false }]));
      const categoriesMap = new Map<string, any>(dbCategories.map(c => [c.code, { ...c, isNew: false }]));

      const staging = await prisma.equalizzatoreStaging.findMany({
        select: { phase1Payload: true }
      });

      for (const s of staging) {
        if (!s.phase1Payload) continue;
        const p1: any = s.phase1Payload;
        
        if (p1.productGroup && typeof p1.productGroup === 'string') {
          const exists = Array.from(groupsMap.values()).some(g => g.name.toLowerCase() === p1.productGroup.toLowerCase() || g.code === p1.productGroup);
          if (!exists && !groupsMap.has(p1.productGroup)) groupsMap.set(p1.productGroup, { code: p1.productGroup, name: p1.productGroup, isNew: true });
        }
        if (p1.family && typeof p1.family === 'string') {
          const exists = Array.from(familiesMap.values()).some(f => f.name.toLowerCase() === p1.family.toLowerCase() || f.code === p1.family);
          if (!exists && !familiesMap.has(p1.family)) familiesMap.set(p1.family, { code: p1.family, name: p1.family, isNew: true });
        }
        if (p1.category && typeof p1.category === 'string') {
          const exists = Array.from(categoriesMap.values()).some(c => c.name.toLowerCase() === p1.category.toLowerCase() || c.code === p1.category);
          if (!exists && !categoriesMap.has(p1.category)) categoriesMap.set(p1.category, { code: p1.category, name: p1.category, isNew: true });
        }
      }

      return { success: true, groups: Array.from(groupsMap.values()), families: Array.from(familiesMap.values()), categories: Array.from(categoriesMap.values()) };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/equalizzatore/staging', {
    schema: { querystring: z.object({ tab: z.string().optional() }) },
  }, async (request, reply) => {
    try {
      const { tab } = request.query as { tab?: string };
      let statusFilter = 'PENDING_TEXT';
      if (tab === '2') statusFilter = 'PENDING_NOMENCLATURE';
      if (tab === '3') statusFilter = 'PENDING_DUPLICATE_CHECK'; // Note: Changed to match original UI PENDING_DUPLICATE_CHECK
      if (tab === '4') statusFilter = 'READY_FOR_SYNC';

      const stagingItems = await prisma.equalizzatoreStaging.findMany({
        orderBy: { createdAt: 'desc' },
        where: { reviewStatus: statusFilter },
        take: 50,
      });

      const enhancedItems = await Promise.all(
        stagingItems.map(async (item) => {
          const raw = await prisma.elmarkRawProduct.findUnique({ where: { elmarkId: item.sourceId } });
          const processed = await prisma.elmarkProcessedProduct.findUnique({ where: { elmarkCode: item.sourceId }, select: { sku: true } });
          let imageUrl = null;
          if (raw && raw.rawData) {
            const parsedRaw = typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : raw.rawData;
            imageUrl = parsedRaw?.picture_url || null;
          }
          return {
            ...item,
            originalRawData: raw ? (typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : raw.rawData) : null,
            imageUrl,
            displaySku: processed?.sku || item.sku || item.sourceId
          };
        })
      );

      return { success: true, data: enhancedItems };
    } catch (error: any) {
      log.error('Errore fetch equalizzatore staging', { error: error.message, stack: error.stack });
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.post('/api/admin/equalizzatore/staging/:id/lock', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      // Note: we might not have a logged in user in this context, use 'ADMIN'
      const username = 'ADMIN';
      
      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      const now = new Date();
      if (staging.lockedBy && staging.lockedBy !== username) {
        if (staging.lockedAt && now.getTime() - staging.lockedAt.getTime() < 5 * 60 * 1000) {
          return reply.status(423).send({ success: false, error: 'Prodotto in lavorazione da ' + staging.lockedBy });
        }
      }

      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { lockedBy: username, lockedAt: now }
      });

      broadcast({ type: 'LOCK_CHANGED' });
      return { success: true };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/equalizzatore/staging/:id/unlock', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { lockedBy: null, lockedAt: null }
      });
      broadcast({ type: 'LOCK_CHANGED' });
      return { success: true };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/equalizzatore/staging/:id/compare', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      const original = await prisma.elmarkProcessedProduct.findUnique({ where: { elmarkCode: staging.sourceId } });

      if (staging.phase1Payload) {
        const p1 = staging.phase1Payload as any;
        const group = p1.productGroup ? await prisma.productGroup.findUnique({ where: { code: p1.productGroup } }) : null;
        const family = p1.family ? await prisma.family.findUnique({ where: { code: p1.family } }) : null;
        const category = p1.category ? await prisma.homogeneousCategory.findUnique({ where: { code: p1.category } }) : null;
        
        p1.productGroupName = group?.name || '';
        p1.familyName = family?.name || '';
        p1.categoryName = category?.name || '';
      }

      const raw = await prisma.elmarkRawProduct.findUnique({ where: { elmarkId: staging.sourceId } });
      let imageUrl = null;
      if (raw && raw.rawData) {
        const parsedRaw = typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : raw.rawData;
        imageUrl = parsedRaw.picture_url || null;
      }

      return { success: true, staging, original, imageUrl };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/equalizzatore/staging/:id/approve-field', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { field, value } = request.body as { field: string, value: any };

      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      const currentApproved = (staging.approvedPayload as Record<string, any>) || {};
      currentApproved[field] = value;

      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { approvedPayload: currentApproved }
      });

      return { success: true, approvedPayload: currentApproved };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/equalizzatore/staging/:id/approve-text', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { reviewStatus: 'PENDING_NOMENCLATURE' }
      });
      return { success: true, message: 'Testi approvati, passato a revisione Nomenclatura' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // THE IMPORTANT DUPLICATE CHECK
  fastify.post('/api/admin/equalizzatore/staging/:id/approve-nomenclature', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { groupCode, familyCode, categoryCode, groupName, familyName, categoryName } = request.body as any || {};
      
      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      let phase1 = staging.phase1Payload as any || {};
      if (groupCode) phase1.productGroup = groupCode;
      if (groupName) phase1.productGroupName = groupName;
      if (familyCode) phase1.family = familyCode;
      if (familyName) phase1.familyName = familyName;
      if (categoryCode) phase1.category = categoryCode;
      if (categoryName) phase1.categoryName = categoryName;

      const matchingProducts = await prisma.product.findMany({
        where: {
          OR: [
            { sku: staging.sourceId },
            { sku: { endsWith: '.' + staging.sourceId } }
          ]
        },
        select: { sku: true }
      });

      let nextStatus = 'READY_FOR_SYNC';
      let chosenSku = staging.sourceId;
      let discardedSku: string | null = null;

      if (matchingProducts.length > 1) {
        nextStatus = 'PENDING_DUPLICATE_CHECK';
      } else if (matchingProducts.length === 1) {
        chosenSku = matchingProducts[0].sku;
        if (chosenSku !== staging.sourceId) {
          discardedSku = staging.sourceId;
        }
      }

      const currentApproved = (staging.approvedPayload as any) || {};
      currentApproved.chosenSku = chosenSku;
      if (discardedSku) currentApproved.discardedSku = discardedSku;

      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { 
          phase1Payload: phase1,
          approvedPayload: currentApproved,
          reviewStatus: nextStatus 
        }
      });

      return { 
        success: true, 
        message: nextStatus === 'PENDING_DUPLICATE_CHECK' ? 'Duplicati rilevati, necessaria risoluzione' : 'Nomenclatura approvata, pronto per la sincronizzazione',
        status: nextStatus
      };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/admin/equalizzatore/staging/:id/duplicate-options', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      const products = await prisma.product.findMany({
        where: {
          OR: [
            { sku: staging.sourceId },
            { sku: { endsWith: '.' + staging.sourceId } }
          ]
        },
        select: {
          sku: true,
          title: true,
          description: true,
          technicalDesc: true,
          metaDescription: true,
          keywords: true
        }
      });

      return { success: true, data: products };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/equalizzatore/staging/:id/resolve-sku', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { chosenSku, approvedPayload } = request.body as any;

      const staging = await prisma.equalizzatoreStaging.findUnique({ where: { id } });
      if (!staging) throw new Error("Staging record non trovato");

      const currentApproved = (staging.approvedPayload as Record<string, any>) || {};
      currentApproved.chosenSku = chosenSku;
      currentApproved.discardedSku = staging.sourceId; 
      
      const finalPayload = { ...currentApproved, ...approvedPayload };

      await prisma.equalizzatoreStaging.update({
        where: { id },
        data: { 
          approvedPayload: finalPayload,
          reviewStatus: 'READY_FOR_SYNC'
        }
      });

      return { success: true, message: 'SKU risolto e testi salvati' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/api/admin/equalizzatore/trigger', {
    schema: { body: z.object({ action: z.enum(['RUN_BATCH', 'RUN_SINGLE']), sku: z.string().optional() }) },
  }, async (request, reply) => {
    const { action, sku } = request.body;
    try {
      if (action === 'RUN_SINGLE') {
        if (!sku) return reply.status(400).send({ success: false, error: 'SKU is required for RUN_SINGLE' });
        await equalizzatoreQueue.add('process-single', { sku });
      } else if (action === 'RUN_BATCH') {
        await equalizzatoreQueue.add('process-batch', {});
      }
      return { success: true, message: `Azione ${action} innescata con successo su Redis.` };
    } catch (error: any) {
      log.error('Errore trigger equalizzatore', { error: error.message });
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.post('/api/admin/equalizzatore/sync-approved', async (request, reply) => {
    try {
      const ready = await prisma.equalizzatoreStaging.findMany({ where: { reviewStatus: 'READY_FOR_SYNC' } });
      for (const staging of ready) {
        const approvedPayload = (staging.approvedPayload as any) || {};
        const chosenSku = approvedPayload.chosenSku || staging.sourceId;
        const discardedSku = approvedPayload.discardedSku || null;

        await prisma.elmarkProcessedProduct.upsert({
          where: { elmarkCode: staging.sourceId },
          update: {
            sku: chosenSku,
            discardedSku: discardedSku,
            productGroup: (staging.phase1Payload as any)?.productGroup,
            family: (staging.phase1Payload as any)?.family,
            category: (staging.phase1Payload as any)?.category,
            seoTitle: approvedPayload.seoTitle || (staging.phase3Payload as any)?.seoTitle,
            metaDescription: approvedPayload.metaDescription || (staging.phase3Payload as any)?.metaDescription,
            commercialDescHtml: approvedPayload.commercialDescHtml || (staging.phase3Payload as any)?.commercialDescHtml,
            title: approvedPayload.technicalB2BTitle || (staging.phase3Payload as any)?.technicalB2BTitle,
            keywords: approvedPayload.metaKeywords || (
              Array.isArray((staging.phase3Payload as any)?.metaKeywords) 
                ? (staging.phase3Payload as any).metaKeywords.join(', ')
                : (staging.phase3Payload as any)?.metaKeywords
            ),
            technicalDesc: approvedPayload.technicalDetails || (
              (staging.phase1Payload as any)?.technicalDetails && typeof (staging.phase1Payload as any).technicalDetails === 'object'
                ? Object.entries((staging.phase1Payload as any).technicalDetails).map(([k, v]) => `${k}: ${v}`).join('; ') + ';'
                : (staging.phase1Payload as any)?.technicalDetails
            ),
            reviewStatus: 'MANUALLY_APPROVED'
          },
          create: {
            elmarkCode: staging.sourceId,
            sku: chosenSku,
            discardedSku: discardedSku,
            productGroup: (staging.phase1Payload as any)?.productGroup,
            family: (staging.phase1Payload as any)?.family,
            category: (staging.phase1Payload as any)?.category,
            seoTitle: approvedPayload.seoTitle || (staging.phase3Payload as any)?.seoTitle,
            metaDescription: approvedPayload.metaDescription || (staging.phase3Payload as any)?.metaDescription,
            commercialDescHtml: approvedPayload.commercialDescHtml || (staging.phase3Payload as any)?.commercialDescHtml,
            title: approvedPayload.technicalB2BTitle || (staging.phase3Payload as any)?.technicalB2BTitle,
            keywords: approvedPayload.metaKeywords || (
              Array.isArray((staging.phase3Payload as any)?.metaKeywords) 
                ? (staging.phase3Payload as any).metaKeywords.join(', ')
                : (staging.phase3Payload as any)?.metaKeywords
            ),
            technicalDesc: approvedPayload.technicalDetails || (
              (staging.phase1Payload as any)?.technicalDetails && typeof (staging.phase1Payload as any).technicalDetails === 'object'
                ? Object.entries((staging.phase1Payload as any).technicalDetails).map(([k, v]) => `${k}: ${v}`).join('; ') + ';'
                : (staging.phase1Payload as any)?.technicalDetails
            ),
            reviewStatus: 'MANUALLY_APPROVED'
          }
        });

        await prisma.equalizzatoreStaging.update({
          where: { id: staging.id },
          data: { reviewStatus: 'SYNCED' }
        });
      }
      return { success: true, message: `Sincronizzati ${ready.length} prodotti nel DB Finale` };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

}
