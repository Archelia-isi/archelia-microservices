'use client';

import { useEffect } from 'react';

export default function PdfCatalogLinkHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__pdfSplitDone) return;

    const cleanUrl = window.location.pathname;

    // Se la scheda è già stata aperta come nuova scheda (history.length <= 1),
    // puliamo solo il parametro ?from_pdf=1 dall'URL senza fare altro.
    if (window.history.length <= 1) {
      window.history.replaceState(null, '', cleanUrl);
      return;
    }

    // Tentativo immediato all'apertura della pagina (nessun popup/modale grafico).
    try {
      const newWin = window.open(cleanUrl, '_blank');
      if (newWin) {
        (window as any).__pdfSplitDone = true;
        window.history.back();
        return;
      }
    } catch {
      // Ignora eventuale blocco automatico iniziale del browser
    }

    // Nessun pop-up o avviso grafico: al primo clic sulla pagina apre silenziosamente
    // la nuova scheda col prodotto e riporta la scheda precedente al catalogo PDF.
    const handleSilentSplit = () => {
      if ((window as any).__pdfSplitDone) return;
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

    window.addEventListener('click', handleSilentSplit, { capture: true, once: true });
    return () => {
      window.removeEventListener('click', handleSilentSplit, { capture: true });
    };
  }, []);

  return null;
}
