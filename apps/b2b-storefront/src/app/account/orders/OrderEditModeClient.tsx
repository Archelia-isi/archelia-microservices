'use client';

import { useState, useTransition } from 'react';
import QuickAddOrderClient from './QuickAddOrderClient';
import DeleteSentOrderButton from './DeleteSentOrderButton';
import { lockOrderForEdit, unlockOrder } from '@/app/actions/orderLock';
import { updateOrderItemQuantity, removeOrderItem } from '@/app/actions/order';
import QuantityInput from './QuantityInput';
import SendSavedOrderButton from './SendSavedOrderButton';
import { getAvailableStock } from '@/lib/stock';
import { parseSavedOrderStockMeta } from '@/lib/savedOrdersStock';

export default function OrderEditModeClient({ 
  order, 
  populatedItems, 
  genericDiscount,
  elmarkDiscounts,
  isAgent,
  isLockedByOther = false
}: { 
  order: any, 
  populatedItems: any[], 
  genericDiscount: number,
  elmarkDiscounts?: Record<string, number>,
  isAgent: boolean,
  isLockedByOther?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockedByAgent, setLockedByAgent] = useState(isLockedByOther);
  const [lockError, setLockError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSavedOrder = order.status === 'DRAFT' && (!order.createdById || order.createdById === order.userId);
  const stockMetaInfo = isSavedOrder ? parseSavedOrderStockMeta(order.notes) : null;
  const hasStockAdjustments = Boolean(stockMetaInfo?.hasAdjustments);
  const isElmark = order.storeMode === 'ELMARK';
  const tabParam = isElmark ? '?tab=elmark' : '';
  const redirectUrl = isAgent 
    ? (isSavedOrder ? `/account/saved-orders${tabParam}` : order.status === 'DRAFT' ? `/account/quotes${tabParam}` : `/account/agent-orders${tabParam}`)
    : (isSavedOrder ? `/account/saved-orders${tabParam}` : `/account/sent-orders${tabParam}`);

  const handleStartEdit = async () => {
    setLockError(null);
    setIsLocking(true);
    const res = await lockOrderForEdit(order.id);
    setIsLocking(false);
    
    if (res.success) {
      setIsEditing(true);
    } else {
      setLockedByAgent(true);
      setLockError(res.error || 'Impossibile modificare l\'ordine al momento.');
    }
  };

  const handleEndEdit = async () => {
    setIsEditing(false);
    await unlockOrder(order.id);
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    startTransition(async () => {
      const res: any = await updateOrderItemQuantity(order.id, itemId, newQty);
      if (!res.success) {
        if (res.stockExceeded) {
          setLockError(res.error || 'Giacenza superata.');
        } else {
          setIsEditing(false);
          setLockedByAgent(true);
          setLockError(res.error || 'Impossibile modificare l\'ordine.');
        }
      }
    });
  };

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const res = await removeOrderItem(order.id, itemId);
      if (!res.success) {
        setIsEditing(false);
        setLockedByAgent(true);
        setLockError(res.error || 'Impossibile modificare l\'ordine.');
      }
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden mt-6 ${hasStockAdjustments ? 'border-amber-400 ring-1 ring-amber-200' : 'border-gray-200'}`}>
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
            Dettagli Ordine #{order.id.slice(-6).toUpperCase()}
            {isSavedOrder ? (
              <span className="px-2 py-1 rounded text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200 text-base">
                Ordine Salvato
              </span>
            ) : order.status === 'DRAFT' ? (
              <span className="px-2 py-1 rounded text-xs font-semibold border bg-purple-100 text-purple-800 border-purple-200 text-base">
                Preventivo in Pausa
              </span>
            ) : lockedByAgent && !isAgent ? (
              <span className="px-2.5 py-1 rounded text-xs font-bold border bg-orange-100 text-orange-800 border-orange-300 text-base">
                In revisione dall&apos;agente
              </span>
            ) : (
              <span className="px-2 py-1 rounded text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-200 text-base">
                In attesa di revisione
              </span>
            )}
            {hasStockAdjustments && stockMetaInfo && (
              <span className="px-2.5 py-1 rounded text-xs font-bold border bg-amber-100 text-amber-900 border-amber-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Giacenza variata ({stockMetaInfo.adjustedCount} {stockMetaInfo.adjustedCount === 1 ? 'articolo' : 'articoli'})
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">
            Data: {new Date(order.createdAt).toLocaleDateString('it-IT')} {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {order.user && isAgent && (
            <p className="text-sm font-semibold text-gray-800 mt-1">
              Cliente: {order.user.companyName || `${order.user.firstName} ${order.user.lastName}`} (Cod. {order.user.zucchettiCode || 'N/A'})
            </p>
          )}
          {hasStockAdjustments && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 font-medium">
              <strong>Avviso disponibilità:</strong> le quantità degli articoli evidenziati sono state modificate automaticamente perché la giacenza attuale di magazzino è inferiore a quella scelta inizialmente. Non appena i prodotti torneranno disponibili, l&apos;ordine riporterà automaticamente le quantità ai valori originali.
            </div>
          )}
          {lockedByAgent && !isAgent && !lockError && (
            <p className="mt-2 text-sm text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded font-medium inline-block">
              Il tuo agente sta attualmente revisionando questo ordine. Non è possibile modificarlo o eliminarlo durante la revisione.
            </p>
          )}
          {lockError && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded font-medium inline-block">
              {lockError}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          {!isEditing ? (
            <>
              <DeleteSentOrderButton 
                orderId={order.id} 
                redirectUrl={redirectUrl} 
                disabled={lockedByAgent && !isAgent}
                onError={(err) => {
                  if (!isAgent) setLockedByAgent(true);
                  setLockError(err);
                }}
              />
              {!isAgent && (
                <button 
                  onClick={handleStartEdit}
                  disabled={isLocking || lockedByAgent}
                  className="px-6 py-2 bg-black text-white hover:bg-gray-800 font-bold text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLocking ? 'Attendere...' : 'Modifica Ordine'}
                </button>
              )}
              {isSavedOrder && !isAgent && (
                <SendSavedOrderButton orderId={order.id} />
              )}
              {isAgent && (
                <button 
                  onClick={async () => {
                    const { startOrderReview } = await import('@/app/actions/agent');
                    const res = await startOrderReview(order.id, `/account/orders/${order.id}`);
                    if (res.success) {
                      window.location.href = '/cart';
                    } else {
                      setLockError(res.error || 'Impossibile revisionare l\'ordine al momento.');
                    }
                  }}
                  className="px-6 py-2 bg-brand-main text-white hover:bg-brand-hover font-bold text-sm rounded transition-colors"
                >
                  Apri e Revisiona nel Carrello
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={handleEndEdit}
              className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 font-bold text-sm rounded transition-colors"
            >
              Finito (Salva Modifiche)
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <QuickAddOrderClient 
          orderId={order.id} 
          storeMode={order.storeMode} 
          userDiscount={genericDiscount} 
          elmarkDiscounts={elmarkDiscounts}
        />
      )}

      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-500">
          <div className="col-span-6">Prodotto</div>
          <div className="col-span-3 text-center">Quantità</div>
          <div className="col-span-3 text-right">Totale</div>
        </div>

        <div className="divide-y divide-gray-100 relative">
          {isPending && <div className="absolute inset-0 bg-white/50 z-10"></div>}
          {populatedItems.map((item) => {
            const skuKey = item.sku?.toUpperCase() || '';
            const adjustment = stockMetaInfo?.meta?.adjusted?.[skuKey];
            const isRowAdjusted = Boolean(adjustment);
            const isZeroStock = isRowAdjusted && item.quantity === 0;

            return (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${
                  isZeroStock
                    ? 'bg-red-50/80 border-l-4 border-l-red-500'
                    : isRowAdjusted
                    ? 'bg-amber-50/90 border-l-4 border-l-amber-500'
                    : ''
                }`}
              >
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                    <img src={item.product?.imageUrl || '/placeholder.png'} alt="" className="object-contain w-full h-full" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                      {item.product?.title || 'Prodotto Sconosciuto'}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                      CODICE: <span className="font-mono">{item.sku}</span>
                    </div>
                    {isRowAdjusted && adjustment && (
                      <div
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border mt-0.5 self-start ${
                          isZeroStock
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          {isZeroStock
                            ? `Giacenza esaurita: modificata da ${adjustment.originalQty} pz a 0 pz`
                            : `Giacenza variata: modificata da ${adjustment.originalQty} pz a ${item.quantity} pz`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                  {isEditing ? (
                    <>
                      <QuantityInput 
                        initialQuantity={item.quantity} 
                        maxStock={item.product ? getAvailableStock(item.product, order.storeMode) : undefined}
                        onUpdate={(newQty) => handleUpdateQty(item.id, newQty)} 
                      />
                      {isRowAdjusted && adjustment && (
                        <span className="text-[11px] font-semibold text-amber-800">
                          Richiesti inizialmente: <span className="line-through">{adjustment.originalQty} pz.</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      {isRowAdjusted && adjustment && (
                        <span className="text-xs text-gray-400 line-through font-medium">
                          {adjustment.originalQty} pz.
                        </span>
                      )}
                      <span
                        className={`font-bold ${
                          isZeroStock
                            ? 'text-red-600'
                            : isRowAdjusted
                            ? 'text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300'
                            : 'font-medium text-gray-900'
                        }`}
                      >
                        {item.quantity} pz.
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-3 flex items-center justify-end gap-4">
                  <div className="text-right flex flex-col items-end">
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
                    <div className="font-bold text-brand-main mt-1">
                      Tot. € {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  {isEditing && (
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Rimuovi"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
  );
}
