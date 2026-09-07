'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  inStock?: boolean;
}

export default function ProductGallery({ images, alt, inStock }: ProductGalleryProps) {
  const [mainImage, setMainImage] = useState(images[0]);

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
          <span className="bg-[#00C800] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">B2B</span>
          {inStock && (
            <span className="bg-gray-900 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C800]"></div> In Stock
            </span>
          )}
        </div>
        <img 
          src={mainImage} 
          alt={alt}
          className="w-full h-full object-contain hover:scale-110 transition-transform duration-500 cursor-zoom-in"
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
                  ? 'border-[#00C800] shadow-[0_0_0_1px_#00C800]' 
                  : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${alt} - vista ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
