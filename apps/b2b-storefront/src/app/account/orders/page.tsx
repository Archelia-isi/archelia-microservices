import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AcceptDraftButton from './AcceptDraftButton';

export default async function AccountOrdersPage() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const orders = await prisma.b2BOrder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">I miei Ordini e Preventivi</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Non hai ancora effettuato ordini o ricevuto preventivi.</p>
          <Link href="/catalog" className="inline-block bg-[#00C800] text-white px-6 py-2 font-bold rounded hover:bg-green-600 transition-colors">
            Vai al Catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map((order) => {
            const isDraft = order.status === 'DRAFT';
            const isPending = order.status === 'PENDING_AGENT_REVIEW';
            const isApproved = order.status === 'APPROVED';

            let statusColor = 'bg-gray-100 text-gray-800';
            let statusText = 'Sconosciuto';

            if (isDraft) {
              statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
              statusText = 'Preventivo in Pausa';
            } else if (isPending) {
              statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              statusText = 'In attesa di revisione';
            } else if (isApproved) {
              statusColor = 'bg-green-100 text-green-800 border-green-200';
              statusText = 'Approvato';
            }

            return (
              <div key={order.id} className={`bg-white rounded-lg shadow-sm border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDraft ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">Ordine #{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor}`}>
                      {statusText}
                    </span>
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
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    <Link 
                      href={`/account/orders/${order.id}`}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors text-center flex-1 md:flex-none"
                    >
                      Dettagli
                    </Link>
                    {isDraft && (
                      <AcceptDraftButton orderId={order.id} />
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
