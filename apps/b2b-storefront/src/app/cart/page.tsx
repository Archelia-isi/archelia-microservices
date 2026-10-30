import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';
import Link from 'next/link';
import CartItemClient from './CartItemClient';
import QuickAddCart from './QuickAddCart';
import QuickEntryWrapper from './QuickEntryWrapper';
import AgentExtraDiscount from '../../components/AgentExtraDiscount';
import CheckoutButtons from '../../components/CheckoutButtons';
import { cookies } from 'next/headers';
import { getTargetUserId, getCartQuery } from '../actions/cart';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const cookieStore = cookies();
  const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;

  const targetUserId = await getTargetUserId(session);
  const cartQuery = await getCartQuery();
  let storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

  if (cartQuery.status === 'REVIEW' && cartQuery.linkedOrderId) {
    const linkedOrder = await prisma.b2BOrder.findUnique({
      where: { id: cartQuery.linkedOrderId },
      select: { storeMode: true }
    });
    if (linkedOrder?.storeMode) {
      storeMode = linkedOrder.storeMode as 'ZUCCHETTI' | 'ELMARK';
    }
    if (session.user.role === 'AGENT') {
      try {
        const { redis } = await import('@/lib/redis');
        await redis.set(`b2b_order_lock:${cartQuery.linkedOrderId}`, session.userId, 'EX', 3600 * 2);
      } catch (e) {}
    }
  }

  const { getCart } = await import('@/lib/cart');
  const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, storeMode);
  const items = cart?.items ? [...cart.items].reverse() : [];
  
  // Fetch details for each item
  const populatedItems = await Promise.all(items.map(async (item) => {
    const product = await getProductById(item.sku);
    const p = product as any;
    return {
      ...item,
      product: p ? {
        id: p.id,
        sku: p.sku,
        title: p.original_name || p.title,
        original_name: p.original_name,
        price: p.price || 0,
        priceB2b: Number(p.price_b2b) > 0 ? Number(p.price_b2b) : Number(p.price || 0),
        image_url: p.image_url || '/placeholder.png',
        imageUrl: p.image_url || '/placeholder.png',
        unit: p.unit || 'PZ',
        stock: p.stock || 0,
        stock_main: p.stock_main,
        stock_ek: p.stock_ek,
        discgroup: p.discgroup || '',
        brand: p.brand || '',
        product_group: p.product_group || '',
        family: p.family || '',
        category: p.category || '',
      } : null
    };
  }));

  // Calcola il totale con gli sconti applicati (inclusi sconti base fissi e regole di sconto agente)
  const {
    getEffectiveDiscount,
    getExtraAgentDiscount,
    getEffectiveElmarkDiscounts,
    getEffectiveClientDiscountContext,
    evaluateTypesenseProductWithContext,
  } = await import('@/lib/discount');
  const { getPromoProspectCheckoutData } = await import('@/app/actions/promoProspects');
  const [genericDiscount, extraAgentDiscount, elmarkDiscounts, discountCtx, promoCheckoutData] = await Promise.all([
    getEffectiveDiscount(),
    getExtraAgentDiscount(),
    getEffectiveElmarkDiscounts(),
    getEffectiveClientDiscountContext(),
    getPromoProspectCheckoutData(targetUserId),
  ]);
  
  const finalItems = populatedItems.map(item => {
    if (!item.product) return { ...item, finalPrice: 0, originalPrice: 0, basePrice: 0 };
    
    const evaluated = evaluateTypesenseProductWithContext(
      {
        ...item.product,
        price_b2b: item.product.priceB2b,
      },
      storeMode,
      discountCtx,
      item.extraDiscount
    );

    const originalPrice = evaluated.originalPriceB2b;
    const isFixedOverride = evaluated.calculationMode === 'FIXED_OVERRIDE';
    const baseDisc = isFixedOverride
      ? Number(evaluated.ruleDiscountPct || 0)
      : storeMode === 'ELMARK'
      ? Number(elmarkDiscounts[item.product.discgroup || ''] || 0)
      : Number(genericDiscount || 0);
    const basePrice = originalPrice * (1 - baseDisc / 100);
    const finalPrice = evaluated.netPrice;
    const discountLabel = evaluated.discountLabel;

    return { ...item, finalPrice, originalPrice, basePrice, discountLabel };
  });

  const totalAmount = finalItems.reduce((acc, item) => {
    return acc + ((item.finalPrice || 0) * item.quantity);
  }, 0);

  const ivaAmount = totalAmount * 0.22;
  const grandTotal = totalAmount + ivaAmount;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {cartQuery.status === 'REVIEW' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-yellow-800 font-bold">Modalità Revisione Attiva</h3>
            <p className="text-sm text-yellow-700">Stai revisionando l&apos;ordine #{cartQuery.linkedOrderId?.slice(-6).toUpperCase()}. Le modifiche che farai al carrello si applicheranno a questo ordine.</p>
          </div>
          <form action={async () => {
            'use server';
            const { redirect } = await import('next/navigation');
            const { endOrderReviewSession } = await import('@/app/actions/agent');
            const res = await endOrderReviewSession();
            redirect(res.returnUrl || '/account/agent-orders');
          }}>
            <button type="submit" className="text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-medium px-4 py-2 rounded transition-colors">
              Annulla Revisione
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold">
          {cartQuery.status === 'REVIEW' ? 'Revisione Ordine' : 'Il tuo Carrello'}
        </h1>
        {!(cartQuery.status === 'REVIEW' && storeMode === 'ELMARK') && (
          <div>
            <QuickEntryWrapper 
              userDiscount={genericDiscount} 
              extraDiscount={extraAgentDiscount} 
              elmarkDiscounts={elmarkDiscounts}
              storeMode={storeMode}
            />
          </div>
        )}
      </div>
      
      {session.user.role === 'AGENT' && storeMode === 'ZUCCHETTI' && cartQuery.status !== 'REVIEW' && (
        <AgentExtraDiscount initialDiscount={extraAgentDiscount} />
      )}

      {!(cartQuery.status === 'REVIEW' && storeMode === 'ELMARK') && <QuickAddCart userDiscount={genericDiscount} extraDiscount={extraAgentDiscount} storeMode={storeMode} elmarkDiscounts={elmarkDiscounts} />}

      {finalItems.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Il tuo carrello è vuoto.</p>
          <Link prefetch={true} href="/catalog" className="inline-block bg-brand-main text-white px-6 py-2 font-bold rounded hover:bg-brand-hover transition-colors">
            Inizia gli acquisti
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-500">
              <div className="col-span-6">Prodotto</div>
              <div className="col-span-2 text-center">Quantità</div>
              <div className="col-span-2 text-right">Prezzo Unit.</div>
              <div className="col-span-2 text-right">Totale</div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {finalItems.map((item) => (
                <CartItemClient key={item.id} item={item} isAgent={session.user.role === 'AGENT'} storeMode={storeMode} isReviewing={cartQuery.status === 'REVIEW' && storeMode === 'ELMARK'} />
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:items-end">
            <div className="w-full sm:w-80 mb-6 space-y-3">
              <div className="flex justify-between text-gray-500">
                <span>Totale Imponibile:</span>
                <span className="font-medium text-gray-900">€ {totalAmount.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA (22%):</span>
                <span className="font-medium text-gray-900">€ {ivaAmount.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-xl font-bold">
                <span>Totale Ordine:</span>
                <span className="text-gray-900">€ {grandTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            
            <CheckoutButtons 
              isAgent={session.user.role === 'AGENT'} 
              isImpersonating={!!impersonatedClientCode} 
              promoCheckoutData={promoCheckoutData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
