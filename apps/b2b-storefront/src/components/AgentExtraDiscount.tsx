'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAgentExtraDiscount } from '../app/actions/agentDiscount';
import { massUpdateCartExtraDiscount } from '../app/actions/cart';

export default function AgentExtraDiscount({ initialDiscount = 0 }: { initialDiscount?: number }) {
  const [discount, setDiscount] = useState<number | string>(initialDiscount);
  const router = useRouter();

  const handleApply = async () => {
    const val = parseFloat(String(discount));
    if (!isNaN(val) && val >= 0) {
      await setAgentExtraDiscount(val);
      await massUpdateCartExtraDiscount(val);
      router.refresh();
    }
  };

  const handleClear = async () => {
    setDiscount(0);
    await setAgentExtraDiscount(0);
    await massUpdateCartExtraDiscount(0);
    router.refresh();
  };

  return (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-yellow-900">Area Agente: Sconto Extra</h3>
        <p className="text-sm text-yellow-800">Questo sconto si somma a cascata allo sconto base del cliente.</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input 
            type="number" 
            min="0"
            max="99"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-24 pl-3 pr-8 py-2 border rounded text-right focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-500">%</span>
        </div>
        <button 
          onClick={handleApply}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Applica
        </button>
        {Number(discount) > 0 && (
          <button 
            onClick={handleClear}
            className="text-red-500 font-bold hover:underline"
          >
            Rimuovi
          </button>
        )}
      </div>
    </div>
  );
}
