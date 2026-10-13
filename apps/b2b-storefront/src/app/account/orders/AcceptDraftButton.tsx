'use client';

import { useState, useTransition } from 'react';
import { acceptDraftOrder } from '../../actions/cart';

export default function AcceptDraftButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await acceptDraftOrder(orderId);
      if (!res.success) {
        setErrorMsg(res.error || 'Errore durante l\'approvazione del preventivo');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button 
        onClick={handleAccept}
        disabled={isPending}
        className="bg-brand-main text-white px-4 py-2 rounded text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-50"
      >
        {isPending ? 'Attendere...' : 'Approva Preventivo'}
      </button>
      {errorMsg && (
        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
