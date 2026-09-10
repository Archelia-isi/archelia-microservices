'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function getTargetUserId(session: any) {
  if (session.user.role === 'AGENT') {
    const impersonatedCode = cookies().get('impersonatedClientCode')?.value;
    if (impersonatedCode) {
      const client = await prisma.b2BUser.findUnique({ where: { zucchettiCode: impersonatedCode } });
      if (client) return client.id;
    }
  }
  return session.userId;
}

export async function getCartQuery() {
  const reviewOrderId = cookies().get('reviewingOrderId')?.value;
  if (reviewOrderId) {
    return { status: 'REVIEW' as const, linkedOrderId: reviewOrderId };
  }
  return { status: 'ACTIVE' as const };
}

export async function addToCart(sku: string, quantity: number) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Non autorizzato' };
  }

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();

    // Trova il carrello attivo (o di revisione)
    let cart = await prisma.b2BCart.findFirst({
      where: { userId: targetUserId, ...cartQuery },
    });

    if (!cart) {
      cart = await prisma.b2BCart.create({
        data: { userId: targetUserId, ...cartQuery },
      });
    }

    // Leggi l'eventuale extra sconto dall'agente per i nuovi prodotti
    let agentExtraDiscount = 0;
    if (session.user.role === 'AGENT') {
      const cookieVal = cookies().get('agentExtraDiscount')?.value;
      if (cookieVal) {
        agentExtraDiscount = parseFloat(cookieVal) || 0;
      }
    }

    // Controlla se l'articolo è già nel carrello
    const existingItem = await prisma.b2BCartItem.findUnique({
      where: {
        cartId_sku: {
          cartId: cart.id,
          sku: sku,
        },
      },
    });

    if (existingItem) {
      await prisma.b2BCartItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: existingItem.quantity + quantity,
          // Se è l'agente che aggiunge, aggiorniamo lo sconto extra? O lo lasciamo com'è?
          // Lasciamo l'extra sconto esistente, per sicurezza.
        },
      });
    } else {
      await prisma.b2BCartItem.create({
        data: {
          cartId: cart.id,
          sku: sku,
          quantity: quantity,
          extraDiscount: agentExtraDiscount,
          extraDiscountMinQty: agentExtraDiscount > 0 ? quantity : null,
        },
      });
    }

    revalidatePath('/cart');
    revalidatePath('/catalog');
    
    return { success: true };
  } catch (error: any) {
    console.error('Cart action error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number, resetExtraDiscount: boolean = false) {
  const session = await verifySession();
  if (!session) return { success: false };

  if (quantity <= 0) {
    await prisma.b2BCartItem.delete({ where: { id: itemId } });
  } else {
    const dataToUpdate: any = { quantity };
    if (resetExtraDiscount) {
      dataToUpdate.extraDiscount = 0;
      dataToUpdate.extraDiscountMinQty = null;
    }
    
    await prisma.b2BCartItem.update({
      where: { id: itemId },
      data: dataToUpdate,
    });
  }

  revalidatePath('/cart');
  return { success: true };
}

export async function updateCartItemExtraDiscount(itemId: string, discount: number) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return { success: false, error: 'Non autorizzato' };

  const item = await prisma.b2BCartItem.findUnique({ where: { id: itemId } });
  if (!item) return { success: false };

  await prisma.b2BCartItem.update({
    where: { id: itemId },
    data: { 
      extraDiscount: discount >= 0 ? discount : 0,
      extraDiscountMinQty: discount > 0 ? item.quantity : null
    },
  });

  revalidatePath('/cart');
  return { success: true };
}

export async function massUpdateCartExtraDiscount(discount: number) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    
    const cart = await prisma.b2BCart.findFirst({
      where: { userId: targetUserId, ...cartQuery },
      include: { items: true },
    });

    if (cart && cart.items.length > 0) {
      // Dobbiamo ciclare per impostare il minQty alla quantità attuale di ogni singolo prodotto
      for (const item of cart.items) {
        await prisma.b2BCartItem.update({
          where: { id: item.id },
          data: { 
            extraDiscount: discount >= 0 ? discount : 0,
            extraDiscountMinQty: discount > 0 ? item.quantity : null
          },
        });
      }
    }

    revalidatePath('/cart');
    return { success: true };
  } catch (error: any) {
    console.error('massUpdate error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeFromCart(itemId: string) {
  const session = await verifySession();
  if (!session) return { success: false };

  await prisma.b2BCartItem.delete({ where: { id: itemId } });
  
  revalidatePath('/cart');
  return { success: true };
}

export async function acceptDraftOrder(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const order = await prisma.b2BOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) return { success: false, error: 'Ordine non trovato' };
    if (order.status !== 'DRAFT') return { success: false, error: 'L\'ordine non è un preventivo' };
    if (order.userId !== session.userId) return { success: false, error: 'Non autorizzato' };

    // Set order status to APPROVED (direct approval by the client)
    await prisma.b2BOrder.update({
      where: { id: orderId },
      data: { status: 'APPROVED' }
    });

    revalidatePath('/account/orders');
    return { success: true };
  } catch (error: any) {
    console.error('acceptDraftOrder error:', error);
    return { success: false, error: error.message };
  }
}

