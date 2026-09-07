import Link from 'next/link';
import { searchProducts } from '@archelia/typesense/dist/search.js';

export default async function Home() {
  const illumReq = searchProducts('illuminazione', { b2bMode: true });
  const battReq = searchProducts('batterie', { b2bMode: true });
  const eletReq = searchProducts('elettrico', { b2bMode: true });
  const civileReq = searchProducts('serie civile', { b2bMode: true });
  
  const [illumRes, battRes, eletRes, civileRes] = await Promise.all([illumReq, battReq, eletReq, civileReq]);
  
  const getTop4 = (res: any) => res?.hits?.slice(0, 4).map((h: any) => h.document) || [];
  const illumProducts = getTop4(illumRes);
  const battProducts = getTop4(battRes);
  const eletProducts = getTop4(eletRes);
  const civileProducts = getTop4(civileRes);

  const renderCategoryCard = (title: string, products: any[], link: string) => (
    <div className="bg-white shadow-sm flex flex-col h-full hover:shadow-md transition-shadow rounded-sm relative">
      <h3 className="font-bold text-gray-900 text-sm p-4 pb-1">{title}</h3>
      <div className="grid grid-cols-2 flex-grow p-4 pt-1 gap-1">
        {products.map((prod: any, idx: number) => (
          <div key={idx} className="bg-white flex flex-col items-center justify-start relative group">
            <div className="absolute top-0 right-0 w-5 h-5 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div className="w-full aspect-square flex items-center justify-center overflow-hidden mb-1">
              {prod.image_url ? (
                <img src={prod.image_url} alt={prod.title} className="w-[85%] h-[85%] object-contain group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gray-50 rounded"></div>
              )}
            </div>
            <div className="text-[10px] text-gray-500 text-center line-clamp-1 w-full px-1" title={prod.title || prod.original_name}>{prod.title || prod.original_name || 'Prodotto'}</div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <Link href={link} className="text-[#3296c8] font-medium text-xs hover:underline flex items-center">
          Scopri tutto <span className="ml-1 font-bold text-[10px]">&gt;</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col pb-16">
      
      {/* HERO SECTION WITH OVERLAPPING CARDS */}
      <section className="relative w-full overflow-hidden bg-[#fafafa] h-[360px] flex justify-center mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffe4e1] to-[#ffb6c1] opacity-50 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c663be?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-multiply z-0"></div>
        
        {/* Bottom fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-50 to-transparent z-10"></div>
        
        <div className="relative z-20 w-full pt-12 h-full flex flex-col items-start px-8">
          <div className="bg-white/95 backdrop-blur rounded shadow-md w-full max-w-sm p-6">
            <h1 className="text-xl font-bold tracking-tight mb-2 text-gray-900">
              Distribuzione B2B
            </h1>
            <p className="text-xs text-gray-600 mb-0">
              Accesso esclusivo al catalogo ingrosso. Giacenze in tempo reale, listini personalizzati.
            </p>
          </div>
        </div>
      </section>

      {/* OVERLAPPING CATEGORY CARDS */}
      <section className="relative z-30 w-full px-4 -mt-[160px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderCategoryCard('Illuminazione', illumProducts, '/catalog?q=illuminazione')}
        {renderCategoryCard('Utensili', battProducts, '/catalog?q=utensili')}
        {renderCategoryCard('Serie Civile', civileProducts, '/catalog?q=serie+civile')}
        {renderCategoryCard('Elettricità', eletProducts, '/catalog?q=elettrico')}
      </section>

      {/* VANTAGGI B2B COMPATTI */}
      <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 px-4">
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Listini Dedicati</h3>
            <p className="text-gray-500 text-xs">Condizioni riservate al tuo account.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Stock Reale</h3>
            <p className="text-gray-500 text-xs">Giacenze sincronizzate col magazzino.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Riordino Veloce</h3>
            <p className="text-gray-500 text-xs">Inserimento massivo multi-prodotto.</p>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="w-full mt-8 px-4">
        <div className="bg-green-600 rounded p-8 text-center relative overflow-hidden shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <h2 className="text-xl font-bold text-black mb-2">Sei già un nostro cliente?</h2>
              <p className="text-green-950 max-w-xl text-xs">
                Accedi all'area riservata per consultare i tuoi listini ed effettuare nuovi ordini.
              </p>
            </div>
            <Link 
              href="/login" 
              className="shrink-0 bg-black hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded transition-colors text-sm"
            >
              Accedi all'Area B2B
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
