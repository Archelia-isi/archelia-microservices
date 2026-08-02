import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { useWidgetStore, type DesktopWidget, type WidgetSize } from '../../store/useWidgetStore';
import { useWindowStore } from '../../store/useWindowStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getWidgetDimensions, getIconDimensions, pixelsToCell, getGridBounds, findNearestFreeCell, getMagneticSnap, CELL_WIDTH, CELL_HEIGHT, type Rect } from '../../utils/desktopCollision';
import { Settings } from 'lucide-react';

import ClockWidget from './widgets/ClockWidget';
import WeatherWidget from './widgets/WeatherWidget';
import KpiWidget from './widgets/KpiWidget';
import CalculatorWidget from './widgets/CalculatorWidget';
import StickyNoteWidget from './widgets/StickyNoteWidget';
import ConverterWidget from './widgets/ConverterWidget';
import FinanceWidget from './widgets/FinanceWidget';
import NewsWidget from './widgets/NewsWidget';
import CopywriterWidget from './widgets/CopywriterWidget';
import TranslatorWidget from './widgets/TranslatorWidget';
import MonitorWidget from './widgets/MonitorWidget';
import ShopifySalesWidget from './widgets/ShopifySalesWidget';
import PendingOrdersWidget from './widgets/PendingOrdersWidget';
import CalendarWidget from './widgets/CalendarWidget';
import NotesWidget from './widgets/NotesWidget';

