'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSentOrder } from '@/app/actions/order';

export default function DeleteSentOrderButton({ 
  orderId, 
  redirectUrl = '/account/sent-orders',
  disabled = false,
  label = 'Elimina Ordine',
  compact = false,
  onError
}: { 
  orderId: string, 
  redirectUrl?: string | null,
  disabled?: boolean,
  label?: string,
  compact?: boolean,
  onError?: (error: string) => void
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (disabled) return;
    startTransition(async () => {
      const res = await deleteSentOrder(orderId);
      if (res.success) {
        if (redirectUrl) {
          router.push(redirectUrl);
        }
        router.refresh();
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
      type="button"
      onClick={handleDelete}
      disabled={isPending || disabled}
      className={`${
        compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
      } bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPending ? 'Eliminazione...' : label}
    </button>
  );
}
