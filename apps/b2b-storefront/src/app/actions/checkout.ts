'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { getProductById } from '@archelia/typesense/dist/search.js';
import {
  getEffectiveClientDiscountContext,
  evaluateTypesenseProductWithContext,
} from '@/lib/discount';
import { cookies } from 'next/headers';
import { getTargetUserId, getCartQuery } from './cart';
import { redis } from '@/lib/redis';
import { serializeSavedOrderNotes } from '@/lib/savedOrdersStock';
import {
  PromoProspectBillingInput,
  isPromoProspectBillingComplete,
  validateAndSavePromoProspectBillingData,
  promotePromoProspectToActiveUserOnOrderApproval,
} from './promoProspects';

export async function checkoutCart(
  action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART' | 'SAVE_ORDER',
  billingData?: PromoProspectBillingInput
): Promise<{
  success: boolean;
  error?: string;
  requiresBillingData?: boolean;
  orderId?: string;
  status?: string;
  storeMode?: string;
  promotedZucchettiCode?: string;
}> {
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

    // Verifica se targetUserId è un B2BUser attivo oppure un B2BPromoProspect in attivazione
    const existingActiveUser = await prisma.b2BUser.findUnique({
      where: { id: targetUserId },
      select: { id: true, zucchettiCode: true },
    });
    let promoProspect = !existingActiveUser
      ? await prisma.b2BPromoProspect.findUnique({ where: { id: targetUserId } })
      : null;

    // Se sono stati inviati i dati obbligatori di fatturazione, validali e salvali sul prospect
    if (promoProspect && billingData) {
      const saveRes = await validateAndSavePromoProspectBillingData(promoProspect.id, billingData);
      if (!saveRes.success) {
        return {
          success: false,
          requiresBillingData: true,
          error: saveRes.error,
        };
      }
      promoProspect = await prisma.b2BPromoProspect.findUnique({ where: { id: targetUserId } });
    }

    // Se è un prospect in attivazione e sta inviando l'ordine (o l'agente lo sta approvando),
    // tutti i campi obbligatori Zucchetti DEVONO essere compilati
    if (promoProspect && action === 'SEND_TO_ZUCCHETTI') {
      if (!isPromoProspectBillingComplete(promoProspect)) {
        return {
          success: false,
          requiresBillingData: true,
          error:
            'Per inviare il primo ordine è obbligatorio completare tutti i dati di fatturazione (P.IVA, Indirizzo, CAP, Città, Provincia, SDI/PEC e Telefono).',
        };
      }
    }

    // Calculate final prices and totals (including agent discount rules)
    const discountCtx = await getEffectiveClientDiscountContext();
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const p = (await getProductById(item.sku)) as any;
      if (!p) continue;

      const evaluated = evaluateTypesenseProductWithContext(
        p,
        cartType,
        discountCtx,
        item.extraDiscount
      );

      const originalPrice = evaluated.originalPriceB2b;
      const finalPrice = evaluated.netPrice;
      const dStr = evaluated.discountPct > 0 ? evaluated.discountLabel : '';

      totalAmount += finalPrice * item.quantity;

      orderItemsData.push({
        sku: item.sku,
        quantity: item.quantity,
        originalPrice,
        finalPrice,
        discountString: dStr || null,
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
        orderNotes = cartType === 'ELMARK' ? 'ORDINE ELMARK - Approvato' : "Approvato dall'agente";
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
        // Normal user or Promo Prospect: Orders must be reviewed by the agent first.
        orderStatus = 'PENDING_AGENT_REVIEW';
        orderNotes =
          cartType === 'ELMARK' ? 'ORDINE ELMARK - Inviato per revisione' : 'Inviato per revisione agente';
      }
    }

    let finalOrderUserId: string | null = existingActiveUser ? existingActiveUser.id : null;
    const finalPromoProspectId: string | null = promoProspect ? promoProspect.id : null;
    let promotedZucchettiCode: string | undefined;

    // Se l'agente Daniele Savoia approva il 1° ordine di un B2BPromoProspect (orderStatus === 'APPROVED'),
    // promuoviamo atomicamente il prospect in B2BUser (con stesso username e password) e inviamo ADHOC_CONTI a Zucchetti!
    if (promoProspect && orderStatus === 'APPROVED') {
      const promoRes = await promotePromoProspectToActiveUserOnOrderApproval(promoProspect.id);
      if (!promoRes.success || !promoRes.userId) {
        return {
          success: false,
          error: promoRes.error || 'Errore durante la creazione del cliente attivo su Zucchetti/B2B.',
        };
      }
      finalOrderUserId = promoRes.userId;
      promotedZucchettiCode = promoRes.zucchettiCode;
    } else if (promoProspect && orderStatus === 'PENDING_AGENT_REVIEW') {
      await prisma.b2BPromoProspect.update({
        where: { id: promoProspect.id },
        data: { status: 'ORDER_PENDING_APPROVAL' },
      });
    }

    // Create Order
    const order = await prisma.b2BOrder.create({
      data: {
        userId: finalOrderUserId,
        promoProspectId: finalPromoProspectId,
        createdById: createdById,
        status: orderStatus,
        storeMode: storeMode,
        totalAmount,
        totalIva: totalAmount * 0.22,
        notes: orderNotes,
        items: {
          create: orderItemsData,
        },
      },
    });

    if (promoProspect && orderStatus === 'APPROVED') {
      await prisma.b2BPromoProspect.update({
        where: { id: promoProspect.id },
        data: { firstOrderId: order.id },
      });
    }

    // Se un ordine viene approvato (o inviato da un cliente attivo con regola NEXT_PURCHASE / FIRST_PURCHASE),
    // segna come consumate eventuali regole one-shot ("Sul primo acquisto" / "Sul prossimo acquisto")
    if (orderStatus === 'APPROVED' && finalOrderUserId) {
      try {
        const nowIso = new Date().toISOString();
        const activeRules = discountCtx.rules || [];
        for (const r of activeRules) {
          if (r.expiryType === 'FIRST_PURCHASE' || r.expiryType === 'NEXT_PURCHASE') {
            const rows: Array<{ id: string; payload: any }> = await prisma.$queryRawUnsafe(
              `SELECT id, payload FROM b2b_agent_discount_rules WHERE id = $1 LIMIT 1`,
              r.id
            );
            if (rows[0]) {
              const p = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload || {};
              const updatedPayload = {
                ...p,
                consumedAt: nowIso,
                consumedOrderId: order.id,
              };
              await prisma.$executeRawUnsafe(
                `UPDATE b2b_agent_discount_rules
                 SET payload = $2::jsonb, consumed_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                r.id,
                JSON.stringify(updatedPayload)
              );
            }
          }
        }
      } catch (e) {
        console.warn('Avviso consumo regola sconto primo/prossimo acquisto:', e);
      }
    }

    // Mark Cart as COMPLETED
    try {
      await prisma.b2BCart.update({
        where: { id: cart.id },
        data: { status: 'COMPLETED' },
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
          where: { linkedOrderId: cart.linkedOrderId, status: 'REVIEW' },
        });
      } catch (e) {}
      try {
        await redis.del(`b2b_order_lock:${cart.linkedOrderId}`);
      } catch (e) {}
    }

    // Clear Redis Cart
    const redisKey =
      cartQuery.status === 'REVIEW'
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
        'reviewingReturnUrl',
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

    revalidatePath('/', 'layout');
    revalidatePath('/cart');
    revalidatePath('/account/saved-orders');
    revalidatePath('/account/sent-orders');
    revalidatePath('/account/quotes');
    revalidatePath('/account/agent-orders');
    revalidatePath('/account/agent-completed');
    revalidatePath('/account/prospects');
    revalidatePath('/account/clients');
    revalidatePath('/account');

    return {
      success: true,
      orderId: order.id,
      status: orderStatus,
      storeMode: order.storeMode,
      promotedZucchettiCode,
    };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { success: false, error: 'Errore durante il checkout: ' + error.message };
  }
}
