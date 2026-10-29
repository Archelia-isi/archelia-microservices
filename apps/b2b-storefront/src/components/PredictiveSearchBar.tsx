'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface PredictiveSearchBarProps {
  storeMode: 'ZUCCHETTI' | 'ELMARK';
  variant?: 'header' | 'catalog';
  initialQuery?: string;
}

interface FacetItem {
  value: string;
  count: number;
}

export default function PredictiveSearchBar({
  storeMode = 'ZUCCHETTI',
  variant = 'header',
  initialQuery = ''
}: PredictiveSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(initialQuery === '*' ? '' : initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [facets, setFacets] = useState<{ categories: FacetItem[]; brands: FacetItem[] }>({
    categories: [],
    brands: []
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isElmark = storeMode === 'ELMARK';
  const storeLabel = isElmark ? 'Catalogo Elmark' : 'Izzo Distribuzione';
  const placeholderText = isElmark
    ? 'Cerca nel catalogo Elmark per codice, prodotto o categoria...'
    : 'Cerca in Izzo Distribuzione per codice, prodotto, marchio o categoria...';

  // Sync input with URL search param when on /catalog
  useEffect(() => {
    if (variant === 'catalog') {
      setQuery(initialQuery === '*' ? '' : initialQuery);
    }
  }, [initialQuery, variant]);

  // Close dropdown on route / query / storeMode change
  useEffect(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, [pathname, initialQuery, storeMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced predictive search contextualized by storeMode
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setResults([]);
      setFoundCount(0);
      setFacets({ categories: [], brands: [] });
      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/predictive?q=${encodeURIComponent(trimmed)}&storeMode=${encodeURIComponent(storeMode)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Search error');
        const data = await res.json();
        setResults(data.hits || []);
        setFoundCount(data.found || 0);
        setFacets(data.facets || { categories: [], brands: [] });
        setIsAuthenticated(Boolean(data.isAuthenticated));
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setResults([]);
          setFoundCount(0);
          setFacets({ categories: [], brands: [] });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 160);

    return () => clearTimeout(timer);
  }, [query, storeMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < results.length) {
      const selected = results[activeIndex];
      setIsOpen(false);
      router.push(`/product/${encodeURIComponent(selected.id || selected.sku)}`);
      return;
    }
    const trimmed = query.trim();
    setIsOpen(false);
    if (trimmed) {
      router.push(`/catalog?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/catalog');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.trim().length > 0 && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const renderStockBadges = (product: any) => {
    if (isElmark) {
      const stock = Number(product.stock || 0);
      return stock > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-main/10 text-brand-main border border-brand-main/20">
          Disp: {stock} PZ (7GG)
        </span>
      ) : (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
          Esaurito
        </span>
      );
    }

    const stockMain = Number('stock_main' in product ? product.stock_main : product.stock || 0);
    const stockEk = Number(product.stock_ek || 0);

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {stockMain > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-main/10 text-brand-main border border-brand-main/20">
            2GG: {stockMain} PZ
          </span>
        )}
        {stockEk > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
            7GG: {stockEk} PZ
          </span>
        )}
        {stockMain <= 0 && stockEk <= 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
            Esaurito
          </span>
        )}
      </div>
    );
  };

  const isHeader = variant === 'header';

  return (
    <div
      ref={containerRef}
      className={
        isHeader
          ? 'hidden md:flex flex-1 min-w-0 max-w-xl mx-3 md:mx-8 relative'
          : 'flex w-full md:w-1/2 relative'
      }
    >
      <form onSubmit={handleSubmit} className="flex w-full gap-2 relative">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            name="q"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen && e.target.value.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            onFocus={() => {
              if (query.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className={
              isHeader
                ? 'w-full h-11 pl-4 pr-20 rounded-sm text-gray-900 bg-white outline-none text-sm font-medium focus:ring-2 focus:ring-brand-main'
                : 'w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent transition-all shadow-sm font-medium text-sm'
            }
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Cancella ricerca"
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1 ${
                isHeader ? 'right-14' : 'right-2.5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {isHeader && (
            <button
              type="submit"
              className="absolute right-0 top-0 h-11 w-12 bg-brand-main rounded-r-sm flex items-center justify-center text-black hover:bg-brand-hover transition-colors"
              aria-label="Cerca"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {!isHeader && (
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-main text-white font-bold uppercase tracking-wider rounded-md hover:bg-brand-hover transition-colors shadow-sm text-sm flex items-center gap-2 shrink-0"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Cerca
          </button>
        )}
      </form>

      {/* Predictive Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-2xl z-[80] overflow-hidden text-gray-900">
          {/* Context Header */}
          <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-brand-main/15 text-brand-main border border-brand-main/30">
                {storeLabel}
              </span>
              <span className="text-gray-500 font-medium">
                {isLoading ? 'Ricerca in corso...' : `${foundCount} prodott${foundCount === 1 ? 'o' : 'i'} trovat${foundCount === 1 ? 'o' : 'i'}`}
              </span>
            </div>
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-brand-main rounded-full animate-spin" />
            )}
          </div>

          {/* Suggested Categories / Brands contextualized to store */}
          {(facets.categories.length > 0 || facets.brands.length > 0) && (
            <div className="px-3.5 py-2 bg-gray-50/60 border-b border-gray-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                Suggerimenti:
              </span>
              {facets.brands.map((b) => (
                <button
                  key={`brand-${b.value}`}
                  type="button"
                  onClick={() => {
                    setQuery(b.value);
                    setIsOpen(false);
                    router.push(`/catalog?q=${encodeURIComponent(b.value)}`);
                  }}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-main hover:text-brand-main transition-colors"
                >
                  {b.value} <span className="text-[10px] text-gray-400">({b.count})</span>
                </button>
              ))}
              {facets.categories.map((c) => (
                <button
                  key={`cat-${c.value}`}
                  type="button"
                  onClick={() => {
                    setQuery(c.value);
                    setIsOpen(false);
                    router.push(`/catalog?q=${encodeURIComponent(c.value)}`);
                  }}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-brand-main hover:text-brand-main transition-colors truncate max-w-[220px]"
                >
                  {c.value} <span className="text-[10px] text-gray-400">({c.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Products List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {results.length > 0 ? (
              results.map((product, index) => {
                const isHighlighted = index === activeIndex;
                const productUrl = `/product/${encodeURIComponent(product.id || product.sku)}`;
                const discountPct = Number(product.discountPct || 0);
                const originalPrice = Number(product.originalPriceB2b || 0);
                const finalPrice = Number(product.price_b2b || 0);

                return (
                  <Link
                    key={product.id || product.sku}
                    href={productUrl}
                    prefetch={true}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`px-3.5 py-2.5 flex items-center gap-3 transition-colors ${
                      isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-12 h-12 flex-shrink-0 bg-white border border-gray-200 rounded p-1 flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.original_name || product.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          {product.sku}
                        </span>
                        {product.brand && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            {product.brand}
                          </span>
                        )}
                        {renderStockBadges(product)}
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {product.original_name || product.title}
                      </span>
                      {product.category && (
                        <span className="text-[11px] text-gray-400 truncate">
                          {product.category}
                        </span>
                      )}
                    </div>

                    {isAuthenticated && (
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        {discountPct > 0 && (
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <span className="text-[10px] text-gray-400 line-through">
                              € {originalPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                              -{product.discountLabel ? String(product.discountLabel).replace(/^-/, '') : `${discountPct}%`}
                            </span>
                            {product.discountExpiresFormatted && (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded whitespace-nowrap">
                                ⏳ {product.discountExpiresFormatted}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          € {finalPrice.toFixed(2).replace('.', ',')}
                        </span>
                        {product.unit && (
                          <span className="text-[10px] text-gray-400">/ {product.unit}</span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })
            ) : !isLoading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Nessun risultato trovato in <span className="font-bold text-gray-700">{storeLabel}</span> per &ldquo;{query.trim()}&rdquo;
              </div>
            ) : null}
          </div>

          {/* Footer CTA */}
          {results.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 text-xs font-bold text-brand-main uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>
                Vedi tutti i {foundCount} risultati in {storeLabel} per &ldquo;{query.trim()}&rdquo;
              </span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
