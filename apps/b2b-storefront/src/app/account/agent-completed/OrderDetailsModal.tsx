'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { duplicateOrderToCart, createDraftFromOrder, getPopulatedOrderDetails } from '@/app/actions/orders';
import Link from 'next/link';

export default function OrderDetailsModal({ order }: { order: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'VIEW' | 'REORDER'>('VIEW');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extraDiscounts, setExtraDiscounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [populatedItems, setPopulatedItems] = useState<any[]>([]);

  const openModal = async () => {
    setMode('VIEW');
    setIsOpen(true);
    if (populatedItems.length === 0) {
      setIsLoading(true);
      const res = await getPopulatedOrderDetails(order.id);
      if (res.success && res.items) {
        setPopulatedItems(res.items);
      } else {
        setPopulatedItems(order.items.map((i: any) => ({ ...i, product: null })));
      }
      setIsLoading(false);
    }
  };

  const closeModal = () => setIsOpen(false);

  const startReorder = () => {
    const initialQty: Record<string, number> = {};
    const initialExtra: Record<string, number> = {};
    
    populatedItems.forEach((item: any) => {
      initialQty[item.id] = item.quantity;
      
      let extra = 0;
      if (item.discountString) {
        const match = item.discountString.match(/\+ (\d+(?:\.\d+)?)% Extra/);
        if (match) extra = parseFloat(match[1]);
      } else {
         const totalDiscPct = 1 - (item.finalPrice / (item.originalPrice || 1));
         const stdDec = (item.currentStdDisc || 0) / 100;
         if (stdDec > 0 && stdDec < 1) {
           const oneMinusExtra = (1 - totalDiscPct) / (1 - stdDec);
           extra = Math.round((1 - oneMinusExtra) * 100);
         } else {
           extra = 0; // If no standard discount, it's just a flat discount, hard to guess extra
         }
      }
      initialExtra[item.id] = extra > 0 ? extra : 0;
    });
    
    setQuantities(initialQty);
    setExtraDiscounts(initialExtra);
    setMode('REORDER');
  };

  const handleQtyChange = (itemId: string, newQty: number) => {
    if (newQty < 0) return;
    setQuantities(prev => ({ ...prev, [itemId]: newQty }));
  };

  const handleExtraDiscChange = (itemId: string, val: number) => {
    if (val < 0) return;
    setExtraDiscounts(prev => ({ ...prev, [itemId]: val }));
  };

  const handleAddToCart = async () => {
    if (!confirm('Vuoi aggiungere tutti questi articoli al tuo carrello attuale?')) return;
    setIsSubmitting(true);
    const itemsToAdd = populatedItems
      .filter((item: any) => quantities[item.id] > 0)
      .map((item: any) => ({ sku: item.sku, quantity: quantities[item.id] }));
      
    if (itemsToAdd.length === 0) {
      alert('Nessun articolo selezionato');
      setIsSubmitting(false);
      return;
    }

    const res = await duplicateOrderToCart(itemsToAdd);
    if (res.success) {
      alert('Articoli aggiunti al carrello!');
      closeModal();
    } else {
      alert('Errore: ' + res.error);
    }
    setIsSubmitting(false);
  };

  const handleDirectReorder = async () => {
    if (!confirm('Vuoi creare un nuovo ordine in Pausa (Preventivo) con queste quantità e sconti extra?')) return;
    setIsSubmitting(true);
    const itemsToAdd = populatedItems
      .filter((item: any) => quantities[item.id] > 0)
      .map((item: any) => ({ 
        sku: item.sku, 
        quantity: quantities[item.id],
        extraDiscount: extraDiscounts[item.id] || 0
      }));

    if (itemsToAdd.length === 0) {
      alert('Nessun articolo selezionato');
      setIsSubmitting(false);
      return;
    }

    const res = await createDraftFromOrder(order.userId, itemsToAdd);
    if (res.success) {
      alert('Preventivo in Pausa creato con successo!');
      closeModal();
    } else {
      alert('Errore: ' + res.error);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button 
        onClick={openModal}
        className="px-4 py-2 bg-black text-white text-sm font-bold rounded hover:bg-brand-main hover:text-black transition-colors"
      >
        Vedi Dettagli
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === 'VIEW' ? `Dettagli Ordine #${order.id.slice(-6).toUpperCase()}` : 'Creazione Preventivo / Riordino'}
                </h2>
                <p className="text-sm text-gray-500 mt-1 uppercase">
                  {format(new Date(order.createdAt), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p>Caricamento prodotti...</p>
                </div>
              ) : (
                <div className="flex flex-col m-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                  
                  {/* Table Header like Cart */}
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 text-sm text-gray-500 font-medium">
                    <div className="col-span-12 sm:col-span-5">Prodotto</div>
                    <div className="col-span-4 sm:col-span-2 text-center">Quantità</div>
                    <div className="col-span-4 sm:col-span-3 text-right">Prezzo Unit.</div>
                    <div className="col-span-4 sm:col-span-2 text-right">Totale</div>
                  </div>

                  <div className="flex flex-col divide-y divide-gray-100">
                    {populatedItems.map((item: any) => {
                      const p = item.product || { title: 'Prodotto Sconosciuto', imageUrl: '/placeholder.png', stock: 0, unit: 'PZ' };
                      const isReorder = mode === 'REORDER';
                      
                      const qty = isReorder ? (quantities[item.id] || 0) : item.quantity;
                      
                      let origPrice = 0;
                      let basePrice = 0;
                      let finalPrc = 0;
                      let extraDisc = 0;

                      if (isReorder) {
                        origPrice = item.currentOriginalPrice || item.originalPrice;
                        basePrice = item.currentBasePrice || item.originalPrice;
                        extraDisc = extraDiscounts[item.id] || 0;
                        finalPrc = basePrice * (1 - (extraDisc / 100));
                      } else {
                        origPrice = item.originalPrice;
                        basePrice = item.originalPrice; // For view mode we don't have historical intermediate base price easily, we just show original vs final
                        finalPrc = item.finalPrice;
                      }

                      const lineTotal = finalPrc * qty;
                      
                      let historicalDiscString = item.discountString;
                      if (!historicalDiscString) {
                        const totalDiscPct = 1 - (item.finalPrice / (item.originalPrice || 1));
                        const stdDec = (item.currentStdDisc || 0) / 100;
                        if (stdDec > 0 && stdDec < 1) {
                          const oneMinusExtra = (1 - totalDiscPct) / (1 - stdDec);
                          const computedExtra = Math.round((1 - oneMinusExtra) * 100);
                          historicalDiscString = `${item.currentStdDisc}%`;
                          if (computedExtra > 0) {
                            historicalDiscString += ` + ${computedExtra}% Extra`;
                          }
                        } else {
                          historicalDiscString = `${Math.round(totalDiscPct * 100)}%`;
                        }
                      }
                      
                      return (
                        <div key={item.id} className={`grid grid-cols-12 gap-4 p-4 items-center ${qty === 0 ? 'opacity-50' : ''}`}>
                          
                          {/* Col 1: Prodotto */}
                          <div className="col-span-12 sm:col-span-5 flex items-center gap-4">
                            <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                              <img src={p.imageUrl} alt={p.title} className="object-contain w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-gray-900 line-clamp-2">{p.title}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-1 uppercase">CODICE: {item.sku}</span>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {p.stock > 0 ? (
                                  <span className="text-xs text-brand-main">Disponibile ({p.stock})</span>
                                ) : (
                                  <span className="text-xs text-orange-500">Esaurito</span>
                                )}
                                {isReorder && (
                                  <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                    Sconto Storico: {historicalDiscString}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Col 2: Quantità */}
                          <div className="col-span-4 sm:col-span-2 flex justify-center">
                            {isReorder ? (
                              <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                                <button 
                                  onClick={() => handleQtyChange(item.id, qty - 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                                >-</button>
                                <input 
                                  type="number" 
                                  value={qty}
                                  onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                                  className="w-10 h-8 text-center text-sm font-medium border-x border-gray-300 outline-none"
                                />
                                <button 
                                  onClick={() => handleQtyChange(item.id, qty + 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                                >+</button>
                              </div>
                            ) : (
                              <span className="font-bold text-gray-900">{qty}</span>
                            )}
                          </div>
                          
                          {/* Col 3: Prezzo Unit */}
                          <div className="col-span-4 sm:col-span-3 flex flex-col items-end justify-center">
                            {isReorder ? (
                              <>
                                {origPrice > basePrice && (
                                  <div className="flex items-center justify-end gap-1 mb-0.5">
                                    <span className="text-[10px] text-gray-400 line-through">
                                      € {origPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                                      -{Math.round((1 - (basePrice / origPrice)) * 100)}%
                                    </span>
                                  </div>
                                )}
                                
                                {basePrice > finalPrc && (
                                  <div className="flex items-center justify-end gap-1 mb-0.5">
                                    <span className="text-[11px] text-gray-500 line-through">
                                      € {basePrice.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1 rounded">
                                      -{Math.round((1 - (finalPrc / basePrice)) * 100)}% Extra
                                    </span>
                                  </div>
                                )}

                                <div className="font-bold text-sm text-gray-900">€ {finalPrc.toFixed(2).replace('.', ',')}</div>
                                <div className="text-xs text-gray-400">/ {p.unit}</div>
                                
                                <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                                  <span className="text-yellow-700 font-medium text-[10px]">Extra:</span>
                                  <input 
                                    type="number"
                                    value={extraDiscounts[item.id] || ''}
                                    onChange={(e) => handleExtraDiscChange(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-12 h-6 text-center text-[11px] border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                    min="0"
                                    max="99"
                                  />
                                  <span className="text-yellow-700 text-[10px]">%</span>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* VIEW MODE PRICES */}
                                {origPrice > finalPrc && (
                                  <div className="flex items-center justify-end gap-1 mb-0.5">
                                    <span className="text-[10px] text-gray-400 line-through">
                                      € {origPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                )}
                                <div className="font-bold text-sm text-gray-900">€ {finalPrc.toFixed(2).replace('.', ',')}</div>
                                <div className="text-xs text-gray-400">/ {p.unit}</div>
                                <div className="mt-1 flex items-center justify-end">
                                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                    Sconto: {historicalDiscString}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Col 4: Totale */}
                          <div className="col-span-4 sm:col-span-2 flex flex-col items-end justify-center gap-2">
                             <div className="font-bold text-gray-900 whitespace-nowrap">
                               € {lineTotal.toFixed(2).replace('.', ',')}
                             </div>
                             {isReorder && qty > 0 && (
                               <button 
                                 onClick={() => handleQtyChange(item.id, 0)}
                                 className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 mt-1"
                               >
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 Rimuovi
                               </button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              {mode === 'VIEW' ? (
                <button 
                  onClick={startReorder}
                  className="px-6 py-2.5 bg-black text-white rounded font-bold hover:bg-brand-main hover:text-black transition-colors shadow-sm"
                >
                  Avvia Riordino
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setMode('VIEW')}
                    className="px-6 py-2.5 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleAddToCart}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-white border border-gray-300 rounded font-bold text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Aggiungi al Carrello
                  </button>
                  <button 
                    onClick={handleDirectReorder}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-brand-main text-white rounded font-bold hover:bg-brand-hover transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Crea Preventivo (Vaglio)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
