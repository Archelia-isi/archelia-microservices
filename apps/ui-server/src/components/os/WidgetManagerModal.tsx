import { useState } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { X, Plus, Trash2, LayoutGrid } from 'lucide-react';
import { getIconDimensions, getWidgetDimensions, pixelsToCell, getGridBounds, findNearestFreeCell, CELL_WIDTH, CELL_HEIGHT, type Rect } from '../../utils/desktopCollision';
import './IconPickerModal.css'; // Possiamo riutilizzare gli stili del modale

export default function WidgetManagerModal() {
  const { toggleWidgetManager, windows } = useWindowStore();
  const { widgets, addWidget, removeWidget, updateWidgetSize, updateWidgetConfig } = useWidgetStore();
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  const availableWidgets = [
    { type: 'clock', title: 'Orologio', description: 'Mostra l\'orario corrente. Supporta fuso orario.' },
    { type: 'weather', title: 'Meteo', description: 'Previsioni meteo in tempo reale della tua città.' },
    { type: 'kpi', title: 'KPI Sistema', description: 'Sguardo rapido alle metriche chiave.' },
    { type: 'calculator', title: 'Calcolatrice', description: 'Calcolatrice rapida sul desktop.' },
    { type: 'sticky-note', title: 'Post-it', description: 'Appunti rapidi e promemoria al volo.' },
    { type: 'converter', title: 'Convertitore', description: 'Convertitore di valute e unità di misura.' },
    { type: 'finance', title: 'Borsa & Finanza', description: 'Mercati finanziari e tassi di cambio.' },
    { type: 'news', title: 'News (RSS)', description: 'Ultime notizie dal tuo feed preferito.' },
    { type: 'copywriter', title: 'AI Copywriter', description: 'Assistente intelligente per email e testi.' },
    { type: 'translator', title: 'Traduttore Rapido', description: 'Traduttore potenziato da Gemini.' },
    { type: 'monitor', title: 'Monitor Sistema', description: 'Uso RAM, CPU e task in background.' },
    { type: 'shopify-sales', title: 'Vendite Shopify', description: 'Andamento vendite in tempo reale.' },
    { type: 'pending-orders', title: 'Ordini in Coda', description: 'Ordini da sincronizzare con Zucchetti.' },
    { type: 'calendar', title: 'Calendario', description: 'I tuoi appuntamenti (richiede app Calendario).' },
    { type: 'notes', title: 'Note Rapide', description: 'Le tue note (richiede app Note).' },
    // Aggiungeremo gli altri qui man mano che li sviluppiamo
  ];

  return (
    <div className="icon-picker-overlay" onClick={toggleWidgetManager}>
      <div className="icon-picker-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="icon-picker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutGrid size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Gestione Widgets</h2>
          </div>
          <button className="icon-picker-close" onClick={toggleWidgetManager}>
            <X size={20} />
          </button>
        </div>

        <div className="icon-picker-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Widgets Section */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Widget Attivi sul Desktop</h3>
            {widgets.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                Nessun widget attivo. Aggiungine uno dall'elenco qui sotto.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {widgets.map(w => (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setExpandedWidgetId(expandedWidgetId === w.id ? null : w.id)}>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                          <LayoutGrid size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {w.type === 'clock' ? 'Orologio' : 
                           w.type === 'weather' ? 'Meteo' : 
                           w.type === 'calculator' ? 'Calcolatrice' :
                           w.type === 'sticky-note' ? 'Post-it' :
                           w.type === 'converter' ? 'Convertitore' :
                           w.type === 'finance' ? 'Finanza' :
                           w.type === 'news' ? 'News' :
                           w.type === 'copywriter' ? 'AI Copywriter' :
                           w.type === 'translator' ? 'Traduttore' :
                           w.type === 'monitor' ? 'Monitor Sistema' :
                           w.type === 'shopify-sales' ? 'Vendite Shopify' :
                           w.type === 'pending-orders' ? 'Ordini in Coda' :
                           w.type === 'calendar' ? 'Calendario' :
                           w.type === 'notes' ? 'Note Rapide' :
                           w.type}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Taglia: {w.size}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          value={w.size}
                          onChange={(e) => updateWidgetSize(w.id, e.target.value as any)}
                          style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-solid)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none' }}
                        >
                          <option value="small">Piccolo</option>
                          <option value="medium">Medio</option>
                          <option value="large">Grande</option>
                        </select>
                        <button 
                          onClick={() => setExpandedWidgetId(expandedWidgetId === w.id ? null : w.id)}
                          style={{ padding: '0.5rem', background: 'var(--color-surface-solid)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                          title="Impostazioni"
                        >
                          Impostazioni
                        </button>
                        <button 
                          onClick={() => removeWidget(w.id)}
                          style={{ padding: '0.5rem', background: 'var(--color-danger-transparent)', color: 'var(--color-danger)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                          title="Rimuovi"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    
                    {expandedWidgetId === w.id && (
                      <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-solid)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {w.type === 'news' && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>URL Feed RSS</label>
                            <input 
                              type="text" 
                              value={w.config?.rssUrl || 'https://www.ansa.it/sito/ansait_rss.xml'}
                              onChange={(e) => updateWidgetConfig(w.id, { rssUrl: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                              placeholder="Es. https://www.ansa.it/sito/ansait_rss.xml"
                            />
                          </div>
                        )}
                        {w.type === 'weather' && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Città per il meteo</label>
                            <input 
                              type="text" 
                              value={w.config?.city || 'Roma'}
                              onChange={(e) => updateWidgetConfig(w.id, { city: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                              placeholder="Es. Milano, Roma, Napoli..."
                            />
                          </div>
                        )}
                        {w.type === 'clock' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Fuso Orario 1 (Principale)</label>
                              <input 
                                type="text" 
                                value={w.config?.tz1 || 'Roma'}
                                onChange={(e) => updateWidgetConfig(w.id, { tz1: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                placeholder="Città o fuso orario"
                              />
                            </div>
                            {(w.size === 'medium' || w.size === 'large') && (
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Fuso Orario 2</label>
                                <input 
                                  type="text" 
                                  value={w.config?.tz2 || 'New York'}
                                  onChange={(e) => updateWidgetConfig(w.id, { tz2: e.target.value })}
                                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                              </div>
                            )}
                            {w.size === 'large' && (
                              <>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Fuso Orario 3</label>
                                  <input 
                                    type="text" 
                                    value={w.config?.tz3 || 'Tokyo'}
                                    onChange={(e) => updateWidgetConfig(w.id, { tz3: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Fuso Orario 4</label>
                                  <input 
                                    type="text" 
                                    value={w.config?.tz4 || 'Londra'}
                                    onChange={(e) => updateWidgetConfig(w.id, { tz4: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {w.type === 'kpi' && (
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            Il widget KPI non ha impostazioni configurabili al momento.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Widgets Section */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Widget Disponibili</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {availableWidgets.map(aw => (
                <div key={aw.type} style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{aw.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1 }}>{aw.description}</div>
                  <button 
                    onClick={() => {
                      const { maxCols, maxRows } = getGridBounds(window.innerWidth, window.innerHeight);
                      const existingItems: Rect[] = [];
                      Object.values(windows).forEach(win => {
                        if (!win.isPinned) {
                          const pos = pixelsToCell(win.desktopX ?? 0, win.desktopY ?? 0);
                          existingItems.push({ id: win.id, col: pos.col, row: pos.row, ...getIconDimensions(), type: 'icon' });
                        }
                      });
                      widgets.forEach(w => {
                        const pos = pixelsToCell(w.x, w.y);
                        existingItems.push({ id: w.id, col: pos.col, row: pos.row, ...getWidgetDimensions(w.type, w.size || 'small'), type: 'widget' });
                      });
                      
                      const targetDim = getWidgetDimensions(aw.type as any, 'medium');
                      const startCol = Math.floor(maxCols / 2) - Math.floor(targetDim.colSpan / 2);
                      const startRow = Math.floor(maxRows / 2) - Math.floor(targetDim.rowSpan / 2);
                      
                      const bestSpot = findNearestFreeCell(
                        startCol, startRow, targetDim.colSpan, targetDim.rowSpan, existingItems, maxCols, maxRows
                      );
                      
                      addWidget(aw.type as any, bestSpot.col * CELL_WIDTH, bestSpot.row * CELL_HEIGHT, 'medium');
                    }}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <Plus size={16} /> Aggiungi
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
