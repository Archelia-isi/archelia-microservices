import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import Link from 'next/link';
import DeleteSentOrderButton from './orders/DeleteSentOrderButton';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

export default async function AgentDashboard({ user }: { user: any }) {
  // Fetch clients assigned to this agent
  const clients = await prisma.b2BUser.findMany({
    where: { agentId: user.id }
  });
  
  const clientIds = clients.map(c => c.id);

  // Preventivi in Pausa (inclusi 1° ordini di clienti in attivazione)
  const pausedOrders = await prisma.b2BOrder.findMany({
    where: { 
      OR: [
        { userId: { in: clientIds } },
        { promoProspect: { agentId: user.id } }
      ],
      status: { in: ['DRAFT', 'PENDING_AGENT_REVIEW'] }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true, promoProspect: true }
  });

  // Feed Ordini (all recent orders, sent or otherwise)
  const recentOrders = await prisma.b2BOrder.findMany({
    where: { 
      OR: [
        { userId: { in: clientIds } },
        { promoProspect: { agentId: user.id } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { user: true, promoProspect: true }
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
  }).then(res => res.map(r => r.userId).filter((id): id is string => Boolean(id)));

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
    if (o.userId) {
      spendByClient[o.userId] = (spendByClient[o.userId] || 0) + o.totalAmount;
    }
  });
  
  const topSpenders = Object.entries(spendByClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, amount]) => ({
      client: clients.find(c => c.id === id)!,
      amount
    }));

  // Widget "🔥 Lead Caldi AI SDR da Chiamare" (risposto / aperto PDF / carrello attivo / login senza ordine)
  const activePromoProspects = await prisma.b2BPromoProspect.findMany({
    where: {
      agentId: user.id,
      status: { in: ['CONTACTED', 'LOGGED_IN', 'ORDER_PENDING_APPROVAL'] },
    },
    include: {
      carts: {
        where: { status: 'ACTIVE' },
        include: { items: true },
      },
      orders: {
        where: { status: { in: ['PENDING_AGENT_REVIEW', 'DRAFT', 'APPROVED', 'SENT_TO_ZUCCHETTI'] } },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ lastLoginAt: 'desc' }, { emailSentAt: 'desc' }],
  });

  const warmSdrWithoutOrder = activePromoProspects
    .map((p: any) => {
      const cartQty = (p.carts || []).reduce(
        (sum: number, c: any) =>
          sum + (c.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0),
        0
      );
      const hasReplied = Boolean(p.lastReplyAt);
      const pdfCount = Number(p.catalogOpenCount || 0);
      const hasOpenedPdf = pdfCount > 0 || Boolean(p.catalogOpenedAt);
      const hasLoggedIn = Number(p.loginCount || 0) > 0 || Boolean(p.firstLoginAt);
      const hasOrders = (p.orders || []).length > 0;
      const isContactedByAgent = Boolean(p.agentContactedAt);
      const priority =
        (cartQty > 0 ? 300 : 0) +
        (hasReplied ? 200 : 0) +
        (hasOpenedPdf ? 100 : 0) +
        (hasLoggedIn ? 50 : 0);

      return {
        id: p.id as string,
        companyName: p.companyName as string,
        city: p.city as string | null,
        province: p.province as string | null,
        phone: (p.phone || p.whatsappPhone || null) as string | null,
        cartQty,
        hasReplied,
        lastReplySnippet: (p.lastReplySnippet || null) as string | null,
        pdfCount,
        hasOpenedPdf,
        hasLoggedIn,
        loginCount: Number(p.loginCount || 0),
        hasOrders,
        isContactedByAgent,
        priority,
      };
    })
    .filter(item => !item.hasOrders && item.priority > 0)
    .sort((a, b) => {
      if (a.isContactedByAgent !== b.isContactedByAgent) {
        return a.isContactedByAgent ? 1 : -1;
      }
      return b.priority - a.priority;
    });

  const warmToCallList = warmSdrWithoutOrder.filter(i => !i.isContactedByAgent);
  const warmRepliedCount = warmSdrWithoutOrder.filter(i => i.hasReplied).length;
  const warmPdfOpenedCount = warmSdrWithoutOrder.filter(i => i.hasOpenedPdf).length;
  const warmCartCount = warmSdrWithoutOrder.filter(i => i.cartQty > 0).length;
  const warmLoginCount = warmSdrWithoutOrder.filter(i => i.hasLoggedIn).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Dashboard Agente</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            prefetch={false}
            href="/account/prospects"
            className="px-4 py-2 text-sm font-bold rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 transition-colors flex items-center gap-1.5"
          >
            <span>🚀 Clienti in Attivazione</span>
          </Link>
          <Link
            prefetch={false}
            href="/account/clients"
            className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 transition-colors"
          >
            Gestione Clienti
          </Link>
          <Link
            prefetch={false}
            href="/account/scadenziario"
            className="px-4 py-2 text-sm font-bold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 transition-colors flex items-center gap-1.5"
          >
            <span>📅 Scadenziario</span>
          </Link>
          <Link
            prefetch={false}
            href="/account/discounts"
            className="px-4 py-2 text-sm font-bold rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors flex items-center gap-1.5"
          >
            <span>🏷️ Gestione Sconti</span>
          </Link>
          <Link
            prefetch={false}
            href="/account/catalog-builder"
            className="px-4 py-2 text-sm font-black rounded-lg bg-brand-main hover:bg-amber-400 text-black shadow-sm transition-colors flex items-center gap-2"
          >
            <span>📖 Sviluppa Catalogo PDF</span>
          </Link>
        </div>
      </div>

      {/* WIDGET IN EVIDENZA: 🔥 LEAD CALDI AI SDR DA CHIAMARE */}
      <div className="mb-8 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider">
                Priorità Commerciale
              </span>
              <h2 className="text-xl font-black text-gray-900">
                🔥 Lead Caldi AI SDR da Chiamare
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-xs font-black">
                {warmToCallList.length} da chiamare
              </span>
              {warmSdrWithoutOrder.length > warmToCallList.length && (
                <span className="text-xs font-semibold text-gray-500">
                  ({warmSdrWithoutOrder.length} caldi totali senza ordine)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Potenziali clienti che hanno risposto alla mail, aperto il Catalistino PDF o riempito
              il carrello ma non hanno ancora inviato il 1° ordine.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold">
                💬 Hanno risposto: <strong>{warmRepliedCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-sky-100 text-sky-950 border border-sky-300 font-bold">
                👀 PDF aperto: <strong>{warmPdfOpenedCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-bold">
                🛒 Carrello attivo: <strong>{warmCartCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 font-bold">
                🔑 Accesso portale: <strong>{warmLoginCount}</strong>
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              prefetch={false}
              href="/account/prospects"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-black hover:bg-brand-main hover:text-black text-white font-black text-sm transition shadow-sm"
            >
              🔥 Apri Lead Caldi da Gestire →
            </Link>
          </div>
        </div>

        {warmToCallList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-200/80 grid grid-cols-1 md:grid-cols-3 gap-3">
            {warmToCallList.slice(0, 3).map(lead => (
              <div
                key={lead.id}
                className="p-3 rounded-lg bg-white border border-gray-200 flex flex-col justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-black text-gray-900 truncate">{lead.companyName}</div>
                  <div className="text-gray-500">
                    {[lead.city, lead.province ? `(${lead.province})` : '']
                      .filter(Boolean)
                      .join(' ') || 'Italia'}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {lead.cartQty > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-bold">
                        🛒 {lead.cartQty} pz
                      </span>
                    )}
                    {lead.hasReplied && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                        💬 Risposta
                      </span>
                    )}
                    {lead.hasOpenedPdf && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">
                        👀 PDF {Math.max(1, lead.pdfCount)}x
                      </span>
                    )}
                    {lead.hasLoggedIn && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-semibold">
                        🔑 Login {lead.loginCount}x
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="font-bold text-emerald-700 underline">
                      📞 {lead.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">Solo email</span>
                  )}
                  <Link
                    prefetch={false}
                    href="/account/prospects"
                    className="font-black text-indigo-700 hover:underline"
                  >
                    Gestisci →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
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
                {pausedOrders.map((order) => {
                  const owner = order.user || order.promoProspect;
                  const isPromoOrder = Boolean(order.promoProspect && !order.user);
                  return (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{owner?.companyName || 'Cliente'}</span>
                        {isPromoOrder && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-full">
                            🆕 1° ORDINE NUOVO CLIENTE
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.user?.zucchettiCode ? `Codice Cliente: ${order.user.zucchettiCode}` : `Username: ${order.promoProspect?.username || 'In attivazione'}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Carrello del {new Date(order.createdAt).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <div className="font-bold text-lg text-gray-900">€ {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}</div>
                      <div className="text-sm text-yellow-600 font-medium">{order.status === 'DRAFT' ? 'In Pausa' : 'Da Revisionare'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DownloadOrderPdfButton orderId={order.id} variant="compact" label="Scarica PDF" />
                      <DeleteSentOrderButton orderId={order.id} redirectUrl={null} label="Elimina" />
                      <Link prefetch={true} href={`/account/orders/${order.id}`} className="inline-block px-4 py-2 bg-black hover:bg-brand-main hover:text-black text-white rounded text-sm font-bold transition-colors">
                        Riprendi
                      </Link>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nessun preventivo in pausa al momento.</p>
            )}
          </div>

          {/* Radar Clienti */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-red-600">Radar Dormienti (&gt;30gg)</h2>
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
              if (diffMins < 60) timeStr = `${diffMins} min fa`;
              else if (diffHours < 24) timeStr = `${diffHours} ore fa`;
              else timeStr = `${diffDays} gg fa`;

              return (
                <div key={order.id} className="relative pl-6">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-300 rounded-full border-2 border-white"></div>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-gray-900">{(order.user || order.promoProspect)?.companyName || 'Cliente'}</div>
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-2">{timeStr}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">#{order.id.slice(-6).toUpperCase()}</div>
                  <div className="flex justify-between items-end gap-2">
                    <div className="font-bold">€ {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DownloadOrderPdfButton orderId={order.id} variant="compact" label="PDF" />
                      {order.status !== 'APPROVED' && (
                        <DeleteSentOrderButton orderId={order.id} redirectUrl={null} label="Elimina" compact />
                      )}
                      <div className={`text-xs px-2 py-1 rounded ${statusBadge}`}>
                        {statusText}
                      </div>
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
