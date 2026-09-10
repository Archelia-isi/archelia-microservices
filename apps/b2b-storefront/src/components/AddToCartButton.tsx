'use client';

import { useTransition, useState } from 'react';
import { addToCart } from '../app/actions/cart';

export default function AddToCartButton({ 
  sku, 
  isLoggedIn,
  className,
  text = 'Aggiungi',
  disabled = false
}: { 
  sku: string, 
  isLoggedIn: boolean,
  className?: string,
  text?: string,
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Devi accedere per poter aggiungere prodotti all'ordine.");
      return;
    }
    
    startTransition(async () => {
      const res = await addToCart(sku, 1);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: res.cartItemCount } }));
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  const defaultClassName = "w-full bg-black text-white hover:bg-[#00C800] transition-colors font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-2";
  const finalClassName = className || defaultClassName;

  return (
    <button 
      onClick={handleAddToCart}
      disabled={isPending || disabled}
      className={`${isPending || disabled ? 'bg-gray-400 cursor-not-allowed opacity-80' : ''} ${isSuccess ? 'bg-green-600 text-white' : finalClassName}`}
    >
      {isPending ? (
        <span>...</span>
      ) : (
        <>
          {!className && !isSuccess && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          {isSuccess ? 'Aggiunto ✓' : text}
        </>
      )}
    </button>
  );
}
