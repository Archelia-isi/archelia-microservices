'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function ProductCarousel({ title, products, viewAllLink, isAuthenticated = false }: { title: string, products: any[], viewAllLink?: string, isAuthenticated?: boolean }) {
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
        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-[#00C800] pl-3">{title}</h2>
        
        <div className="flex items-center gap-4">
          {viewAllLink && (
            <Link href={viewAllLink} className="text-sm font-medium text-[#00C800] hover:underline">
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
            <div className="absolute top-2 right-2 z-10 text-xs font-bold bg-[#00C800] text-white px-2 py-1 rounded">
              B2B
            </div>
            <Link href={`/product/${prod.id || prod.sku}`} className="w-full aspect-square p-4 flex items-center justify-center bg-white relative">
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
                <Link href={`/product/${prod.id || prod.sku}`} className="hover:text-[#00C800] transition-colors">
                  {prod.title || prod.original_name}
                </Link>
              </h3>
              <div className="text-xs text-gray-500 mb-3 font-mono truncate">
                SKU: {prod.sku || 'N/D'}
              </div>
              <div className="mt-auto flex flex-col gap-3">
                {isAuthenticated && (
                  <div className="flex flex-col">
                    {prod.price_b2b && prod.price && prod.price_b2b < prod.price && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-gray-400 line-through">
                          € {Number(prod.price).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                          -{Math.round((1 - (prod.price_b2b / prod.price)) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="text-base font-bold text-gray-900 leading-none">
                      € {Number(prod.price_b2b || prod.price || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                )}
                <button className="w-full bg-black text-white hover:bg-[#00C800] transition-colors font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Aggiungi
                </button>
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
