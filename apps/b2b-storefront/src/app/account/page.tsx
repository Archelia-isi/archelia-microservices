import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AccountDashboard() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await prisma.b2BUser.findUnique({
    where: { id: session.userId },
    include: { agent: true }
  });

  if (!user) redirect('/login');

  const recentOrders = await prisma.b2BOrder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Bacheca Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Dati Aziendali */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Dati Aziendali</h2>
          <div className="space-y-3 text-gray-700">
            <p><span className="font-medium text-gray-500">Ragione Sociale:</span> {user.companyName || 'Non specificato'}</p>
            <p><span className="font-medium text-gray-500">P.IVA:</span> {user.vatNumber || 'Non specificata'}</p>
            <p><span className="font-medium text-gray-500">Email:</span> {user.email || 'Non specificata'}</p>
          </div>
        </div>

        {/* Info Agente */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Il Tuo Agente</h2>
          {user.agent ? (
            <div className="space-y-3 text-gray-700">
              <p><span className="font-medium text-gray-500">Nome:</span> {user.agent.companyName || `${user.agent.firstName} ${user.agent.lastName}`}</p>
              <p><span className="font-medium text-gray-500">Email:</span> {user.agent.email || 'Non disponibile'}</p>
              <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded text-sm text-gray-600">
                Il tuo agente è a disposizione per preventivi personalizzati e assistenza sugli ordini.
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              Nessun agente assegnato al tuo account.
            </div>
          )}
        </div>
      </div>

      {/* Ultimi Ordini */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Ultimi Ordini e Preventivi</h2>
          <Link prefetch={true} href="/account/orders" className="text-[#00C800] hover:underline font-medium">
            Vedi tutti &rarr;
          </Link>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const date = new Date(order.createdAt).toLocaleDateString('it-IT');
              let statusText = 'Sconosciuto';
              let statusColor = 'text-gray-500';

              if (order.status === 'DRAFT') {
                statusText = 'Preventivo in Pausa';
                statusColor = 'text-blue-600 font-medium';
              } else if (order.status === 'PENDING_AGENT_REVIEW') {
                statusText = 'In revisione';
                statusColor = 'text-yellow-600 font-medium';
              } else if (order.status === 'APPROVED') {
                statusText = 'Approvato';
                statusColor = 'text-green-600 font-medium';
              }

              return (
                <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-lg mb-1">#{order.id.slice(-6).toUpperCase()}</div>
                    <div className="text-sm text-gray-500">Effettuato il {date}</div>
                  </div>
                  <div>
                    <div className="text-right font-bold">€ {(order.totalAmount + order.totalIva).toFixed(2)}</div>
                    <div className={`text-right text-sm ${statusColor}`}>{statusText}</div>
                  </div>
                  <div>
                    <Link prefetch={true} href={`/account/orders/${order.id}`} className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm font-medium transition-colors">
                      Dettagli
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Nessun ordine recente.</p>
        )}
      </div>
    </div>
  );
}
