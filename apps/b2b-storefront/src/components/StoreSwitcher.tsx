'use client';

import { useState } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function StoreSwitcher({ currentMode }: { currentMode: 'ZUCCHETTI' | 'ELMARK' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSwitch = async (mode: 'ZUCCHETTI' | 'ELMARK') => {
    setIsPending(true);
    setIsOpen(false);
    await setStoreMode(mode);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold bg-white/10 hover:bg-white/20 transition-colors border border-white/20 disabled:opacity-50"
      >
        <span>{currentMode === 'ZUCCHETTI' ? 'Izzo Distribuzione' : 'Catalogo Elmark'}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <button 
            onClick={() => handleSwitch('ZUCCHETTI')}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentMode === 'ZUCCHETTI' ? 'font-bold text-gray-900' : 'text-gray-700'}`}
          >
            Acquista su Izzo Distribuzione
          </button>
          <button 
            onClick={() => handleSwitch('ELMARK')}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentMode === 'ELMARK' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
          >
            Acquista da Elmark
          </button>
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
      )}
    </div>
  );
}
