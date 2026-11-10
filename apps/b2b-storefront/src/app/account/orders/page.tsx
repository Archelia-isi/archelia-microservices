import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AccountOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';

  const orders = await prisma.b2BOrder.findMany({
    where: { 
      OR: [{ userId: session.userId }, { promoProspectId: session.userId }],
      status: { notIn: ['DRAFT', 'PENDING_AGENT_REVIEW'] },
      storeMode: currentTab
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Ordini Conclusi</h1>

      {session.user.isElmarkCustomer && (
        <div className="flex border-b border-gray-200 mb-6">
          <Link 
            href="/account/orders?tab=izzo"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ZUCCHETTI' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Izzo Distribuzione
          </Link>
          <Link 
            href="/account/orders?tab=elmark"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ELMARK' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Elmark
          </Link>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Non hai ancora ordini conclusi per questa divisione.</p>
          <Link prefetch={true} href="/catalog" className="inline-block bg-brand-main text-white px-6 py-2 font-bold rounded hover:bg-brand-hover transition-colors">
            Vai al Catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map((order) => {
            const isApproved = order.status === 'APPROVED';

            let statusColor = 'bg-gray-100 text-gray-800';
            let statusText = 'Sconosciuto';

            if (isApproved) {
              statusColor = 'bg-green-100 text-green-800 border-green-200';
              statusText = 'Approvato';
            } else if (order.status === 'SENT_TO_ZUCCHETTI') {
              statusColor = 'bg-green-100 text-green-800 border-green-200';
              statusText = 'Trasmesso';
            } else if (order.status === 'ERROR') {
              statusColor = 'bg-red-100 text-red-800 border-red-200';
              statusText = 'Errore Trasmissione';
            } else {
              statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
              statusText = order.status;
            }

            const shortOrderId = order.id.slice(-6).toUpperCase();
            const distinctDocRefs = Array.from(
              new Set(
                order.items
                  .map((it: any) => it.zucchettiDocRef)
                  .filter(Boolean)
              )
            ) as string[];
            const fallbackRefs =
              distinctDocRefs.length > 0
                ? distinctDocRefs
                : order.zucchettiOrderRef
                  ? order.zucchettiOrderRef.split(' | ').map(s => s.trim()).filter(Boolean)
                  : [];

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-bold text-lg">Ordine #{shortOrderId}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor}`}>
                      {statusText}
                    </span>
                    {fallbackRefs.length > 1 && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {fallbackRefs.length} Ordini Zucchetti (ORDCL + ORDIC)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Effettuato il: {order.createdAt.toLocaleDateString('it-IT')} {order.createdAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700">
                    Prodotti: <span className="font-semibold">{order.items.reduce((acc, item) => acc + item.quantity, 0)} pz.</span>
                  </div>
                  {fallbackRefs.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {fallbackRefs.map((refStr, idx) => {
                        const isOrdic = refStr.includes('ORDIC');
                        return (
                          <span
                            key={idx}
                            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                              isOrdic
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {refStr}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto gap-3">
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">Totale Ordine:</span>
                    <span className="font-bold text-xl text-gray-900">€ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    <Link prefetch={true} 
                      href={`/account/orders/${order.id}`}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors text-center flex-1 md:flex-none"
                    >
                      Dettagli
                    </Link>
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
