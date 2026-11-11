import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';
import Link from 'next/link';
import Image from 'next/image';
import AcceptDraftButton from '../AcceptDraftButton';
import DeleteSentOrderButton from '../DeleteSentOrderButton';
import OrderEditModeClient from '../OrderEditModeClient';
import ZucchettiDocRefEditor from './ZucchettiDocRefEditor';
import { isOrderLockedForUser } from '@/app/actions/orderLock';
import { syncSavedOrdersStockForUser } from '@/app/actions/savedOrderStock';
import { getClientFidoSummary } from '@/lib/fido';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

export const dynamic = 'force-dynamic';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  let order = await prisma.b2BOrder.findUnique({
    where: { id: params.id },
    include: { 
      items: {
        orderBy: { id: 'asc' }
      },
      user: true,
      promoProspect: true,
      fidoMovements: {
        select: { amount: true }
      }
    }
  });

  const isAgent = session.user.role === 'AGENT';
  const orderOwnerId = order?.userId || order?.promoProspectId;
  const orderAgentId = order?.user?.agentId || order?.promoProspect?.agentId;
  const isOrderOwner = orderOwnerId === session.userId;
  const isAssignedAgent = isAgent && orderAgentId === session.userId;

  if (!order || (!isOrderOwner && !isAssignedAgent)) {
    redirect(isAgent ? '/account/agent-orders' : '/account/orders');
  }

  if (order.status === 'DRAFT' && orderOwnerId && order.createdById === orderOwnerId) {
    await syncSavedOrdersStockForUser(orderOwnerId);
    const refreshed = await prisma.b2BOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: { id: 'asc' }
        },
        user: true,
        promoProspect: true,
        fidoMovements: {
          select: { amount: true }
        }
      }
    });
    if (refreshed) {
      order = refreshed;
    }
  }

  const isDraft = order.status === 'DRAFT';
  const isPending = order.status === 'PENDING_AGENT_REVIEW';
  const isApproved = order.status === 'APPROVED';
  const isSavedOrder = isDraft && (!order.createdById || order.createdById === orderOwnerId);
  const isElmark = order.storeMode === 'ELMARK';
  const tabParam = isElmark ? '?tab=elmark' : '';

  let statusColor = 'bg-gray-100 text-gray-800';
  let statusText = 'Sconosciuto';

  if (isSavedOrder) {
    statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
    statusText = 'Ordine Salvato';
  } else if (isDraft) {
    statusColor = 'bg-purple-100 text-purple-800 border-purple-200';
    statusText = 'Preventivo in Pausa';
  } else if (isPending) {
    statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    statusText = 'In attesa di revisione';
  } else if (isApproved) {
    statusColor = 'bg-green-100 text-green-800 border-green-200';
    statusText = 'Approvato';
  }

  let backLink = `/account/orders${tabParam}`;
  let backText = 'Torna a Ordini Conclusi';
  if (isAgent) {
    if (isApproved) {
      backLink = `/account/agent-completed${tabParam}`;
      backText = 'Torna a Ordini Conclusi';
    } else if (isSavedOrder) {
      backLink = `/account/saved-orders${tabParam}`;
      backText = 'Torna a Ordini Salvati dai Clienti';
    } else if (isDraft) {
      backLink = `/account/quotes${tabParam}`;
      backText = 'Torna a Preventivi Inviati';
    } else {
      backLink = `/account/agent-orders${tabParam}`;
      backText = 'Torna a Vaglio Ordini';
    }
  } else if (isPending) {
    backLink = `/account/sent-orders${tabParam}`;
    backText = 'Torna a Ordini Inviati';
  } else if (isSavedOrder) {
    backLink = `/account/saved-orders${tabParam}`;
    backText = 'Torna a Ordini Salvati';
  } else if (isDraft) {
    backLink = `/account/quotes${tabParam}`;
    backText = 'Torna ai Preventivi';
  }

  let genericDiscount = 0;
  let elmarkDiscounts: Record<string, number> = {};

  if (isAgent && (order.user || order.promoProspect)) {
    const owner: any = order.user || order.promoProspect;
    genericDiscount = owner.discount || 0;
    elmarkDiscounts = (owner.elmarkDiscounts as Record<string, number>) || {};
  } else {
    const { getEffectiveDiscount, getEffectiveElmarkDiscounts } = await import('@/lib/discount');
    genericDiscount = await getEffectiveDiscount();
    elmarkDiscounts = await getEffectiveElmarkDiscounts();
  }

  const populatedItems = await Promise.all(order.items.map(async (item) => {
    const p = await getProductById(item.sku) as any;

    return {
      ...item,
      product: p ? {
        title: (p.original_name || p.title) + ' - ' + p.sku,
        imageUrl: p.image_url || '/placeholder.png',
        sku: p.sku,
        stock: p.stock || 0,
        stock_main: p.stock_main,
        stock_ek: p.stock_ek
      } : null
    };
  }));

  const fidoSummary = order.userId ? await getClientFidoSummary(order.userId) : null;
  const orderGrossTotal = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
  const orderMovSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const orderPaidAmount = order.isPaid
    ? orderGrossTotal
    : Math.min(orderGrossTotal, Math.max(0, Math.round(Math.max(Number(order.paidAmount) || 0, orderMovSum) * 100) / 100));
  const orderRemainingAmount = Math.max(0, Math.round((orderGrossTotal - orderPaidAmount) * 100) / 100);
  const wouldExceedFido =
    Boolean(fidoSummary?.hasFido) &&
    !isApproved &&
    orderGrossTotal > (fidoSummary?.fidoDisponibile || 0);

  if (isPending || isSavedOrder || (isAgent && isDraft)) {
    const isLockedByOther = await isOrderLockedForUser(order.id, session.userId, session.user.role);
    return (
      <div>
        <div className="mb-6">
          <Link prefetch={true} href={backLink} className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
            &larr; {backText}
          </Link>
        </div>
        {fidoSummary?.hasFido && (
          <div
            className={`mb-4 p-4 rounded-lg border space-y-2 text-sm ${
              fidoSummary.isOverFido || wouldExceedFido
                ? 'bg-red-50 border-red-200 text-red-900'
                : fidoSummary.usagePct >= 80
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-bold uppercase tracking-wider text-xs block mb-0.5">
                  Situazione Fido Cliente (IVA incl.)
                  {fidoSummary.fidoPaymentLabel ? ` — Pagamento: ${fidoSummary.fidoPaymentLabel}` : ''}
                </span>
                {wouldExceedFido && (
                  <span className="text-xs text-red-700 font-semibold">
                    ⚠️ Attenzione: approvando questo ordine (€ {orderGrossTotal.toFixed(2)}) il cliente supererà il fido disponibile di € {(orderGrossTotal - fidoSummary.fidoDisponibile).toFixed(2)}. L&apos;invio a Zucchetti resta comunque abilitato.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span>Concesso: <strong>€ {fidoSummary.fidoConcesso.toFixed(2)}</strong></span>
                <span>Impegnato: <strong>€ {fidoSummary.fidoUtilizzato.toFixed(2)}</strong></span>
                <span className={fidoSummary.isOverFido ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {fidoSummary.isOverFido
                    ? `Sforato: -€ ${fidoSummary.overFidoAmount.toFixed(2)}`
                    : `Disponibile: € ${fidoSummary.fidoDisponibile.toFixed(2)}`}
                </span>
                <Link
                  href={isAgent && order.userId ? `/account/scadenziario?client=${order.userId}` : '/account/scadenziario'}
                  className="underline font-extrabold hover:opacity-80"
                >
                  Scadenziario &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
        <OrderEditModeClient 
          order={order} 
          populatedItems={populatedItems} 
          genericDiscount={genericDiscount}
          elmarkDiscounts={elmarkDiscounts} 
          isAgent={session.user.role === 'AGENT'} 
          isLockedByOther={isLockedByOther}
        />
      </div>
    );
  }

  const shortOrderId = order.id.slice(-6).toUpperCase();
  const dateFormatted = order.createdAt.toLocaleDateString('it-IT');
  const dateIso = order.createdAt.toISOString().split('T')[0];
  const [yyyy, mm, dd] = dateIso.split('-');
  const dateDashFormatted = dd && mm && yyyy ? `${dd}-${mm}-${yyyy}` : dateFormatted;
  const fallbackDocType = isElmark ? 'ORDIC' : 'ORDCL';

  const extractCleanDocNum = (
    rawRef?: string | null,
    docType: 'ORDCL' | 'ORDIC' = 'ORDCL'
  ) => {
    const defaultSerie = docType === 'ORDIC' ? 'OIC' : 'ST';
    const str = String(rawRef || '').trim();
    if (!str) return defaultSerie;
    if (str.includes('/')) {
      const [nPart, sPart] = str.split('/').map(s => s.trim());
      const cleanN = nPart.replace(/^.*n\.\s*/i, '').trim();
      const cleanS = (sPart || defaultSerie).split(/\s+/)[0];
      return `${cleanN}/${cleanS}`;
    }
    const nMatch = str.match(/n\.\s*([^\s]+)/i);
    if (nMatch && nMatch[1]) return nMatch[1];
    if (str === 'ORDIC' || str === 'OIC') return 'OIC';
    if (str === 'ORDCL' || str === 'ST') return 'ST';
    return str;
  };

  // Raggruppa le righe ordine per Documento Zucchetti generato (ORDCL vs ORDIC)
  const docGroupsMap = new Map<
    string,
    {
      docType: 'ORDCL' | 'ORDIC';
      docRef: string;
      docSerial: string | null;
      items: typeof populatedItems;
      imponibile: number;
      iva: number;
      totale: number;
    }
  >();

  for (const item of populatedItems) {
    const rawType = String((item as any).zucchettiDocType || fallbackDocType)
      .trim()
      .toUpperCase();
    const docType: 'ORDCL' | 'ORDIC' = rawType === 'ORDIC' ? 'ORDIC' : 'ORDCL';
    const itemSerial = (item as any).zucchettiDocSerial || null;
    const rawItemRef =
      (item as any).zucchettiDocRef ||
      (order.zucchettiOrderRef && !order.zucchettiOrderRef.includes('|')
        ? order.zucchettiOrderRef
        : '');
    const cleanRef = extractCleanDocNum(rawItemRef, docType);

    if (!docGroupsMap.has(docType)) {
      docGroupsMap.set(docType, {
        docType,
        docRef: cleanRef,
        docSerial: itemSerial,
        items: [],
        imponibile: 0,
        iva: 0,
        totale: 0,
      });
    }

    const grp = docGroupsMap.get(docType)!;
    grp.items.push(item);
    grp.imponibile += item.finalPrice * item.quantity;
    grp.iva = grp.imponibile * 0.22;
    grp.totale = grp.imponibile + grp.iva;
  }

  // Ordina i blocchi mostrando prima ORDCL e poi ORDIC
  const docGroups = Array.from(docGroupsMap.values()).sort((a, b) =>
    a.docType === b.docType ? 0 : a.docType === 'ORDCL' ? -1 : 1
  );

  return (
    <div>
      <div className="mb-6">
        <Link prefetch={true} href={backLink} className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
          &larr; {backText}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex flex-wrap items-center gap-3">
              Dettagli Ordine #{shortOrderId}
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor} text-base`}>
                {statusText}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">
              Data: {dateFormatted} {order.createdAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isAgent && (order.user || order.promoProspect) && (
              <p className="text-sm font-semibold text-gray-800 mt-1">
                Cliente: {(order.user || order.promoProspect)?.companyName || 'Cliente'} ({order.user?.zucchettiCode ? `Cod. ${order.user.zucchettiCode}` : `In attivazione - ${order.promoProspect?.username}`})
              </p>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-wrap items-center gap-3">
            <DownloadOrderPdfButton orderId={order.id} />
            {isAgent && !isApproved && (
              <DeleteSentOrderButton orderId={order.id} redirectUrl={backLink} />
            )}
            {isDraft && !isAgent && (
              <AcceptDraftButton orderId={order.id} />
            )}
          </div>
        </div>

        {fidoSummary?.hasFido && (
          <div
            className={`px-6 py-4 border-b space-y-2.5 text-sm ${
              fidoSummary.isOverFido
                ? 'bg-red-50/80 border-red-200 text-red-900'
                : fidoSummary.usagePct >= 80
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold uppercase tracking-wider text-xs">
                  Situazione Fido (IVA incl.)
                  {fidoSummary.fidoPaymentLabel ? ` — Pagamento: ${fidoSummary.fidoPaymentLabel}` : ''}
                </span>
                {(isApproved || order.status === 'SENT_TO_ZUCCHETTI') && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      order.isPaid || orderRemainingAmount <= 0.009
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : orderPaidAmount > 0
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {order.isPaid || orderRemainingAmount <= 0.009
                      ? 'Ordine Saldato'
                      : orderPaidAmount > 0
                      ? `Acconto € ${orderPaidAmount.toFixed(2)} • Residuo € ${orderRemainingAmount.toFixed(2)}`
                      : `Da saldare: € ${orderGrossTotal.toFixed(2)}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span>Concesso: <strong>€ {fidoSummary.fidoConcesso.toFixed(2)}</strong></span>
                <span>Impegnato: <strong>€ {fidoSummary.fidoUtilizzato.toFixed(2)}</strong></span>
                <span className={fidoSummary.isOverFido ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {fidoSummary.isOverFido
                    ? `Oltre Fido: -€ ${fidoSummary.overFidoAmount.toFixed(2)}`
                    : `Disponibile: € ${fidoSummary.fidoDisponibile.toFixed(2)}`}
                </span>
                <Link
                  href={isAgent && order.userId ? `/account/scadenziario?client=${order.userId}` : '/account/scadenziario'}
                  className="underline font-extrabold hover:opacity-80"
                >
                  Scadenziario &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Elenco Prodotti suddiviso per singolo Ordine Zucchetti (ORDCL / ORDIC) */}
        <div className="p-4 sm:p-6 bg-gray-50/60 space-y-6">
          {docGroups.map((group) => {
            const isOrdic = group.docType === 'ORDIC';
            const headerBg = isOrdic
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200';

            return (
              <div
                key={group.docType}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Intestazione essenziale: SOLO Riferimento in fattura e Data */}
                <div className={`px-4 py-3 border-b ${headerBg}`}>
                  <ZucchettiDocRefEditor
                    orderId={order.id}
                    docType={group.docType}
                    currentRef={group.docRef}
                    dateFormatted={dateDashFormatted}
                    canEdit={isAgent || session.user.role === 'ADMIN'}
                  />
                </div>

                {/* Tabella Prodotti di questo Documento Zucchetti */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 font-medium text-xs uppercase tracking-wider text-gray-500">
                  <div className="col-span-6">Prodotto</div>
                  <div className="col-span-2 text-center">Quantità</div>
                  <div className="col-span-2 text-right">Prezzo Scontato</div>
                  <div className="col-span-2 text-right">Totale Riga</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                      <div className="col-span-6 flex items-center gap-4">
                        <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                          <img src={item.product?.imageUrl || '/placeholder.png'} alt={item.product?.title || item.sku} className="object-contain w-full h-full" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                            {item.product?.title || 'Prodotto Sconosciuto'}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
                            CODICE PRODOTTO: <span className="font-mono">{item.sku}</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 text-center font-medium">
                        {item.quantity} pz.
                      </div>

                      <div className="col-span-2 text-right flex flex-col items-end">
                        {item.originalPrice > item.finalPrice && (
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <span className="text-[10px] text-gray-400 line-through">
                              € {item.originalPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                              -{item.discountString ? String(item.discountString).replace(/^-/, '') : `${Math.round((1 - (item.finalPrice / item.originalPrice)) * 100)}%`}
                            </span>
                          </div>
                        )}

                        <div className="font-bold text-sm text-gray-900">
                          € {item.finalPrice.toFixed(2).replace('.', ',')}
                        </div>
                      </div>

                      <div className="col-span-2 text-right font-bold text-brand-main">
                        € {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>

                {docGroups.length > 1 && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-end gap-4 sm:gap-6 text-sm">
                    <span className="text-gray-600">
                      Imponibile: <strong className="text-gray-900">€ {group.imponibile.toFixed(2).replace('.', ',')}</strong>
                    </span>
                    <span className="text-gray-600">
                      IVA (22%): <strong className="text-gray-900">€ {group.iva.toFixed(2).replace('.', ',')}</strong>
                    </span>
                    <span className="text-gray-900 font-bold">
                      Totale: <strong className="text-base text-brand-main">€ {group.totale.toFixed(2).replace('.', ',')}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Riepilogo Totale Complessivo Ordine Sito */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <div className="text-right w-full max-w-xs">
            <div className="flex justify-between items-center mb-2 text-gray-600">
              <span>Totale Imponibile:</span>
              <span>€ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-gray-600">
              <span>IVA (22%):</span>
              <span>€ {order.totalIva.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-300">
              <span className="text-lg font-bold">Totale Ordine:</span>
              <span className="text-2xl font-bold text-gray-900">
                € {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
