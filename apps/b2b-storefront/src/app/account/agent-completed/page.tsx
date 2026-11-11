import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';
import OrderDetailsModal from './OrderDetailsModal';
import { formatFidoPaymentType } from '@/lib/fido';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

export default async function AgentCompletedOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    redirect('/');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';

  // Trova gli ordini APPROVED (o conclusi) dei clienti assegnati all'agente
  const completedOrders = await prisma.b2BOrder.findMany({
    where: {
      status: 'APPROVED',
      storeMode: currentTab,
      user: {
        agentId: session.userId,
      },
    },
    include: {
      user: true,
      items: true,
      fidoMovements: { select: { amount: true } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordini Conclusi</h1>
          <p className="text-gray-500 mt-1">Storico degli ordini dei tuoi clienti inviati con successo a Zucchetti.</p>
        </div>
        <Link
          prefetch={false}
          href="/account/scadenziario"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-sm font-bold transition-colors"
        >
          📅 Scadenziario Clienti &rarr;
        </Link>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <Link 
          href="/account/agent-completed?tab=zucchetti"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ZUCCHETTI' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Izzo Distribuzione
        </Link>
        <Link 
          href="/account/agent-completed?tab=elmark"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'ELMARK' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Elmark
        </Link>
      </div>

      {completedOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Nessun ordine completato</h3>
          <p className="text-gray-500 mt-2">I tuoi clienti non hanno ancora ordini conclusi per questa divisione.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedOrders.map(order => {
            const hasClientFido = Boolean(order.user?.fidoEnabled && Number(order.user?.fido || 0) > 0);
            const paymentLabel = hasClientFido ? formatFidoPaymentType(order.user?.fidoPaymentType) : '';
            const grossTotal = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
            const movSum = (order.fidoMovements || []).reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
            const paidAmount = order.isPaid
              ? grossTotal
              : Math.min(grossTotal, Math.max(0, Math.round(Math.max(Number(order.paidAmount) || 0, movSum) * 100) / 100));
            const remainingAmount = Math.max(0, Math.round((grossTotal - paidAmount) * 100) / 100);

            return (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm text-gray-500">Ordine #{order.id.slice(-6).toUpperCase()}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-gray-900 text-lg">{order.user?.companyName || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'Cliente'}</div>
                    {hasClientFido && (
                      <>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
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
                        {paymentLabel && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
                            Pagamento: {paymentLabel}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Cod. Zucchetti: {order.user?.zucchettiCode || 'N/A'}</div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                    Inviato a Zucchetti
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(order.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <OrderDetailsModal order={order} />
                  <DownloadOrderPdfButton orderId={order.id} />
                </div>
                <div className="flex gap-8 text-sm">
                  <div>
                    <span className="text-gray-500 block">Articoli:</span>
                    <span className="font-medium text-gray-900">{order.items.reduce((acc: any, item: any) => acc + item.quantity, 0)} pz</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Totale Ordine:</span>
                    <span className="font-medium text-gray-900 text-lg">€ {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}</span>
                  </div>
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
