import { searchProducts } from '@archelia/typesense';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Button } from '@archelia/ui-storefront';
import { addToCart } from '../actions/cart';
import Image from 'next/image';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await verifySession();
  
  if (!session) {
    redirect('/login');
  }

  const query = searchParams.q || '*';
  const results = await searchProducts(query);
  
  // result.hits contains the data
  const hits = results?.hits || [];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Catalogo B2B</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-600">
            Ciao, {session.user.firstName || session.user.email}
          </span>
          <form action="/login" method="GET">
             {/* Simple logout placeholder logic */}
             <Button>Esci</Button>
          </form>
        </div>
      </header>
      
      <div className="w-full max-w-7xl p-6">
        <div className="mb-6">
          <form className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query === '*' ? '' : query}
              placeholder="Cerca prodotti per SKU, nome o tag..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button>Cerca</Button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {hits.map((hit: any) => {
            const product = hit.document;
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center p-4">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">Nessuna Immagine</span>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs font-semibold text-blue-600 mb-1">{product.sku}</div>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 flex-1">
                    {product.title || product.original_name}
                  </h3>
                  
                  <div className="mt-2 flex justify-between items-end">
                    <div>
                      <div className="text-xs text-gray-500">Stock: <span className="font-medium text-gray-900">{product.stock || 0}</span></div>
                      <div className="text-lg font-bold text-gray-900 mt-1">€ {Number(product.price).toFixed(2)}</div>
                    </div>
                    <form action={addToCart}>
                      <input type="hidden" name="sku" value={product.sku} />
                      <input type="hidden" name="quantity" value="1" />
                      <Button>Aggiungi</Button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {hits.length === 0 && (
          <div className="w-full py-12 text-center text-gray-500">
            Nessun prodotto trovato.
          </div>
        )}
      </div>
    </main>
  );
}
