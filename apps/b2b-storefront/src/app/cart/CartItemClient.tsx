'use client';

import { useState, useTransition, useEffect, useRef } from 'react';

import Link from 'next/link';
import { updateCartItemQuantity, removeFromCart } from '../actions/cart';

export default function CartItemClient({ item }: { item: any }) {
  const [isPending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState<number | string>(item.quantity);
  const isFirstRender = useRef(true);

  if (!item.product) {
    return (
      <div className="grid grid-cols-12 gap-4 p-4 items-center">
        <div className="col-span-12 text-gray-500">
          Prodotto {item.sku} non più disponibile.
          <button onClick={() => startTransition(() => { removeFromCart(item.id); })} className="text-red-500 ml-4 hover:underline">Rimuovi</button>
        </div>
      </div>
    );
  }

  const p = item.product;
  const parsedQuantity = parseInt(String(localQuantity)) || 1;
  const total = item.finalPrice * parsedQuantity;

  // Sincronizza se il prop esterno cambia
  useEffect(() => {
    if (!isPending) {
      setLocalQuantity(item.quantity);
    }
  }, [item.quantity, isPending]);

  // Effetto Debounce per aggiornare il backend dopo 600ms dall'ultimo tocco/digitazione
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    let newQty = parseInt(String(localQuantity));
    if (isNaN(newQty)) return; // Ignora se il campo è momentaneamente vuoto
    
    if (newQty < 1) newQty = 1;
    if (newQty > (p.stock || 9999)) newQty = p.stock || 9999;

    if (newQty !== item.quantity) {
      const timer = setTimeout(() => {
        startTransition(() => {
          updateCartItemQuantity(item.id, newQty);
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [localQuantity, item.id, item.quantity, p.stock]);

  const handleIncrement = () => {
    let current = parseInt(String(localQuantity)) || 0;
    if (current >= p.stock) return;
    setLocalQuantity(current + 1);
  };

  const handleDecrement = () => {
    let current = parseInt(String(localQuantity)) || 0;
    if (current <= 1) return;
    setLocalQuantity(current - 1);
  };

  const handleBlur = () => {
    let newQty = parseInt(String(localQuantity));
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    if (newQty > (p.stock || 9999)) newQty = p.stock || 9999;
    setLocalQuantity(newQty);
  };

  return (
    <div className={`grid grid-cols-12 gap-4 p-4 items-center ${isPending ? 'opacity-70' : ''} transition-opacity`}>
      <div className="col-span-12 sm:col-span-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
          <img src={p.imageUrl} alt={p.title} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col">
          <Link href={`/product/${p.sku}`} className="font-bold text-sm text-gray-900 hover:text-[#00C800] line-clamp-2">
            {p.title}
          </Link>
          <span className="text-xs text-gray-500 font-mono mt-1">SKU: {p.sku}</span>
          {p.stock > 0 ? (
            <span className="text-xs text-[#00C800] mt-1">Disponibile ({p.stock})</span>
          ) : (
            <span className="text-xs text-orange-500 mt-1">In arrivo</span>
          )}
        </div>
      </div>
      
      <div className="col-span-4 sm:col-span-2 flex items-center justify-center">
        <div className="flex items-center border border-gray-300 rounded overflow-hidden">
          <button 
            onClick={handleDecrement}
            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
          >-</button>
          <input 
            type="number"
            value={localQuantity}
            onChange={(e) => setLocalQuantity(e.target.value)}
            onBlur={handleBlur}
            className="w-10 h-8 text-center text-sm font-medium border-x border-gray-300 outline-none"
            min="1"
            max={p.stock}
          />
          <button 
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
          >+</button>
        </div>
      </div>
      
      <div className="col-span-4 sm:col-span-2 text-right">
        {item.originalPrice > item.finalPrice && (
          <div className="flex items-center justify-end gap-1 mb-0.5">
            <span className="text-[10px] text-gray-400 line-through">
              € {item.originalPrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
              -{Math.round((1 - (item.finalPrice / item.originalPrice)) * 100)}%
            </span>
          </div>
        )}
        <div className="font-medium text-sm">€ {item.finalPrice.toFixed(2).replace('.', ',')}</div>
        <div className="text-xs text-gray-400">/ {p.unit}</div>
      </div>
      
      <div className="col-span-4 sm:col-span-2 flex flex-col items-end justify-center gap-2">
        <div className="font-bold text-gray-900">€ {total.toFixed(2).replace('.', ',')}</div>
        <button 
          onClick={() => startTransition(() => { removeFromCart(item.id); })}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Rimuovi
        </button>
      </div>
    </div>
  );
}
