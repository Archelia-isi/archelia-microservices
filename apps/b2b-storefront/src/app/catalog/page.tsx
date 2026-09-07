import { searchProducts } from '@archelia/typesense/dist/search.js';
import { verifySession } from '@/lib/session';
import { addToCart } from '../actions/cart';
import Link from 'next/link';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await verifySession();
  const isAuthenticated = !!session;

  const query = searchParams.q || '*';
  const results = await searchProducts(query, { b2bMode: true });
  
  // result.hits contains the data
  const hits = results?.hits || [];

  return (
    <div className="w-full">
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogo Prodotti</h1>
          {isAuthenticated ? (
            <p className="text-sm text-gray-500 mt-1">
              Ciao, <span className="font-semibold text-gray-700">{session.user.firstName || session.user.email}</span>. Ordina i tuoi prodotti velocemente.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Catalogo pubblico. <Link href="/login" className="text-blue-600 hover:underline">Accedi</Link> per visualizzare i prezzi e acquistare.
            </p>
          )}
        </div>
        
        <form className="flex w-full md:w-1/2 gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query === '*' ? '' : query}
            placeholder="Cerca per SKU, nome, o tag..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            Cerca
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hits.map((hit: any) => {
          const product = hit.document;
          const isOutOfStock = (product.stock || 0) <= 0;
          return (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="relative w-full h-48 bg-white flex items-center justify-center p-4 border-b border-gray-100">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    className="max-h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Immagine Non Disponibile</span>
                )}
                {product.vendor && (
                  <span className="absolute top-2 left-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium border border-gray-200">
                    {product.vendor}
                  </span>
                )}
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-mono font-bold text-gray-500">{product.sku}</div>
                  <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    Disp: {product.stock || 0}
                  </div>
                </div>
                
                <h3 className="text-sm font-medium text-gray-900 line-clamp-3 mb-4 flex-1" title={product.title || product.original_name}>
                  {product.title || product.original_name}
                </h3>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                  {isAuthenticated ? (
                    <>
                      <div className="text-xl font-bold text-blue-900">
                        € {Number(product.price_b2b || product.price || 0).toFixed(2).replace('.', ',')}
                      </div>
                      <form action={addToCart} className="flex gap-2">
                        <input type="hidden" name="sku" value={product.sku} />
                        <input 
                          type="number" 
                          name="quantity" 
                          defaultValue="1" 
                          min="1" 
                          max={product.stock || 1}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <button 
                          type="submit" 
                          disabled={isOutOfStock}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            isOutOfStock 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-800 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isOutOfStock ? 'Esaurito' : 'Aggiungi'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="w-full text-center">
                      <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800 block w-full bg-blue-50 rounded py-2 transition-colors">
                        Accedi per i prezzi
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {hits.length === 0 && (
        <div className="w-full py-16 bg-white rounded-lg border border-gray-200 text-center text-gray-500 shadow-sm mt-4">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg">Nessun prodotto trovato per "{query}"</p>
          <p className="text-sm mt-1">Prova a cercare con un termine diverso o uno SKU esatto.</p>
        </div>
      )}
    </div>
  );
}
