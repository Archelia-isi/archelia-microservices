'use client';

import { useState } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function FastShippingBanner({ zucchettiProductId, stock }: { zucchettiProductId: string, stock: number }) {
  const [isPending, setIsPending] = useState(false);

  const handleSwitch = async () => {
    setIsPending(true);
    await setStoreMode('ZUCCHETTI');
    window.location.href = '/product/' + zucchettiProductId;
  };

  return (
    <button 
      onClick={handleSwitch}
      disabled={isPending}
      className="mt-4 w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left disabled:opacity-50 group"
    >
      <div className="flex flex-col">
        <span className="text-green-800 font-bold text-sm flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Vuoi riceverlo in 2 giorni?
        </span>
        <span className="text-green-700 text-xs mt-1">
          Acquistalo su Izzo Distribuzione ({stock} PZ disponibili).
        </span>
      </div>
      <svg className="w-5 h-5 text-green-600 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
