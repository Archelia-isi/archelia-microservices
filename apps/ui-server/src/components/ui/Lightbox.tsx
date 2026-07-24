import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './Lightbox.css';

export interface LightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!shouldRender || images.length === 0) return null;

  return (
    <div className={`ui-lightbox-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <button className="ui-lightbox-close" onClick={onClose} aria-label="Chiudi galleria">
        <X size={24} />
      </button>

      <div className="ui-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button className="ui-lightbox-nav prev" onClick={handlePrev} aria-label="Immagine precedente">
            <ChevronLeft size={32} />
          </button>
        )}

        <img 
          src={images[currentIndex]} 
          alt={`Vista ${currentIndex + 1}`} 
          className="ui-lightbox-image" 
        />

        {images.length > 1 && (
          <button className="ui-lightbox-nav next" onClick={handleNext} aria-label="Prossima immagine">
            <ChevronRight size={32} />
          </button>
        )}

        {images.length > 1 && (
          <div className="ui-lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
