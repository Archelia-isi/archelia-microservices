'use client';

import { useState } from 'react';
import Link from 'next/link';

// Realistic B2B taxonomy matching standard products
const taxonomy = [
  {
    id: 'illuminazione',
    name: 'ILLUMINAZIONE',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    children: [
      { 
        id: 'lampadine-led', 
        name: 'LAMPADINE LED',
        children: [
          { id: 'gu10', name: 'Faretti GU10' },
          { id: 'e27', name: 'Goccia E27' },
          { id: 'e14', name: 'Oliva E14' },
          { id: 'vintage', name: 'Filamento Vintage' },
        ] 
      },
      { 
        id: 'strisce-led', 
        name: 'STRISCE LED',
        children: [
          { id: 'strisce-24v', name: 'Strisce 24V' },
          { id: 'strisce-12v', name: 'Strisce 12V' },
          { id: 'profili', name: 'Profili in Alluminio' },
          { id: 'alimentatori', name: 'Alimentatori' },
        ] 
      },
      { 
        id: 'industriale', 
        name: 'ILLUMINAZIONE INDUSTRIALE',
        children: [
          { id: 'campane', name: 'Campane LED' },
          { id: 'proiettori', name: 'Fari Proiettori' },
          { id: 'plafoniere', name: 'Plafoniere Stagne' },
        ] 
      },
    ]
  },
  {
    id: 'elettricita',
    name: 'MATERIALE ELETTRICO',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    children: [
      { 
        id: 'cavi', 
        name: 'CAVI ELETTRICI',
        children: [
          { id: 'cavi-energia', name: 'Cavi Energia' },
          { id: 'cavi-dati', name: 'Cavi Rete / Dati' },
          { id: 'cavi-tv', name: 'Cavi TV / Satellitari' },
        ] 
      },
      { 
        id: 'quadri', 
        name: 'QUADRI E MAGNETOTERMICI',
        children: [
          { id: 'magnetotermici', name: 'Interruttori Magnetotermici' },
          { id: 'salvavita', name: 'Differenziali Salvavita' },
          { id: 'quadri-incasso', name: 'Quadri da Incasso' },
        ] 
      },
      { 
        id: 'serie-civile', 
        name: 'SERIE CIVILE E PLACCHE',
        children: [
          { id: 'b-ticino', name: 'Compatibili B-Ticino' },
          { id: 'vimar', name: 'Compatibili Vimar' },
          { id: 'scatole', name: 'Scatole di Derivazione' },
        ] 
      }
    ]
  },
  {
    id: 'utensileria',
    name: 'UTENSILERIA',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
    children: [
      { 
        id: 'elettroutensili', 
        name: 'ELETTROUTENSILI',
        children: [
          { id: 'trapani', name: 'Trapani e Avvitatori' },
          { id: 'smerigliatrici', name: 'Smerigliatrici' },
          { id: 'tassellatori', name: 'Tassellatori' },
        ] 
      },
      { 
        id: 'manuali', 
        name: 'UTENSILI MANUALI',
        children: [
          { id: 'cacciaviti', name: 'Cacciaviti' },
          { id: 'pinze', name: 'Pinze e Tronchesi' },
          { id: 'chiavi', name: 'Chiavi Inglesi' },
        ] 
      },
    ]
  },
  {
    id: 'casa-bagno',
    name: 'CASA E BAGNO',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    children: [
      {
        id: 'bagno',
        name: 'ACCESSORI BAGNO',
        children: [
          { id: 'soffioni', name: 'Soffioni Doccia' },
          { id: 'flessibili', name: 'Flessibili Doccia' },
          { id: 'areatori', name: 'Areatori e Romigetto' },
        ]
      },
      {
        id: 'arredo',
        name: 'ARREDO E COMPLEMENTI',
        children: [
          { id: 'mensole', name: 'Mensole' },
          { id: 'ferramenta', name: 'Ferramenta per Mobili' },
        ]
      }
    ]
  }
];

export default function CategoryMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRootId, setActiveRootId] = useState<string>('illuminazione');
  const [activeSubId, setActiveSubId] = useState<string | null>('lampadine-led');

  const activeRoot = taxonomy.find(t => t.id === activeRootId);
  const activeSub = activeRoot?.children?.find(c => c.id === activeSubId) || activeRoot?.children?.[0];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-white hover:text-green-400 transition-colors bg-white/10 px-4 py-2 rounded-md font-medium"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Tutti
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full bg-white z-[70] transition-transform duration-300 ease-in-out flex w-full max-w-[850px] shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 bg-gray-100 text-black p-2 rounded-full shadow-sm hover:bg-gray-200 z-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Level 1: Macro Categories */}
        <div className="w-[200px] bg-white border-r border-gray-100 h-full overflow-y-auto pt-6 flex flex-col">
          {taxonomy.map((item) => {
            const isActive = activeRootId === item.id;
            return (
              <button
                key={item.id}
                onMouseEnter={() => {
                  setActiveRootId(item.id);
                  setActiveSubId(item.children?.[0]?.id || null);
                }}
                className={`w-full flex flex-col items-center justify-center p-4 gap-2 text-xs font-bold border-l-4 transition-colors ${
                  isActive 
                  ? 'border-green-600 text-green-600 bg-gray-50' 
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Level 2: Sub Categories */}
        <div className="w-[300px] bg-white h-full overflow-y-auto">
          {activeRoot && (
            <div className="flex flex-col h-full">
              <div className="p-6 pb-2 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">{activeRoot.name}</h2>
              </div>
              <div className="flex-grow overflow-y-auto">
                {activeRoot.children?.map((sub) => {
                  const isSubActive = activeSubId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onMouseEnter={() => setActiveSubId(sub.id)}
                      className={`w-full flex justify-between items-center p-4 px-6 text-sm text-left transition-colors border-b border-gray-50 ${
                        isSubActive 
                        ? 'text-green-600 font-bold bg-gray-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {sub.name}
                      <svg className={`w-4 h-4 ${isSubActive ? 'text-green-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <div className="p-4 border-t border-gray-100">
                <Link 
                  href={`/catalog?q=${activeRoot.name.toLowerCase()}`}
                  onClick={() => setIsOpen(false)}
                  className="text-green-600 text-sm font-bold hover:underline"
                >
                  Vedi tutto {activeRoot.name} &rsaquo;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Level 3: Products / Sub-sub Categories */}
        <div className="w-[350px] bg-gray-50 h-full overflow-y-auto border-l border-gray-100">
          {activeSub && (
            <div className="flex flex-col h-full">
              <div className="p-6 pb-2 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">{activeSub.name}</h2>
              </div>
              <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2">
                {activeSub.children && activeSub.children.length > 0 ? (
                  activeSub.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/catalog?q=${child.name.toLowerCase()}`}
                      onClick={() => setIsOpen(false)}
                      className="p-3 text-sm text-gray-600 hover:text-green-600 hover:bg-white rounded transition-colors flex justify-between items-center"
                    >
                      {child.name}
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    Nessuna sottocategoria trovata.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100">
                <Link 
                  href={`/catalog?q=${activeSub.name.toLowerCase()}`}
                  onClick={() => setIsOpen(false)}
                  className="text-green-600 text-sm font-bold hover:underline"
                >
                  Vedi tutto {activeSub.name} &rsaquo;
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
