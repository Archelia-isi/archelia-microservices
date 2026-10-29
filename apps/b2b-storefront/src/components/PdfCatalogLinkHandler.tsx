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

    // Proviamo subito ad aprire il prodotto in una nuova scheda e riportare questa scheda indietro al PDF.
    // (Funziona istantaneamente in automatico se i popup per il sito sono consentiti nel browser).
    try {
      const newWin = window.open(cleanUrl, '_blank');
      if (newWin) {
        (window as any).__pdfSplitDone = true;
        window.history.back();
        return;
      }
    } catch {
      // Bloccato dal blocco popup automatico di Chrome
    }

    // Se Chrome ha bloccato il window.open automatico al caricamento (perché il clic proveniva dal plugin PDF interno),
    // mostriamo l'avviso e al primo clic in qualsiasi punto apriamo la nuova scheda col prodotto e riportiamo questa scheda al PDF.
    setNeedsManualSplit(true);

    const handleFirstUserClick = (e: MouseEvent) => {
      // Se ha cliccato su "Torna solo al Catalogo", lascia gestire al bottone dedicato
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-pdf-back-only="true"]')) {
        return;
      }
      try {
        const win = window.open(cleanUrl, '_blank');
        if (win) {
          (window as any).__pdfSplitDone = true;
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
      (window as any).__pdfSplitDone = true;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-900 max-w-lg w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-main text-black font-black text-lg flex items-center justify-center mx-auto shadow">
          PDF
        </div>
        <h2 className="text-lg font-black text-gray-900">
          Apertura scheda prodotto in una nuova scheda
        </h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Il lettore PDF integrato di Chrome blocca l&apos;apertura automatica di nuove schede se i
          pop-up non sono abilitati per il sito.
          <br />
          <strong>Clicca sul pulsante qui sotto (o in qualsiasi punto)</strong> per aprire il
          prodotto in una nuova scheda e lasciare il <strong>Catalogo PDF</strong> aperto in questa
          scheda.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleOpenInNewTabAndReturn}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-main hover:bg-amber-400 text-black font-black text-xs transition-colors shadow-md"
          >
            ↗ Apri in nuova scheda e mantieni Catalogo qui
          </button>
          <button
            type="button"
            data-pdf-back-only="true"
            onClick={handleBackToCatalogOnly}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs border border-gray-300 transition-colors"
          >
            ⬅ Torna solo al Catalogo PDF
          </button>
        </div>
        <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 leading-snug">
          💡 <strong>Per non vedere più questo messaggio:</strong> clicca sull&apos;icona{' '}
          <strong>Pop-up bloccato</strong> a destra nella barra degli indirizzi di Chrome e
          seleziona <em>&quot;Consenti sempre pop-up e reindirizzamenti da questo sito&quot;</em>{' '}
          (oppure tieni premuto <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Cmd</kbd> /{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Ctrl</kbd> quando clicchi nel
          PDF).
        </div>
      </div>
    </div>
  );
}
