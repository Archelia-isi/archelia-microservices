import { getCart } from '@/lib/cart';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { checkout } from '../actions/cart';
import Link from 'next/link';

export default async function CartPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const cart = await getCart();

  return (
    <div className="w-full">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Il tuo Carrello B2B</h1>
        <Link href="/catalog" className="text-green-600 hover:text-green-600 font-medium text-sm">
          &larr; Torna al Catalogo
        </Link>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {cart.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-1">Il carrello è vuoto</p>
            <p className="mb-4">Non hai ancora aggiunto nessun prodotto al tuo ordine.</p>
            <Link href="/catalog" className="inline-block px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm">
              Inizia gli acquisti
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-8 md:col-span-6">Prodotto</div>
              <div className="col-span-4 md:col-span-2 text-center">Quantità</div>
              <div className="hidden md:block md:col-span-4 text-right">Azioni</div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {cart.items.map((item) => (
                <div key={item.sku} className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-8 md:col-span-6">
                    <div className="font-mono font-bold text-gray-900">{item.sku}</div>
                    <div className="text-sm text-gray-500">Articolo in carrello</div>
                  </div>
                  
                  <div className="col-span-4 md:col-span-2 text-center">
                    <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-md">
                      <span className="px-3 py-1 font-medium text-gray-900">{item.quantity}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-12 md:col-span-4 text-right mt-2 md:mt-0">
                    <button className="text-red-500 hover:text-red-700 text-sm font-medium">Rimuovi</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                I prezzi e le disponibilità definitive verranno calcolate al momento della conferma su Zucchetti.
              </div>
              
              <form action={checkout}>
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition-colors shadow-sm text-lg"
                >
                  Conferma Ordine B2B
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
