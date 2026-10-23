import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { syncSavedOrdersStockForUser } from '@/app/actions/savedOrderStock';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const cookieStore = cookies();
  const storeMode = cookieStore.get('b2b_store_mode')?.value;
  const tabParam = storeMode === 'ELMARK' ? '?tab=elmark' : '';

  let hasSavedOrderStockChanges = false;
  let adjustedOrdersCount = 0;
  if (session.user.role !== 'AGENT') {
    const syncRes = await syncSavedOrdersStockForUser(session.userId);
    hasSavedOrderStockChanges = syncRes.hasAnyAdjustments;
    adjustedOrdersCount = syncRes.adjustedOrdersCount;
  }

  return (
    <div className="max-w-7xl mx-auto py-4">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-black text-white">
              <h2 className="text-xl font-bold">Area Privata</h2>
              <p className="text-sm text-gray-400 mt-1">{session.user.companyName || `${session.user.firstName} ${session.user.lastName}`}</p>
            </div>
            <nav className="flex flex-col p-2 divide-y divide-gray-100">
              {session.user.role === 'AGENT' ? (
                <>
                  <Link prefetch={true} href="/account" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Dashboard Agente
                  </Link>
                  <Link prefetch={true} href="/account/clients" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Clienti
                  </Link>
                  <Link prefetch={true} href="/account/catalog-builder" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors flex items-center justify-between">
                    <span>Sviluppa Catalogo</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-main text-black rounded">
                      PDF
                    </span>
                  </Link>
                  <Link prefetch={true} href={`/account/agent-orders${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Vaglio Ordini
                  </Link>
                  <Link prefetch={true} href={`/account/saved-orders${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini Salvati dai Clienti
                  </Link>
                  <Link prefetch={true} href={`/account/quotes${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Preventivi Inviati
                  </Link>
                  <Link prefetch={true} href={`/account/agent-completed${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini Conclusi
                  </Link>
                </>
              ) : (
                <>
                  <Link prefetch={true} href="/account" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Bacheca
                  </Link>
                  <Link prefetch={true} href={`/account/orders${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini Conclusi
                  </Link>
                  <Link prefetch={true} href={`/account/sent-orders${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini Inviati
                  </Link>
                  <Link
                    prefetch={true}
                    href={`/account/saved-orders${tabParam}`}
                    className={`px-4 py-3 font-medium transition-colors flex flex-col gap-1 rounded ${
                      hasSavedOrderStockChanges
                        ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-l-4 border-amber-500 font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-brand-main'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Ordini Salvati</span>
                      {hasSavedOrderStockChanges && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                          {adjustedOrdersCount}
                        </span>
                      )}
                    </div>
                    {hasSavedOrderStockChanges && (
                      <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 leading-tight">
                        <svg className="w-3.5 h-3.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Giacenza variata
                      </span>
                    )}
                  </Link>
                  <Link prefetch={true} href={`/account/quotes${tabParam}`} className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Preventivi
                  </Link>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* Contenuto Principale */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
        
      </div>
    </div>
  );
}
