'use client';

import { useState, useTransition } from 'react';
import { addQuickItemToOrder } from '@/app/actions/order';

export default function QuickAddOrderClient({ orderId }: { orderId: string }) {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) return;

    startTransition(async () => {
      const res = await addQuickItemToOrder(orderId, sku.trim(), quantity);
      if (res.success) {
        setSku('');
        setQuantity(1);
      } else {
        alert(res.error || 'Errore durante l\'aggiunta del prodotto');
      }
    });
  };

  return (
    <div className="p-6 bg-white border-b border-gray-200">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Aggiunta Rapida per Codice (SKU)
      </h3>
      
      <form onSubmit={handleAdd} className="flex gap-4">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Es. E1.12345"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            disabled={isPending}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-brand-main focus:border-transparent outline-none"
          />
        </div>
        <div className="w-24">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            disabled={isPending}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-brand-main focus:border-transparent outline-none text-center"
          />
        </div>
        <button
          type="submit"
          disabled={!sku.trim() || isPending}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded transition-colors disabled:opacity-50"
        >
          {isPending ? 'Attendere...' : 'AGGIUNGI'}
        </button>
      </form>
    </div>
  );
}
