'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { searchBySkuPrefix } from '../actions/search';
import { addToCart } from '../actions/cart';

export default function QuickAddCart({ userDiscount = 0, extraDiscount = 0 }: { userDiscount?: number, extraDiscount?: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!query || selectedProduct?.sku === query) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const data = await searchBySkuPrefix(query);
      setResults(data);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedProduct]);

  const handleSelect = (product: any) => {
    setSelectedProduct(product);
    setQuery(product.sku);
    setIsOpen(false);
    setQuantity(1);
  };

  const handleAdd = () => {
    if (!selectedProduct) return;
    
    let qty = parseInt(String(quantity));
    if (isNaN(qty) || qty < 1) qty = 1;
    
    startTransition(async () => {
      const res = await addToCart(selectedProduct.sku, qty);
      if (res.success) {
        // Reset form
        setSelectedProduct(null);
        setQuery('');
        setQuantity(1);
      } else {
        alert(`Errore: ${res.error}`);
      }
    });
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (selectedProduct && e.target.value !== selectedProduct.sku) {
      setSelectedProduct(null);
    }
  };

  const getDiscountedPrice = (product: any) => {
    let price = Number(product.price);
    let final = price;
    if (userDiscount > 0) {
      final = price * (1 - (userDiscount / 100));
    } else if (Number(product.price_b2b) > 0) {
      final = Number(product.price_b2b);
    }
    
    if (extraDiscount > 0) {
      final = final * (1 - (extraDiscount / 100));
    }
    return final;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm relative z-10" ref={dropdownRef}>
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Aggiunta Rapida per Codice (SKU)
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-3 relative">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Es. E1.12345" 
            value={query}
            onChange={handleQueryChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
          
          {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
              {results.map((product) => {
                const finalPrice = getDiscountedPrice(product);
                const originalPrice = Number(product.price);
                
                return (
                  <div 
                    key={product.sku}
                    onClick={() => handleSelect(product)}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-10 h-10 flex-shrink-0 bg-white border border-gray-100 rounded p-1">
                      <img src={product.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-gray-900">{product.sku}</span>
                      <span className="text-xs text-gray-500 truncate">{product.original_name || product.title}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      {originalPrice > finalPrice && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 line-through">
                            € {originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                            -{Math.round((1 - (finalPrice / originalPrice)) * 100)}%
                          </span>
                        </div>
                      )}
                      <span className="text-xs font-bold text-gray-900">
                        € {finalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="w-full sm:w-24">
          <input 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Q.tà"
          />
        </div>
        
        <button 
          onClick={handleAdd}
          disabled={!selectedProduct || isPending}
          className={`w-full sm:w-auto px-6 py-2 rounded text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
            !selectedProduct || isPending
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#00C800] text-white hover:bg-[#00b000]'
          }`}
        >
          {isPending ? 'Aggiunta...' : 'Aggiungi'}
        </button>
      </div>
    </div>
  );
}
