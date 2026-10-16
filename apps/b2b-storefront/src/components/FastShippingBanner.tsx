'use client';

import { useState } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function FastShippingBanner({ zucchettiProductId, stock, elmarkProductId }: { zucchettiProductId: string, stock: number, elmarkProductId: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleSwitch = async () => {
    setIsPending(true);
    const targetPath = `/product/${zucchettiProductId}?fromElmark=true&elmarkId=${encodeURIComponent(elmarkProductId)}`;
    if (typeof window !== 'undefined' && window.location.hostname.includes('izzodistribuzione.it')) {
      window.location.href = `https://www.izzodistribuzione.it${targetPath}`;
      return;
    }
    await setStoreMode('ZUCCHETTI');
    window.location.href = targetPath;
  };

  return (
    <button 
      onClick={handleSwitch}
      disabled={isPending}
      className="mt-5 w-full flex items-center justify-between gap-4 p-4 md:p-5 bg-gradient-to-r from-[#00b300] to-emerald-600 hover:from-[#009900] hover:to-emerald-700 text-white border-2 border-[#00C800] rounded-xl shadow-lg hover:shadow-xl transition-all text-left disabled:opacity-60 group ring-4 ring-[#00C800]/20"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-lg bg-white text-[#00a000] flex items-center justify-center flex-shrink-0 shadow-md">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h7v8l10-12h-7V2z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-yellow-300 text-black text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
              Pronta Consegna 2GG
            </span>
            <span className="bg-white/20 text-white text-xs font-extrabold px-2 py-0.5 rounded">
              {stock} PZ in Magazzino Izzo
            </span>
          </div>
          <span className="text-white font-extrabold text-base md:text-lg leading-tight mt-1">
            Vuoi riceverlo in 2 giorni?
          </span>
          <span className="text-white/95 font-medium text-xs md:text-sm mt-0.5">
            Questo prodotto è disponibile nel nostro magazzino: clicca qui per acquistarlo su <strong className="underline font-extrabold">Izzo Distribuzione</strong>!
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 bg-white text-gray-900 group-hover:bg-yellow-300 font-extrabold text-xs md:text-sm px-3.5 py-2.5 rounded-lg shadow transition-colors flex items-center gap-1.5">
        <span>{isPending ? 'Apertura...' : 'Acquista 2GG'}</span>
        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
