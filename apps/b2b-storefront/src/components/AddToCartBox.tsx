'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { addToCart } from '../app/actions/cart';

interface AddToCartBoxProps {
  product: any;
  isLoggedIn: boolean;
}

export default function AddToCartBox({ product, isLoggedIn }: AddToCartBoxProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setQuantity(val);
    } else if (e.target.value === '') {
      // allow clearing the input temporarily
      setQuantity(e.target.value as unknown as number);
    }
  };

  const handleBlur = () => {
    if (typeof quantity !== 'number' || quantity < 1 || isNaN(quantity)) {
      setQuantity(1);
    }
  };

  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      alert("Devi accedere per poter aggiungere prodotti all'ordine.");
      return;
    }
    
    startTransition(async () => {
      const res = await addToCart(product.sku, quantity);
      if (res.success) {
        // Optimistic UI update
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: res.cartItemCount } }));
        setIsSuccess(true);
        setQuantity(1);
        
        setTimeout(() => {
          setIsSuccess(false);
        }, 2000);
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  const hasDiscount = isLoggedIn && product.originalPriceB2b && product.price_b2b < product.originalPriceB2b;
  const discountPercentage = hasDiscount ? Math.round((1 - (product.price_b2b / product.originalPriceB2b)) * 100) : 0;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm sticky top-24">
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">Prezzo Riservato B2B</div>
        {isLoggedIn ? (
          <>
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400 line-through">
                  € {product.originalPriceB2b.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  -{discountPercentage}%
                </span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-gray-900">
                € {Number(product.price_b2b || 0).toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-gray-500 mb-1">/ {product.unit}</div>
            </div>
          </>
        ) : (
          <div className="text-sm font-medium text-gray-500 mt-2">
            <Link prefetch={true} href="/login" className="text-[#00C800] underline">Accedi</Link> per visualizzare i prezzi
          </div>
        )}
        
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium mb-1">Disponibilità Magazzino</p>
          {product.stock > 0 ? (
            <p className="text-[#00C800] font-bold">{product.stock} PZ in pronta consegna</p>
          ) : (
            <p className="text-orange-500 font-bold">In arrivo</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex items-center w-full sm:w-32 bg-white border border-gray-300 rounded">
          <button 
            type="button"
            onClick={decreaseQuantity}
            className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >-</button>
          <input 
            type="number" 
            value={quantity}
            onChange={handleInputChange}
            onBlur={handleBlur}
            min={1} 
            className="w-full h-12 text-center font-bold text-gray-900 border-x border-gray-300 focus:outline-none focus:border-[#00C800] focus:ring-1 focus:ring-[#00C800]"
          />
          <button 
            type="button"
            onClick={increaseQuantity}
            className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >+</button>
        </div>
          <button 
            onClick={handleAddToCart}
            disabled={isPending || quantity < 1}
            className={`flex-1 h-12 rounded flex items-center justify-center font-bold text-lg transition-colors ${
              isSuccess 
                ? 'bg-green-600 text-white' 
                : 'bg-black text-white hover:bg-gray-900 disabled:bg-gray-300'
            }`}
          >
            {isPending ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isSuccess ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aggiunto
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Aggiungi all'Ordine
              </span>
            )}
          </button>
      </div>
    </div>
  );
}
