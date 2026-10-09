'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount } from '@/lib/discount';
import { getTargetUserId } from './cart';
import { cookies } from 'next/headers';

export async function deleteSentOrder(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== targetUserId) {
      return { success: false, error: 'Ordine non trovato' };
    }
    
    if (order.status !== 'PENDING_AGENT_REVIEW') {
      return { success: false, error: 'Solo gli ordini inviati in attesa possono essere eliminati' };
    }

    await prisma.b2BOrder.delete({ where: { id: orderId } });
    revalidatePath('/account/sent-orders');
    return { success: true };
  } catch (error: any) {
    console.error('Delete order error:', error);
    return { success: false, error: error.message };
  }
}

export async function addQuickItemToOrder(orderId: string, sku: string, quantity: number) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  if (quantity <= 0) return { success: false, error: 'Quantità non valida' };

  try {
    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ 
      where: { id: orderId },
      include: { items: true } 
    });
    
    if (!order || order.userId !== targetUserId) {
      return { success: false, error: 'Ordine non trovato' };
    }
    
    if (order.status !== 'PENDING_AGENT_REVIEW') {
      return { success: false, error: 'Non puoi modificare questo ordine' };
    }

    const product = await getProductById(sku) as any;
    if (!product) {
      return { success: false, error: 'Prodotto non trovato' };
    }

    const existingItem = order.items.find(i => i.sku.toUpperCase() === sku.toUpperCase());
    
    let discount = 0;
    if (order.storeMode === 'ZUCCHETTI') {
      discount = await getEffectiveDiscount();
    } else {
      const user = await prisma.b2BUser.findUnique({ where: { id: targetUserId }, select: { elmarkDiscounts: true } });
      const discMap = user?.elmarkDiscounts as any || {};
      const elmarkCode = product.elmarkCode;
      const grp = elmarkCode ? elmarkCode.split('.')[0] : null;
      discount = grp && discMap[grp] ? parseFloat(discMap[grp]) : 0;
    }

    const originalPrice = product.price || 0;
    const finalPrice = originalPrice * (1 - discount / 100);

    if (existingItem) {
      await prisma.b2BOrderItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: existingItem.quantity + quantity,
          originalPrice,
          finalPrice,
          discountString: discount > 0 ? `${discount}` : null
        }
      });
    } else {
      await prisma.b2BOrderItem.create({
        data: {
          orderId,
          sku: product.sku,
          quantity,
          originalPrice,
          finalPrice,
          discountString: discount > 0 ? `${discount}` : null
        }
      });
    }

    const updatedOrder = await prisma.b2BOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (updatedOrder) {
      const totalAmount = updatedOrder.items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
      await prisma.b2BOrder.update({
        where: { id: orderId },
        data: {
          totalAmount,
          totalIva: totalAmount * 0.22
        }
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Quick add to order error:', error);
    return { success: false, error: error.message };
  }
}
