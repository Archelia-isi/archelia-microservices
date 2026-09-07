'use client';

import { useState, useEffect } from 'react';

const slides = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=1200&auto=format&fit=crop', // Warehouse boxes
    gradient: 'from-[#ffe4e1] to-[#ffb6c1]', // Pink
    title: 'Distribuzione B2B',
    description: 'Accesso esclusivo al catalogo ingrosso. Giacenze in tempo reale, listini personalizzati.',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop', // Servers / tech
    gradient: 'from-[#e0f2fe] to-[#bae6fd]', // Light blue
    title: 'Informatica e Rack',
    description: 'Armadi di rete, cavi e componenti di alta qualità per la tua infrastruttura aziendale.',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1200&auto=format&fit=crop', // Drill/tools
    gradient: 'from-[#fef08a] to-[#fde047]', // Yellow
    title: 'Elettroutensili',
    description: 'Trapani, avvitatori e strumenti professionali per ogni esigenza in cantiere.',
  },
  {
    id: 4,
    imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=1200&auto=format&fit=crop', // Lighting
    gradient: 'from-[#dcfce7] to-[#86efac]', // Green
    title: 'Illuminazione LED',
    description: 'Pannelli, strisce e faretti ad alta efficienza energetica in pronta consegna.',
  },
  {
    id: 5,
    imageUrl: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=1200&auto=format&fit=crop', // Cables / electric
    gradient: 'from-[#ffedd5] to-[#fdba74]', // Orange
    title: 'Materiale Elettrico',
    description: 'Cavi, quadri elettrici e serie civile delle migliori marche sul mercato per impianti sicuri.',
  },
  {
    id: 6,
    imageUrl: 'https://images.unsplash.com/photo-1621252179027-94459d278660?q=80&w=1200&auto=format&fit=crop', // Safety
    gradient: 'from-[#f3e8ff] to-[#d8b4fe]', // Purple
    title: 'Antinfortunistica',
    description: 'Dispositivi di Protezione Individuale per la sicurezza del tuo team sul lavoro.',
  },
  {
    id: 7,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1200&auto=format&fit=crop', // Smart thermostat
    gradient: 'from-[#e2e8f0] to-[#cbd5e1]', // Slate
    title: 'Smart Home & Domotica',
    description: 'Sistemi di automazione intelligenti per gestire energia e sicurezza.',
  },
  {
    id: 8,
    imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop', // Interior
    gradient: 'from-[#fce7f3] to-[#f9a8d4]', // Pink bright
    title: 'Arredo e Complementi',
    description: 'Dettagli di stile ed accessori essenziali per l\'edilizia moderna ed il design d\'interni.',
  },
  {
    id: 9,
    imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=80&w=1200&auto=format&fit=crop', // Hand tools
    gradient: 'from-[#ccfbf1] to-[#5eead4]', // Teal
    title: 'Utensili Manuali',
    description: 'Chiavi, cacciaviti e pinze forgiate in acciaio resistente per ogni professionista.',
  },
  {
    id: 10,
    imageUrl: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?q=80&w=1200&auto=format&fit=crop', // Garden
    gradient: 'from-[#ecfccb] to-[#bef264]', // Lime
    title: 'Giardinaggio ed Esterni',
    description: 'Tutto il necessario per la cura del verde, l\'irrigazione e l\'arredo degli spazi esterni.',
  }
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000); // 5 seconds
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const slide = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#fafafa] h-[360px] flex justify-center mb-4 group transition-colors duration-1000">
      
      {/* Dynamic Background Gradient (Base) */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} z-0 transition-all duration-1000 ease-in-out`}
      ></div>
      
      {/* Dynamic Background Image (On Top, Right Side) */}
      <div 
        className="absolute inset-y-0 right-0 w-2/3 md:w-3/4 bg-cover bg-center z-0 transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: `url('${slide.imageUrl}')`,
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)',
          maskImage: 'linear-gradient(to right, transparent, black 30%)'
        }}
      ></div>
      
      {/* Bottom fade into page background */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none"></div>
      
      {/* Card Content */}
      <div className="relative z-20 w-full pt-12 h-full flex flex-col items-start px-8 pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded shadow-md w-full max-w-sm p-6 transform transition-all duration-500 ease-in-out pointer-events-auto" key={slide.id}>
          <h1 className="text-xl font-bold tracking-tight mb-2 text-gray-900 animate-fadeIn">
            {slide.title}
          </h1>
          <p className="text-xs text-gray-600 mb-0 animate-fadeIn delay-75">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handlePrev}
          className="w-10 h-10 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-md backdrop-blur"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
        <button 
          onClick={handleNext}
          className="w-10 h-10 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-md backdrop-blur"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="w-10 h-10 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-md backdrop-blur"
        >
          {isPaused ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          )}
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-[170px] left-8 z-30 flex gap-2">
        {slides.map((s, i) => (
          <button 
            key={s.id} 
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-black w-4' : 'bg-black/30'}`}
          />
        ))}
      </div>
    </section>
  );
}
