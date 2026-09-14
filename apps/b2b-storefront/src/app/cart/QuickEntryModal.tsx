'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { searchBySkuPrefix } from '../actions/search';
import { addMultipleToCart } from '../actions/cart';

type RowData = {
  id: string;
  query: string;
  selectedProduct: any | null;
  quantity: number | string;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

function QuickEntryRow({ 
  row, 
  index,
  onChange, 
  onFocus,
  userDiscount,
  extraDiscount,
  elmarkDiscounts,
  storeMode
}: { 
  row: RowData, 
  index: number,
  onChange: (updated: RowData) => void, 
  onFocus: () => void,
  userDiscount: number,
  extraDiscount: number,
  elmarkDiscounts: Record<string, number>,
  storeMode: 'ZUCCHETTI' | 'ELMARK'
}) {
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!row.query || row.selectedProduct?.sku === row.query) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const data = await searchBySkuPrefix(row.query);
      setResults(data);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [row.query, row.selectedProduct]);

  const handleSelect = (product: any) => {
    onChange({ ...row, selectedProduct: product, query: product.sku });
    setIsOpen(false);
  };

  const getDiscountedPrice = (product: any) => {
    let original = Number(product.price_b2b) > 0 ? Number(product.price_b2b) : Number(product.price || 0);
    let final = original;
    
    if (storeMode === 'ELMARK') {
      const dGroup = product.discgroup || '';
      const groupDisc = elmarkDiscounts[dGroup] || 0;
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
    return { original, final };
  };

  let originalPrice = 0;
  let finalPrice = 0;
  let rowTotal = 0;

  if (row.selectedProduct) {
    const prices = getDiscountedPrice(row.selectedProduct);
    originalPrice = prices.original;
    finalPrice = prices.final;
    const qty = parseInt(String(row.quantity)) || 0;
    rowTotal = finalPrice * qty;
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 py-3 border-b border-gray-100 relative" ref={dropdownRef}>
      <div className="w-full md:w-64 relative flex-shrink-0">
        <input 
          type="text" 
          placeholder="Cerca SKU o Titolo..." 
          value={row.query}
          onFocus={onFocus}
          onChange={(e) => onChange({ ...row, query: e.target.value, selectedProduct: null })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        />
        
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
            {results.map((product) => {
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
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-900">{product.sku}</span>
                    <span className="text-xs text-gray-500 truncate">{product.original_name || product.title}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-900">
                      € {prices.final.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex items-center gap-4 min-w-0">
        {row.selectedProduct ? (
          <>
            <div className="w-10 h-10 flex-shrink-0 bg-white border border-gray-200 rounded p-1">
              <img src={row.selectedProduct.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate" title={row.selectedProduct.original_name || row.selectedProduct.title}>
                {row.selectedProduct.original_name || row.selectedProduct.title}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm text-gray-400 italic">Seleziona un prodotto...</div>
        )}
      </div>

      <div className="w-24 flex-shrink-0">
        <input 
          type="number" 
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: e.target.value })}
          min="1"
          disabled={!row.selectedProduct}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100"
          placeholder="Q.tà"
        />
      </div>

      <div className="w-64 flex-shrink-0 flex items-center justify-between text-sm">
        {row.selectedProduct ? (
          <>
            <div className="flex flex-col">
              {originalPrice > finalPrice && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 line-through">
                    € {originalPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] font-bold text-red-600">
                    -{Math.round((1 - (finalPrice / originalPrice)) * 100)}%
                  </span>
                </div>
              )}
              <span className="font-medium text-gray-900">€ {finalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="font-bold text-gray-900 text-right text-base">
              € {rowTotal.toFixed(2).replace('.', ',')}
            </div>
          </>
        ) : (
          <>
            <div>-</div>
            <div>-</div>
          </>
        )}
      </div>
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
  const [rows, setRows] = useState<RowData[]>(Array.from({ length: 2 }, () => ({ id: generateId(), query: '', selectedProduct: null, quantity: 1 })));
  const [isPending, startTransition] = useTransition();

  const handleFocus = (index: number) => {
    if (index === rows.length - 1) {
      setRows(prev => [
        ...prev,
        { id: generateId(), query: '', selectedProduct: null, quantity: 1 },
        { id: generateId(), query: '', selectedProduct: null, quantity: 1 }
      ]);
    }
  };

  const handleChange = (index: number, updated: RowData) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  const handleAddAll = () => {
    const validRows = rows.filter(r => r.selectedProduct && parseInt(String(r.quantity)) > 0);
    if (validRows.length === 0) {
      alert('Nessun prodotto valido selezionato.');
      return;
    }

    const items = validRows.map(r => ({ sku: r.selectedProduct.sku, quantity: parseInt(String(r.quantity)) }));
    
    startTransition(async () => {
      const res = await addMultipleToCart(items);
      if (res.success) {
        onClose();
      } else {
        alert(`Errore: ${res.error}`);
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
      let original = Number(r.selectedProduct.price_b2b) > 0 ? Number(r.selectedProduct.price_b2b) : Number(r.selectedProduct.price || 0);
      let final = original;
      if (storeMode === 'ELMARK') {
        const dGroup = r.selectedProduct.discgroup || '';
        const groupDisc = elmarkDiscounts[dGroup] || 0;
        if (groupDisc > 0) final = final * (1 - (groupDisc / 100));
      } else {
        if (userDiscount > 0) final = final * (1 - (userDiscount / 100));
        if (extraDiscount > 0) final = final * (1 - (extraDiscount / 100));
      }
      grandTotal += final * (parseInt(String(r.quantity)) || 0);
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl flex flex-col overflow-hidden ">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Inserimento Rapido (Excel)</h2>
            <p className="text-sm text-gray-500">Cerca i codici e inserisci le quantità. Aggiungi nuove righe selezionando l'ultima.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table Header */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 gap-4 hidden md:flex">
          <div className="w-64">Ricerca / Codice</div>
          <div className="flex-1">Prodotto</div>
          <div className="w-24 text-center">Quantità</div>
          <div className="w-64 flex justify-between">
            <span>Prezzo U.</span>
            <span>Totale Riga</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2 bg-white">
          {rows.map((row, idx) => (
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
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
          <div className="text-lg text-gray-700">
            Totale Preventivato: <span className="font-bold text-gray-900 text-xl">€ {grandTotal.toFixed(2).replace('.', ',')}</span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={handleAddAll}
              disabled={isPending}
              className="flex-1 sm:flex-none px-8 py-2.5 bg-brand-main text-white font-bold rounded shadow-sm hover:bg-brand-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
