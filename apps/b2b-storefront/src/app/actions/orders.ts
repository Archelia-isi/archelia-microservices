'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount } from '@/lib/discount';
import { addToCart } from './cart';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function duplicateOrderToCart(items: { sku: string, quantity: number }[]) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  for (const item of items) {
    if (item.quantity > 0) {
      const res = await addToCart(item.sku, item.quantity);
      if (!res?.success) return { success: false, error: res?.error || 'Errore carrello' };
    }
  }
  revalidatePath('/cart');
  return { success: true };
}

export async function createDraftFromOrder(originalOrderUserId: string, items: { sku: string, quantity: number }[]) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return { success: false, error: 'Solo per agenti' };

  const targetUser = await prisma.b2BUser.findUnique({ where: { id: originalOrderUserId } });
  if (!targetUser) return { success: false, error: 'Utente non trovato' };

  let elmarkDiscounts: Record<string, number> = (targetUser.elmarkDiscounts as Record<string, number>) || {};
  let genericDiscount = targetUser.discount || 0;

  // Calculate prices
  let totalAmount = 0;
  let totalIva = 0;
  const orderItemsData = [];

  for (const item of items) {
    if (item.quantity <= 0) continue;
    const prod: any = await getProductById(item.sku);
    if (!prod) return { success: false, error: `Prodotto ${item.sku} non trovato` };

    let originalPrice = Number(prod.price_b2b) > 0 ? Number(prod.price_b2b) : Number(prod.price || 0);
    let basePrice = originalPrice;
    let appliedDiscount = 0;
    let discountStr = null;

    if (storeMode === 'ELMARK') {
      const dGroup = prod.discgroup || '';
      const groupDisc = elmarkDiscounts[dGroup] || 0;
      if (groupDisc > 0) {
        basePrice = basePrice * (1 - (groupDisc / 100));
        appliedDiscount = groupDisc;
        discountStr = `-${groupDisc}%`;
      }
    } else {
      if (genericDiscount > 0) {
        basePrice = basePrice * (1 - (genericDiscount / 100));
        appliedDiscount = genericDiscount;
        discountStr = `-${genericDiscount}%`;
      }
    }
    
    // NO EXTRA DISCOUNT as requested by user
    const finalPrice = basePrice;
    const lineTotal = finalPrice * item.quantity;
    const lineIva = lineTotal * 0.22; // Hardcoded 22% for simplicity
    
    totalAmount += lineTotal;
    totalIva += lineIva;

    orderItemsData.push({
      sku: item.sku,
      quantity: item.quantity,
      originalPrice,
      finalPrice,
      discountString: discountStr
    });
  }

  const order = await prisma.b2BOrder.create({
    data: {
      userId: originalOrderUserId,
      status: 'DRAFT',
      totalAmount,
      totalIva,
      createdById: session.userId,
      items: {
        create: orderItemsData
      }
    }
  });

  revalidatePath('/account/agent-completed');
  revalidatePath('/account/agent-orders');
  return { success: true, orderId: order.id };
}
