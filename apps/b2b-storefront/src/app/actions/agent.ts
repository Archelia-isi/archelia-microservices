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
    cookies().set('impersonatedClientCode', zucchettiCode, { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientName', companyName || '', { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientDiscount', String(discount || 0), { path: '/', maxAge: 86400 });
  } else {
    cookies().delete('impersonatedClientCode');
    cookies().delete('impersonatedClientName');
    cookies().delete('impersonatedClientDiscount');
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
    if (order.status !== 'PENDING_AGENT_REVIEW') return { success: false, error: 'Ordine non in revisione' };
    if (order.user.agentId !== session.userId) return { success: false, error: 'Cliente non assegnato' };

    // Setup impersonation cookies if not already
    cookies().set('impersonatedClientCode', order.user.zucchettiCode || '', { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientName', order.user.companyName || '', { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientDiscount', String(order.user.discount || 0), { path: '/', maxAge: 86400 });

    // Clean up any old REVIEW cart for this user
    await prisma.b2BCart.deleteMany({
      where: { userId: order.userId, status: 'REVIEW' }
    });

    // Create the REVIEW cart
    const reviewCart = await prisma.b2BCart.create({
      data: {
        userId: order.userId,
        status: 'REVIEW',
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
    cookies().set('reviewingOrderId', order.id, { path: '/', maxAge: 86400 });
    
    return { success: true };
  } catch (error: any) {
    console.error('startOrderReview error:', error);
    return { success: false, error: error.message };
  }
}

