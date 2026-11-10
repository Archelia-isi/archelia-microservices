import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';
import OrderDetailsModal from './OrderDetailsModal';

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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ordini Conclusi</h1>
        <p className="text-gray-500 mt-2">Storico degli ordini dei tuoi clienti inviati con successo a Zucchetti.</p>
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
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-500">Ordine #{shortOrderId}</span>
                      <span className="text-[11px] font-mono bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                        Rif. esterno Zucchetti: ORDINE WEB #{shortOrderId}
                      </span>
                      {fallbackRefs.length > 1 && (
                        <span className="text-[11px] font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                          {fallbackRefs.length} Documenti Zucchetti (ORDCL + ORDIC)
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 text-lg mt-0.5">{order.user?.companyName || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'Cliente'}</div>
                    <div className="text-xs text-gray-500">Cod. Zucchetti: {order.user?.zucchettiCode || 'N/A'}</div>
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
                    <Link
                      prefetch={true}
                      href={`/account/orders/${order.id}`}
                      className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-bold rounded border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      Scheda Ordine / Fatture
                    </Link>
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
