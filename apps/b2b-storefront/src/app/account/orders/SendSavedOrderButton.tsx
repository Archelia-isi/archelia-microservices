'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSavedOrder } from '@/app/actions/order';

export default function SendSavedOrderButton({ orderId, className }: { orderId: string, className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSend = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await sendSavedOrder(orderId);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Errore durante l\'invio');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={isPending}
        className={className || "px-4 py-2 bg-green-600 text-white hover:bg-green-700 font-bold text-sm rounded transition-colors disabled:opacity-50"}
      >
        {isPending ? 'Invio...' : 'Invia Ordine'}
      </button>
      {errorMsg && (
        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
