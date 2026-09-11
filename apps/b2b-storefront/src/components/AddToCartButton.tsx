'use client';

import { useTransition, useState } from 'react';
import { addToCart } from '../app/actions/cart';
import Image from 'next/image';

export default function AddToCartButton({ 
  product, 
  isLoggedIn,
  className,
  text = 'Aggiungi',
  disabled = false
}: { 
  product: any, 
  isLoggedIn: boolean,
  className?: string,
  text?: string,
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const increment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(prev => prev + 1);
  };

  const decrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isLoggedIn) {
      setErrorMessage("Devi accedere per poter aggiungere prodotti all'ordine.");
      setShowErrorModal(true);
      return;
    }
    
    startTransition(async () => {
      const res = await addToCart(product.sku, quantity);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: res.cartItemCount } }));
        setQuantity(1);
        setShowErrorModal(false);
      } else {
        setErrorMessage(res.error || 'Errore sconosciuto');
        setShowErrorModal(true);
      }
    });
  };

  const hasDiscount = isLoggedIn && product.originalPriceB2b && product.price_b2b < product.originalPriceB2b;
  const discountPercentage = hasDiscount ? Math.round((1 - (product.price_b2b / product.originalPriceB2b)) * 100) : 0;

  return (
    <>
      <div className="flex flex-col gap-2 w-full mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <div className="flex gap-2 w-full h-10">
          <div className="flex items-center justify-between border border-gray-300 rounded w-24 bg-white">
            <button type="button" onClick={decrement} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-l">-</button>
            <span className="text-sm font-bold select-none">{quantity}</span>
            <button type="button" onClick={increment} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-r">+</button>
          </div>
          <button 
            type="button"
            onClick={handleAddToCart}
            disabled={isPending || disabled}
            className={`flex-1 bg-black text-white hover:bg-brand-main transition-colors font-bold text-xs rounded flex items-center justify-center gap-1 ${isPending || disabled ? 'bg-gray-400 cursor-not-allowed opacity-80' : ''} ${className || ''}`}
          >
            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {text}
          </button>
        </div>
      </div>

      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowErrorModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden relative" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
            <button 
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="p-5">
              <h3 className="text-red-600 font-bold text-lg mb-4 text-center">Impossibile Aggiungere</h3>
              <p className="text-sm text-gray-600 mb-6 text-center">{errorMessage}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20 bg-gray-50 border border-gray-100 rounded flex-shrink-0">
                  <Image 
                    src={product.image_url || '/placeholder.png'} 
                    alt={product.title} 
                    fill 
                    className="object-contain p-1"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{product.original_name || product.title}</h4>
                  {hasDiscount ? (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 line-through">€ {product.originalPriceB2b.toFixed(2)}</span>
                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{discountPercentage}%</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 leading-none">€ {product.price_b2b?.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">€ {product.price_b2b?.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 h-12">
                <div className="flex items-center justify-between border border-gray-300 rounded w-28 bg-white">
                  <button type="button" onClick={decrement} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-l">-</button>
                  <span className="text-base font-bold select-none">{quantity}</span>
                  <button type="button" onClick={increment} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-r">+</button>
                </div>
                <button 
                  type="button"
                  onClick={() => handleAddToCart()}
                  disabled={isPending || disabled}
                  className="flex-1 bg-black text-white hover:bg-brand-main transition-colors font-bold text-sm rounded shadow-md"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
