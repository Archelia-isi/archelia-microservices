import { searchProducts } from '@archelia/typesense/dist/search.js';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CatalogClient from '../../components/CatalogClient';
import { cookies } from 'next/headers';

export default async function CatalogPage({ searchParams }: { searchParams: { q?: string; l1?: string; l2?: string; l3?: string } }) {
  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';
  const session = await verifySession();
  if (session?.user?.mustChangePassword) {
    redirect('/setup-password');
  }
  
  const isAuthenticated = !!session;

  const query = searchParams.q || '*';
  // Richiedi fino a 250 prodotti per popolare i filtri in modo ricco (replicando il comportamento del tema originale)
  const results = await searchProducts(query, { catalogSource, b2bMode: true, 
    limit: 250,
    l1: searchParams.l1,
    l2: searchParams.l2,
    l3: searchParams.l3,
  });
  
  const hits = results?.hits || [];
  
  const { getEffectiveDiscount, getExtraAgentDiscount } = await import('@/lib/discount');
  const genericDiscount = await getEffectiveDiscount();
  const extraDiscount = await getExtraAgentDiscount();

  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};

  const products = hits.map((h: any) => {
    const product = { ...h.document };
    
    if (isAuthenticated) {
      product.originalPriceB2b = Number(product.price_b2b || 0);
      let finalPrice = product.originalPriceB2b;
      
      if (storeMode === 'ELMARK') {
        const dGroup = product.discgroup || '';
        const groupDisc = elmarkDiscounts[dGroup] || 0;
        if (groupDisc > 0) {
          finalPrice = finalPrice * (1 - (groupDisc / 100));
        }
      } else {
        if (genericDiscount > 0) {
          finalPrice = finalPrice * (1 - (genericDiscount / 100));
        }
        if (extraDiscount > 0) {
          finalPrice = finalPrice * (1 - (extraDiscount / 100));
        }
      }
      
      product.price_b2b = finalPrice;
    }
    
    return product;
  });

  return (
    <div className="w-full">
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogo Prodotti</h1>
          {isAuthenticated ? (
            <p className="text-sm text-gray-500 mt-1">
              Ciao, <span className="font-semibold text-gray-700">{session.user.firstName || session.user.email}</span>. Usa i filtri per trovare ciò che cerchi.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Catalogo pubblico. <Link prefetch={true} href="/login" className="text-brand-main hover:underline font-bold">Accedi</Link> per visualizzare i prezzi B2B e acquistare.
            </p>
          )}
        </div>
        
        <form className="flex w-full md:w-1/2 gap-2" action="/catalog" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={query === '*' ? '' : query}
            placeholder="Cerca prodotti o inserisci SKU..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent transition-all shadow-sm font-medium"
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-brand-main text-white font-bold uppercase tracking-wider rounded-md hover:bg-green-600 transition-colors shadow-sm text-sm"
          >
            Cerca
          </button>
        </form>
      </div>

      <CatalogClient initialProducts={products} query={query} isAuthenticated={isAuthenticated} storeMode={storeMode} />
    </div>
  );
}
