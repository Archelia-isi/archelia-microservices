'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSentOrder } from '@/app/actions/order';

export default function DeleteSentOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questo ordine inviato? L\'operazione è irreversibile.')) return;
    
    startTransition(async () => {
      const res = await deleteSentOrder(orderId);
      if (res.success) {
        router.push('/account/sent-orders');
      } else {
        alert(res.error || 'Errore durante l\'eliminazione');
      }
    });
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm rounded transition-colors disabled:opacity-50"
    >
      {isPending ? 'Eliminazione...' : 'Elimina Ordine'}
    </button>
  );
}
