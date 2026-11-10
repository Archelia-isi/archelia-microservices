'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getEffectiveDiscount } from '@/lib/discount';
import { addToCart } from './cart';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function duplicateOrderToCart(originalOrderUserId: string, items: { sku: string, quantity: number }[]) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  if (session.user.role === 'AGENT') {
    const targetUser = await prisma.b2BUser.findUnique({ where: { id: originalOrderUserId } });
    if (targetUser && targetUser.zucchettiCode) {
      const cookieOpts: any = { path: '/', maxAge: 86400 };
      if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';
      cookies().set('impersonatedClientCode', targetUser.zucchettiCode, cookieOpts);
      cookies().set('impersonatedClientDiscount', (targetUser.discount || 0).toString(), cookieOpts);
      cookies().set('impersonatedClientName', targetUser.companyName || '', cookieOpts);
    }
  }

  for (const item of items) {
    if (item.quantity > 0) {
      const res = await addToCart(item.sku, item.quantity);
      if (!res?.success) return { success: false, error: res?.error || 'Errore carrello' };
    }
  }
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createDraftFromOrder(originalOrderUserId: string, items: { sku: string, quantity: number, extraDiscount?: number }[], action: 'DRAFT' | 'APPROVED' = 'DRAFT') {
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

    let originalPrice =
      storeMode === 'ELMARK'
        ? Number(prod.price || 0)
        : Number(prod.price_b2b) > 0
          ? Number(prod.price_b2b)
          : Number(prod.price || 0);
    let basePrice = originalPrice;
    let appliedDiscount = 0;

    if (storeMode === 'ELMARK') {
      const dGroup = prod.discgroup || '';
      const groupDisc = elmarkDiscounts[dGroup] || 0;
      if (groupDisc > 0) {
        basePrice = basePrice * (1 - (groupDisc / 100));
        appliedDiscount = groupDisc;
      }
    } else {
      if (genericDiscount > 0) {
        basePrice = basePrice * (1 - (genericDiscount / 100));
        appliedDiscount = genericDiscount;
      }
    }

    // Apply extra discount if provided (cascade discount, e.g. 50+10%)
    let finalPrice = basePrice;
    const extraDisc = item.extraDiscount && item.extraDiscount > 0 ? Number(item.extraDiscount) : 0;
    if (extraDisc > 0) {
      finalPrice = finalPrice * (1 - (extraDisc / 100));
    }

    let discountStr: string | null = null;
    if (appliedDiscount > 0 && extraDisc > 0) {
      discountStr = `${appliedDiscount}+${extraDisc}%`;
    } else if (appliedDiscount > 0) {
      discountStr = `${appliedDiscount}%`;
    } else if (extraDisc > 0) {
      discountStr = `${extraDisc}%`;
    }
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
      status: action,
      storeMode: storeMode,
      totalAmount,
      totalIva,
      createdById: session.userId,
      items: {
        create: orderItemsData
      }
    }
  });

  if (action === 'APPROVED') {
    const { sendB2BOrderToZucchetti } = await import('@/lib/zucchettiOrders');
    const zRes = await sendB2BOrderToZucchetti(order.id);
    if (!zRes.success) {
      try {
        await prisma.b2BOrder.delete({ where: { id: order.id } });
      } catch {}
      return {
        success: false,
        error: `Errore invio ordine a Zucchetti: ${zRes.error || 'Impossibile registrare il documento su Zucchetti.'}`,
      };
    }
  }

  revalidatePath('/', 'layout');
  return { success: true, orderId: order.id };
}

export async function getPopulatedOrderDetails(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false };

  const order = await prisma.b2BOrder.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) return { success: false };
  
  const storeMode = (order.storeMode as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const targetUser = order.userId
    ? await prisma.b2BUser.findUnique({ where: { id: order.userId } })
    : null;
  const targetPromo = !targetUser && order.promoProspectId
    ? await prisma.b2BPromoProspect.findUnique({ where: { id: order.promoProspectId } })
    : null;
  let elmarkDiscounts: Record<string, number> = targetUser ? (targetUser.elmarkDiscounts as Record<string, number> || {}) : {};
  let genericDiscount = targetUser ? (targetUser.discount || 0) : targetPromo ? (targetPromo.discount || 0) : 0;

  const populatedItems = await Promise.all(order.items.map(async (item) => {
    const prod = await getProductById(item.sku) as any;
    
    let currentOriginalPrice = 0;
    let currentBasePrice = 0;
    let currentStdDisc = 0;
    
    if (prod) {
       currentOriginalPrice = Number(storeMode === 'ELMARK' ? prod.price : (prod.price_b2b || prod.price || 0));
       currentBasePrice = currentOriginalPrice;
       if (storeMode === 'ELMARK') {
         const dGroup = prod.discgroup || '';
         const groupDisc = elmarkDiscounts[dGroup] || 0;
         if (groupDisc > 0) {
           currentBasePrice = currentBasePrice * (1 - (groupDisc / 100));
           currentStdDisc = groupDisc;
         }
       } else {
         if (genericDiscount > 0) {
           currentBasePrice = currentBasePrice * (1 - (genericDiscount / 100));
           currentStdDisc = genericDiscount;
         }
       }
    }

    return {
      ...item,
      currentOriginalPrice,
      currentBasePrice,
      currentStdDisc,
      product: prod ? {
        title: prod.title || prod.original_name,
        imageUrl: prod.image_url || '/placeholder.png',
        stock: prod.stock || 0,
        unit: prod.unit || 'PZ'
      } : null
    };
  }));

  return { 
    success: true, 
    items: populatedItems,
    elmarkDiscounts,
    genericDiscount,
    storeMode,
    zucchettiOrderRef: order.zucchettiOrderRef || null,
    externalRef: `ORDINE WEB #${order.id.slice(-6).toUpperCase()}`,
  };
}

