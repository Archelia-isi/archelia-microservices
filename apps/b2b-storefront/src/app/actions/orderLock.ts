'use server';

import { verifySession } from '@/lib/session';
import { redis } from '@/lib/redis';
import { prisma } from '@archelia/b2b-database';

export async function isOrderLockedForUser(orderId: string, userId: string, userRole?: string) {
  try {
    const lockKey = `b2b_order_lock:${orderId}`;
    const currentLock = await redis.get(lockKey);

    if (currentLock && currentLock !== userId) {
      return true;
    }

    if (userRole !== 'AGENT') {
      const activeReviewCart = await prisma.b2BCart.findFirst({
        where: {
          linkedOrderId: orderId,
          status: 'REVIEW'
        },
        select: { id: true }
      });
      if (activeReviewCart) {
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error('Failed to check order lock', e);
    return false;
  }
}

export async function lockOrderForEdit(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'L\'ordine è attualmente in revisione da parte dell\'agente e non può essere modificato.' };
    }

    const lockKey = `b2b_order_lock:${orderId}`;
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
    const activeReviewCart = await prisma.b2BCart.findFirst({
      where: {
        linkedOrderId: orderId,
        status: 'REVIEW'
      },
      select: { id: true }
    });
    return {
      isLocked: !!currentLock || !!activeReviewCart,
      lockedBy: currentLock,
      hasReviewCart: !!activeReviewCart
    };
  } catch (e) {
    return { isLocked: false, lockedBy: null, hasReviewCart: false };
  }
}
