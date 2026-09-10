'use client';

import { useTransition } from 'react';
import { acceptDraftOrder } from '../../actions/cart';

export default function AcceptDraftButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    if (!confirm('Vuoi approvare e confermare questo preventivo? Verrà inviato come ordine definitivo.')) {
      return;
    }
    
    startTransition(async () => {
      const res = await acceptDraftOrder(orderId);
      if (!res.success) {
        alert(`Errore: ${res.error}`);
      } else {
        alert('Preventivo approvato con successo!');
      }
    });
  };

  return (
    <button 
      onClick={handleAccept}
      disabled={isPending}
      className="bg-[#00C800] text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Attendere...' : 'Approva Preventivo'}
    </button>
  );
}
