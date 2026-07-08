import { useState } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';
import { useWindowStore } from '../../store/useWindowStore';
import { User, LogOut, Image, LayoutGrid } from 'lucide-react';
import { findNearestFreeSpot, getWidgetDimensions, getIconDimensions, type Rect } from '../../utils/desktopCollision';
import './StartMenu.css';

interface StartMenuProps {
  onClose: () => void;
}

const WALLPAPERS = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop', // Default Abstract Apple
  'https://images.unsplash.com/photo-1506744626753-dba7d41543f4?q=80&w=2940&auto=format&fit=crop', // Mountain
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop', // Abstract Dark
  'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?q=80&w=2874&auto=format&fit=crop'  // Ocean
];

export default function StartMenu({ onClose }: StartMenuProps) {
  const { addWidget, widgets } = useWidgetStore();
  const { windows, setWallpaper, wallpaper } = useWindowStore();
  const [hoveredWidget, setHoveredWidget] = useState<"clock" | "weather" | "kpi" | null>(null);

  const isWidgetAdded = (type: "clock" | "weather" | "kpi") => widgets.some(w => w.type === type);

  const handleAddWidget = (type: "clock" | "weather" | "kpi") => {
    if (!isWidgetAdded(type)) {
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
        existingItems.push({
          id: w.id,
          x: w.x,
          y: w.y,
          ...getWidgetDimensions(w.type),
          type: 'widget'
        });
      });

      const dim = getWidgetDimensions(type);
      const target = { x: window.innerWidth / 2 - dim.width / 2, y: window.innerHeight / 2 - dim.height / 2, width: dim.width, height: dim.height };
      
      const spot = findNearestFreeSpot(target, existingItems, window.innerWidth, window.innerHeight);
      
      addWidget(type, spot.x, spot.y);
      onClose();
    }
  };

  const renderWidgetPreview = () => {
    if (!hoveredWidget) return null;
    let content = null;
    switch (hoveredWidget) {
      case 'clock':
        content = (
          <div className="widget clock-widget" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', pointerEvents: 'none', margin: 0 }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 200, margin: 0, letterSpacing: '-0.05em' }}>12:00</h1>
            <p style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0, opacity: 0.8 }}>Lunedì</p>
          </div>
        );
        break;
      case 'weather':
        content = (
          <div className="widget weather-widget" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', minWidth: '200px', pointerEvents: 'none', margin: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🌤 Roma, IT</h2>
            <h1 style={{ fontSize: '3rem', margin: '10px 0', fontWeight: 300 }}>24°C</h1>
            <p style={{ margin: 0, opacity: 0.8 }}>Soleggiato</p>
          </div>
        );
        break;
      case 'kpi':
        content = (
          <div className="widget kpi-widget" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', minWidth: '200px', pointerEvents: 'none', margin: 0 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Ordini Oggi</p>
            <h1 style={{ fontSize: '2.5rem', margin: '5px 0' }}>124</h1>
            <p style={{ margin: 0, color: '#32B351', fontWeight: 600 }}>+12%</p>
          </div>
        );
        break;
    }
    
    return (
      <div className="start-menu-preview-box">
        <div style={{ fontSize: '11px', color: '#6e6e73', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Anteprima</div>
        <div style={{ width: getWidgetDimensions(hoveredWidget).width * 0.6, height: getWidgetDimensions(hoveredWidget).height * 0.6 }}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="start-menu-overlay" onClick={onClose}>
      <div className="start-menu" onClick={e => e.stopPropagation()}>
        
        {/* Header - User Profile */}
        <div className="start-menu-header">
          <div className="start-menu-user">
            <div className="start-menu-avatar flex-center">
              <User size={20} />
            </div>
            <div className="start-menu-user-info">
              <span className="start-menu-name">Admin</span>
              <span className="start-menu-role">Amministratore</span>
            </div>
          </div>
          <button className="start-menu-logout" title="Logout">
            <LogOut size={16} />
          </button>
        </div>

        <div className="start-menu-content">
          {/* Sezione Sfondi */}
          <div className="start-menu-section">
            <div className="start-menu-section-title">
              <Image size={14} /> Sfondi Desktop
            </div>
            <div className="start-menu-wallpapers">
              {WALLPAPERS.map((wp, index) => (
                <div 
                  key={index} 
                  className={`start-menu-wallpaper ${wallpaper === wp ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${wp})` }}
                  onClick={() => setWallpaper(wp)}
                />
              ))}
            </div>
          </div>

          {/* Sezione Widget */}
          <div className="start-menu-section">
            <div className="start-menu-section-title">
              <LayoutGrid size={14} /> Widget
            </div>
            <div className="start-menu-widgets">
              <div 
                className={`start-menu-widget-btn ${isWidgetAdded('clock') ? 'disabled' : ''}`}
                onClick={() => handleAddWidget('clock')}
                onMouseEnter={() => setHoveredWidget('clock')}
                onMouseLeave={() => setHoveredWidget(null)}
              >
                Orologio
              </div>
              <div 
                className={`start-menu-widget-btn ${isWidgetAdded('weather') ? 'disabled' : ''}`}
                onClick={() => handleAddWidget('weather')}
                onMouseEnter={() => setHoveredWidget('weather')}
                onMouseLeave={() => setHoveredWidget(null)}
              >
                Meteo
              </div>
              <div 
                className={`start-menu-widget-btn ${isWidgetAdded('kpi') ? 'disabled' : ''}`}
                onClick={() => handleAddWidget('kpi')}
                onMouseEnter={() => setHoveredWidget('kpi')}
                onMouseLeave={() => setHoveredWidget(null)}
              >
                Statistiche
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Live Preview Box */}
      {hoveredWidget && renderWidgetPreview()}
    </div>
  );
}
