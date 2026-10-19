import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import AcceptDraftButton from '../orders/AcceptDraftButton';
import DeleteSentOrderButton from '../orders/DeleteSentOrderButton';

export const dynamic = 'force-dynamic';

export default async function AccountQuotesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';
  const isAgent = session.user.role === 'AGENT';

  if (isAgent) {
    const rawQuotes = await prisma.b2BOrder.findMany({
      where: {
        status: 'DRAFT',
        storeMode: currentTab,
        OR: [
          { createdById: session.userId },
          { user: { agentId: session.userId } },
        ],
      },
      include: {
        user: true,
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Escludiamo gli ordini salvati privatamente dal cliente (dove createdById === userId)
    const agentQuotes = rawQuotes.filter((q) => q.createdById !== q.userId);

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Preventivi Inviati</h1>
          <p className="text-gray-500 mt-2">
            Qui trovi tutti i preventivi messi in pausa e inviati ai tuoi clienti, pronti per essere modificati o confermati.
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <Link
            href="/account/quotes?tab=zucchetti"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'ZUCCHETTI'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Izzo Distribuzione
          </Link>
          <Link
            href="/account/quotes?tab=elmark"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'ELMARK'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Elmark
          </Link>
        </div>

        {agentQuotes.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">Nessun preventivo inviato</h3>
            <p className="text-gray-500 mt-2">Al momento non ci sono preventivi in pausa per questa divisione.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {agentQuotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Preventivo #{quote.id.slice(-6).toUpperCase()}</div>
                    <div className="font-bold text-gray-900 text-lg">
                      {quote.user?.companyName || `${quote.user?.firstName || ''} ${quote.user?.lastName || ''}`.trim() || 'Cliente'}
                    </div>
                    <div className="text-xs text-gray-500">Cod. Zucchetti: {quote.user?.zucchettiCode || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-bold px-3 py-1 rounded-full border">
                      Preventivo Inviato
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(quote.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </div>
                  </div>
                </div>

                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex gap-8 text-sm">
                    <div>
                      <span className="text-gray-500 block">Articoli:</span>
                      <span className="font-medium text-gray-900">
                        {quote.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} pz
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Totale Preventivo:</span>
                      <span className="font-medium text-gray-900 text-lg">
                        € {quote.totalAmount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    <DeleteSentOrderButton orderId={quote.id} redirectUrl={null} label="Elimina" />

                    <Link
                      prefetch={true}
                      href={`/account/orders/${quote.id}`}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors text-center flex items-center justify-center"
                    >
                      Dettagli
                    </Link>

                    <form
                      action={async () => {
                        'use server';
                        const { startOrderReview } = await import('@/app/actions/agent');
                        const originUrl = `/account/quotes?tab=${currentTab === 'ELMARK' ? 'elmark' : 'zucchetti'}`;
                        const res = await startOrderReview(quote.id, originUrl);
                        if (res.success) {
                          redirect('/cart');
                        }
                      }}
                    >
                      <button
                        type="submit"
                        className="bg-brand-main hover:bg-brand-hover text-white font-bold py-2 px-6 rounded transition-colors text-sm"
                      >
                        Apri e Revisiona
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const quotes = await prisma.b2BOrder.findMany({
    where: { 
      userId: session.userId,
      status: 'DRAFT',
      createdById: { not: session.userId },
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
