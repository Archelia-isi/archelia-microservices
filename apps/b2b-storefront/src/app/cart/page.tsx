import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';
import Link from 'next/link';
import CartItemClient from './CartItemClient';
import QuickAddCart from './QuickAddCart';
import AgentExtraDiscount from '../../components/AgentExtraDiscount';
import CheckoutButtons from '../../components/CheckoutButtons';
import { cookies } from 'next/headers';
import { getTargetUserId, getCartQuery } from '../actions/cart';

export default async function CartPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const cookieStore = cookies();
  const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;

  const targetUserId = await getTargetUserId(session);
  const cartQuery = await getCartQuery();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

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
        priceB2b: p.price_b2b || 0,
        image_url: p.image_url || '/placeholder.png',
        imageUrl: p.image_url || '/placeholder.png',
        unit: p.unit || 'PZ',
        stock: p.stock || 0,
        discgroup: p.discgroup || ''
      } : null
    };
  }));

  // Calcola il totale con gli sconti applicati
  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};
  const { getEffectiveDiscount, getExtraAgentDiscount } = await import('@/lib/discount');
  const genericDiscount = await getEffectiveDiscount();
  const extraAgentDiscount = await getExtraAgentDiscount();
  
  const finalItems = populatedItems.map(item => {
    if (!item.product) return { ...item, finalPrice: 0, originalPrice: 0, basePrice: 0 };
    
    let originalPrice = Number(item.product.priceB2b) > 0 ? Number(item.product.priceB2b) : Number(item.product.price);
    let basePrice = originalPrice;
    
    if (storeMode === 'ELMARK') {
      const dGroup = item.product.discgroup || '';
      const groupDisc = elmarkDiscounts[dGroup] || 0;
      if (groupDisc > 0) {
        basePrice = basePrice * (1 - (groupDisc / 100));
      }
    } else {
      if (genericDiscount > 0) {
        basePrice = basePrice * (1 - (genericDiscount / 100));
      }
    }

    let finalPrice = basePrice;

    // Solo l'extra discount del singolo item viene calcolato
    // (L'extra discount globale è già stato spalmato sugli items via DB o in addToCart)
    if (item.extraDiscount && item.extraDiscount > 0) {
      finalPrice = finalPrice * (1 - (item.extraDiscount / 100));
    }

    return { ...item, finalPrice, originalPrice, basePrice };
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
            <p className="text-sm text-yellow-700">Stai revisionando l'ordine #{cartQuery.linkedOrderId?.slice(-6).toUpperCase()}. Le modifiche che farai al carrello e al catalogo si applicheranno a questo ordine.</p>
          </div>
          <form action={async () => {
            'use server';
            const { cookies } = await import('next/headers');
            const { redirect } = await import('next/navigation');
            const { revalidatePath } = await import('next/cache');
            cookies().delete('reviewingOrderId');
            revalidatePath('/cart');
            redirect('/cart');
          }}>
            <button type="submit" className="text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-medium px-4 py-2 rounded transition-colors">
              Annulla Revisione
            </button>
          </form>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">
        {cartQuery.status === 'REVIEW' ? 'Revisione Ordine' : 'Il tuo Carrello'}
      </h1>
      
      {session.user.role === 'AGENT' && (
        <AgentExtraDiscount initialDiscount={extraAgentDiscount} />
      )}

      <QuickAddCart userDiscount={genericDiscount} extraDiscount={extraAgentDiscount} />

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
                <CartItemClient key={item.id} item={item} isAgent={session.user.role === 'AGENT'} />
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
