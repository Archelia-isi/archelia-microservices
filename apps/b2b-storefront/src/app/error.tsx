'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = (error?.message || '').toLowerCase();
    const isTransientFetchOrChunkError =
      msg.includes('network error') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('chunkloaderror') ||
      msg.includes('loading chunk');

    if (isTransientFetchOrChunkError && typeof window !== 'undefined') {
      const key = `b2b_auto_reload_${window.location.pathname}`;
      const lastReload = Number(sessionStorage.getItem(key) || '0');
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900"> Aggiornamento pagina richiesto</h2>
      <p className="mt-3 text-sm text-gray-600 max-w-md">
        La connessione si è interrotta o è stato pubblicato un aggiornamento del portale.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-lg shadow-sm transition-colors"
        >
          Ricarica Pagina
        </button>
      </div>
    </div>
  );
}
