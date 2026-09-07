import Link from 'next/link';
import { searchProducts } from '@archelia/typesense/dist/search.js';

export default async function Home() {
  // Fetch top 4 products per category for B2B
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
  return (
    <div className="w-full flex flex-col gap-12 pb-16">
      
      {/* HERO SECTION WITH OVERLAPPING CARDS */}
      <section className="relative w-full rounded-2xl overflow-hidden mt-4 bg-zinc-900 border border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-zinc-900 z-10"></div>
        {/* Placeholder per un'eventuale immagine di sfondo */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c663be?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        
        <div className="relative z-20 px-8 pt-16 pb-32 md:pb-48 md:pt-24 max-w-4xl">
          <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 font-semibold text-sm rounded-full mb-6 border border-green-500/30">
            Piattaforma B2B Riservata
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white">
            Distribuzione all'Ingrosso <br className="hidden md:block" />
            <span className="text-green-500">Semplice e Veloce.</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-xl leading-relaxed">
            Scopri il catalogo completo dedicato ai rivenditori. Giacenze in tempo reale, listini personalizzati e riordino istantaneo in un'unica piattaforma.
          </p>
        </div>
      </section>

      {/* OVERLAPPING CATEGORY CARDS */}
      <section className="relative z-30 px-4 -mt-24 md:-mt-40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Illuminazione LED */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5 flex flex-col h-full hover:-translate-y-1 transition-transform">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Illuminazione LED</h3>
          <div className="grid grid-cols-2 gap-3 mb-6 flex-grow">
            {illumProducts.map((prod: any, idx: number) => (
              <div key={idx} className="bg-gray-50 rounded aspect-square flex items-center justify-center p-2 border border-gray-100 relative group overflow-hidden">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.title} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded"></div>
                )}
              </div>
            ))}
          </div>
          <Link href="/catalog?q=illuminazione" className="text-green-600 font-medium text-sm hover:text-green-700 mt-auto inline-flex items-center">
            Scopri tutto <span className="ml-1 text-lg leading-none">&rsaquo;</span>
          </Link>
        </div>

        {/* Card: Pile e Batterie */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5 flex flex-col h-full hover:-translate-y-1 transition-transform">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Pile e Batterie</h3>
          <div className="grid grid-cols-2 gap-3 mb-6 flex-grow">
            {battProducts.map((prod: any, idx: number) => (
              <div key={idx} className="bg-gray-50 rounded aspect-square flex items-center justify-center p-2 border border-gray-100 relative group overflow-hidden">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.title} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded"></div>
                )}
              </div>
            ))}
          </div>
          <Link href="/catalog?q=batterie" className="text-green-600 font-medium text-sm hover:text-green-700 mt-auto inline-flex items-center">
            Scopri tutto <span className="ml-1 text-lg leading-none">&rsaquo;</span>
          </Link>
        </div>

        {/* Card: Materiale Elettrico */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5 flex flex-col h-full hover:-translate-y-1 transition-transform">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Materiale Elettrico</h3>
          <div className="grid grid-cols-2 gap-3 mb-6 flex-grow">
            {eletProducts.map((prod: any, idx: number) => (
              <div key={idx} className="bg-gray-50 rounded aspect-square flex items-center justify-center p-2 border border-gray-100 relative group overflow-hidden">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.title} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded"></div>
                )}
              </div>
            ))}
          </div>
          <Link href="/catalog?q=elettrico" className="text-green-600 font-medium text-sm hover:text-green-700 mt-auto inline-flex items-center">
            Scopri tutto <span className="ml-1 text-lg leading-none">&rsaquo;</span>
          </Link>
        </div>

        {/* Card: Serie Civile */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-5 flex flex-col h-full hover:-translate-y-1 transition-transform">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Serie Civile</h3>
          <div className="grid grid-cols-2 gap-3 mb-6 flex-grow">
            {civileProducts.map((prod: any, idx: number) => (
              <div key={idx} className="bg-gray-50 rounded aspect-square flex items-center justify-center p-2 border border-gray-100 relative group overflow-hidden">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.title} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded"></div>
                )}
              </div>
            ))}
          </div>
          <Link href="/catalog?q=serie+civile" className="text-green-600 font-medium text-sm hover:text-green-700 mt-auto inline-flex items-center">
            Scopri tutto <span className="ml-1 text-lg leading-none">&rsaquo;</span>
          </Link>
        </div>

      </section>

      {/* VANTAGGI B2B COMPATTI */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 px-4">
        <div className="bg-black text-white p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-900/50 text-green-500 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold mb-1">Listini Dedicati</h3>
            <p className="text-gray-400 text-sm">Condizioni commerciali riservate al tuo account.</p>
          </div>
        </div>
        
        <div className="bg-black text-white p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-900/50 text-green-500 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold mb-1">Stock in Tempo Reale</h3>
            <p className="text-gray-400 text-sm">Giacenze reali sincronizzate con il nostro magazzino.</p>
          </div>
        </div>
        
        <div className="bg-black text-white p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-900/50 text-green-500 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold mb-1">Riordino Veloce</h3>
            <p className="text-gray-400 text-sm">Inserimento massivo e carrelli multi-prodotto.</p>
          </div>
        </div>
      </section>

      {/* MARCHI TRATTATI */}
      <section className="mt-6 bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">I Nostri Top Brand</h2>
            <p className="text-gray-500 text-sm">Siamo distributori ufficiali</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60 grayscale">
            <div className="text-xl font-black font-sans tracking-tighter">V-TAC</div>
            <div className="text-xl font-bold font-serif tracking-widest">DURACELL</div>
            <div className="text-xl font-bold italic">Energizer</div>
            <div className="text-xl font-bold text-gray-800">Philips</div>
            <div className="text-xl font-extrabold uppercase">Beghelli</div>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="mt-6 bg-green-600 rounded-xl p-8 md:p-12 text-center shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-black mb-2">Sei già un nostro cliente?</h2>
            <p className="text-green-950 max-w-xl">
              Accedi subito all'area riservata per consultare i tuoi listini personalizzati ed effettuare nuovi ordini.
            </p>
          </div>
          <Link 
            href="/login" 
            className="shrink-0 bg-black hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-md transition-colors text-lg"
          >
            Accedi all'Area B2B
          </Link>
        </div>
      </section>

    </div>
  );
}
