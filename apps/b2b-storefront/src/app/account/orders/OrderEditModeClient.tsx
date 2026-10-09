'use client';

import { useState, useTransition } from 'react';
import QuickAddOrderClient from './QuickAddOrderClient';
import DeleteSentOrderButton from './DeleteSentOrderButton';
import { lockOrderForEdit, unlockOrder } from '@/app/actions/orderLock';
import { updateOrderItemQuantity, removeOrderItem } from '@/app/actions/order';
import QuantityInput from './QuantityInput';

export default function OrderEditModeClient({ 
  order, 
  populatedItems, 
  genericDiscount, 
  isAgent 
}: { 
  order: any, 
  populatedItems: any[], 
  genericDiscount: number,
  isAgent: boolean 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleStartEdit = async () => {
    setIsLocking(true);
    const res = await lockOrderForEdit(order.id);
    setIsLocking(false);
    
    if (res.success) {
      setIsEditing(true);
    } else {
      alert(res.error || 'Impossibile modificare l\'ordine al momento.');
    }
  };

  const handleEndEdit = async () => {
    setIsEditing(false);
    await unlockOrder(order.id);
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    startTransition(async () => {
      await updateOrderItemQuantity(order.id, itemId, newQty);
    });
  };

  const handleRemove = (itemId: string) => {
    if (!confirm('Rimuovere questo articolo?')) return;
    startTransition(async () => {
      await removeOrderItem(order.id, itemId);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Dettagli Ordine #{order.id.slice(-6).toUpperCase()}
            <span className="px-2 py-1 rounded text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-200 text-base">
              In attesa di revisione
            </span>
          </h1>
          <p className="text-gray-500 mt-1">
            Data: {new Date(order.createdAt).toLocaleDateString('it-IT')} {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          {!isEditing ? (
            <>
              <DeleteSentOrderButton orderId={order.id} />
              {!isAgent && (
                <button 
                  onClick={handleStartEdit}
                  disabled={isLocking}
                  className="px-6 py-2 bg-black text-white hover:bg-gray-800 font-bold text-sm rounded transition-colors disabled:opacity-50"
                >
                  {isLocking ? 'Attendere...' : 'Modifica Ordine'}
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
        <QuickAddOrderClient orderId={order.id} storeMode={order.storeMode} userDiscount={genericDiscount} />
      )}

      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-500">
          <div className="col-span-6">Prodotto</div>
          <div className="col-span-3 text-center">Quantità</div>
          <div className="col-span-3 text-right">Totale</div>
        </div>

        <div className="divide-y divide-gray-100 relative">
          {isPending && <div className="absolute inset-0 bg-white/50 z-10"></div>}
          {populatedItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center">
              <div className="col-span-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                  <img src={item.product?.imageUrl || '/placeholder.png'} alt="" className="object-contain w-full h-full" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                    {item.product?.title || 'Prodotto Sconosciuto'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
                    CODICE: <span className="font-mono">{item.sku}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-3 flex items-center justify-center">
                {isEditing ? (
                  <QuantityInput 
                    initialQuantity={item.quantity} 
                    onUpdate={(newQty) => handleUpdateQty(item.id, newQty)} 
                  />
                ) : (
                  <span className="font-medium">{item.quantity} pz.</span>
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
                        -{Math.round((1 - (item.finalPrice / item.originalPrice)) * 100)}%
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
          ))}
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
