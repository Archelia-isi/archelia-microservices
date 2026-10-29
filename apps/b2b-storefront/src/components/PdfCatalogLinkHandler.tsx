'use client';

import React, { useEffect, useState } from 'react';

export default function PdfCatalogLinkHandler() {
  const [needsManualSplit, setNeedsManualSplit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__pdfSplitDone) return;

    const cleanUrl = window.location.pathname;

    // Se la scheda è già stata aperta come nuova scheda (es. Firefox con /NewWindow true, Cmd+Click, o lettore PDF esterno),
    // history.length è 1: puliamo solo il parametro ?from_pdf=1 dall'URL.
    if (window.history.length <= 1) {
      window.history.replaceState(null, '', cleanUrl);
      return;
    }

    // Se il viewer PDF di Chrome ha aperto il link nella stessa scheda del catalogo (history.length > 1),
    // proviamo subito ad aprire il prodotto in una nuova scheda e riportare questa scheda indietro al PDF.
    try {
      const newWin = window.open(cleanUrl, '_blank');
      if (newWin) {
        (window as any).__pdfSplitDone = true;
        window.history.back();
        return;
      }
    } catch {
      // Ignora errori blocco popup iniziale
    }

    // Se il browser richiede un gesto utente sulla pagina per consentire window.open('_blank'),
    // al primo clic in qualsiasi punto apriamo la nuova scheda col prodotto e riportiamo questa scheda al catalogo PDF.
    setNeedsManualSplit(true);

    const handleFirstUserClick = () => {
      try {
        const win = window.open(cleanUrl, '_blank');
        if (win) {
          window.history.back();
        }
      } catch {
        // fallback silenzioso
      }
    };

    window.addEventListener('click', handleFirstUserClick, { capture: true, once: true });
    return () => {
      window.removeEventListener('click', handleFirstUserClick, { capture: true });
    };
  }, []);

  const handleOpenInNewTabAndReturn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const cleanUrl = window.location.pathname;
    const win = window.open(cleanUrl, '_blank');
    if (win) {
      window.history.back();
    }
  };

  const handleBackToCatalogOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    window.history.back();
  };

  if (!needsManualSplit) return null;

  return (
    <div className="mb-6 rounded-xl bg-gray-900 text-white px-4 py-3 shadow-lg border border-brand-main/40 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-xs md:text-sm font-medium">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-main text-black font-black shrink-0">
          PDF
        </span>
        <div>
          <span className="font-bold text-brand-main">Articolo aperto dal Catalogo PDF</span>
          <span className="hidden sm:inline text-gray-300">
            {' '}
            — Clicca per mantenere il catalogo sempre aperto nella scheda precedente.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenInNewTabAndReturn}
          className="px-3 py-1.5 rounded-lg bg-brand-main hover:bg-amber-400 text-black font-extrabold text-xs transition-colors shadow-sm"
        >
          ↗ Apri in nuova scheda e mantieni Catalogo
        </button>
        <button
          type="button"
          onClick={handleBackToCatalogOnly}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs border border-gray-700 transition-colors"
        >
          ⬅ Torna al Catalogo PDF
        </button>
      </div>
    </div>
  );
}
