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
        // Fallback se fallisce
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
         const calcDisc = Math.round((1 - (item.finalPrice / (item.originalPrice || 1))) * 100);
         // Senza discountString è impossibile sapere la quota extra con certezza, per i vecchi ordini assumiamo 0
      }
      initialExtra[item.id] = extra;
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
    if (!confirm('Vuoi aggiungere tutti questi articoli al tuo carrello attuale? (Le quantità modificate verranno rispettate, e i prezzi aggiornati a listino odierno).')) return;
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
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Dettagli Ordine #{order.id.slice(-6).toUpperCase()}
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
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p>Caricamento prodotti...</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {populatedItems.map((item: any) => {
                    const p = item.product || { title: 'Prodotto Sconosciuto', imageUrl: '/placeholder.png', stock: 0, unit: 'PZ' };
                    const qty = mode === 'VIEW' ? item.quantity : (quantities[item.id] || 0);
                    
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                        <div className="col-span-12 sm:col-span-6 flex items-center gap-4">
                          <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                            <img src={p.imageUrl} alt={p.title} className="object-contain w-full h-full" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900 line-clamp-2">{p.title}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-1 uppercase">CODICE PRODOTTO: {item.sku}</span>
                            {p.stock > 0 ? (
                              <span className="text-xs text-brand-main mt-1">Disponibile ({p.stock})</span>
                            ) : (
                              <span className="text-xs text-orange-500 mt-1">Esaurito</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="col-span-4 sm:col-span-3 flex items-center justify-center">
                          {mode === 'VIEW' ? (
                            <span className="font-bold text-gray-700">{qty} pz</span>
                          ) : (
                            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                              <button 
                                type="button"
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
                                type="button"
                                onClick={() => handleQtyChange(item.id, qty + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                              >+</button>
                            </div>
                          )}
                        </div>
                        
                        <div className="col-span-8 sm:col-span-3 text-right flex flex-col items-end justify-center">
                           <div className="font-bold text-sm text-gray-900">
                             € {item.finalPrice.toFixed(2).replace('.', ',')}
                           </div>
                           <div className="text-xs text-gray-400">/ {p.unit}</div>
                           
                           {mode === 'VIEW' ? (
                             <div className="mt-2 text-xs text-gray-500">
                               Sc. Orig: <span className="font-medium bg-gray-100 px-1 rounded">{item.discountString || `${Math.round((1 - (item.finalPrice / (item.originalPrice || 1))) * 100)}%`}</span>
                             </div>
                           ) : (
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
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {mode === 'REORDER' && (
                <div className="mt-6 p-4 bg-blue-50 text-blue-800 text-sm rounded flex gap-2 border border-blue-100">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>In modalità Riordino, i prezzi e gli sconti base verranno ricalcolati al listino odierno. Abbiamo pre-compilato la colonna <strong>Extra %</strong> con i valori del vecchio ordine (se presenti).</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-end gap-4 shrink-0">
              {mode === 'VIEW' ? (
                <button 
                  onClick={startReorder}
                  className="px-6 py-2 bg-black text-white rounded font-bold hover:bg-brand-main hover:text-black transition-colors shadow-sm"
                >
                  Avvia Riordino
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setMode('VIEW')}
                    className="px-6 py-2 bg-white border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleAddToCart}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-white border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Aggiungi al Carrello
                  </button>
                  <button 
                    onClick={handleDirectReorder}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-brand-main text-white rounded font-bold hover:bg-brand-hover transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Conferma Riordino (Vaglio)
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
