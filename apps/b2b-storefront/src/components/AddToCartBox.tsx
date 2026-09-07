'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AddToCartBoxProps {
  product: any;
  isLoggedIn: boolean;
}

export default function AddToCartBox({ product, isLoggedIn }: AddToCartBoxProps) {
  const [quantity, setQuantity] = useState(1);

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

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      alert("Devi accedere per poter aggiungere prodotti all'ordine.");
      return;
    }
    // TODO: Implement cart logic
    alert(`Aggiunti ${quantity} ${product.unit || 'PZ'} al carrello!`);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
      <div className="flex items-end justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">Prezzo Riservato B2B</p>
          <div className="text-3xl font-bold text-gray-900">
            {isLoggedIn && product.price ? (
              <>
                € {product.price.toFixed(2)}
                <span className="text-xs text-gray-500 font-normal ml-2">/ {product.unit || 'PZ'}</span>
              </>
            ) : (
              <div className="text-sm font-medium text-gray-500 mt-2">
                <Link href="/login" className="text-[#00C800] underline">Accedi</Link> per visualizzare i prezzi
              </div>
            )}
          </div>
        </div>
        
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
          className="flex-1 bg-black text-white hover:bg-[#00C800] transition-colors font-bold text-sm h-12 rounded flex items-center justify-center gap-2 shadow-lg shadow-black/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Aggiungi all'Ordine
        </button>
      </div>
    </div>
  );
}
