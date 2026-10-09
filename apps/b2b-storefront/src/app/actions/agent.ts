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

  if (zucchettiCode) {
    const cookieOpts: any = { path: '/', maxAge: 86400 };
    if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';
    cookies().set('impersonatedClientCode', zucchettiCode, cookieOpts);
    cookies().set('impersonatedClientName', companyName || '', cookieOpts);
    cookies().set('impersonatedClientDiscount', String(discount || 0), cookieOpts);
  } else {
    cookies().delete({ name: 'impersonatedClientCode', ...cookieOpts, maxAge: 0 });
    cookies().delete({ name: 'impersonatedClientName', ...cookieOpts, maxAge: 0 });
    cookies().delete({ name: 'impersonatedClientDiscount', ...cookieOpts, maxAge: 0 });
  }

  return { success: true };
}

export async function startOrderReview(orderId: string) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false };
  }

  try {
    const order = await prisma.b2BOrder.findUnique({
      where: { id: orderId },
      include: { items: true, user: true }
    });

    if (!order) return { success: false, error: 'Ordine non trovato' };
    if (order.status !== 'PENDING_AGENT_REVIEW' && order.status !== 'DRAFT') return { success: false, error: 'Ordine non in revisione' };
    if (order.user.agentId !== session.userId) return { success: false, error: 'Cliente non assegnato' };

    // Setup impersonation cookies if not already
    const cookieOpts: any = { path: '/', maxAge: 86400 };
    if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';
    
    cookies().set('impersonatedClientCode', order.user.zucchettiCode || '', cookieOpts);
    cookies().set('impersonatedClientName', order.user.companyName || '', cookieOpts);
    cookies().set('impersonatedClientDiscount', String(order.user.discount || 0), cookieOpts);
    
    // FORZA il cookie del negozio in modo che l'agente veda il carrello corretto (Izzo vs Elmark)
    const storeCookieOpts: any = { path: '/', maxAge: 86400, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' };
    if (process.env.NODE_ENV === 'production') storeCookieOpts.domain = '.izzodistribuzione.it';
    cookies().set('b2b_store_mode', order.storeMode, storeCookieOpts);

    // Clean up any old REVIEW cart for this user
    await prisma.b2BCart.deleteMany({
      where: { userId: order.userId, status: 'REVIEW' }
    });

    // Create the REVIEW cart
    const reviewCart = await prisma.b2BCart.create({
      data: {
        userId: order.userId,
        status: 'REVIEW',
        cartType: order.storeMode, // <-- Fondamentale: preserva se era Elmark o Zucchetti
        linkedOrderId: order.id,
        items: {
          create: order.items.map(item => ({
            sku: item.sku,
            quantity: item.quantity,
            // Originalmente lo sconto extra era applicato sul prezzo finale,
            // ma se non abbiamo salvato l'extraDiscount sull'order item,
            // non possiamo recuperarlo. In fase 2 dovremo salvare anche extraDiscount nell'order item.
            // Per ora lo lasciamo a 0 o calcoliamo dal prezzo.
            extraDiscount: 0, 
            extraDiscountMinQty: null
          }))
        }
      }
    });

    // Set cookie to activate review mode
    cookies().set('reviewingOrderId', order.id, cookieOpts);
    
    return { success: true };
  } catch (error: any) {
    console.error('startOrderReview error:', error);
    return { success: false, error: error.message };
  }
}

