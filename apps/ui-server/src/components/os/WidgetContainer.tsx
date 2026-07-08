import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { useWidgetStore, type DesktopWidget, type WidgetSize } from '../../store/useWidgetStore';
import { useWindowStore } from '../../store/useWindowStore';
import { checkOverlap, getWidgetDimensions, getIconDimensions, type Rect } from '../../utils/desktopCollision';
import { Settings } from 'lucide-react';

import ClockWidget from './widgets/ClockWidget';
import WeatherWidget from './widgets/WeatherWidget';
import KpiWidget from './widgets/KpiWidget';

export default function WidgetContainer({ widget }: { widget: DesktopWidget }) {
  const { updateWidgetPosition, updateWidgetSize, removeWidget, widgets } = useWidgetStore();
  const windows = useWindowStore(s => s.windows);
  
  const [isFlipped, setIsFlipped] = useState(false);

  const handleDragStop = (d: { x: number, y: number }) => {
    // Snap to grid (10px) per facilitare l'allineamento
    const snappedX = Math.round(d.x / 10) * 10;
    const snappedY = Math.round(d.y / 10) * 10;
    
    const existingItems: Rect[] = [];
    Object.values(windows).forEach(win => {
      if (!win.isPinned) {
        existingItems.push({
          id: win.id,
          x: win.desktopX ?? 30,
          y: win.desktopY ?? 30,
          ...getIconDimensions(),
          type: 'icon'
        });
      }
    });
    widgets.forEach(w => {
      if (w.id !== widget.id) {
        existingItems.push({
          id: w.id,
          x: w.x,
          y: w.y,
          ...getWidgetDimensions(w.type, w.size || 'small'),
          type: 'widget'
        });
      }
    });

    const targetDim = getWidgetDimensions(widget.type, widget.size || 'small');
    const candidateRect = { x: snappedX, y: snappedY, ...targetDim };
    
    const isOverlap = existingItems.some(item => checkOverlap(candidateRect, item));
    
    if (isOverlap) {
      updateWidgetPosition(widget.id, widget.x, widget.y);
    } else {
      updateWidgetPosition(widget.id, snappedX, snappedY);
    }
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
            style={{ width: '80%', padding: '4px 8px', borderRadius: '8px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', textAlign: 'center', fontSize: '12px' }}
          />
        </div>
      );
    }
    // Per clock e kpi potremmo aggiungere altri input in futuro
    return null;
  };

  const dim = getWidgetDimensions(widget.type, widget.size || 'small');

  return (
    <Rnd
      position={{ x: widget.x, y: widget.y }}
      onDragStop={(_e, d) => handleDragStop(d)}
      enableResizing={false}
      bounds="parent"
      style={{ zIndex: 1, pointerEvents: 'auto', cursor: 'grab' }}
    >
      <div className={`widget-wrapper widget-flip-container ${isFlipped ? 'flipped' : ''}`} style={{ position: 'relative', width: dim.width, height: dim.height, boxSizing: 'border-box' }}>
        
        <div className="widget-flipper">
          {/* FRONTE DEL WIDGET */}
          <div className="widget-front">
            <button 
              className="widget-close-btn" 
              onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
            >
              ✕
            </button>
            <button 
              className="widget-settings-btn" 
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
            >
              <Settings size={14} />
            </button>
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
