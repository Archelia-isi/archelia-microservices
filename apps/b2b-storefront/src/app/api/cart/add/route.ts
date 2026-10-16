import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { getCart, saveCartToRedis, generateItemId } from '@/lib/cart';
import { getTargetUserId, getCartQuery } from '@/app/actions/cart';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, quantity } = body;

    if (!sku || typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ success: false, error: 'Parametri non validi' }, { status: 400 });
    }

    const hostname = request.headers.get('host') || '';
    const isElmark = hostname.includes('elmark.izzodistribuzione.it');
    let storeMode: 'ZUCCHETTI' | 'ELMARK' = isElmark ? 'ELMARK' : 'ZUCCHETTI';

    const existingCookie = request.cookies.get('b2b_store_mode')?.value;
    const isReviewing = request.cookies.get('reviewingOrderId')?.value;

    if (!isElmark) {
      if (isReviewing && existingCookie === 'ELMARK') {
        storeMode = 'ELMARK';
      } else if (!hostname.includes('izzodistribuzione.it') && existingCookie === 'ELMARK') {
        storeMode = 'ELMARK';
      }
    }

    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    const targetUserId = await getTargetUserId(session);
    const cartQuery = await getCartQuery();

    const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, storeMode);

    let agentExtraDiscount = 0;
    if (session.user.role === 'AGENT' && storeMode === 'ZUCCHETTI') {
      const cookieVal = request.cookies.get('agentExtraDiscount')?.value;
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

    await saveCartToRedis(cart);
    const totalCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({ success: true, cartItemCount: totalCount });
  } catch (error: any) {
    console.error('API Cart add error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Errore interno' }, { status: 500 });
  }
}
