import { useWidgetStore } from '../../store/useWidgetStore';
import { useWindowStore } from '../../store/useWindowStore';
import { User, LogOut, Image, LayoutGrid } from 'lucide-react';
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
  const { setWallpaper, wallpaper } = useWindowStore();

  const isWidgetAdded = (type: "clock" | "weather" | "kpi") => widgets.some(w => w.type === type);

  const handleAddWidget = (type: "clock" | "weather" | "kpi") => {
    if (!isWidgetAdded(type)) {
      addWidget(type, window.innerWidth / 2 - 150, window.innerHeight / 2 - 100);
      onClose();
    }
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
              >
                Orologio
              </div>
              <div 
                className={`start-menu-widget-btn ${isWidgetAdded('weather') ? 'disabled' : ''}`}
                onClick={() => handleAddWidget('weather')}
              >
                Meteo
              </div>
              <div 
                className={`start-menu-widget-btn ${isWidgetAdded('kpi') ? 'disabled' : ''}`}
                onClick={() => handleAddWidget('kpi')}
              >
                Statistiche
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
