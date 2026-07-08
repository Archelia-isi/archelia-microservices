import { Rnd } from 'react-rnd';
import { useWidgetStore, type DesktopWidget } from '../../store/useWidgetStore';

export default function WidgetContainer({ widget }: { widget: DesktopWidget }) {
  const updatePosition = useWidgetStore(s => s.updateWidgetPosition);
  
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

  const removeWidget = useWidgetStore(s => s.removeWidget);

  return (
    <Rnd
      position={{ x: widget.x, y: widget.y }}
      onDragStop={(_e, d) => updatePosition(widget.id, d.x, d.y)}
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
