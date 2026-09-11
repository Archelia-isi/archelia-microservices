import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default async function AgentOrdersPage() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    redirect('/');
  }

  // Trova gli ordini PENDING_AGENT_REVIEW dei clienti assegnati all'agente
  const pendingOrders = await prisma.b2BOrder.findMany({
    where: {
      status: 'PENDING_AGENT_REVIEW',
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ordini da Revisionare (Vaglio)</h1>
        <p className="text-gray-500 mt-2">Qui trovi tutti gli ordini inseriti dai tuoi clienti che necessitano della tua approvazione prima di essere inviati a Zucchetti.</p>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Nessun ordine in attesa</h3>
          <p className="text-gray-500 mt-2">Al momento non ci sono ordini da revisionare.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm text-gray-500">Ordine #{order.id.slice(-6).toUpperCase()}</div>
                  <div className="font-bold text-gray-900 text-lg">{order.user.companyName || `${order.user.firstName} ${order.user.lastName}`}</div>
                  <div className="text-xs text-gray-500">Cod. Zucchetti: {order.user.zucchettiCode || 'N/A'}</div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
                    Da Revisionare
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(order.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-8 text-sm">
                  <div>
                    <span className="text-gray-500 block">Articoli:</span>
                    <span className="font-medium text-gray-900">{order.items.reduce((acc: any, item: any) => acc + item.quantity, 0)} pz</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Totale Ordine:</span>
                    <span className="font-medium text-gray-900 text-lg">€ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
                
                <form action={async () => {
                  'use server';
                  const { startOrderReview } = await import('@/app/actions/agent');
                  const res = await startOrderReview(order.id);
                  if (res.success) {
                    redirect('/cart');
                  }
                }}>
                  <button 
                    type="submit"
                    className="bg-brand-main hover:bg-brand-hover text-white font-bold py-2 px-6 rounded transition-colors"
                  >
                    Apri e Revisiona
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
