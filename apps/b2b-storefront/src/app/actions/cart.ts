'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';

export async function addToCart(sku: string, quantity: number) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Non autorizzato' };
  }

  try {
    // Trova il carrello attivo dell'utente, oppure crealo
    let cart = await prisma.b2BCart.findFirst({
      where: { userId: session.userId, status: 'ACTIVE' },
    });

    if (!cart) {
      cart = await prisma.b2BCart.create({
        data: { userId: session.userId, status: 'ACTIVE' },
      });
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
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.b2BCartItem.create({
        data: {
          cartId: cart.id,
          sku: sku,
          quantity: quantity,
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

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const session = await verifySession();
  if (!session) return { success: false };

  if (quantity <= 0) {
    await prisma.b2BCartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.b2BCartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  revalidatePath('/cart');
  return { success: true };
}

export async function removeFromCart(itemId: string) {
  const session = await verifySession();
  if (!session) return { success: false };

  await prisma.b2BCartItem.delete({ where: { id: itemId } });
  
  revalidatePath('/cart');
  return { success: true };
}
