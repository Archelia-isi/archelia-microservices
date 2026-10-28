'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { searchBySkuPrefixClient } from '@/lib/searchClient';
import { addQuickItemToOrder } from '@/app/actions/order';
import { getAvailableStock } from '@/lib/stock';

export default function QuickAddOrderClient({ 
  orderId, 
  storeMode = 'ZUCCHETTI', 
  userDiscount = 0,
  elmarkDiscounts = {}
}: { 
  orderId: string, 
  storeMode?: 'ZUCCHETTI' | 'ELMARK', 
  userDiscount?: number,
  elmarkDiscounts?: Record<string, number>
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number | string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [serverOverStock, setServerOverStock] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    if (!query || !query.trim() || selectedProduct?.sku === query) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const data = await searchBySkuPrefixClient(query, storeMode);
      setResults(data);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedProduct, storeMode]);

  const handleSelect = (product: any) => {
    setSelectedProduct(product);
    setQuery(product.sku);
    setIsOpen(false);
    setQuantity('');
    setServerOverStock(false);
    const avail = getAvailableStock(product, storeMode);
    if (avail <= 0) {
      triggerStockWarning('Giacenza superata! Prodotto esaurito (0 pz disponibili).');
    } else {
      setStockWarning(null);
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const maxStock = selectedProduct ? getAvailableStock(selectedProduct, storeMode) : 0;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setQuantity(valStr);
    setServerOverStock(false);
    setErrorMsg(null);

    if (selectedProduct) {
      const parsed = parseInt(valStr, 10);
      const eff = (valStr.trim() === '' || isNaN(parsed) || parsed < 1) ? 1 : parsed;
      if (eff > maxStock) {
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    let qty = parseInt(String(quantity));
    if (isNaN(qty) || qty < 1) qty = 1;

    if (qty > maxStock) {
      triggerStockWarning(
        maxStock <= 0
          ? 'Giacenza superata! Prodotto esaurito (0 pz disponibili).'
          : `Giacenza superata! Disponibili max ${maxStock} pz.`
      );
      return;
    }
    
    setErrorMsg(null);
    startTransition(async () => {
      const res: any = await addQuickItemToOrder(orderId, selectedProduct.sku, qty);
      if (res.success) {
        setSelectedProduct(null);
        setQuery('');
        setQuantity('');
        setStockWarning(null);
        setServerOverStock(false);
      } else if (res.stockExceeded) {
        setServerOverStock(true);
        triggerStockWarning(res.error || `Giacenza superata! Disponibili max ${maxStock} pz.`);
      } else {
        setErrorMsg(res.error || 'Errore durante l\'aggiunta del prodotto');
      }
    });
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setServerOverStock(false);
    if (selectedProduct && e.target.value !== selectedProduct.sku) {
      setSelectedProduct(null);
      setStockWarning(null);
    }
  };

  const renderStockBadges = (product: any) => {
    if (storeMode === 'ELMARK') {
      return product.stock > 0 ? (
        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-main/10 text-brand-main border border-brand-main/20">
          Giacenza 7GG: {product.stock}
        </span>
      ) : (
        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
          Esaurito (0)
        </span>
      );
    }
    const stockMain = product.stock_main ?? (!('stock_main' in product) ? product.stock : 0);
    const stockEk = product.stock_ek || 0;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {stockMain > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-main/10 text-brand-main border border-brand-main/20">
            Giacenza 2GG: {stockMain}
          </span>
        )}
        {stockEk > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
            Giacenza 7GG: {stockEk}
          </span>
        )}
        {!(stockMain > 0) && !(stockEk > 0) && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
            Esaurito (0)
          </span>
        )}
      </div>
    );
  };

  const getPriceData = (product: any) => {
    if (typeof product.evaluatedPriceB2b === 'number' && typeof product.originalPriceB2b === 'number') {
      const originalPrice = product.originalPriceB2b;
      const finalPrice = product.evaluatedPriceB2b;
      const discountPct =
        typeof product.discountPct === 'number'
          ? product.discountPct
          : originalPrice > 0 && originalPrice > finalPrice
          ? Math.round((1 - finalPrice / originalPrice) * 100)
          : 0;
      const discountLabel = product.discountLabel ? String(product.discountLabel).replace(/^-/, '') : `${discountPct}%`;
      return { originalPrice, finalPrice, discountPct, discountLabel };
    }

    let originalPrice = Number(storeMode === 'ELMARK' ? (product.price || product.price_b2b || 0) : (product.price_b2b || product.price || 0));
    let finalPrice = originalPrice;
    
    if (storeMode === 'ZUCCHETTI' && userDiscount > 0) {
      finalPrice = finalPrice * (1 - (userDiscount / 100));
    } else if (storeMode === 'ELMARK') {
      const discGroup = product.discgroup;
      const stdDisc = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
      if (stdDisc > 0) {
        finalPrice = finalPrice * (1 - (stdDisc / 100));
      }
    }
    const discountPct = originalPrice > 0 && originalPrice > finalPrice ? Math.round((1 - (finalPrice / originalPrice)) * 100) : 0;
    const discountLabel = `${discountPct}%`;
    return { originalPrice, finalPrice, discountPct, discountLabel };
  };

  const selectedPrices = selectedProduct ? getPriceData(selectedProduct) : null;
  const effectiveQty = (() => {
    const raw = typeof quantity === 'string' ? quantity.trim() : quantity;
    const parsed = parseInt(String(raw));
    return (raw === '' || isNaN(parsed) || parsed < 1) ? 1 : parsed;
  })();
  const isOverStock = Boolean(selectedProduct && (effectiveQty > maxStock || serverOverStock));

  return (
    <div className="p-6 bg-white border-b border-gray-200">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Aggiunta Rapida per Codice (SKU)
      </h3>
      
      <form onSubmit={handleAdd} className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="relative flex-grow w-full" ref={dropdownRef}>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Codice Prodotto (SKU)
          </label>
          <input 
            type="text" 
            placeholder="Es. E1.12345" 
            value={query}
            onChange={handleQueryChange}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-brand-main focus:border-transparent outline-none"
            disabled={isPending}
          />
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
              {results.length > 0 ? (
                results.map((product) => {
                  const { originalPrice, finalPrice, discountPct, discountLabel } = getPriceData(product);
                  
                  return (
                    <div 
                      key={product.sku}
                      onClick={() => handleSelect(product)}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-10 h-10 flex-shrink-0 bg-white border border-gray-100 rounded p-1">
                        <img src={product.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                        <span className="text-sm font-bold text-gray-900 font-mono">{product.sku}</span>
                        <span className="text-xs text-gray-500 truncate">{product.original_name || product.title}</span>
                        {renderStockBadges(product)}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {discountPct > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 line-through">
                              € {originalPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                              -{discountLabel}
                            </span>
                          </div>
                        )}
                        <span className="text-xs font-bold text-gray-900">
                          € {finalPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-sm text-gray-500 text-center">
                  Nessun risultato
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="w-full sm:w-28 relative">
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 sm:text-center ${isOverStock ? 'text-red-600' : 'text-gray-500'}`}>
            Quantità
          </label>
          <input 
            type="number" 
            value={quantity}
            onChange={handleQuantityChange}
            min="1"
            className={`w-full border rounded px-4 py-2 text-center focus:ring-2 outline-none transition-colors ${
              isOverStock
                ? 'border-red-500 bg-red-50 text-red-600 font-bold focus:ring-red-500'
                : 'border-gray-300 text-gray-900 focus:ring-brand-main focus:border-transparent'
            }`}
            disabled={isPending}
          />
        </div>
        
        <button 
          type="submit"
          disabled={!selectedProduct || isPending}
          className={`w-full sm:w-auto h-[42px] px-6 py-2 rounded font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
            !selectedProduct || isPending || isOverStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-main text-white hover:bg-brand-hover'
          }`}
        >
          {isPending ? 'Attendere...' : 'AGGIUNGI'}
        </button>

        {stockWarning && (
          <div className="absolute bottom-full right-0 mb-1.5 z-30 pointer-events-none flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50/95 backdrop-blur-sm border border-red-300 shadow-md px-3 py-1.5 rounded whitespace-nowrap">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{stockWarning}</span>
          </div>
        )}
      </form>

      {selectedProduct && selectedPrices && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 flex-shrink-0 bg-white border border-gray-200 rounded p-1">
              <img src={selectedProduct.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono text-gray-900 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {selectedProduct.sku}
                </span>
                {renderStockBadges(selectedProduct)}
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                {selectedProduct.original_name || selectedProduct.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end sm:self-center shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prezzo Scontato</span>
              <div className="flex items-center gap-1.5">
                {selectedPrices.discountPct > 0 && (
                  <>
                    <span className="text-xs text-gray-400 line-through">
                      € {selectedPrices.originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      -{selectedPrices.discountLabel}
                    </span>
                  </>
                )}
                <span className="text-sm font-bold text-gray-900">
                  € {selectedPrices.finalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverStock ? 'text-red-600' : 'text-gray-500'}`}>
                Totale ({effectiveQty} pz)
              </span>
              <span className={`text-base font-bold ${isOverStock ? 'text-red-600' : 'text-gray-900'}`}>
                € {(selectedPrices.finalPrice * effectiveQty).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded inline-block">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
