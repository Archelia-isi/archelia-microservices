import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AcceptDraftButton from '../orders/AcceptDraftButton';

export default async function AccountQuotesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';

  const quotes = await prisma.b2BOrder.findMany({
    where: { 
      userId: session.userId,
      status: 'DRAFT',
      storeMode: currentTab
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Preventivi</h1>

      {session.user.isElmarkCustomer && (
        <div className="flex border-b border-gray-200 mb-6">
          <Link 
            href="/account/quotes?tab=izzo"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ZUCCHETTI' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Izzo Distribuzione
          </Link>
          <Link 
            href="/account/quotes?tab=elmark"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ELMARK' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Elmark
          </Link>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Non hai ancora preventivi in sospeso per questa divisione.</p>
          <Link prefetch={true} href="/catalog" className="inline-block bg-brand-main text-white px-6 py-2 font-bold rounded hover:bg-brand-hover transition-colors">
            Vai al Catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {quotes.map((quote) => {
            const isDraft = quote.status === 'DRAFT';
            const isPending = quote.status === 'PENDING_AGENT_REVIEW';

            let statusColor = 'bg-gray-100 text-gray-800';
            let statusText = 'Sconosciuto';

            if (isDraft) {
              statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
              statusText = 'Preventivo in Pausa';
            } else if (isPending) {
              statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              statusText = 'In attesa di revisione';
            }

            return (
              <div key={quote.id} className={`bg-white rounded-lg shadow-sm border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDraft ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">Preventivo #{quote.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Creato il: {quote.createdAt.toLocaleDateString('it-IT')} {quote.createdAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700">
                    Prodotti: <span className="font-semibold">{quote.items.reduce((acc, item) => acc + item.quantity, 0)} pz.</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto gap-3">
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">Totale Preventivo:</span>
                    <span className="font-bold text-xl text-gray-900">€ {quote.totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    <Link prefetch={true} 
                      href={`/account/orders/${quote.id}`}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors text-center flex-1 md:flex-none"
                    >
                      Dettagli
                    </Link>
                    {isDraft && (
                      <AcceptDraftButton orderId={quote.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
