'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getAvailableStock } from '@/lib/stock';

interface AddToCartBoxProps {
  product: any;
  isLoggedIn: boolean;
}

export default function AddToCartBox({ product, isLoggedIn, storeMode = 'ZUCCHETTI' }: AddToCartBoxProps & { storeMode?: 'ZUCCHETTI' | 'ELMARK' }) {
  const [quantity, setQuantity] = useState<number | string>(1);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [serverOverStock, setServerOverStock] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxStock = getAvailableStock(product, storeMode);
  const numericQty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10) || 0;
  const isOverStock = numericQty > maxStock || serverOverStock;

  const triggerStockWarning = (msg: string) => {
    setStockWarning(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setStockWarning(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  const decreaseQuantity = () => {
    setServerOverStock(false);
    if (numericQty > 1) {
      const next = numericQty - 1;
      setQuantity(next);
      if (next <= maxStock) {
        setStockWarning(null);
      }
    }
  };

  const increaseQuantity = () => {
    setServerOverStock(false);
    const next = (numericQty || 0) + 1;
    setQuantity(next);
    if (next > maxStock) {
      triggerStockWarning(
        maxStock <= 0
          ? 'Giacenza superata! Prodotto esaurito (0 pz disponibili).'
          : `Giacenza superata! Disponibili max ${maxStock} pz.`
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServerOverStock(false);
    const raw = e.target.value;
    if (raw === '') {
      setQuantity('');
      setStockWarning(null);
      return;
    }
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      setQuantity(val);
      if (val > maxStock) {
        triggerStockWarning(
          maxStock <= 0
            ? 'Giacenza superata! Prodotto esaurito (0 pz disponibili).'
            : `Giacenza superata! Disponibili max ${maxStock} pz.`
        );
      } else {
        setStockWarning(null);
      }
    }
  };

  const handleBlur = () => {
    if (quantity === '' || isNaN(numericQty) || numericQty < 1) {
      setQuantity(1);
    }
  };


  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      setErrorMessage("Devi accedere per poter aggiungere prodotti all'ordine.");
      setShowErrorModal(true);
      return;
    }

    const qtyToAdd = numericQty >= 1 ? numericQty : 1;
    if (qtyToAdd > maxStock) {
      triggerStockWarning(
        maxStock <= 0
          ? 'Giacenza superata! Prodotto esaurito (0 pz disponibili).'
          : `Giacenza superata! Disponibili max ${maxStock} pz.`
      );
      return;
    }
    
    setIsPending(true);
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: product.sku, quantity: qtyToAdd })
      });
      const res = await response.json();
      if (res.success) {
        // Optimistic UI update
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: res.cartItemCount } }));
        setQuantity(1);
        setStockWarning(null);
        setServerOverStock(false);
      } else if (res.stockExceeded) {
        setServerOverStock(true);
        triggerStockWarning(res.error || `Giacenza superata! Disponibili max ${maxStock} pz.`);
      } else {
        setErrorMessage(res.error || 'Errore sconosciuto');
        setShowErrorModal(true);
      }
    } catch {
      setErrorMessage('Errore di connessione');
      setShowErrorModal(true);
    } finally {
      setIsPending(false);
    }
  };

  const hasDiscount = isLoggedIn && product.originalPriceB2b && product.price_b2b < product.originalPriceB2b;
  const discountPercentage = hasDiscount ? Math.round((1 - (product.price_b2b / product.originalPriceB2b)) * 100) : 0;

  return (
    <>
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
            <Link prefetch={true} href="/login" className="text-brand-main underline">Accedi</Link> per visualizzare i prezzi
          </div>
        )}
        
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium mb-1">Disponibilità Magazzino</p>
          {storeMode === 'ELMARK' ? (
            product.stock > 0 ? (
              <p className="text-brand-main font-bold text-sm leading-tight mb-0.5">{product.stock} PZ spedito entro 7 giorni</p>
            ) : (
              <p className="text-orange-500 font-bold text-sm leading-tight">In arrivo</p>
            )
          ) : (
            <>
              {(product.stock_main > 0 || (!('stock_main' in product) && product.stock > 0)) && (
                <p className="text-brand-main font-bold text-sm leading-tight mb-0.5">{product.stock_main ?? product.stock} PZ spedito entro 2 giorni</p>
              )}
              {product.stock_ek > 0 && (
                <p className="text-blue-600 font-bold text-sm leading-tight mb-0.5">{product.stock_ek} PZ spedito entro 7 giorni</p>
              )}
              {!(product.stock_main > 0) && !(product.stock_ek > 0) && (!('stock_main' in product) && !(product.stock > 0) || ('stock_main' in product)) && (
                <p className="text-orange-500 font-bold text-sm leading-tight">In arrivo</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className={`relative flex items-center w-full sm:w-32 bg-white border rounded transition-colors ${isOverStock ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
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
            className={`w-full h-12 text-center font-bold border-x focus:outline-none transition-colors ${
              isOverStock
                ? 'text-red-600 border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'text-gray-900 border-gray-300 focus:border-brand-main focus:ring-1 focus:ring-[#00C800]'
            }`}
          />
          <button 
            type="button"
            onClick={increaseQuantity}
            className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >+</button>
        </div>
          <button 
            onClick={handleAddToCart}
            disabled={isPending || numericQty < 1}
            className={`flex-1 h-12 rounded flex items-center justify-center font-bold text-lg transition-colors ${
              isOverStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900 disabled:bg-gray-300'
            }`}
          >
            {isPending ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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

      {stockWarning && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded animate-pulse">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{stockWarning}</span>
        </div>
      )}
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
                  <img 
                    src={product.image_url || '/placeholder.png'} 
                    alt={product.title} 
                    className="object-contain w-full h-full p-1"
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
                  <button type="button" onClick={decreaseQuantity} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-l">-</button>
                  <span className="text-base font-bold select-none">{quantity}</span>
                  <button type="button" onClick={increaseQuantity} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-r">+</button>
                </div>
                <button 
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isPending}
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
