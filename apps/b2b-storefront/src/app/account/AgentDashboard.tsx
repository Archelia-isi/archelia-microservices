import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import Link from 'next/link';

export default async function AgentDashboard({ user }: { user: any }) {
  // Fetch clients assigned to this agent
  const clients = await prisma.b2BUser.findMany({
    where: { agentId: user.id }
  });
  
  const clientIds = clients.map(c => c.id);

  // Preventivi in Pausa
  const pausedOrders = await prisma.b2BOrder.findMany({
    where: { 
      userId: { in: clientIds },
      status: { in: ['DRAFT', 'PENDING_AGENT_REVIEW'] }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  // Feed Ordini (all recent orders, sent or otherwise)
  const recentOrders = await prisma.b2BOrder.findMany({
    where: { 
      userId: { in: clientIds }
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { user: true }
  });

  // Radar Dormienti
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeClientIds = await prisma.b2BOrder.findMany({
    where: {
      userId: { in: clientIds },
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { userId: true },
    distinct: ['userId']
  }).then(res => res.map(r => r.userId));

  const dormantClients = clients.filter(c => !activeClientIds.includes(c.id));

  // Top Spenders this month
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0,0,0,0);
  
  const currentMonthOrders = await prisma.b2BOrder.findMany({
    where: {
      userId: { in: clientIds },
      createdAt: { gte: firstDayOfMonth },
      status: 'APPROVED'
    },
    select: {
      userId: true,
      totalAmount: true
    }
  });
  
  const spendByClient: Record<string, number> = {};
  currentMonthOrders.forEach(o => {
    spendByClient[o.userId] = (spendByClient[o.userId] || 0) + o.totalAmount;
  });
  
  const topSpenders = Object.entries(spendByClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, amount]) => ({
      client: clients.find(c => c.id === id)!,
      amount
    }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Agente</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* Colonna Sinistra (Preventivi + Radar) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Preventivi in Pausa */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
              Preventivi in Sospeso
            </h2>
            {pausedOrders.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pausedOrders.map((order) => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-900">{order.user.companyName}</div>
                      <div className="text-sm text-gray-500">Codice Cliente: {order.user.zucchettiCode}</div>
                      <div className="text-xs text-gray-400 mt-1">Carrello del {new Date(order.createdAt).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <div className="font-bold text-lg text-gray-900">€ {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}</div>
                      <div className="text-sm text-yellow-600 font-medium">{order.status === 'DRAFT' ? 'In Pausa' : 'Da Revisionare'}</div>
                    </div>
                    <div>
                      {/* TODO: Add a real action to resume this specific cart */}
                      <Link prefetch={true} href="/account/impersonate" className="inline-block px-4 py-2 bg-black hover:bg-brand-main hover:text-black text-white rounded text-sm font-bold transition-colors">
                        Riprendi
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nessun preventivo in pausa al momento.</p>
            )}
          </div>

          {/* Radar Clienti */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-red-600">Radar Dormienti (>30gg)</h2>
              {dormantClients.length > 0 ? (
                <ul className="space-y-3">
                  {dormantClients.slice(0, 5).map(c => (
                    <li key={c.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium truncate max-w-[150px]">{c.companyName}</span>
                      <span className="text-gray-500">{c.zucchettiCode}</span>
                    </li>
                  ))}
                  {dormantClients.length > 5 && (
                    <li className="text-xs text-gray-400 text-center pt-2">...e altri {dormantClients.length - 5}</li>
                  )}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Tutti i tuoi clienti sono attivi!</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-brand-hover">Top Spenders (Mese)</h2>
              {topSpenders.length > 0 ? (
                <ul className="space-y-3">
                  {topSpenders.map(t => (
                    <li key={t.client.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium truncate max-w-[120px]">{t.client.companyName}</span>
                      <span className="font-bold">€ {t.amount.toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Nessun ordine confermato questo mese.</p>
              )}
            </div>
          </div>
        </div>

        {/* Colonna Destra (Feed) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-6">Real-Time Orders Feed</h2>
          
          <div className="relative border-l border-gray-200 ml-3 space-y-8">
            {recentOrders.length > 0 ? recentOrders.map(order => {
              let statusBadge = 'bg-gray-100 text-gray-800';
              let statusText = 'Sconosciuto';
              
              if (order.status === 'DRAFT') {
                statusBadge = 'bg-gray-100 text-gray-600';
                statusText = 'Carrello in Pausa';
              } else if (order.status === 'PENDING_AGENT_REVIEW') {
                statusBadge = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                statusText = 'In Lavorazione';
              } else if (order.status === 'APPROVED') {
                statusBadge = 'bg-green-100 text-green-800 border border-green-200';
                statusText = 'Inviato a Zucchetti';
              }

              // Tempo trascorso
              const diffMs = new Date().getTime() - new Date(order.createdAt).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              let timeStr = '';
              if (diffMins < 60) timeStr = \`${diffMins} min fa\`;
              else if (diffHours < 24) timeStr = \`${diffHours} ore fa\`;
              else timeStr = \`${diffDays} gg fa\`;

              return (
                <div key={order.id} className="relative pl-6">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-300 rounded-full border-2 border-white"></div>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-gray-900">{order.user.companyName}</div>
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-2">{timeStr}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">#{order.id.slice(-6).toUpperCase()}</div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold">€ {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}</div>
                    <div className={\`text-xs px-2 py-1 rounded ${statusBadge}\`}>
                      {statusText}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-sm ml-6">Nessun ordine nel feed.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
