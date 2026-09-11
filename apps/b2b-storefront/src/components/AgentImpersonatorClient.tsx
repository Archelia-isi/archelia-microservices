'use client';

import { useState, useEffect } from 'react';
import { getAgentCustomers, setImpersonatedClient } from '../app/actions/agent';

interface Customer {
  zucchettiCode: string;
  companyName: string;
  vatNumber: string;
  discount: number;
}

export default function AgentImpersonatorClient({ currentCode, currentName }: { currentCode?: string, currentName?: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setIsLoading(true);
    const res = await getAgentCustomers();
    if (res.success && res.customers) {
      setCustomers(res.customers);
    }
    setIsLoading(false);
  };

  const handleSelect = async (c: Customer | null) => {
    setIsOpen(false);
    if (c) {
      await setImpersonatedClient(c.zucchettiCode, c.companyName, c.discount);
    } else {
      await setImpersonatedClient(null, null, null);
    }
    window.location.reload();
  };

  const filtered = customers.filter(c => 
    c.companyName.toLowerCase().includes(search.toLowerCase()) || 
    c.zucchettiCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-bold transition-colors ${
          currentCode ? 'bg-brand-main text-black border-brand-main' : 'bg-transparent text-gray-300 border-gray-600 hover:text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {currentCode ? (
           <span className="truncate max-w-[150px]">{currentName}</span>
        ) : 'Impersonifica'}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-md shadow-xl border border-gray-200 z-50 text-black">
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-bold mb-2">Seleziona Cliente</div>
            <input 
              type="text" 
              placeholder="Cerca cliente..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Caricamento in corso...</div>
            ) : (
              <>
                {currentCode && (
                  <div 
                    onClick={() => handleSelect(null)}
                    className="p-3 border-b border-gray-100 hover:bg-red-50 cursor-pointer text-red-600 text-sm font-bold"
                  >
                    Esci dalla modalità impersonificazione
                  </div>
                )}
                {filtered.map(c => (
                  <div 
                    key={c.zucchettiCode}
                    onClick={() => handleSelect(c)}
                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex flex-col"
                  >
                    <span className="text-sm font-bold">{c.companyName}</span>
                    <span className="text-xs text-gray-500">{c.zucchettiCode} - P.IVA: {c.vatNumber}</span>
                  </div>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <div className="p-4 text-center text-sm text-gray-500">Nessun cliente trovato</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
