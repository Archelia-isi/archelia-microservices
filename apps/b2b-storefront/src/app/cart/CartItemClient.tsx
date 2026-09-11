'use client';

import { useState, useTransition, useEffect, useRef } from 'react';

import Link from 'next/link';
import { updateCartItemQuantity, removeFromCart, updateCartItemExtraDiscount } from '../actions/cart';

export default function CartItemClient({ item, isAgent = false }: { item: any, isAgent?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState<number | string>(item.quantity);
  const [localExtraDiscount, setLocalExtraDiscount] = useState<number | string>(item.extraDiscount || 0);
  const [showModal, setShowModal] = useState({ show: false, newQty: 0, minQty: 0 });
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
      setLocalExtraDiscount(item.extraDiscount || 0);
    }
  }, [item.quantity, item.extraDiscount, isPending]);

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

    let newDiscount = parseFloat(String(localExtraDiscount));
    if (isNaN(newDiscount) || newDiscount < 0) newDiscount = 0;

    if (newQty !== item.quantity || newDiscount !== (item.extraDiscount || 0)) {
      // Se il cliente sta diminuendo la quantità e ha uno sconto extra applicato
      const minQty = item.extraDiscountMinQty || item.quantity;
      if (newQty < minQty && (item.extraDiscount || 0) > 0 && !isAgent) {
        setShowModal({ show: true, newQty, minQty });
        return;
      }

      const timer = setTimeout(() => {
        startTransition(() => {
          if (newQty !== item.quantity) updateCartItemQuantity(item.id, newQty, false);
          if (newDiscount !== (item.extraDiscount || 0) && isAgent) updateCartItemExtraDiscount(item.id, newDiscount);
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [localQuantity, localExtraDiscount, item.id, item.quantity, item.extraDiscount, p.stock, isAgent]);

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

  const handleDiscountBlur = () => {
    let newDisc = parseFloat(String(localExtraDiscount));
    if (isNaN(newDisc) || newDisc < 0) newDisc = 0;
    setLocalExtraDiscount(newDisc);
  };

  const confirmModal = () => {
    const qty = showModal.newQty;
    setShowModal({ show: false, newQty: 0, minQty: 0 });
    startTransition(() => {
      // Pass true for resetExtraDiscount
      updateCartItemQuantity(item.id, qty, true);
    });
  };

  const cancelModal = () => {
    setShowModal({ show: false, newQty: 0, minQty: 0 });
    setLocalQuantity(item.quantity);
  };

  return (
    <>
    <div className={`grid grid-cols-12 gap-4 p-4 items-center ${isPending ? 'opacity-70' : ''} transition-opacity`}>
      <div className="col-span-12 sm:col-span-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
          <img src={p.imageUrl} alt={p.title} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col">
          <Link prefetch={true} href={`/product/${p.sku}`} className="font-bold text-sm text-gray-900 hover:text-brand-main line-clamp-2">
            {p.title}
          </Link>
          <span className="text-[10px] text-gray-500 font-mono mt-1 uppercase">CODICE PRODOTTO: {p.sku}</span>
          {p.stock > 0 ? (
            <span className="text-xs text-brand-main mt-1">Disponibile ({p.stock})</span>
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
      
      <div className="col-span-4 sm:col-span-2 text-right flex flex-col items-end">
        {item.originalPrice > (item.basePrice || item.finalPrice) && (
          <div className="flex items-center justify-end gap-1 mb-0.5">
            <span className="text-[10px] text-gray-400 line-through">
              € {item.originalPrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
              -{Math.round((1 - ((item.basePrice || item.finalPrice) / item.originalPrice)) * 100)}%
            </span>
          </div>
        )}
        
        {item.basePrice > item.finalPrice && (
          <div className="flex items-center justify-end gap-1 mb-0.5">
            <span className="text-[11px] text-gray-500 line-through">
              € {item.basePrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1 rounded">
              -{Math.round((1 - (item.finalPrice / item.basePrice)) * 100)}% Extra
            </span>
          </div>
        )}

        <div className="font-bold text-sm text-gray-900">€ {item.finalPrice.toFixed(2).replace('.', ',')}</div>
        <div className="text-xs text-gray-400">/ {p.unit}</div>
        
        {isAgent && (
          <div className="mt-2 flex items-center justify-end gap-1 text-xs">
            <span className="text-yellow-700 font-medium text-[10px]">Extra:</span>
            <input 
              type="number"
              value={localExtraDiscount}
              onChange={(e) => setLocalExtraDiscount(e.target.value)}
              onBlur={handleDiscountBlur}
              className="w-12 h-6 text-center text-[11px] border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
              min="0"
              max="99"
            />
            <span className="text-yellow-700 text-[10px]">%</span>
          </div>
        )}
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

    {showModal.show && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Attenzione: Sconto Extra a Rischio
            </h3>
          </div>
          <div className="p-5 text-sm text-gray-700">
            <p>Lo sconto extra attualmente applicato su questo prodotto è stato approvato dall'agente per la quantità <strong>{showModal.minQty}</strong> o superiore.</p>
            <p className="mt-3 text-red-600 font-medium">Se procedi diminuendo la quantità a {showModal.newQty}, l'intero sconto extra su questo prodotto verrà annullato.</p>
            <p className="mt-3 text-gray-500 text-xs">Sei sicuro di voler continuare?</p>
          </div>
          <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-200">
            <button 
              onClick={cancelModal}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={confirmModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
            >
              Continua (Perdi sconto)
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
