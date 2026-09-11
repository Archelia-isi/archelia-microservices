'use server';

import { verifySession } from '@/lib/session';
import { getCart, saveCartToRedis, generateItemId, RedisCart } from '@/lib/cart';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";


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
  return { status: 'ACTIVE' as const, linkedOrderId: undefined };
}

export async function addToCart(sku: string, quantity: number) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Non autorizzato' };
  }

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    
    // Read from Redis (fallback to Postgres if missing)
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    // Read possible extra discount for agents
    let agentExtraDiscount = 0;
    if (session.user.role === 'AGENT') {
      const cookieVal = cookies().get('agentExtraDiscount')?.value;
      if (cookieVal) {
        agentExtraDiscount = parseFloat(cookieVal) || 0;
      }
    }

    const existingItemIndex = cart.items.findIndex(i => i.sku === sku);

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        id: generateItemId(),
        sku: sku,
        quantity: quantity,
        extraDiscount: agentExtraDiscount > 0 ? agentExtraDiscount : null,
        extraDiscountMinQty: agentExtraDiscount > 0 ? quantity : null
      });
    }

    // Save to Redis and trigger background sync
    await saveCartToRedis(cart);
    revalidatePath('/cart');
    return { success: true, cartItemCount: cart.items.length };
  } catch (error: any) {
    console.error('Cart action error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number, resetExtraDiscount: boolean = false) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session) return { success: false };

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      const itemIndex = cart.items.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        cart.items[itemIndex].quantity = quantity;
        if (resetExtraDiscount) {
          cart.items[itemIndex].extraDiscount = null;
          cart.items[itemIndex].extraDiscountMinQty = null;
        }
      }
    }

    await saveCartToRedis(cart);
    revalidatePath('/cart');
    return { success: true };
  } catch (error: any) {
    console.error('Update quantity error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCartItemExtraDiscount(itemId: string, discount: number) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    const itemIndex = cart.items.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      cart.items[itemIndex].extraDiscount = discount > 0 ? discount : null;
      cart.items[itemIndex].extraDiscountMinQty = discount > 0 ? cart.items[itemIndex].quantity : null;
      await saveCartToRedis(cart);
    revalidatePath('/cart');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update discount error:', error);
    return { success: false, error: error.message };
  }
}

export async function massUpdateCartExtraDiscount(discount: number) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    if (cart.items.length > 0) {
      for (const item of cart.items) {
        item.extraDiscount = discount > 0 ? discount : null;
        item.extraDiscountMinQty = discount > 0 ? item.quantity : null;
      }
      await saveCartToRedis(cart);
    revalidatePath('/cart');
    }

    return { success: true };
  } catch (error: any) {
    console.error('massUpdate error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeFromCart(itemId: string) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const cartType = storeMode;
  const session = await verifySession();
  if (!session) return { success: false };

  try {
    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();
    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);

    cart.items = cart.items.filter(i => i.id !== itemId);
    await saveCartToRedis(cart);
    revalidatePath('/cart');

    return { success: true };
  } catch (error: any) {
    console.error('Remove item error:', error);
    return { success: false, error: error.message };
  }
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

    await prisma.b2BOrder.update({
      where: { id: orderId },
      data: { status: 'APPROVED' }
    });

    return { success: true };
  } catch (error: any) {
    console.error('acceptDraftOrder error:', error);
    return { success: false, error: error.message };
  }
}
