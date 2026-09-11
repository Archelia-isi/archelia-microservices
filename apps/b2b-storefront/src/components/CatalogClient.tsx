'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';

interface CatalogClientProps {
  cartType?: 'ZUCCHETTI' | 'ELMARK';
  initialProducts: any[];
  query: string;
  isAuthenticated: boolean;
}

export default function CatalogClient({ initialProducts, query, isAuthenticated }: CatalogClientProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [openFilterGroup, setOpenFilterGroup] = useState<string | null>(null);

  // Extract all available filters dynamically
  const availableFilters = useMemo(() => {
    const filters: Record<string, Record<string, number>> = {};

    initialProducts.forEach((doc) => {
      const addFilter = (key: string, value: string) => {
        if (!value) return;
        if (!filters[key]) filters[key] = {};
        filters[key][value] = (filters[key][value] || 0) + 1;
      };

      addFilter('Marca', doc.brand);
      if (doc.category && doc.category.length > 3) {
        addFilter('Categoria', doc.category);
      }

      if (doc.technical_desc) {
        const parts = doc.technical_desc.split(';');
        parts.forEach((part: string) => {
          if (part.includes(':')) {
            const [k, ...v] = part.split(':');
            const key = k.trim().replace(/^-\s*/, '');
            const value = v.join(':').trim();
            // Clean up unwanted or overly specific specs
            const ignoreKeys = ['sku', 'ean', 'codice', 'peso', 'misure', 'dimensioni', 'ean13', 'descrizione'];
            if (
              key.length > 1 &&
              key.length < 25 &&
              value.length > 0 &&
              value.length < 30 &&
              !ignoreKeys.includes(key.toLowerCase()) &&
              isNaN(Number(value))
            ) {
              addFilter(key, value);
            }
          }
        });
      }
    });

    // Sort filters
    const sortedFilters: Record<string, Record<string, number>> = {};
    const keys = Object.keys(filters).sort((a, b) => {
      if (a === 'Categoria') return -1;
      if (b === 'Categoria') return 1;
      if (a === 'Marca') return -1;
      if (b === 'Marca') return 1;
      return a.localeCompare(b);
    });

    keys.forEach(k => {
      // Solo mostrare i filtri che hanno almeno 2 opzioni
      if (Object.keys(filters[k]).length > 1) {
        sortedFilters[k] = filters[k];
      }
    });

    return sortedFilters;
  }, [initialProducts]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) return initialProducts;

    return initialProducts.filter(doc => {
      return Object.keys(activeFilters).every(filterKey => {
        const selectedValues = activeFilters[filterKey];
        if (selectedValues.length === 0) return true;

        if (filterKey === 'Marca') {
          return selectedValues.includes(doc.brand);
        }
        if (filterKey === 'Categoria') {
          return selectedValues.includes(doc.category);
        }

        // Technical specs matching
        if (doc.technical_desc) {
          const parts = doc.technical_desc.split(';');
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes(':')) {
              const [k, ...v] = part.split(':');
              const key = k.trim().replace(/^-\s*/, '');
              const value = v.join(':').trim();
              if (key === filterKey && selectedValues.includes(value)) {
                return true;
              }
            }
          }
        }
        return false;
      });
    });
  }, [initialProducts, activeFilters]);

  const handleFilterToggle = (key: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[key]) {
        newFilters[key] = [];
      }
      
      if (newFilters[key].includes(value)) {
        newFilters[key] = newFilters[key].filter(v => v !== value);
        if (newFilters[key].length === 0) {
          delete newFilters[key];
        }
      } else {
        newFilters[key].push(value);
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => setActiveFilters({});

  return (
    <div className="w-full flex flex-col md:flex-row gap-8">
      {/* Sidebar Filtri */}
      <div className={`md:w-64 flex-shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 sticky top-24 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg text-gray-900">Filtra per</h2>
            {Object.keys(activeFilters).length > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                Rimuovi tutti
              </button>
            )}
          </div>

          {Object.keys(availableFilters).length === 0 && (
            <p className="text-sm text-gray-500">Nessun filtro disponibile</p>
          )}

          {Object.keys(availableFilters).map(filterKey => {
            const isOpen = openFilterGroup === filterKey;
            const hasActive = activeFilters[filterKey] && activeFilters[filterKey].length > 0;

            return (
              <div key={filterKey} className="mb-4 border-b border-gray-100 pb-2 last:border-0 last:mb-0 last:pb-0">
                <button 
                  className="w-full flex justify-between items-center py-2 text-left"
                  onClick={() => setOpenFilterGroup(isOpen ? null : filterKey)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">{filterKey}</h3>
                    {hasActive && !isOpen && (
                      <span className="text-brand-main text-[10px]">●</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-lg font-light leading-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                
                {isOpen && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-hide py-3">
                    {Object.entries(availableFilters[filterKey])
                      .sort((a, b) => b[1] - a[1]) // Ordina per conteggio decrescente
                      .map(([val, count]) => {
                      const isChecked = activeFilters[filterKey]?.includes(val);
                      return (
                        <label key={val} className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
                            <input
                              type="checkbox"
                              className="appearance-none w-4 h-4 border border-gray-300 rounded-sm checked:bg-brand-main checked:border-brand-main transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C800]/20 cursor-pointer"
                              checked={isChecked}
                              onChange={() => handleFilterToggle(filterKey, val)}
                            />
                            {isChecked && (
                              <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm flex-1 ${isChecked ? 'font-semibold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {val}
                          </span>
                          <span className="text-xs text-gray-400">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">
            Mostrando <span className="text-gray-900 font-bold">{filteredProducts.length}</span> risultati
            {query !== '*' ? ` per "${query}"` : ''}
          </p>
          
          <button 
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md text-sm font-medium"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filtri {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="w-full py-16 bg-white rounded-lg border border-gray-200 text-center text-gray-500 shadow-sm mt-4">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-lg">Nessun prodotto corrisponde ai filtri selezionati</p>
            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-brand-main text-white font-medium rounded-md hover:bg-brand-hover transition-colors">
              Azzera Filtri
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => {
              const totalStock = (product.stock_main || 0) + (product.stock_ek || 0) || product.stock || 0;
              const isOutOfStock = totalStock <= 0;
              return (
                <div key={product.id} className="w-full bg-white border border-gray-100 rounded shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
            <div className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-brand-main text-white px-2 py-0.5 rounded shadow-sm">
              B2B
            </div>
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {(product.stock_main > 0 || (!('stock_main' in product) && product.stock > 0)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-brand-main/10 text-brand-main border border-brand-main/20 shadow-sm backdrop-blur-sm">
                  2GG: {product.stock_main ?? product.stock}
                </div>
              )}
              {product.stock_ek > 0 && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 shadow-sm backdrop-blur-sm">
                  7GG: {product.stock_ek}
                </div>
              )}
              {!(product.stock_main > 0) && !(product.stock_ek > 0) && (!('stock_main' in product) && !(product.stock > 0) || ('stock_main' in product)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200 shadow-sm backdrop-blur-sm">
                  Esaurito
                </div>
              )}
            </div>
            
            <Link prefetch={true} href={`/product/${product.id || product.sku}`} className="w-full aspect-square p-4 flex items-center justify-center bg-white relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </Link>
            <div className="p-4 pt-2 flex flex-col flex-grow border-t border-gray-50">
              <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold mb-1 truncate">{product.vendor || 'IZZO'}</span>
              <h3 className="text-sm font-medium text-gray-900 leading-tight mb-2 line-clamp-2 min-h-[40px]">
                <Link prefetch={true} href={`/product/${product.id || product.sku}`} className="hover:text-brand-main transition-colors">
                  {product.original_name || product.title}
                </Link>
              </h3>
              <div className="text-[10px] text-gray-500 mb-3 uppercase tracking-wide truncate">
                CODICE PRODOTTO: <span className="font-mono">{product.sku || product.natural_sku || 'N/D'}</span>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                {isAuthenticated && (
                  <div className="flex flex-col">
                    {product.originalPriceB2b && product.price_b2b < product.originalPriceB2b && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-gray-400 line-through">
                          € {Number(product.originalPriceB2b).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                          -{Math.round((1 - (product.price_b2b / product.originalPriceB2b)) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="text-base font-bold text-gray-900 leading-none">
                      € {Number(product.price_b2b || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="w-full text-center mt-2">
                    <Link prefetch={true} href="/login" className="text-xs font-bold uppercase tracking-wider text-brand-main hover:text-brand-border block w-full bg-brand-main/10 rounded py-2 transition-colors">
                      Accedi
                    </Link>
                  </div>
                )}
                {isAuthenticated && <AddToCartButton product={product} isLoggedIn={isAuthenticated} />}
              </div>
            </div>
          </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
