'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount, getExtraAgentDiscount } from '@/lib/discount';
import { cookies } from 'next/headers';
import { getTargetUserId, getCartQuery } from './cart';
import { redis } from '@/lib/redis';
import { serializeSavedOrderNotes } from '@/lib/savedOrdersStock';

export async function checkoutCart(action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART' | 'SAVE_ORDER') {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const createdById = session.userId;
    const cartQuery = await getCartQuery();

    const { getCart } = await import('@/lib/cart');
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    if (!cart || !cart.items || cart.items.length === 0) {
      return { success: false, error: 'Il carrello è vuoto' };
    }

    // Calculate final prices and totals
    let genericDiscount = 0;
    if (cartType === 'ZUCCHETTI') {
       genericDiscount = await getEffectiveDiscount();
    }
    
    // For Elmark, we need the user's elmarkDiscounts
    let elmarkDiscounts: any = {};
    if (cartType === 'ELMARK') {
       const user = await prisma.b2BUser.findUnique({ where: { id: targetUserId }, select: { elmarkDiscounts: true } });
       elmarkDiscounts = user?.elmarkDiscounts || {};
    }
    
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const p = await getProductById(item.sku) as any;
      if (!p) continue;

      let originalPrice = Number(cartType === 'ELMARK' ? p.price : (p.price_b2b || p.price || 0));
      let finalPrice = originalPrice;
      
      let stdDisc = 0;
      let extDisc = 0;

      if (cartType === 'ZUCCHETTI') {
        stdDisc = genericDiscount || 0;
        extDisc = item.extraDiscount || 0;
        if (stdDisc > 0) {
          finalPrice = finalPrice * (1 - (stdDisc / 100));
        }
        if (extDisc > 0) {
          finalPrice = finalPrice * (1 - (extDisc / 100));
        }
      } else if (cartType === 'ELMARK') {
        const discGroup = p.discgroup;
        stdDisc = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
        if (stdDisc > 0) {
          finalPrice = finalPrice * (1 - (stdDisc / 100));
        }
      }

      let dStr = stdDisc > 0 ? `${stdDisc}%` : '';
      if (extDisc > 0) dStr += (dStr ? ` + ${extDisc}% Extra` : `${extDisc}% Extra`);

      totalAmount += finalPrice * item.quantity;
      
      orderItemsData.push({
        sku: item.sku,
        quantity: item.quantity,
        originalPrice,
        finalPrice,
        discountString: dStr || null
      });
    }

    if (orderItemsData.length === 0) {
      return { success: false, error: 'Nessun prodotto valido nel carrello' };
    }

    // Determine Status
    let orderStatus: 'DRAFT' | 'PENDING_AGENT_REVIEW' | 'APPROVED' = 'DRAFT';
    let orderNotes = '';
    
    if (session.user.role === 'AGENT') {
      if (action === 'PAUSE_CART') {
        orderStatus = 'DRAFT'; // Preventivo in pausa
        orderNotes = cartType === 'ELMARK' ? 'ORDINE ELMARK - Preventivo in pausa' : 'Preventivo in pausa';
      } else {
        orderStatus = 'APPROVED'; // Agente approva direttamente e manderà a Zucchetti
        orderNotes = cartType === 'ELMARK' ? 'ORDINE ELMARK - Approvato' : 'Approvato dall\'agente';
      }
    } else {
      if (action === 'SAVE_ORDER') {
        orderStatus = 'DRAFT'; // Ordine salvato dal cliente
        const baseNotes = cartType === 'ELMARK' ? 'ORDINE ELMARK - Salvato dal cliente' : 'Ordine salvato dal cliente';
        const origQty: Record<string, number> = {};
        for (const item of orderItemsData) {
          origQty[item.sku.toUpperCase()] = item.quantity;
        }
        orderNotes = serializeSavedOrderNotes(baseNotes, { origQty, adjusted: {} });
      } else {
        // It's a normal user. Orders must be reviewed by the agent first.
        orderStatus = 'PENDING_AGENT_REVIEW';
        orderNotes = cartType === 'ELMARK' ? 'ORDINE ELMARK - Inviato per revisione' : 'Inviato per revisione agente';
      }
    }

    // Create Order
    const order = await prisma.b2BOrder.create({
      data: {
        userId: targetUserId,
        createdById: createdById,
        status: orderStatus,
        storeMode: storeMode,
        totalAmount,
        totalIva: totalAmount * 0.22,
        notes: orderNotes,
        items: {
          create: orderItemsData
        }
      }
    });

    // Mark Cart as CHECKOUT_PENDING or delete it
    try {
      await prisma.b2BCart.update({
        where: { id: cart.id },
        data: { status: 'COMPLETED' }
      });
    } catch (e) {
      console.warn('Could not update cart in DB (already deleted or out of sync)', e);
    }

    // Se stavamo revisionando un ordine, cancelliamo quello vecchio e puliamo il cookie
    if (cart.linkedOrderId) {
      try {
        await prisma.b2BOrder.delete({ where: { id: cart.linkedOrderId } });
      } catch (e) {
        console.error('Failed to delete old reviewed order', e);
      }
      try {
        await prisma.b2BCart.deleteMany({
          where: { linkedOrderId: cart.linkedOrderId, status: 'REVIEW' }
        });
      } catch (e) {}
      try {
        await redis.del(`b2b_order_lock:${cart.linkedOrderId}`);
      } catch (e) {}
    }

    // Clear Redis Cart
    const redisKey = cartQuery.status === 'REVIEW' 
      ? `b2b_cart_v2:${targetUserId}:REVIEW:${cartQuery.linkedOrderId}:${storeMode}`
      : `b2b_cart_v2:${targetUserId}:ACTIVE:${storeMode}`;
    try {
      await redis.del(redisKey);
    } catch (e) {
      console.error('Failed to clear redis cart', e);
    }

    // Quando l'agente conclude il vaglio/ordine (Invia o Metti in Pausa), disattiviamo l'impersonificazione e il vaglio
    if (session.user.role === 'AGENT') {
      const cookieStore = cookies();
      const cookieNames = [
        'reviewingOrderId',
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
    }

    // If orderStatus === 'APPROVED', we should push to Redis/Worker to send to Zucchetti. 
    // This will be handled by a queue later.

    revalidatePath('/', 'layout');
    revalidatePath('/cart');
    revalidatePath('/account/saved-orders');
    revalidatePath('/account/sent-orders');
    revalidatePath('/account/quotes');
    revalidatePath('/account/agent-orders');
    revalidatePath('/account/agent-completed');
    revalidatePath('/account');

    return { success: true, orderId: order.id, status: orderStatus, storeMode: order.storeMode };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { success: false, error: 'Errore durante il checkout: ' + error.message };
  }
}