export default function WidgetContainer({ widget }: { widget: DesktopWidget }) {
  const { updateWidgetPosition, updateWidgetSize, removeWidget, widgets } = useWidgetStore();
  const windows = useWindowStore(s => s.windows);
  const { desktopSnapEnabled, desktopSnapRadius, desktopMargin } = useSettingsStore();
  
  const [isFlipped, setIsFlipped] = useState(false);

  const handleDragStop = (d: { x: number, y: number }) => {
    const { maxCols, maxRows } = getGridBounds(window.innerWidth, window.innerHeight);
    let targetCol = pixelsToCell(d.x, d.y).col;
    let targetRow = pixelsToCell(d.x, d.y).row;
    
    const existingItems: Rect[] = [];
    Object.values(windows).forEach(win => {
      // Fix Ghost Bug: Ignore items not actively placed on desktop
      if (win.desktopX !== undefined && win.desktopY !== undefined) {
        const pos = pixelsToCell(win.desktopX, win.desktopY);
        existingItems.push({
          id: win.id,
          col: pos.col,
          row: pos.row,
          ...getIconDimensions(),
          type: 'icon'
        });
      }
    });
    widgets.forEach(w => {
      if (w.id !== widget.id) {
        const pos = pixelsToCell(w.x, w.y);
        existingItems.push({
          id: w.id,
          col: pos.col,
          row: pos.row,
          ...getWidgetDimensions(w.type, w.size || 'small'),
          type: 'widget'
        });
      }
    });

    const targetDim = getWidgetDimensions(widget.type, widget.size || 'small');
    
    // Magnetic Snapping
    if (desktopSnapEnabled) {
      const snapped = getMagneticSnap(targetCol, targetRow, targetDim.colSpan, targetDim.rowSpan, existingItems, desktopSnapRadius, desktopMargin, widget.id);
      targetCol = snapped.col;
      targetRow = snapped.row;
    }

    const bestSpot = findNearestFreeCell(
      targetCol,
      targetRow,
      targetDim.colSpan,
      targetDim.rowSpan,
      existingItems,
      maxCols,
      maxRows,
      desktopMargin
    );
    
    updateWidgetPosition(widget.id, bestSpot.col * CELL_WIDTH, bestSpot.row * CELL_HEIGHT);
  };

  const handleSizeChange = (newSize: WidgetSize) => {
    // In futuro: potremmo validare se c'è spazio prima di ingrandirlo
    updateWidgetSize(widget.id, newSize);
  };

  const renderContent = () => {
    switch (widget.type) {
      case 'clock': return <ClockWidget widget={widget} />;
      case 'weather': return <WeatherWidget widget={widget} />;
      case 'kpi': return <KpiWidget widget={widget} />;
      case 'calculator': return <CalculatorWidget widget={widget} />;
      case 'sticky-note': return <StickyNoteWidget widget={widget} />;
      case 'converter': return <ConverterWidget widget={widget} />;
      case 'finance': return <FinanceWidget widget={widget} />;
      case 'news': return <NewsWidget widget={widget} />;
      case 'copywriter': return <CopywriterWidget widget={widget} />;
      case 'translator': return <TranslatorWidget widget={widget} />;
      case 'monitor': return <MonitorWidget widget={widget} />;
      case 'shopify-sales': return <ShopifySalesWidget widget={widget} />;
      case 'pending-orders': return <PendingOrdersWidget widget={widget} />;
      case 'calendar': return <CalendarWidget widget={widget} />;
      case 'notes': return <NotesWidget widget={widget} />;
      default: return null;
    }
  };

  const renderSpecificSettings = () => {
    if (widget.type === 'weather') {
      return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
          <div className="widget-settings-title" style={{ fontSize: '11px', opacity: 0.8 }}>Città Meteo</div>
          <input 
            type="text" 
            defaultValue={widget.config?.city || 'Roma'}
            onBlur={(e) => useWidgetStore.getState().updateWidgetConfig(widget.id, { city: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                useWidgetStore.getState().updateWidgetConfig(widget.id, { city: e.currentTarget.value });
                e.currentTarget.blur();
              }
            }}
            style={{ width: '80%', padding: '4px 8px', borderRadius: '8px', border: 'none', outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text-main)', textAlign: 'center', fontSize: '12px' }}
          />
        </div>
      );
    }
    
    if (widget.type === 'clock') {
      const renderTzInput = (key: string, label: string, defaultVal: string) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '9px', opacity: 0.8 }}>{label}</div>
          <input 
            type="text" 
            defaultValue={widget.config?.[key] || defaultVal}
            onBlur={(e) => useWidgetStore.getState().updateWidgetConfig(widget.id, { [key]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                useWidgetStore.getState().updateWidgetConfig(widget.id, { [key]: e.currentTarget.value });
                e.currentTarget.blur();
              }
            }}
            style={{ width: '80%', padding: '2px 6px', borderRadius: '6px', border: 'none', outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text-main)', textAlign: 'center', fontSize: '10px' }}
          />
        </div>
      );

      const isMed = widget.size === 'medium';
      const isLarge = widget.size === 'large';

      return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
          <div className="widget-settings-title" style={{ fontSize: '11px', opacity: 0.8, marginBottom: 0 }}>Città (Es: Londra)</div>
          <div style={{ display: 'grid', gridTemplateColumns: isLarge ? '1fr 1fr' : '1fr', gap: '4px', width: '100%', maxHeight: '70px', overflowY: 'auto' }}>
            {renderTzInput('tz1', 'Orologio 1', 'Roma')}
            {(isMed || isLarge) && renderTzInput('tz2', 'Orologio 2', 'New York')}
            {isLarge && renderTzInput('tz3', 'Orologio 3', 'Tokyo')}
            {isLarge && renderTzInput('tz4', 'Orologio 4', 'Londra')}
          </div>
        </div>
      );
    }

    // Per kpi potremmo aggiungere altri input in futuro
    return null;
  };

  const dim = getWidgetDimensions(widget.type, widget.size || 'small');
  const width = dim.colSpan * CELL_WIDTH;
  const height = dim.rowSpan * CELL_HEIGHT;

  return (
    <Rnd
      position={{ x: widget.x, y: widget.y }}
      onDragStop={(_e, d) => handleDragStop(d)}
      dragGrid={[CELL_WIDTH, CELL_HEIGHT]}
      enableResizing={false}
      bounds="parent"
      cancel=".nodrag, button, input, select, textarea"
      style={{ zIndex: 1, pointerEvents: 'auto', cursor: 'grab' }}
    >
      <div className={`widget-wrapper widget-flip-container ${isFlipped ? 'flipped' : ''}`} style={{ position: 'relative', width, height, boxSizing: 'border-box' }}>
        
        <div className="widget-flipper">
          {/* FRONTE DEL WIDGET */}
          <div className="widget-front">
            <button 
              className="widget-close-btn" 
              onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
            >
              ✕
            </button>
            {widget.type !== 'copywriter' && widget.type !== 'translator' && (
              <button 
                className="widget-settings-btn" 
                onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
              >
                <Settings size={14} />
              </button>
            )}
            {renderContent()}
          </div>

          {/* RETRO DEL WIDGET (IMPOSTAZIONI) */}
          <div className="widget-back">
             <div className="widget-settings-panel" style={{ width: '100%', height: '100%', cursor: 'default' }}>
                <div className="widget-settings-title" style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.8 }}>Taglia</div>
                <div className="widget-size-buttons">
                   <button 
                     className={`widget-size-btn ${widget.size === 'small' ? 'active' : ''}`} 
                     onClick={(e) => { e.stopPropagation(); handleSizeChange('small'); }}
                   >
                     S
                   </button>
                   <button 
                     className={`widget-size-btn ${widget.size === 'medium' ? 'active' : ''}`} 
                     onClick={(e) => { e.stopPropagation(); handleSizeChange('medium'); }}
                   >
                     M
                   </button>
                   <button 
                     className={`widget-size-btn ${widget.size === 'large' ? 'active' : ''}`} 
                     onClick={(e) => { e.stopPropagation(); handleSizeChange('large'); }}
                   >
                     L
                   </button>
                </div>
                
                {renderSpecificSettings()}

                <button className="widget-back-btn" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}>
                  Fatto
                </button>
             </div>
          </div>
        </div>

      </div>
    </Rnd>
  );
}
