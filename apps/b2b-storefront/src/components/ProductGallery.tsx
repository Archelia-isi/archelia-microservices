'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  inStock?: boolean;
}

export default function ProductGallery({ images, alt, inStock }: ProductGalleryProps) {
  const [mainImage, setMainImage] = useState(images[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-50 border border-gray-100 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Immagine non disponibile</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full aspect-square bg-white border border-gray-100 rounded-lg p-8 shadow-sm flex items-center justify-center relative overflow-hidden group">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <span className="bg-brand-main text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">B2B</span>
          {inStock && (
            <span className="bg-gray-900 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-main"></div> In Stock
            </span>
          )}
        </div>
        <img 
          src={mainImage} 
          alt={alt}
          className="w-full h-full object-contain transition-transform duration-500 cursor-zoom-in"
          onClick={() => setIsModalOpen(true)}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setMainImage(img)}
              className={`flex-shrink-0 w-20 h-20 bg-white border rounded-md p-2 flex items-center justify-center transition-all ${
                mainImage === img 
                  ? 'border-brand-main shadow-[0_0_0_1px_#00C800]' 
                  : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${alt} - vista ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* MODAL FULLSCREEN */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-5xl max-h-screen w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black p-3 rounded-full transition-colors z-50"
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={mainImage} 
              alt={alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
