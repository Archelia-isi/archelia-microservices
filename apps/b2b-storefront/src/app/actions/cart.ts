'use server';

import { getCart, saveCart, clearCart } from '@/lib/cart';
import { revalidatePath } from 'next/cache';
import { prisma } from '@archelia/b2b-database';
import { verifySession } from '@/lib/session';

export async function addToCart(formData: FormData) {
  const sku = formData.get('sku') as string;
  const quantity = parseInt((formData.get('quantity') as string) || '1', 10);

  if (!sku || quantity <= 0) return { error: 'Dati non validi' };

  const cart = await getCart();
  const existingItem = cart.items.find(item => item.sku === sku);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ sku, quantity });
  }

  await saveCart(cart);
  revalidatePath('/catalog');
  revalidatePath('/cart');
}

export async function removeFromCart(sku: string) {
  const cart = await getCart();
  cart.items = cart.items.filter(item => item.sku !== sku);
  await saveCart(cart);
  revalidatePath('/cart');
}

export async function checkout() {
  const session = await verifySession();
  if (!session) return { error: 'Devi essere loggato.' };

  const cart = await getCart();
  if (cart.items.length === 0) return { error: 'Il carrello è vuoto.' };

  // Convert temporary Redis cart to persistent Neon Cart
  const dbCart = await prisma.b2BCart.create({
    data: {
      userId: session.userId,
      status: 'CHECKOUT_PENDING',
      items: {
        create: cart.items.map(item => ({
          sku: item.sku,
          quantity: item.quantity
        }))
      }
    }
  });

  // Puliamo il carrello temporaneo Redis
  await clearCart();
  revalidatePath('/cart');
  
  return { success: true, cartId: dbCart.id };
}