export async function updateZucchettiDocRefAction(
  orderId: string,
  docType: string,
  docNumInput: string
) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Non autorizzato' };

  const order = await prisma.b2BOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { success: false, error: 'Ordine non trovato' };

  const rawInput = String(docNumInput || '').trim();
  if (!rawInput) return { success: false, error: 'Inserisci un riferimento documento valido' };

  const cleanType = (docType || 'ORDCL').trim().toUpperCase();
  const defaultSerie = cleanType === 'ORDIC' ? 'OIC' : 'ST';
  let cleaned = rawInput.replace(/^n\.\s*/i, '').trim();
  if (/^\d+$/.test(cleaned)) {
    cleaned = `${cleaned}/${defaultSerie}`;
  } else if (cleaned.includes('/')) {
    const [nPart, sPart] = cleaned.split('/').map(s => s.trim());
    cleaned = `${nPart.replace(/^.*n\.\s*/i, '').trim()}/${sPart || defaultSerie}`;
  }
  const formattedRef = cleaned;

  await prisma.b2BOrderItem.updateMany({
    where: {
      orderId: order.id,
      ...(docType ? { zucchettiDocType: docType } : {}),
    },
    data: {
      zucchettiDocType: cleanType,
      zucchettiDocRef: formattedRef,
    },
  });

  const updatedItems = await prisma.b2BOrderItem.findMany({
    where: { orderId: order.id },
  });

  const distinctRefs = Array.from(
    new Set(updatedItems.map(it => it.zucchettiDocRef).filter(Boolean))
  );
  const combinedOrderRef =
    distinctRefs.length > 0 ? distinctRefs.join(' | ') : formattedRef;

  await prisma.b2BOrder.update({
    where: { id: order.id },
    data: {
      zucchettiOrderRef: combinedOrderRef,
    },
  });

  revalidatePath(`/account/orders/${order.id}`);
  revalidatePath('/account/orders');
  revalidatePath('/account/agent-completed');

  return {
    success: true,
    formattedRef,
    combinedOrderRef,
  };
}

export async function getPopulatedProductForReorder(sku: string, userId: string) {
  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const session = await verifySession();
  if (!session) return { success: false };

  const targetUser = await prisma.b2BUser.findUnique({ where: { id: userId } });
  let elmarkDiscounts: Record<string, number> = targetUser ? (targetUser.elmarkDiscounts as Record<string, number> || {}) : {};
  let genericDiscount = targetUser ? (targetUser.discount || 0) : 0;

  const prod = await getProductById(sku) as any;
  if (!prod) return { success: false, error: 'Prodotto non trovato' };

  let currentOriginalPrice = 0;
  let currentBasePrice = 0;
  let currentStdDisc = 0;
  
  currentOriginalPrice = Number(prod.price_b2b) > 0 ? Number(prod.price_b2b) : Number(prod.price || 0);
  currentBasePrice = currentOriginalPrice;
  if (storeMode === 'ELMARK') {
    const dGroup = prod.discgroup || '';
    const groupDisc = elmarkDiscounts[dGroup] || 0;
    if (groupDisc > 0) {
      currentBasePrice = currentBasePrice * (1 - (groupDisc / 100));
      currentStdDisc = groupDisc;
    }
  } else {
    if (genericDiscount > 0) {
      currentBasePrice = currentBasePrice * (1 - (genericDiscount / 100));
      currentStdDisc = genericDiscount;
    }
  }

  const populatedItem = {
    id: `quick_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    sku: prod.sku,
    quantity: 1, // default
    originalPrice: currentOriginalPrice,
    finalPrice: currentBasePrice,
    currentOriginalPrice,
    currentBasePrice,
    currentStdDisc,
    product: {
      title: prod.title || prod.original_name,
      imageUrl: prod.image_url || '/placeholder.png',
      stock: prod.stock || 0,
      unit: prod.unit || 'PZ'
    }
  };

  return { success: true, item: populatedItem };
}
