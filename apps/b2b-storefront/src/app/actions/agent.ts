'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { cookies } from 'next/headers';

export async function getAgentCustomers() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  try {
    const customers = await prisma.b2BUser.findMany({
      where: { agentId: session.userId },
      orderBy: { companyName: 'asc' }
    });

    const mapped = customers.map(c => ({
      zucchettiCode: c.zucchettiCode || '',
      companyName: c.companyName || '',
      vatNumber: c.vatNumber || '',
      discount: c.discount
    }));

    return { success: true, customers: mapped };
  } catch (error: any) {
    console.error('getAgentCustomers error:', error);
    return { success: false, error: 'Errore fetch clienti' };
  }
}

export async function setImpersonatedClient(zucchettiCode: string | null, companyName: string | null, discount: number | null) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false };
  }

  const cookieOpts: any = { path: '/', maxAge: 86400 };
  if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';

  // Clean up any active review lock if switching client
  const reviewingOrderId = cookies().get('reviewingOrderId')?.value;
  if (reviewingOrderId) {
    try {
      const { redis } = await import('@/lib/redis');
      await redis.del(`b2b_order_lock:${reviewingOrderId}`);
      await prisma.b2BCart.deleteMany({
        where: { linkedOrderId: reviewingOrderId, status: 'REVIEW' }
      });
    } catch (e) {}
    cookies().delete({ name: 'reviewingOrderId', ...cookieOpts, maxAge: 0 });
  }

  if (zucchettiCode) {
    const assignedClient = await prisma.b2BUser.findFirst({
      where: {
        zucchettiCode,
        agentId: session.userId,
        role: 'USER',
      },
    });
    if (assignedClient) {
      cookies().set('impersonatedClientCode', zucchettiCode, cookieOpts);
      cookies().set('impersonatedClientName', assignedClient.companyName || companyName || '', cookieOpts);
      cookies().set('impersonatedClientDiscount', String(assignedClient.discount ?? discount ?? 0), cookieOpts);
    } else {
      const assignedPromo = await prisma.b2BPromoProspect.findFirst({
        where: {
          OR: [{ id: zucchettiCode }, { username: { equals: zucchettiCode, mode: 'insensitive' } }],
          agentId: session.userId,
        },
      });
      if (!assignedPromo) {
        return { success: false, error: 'Cliente non assegnato al tuo profilo agente.' };
      }
      cookies().set('impersonatedClientCode', assignedPromo.id, cookieOpts);
      cookies().set('impersonatedClientName', `[IN ATTIVAZIONE] ${assignedPromo.companyName || companyName || ''}`, cookieOpts);
      cookies().set('impersonatedClientDiscount', String(assignedPromo.discount ?? discount ?? 0), cookieOpts);
    }
  } else {
    cookies().delete({ name: 'impersonatedClientCode', ...cookieOpts, maxAge: 0 });
    cookies().delete({ name: 'impersonatedClientName', ...cookieOpts, maxAge: 0 });
    cookies().delete({ name: 'impersonatedClientDiscount', ...cookieOpts, maxAge: 0 });
  }

  return { success: true };
}

