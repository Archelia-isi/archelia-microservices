'use client';

import { useState, useEffect } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function ReturnToElmarkBanner({ elmarkProductId }: { elmarkProductId: string }) {
  const [isPending, setIsPending] = useState(false);

  // Remove the query parameters from the URL so that if the user navigates away and clicks BACK,
  // the banner won't reappear permanently in their history.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('fromElmark')) {
        url.searchParams.delete('fromElmark');
        url.searchParams.delete('elmarkId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const handleSwitch = async () => {
    setIsPending(true);
    await setStoreMode('ELMARK');
    window.location.href = '/product/' + elmarkProductId;
  };

  return (
    <button 
      onClick={handleSwitch}
      disabled={isPending}
      className="mt-4 w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left disabled:opacity-50 group"
    >
      <div className="flex flex-col">
        <span className="text-blue-800 font-bold text-sm flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Torna al negozio Elmark
        </span>
        <span className="text-blue-700 text-xs mt-1">
          Ritorna alla versione originale del prodotto
        </span>
      </div>
    </button>
  );
}
