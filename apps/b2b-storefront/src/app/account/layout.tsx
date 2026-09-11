import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
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
                  <Link prefetch={true} href="/account/impersonate" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Impersonifica Cliente
                  </Link>
                  <Link prefetch={true} href="/account/agent-orders" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Vaglio Ordini
                  </Link>
                  <Link prefetch={true} href="/account/agent-completed" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini Conclusi
                  </Link>
                </>
              ) : (
                <>
                  <Link prefetch={true} href="/account" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Bacheca
                  </Link>
                  <Link prefetch={true} href="/account/orders" className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-brand-main font-medium transition-colors">
                    Ordini e Preventivi
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