export async function startOrderReview(orderId: string, returnUrl?: string) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false };
  }

  try {
    const order = await prisma.b2BOrder.findUnique({
      where: { id: orderId },
      include: { items: true, user: true, promoProspect: true }
    });

    if (!order) return { success: false, error: 'Ordine non trovato' };
    if (order.status !== 'PENDING_AGENT_REVIEW' && order.status !== 'DRAFT') return { success: false, error: 'Ordine non in revisione' };
    const orderOwner = order.user || order.promoProspect;
    if (!orderOwner || orderOwner.agentId !== session.userId) return { success: false, error: 'Cliente non assegnato' };

    const targetOwnerId = order.userId || order.promoProspectId!;

    // Check lock
    const { redis } = await import('@/lib/redis');
    const lockKey = `b2b_order_lock:${orderId}`;
    const currentLock = await redis.get(lockKey);
    if (currentLock && currentLock !== session.userId) {
      return { success: false, error: 'Il cliente sta attualmente modificando questo ordine. Riprova più tardi.' };
    }
    // Lock it for the agent
    await redis.set(lockKey, session.userId, 'EX', 3600 * 2); // 2 hours

    // Setup impersonation cookies if not already
    const cookieOpts: any = { path: '/', maxAge: 86400 };
    if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';
    
    cookies().set('impersonatedClientCode', order.user?.zucchettiCode || order.promoProspect?.id || '', cookieOpts);
    cookies().set('impersonatedClientName', order.promoProspect && !order.user ? `[IN ATTIVAZIONE] ${orderOwner.companyName || ''}` : (orderOwner.companyName || ''), cookieOpts);
    cookies().set('impersonatedClientDiscount', String(orderOwner.discount || 0), cookieOpts);
    
    // FORZA il cookie del negozio in modo che l'agente veda il carrello corretto (Izzo vs Elmark)
    const storeCookieOpts: any = { path: '/', maxAge: 86400, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' };
    if (process.env.NODE_ENV === 'production') storeCookieOpts.domain = '.izzodistribuzione.it';
    cookies().set('b2b_store_mode', order.storeMode, storeCookieOpts);

    // Clean up any old REVIEW cart for this user
    const ownerCartFilter = order.userId
      ? { userId: order.userId, status: 'REVIEW' as const }
      : { promoProspectId: order.promoProspectId, status: 'REVIEW' as const };
    const oldReviewCarts = await prisma.b2BCart.findMany({
      where: ownerCartFilter,
      select: { linkedOrderId: true }
    });
    for (const oldCart of oldReviewCarts) {
      if (oldCart.linkedOrderId && oldCart.linkedOrderId !== order.id) {
        try {
          await redis.del(`b2b_order_lock:${oldCart.linkedOrderId}`);
        } catch (e) {}
      }
    }
    await prisma.b2BCart.deleteMany({
      where: ownerCartFilter
    });

    // Create the REVIEW cart
    await prisma.b2BCart.create({
      data: {
        userId: order.userId || null,
        promoProspectId: order.promoProspectId || null,
        status: 'REVIEW',
        cartType: order.storeMode, // <-- Fondamentale: preserva se era Elmark o Zucchetti
        linkedOrderId: order.id,
        items: {
          create: order.items.map(item => ({
            sku: item.sku,
            quantity: item.quantity,
            extraDiscount: 0, 
            extraDiscountMinQty: null
          }))
        }
      }
    });

    const isCustomerSavedOrder = order.status === 'DRAFT' && (!order.createdById || order.createdById === targetOwnerId);
    const defaultReturnUrl = order.status === 'DRAFT'
      ? `${isCustomerSavedOrder ? '/account/saved-orders' : '/account/quotes'}${order.storeMode === 'ELMARK' ? '?tab=elmark' : ''}`
      : `/account/agent-orders${order.storeMode === 'ELMARK' ? '?tab=elmark' : ''}`;

    // Set cookies to activate review mode and remember origin page
    cookies().set('reviewingOrderId', order.id, cookieOpts);
    cookies().set('reviewingReturnUrl', returnUrl || defaultReturnUrl, cookieOpts);

    // Clear stale Redis keys for review carts
    try {
      await redis.del(`b2b_cart_v2:${targetOwnerId}:REVIEW:${order.id}:ELMARK`);
      await redis.del(`b2b_cart_v2:${targetOwnerId}:REVIEW:${order.id}:ZUCCHETTI`);
    } catch (e) {
      console.error('Failed to clear redis review cart', e);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('startOrderReview error:', error);
    return { success: false, error: error.message };
  }
}

export async function endOrderReviewSession() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, returnUrl: '/account/agent-orders' };
  }

  const cookieStore = cookies();
  const reviewingOrderId = cookieStore.get('reviewingOrderId')?.value;
  let returnUrl = cookieStore.get('reviewingReturnUrl')?.value || '';

  if (reviewingOrderId) {
    try {
      if (!returnUrl) {
        const ord = await prisma.b2BOrder.findUnique({
          where: { id: reviewingOrderId },
          select: { status: true, storeMode: true, createdById: true, userId: true }
        });
        if (ord) {
          const tab = ord.storeMode === 'ELMARK' ? '?tab=elmark' : '';
          const isSaved = ord.status === 'DRAFT' && (!ord.createdById || ord.createdById === ord.userId);
          returnUrl = ord.status === 'DRAFT'
            ? `${isSaved ? '/account/saved-orders' : '/account/quotes'}${tab}`
            : `/account/agent-orders${tab}`;
        }
      }
      const { redis } = await import('@/lib/redis');
      await redis.del(`b2b_order_lock:${reviewingOrderId}`);
      await prisma.b2BCart.deleteMany({
        where: { linkedOrderId: reviewingOrderId, status: 'REVIEW' }
      });
    } catch (e) {}
  }

  if (!returnUrl) {
    returnUrl = '/account/agent-orders';
  }

  const cookieNames = [
    'reviewingOrderId',
    'reviewingReturnUrl',
    'impersonatedClientCode',
    'impersonatedClientName',
    'impersonatedClientDiscount',
    'agentExtraDiscount',
  ];

  for (const name of cookieNames) {
    cookieStore.delete({ name, path: '/', maxAge: 0 });
    if (process.env.NODE_ENV === 'production') {
      cookieStore.delete({ name, path: '/', domain: '.izzodistribuzione.it', maxAge: 0 });
    }
  }

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/', 'layout');
  revalidatePath('/cart');
  return { success: true, returnUrl };
}


