import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClientFidoSummary } from '@/lib/fido';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

export default async function AccountOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';

  const [orders, fidoSummary] = await Promise.all([
    prisma.b2BOrder.findMany({
      where: { 
        OR: [{ userId: session.userId }, { promoProspectId: session.userId }],
        status: { notIn: ['DRAFT', 'PENDING_AGENT_REVIEW'] },
        storeMode: currentTab
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        fidoMovements: { select: { amount: true } }
      }
    }),
    getClientFidoSummary(session.userId)
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">Ordini Conclusi</h1>
        {fidoSummary?.hasFido && (
          <Link
            prefetch={true}
            href="/account/scadenziario"
            className="self-start sm:self-auto px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-sm font-bold transition-colors"
          >
            📅 Vai allo Scadenziario Pagamenti &rarr;
          </Link>
        )}
      </div>

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

            const grossTotal = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
            const movSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
            const paidAmount = order.isPaid
              ? grossTotal
              : Math.min(grossTotal, Math.max(0, Math.round(Math.max(Number(order.paidAmount) || 0, movSum) * 100) / 100));
            const remainingAmount = Math.max(0, Math.round((grossTotal - paidAmount) * 100) / 100);

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="font-bold text-lg">Ordine #{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor}`}>
                      {statusText}
                    </span>
                    {fidoSummary?.hasFido && (isApproved || order.status === 'SENT_TO_ZUCCHETTI') && (
                      <>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold border ${
                            order.isPaid || remainingAmount <= 0.009
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : paidAmount > 0
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {order.isPaid || remainingAmount <= 0.009
                            ? 'Saldato'
                            : paidAmount > 0
                            ? `Acconto € ${paidAmount.toFixed(2)} • Residuo € ${remainingAmount.toFixed(2)}`
                            : 'Da saldare'}
                        </span>
                        {fidoSummary.fidoPaymentLabel && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            Pagamento: {fidoSummary.fidoPaymentLabel}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Effettuato il: {order.createdAt.toLocaleDateString('it-IT')} {order.createdAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700">
                    Prodotti: <span className="font-semibold">{order.items.reduce((acc, item) => acc + item.quantity, 0)} pz.</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto gap-3">
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">Totale Ordine:</span>
                    <span className="font-bold text-xl text-gray-900">€ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <DownloadOrderPdfButton orderId={order.id} />
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
