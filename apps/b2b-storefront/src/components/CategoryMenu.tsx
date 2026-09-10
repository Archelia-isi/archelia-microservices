'use client';

import { useState } from 'react';
import Link from 'next/link';
import taxonomyData from '@/lib/taxonomy.json';

const getSvgIcon = (name: string | undefined) => {
  switch (name) {
    case 'box': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    case 'tool': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>;
    case 'sun': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
    case 'home': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    case 'radio': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;
    case 'battery': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    case 'feather': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
    default: return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>;
  }
};

export default function CategoryMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRootId, setActiveRootId] = useState<string>(taxonomyData[0]?.id || '');
  const [activeSubId, setActiveSubId] = useState<string | null>(taxonomyData[0]?.children?.[0]?.id || null);

  const activeRoot = taxonomyData.find(t => t.id === activeRootId);
  const activeSub = activeRoot?.children?.find(c => c.id === activeSubId) || activeRoot?.children?.[0];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-green-400 transition-colors bg-white/10 px-4 py-2 rounded-md font-medium z-[60] relative"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        TUTTI
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed top-[80px] inset-x-0 bottom-0 bg-black/50 z-[40]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-[80px] left-0 h-[calc(100vh-80px)] bg-white z-[45] transition-transform duration-300 ease-in-out flex w-full max-w-[900px] shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Level 1: Macro Categories */}
        <div className="w-[180px] bg-white border-r border-gray-100 h-full overflow-y-auto flex flex-col">
          {taxonomyData.map((item) => {
            const isActive = activeRootId === item.id;
            return (
              <button
                key={item.id}
                onMouseEnter={() => {
                  setActiveRootId(item.id);
                  setActiveSubId(item.children?.[0]?.id || null);
                }}
                className={`w-full flex flex-col items-center justify-center p-4 gap-2 text-[10px] sm:text-xs font-bold border-l-4 transition-colors border-b border-gray-50 ${
                  isActive 
                  ? 'border-green-500 text-green-500 bg-white' 
                  : 'border-transparent text-[#1B2141] hover:bg-gray-50'
                }`}
              >
                {getSvgIcon((item as any).iconName)}
                {item.name.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Level 2: Sub Categories */}
        <div className="w-[320px] bg-white h-full overflow-y-auto flex flex-col border-r border-gray-100">
          {activeRoot && (
            <>
              <div className="flex-grow overflow-y-auto pt-2">
                {activeRoot.children?.map((sub) => {
                  const isSubActive = activeSubId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onMouseEnter={() => setActiveSubId(sub.id)}
                      className={`w-full flex justify-between items-center p-4 px-6 text-sm text-left transition-colors border-b border-gray-50 ${
                        isSubActive 
                        ? 'text-green-600 font-bold bg-gray-50' 
                        : 'text-[#1B2141] font-bold hover:bg-gray-50'
                      }`}
                    >
                      {sub.name.toUpperCase()}
                      <svg className={`w-4 h-4 ${isSubActive ? 'text-green-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <div className="p-6">
                <Link prefetch={true} 
                  href={`/catalog?l1=${activeRoot.id}`}
                  onClick={() => setIsOpen(false)}
                  className="text-green-600 text-sm font-bold hover:underline"
                >
                  Vedi tutto {activeRoot.name.toUpperCase()} &rsaquo;
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Level 3: Products / Sub-sub Categories */}
        <div className="flex-1 bg-white h-full overflow-y-auto">
          {activeSub && (
            <div className="flex flex-col h-full pt-2">
              <div className="flex-grow overflow-y-auto flex flex-col">
                {activeSub.children && activeSub.children.length > 0 ? (
                  activeSub.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/catalog?l1=${activeRoot!.id}&l2=${activeSub.id}&l3=${child.id}`}
                      onClick={() => setIsOpen(false)}
                      className="p-4 px-8 text-sm text-gray-600 font-medium hover:text-green-600 hover:bg-gray-50 transition-colors flex justify-between items-center border-b border-gray-50"
                    >
                      {child.name.toUpperCase()}
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="p-6">
                <Link prefetch={true} 
                  href={`/catalog?l1=${activeRoot!.id}&l2=${activeSub.id}`}
                  onClick={() => setIsOpen(false)}
                  className="text-green-600 text-sm font-bold hover:underline"
                >
                  Vedi tutto {activeSub.name.toUpperCase()} &rsaquo;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
