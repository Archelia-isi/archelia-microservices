import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';
import Link from 'next/link';
import CartItemClient from './CartItemClient';

export default async function CartPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const cart = await prisma.b2BCart.findFirst({
    where: { userId: session.userId, status: 'ACTIVE' },
    include: { items: { orderBy: { createdAt: 'desc' } } },
  });

  const items = cart?.items || [];
  
  // Fetch details for each item
  const populatedItems = await Promise.all(items.map(async (item) => {
    const product = await getProductById(item.sku);
    const p = product as any;
    return {
      ...item,
      product: p ? {
        id: p.id,
        sku: p.sku,
        title: p.title || p.original_name,
        price: p.price || 0,
        priceB2b: p.price_b2b || p.price || 0,
        imageUrl: p.image_url || '/placeholder.png',
        unit: p.unit || 'PZ',
        stock: p.stock || 0
      } : null
    };
  }));

  // Calcola il totale con gli sconti applicati
  const genericDiscount = session.user.discount || 0;
  
  const finalItems = populatedItems.map(item => {
    if (!item.product) return { ...item, finalPrice: 0 };
    let finalPrice = item.product.price;
    if (genericDiscount > 0) {
      finalPrice = finalPrice * (1 - (genericDiscount / 100));
    } else if (item.product.priceB2b > 0) {
      finalPrice = item.product.priceB2b;
    }
    return { ...item, finalPrice };
  });

  const totalAmount = finalItems.reduce((acc, item) => {
    return acc + ((item.finalPrice || 0) * item.quantity);
  }, 0);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Il tuo Carrello</h1>
      
      {finalItems.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Il tuo carrello è vuoto.</p>
          <Link href="/catalog" className="inline-block bg-[#00C800] text-white px-6 py-2 font-bold rounded hover:bg-green-600 transition-colors">
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
                <CartItemClient key={item.id} item={item} />
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-end">
            <div className="text-gray-500 mb-2">Totale Ordine (IVA esclusa)</div>
            <div className="text-4xl font-bold text-gray-900 mb-6">
              € {totalAmount.toFixed(2).replace('.', ',')}
            </div>
            <button className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-[#00C800] transition-colors w-full sm:w-auto">
              Procedi al Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
