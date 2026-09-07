import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="w-full flex flex-col gap-16 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative w-full bg-black text-white rounded-2xl overflow-hidden mt-4">
        {/* Placeholder for an eventual background image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c663be?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
        
        <div className="relative z-20 px-8 py-20 md:py-32 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Il Tuo Partner per la <span className="text-green-500">Distribuzione all'Ingrosso</span>
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-xl leading-relaxed">
            Accesso esclusivo al catalogo B2B con giacenze in tempo reale, listini personalizzati e gestione ordini semplificata per i rivenditori.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/catalog" 
              className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded-md transition-colors text-lg"
            >
              Esplora il Catalogo
            </Link>
            <Link 
              href="/login" 
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-8 rounded-md transition-colors text-lg border border-zinc-700"
            >
              Area Clienti
            </Link>
          </div>
        </div>
      </section>

      {/* VANTAGGI B2B */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Listini Dedicati</h3>
          <p className="text-gray-600">Accedi a condizioni commerciali riservate e sconti basati sui tuoi volumi di acquisto.</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Stock in Tempo Reale</h3>
          <p className="text-gray-600">Disponibilità sempre aggiornata dal nostro gestionale centrale per ordini sicuri e senza sorprese.</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Rifornimento Rapido</h3>
          <p className="text-gray-600">Strumenti di riordino veloce tramite SKU o barcode. Aggiungi i prodotti massivamente in un solo click.</p>
        </div>
      </section>

      {/* CATEGORIE PRINCIPALI */}
      <section className="mt-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Categorie Principali</h2>
            <p className="text-gray-500 mt-2">Esplora il nostro assortimento per macro-settori</p>
          </div>
          <Link href="/catalog" className="hidden sm:inline-flex text-green-700 font-medium hover:text-green-800 items-center gap-1">
            Vedi tutto il catalogo <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Categoria 1 */}
          <Link href="/catalog?q=illuminazione" className="group relative h-48 md:h-64 rounded-xl overflow-hidden bg-zinc-100 block">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
            <div className="absolute inset-0 flex items-end p-6 z-20">
              <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Illuminazione LED</h3>
            </div>
          </Link>
          
          {/* Categoria 2 */}
          <Link href="/catalog?q=batterie" className="group relative h-48 md:h-64 rounded-xl overflow-hidden bg-zinc-200 block">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
            <div className="absolute inset-0 flex items-end p-6 z-20">
              <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Pile e Batterie</h3>
            </div>
          </Link>

          {/* Categoria 3 */}
          <Link href="/catalog?q=elettrico" className="group relative h-48 md:h-64 rounded-xl overflow-hidden bg-zinc-300 block">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
            <div className="absolute inset-0 flex items-end p-6 z-20">
              <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Materiale Elettrico</h3>
            </div>
          </Link>

          {/* Categoria 4 */}
          <Link href="/catalog?q=casalinghi" className="group relative h-48 md:h-64 rounded-xl overflow-hidden bg-zinc-800 block">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
            <div className="absolute inset-0 flex items-end p-6 z-20">
              <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Articoli per la Casa</h3>
            </div>
          </Link>
        </div>
      </section>

      {/* MARCHI TRATTATI */}
      <section className="mt-8 bg-white border border-gray-100 rounded-xl p-8 md:p-12 shadow-sm">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">I Nostri Top Brand</h2>
          <p className="text-gray-500 mt-2">Siamo distributori ufficiali dei migliori marchi sul mercato</p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
          {/* Sostituisci questi testi con le immagini dei brand reali (V-Tac, Duracell, ecc.) */}
          <div className="text-2xl font-black font-sans tracking-tighter">V-TAC</div>
          <div className="text-2xl font-bold font-serif tracking-widest">DURACELL</div>
          <div className="text-2xl font-bold italic">Energizer</div>
          <div className="text-2xl font-bold text-gray-800">Philips</div>
          <div className="text-2xl font-extrabold uppercase">Beghelli</div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="mt-8 bg-black rounded-xl p-8 md:p-16 text-center shadow-lg border border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500 rounded-full blur-[120px] opacity-20"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">Sei già un nostro cliente?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Accedi subito all'area riservata per consultare i tuoi listini personalizzati ed effettuare nuovi ordini con giacenze in tempo reale.
          </p>
          <Link 
            href="/login" 
            className="inline-block bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-10 rounded-md transition-colors text-lg"
          >
            Accedi all'Area B2B
          </Link>
        </div>
      </section>

    </div>
  );
}
