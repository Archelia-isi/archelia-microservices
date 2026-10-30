import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import SendSavedOrderButton from '../orders/SendSavedOrderButton';
import DeleteSentOrderButton from '../orders/DeleteSentOrderButton';
import { syncSavedOrdersStockForUser, syncSavedOrdersStockForAgent } from '@/app/actions/savedOrderStock';
import { parseSavedOrderStockMeta } from '@/lib/savedOrdersStock';

export const dynamic = 'force-dynamic';

export default async function AccountSavedOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const currentTab = searchParams.tab === 'elmark' ? 'ELMARK' : 'ZUCCHETTI';
  const isAgent = session.user.role === 'AGENT';

  if (isAgent) {
    const syncRes = await syncSavedOrdersStockForAgent(session.userId);
    const agentSavedOrders = syncRes.orders.filter((o: any) => o.storeMode === currentTab);

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ordini Salvati dai Clienti</h1>
          <p className="text-gray-500 mt-2">
            Qui puoi consultare, revisionare o eliminare gli ordini che i tuoi clienti hanno salvato ma non hanno ancora inviato.
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <Link
            href="/account/saved-orders?tab=zucchetti"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              currentTab === 'ZUCCHETTI'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Izzo Distribuzione</span>
            {syncRes.adjustedByMode.ZUCCHETTI > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                ⚠️ {syncRes.adjustedByMode.ZUCCHETTI}
              </span>
            )}
          </Link>
          <Link
            href="/account/saved-orders?tab=elmark"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              currentTab === 'ELMARK'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Elmark</span>
            {syncRes.adjustedByMode.ELMARK > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                ⚠️ {syncRes.adjustedByMode.ELMARK}
              </span>
            )}
          </Link>
        </div>

        {agentSavedOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">Nessun ordine salvato</h3>
            <p className="text-gray-500 mt-2">Al momento i tuoi clienti non hanno ordini salvati per questa divisione.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {agentSavedOrders.map((order: any) => {
              const { hasAdjustments, adjustedCount, adjustedList } = parseSavedOrderStockMeta(order.notes);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                    hasAdjustments ? 'border-amber-400 ring-1 ring-amber-200' : 'border-gray-200'
                  }`}
                >
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Ordine #{order.id.slice(-6).toUpperCase()}</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {(order.user || order.promoProspect)?.companyName || `${(order.user || order.promoProspect)?.firstName || ''} ${(order.user || order.promoProspect)?.lastName || ''}`.trim() || 'Cliente'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.user?.zucchettiCode ? `Cod. Zucchetti: ${order.user.zucchettiCode}` : `In attivazione (${order.promoProspect?.username || 'N/A'})`}
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-bold px-3 py-1 rounded-full border">
                          Ordine Salvato dal Cliente
                        </div>
                        {hasAdjustments && (
                          <div className="bg-amber-100 text-amber-900 border-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border">
                            Giacenza variata ({adjustedCount})
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(order.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </div>
                    </div>
                  </div>

                  {hasAdjustments && adjustedList.length > 0 && (
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
                      <span className="font-bold mr-2">Quantità adeguate alla giacenza attuale:</span>
                      {adjustedList.map((adj, idx) => (
                        <span key={adj.sku} className="inline-block mr-3">
                          <strong className="font-mono">{adj.sku}</strong> ({adj.originalQty} &rarr; {adj.currentQty} pz)
                          {idx < adjustedList.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-8 text-sm">
                      <div>
                        <span className="text-gray-500 block">Articoli:</span>
                        <span className="font-medium text-gray-900">
                          {order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} pz
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Totale Ordine:</span>
                        <span className="font-medium text-gray-900 text-lg">
                          € {order.totalAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                      <DeleteSentOrderButton orderId={order.id} redirectUrl={null} label="Elimina" />

                      <Link
                        prefetch={true}
                        href={`/account/orders/${order.id}`}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors text-center flex items-center justify-center"
                      >
                        Dettagli
                      </Link>

                      <form
                        action={async () => {
                          'use server';
                          const { startOrderReview } = await import('@/app/actions/agent');
                          const originUrl = `/account/saved-orders?tab=${currentTab === 'ELMARK' ? 'elmark' : 'zucchetti'}`;
                          const res = await startOrderReview(order.id, originUrl);
                          if (res.success) {
                            redirect('/cart');
                          }
                        }}
                      >
                        <button
                          type="submit"
                          className="bg-brand-main hover:bg-brand-hover text-white font-bold py-2 px-6 rounded transition-colors text-sm"
                        >
                          Apri e Revisiona
                        </button>
                      </form>
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

  const syncRes = await syncSavedOrdersStockForUser(session.userId);
  const orders = syncRes.orders.filter((o: any) => o.storeMode === currentTab);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Ordini Salvati</h1>

      {session.user.isElmarkCustomer && (
        <div className="flex border-b border-gray-200 mb-6">
          <Link 
            href="/account/saved-orders?tab=izzo"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'ZUCCHETTI' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <span>Izzo Distribuzione</span>
            {syncRes.adjustedByMode.ZUCCHETTI > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                ⚠️ {syncRes.adjustedByMode.ZUCCHETTI}
              </span>
            )}
          </Link>
          <Link 
            href="/account/saved-orders?tab=elmark"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${currentTab === 'ELMARK' ? 'border-brand-main text-brand-main' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <span>Elmark</span>
            {syncRes.adjustedByMode.ELMARK > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                ⚠️ {syncRes.adjustedByMode.ELMARK}
              </span>
            )}
          </Link>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 mb-4">Non hai ancora ordini salvati per questa divisione.</p>
          <Link prefetch={true} href="/catalog" className="inline-block bg-brand-main text-white px-6 py-2 font-bold rounded hover:bg-brand-hover transition-colors">
            Vai al Catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map((order: any) => {
            const { hasAdjustments, adjustedCount, adjustedList } = parseSavedOrderStockMeta(order.notes);

            return (
              <div
                key={order.id}
                className={`rounded-lg shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
                  hasAdjustments
                    ? 'bg-amber-50/70 border-2 border-amber-400 ring-1 ring-amber-200'
                    : 'bg-white border border-blue-200 ring-1 ring-blue-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-bold text-lg text-gray-900">
                      Ordine #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                      Ordine Salvato
                    </span>
                    {hasAdjustments && (
                      <span className="px-2.5 py-1 rounded text-xs font-bold border bg-amber-100 text-amber-900 border-amber-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Giacenza variata ({adjustedCount} {adjustedCount === 1 ? 'articolo modificato' : 'articoli modificati'})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Salvato il: {new Date(order.createdAt).toLocaleDateString('it-IT')} {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700">
                    Prodotti disponibili nell&apos;ordine: <span className="font-semibold">{order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} pz.</span>
                  </div>

                  {hasAdjustments && (
                    <div className="mt-3 p-3 rounded-md bg-white/90 border border-amber-300 text-xs text-amber-900">
                      <div className="font-bold mb-1">
                        Attenzione: alcune quantità sono state adeguate automaticamente alla disponibilità attuale:
                      </div>
                      <ul className="space-y-0.5 font-medium">
                        {adjustedList.map((adj) => (
                          <li key={adj.sku} className="flex items-center gap-1.5">
                            <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">{adj.sku}</span>
                            <span>
                              da <strong>{adj.originalQty} pz</strong> a{' '}
                              <strong className={adj.currentQty === 0 ? 'text-red-600' : 'text-amber-800'}>
                                {adj.currentQty} pz
                              </strong>
                              {adj.currentQty === 0 ? ' (esaurito)' : ' (disp. max attuale)'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto gap-3 shrink-0">
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
                    <SendSavedOrderButton orderId={order.id} />
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
