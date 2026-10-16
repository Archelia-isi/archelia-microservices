'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount } from '@/lib/discount';
import { getTargetUserId } from './cart';
import { cookies } from 'next/headers';
import { isOrderLockedForUser } from './orderLock';
import { redis } from '@/lib/redis';
import { getAvailableStock } from '@/lib/stock';
import { parseSavedOrderStockMeta, serializeSavedOrderNotes } from '@/lib/savedOrdersStock';
import { syncSavedOrdersStockForUser } from './savedOrderStock';

export async function deleteSentOrder(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'Impossibile eliminare l\'ordine: l\'agente lo sta attualmente revisionando.' };
    }

    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== targetUserId) {
      return { success: false, error: 'Ordine non trovato' };
    }
    
    if (order.status !== 'PENDING_AGENT_REVIEW' && !(order.status === 'DRAFT' && order.createdById === targetUserId)) {
      return { success: false, error: 'Questo ordine non può essere eliminato' };
    }

    await prisma.b2BOrder.delete({ where: { id: orderId } });
    try {
      await redis.del(`b2b_order_lock:${orderId}`);
    } catch (e) {}

    revalidatePath('/account/sent-orders');
    revalidatePath('/account/saved-orders');
    revalidatePath('/account/quotes');
    revalidatePath('/account');
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
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'Impossibile modificare l\'ordine: l\'agente lo sta attualmente revisionando.' };
    }

    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ 
      where: { id: orderId },
      include: { items: true } 
    });
    
    if (!order || order.userId !== targetUserId) {
      return { success: false, error: 'Ordine non trovato' };
    }
    
    if (order.status !== 'PENDING_AGENT_REVIEW' && !(order.status === 'DRAFT' && order.createdById === targetUserId)) {
      return { success: false, error: 'Non puoi modificare questo ordine' };
    }

    const product = await getProductById(sku) as any;
    if (!product) {
      return { success: false, error: 'Prodotto non trovato' };
    }

    const existingItem = order.items.find(i => i.sku.toUpperCase() === sku.toUpperCase());
    const existingQty = existingItem ? existingItem.quantity : 0;
    const maxStock = getAvailableStock(product, (order.storeMode as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI');
    if (existingQty + quantity > maxStock) {
      return {
        success: false,
        stockExceeded: true,
        maxStock,
        existingQty,
        error: existingQty > 0
          ? `Giacenza superata (disp. max: ${maxStock} pz, già ${existingQty} nell'ordine)`
          : `Giacenza superata (disp. max: ${maxStock} pz)`
      };
    }
    
    let stdDisc = 0;
    let extDisc = 0;

    if (order.storeMode === 'ZUCCHETTI') {
      stdDisc = await getEffectiveDiscount();
      if (session.user.role === 'AGENT') {
        const cookieVal = cookies().get('agentExtraDiscount')?.value;
        if (cookieVal) extDisc = parseFloat(cookieVal) || 0;
      }
    } else {
      const user = await prisma.b2BUser.findUnique({ where: { id: targetUserId }, select: { elmarkDiscounts: true } });
      const discMap = user?.elmarkDiscounts as any || {};
      const elmarkCode = product.elmarkCode;
      const grp = elmarkCode ? elmarkCode.split('.')[0] : null;
      stdDisc = grp && discMap[grp] ? parseFloat(discMap[grp]) : 0;
    }

    let originalPrice = Number(order.storeMode === 'ELMARK' ? product.price : (product.price_b2b || product.price || 0));
    let finalPrice = originalPrice;
    
    if (stdDisc > 0) finalPrice = finalPrice * (1 - (stdDisc / 100));
    if (extDisc > 0) finalPrice = finalPrice * (1 - (extDisc / 100));

    let dStr = stdDisc > 0 ? `${stdDisc}%` : '';
    if (extDisc > 0) dStr += (dStr ? ` + ${extDisc}% Extra` : `${extDisc}% Extra`);

    const finalItemQty = existingQty + quantity;
    if (existingItem) {
      await prisma.b2BOrderItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: finalItemQty,
          originalPrice,
          finalPrice,
          discountString: dStr || null
        }
      });
    } else {
      await prisma.b2BOrderItem.create({
        data: {
          orderId,
          sku: product.sku,
          quantity: finalItemQty,
          originalPrice,
          finalPrice,
          discountString: dStr || null
        }
      });
    }

    const updatedOrder = await prisma.b2BOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (updatedOrder) {
      const totalAmount = updatedOrder.items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
      let updatedNotes = updatedOrder.notes;
      if (updatedOrder.status === 'DRAFT' && updatedOrder.createdById === targetUserId) {
        const { cleanNotes, meta } = parseSavedOrderStockMeta(updatedOrder.notes);
        const skuKey = product.sku.toUpperCase();
        meta.origQty[skuKey] = finalItemQty;
        delete meta.adjusted[skuKey];
        updatedNotes = serializeSavedOrderNotes(cleanNotes, meta);
      }

      await prisma.b2BOrder.update({
        where: { id: orderId },
        data: {
          totalAmount,
          totalIva: totalAmount * 0.22,
          notes: updatedNotes
        }
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account/saved-orders');
    revalidatePath('/account');
    return { success: true };
  } catch (error: any) {
    console.error('Quick add to order error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'Impossibile modificare l\'ordine: l\'agente lo sta attualmente revisionando.' };
    }

    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.userId !== targetUserId) return { success: false, error: 'Ordine non trovato' };
    if (order.status !== 'PENDING_AGENT_REVIEW' && !(order.status === 'DRAFT' && order.createdById === targetUserId)) return { success: false, error: 'Ordine non modificabile' };

    const removedItem = order.items.find(i => i.id === itemId);
    await prisma.b2BOrderItem.delete({ where: { id: itemId } });

    // Recalculate totals
    const updatedOrder = await prisma.b2BOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (updatedOrder) {
      const totalAmount = updatedOrder.items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
      let updatedNotes = updatedOrder.notes;
      if (updatedOrder.status === 'DRAFT' && updatedOrder.createdById === targetUserId && removedItem) {
        const { cleanNotes, meta } = parseSavedOrderStockMeta(updatedOrder.notes);
        const skuKey = removedItem.sku.toUpperCase();
        delete meta.origQty[skuKey];
        delete meta.adjusted[skuKey];
        updatedNotes = serializeSavedOrderNotes(cleanNotes, meta);
      }

      await prisma.b2BOrder.update({
        where: { id: orderId },
        data: { totalAmount, totalIva: totalAmount * 0.22, notes: updatedNotes }
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account/saved-orders');
    revalidatePath('/account');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateOrderItemQuantity(orderId: string, itemId: string, quantity: number) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };
  if (quantity < 1) return { success: false, error: 'Quantità non valida' };

  try {
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'Impossibile modificare l\'ordine: l\'agente lo sta attualmente revisionando.' };
    }

    const targetUserId = await getTargetUserId(session);
    const order = await prisma.b2BOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.userId !== targetUserId) return { success: false, error: 'Ordine non trovato' };
    if (order.status !== 'PENDING_AGENT_REVIEW' && !(order.status === 'DRAFT' && order.createdById === targetUserId)) return { success: false, error: 'Ordine non modificabile' };

    const targetItem = order.items.find(i => i.id === itemId);
    if (targetItem) {
      const product = await getProductById(targetItem.sku) as any;
      if (product) {
        const maxStock = getAvailableStock(product, (order.storeMode as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI');
        if (quantity > maxStock) {
          return {
            success: false,
            stockExceeded: true,
            maxStock,
            error: `Giacenza superata (disp. max: ${maxStock} pz)`
          };
        }
      }
    }

    await prisma.b2BOrderItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    const updatedOrder = await prisma.b2BOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (updatedOrder) {
      const totalAmount = updatedOrder.items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
      let updatedNotes = updatedOrder.notes;
      if (updatedOrder.status === 'DRAFT' && updatedOrder.createdById === targetUserId && targetItem) {
        const { cleanNotes, meta } = parseSavedOrderStockMeta(updatedOrder.notes);
        const skuKey = targetItem.sku.toUpperCase();
        meta.origQty[skuKey] = quantity;
        delete meta.adjusted[skuKey];
        updatedNotes = serializeSavedOrderNotes(cleanNotes, meta);
      }

      await prisma.b2BOrder.update({
        where: { id: orderId },
        data: { totalAmount, totalIva: totalAmount * 0.22, notes: updatedNotes }
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account/saved-orders');
    revalidatePath('/account');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function sendSavedOrder(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  try {
    const locked = await isOrderLockedForUser(orderId, session.userId, session.user.role);
    if (locked) {
      return { success: false, error: 'Impossibile inviare l\'ordine: l\'agente lo sta attualmente revisionando.' };
    }

    const targetUserId = await getTargetUserId(session);
    // Sync stock before sending
    await syncSavedOrdersStockForUser(targetUserId);

    const order = await prisma.b2BOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.userId !== targetUserId) {
      return { success: false, error: 'Ordine non trovato' };
    }

    if (order.status !== 'DRAFT') {
      return { success: false, error: 'Solo gli ordini salvati possono essere inviati' };
    }

    const validItems = order.items.filter(i => i.quantity > 0);
    if (validItems.length === 0) {
      return { success: false, error: 'Impossibile inviare l\'ordine: tutti i prodotti nell\'ordine sono attualmente esauriti.' };
    }

    // Remove 0-qty items before converting to sent order
    const zeroItems = order.items.filter(i => i.quantity <= 0);
    for (const zi of zeroItems) {
      await prisma.b2BOrderItem.delete({ where: { id: zi.id } });
    }

    const totalAmount = validItems.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);

    await prisma.b2BOrder.update({
      where: { id: orderId },
      data: { 
        status: 'PENDING_AGENT_REVIEW',
        totalAmount,
        totalIva: totalAmount * 0.22,
        notes: order.storeMode === 'ELMARK' ? 'ORDINE ELMARK - Inviato da ordini salvati' : 'Inviato da ordini salvati'
      }
    });

    revalidatePath('/account/saved-orders');
    revalidatePath('/account/sent-orders');
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account');
    return { success: true };
  } catch (error: any) {
    console.error('Send saved order error:', error);
    return { success: false, error: error.message };
  }
}
