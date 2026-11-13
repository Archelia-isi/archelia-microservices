import { Queue, QueueOptions } from 'bullmq';
import { createRedisConnection } from './redis.js';

const connection = createRedisConnection();

const queueOptions: QueueOptions = {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Mantieni gli ultimi 100 job completati
    removeOnFail: 1000,    // Mantieni gli ultimi 1000 job falliti
  },
};

// ==========================================
// Contratti Tipizzati AI SDR B2B (BullMQ)
// ==========================================

export const SDR_JOBS = {
  SCAN_TERRITORY: 'SCAN_TERRITORY',
  AUTOPILOT_TICK: 'AUTOPILOT_TICK',
  DEEP_PROFILE_BATCH: 'DEEP_PROFILE_BATCH',
  MASTER_AUDIT_BATCH: 'MASTER_AUDIT_BATCH',
  ENRICH_SINGLE: 'ENRICH_SINGLE',
  REAUDIT_CLUSTERS: 'REAUDIT_CLUSTERS',
  SENTINEL_BATCH: 'SENTINEL_BATCH',
  PREPARE_PACKAGE: 'PREPARE_PACKAGE',
  PREPARE_BATCH: 'PREPARE_BATCH',
  DISPATCH_SINGLE: 'DISPATCH_SINGLE',
  DISPATCH_BATCH: 'DISPATCH_BATCH',
  IMAP_POLL_TICK: 'IMAP_POLL_TICK',
  DAILY_RESET_QUOTA: 'DAILY_RESET_QUOTA',
} as const;

export interface SdrScanTerritoryJobPayload {
  action: typeof SDR_JOBS.SCAN_TERRITORY;
  regione?: string | null;
  provincia?: string | null;
  comune?: string | null;
  categoria?: string | null;
  maxResults?: number;
  fullItalyScan?: boolean;
}

export interface SdrSentinelBatchJobPayload {
  action: typeof SDR_JOBS.SENTINEL_BATCH;
  batchSize?: number;
  cluster?: string;
  provincia?: string;
  regione?: string;
}

export interface SdrDeepProfileBatchJobPayload {
  action: typeof SDR_JOBS.DEEP_PROFILE_BATCH;
  regione?: string;
  provincia?: string;
  comune?: string;
  limit?: number;
}

export interface SdrPrepareBatchJobPayload {
  action: typeof SDR_JOBS.PREPARE_BATCH;
  prospectIds: number[];
  agentId?: string;
  agentCode?: string;
  agentName?: string;
  agentEmail?: string;
}

export interface SdrDispatchSingleJobPayload {
  action: typeof SDR_JOBS.DISPATCH_SINGLE;
  draftId: number;
  preferredInboxId?: number;
}

export interface SdrDispatchBatchJobPayload {
  action: typeof SDR_JOBS.DISPATCH_BATCH;
  draftIds: number[];
}

// ==========================================
// Dichiarazione Code (Queues) Globali
// ==========================================

export const shopifyProductsQueue = new Queue('shopify-products', queueOptions);
export const shopifyOrdersQueue = new Queue('shopify-orders', queueOptions);
export const shopifyCustomersQueue = new Queue('shopify-customers', queueOptions);
export const shopifyTrackingQueue = new Queue('shopify-tracking', queueOptions);
export const shopifyPromoQueue = new Queue('shopify-promo', queueOptions);

// Marketing Queues
export const marketingQueue = new Queue('marketing-queue', queueOptions);
export const marketingJobsQueue = new Queue('marketing-jobs', queueOptions);

// AI SDR B2B Queues
export const sdrScraperQueue = new Queue('sdr-scraper-queue', queueOptions);
export const sdrSentinelQueue = new Queue('sdr-sentinel-queue', queueOptions);
export const sdrCopywriterQueue = new Queue('sdr-copywriter-queue', queueOptions);
export const sdrOutreachQueue = new Queue('sdr-outreach-queue', queueOptions);
