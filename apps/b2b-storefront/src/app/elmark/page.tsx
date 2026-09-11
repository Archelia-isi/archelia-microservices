import { searchProducts } from '@archelia/typesense/dist/search.js';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@archelia/b2b-database';
import Link from 'next/link';
import CatalogClient from '../../components/CatalogClient';

export default async function ElmarkCatalogPage({
  searchParams,
}: {
  searchParams: { q?: string; l1?: string; l2?: string; l3?: string };
}) {
  const session = await verifySession();
  if (session?.user?.mustChangePassword) {
    redirect('/setup-password');
  }
  
  const isAuthenticated = !!session;
  
  if (!isAuthenticated) redirect('/login');
  
  const user = await prisma.b2BUser.findUnique({
    where: { id: session.userId },
    select: { isElmarkCustomer: true, elmarkDiscounts: true }
  });
  
  if (!user?.isElmarkCustomer) {
    redirect('/'); // Non autorizzato
  }
  
  const elmarkDiscounts: any = user.elmarkDiscounts || {};


  const query = searchParams.q || '*';
  // Richiedi fino a 250 prodotti per popolare i filtri in modo ricco (replicando il comportamento del tema originale)
  const results = await searchProducts(query, {
    catalogSource: 'elmark', 
    b2bMode: true, 
    limit: 250,
    l1: searchParams.l1,
    l2: searchParams.l2,
    l3: searchParams.l3,
  });
  
  const hits = results?.hits || [];
  
  

  const products = hits.map((h: any) => {
    const product = { ...h.document };
    
    if (isAuthenticated) {
      // Prezzo base è sempre il prezzo di listino
      product.originalPriceB2b = Number(product.price || 0);
      
      // Calcola sconto basato su discgroup
      const discGroup = product.discgroup;
      const discountPct = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
      
      let finalPrice = product.originalPriceB2b;
      if (discountPct > 0) {
        finalPrice = finalPrice * (1 - (discountPct / 100));
      }
      
      // IMPORTANT: In Elmark, NO agent extra discount is applied.
      product.price_b2b = finalPrice;
    }
    
    return product;
  });

  return (
    <div className="w-full">
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0066cc]">Catalogo Elmark</h1>
          {isAuthenticated ? (
            <p className="text-sm text-gray-500 mt-1">
              Benvenuto nell'area riservata Elmark. Sconti personalizzati attivi.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Catalogo pubblico. <Link prefetch={true} href="/login" className="text-[#00C800] hover:underline font-bold">Accedi</Link> per visualizzare i prezzi B2B e acquistare.
            </p>
          )}
        </div>
        
        <form className="flex w-full md:w-1/2 gap-2" action="/elmark" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={query === '*' ? '' : query}
            placeholder="Cerca prodotti o inserisci SKU..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all shadow-sm font-medium"
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-[#0066cc] text-white font-bold uppercase tracking-wider rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            Cerca
          </button>
        </form>
      </div>

      <CatalogClient initialProducts={products} query={query} isAuthenticated={isAuthenticated} cartType="ELMARK" />
    </div>
  );
}
