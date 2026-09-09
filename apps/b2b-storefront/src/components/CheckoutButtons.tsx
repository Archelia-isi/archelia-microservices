'use client';

import { useState, useTransition } from 'react';
import { checkoutCart } from '../app/actions/checkout';
import { useRouter } from 'next/navigation';

export default function CheckoutButtons({ isAgent, isImpersonating }: { isAgent: boolean, isImpersonating: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCheckout = (action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART') => {
    if (action === 'SEND_TO_ZUCCHETTI') {
      if (!confirm('Sei sicuro di voler confermare e inviare questo ordine?')) return;
    } else {
      if (!confirm('Vuoi mettere in pausa questo ordine? Il cliente riceverà una notifica per completarlo.')) return;
    }

    startTransition(async () => {
      const res = await checkoutCart(action);
      if (res.success) {
        alert(action === 'PAUSE_CART' ? 'Ordine salvato in pausa con successo!' : 'Ordine inviato con successo!');
        router.push('/');
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  if (isAgent) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button 
          disabled={isPending}
          onClick={() => handleCheckout('PAUSE_CART')}
          className="bg-gray-200 text-black px-6 py-3 rounded font-bold hover:bg-gray-300 transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          {isPending ? 'Attendere...' : 'Metti in Pausa (Preventivo)'}
        </button>
        
        <button 
          disabled={isPending || !isImpersonating}
          onClick={() => handleCheckout('SEND_TO_ZUCCHETTI')}
          className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-[#00C800] transition-colors w-full sm:w-auto disabled:opacity-50"
          title={!isImpersonating ? "Devi impersonare un cliente per inviare l'ordine" : ""}
        >
          {isPending ? 'Attendere...' : 'Invia Ordine'}
        </button>
      </div>
    );
  }

  // Normal User
  return (
    <button 
      disabled={isPending}
      onClick={() => handleCheckout('SEND_TO_ZUCCHETTI')}
      className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-[#00C800] transition-colors w-full sm:w-auto disabled:opacity-50"
    >
      {isPending ? 'Elaborazione...' : 'Invia Ordine (Revisione Agente)'}
    </button>
  );
}
