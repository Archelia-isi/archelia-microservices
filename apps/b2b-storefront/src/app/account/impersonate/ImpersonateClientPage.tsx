'use client';

import { useState } from 'react';
import { setImpersonatedClient } from '../../actions/agent';

interface Customer {
  zucchettiCode: string;
  companyName: string;
  vatNumber: string;
  discount: number;
}

export default function ImpersonateClientPage({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [search, setSearch] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSelect = async (c: Customer | null) => {
    setIsPending(true);
    if (c) {
      await setImpersonatedClient(c.zucchettiCode, c.companyName, c.discount);
    } else {
      await setImpersonatedClient(null, null, null);
    }
    window.location.href = '/';
  };

  const filtered = initialCustomers.filter(c => 
    c.companyName.toLowerCase().includes(search.toLowerCase()) || 
    c.zucchettiCode.toLowerCase().includes(search.toLowerCase()) ||
    c.vatNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Cerca Cliente</label>
        <input 
          type="text" 
          placeholder="Cerca per nome, codice o P.IVA..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-main"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => !isPending && handleSelect(null)}
          className={`p-4 border rounded-lg cursor-pointer transition-colors \${isPending ? 'opacity-50' : 'hover:border-red-500 hover:bg-red-50'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div>
              <div className="font-bold text-red-600">Nessun Cliente</div>
              <div className="text-sm text-gray-500">Esci dalla modalità impersonificazione</div>
            </div>
          </div>
        </div>

        {filtered.map(c => (
          <div 
            key={c.zucchettiCode}
            onClick={() => !isPending && handleSelect(c)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors \${isPending ? 'opacity-50' : 'hover:border-brand-main hover:bg-gray-50'}`}
          >
            <div className="font-bold text-gray-900 text-lg mb-1">{c.companyName}</div>
            <div className="text-sm text-gray-500 flex justify-between">
              <span>Codice: {c.zucchettiCode}</span>
              <span>P.IVA: {c.vatNumber}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500">
            Nessun cliente trovato con i termini di ricerca attuali.
          </div>
        )}
      </div>
    </div>
  );
}
