'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSavedOrder } from '@/app/actions/order';

export default function SendSavedOrderButton({ orderId, className }: { orderId: string, className?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSend = () => {
    startTransition(async () => {
      const res = await sendSavedOrder(orderId);
      if (res.success) {
        router.refresh();
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  return (
    <button
      onClick={handleSend}
      disabled={isPending}
      className={className || "px-4 py-2 bg-green-600 text-white hover:bg-green-700 font-bold text-sm rounded transition-colors disabled:opacity-50"}
    >
      {isPending ? 'Invio...' : 'Invia Ordine'}
    </button>
  );
}
