'use server';

import { verifySession } from '@/lib/session';
import { redis } from '@/lib/redis';

export async function lockOrderForEdit(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const lockKey = `b2b_order_lock:${orderId}`;
    const currentLock = await redis.get(lockKey);

    if (currentLock && currentLock !== session.userId) {
      return { success: false, error: 'L\'ordine è attualmente bloccato o in revisione da parte dell\'agente.' };
    }

    // Lock for 15 minutes
    await redis.set(lockKey, session.userId, 'EX', 900);
    return { success: true };
  } catch (e: any) {
    console.error('Failed to lock order', e);
    return { success: false, error: 'Errore di sistema nel blocco dell\'ordine' };
  }
}

export async function unlockOrder(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false };
  try {
    const lockKey = `b2b_order_lock:${orderId}`;
    const currentLock = await redis.get(lockKey);
    if (currentLock === session.userId) {
      await redis.del(lockKey);
    }
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function checkOrderLock(orderId: string) {
  try {
    const lockKey = `b2b_order_lock:${orderId}`;
    const currentLock = await redis.get(lockKey);
    return { isLocked: !!currentLock, lockedBy: currentLock };
  } catch (e) {
    return { isLocked: false };
  }
}
