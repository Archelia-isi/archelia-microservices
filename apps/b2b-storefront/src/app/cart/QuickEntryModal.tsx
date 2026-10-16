'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { searchBySkuPrefixClient } from '@/lib/searchClient';
import { addMultipleToCart } from '../actions/cart';
import { getAvailableStock } from '@/lib/stock';

type RowData = {
  id: string;
  query: string;
  selectedProduct: any | null;
  quantity: number | string;
};

let rowCounter = 0;
const generateId = () => `qe_row_${Date.now()}_${++rowCounter}`;

function renderStockBadges(product: any, storeMode: 'ZUCCHETTI' | 'ELMARK') {
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
}

function QuickEntryRow({ 
  row, 
  index,
  onChange, 
  onFocus,
  userDiscount,
  extraDiscount,
  elmarkDiscounts,
  storeMode,
  isSkuOverStockExternal = false,
  onStockWarning
}: { 
  row: RowData, 
  index: number,
  onChange: (updated: RowData) => void, 
  onFocus: () => void,
  userDiscount: number,
  extraDiscount: number,
  elmarkDiscounts: Record<string, number>,
  storeMode: 'ZUCCHETTI' | 'ELMARK',
  isSkuOverStockExternal?: boolean,
  onStockWarning?: (msg: string) => void
}) {
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [rowWarning, setRowWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerRowWarning = (msg: string) => {
    setRowWarning(msg);
    if (onStockWarning) onStockWarning(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setRowWarning(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!row.query || !row.query.trim() || row.selectedProduct?.sku === row.query) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const data = await searchBySkuPrefixClient(row.query, storeMode);
      setResults(data);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [row.query, row.selectedProduct, storeMode]);

  const handleSelect = (product: any) => {
    onChange({ ...row, selectedProduct: product, query: product.sku, quantity: '' });
    setIsOpen(false);
    const avail = getAvailableStock(product, storeMode);
    if (avail <= 0) {
      triggerRowWarning(`Giacenza superata per ${product.sku}! Prodotto esaurito (0 pz).`);
    } else {
      setRowWarning(null);
    }
  };

  const getDiscountedPrice = (product: any) => {
    let original = Number(storeMode === 'ELMARK' ? (product.price || product.price_b2b || 0) : (product.price_b2b || product.price || 0));
    let final = original;
    
    if (storeMode === 'ELMARK') {
      const dGroup = product.discgroup || '';
      const groupDisc = Number(elmarkDiscounts[dGroup]) || 0;
      if (groupDisc > 0) {
        final = final * (1 - (groupDisc / 100));
      }
    } else {
      if (userDiscount > 0) {
        final = final * (1 - (userDiscount / 100));
      }
      if (extraDiscount > 0) {
        final = final * (1 - (extraDiscount / 100));
      }
    }
    const discountPct = original > 0 && original > final ? Math.round((1 - (final / original)) * 100) : 0;
    return { original, final, discountPct };
  };

  let originalPrice = 0;
  let finalPrice = 0;
  let discountPct = 0;
  let rowTotal = 0;
  const maxStock = row.selectedProduct ? getAvailableStock(row.selectedProduct, storeMode) : 0;
  const rawQty = typeof row.quantity === 'string' ? row.quantity.trim() : row.quantity;
  const parsedQty = parseInt(String(rawQty));
  const effectiveQty = (rawQty === '' || isNaN(parsedQty) || parsedQty < 1) ? 1 : parsedQty;
  const isOverStock = Boolean(row.selectedProduct && (effectiveQty > maxStock || isSkuOverStockExternal));

  if (row.selectedProduct) {
    const prices = getDiscountedPrice(row.selectedProduct);
    originalPrice = prices.original;
    finalPrice = prices.final;
    discountPct = prices.discountPct;
    rowTotal = finalPrice * effectiveQty;
  }

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    onChange({ ...row, quantity: valStr });
    if (row.selectedProduct) {
      const p = parseInt(valStr, 10);
      const eff = (valStr.trim() === '' || isNaN(p) || p < 1) ? 1 : p;
      if (eff > maxStock) {
        triggerRowWarning(
          maxStock <= 0
            ? `Giacenza superata! Prodotto esaurito (0 pz).`
            : `Giacenza superata! Max ${maxStock} pz disponibili.`
        );
      } else {
        setRowWarning(null);
      }
    }
  };

  return (
    <div className="flex flex-col py-3 border-b border-gray-100 relative" ref={dropdownRef}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="w-full md:w-64 relative flex-shrink-0">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Codice Prodotto (SKU)
          </label>
          <input 
            type="text" 
            autoComplete="off"
            placeholder="Cerca SKU o Titolo..." 
            value={row.query}
            onFocus={onFocus}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            onChange={(e) => {
              setRowWarning(null);
              onChange({ ...row, query: e.target.value, selectedProduct: null });
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
              {results.length > 0 ? (
                results.map((product) => {
                  const prices = getDiscountedPrice(product);
                  return (
                    <div 
                      key={product.sku}
                      onClick={() => handleSelect(product)}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-8 h-8 flex-shrink-0 bg-white border border-gray-100 rounded p-1">
                        <img src={product.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                        <span className="text-sm font-bold text-gray-900 font-mono">{product.sku}</span>
                        <span className="text-xs text-gray-500 truncate">{product.original_name || product.title}</span>
                        {renderStockBadges(product, storeMode)}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {prices.discountPct > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 line-through">
                              € {prices.original.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                              -{prices.discountPct}%
                            </span>
                          </div>
                        )}
                        <span className="text-xs font-bold text-gray-900">
                          € {prices.final.toFixed(2).replace('.', ',')}
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
        
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Prodotto e Giacenza
          </span>
          <div className="flex items-center gap-3 min-w-0 min-h-[38px]">
            {row.selectedProduct ? (
              <>
                <div className="w-10 h-10 flex-shrink-0 bg-white border border-gray-200 rounded p-1">
                  <img src={row.selectedProduct.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="text-sm font-medium text-gray-900 truncate" title={row.selectedProduct.original_name || row.selectedProduct.title}>
                    {row.selectedProduct.original_name || row.selectedProduct.title}
                  </div>
                  {renderStockBadges(row.selectedProduct, storeMode)}
                </div>
              </>
            ) : (
              <div className="flex-1 text-sm text-gray-400 italic">Seleziona un prodotto...</div>
            )}
          </div>
        </div>

        <div className="w-full md:w-28 flex-shrink-0 relative">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 md:text-center ${isOverStock ? 'text-red-600' : 'text-gray-500'}`}>
            Quantità
          </label>
          <input 
            type="number" 
            value={row.quantity}
            onChange={handleQtyChange}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            min="1"
            disabled={!row.selectedProduct}
            className={`w-full border rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 disabled:bg-gray-100 transition-colors ${
              isOverStock
                ? 'border-red-500 bg-red-50 text-red-600 font-bold focus:ring-red-500'
                : 'border-gray-300 text-gray-900 focus:ring-black'
            }`}
          />
        </div>

        <div className="w-full md:w-64 flex-shrink-0 flex items-center justify-between text-sm gap-4">
          <div className="flex flex-col">
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Prezzo Scontato
            </span>
            {row.selectedProduct ? (
              <div className="flex flex-col">
                {discountPct > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-400 line-through">
                      € {originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[11px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      -{discountPct}%
                    </span>
                  </div>
                )}
                <span className="font-bold text-gray-900 text-sm">€ {finalPrice.toFixed(2).replace('.', ',')}</span>
              </div>
            ) : (
              <div className="min-h-[38px] flex items-center text-gray-400">-</div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 text-right ${isOverStock ? 'text-red-600' : 'text-gray-500'}`}>
              Totale Riga
            </span>
            {row.selectedProduct ? (
              <div className={`font-bold text-right text-base min-h-[38px] flex items-center ${isOverStock ? 'text-red-600' : 'text-gray-900'}`}>
                € {rowTotal.toFixed(2).replace('.', ',')}
              </div>
            ) : (
              <div className="min-h-[38px] flex items-center text-gray-400">-</div>
            )}
          </div>
        </div>
      </div>

      {rowWarning && (
        <div className="absolute -top-2 right-0 z-30 pointer-events-none flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50/95 backdrop-blur-sm border border-red-300 shadow-md px-2.5 py-1 rounded whitespace-nowrap">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{rowWarning}</span>
        </div>
      )}
    </div>
  );
}

export default function QuickEntryModal({
  onClose,
  userDiscount = 0,
  extraDiscount = 0,
  elmarkDiscounts = {},
  storeMode = 'ZUCCHETTI'
}: {
  onClose: () => void,
  userDiscount?: number,
  extraDiscount?: number,
  elmarkDiscounts?: Record<string, number>,
  storeMode?: 'ZUCCHETTI' | 'ELMARK'
}) {
  const [rows, setRows] = useState<RowData[]>(Array.from({ length: 2 }, () => ({ id: generateId(), query: '', selectedProduct: null, quantity: '' })));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [overStockSkus, setOverStockSkus] = useState<Record<string, boolean>>({});
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleFocus = (index: number) => {
    if (index === rows.length - 1) {
      setRows(prev => [
        ...prev,
        { id: generateId(), query: '', selectedProduct: null, quantity: '' },
        { id: generateId(), query: '', selectedProduct: null, quantity: '' }
      ]);
    }
  };

  const handleChange = (index: number, updated: RowData) => {
    setOverStockSkus({});
    setRows(prev => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  // Compute aggregated SKU quantities to detect multi-row stock overflow
  const skuTotals: Record<string, { qty: number; maxStock: number }> = {};
  rows.forEach(r => {
    if (r.selectedProduct) {
      const sku = r.selectedProduct.sku;
      const rawQty = typeof r.quantity === 'string' ? r.quantity.trim() : r.quantity;
      const parsed = parseInt(String(rawQty));
      const qty = (rawQty === '' || isNaN(parsed) || parsed < 1) ? 1 : parsed;
      const maxStock = getAvailableStock(r.selectedProduct, storeMode);
      if (!skuTotals[sku]) {
        skuTotals[sku] = { qty: 0, maxStock };
      }
      skuTotals[sku].qty += qty;
    }
  });

  const hasAnyOverStock = Object.entries(skuTotals).some(
    ([sku, data]) => data.qty > data.maxStock || overStockSkus[sku]
  );

  const handleAddAll = () => {
    setErrorMsg(null);
    const validRows = rows.filter(r => r.selectedProduct);
    if (validRows.length === 0) {
      setErrorMsg('Nessun prodotto valido selezionato.');
      return;
    }

    for (const [sku, data] of Object.entries(skuTotals)) {
      if (data.qty > data.maxStock) {
        setOverStockSkus(prev => ({ ...prev, [sku]: true }));
        triggerStockWarning(
          data.maxStock <= 0
            ? `Giacenza superata per ${sku}! Prodotto esaurito (0 pz disponibili).`
            : `Giacenza superata per ${sku}! Disponibili max ${data.maxStock} pz.`
        );
        return;
      }
    }

    const items = validRows.map(r => {
      const rawQty = typeof r.quantity === 'string' ? r.quantity.trim() : r.quantity;
      const parsed = parseInt(String(rawQty));
      const quantity = (rawQty === '' || isNaN(parsed) || parsed < 1) ? 1 : parsed;
      return { sku: r.selectedProduct.sku, quantity };
    });
    
    startTransition(async () => {
      const res: any = await addMultipleToCart(items);
      if (res.success) {
        onClose();
      } else if (res.stockExceeded) {
        if (res.sku) {
          setOverStockSkus(prev => ({ ...prev, [res.sku]: true }));
        }
        triggerStockWarning(res.error || 'Giacenza superata!');
      } else {
        setErrorMsg(res.error || 'Errore durante l\'aggiunta al carrello');
      }
    });
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  let grandTotal = 0;
  rows.forEach(r => {
    if (r.selectedProduct) {
      let original = Number(storeMode === 'ELMARK' ? (r.selectedProduct.price || r.selectedProduct.price_b2b || 0) : (r.selectedProduct.price_b2b || r.selectedProduct.price || 0));
      let final = original;
      if (storeMode === 'ELMARK') {
        const dGroup = r.selectedProduct.discgroup || '';
        const groupDisc = Number(elmarkDiscounts[dGroup]) || 0;
        if (groupDisc > 0) final = final * (1 - (groupDisc / 100));
      } else {
        if (userDiscount > 0) final = final * (1 - (userDiscount / 100));
        if (extraDiscount > 0) final = final * (1 - (extraDiscount / 100));
      }
      const rawQty = typeof r.quantity === 'string' ? r.quantity.trim() : r.quantity;
      const parsed = parseInt(String(rawQty));
      const qty = (rawQty === '' || isNaN(parsed) || parsed < 1) ? 1 : parsed;
      grandTotal += final * qty;
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl flex flex-col overflow-hidden ">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Inserimento Rapido</h2>
            <p className="text-sm text-gray-500">Cerca i codici e inserisci le quantità. Aggiungi nuove righe selezionando l'ultima.</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2 bg-white">
          {rows.map((row, idx) => {
            const sku = row.selectedProduct?.sku;
            const isSkuOver = Boolean(
              sku && (overStockSkus[sku] || (skuTotals[sku] && skuTotals[sku].qty > skuTotals[sku].maxStock))
            );
            return (
              <QuickEntryRow
                key={row.id}
                index={idx}
                row={row}
                onChange={(r) => handleChange(idx, r)}
                onFocus={() => handleFocus(idx)}
                userDiscount={userDiscount}
                extraDiscount={extraDiscount}
                elmarkDiscounts={elmarkDiscounts}
                storeMode={storeMode}
                isSkuOverStockExternal={isSkuOver}
                onStockWarning={triggerStockWarning}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="relative px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
          {stockWarning && (
            <div className="absolute bottom-full left-6 mb-2 z-30 pointer-events-none flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50/95 backdrop-blur-sm border border-red-300 shadow-md px-3 py-1.5 rounded">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{stockWarning}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className="text-lg text-gray-700">
              Totale Preventivato: <span className="font-bold text-gray-900 text-xl">€ {grandTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {errorMsg && (
              <span className="text-xs text-red-600 font-medium">
                {errorMsg}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Annulla
            </button>
            <button 
              type="button"
              onClick={handleAddAll}
              disabled={isPending}
              className={`flex-1 sm:flex-none px-8 py-2.5 font-bold rounded shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                hasAnyOverStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-main text-white hover:bg-brand-hover'
              }`}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Aggiungi tutti al Carrello'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
