import { Rnd } from 'react-rnd';
import { useWidgetStore, type DesktopWidget } from '../../store/useWidgetStore';
import { useWindowStore } from '../../store/useWindowStore';
import { checkOverlap, getWidgetDimensions, getIconDimensions, type Rect } from '../../utils/desktopCollision';

export default function WidgetContainer({ widget }: { widget: DesktopWidget }) {
  const updatePosition = useWidgetStore(s => s.updateWidgetPosition);
  const widgets = useWidgetStore(s => s.widgets);
  const removeWidget = useWidgetStore(s => s.removeWidget);
  const windows = useWindowStore(s => s.windows);
  
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
          ...getWidgetDimensions(w.type),
          type: 'widget'
        });
      }
    });

    const targetDim = getWidgetDimensions(widget.type);
    const candidateRect = { x: snappedX, y: snappedY, ...targetDim };
    
    const isOverlap = existingItems.some(item => checkOverlap(candidateRect, item));
    
    if (isOverlap) {
      // Forza il re-render di react-rnd aggiornando lo stato con la sua posizione di prima (o triggeriamo update con gli stessi valori)
      updatePosition(widget.id, widget.x, widget.y);
    } else {
      updatePosition(widget.id, snappedX, snappedY);
    }
  };

  const renderContent = () => {
    switch (widget.type) {
      case 'clock':
        return (
          <div className="widget clock-widget">
            <h1 style={{ fontSize: '4rem', fontWeight: 200, margin: 0, letterSpacing: '-0.05em' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0, opacity: 0.8 }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        );
      case 'weather':
        return (
          <div className="widget weather-widget" style={{ minWidth: '200px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🌤 Roma, IT</h2>
            <h1 style={{ fontSize: '3rem', margin: '10px 0', fontWeight: 300 }}>24°C</h1>
            <p style={{ margin: 0, opacity: 0.8 }}>Soleggiato</p>
          </div>
        );
      case 'kpi':
        return (
          <div className="widget kpi-widget" style={{ minWidth: '200px' }}>
             <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Ordini Oggi</p>
             <h1 style={{ fontSize: '2.5rem', margin: '5px 0' }}>124</h1>
             <p style={{ margin: 0, color: '#32B351', fontWeight: 600 }}>+12%</p>
          </div>
        );
    }
  };

  return (
    <Rnd
      position={{ x: widget.x, y: widget.y }}
      onDragStop={(_e, d) => handleDragStop(d)}
      enableResizing={false}
      bounds="parent"
      style={{ zIndex: 1, pointerEvents: 'auto', cursor: 'grab' }}
    >
      <div className="widget-wrapper" style={{ position: 'relative' }}>
        <button 
          className="widget-close-btn" 
          onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
        >
          ✕
        </button>
        {renderContent()}
      </div>
    </Rnd>
  );
}
