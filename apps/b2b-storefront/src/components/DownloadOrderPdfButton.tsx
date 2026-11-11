'use client';

import React, { useState } from 'react';

interface DownloadOrderPdfButtonProps {
  orderId: string;
  label?: string;
  variant?: 'default' | 'primary' | 'compact' | 'outline';
  className?: string;
}

export default function DownloadOrderPdfButton({
  orderId,
  label,
  variant = 'default',
  className = '',
}: DownloadOrderPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading || !orderId) return;

    setIsDownloading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pdf`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        let msg = 'Impossibile generare il PDF dell’ordine.';
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }

      const disposition = res.headers.get('Content-Disposition') || '';
      const fnMatch = disposition.match(/filename="?([^";]+)"?/i);
      const fallbackName = `Ordine_IZZO_${orderId.slice(-6).toUpperCase()}.pdf`;
      const fileName = fnMatch?.[1] || fallbackName;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error('Errore download PDF ordine:', err);
      alert('Errore di rete durante il download del PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const baseStyles =
    variant === 'compact'
      ? 'px-2.5 py-1 text-xs font-bold rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-800'
      : variant === 'primary'
      ? 'px-5 py-2.5 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
      : variant === 'outline'
      ? 'px-4 py-2 text-sm font-bold rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800'
      : 'px-4 py-2 text-sm font-bold rounded bg-white hover:bg-gray-100 text-gray-900 border border-gray-300';

  const displayLabel = label ?? (variant === 'compact' ? 'Scarica PDF' : 'Scarica PDF');

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      title="Scarica il riepilogo dell'ordine in formato PDF"
      className={`inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-wait ${baseStyles} ${className}`}
    >
      {isDownloading ? (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>{variant === 'compact' ? 'PDF...' : 'Generazione PDF...'}</span>
        </>
      ) : (
        <>
          <svg
            className={`w-4 h-4 shrink-0 ${variant === 'primary' ? 'text-white' : 'text-emerald-700'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>{displayLabel}</span>
        </>
      )}
    </button>
  );
}
