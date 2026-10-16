'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSentOrder } from '@/app/actions/order';

export default function DeleteSentOrderButton({ 
  orderId, 
  redirectUrl = '/account/sent-orders',
  disabled = false,
  onError
}: { 
  orderId: string, 
  redirectUrl?: string,
  disabled?: boolean,
  onError?: (error: string) => void
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (disabled) return;
    startTransition(async () => {
      const res = await deleteSentOrder(orderId);
      if (res.success) {
        router.push(redirectUrl);
      } else {
        const msg = res.error || 'Impossibile eliminare l\'ordine.';
        if (onError) {
          onError(msg);
        } else {
          alert(msg);
        }
      }
    });
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending || disabled}
      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Eliminazione...' : 'Elimina Ordine'}
    </button>
  );
}
