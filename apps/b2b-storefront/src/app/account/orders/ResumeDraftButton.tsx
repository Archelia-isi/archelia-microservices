'use client';

import { useTransition } from 'react';
import { resumeDraftOrder } from '../../actions/cart';

export default function ResumeDraftButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleResume = () => {
    if (!confirm('Vuoi riprendere questo preventivo? Il tuo carrello attuale verrà svuotato e sostituito con i prodotti del preventivo.')) {
      return;
    }
    
    startTransition(async () => {
      const res = await resumeDraftOrder(orderId);
      if (!res.success) {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  return (
    <button 
      onClick={handleResume}
      disabled={isPending}
      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Attendere...' : 'Riprendi Preventivo'}
    </button>
  );
}
