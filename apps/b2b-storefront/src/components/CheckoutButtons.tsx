'use client';

import { useState, useTransition } from 'react';
import { checkoutCart } from '../app/actions/checkout';
import { useRouter } from 'next/navigation';

export default function CheckoutButtons({ isAgent, isImpersonating }: { isAgent: boolean, isImpersonating: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCheckout = (action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART' | 'SAVE_ORDER') => {
    if (action === 'SEND_TO_ZUCCHETTI') {
      if (!confirm('Sei sicuro di voler confermare e inviare questo ordine?')) return;
    } else if (action === 'SAVE_ORDER') {
      if (!confirm('Vuoi salvare questo ordine nella tua area privata? Potrai modificarlo o inviarlo in seguito.')) return;
    } else {
      if (!confirm('Vuoi mettere in pausa questo ordine? Il cliente riceverà una notifica per completarlo.')) return;
    }

    startTransition(async () => {
      const res = await checkoutCart(action);
      if (res.success) {
        if (action === 'SAVE_ORDER') {
          alert('Ordine salvato con successo! Lo trovi nella sezione "Ordini Salvati".');
        } else if (action === 'PAUSE_CART') {
          alert('Ordine salvato in pausa con successo!');
        } else {
          alert('Ordine inviato con successo!');
        }
        router.refresh();
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  if (isAgent) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button 
          disabled={isPending || !isImpersonating}
          onClick={() => handleCheckout('PAUSE_CART')}
          className="bg-gray-200 text-black px-6 py-3 rounded font-bold hover:bg-gray-300 transition-colors w-full sm:w-auto disabled:opacity-50"
          title={!isImpersonating ? "Devi impersonare un cliente per mettere in pausa" : ""}
        >
          {isPending ? 'Attendere...' : 'Metti in Pausa (Preventivo)'}
        </button>
        
        <button 
          disabled={isPending || !isImpersonating}
          onClick={() => handleCheckout('SEND_TO_ZUCCHETTI')}
          className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-brand-main transition-colors w-full sm:w-auto disabled:opacity-50"
          title={!isImpersonating ? "Devi impersonare un cliente per inviare l'ordine" : ""}
        >
          {isPending ? 'Attendere...' : 'Invia Ordine'}
        </button>
      </div>
    );
  }

  // Normal User
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      <button 
        disabled={isPending}
        onClick={() => handleCheckout('SAVE_ORDER')}
        className="bg-gray-100 text-gray-800 border border-gray-300 px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        {isPending ? 'Attendere...' : 'Salva Ordine'}
      </button>

      <button 
        disabled={isPending}
        onClick={() => handleCheckout('SEND_TO_ZUCCHETTI')}
        className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-brand-main transition-colors w-full sm:w-auto disabled:opacity-50"
      >
        {isPending ? 'Elaborazione...' : 'Invia Ordine (Revisione Agente)'}
      </button>
    </div>
  );
}
