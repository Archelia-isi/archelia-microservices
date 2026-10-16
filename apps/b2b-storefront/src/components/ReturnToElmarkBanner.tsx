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
    const targetPath = `/product/${elmarkProductId}`;
    if (typeof window !== 'undefined' && window.location.hostname.includes('izzodistribuzione.it')) {
      window.location.href = `https://elmark.izzodistribuzione.it${targetPath}`;
      return;
    }
    await setStoreMode('ELMARK');
    window.location.href = targetPath;
  };

  return (
    <button 
      onClick={handleSwitch}
      disabled={isPending}
      className="mt-4 w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 rounded-xl shadow-md transition-colors text-left disabled:opacity-50 group"
    >
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm flex items-center gap-2">
          <svg className="w-5 h-5 text-white transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Torna al negozio Elmark
        </span>
        <span className="text-blue-100 text-xs mt-1">
          Ritorna alla scheda prodotto originale su Elmark
        </span>
      </div>
    </button>
  );
}
