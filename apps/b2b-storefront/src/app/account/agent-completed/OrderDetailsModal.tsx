'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { duplicateOrderToCart, createDraftFromOrder } from '@/app/actions/orders';

export default function OrderDetailsModal({ order }: { order: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'VIEW' | 'REORDER'>('VIEW');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extraDiscounts, setExtraDiscounts] = useState<Record<string, number>>({});
  const [globalExtra, setGlobalExtra] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = () => {
    setMode('VIEW');
    setIsOpen(true);
  };
  
  const startReorder = () => {
    const initialQty: Record<string, number> = {};
    const initialExtra: Record<string, number> = {};
    
    order.items.forEach((item: any) => {
      initialQty[item.id] = item.quantity;
      
      // Try to extract historical extra discount
      let extra = 0;
      if (item.discountString) {
        const match = item.discountString.match(/\+ (\d+(?:\.\d+)?)% Extra/);
        if (match) extra = parseFloat(match[1]);
      } else {
        // Fallback for old orders: if final < original, guess if there's a weird discount
        const calcDisc = Math.round((1 - (item.finalPrice / item.originalPrice)) * 100);
        // We can't know for sure what was base vs extra in old orders without discountString.
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
  
  const applyGlobalExtra = () => {
    if (globalExtra <= 0) return;
    const newDiscs: Record<string, number> = {};
    order.items.forEach((item: any) => {
      newDiscs[item.id] = globalExtra;
    });
    setExtraDiscounts(newDiscs);
  };

  const handleAddToCart = async () => {
    if (!confirm('Vuoi aggiungere tutti questi articoli al tuo carrello attuale? (Le quantità modificate verranno rispettate, e i prezzi aggiornati a listino odierno).')) return;
    setIsSubmitting(true);
    
    // Prepare items array
    const itemsToAdd = order.items
      .filter((item: any) => quantities[item.id] > 0)
      .map((item: any) => ({ 
        sku: item.sku, 
        quantity: quantities[item.id],
        extraDiscount: extraDiscounts[item.id] || 0
      }));

    const res = await duplicateOrderToCart(itemsToAdd);
    setIsSubmitting(false);
    if (res.success) {
      alert('Prodotti aggiunti al carrello con successo!');
      setIsOpen(false);
    } else {
      alert('Errore: ' + res.error);
    }
  };

  const handleDirectReorder = async () => {
    if (!confirm('Vuoi creare un nuovo ordine in Pausa (Preventivo) con queste quantità e sconti extra?')) return;
    setIsSubmitting(true);
    
    const itemsToAdd = order.items
      .filter((item: any) => quantities[item.id] > 0)
      .map((item: any) => ({ sku: item.sku, quantity: quantities[item.id] }));

    const res = await createDraftFromOrder(order.userId, itemsToAdd);
    setIsSubmitting(false);
    if (res.success) {
      alert('Ordine creato e messo in Pausa. Lo troverai nella sezione Vaglio Ordini.');
      setIsOpen(false);
    } else {
      alert('Errore: ' + res.error);
    }
  };

  return (
    <>
      <button 
        onClick={openModal}
        className="bg-black hover:bg-brand-main hover:text-black text-white font-bold py-2 px-6 rounded transition-colors text-sm"
      >
        Vedi Dettagli
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold">Dettagli Ordine #{order.id.slice(-6).toUpperCase()}</h2>
                <p className="text-sm text-gray-500">
                  {order.user.companyName} &bull; {format(new Date(order.createdAt), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {mode === 'REORDER' && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-4">
                <span className="font-medium text-yellow-800">Sconto Extra Globale (%):</span>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={globalExtra || ''} 
                  onChange={e => setGlobalExtra(parseFloat(e.target.value) || 0)}
                  className="w-20 border border-yellow-300 rounded p-1 text-center"
                />
                <button 
                  onClick={applyGlobalExtra}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-4 rounded text-sm transition-colors"
                >
                  Applica a tutti
                </button>
              </div>
              )}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 font-medium text-gray-500">Codice (SKU)</th>
                    {mode === 'REORDER' ? (
                      <>
                        <th className="pb-3 font-medium text-gray-500 text-center">Quantità per Riordino</th>
                        <th className="pb-3 font-medium text-gray-500 text-center">Sconto Extra %</th>
                      </>
                    ) : (
                      <th className="pb-3 font-medium text-gray-500 text-center">Quantità Storica</th>
                    )}
                    <th className="pb-3 font-medium text-gray-500 text-right">Sconto Orig.</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Prezzo Pagato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4 font-medium">{item.sku}</td>
                      {mode === 'REORDER' ? (
                      <>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              type="button"
                              onClick={() => handleQtyChange(item.id, (quantities[item.id] || 0) - 1)}
                              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            >-</button>
                            <input 
                              type="number" 
                              min="0"
                              value={quantities[item.id] || 0}
                              onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center border border-gray-200 rounded p-1"
                            />
                            <button 
                              type="button"
                              onClick={() => handleQtyChange(item.id, (quantities[item.id] || 0) + 1)}
                              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            >+</button>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            placeholder="%"
                            value={extraDiscounts[item.id] || ''}
                            onChange={(e) => handleExtraDiscChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 text-center border border-gray-200 rounded p-1 bg-yellow-50"
                          />
                        </td>
                      </>
                    ) : (
                      <td className="py-4 text-center font-bold text-gray-700">{item.quantity} pz</td>
                    )}
                      <td className="py-4 text-right text-gray-500">
                        {item.discountString || (`${Math.round((1 - (item.finalPrice / (item.originalPrice || 1))) * 100)}%`)}
                      </td>
                      <td className="py-4 text-right font-bold">€ {item.finalPrice.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mode === 'REORDER' && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded flex gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>In modalità Riordino, i prezzi e gli sconti base verranno ricalcolati al listino odierno. Abbiamo pre-compilato la colonna <strong>Sconto Extra %</strong> con i valori del vecchio ordine (se noti), ma puoi modificarli a tuo piacimento prima di confermare.</p>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-end gap-4">
              {mode === 'VIEW' ? (
                <button 
                  onClick={startReorder}
                  className="px-6 py-2 bg-black text-white rounded font-bold hover:bg-brand-main hover:text-black transition-colors"
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
                    className="px-6 py-2 bg-brand-main text-white rounded font-bold hover:bg-brand-hover transition-colors disabled:opacity-50"
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
