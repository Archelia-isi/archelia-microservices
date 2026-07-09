import { Redis } from 'ioredis';
import { env } from '@archelia/core';

export type ProgressData = {
  isActive: boolean;
  type: string; // e.g. "TEXT_GENERATION", "NOMENCLATURE"
  progress: number;
  total: number;
  message: string;
};

let pub: Redis | null = null;
if (env.REDIS_URL) {
  try {
    pub = new Redis(env.REDIS_URL, {
      family: 0,
      retryStrategy: (times: number) => times > 3 ? null : Math.min(times * 1000, 3000)
    });
    pub.on('error', () => { /* ignore */ });
  } catch (e) {
    // fallback
  }
}

let currentProgress: ProgressData = {
  isActive: false,
  type: '',
  progress: 0,
  total: 0,
  message: ''
};

export class ProgressEmitter {
  static async emit(data: ProgressData) {
    currentProgress = data;
    const payload = JSON.stringify({ type: 'PROGRESS_UPDATE', payload: data });
    
    if (pub) {
      try {
        await pub.publish('equalizzatore-progress', payload);
        await pub.set('equalizzatore-current-progress', payload);
      } catch (e) {
        // Fallback or ignore se Redis cade
      }
    }
  }

  static async getCurrent(): Promise<any> {
    if (pub) {
      try {
        const val = await pub.get('equalizzatore-current-progress');
        if (val) return JSON.parse(val);
      } catch (e) {}
    }
    return { type: 'PROGRESS_UPDATE', payload: currentProgress };
  }
}
