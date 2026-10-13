'use client';

import { useTransition } from 'react';
import { acceptDraftOrder } from '../../actions/cart';

export default function AcceptDraftButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const res = await acceptDraftOrder(orderId);
      if (!res.success) {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  return (
    <button 
      onClick={handleAccept}
      disabled={isPending}
      className="bg-brand-main text-white px-4 py-2 rounded text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-50"
    >
      {isPending ? 'Attendere...' : 'Approva Preventivo'}
    </button>
  );
}
