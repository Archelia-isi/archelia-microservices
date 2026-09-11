'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';

export default function ProductCarousel({ title, products, viewAllLink, isLoggedIn = false }: { title: string, products: any[], viewAllLink?: string, isLoggedIn?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      // Re-check after animation
      setTimeout(checkScroll, 350);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full px-4 mt-12 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-brand-main pl-3">{title}</h2>
        
        <div className="flex items-center gap-4">
          {viewAllLink && (
            <Link prefetch={true} href={viewAllLink} className="text-sm font-medium text-brand-main hover:underline">
              Vedi tutti &gt;
            </Link>
          )}
          <div className="hidden md:flex gap-2">
            <button 
              onClick={() => scroll('left')} 
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={() => scroll('right')} 
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((prod, idx) => (
          <div key={idx} className="snap-start shrink-0 w-[200px] md:w-[240px] bg-white border border-gray-100 rounded shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
            <div className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-brand-main text-white px-2 py-0.5 rounded shadow-sm">
              B2B
            </div>
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {(prod.stock_main > 0 || (!('stock_main' in prod) && prod.stock > 0)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-brand-main/10 text-brand-main border border-brand-main/20 shadow-sm backdrop-blur-sm">
                  2GG: {prod.stock_main ?? prod.stock}
                </div>
              )}
              {prod.stock_ek > 0 && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 shadow-sm backdrop-blur-sm">
                  7GG: {prod.stock_ek}
                </div>
              )}
              {!(prod.stock_main > 0) && !(prod.stock_ek > 0) && (!('stock_main' in prod) && !(prod.stock > 0) || ('stock_main' in prod)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200 shadow-sm backdrop-blur-sm">
                  Esaurito
                </div>
              )}
            </div>
            
            <Link prefetch={true} href={`/product/${prod.id || prod.sku}`} className="w-full aspect-square p-4 flex items-center justify-center bg-white relative">
              {prod.image_url ? (
                <img src={prod.image_url} alt={prod.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </Link>
            <div className="p-4 pt-2 flex flex-col flex-grow border-t border-gray-50">
              <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold mb-1 truncate">{prod.vendor || 'IZZO'}</span>
              <h3 className="text-sm font-medium text-gray-900 leading-tight mb-2 line-clamp-2 min-h-[40px]">
                <Link prefetch={true} href={`/product/${prod.id || prod.sku}`} className="hover:text-brand-main transition-colors">
                  {prod.original_name || prod.title}
                </Link>
              </h3>
              <div className="text-[10px] text-gray-500 mb-3 uppercase tracking-wide truncate">
                CODICE PRODOTTO: <span className="font-mono">{prod.sku || prod.natural_sku || 'N/D'}</span>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                {isLoggedIn && (
                  <div className="flex flex-col">
                    {prod.originalPriceB2b && prod.price_b2b < prod.originalPriceB2b && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-gray-400 line-through">
                          € {Number(prod.originalPriceB2b).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                          -{Math.round((1 - (prod.price_b2b / prod.originalPriceB2b)) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="text-base font-bold text-gray-900 leading-none">
                      € {Number(prod.price_b2b || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                )}
                <AddToCartButton product={prod} isLoggedIn={isLoggedIn} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </section>
  );
}
