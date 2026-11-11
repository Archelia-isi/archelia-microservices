import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClientFidoSummary, computeOrderInstallments } from '@/lib/fido';

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

      {fidoSummary?.hasFido && fidoSummary.dueSchedule.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Scadenziario Pagamenti ({fidoSummary.fidoPaymentLabel})
              </h2>
              <p className="text-xs text-gray-500">
                Gli ordini che scadono nello stesso giorno vengono sommati automaticamente in un unico totale giornaliero (IVA incl.).
              </p>
            </div>
            <div className="text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              Totale impegnato da saldare:{' '}
              <strong className="text-gray-900">
                € {fidoSummary.fidoUtilizzato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fidoSummary.dueSchedule.map((grp) => (
              <div
                key={grp.dueDateIso}
                className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 ${
                  grp.isOverdue
                    ? 'bg-red-50/70 border-red-200'
                    : grp.isDueSoon
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-gray-900">
                      Scadenza {grp.dueDateFormatted}
                    </span>
                    {grp.isOverdue && (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase">
                        Scaduta
                      </span>
                    )}
                    {!grp.isOverdue && grp.isDueSoon && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold uppercase">
                        In scadenza
                      </span>
                    )}
                    {grp.ordersCount > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
                        Somma di {grp.ordersCount} ordini
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-base font-black shrink-0 ${
                      grp.isOverdue ? 'text-red-700' : 'text-gray-900'
                    }`}
                  >
                    € {grp.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-700">
                  {grp.orders.map((o, idx) => (
                    <Link
                      key={`${o.orderId}_${idx}`}
                      href={`/account/orders/${o.orderId}`}
                      className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-200 font-medium transition-colors"
                    >
                      <strong>#{o.shortOrderId}</strong> ({o.orderDateFormatted}
                      {o.installmentLabel !== 'Saldo ordine' ? ` • ${o.installmentLabel}` : ''}):{' '}
                      <strong>€ {o.amount.toFixed(2).replace('.', ',')}</strong>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            const orderInstallments =
              fidoSummary?.hasFido && (isApproved || order.status === 'SENT_TO_ZUCCHETTI')
                ? computeOrderInstallments(
                    order.createdAt,
                    grossTotal,
                    paidAmount,
                    Boolean(order.isPaid),
                    fidoSummary.fidoPaymentType
                  )
                : [];

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
                  {fidoSummary?.hasFido && !order.isPaid && remainingAmount > 0.009 && orderInstallments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-gray-600">
                        {orderInstallments.length > 1 ? 'Scadenze rate (IVA incl.):' : 'Scadenza pagamento (IVA incl.):'}
                      </span>
                      {orderInstallments.map((inst) => (
                        <span
                          key={inst.installmentNumber}
                          className={`px-2.5 py-0.5 rounded-md border font-semibold ${
                            inst.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through opacity-75'
                              : inst.isOverdue
                              ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                              : 'bg-gray-50 text-gray-900 border-gray-200'
                          }`}
                        >
                          {inst.dueDateFormatted}: € {inst.remainingAmount.toFixed(2).replace('.', ',')}
                          {inst.isPaid ? ' (Saldata)' : inst.isOverdue ? ' (Scaduta)' : ''}
                        </span>
                      ))}
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
