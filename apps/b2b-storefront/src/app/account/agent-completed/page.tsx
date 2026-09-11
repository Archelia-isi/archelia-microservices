import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';

export default async function AgentCompletedOrdersPage() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    redirect('/');
  }

  // Trova gli ordini APPROVED (o conclusi) dei clienti assegnati all'agente
  const completedOrders = await prisma.b2BOrder.findMany({
    where: {
      status: 'APPROVED',
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
        <h1 className="text-2xl font-bold text-gray-900">Ordini Conclusi</h1>
        <p className="text-gray-500 mt-2">Storico degli ordini dei tuoi clienti inviati con successo a Zucchetti.</p>
      </div>

      {completedOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Nessun ordine completato</h3>
          <p className="text-gray-500 mt-2">I tuoi clienti non hanno ancora ordini conclusi.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedOrders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm text-gray-500">Ordine #{order.id.slice(-6).toUpperCase()}</div>
                  <div className="font-bold text-gray-900 text-lg">{order.user.companyName || `${order.user.firstName} ${order.user.lastName}`}</div>
                  <div className="text-xs text-gray-500">Cod. Zucchetti: {order.user.zucchettiCode || 'N/A'}</div>
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
          ))}
        </div>
      )}
    </div>
  );
}
