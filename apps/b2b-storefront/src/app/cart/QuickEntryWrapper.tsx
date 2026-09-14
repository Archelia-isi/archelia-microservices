'use client';

import { useState } from 'react';
import QuickEntryModal from './QuickEntryModal';

export default function QuickEntryWrapper({
  userDiscount = 0,
  extraDiscount = 0,
  elmarkDiscounts = {},
  storeMode = 'ZUCCHETTI'
}: {
  userDiscount?: number,
  extraDiscount?: number,
  elmarkDiscounts?: Record<string, number>,
  storeMode?: 'ZUCCHETTI' | 'ELMARK'
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-bold rounded shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Inserimento Rapido (Excel)
      </button>

      {isOpen && (
        <QuickEntryModal
          onClose={() => setIsOpen(false)}
          userDiscount={userDiscount}
          extraDiscount={extraDiscount}
          elmarkDiscounts={elmarkDiscounts}
          storeMode={storeMode}
        />
      )}
    </>
  );
}
