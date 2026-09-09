'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount, getExtraAgentDiscount } from '@/lib/discount';
import { cookies } from 'next/headers';
import { getTargetUserId, getCartQuery } from './cart';

export async function checkoutCart(action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART') {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const createdById = session.userId;
    const cartQuery = await getCartQuery();

    const cart = await prisma.b2BCart.findFirst({
      where: { userId: targetUserId, ...cartQuery },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, error: 'Il carrello è vuoto' };
    }

    // Calculate final prices and totals
    const genericDiscount = await getEffectiveDiscount();
    const extraDiscount = await getExtraAgentDiscount();
    
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const p = await getProductById(item.sku) as any;
      if (!p) continue;

      let originalPrice = Number(p.price || 0);
      let finalPrice = originalPrice;
      
      if (genericDiscount > 0) {
        finalPrice = finalPrice * (1 - (genericDiscount / 100));
      } else if (Number(p.price_b2b) > 0) {
        finalPrice = Number(p.price_b2b);
      }

      if (item.extraDiscount && item.extraDiscount > 0) {
        finalPrice = finalPrice * (1 - (item.extraDiscount / 100));
      }

      totalAmount += finalPrice * item.quantity;
      
      orderItemsData.push({
        sku: item.sku,
        quantity: item.quantity,
        originalPrice,
        finalPrice,
        discountApplied: genericDiscount + extraDiscount // Just a raw stat
      });
    }

    if (orderItemsData.length === 0) {
      return { success: false, error: 'Nessun prodotto valido nel carrello' };
    }

    // Determine Status
    let orderStatus: 'DRAFT' | 'PENDING_AGENT_REVIEW' | 'APPROVED' = 'DRAFT';
    
    if (session.user.role === 'AGENT') {
      if (action === 'PAUSE_CART') {
        orderStatus = 'DRAFT'; // Preventivo in pausa
        // TODO: Send Email Notification to Customer
      } else {
        orderStatus = 'APPROVED'; // Agente approva direttamente e manderà a Zucchetti
      }
    } else {
      // It's a normal user. Orders must be reviewed by the agent first.
      orderStatus = 'PENDING_AGENT_REVIEW';
    }

    // Create Order
    const order = await prisma.b2BOrder.create({
      data: {
        userId: targetUserId,
        createdById: createdById,
        status: orderStatus,
        totalAmount,
        totalIva: totalAmount * 0.22,
        items: {
          create: orderItemsData
        }
      }
    });

    // Mark Cart as CHECKOUT_PENDING or delete it
    await prisma.b2BCart.update({
      where: { id: cart.id },
      data: { status: 'COMPLETED' }
    });

    // Se stavamo revisionando un ordine, cancelliamo quello vecchio e puliamo il cookie
    if (cart.linkedOrderId) {
      try {
        await prisma.b2BOrder.delete({ where: { id: cart.linkedOrderId } });
      } catch (e) {
        console.error('Failed to delete old reviewed order', e);
      }
      cookies().delete('reviewingOrderId');
    }

    // If orderStatus === 'APPROVED', we should push to Redis/Worker to send to Zucchetti. 
    // This will be handled by a queue later.

    revalidatePath('/cart');
    revalidatePath('/dashboard'); // or wherever orders live

    return { success: true, orderId: order.id, status: orderStatus };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { success: false, error: 'Errore durante il checkout' };
  }
}
