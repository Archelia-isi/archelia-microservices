import { getCart } from '@/lib/cart';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Button } from '@archelia/ui-storefront';
import { checkout } from '../actions/cart';

export default async function CartPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const cart = await getCart();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl bg-white shadow-sm rounded-lg p-6 mt-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Il tuo Carrello B2B</h1>
        
        {cart.items.length === 0 ? (
          <p className="text-gray-500">Il carrello è vuoto.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {cart.items.map((item) => (
              <div key={item.sku} className="flex justify-between items-center border-b pb-4">
                <div>
                  <div className="font-semibold">{item.sku}</div>
                  <div className="text-sm text-gray-500">Quantità: {item.quantity}</div>
                </div>
              </div>
            ))}
            
            <div className="mt-8 flex justify-end">
              <form action={checkout}>
                <Button>Procedi al Checkout</Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
