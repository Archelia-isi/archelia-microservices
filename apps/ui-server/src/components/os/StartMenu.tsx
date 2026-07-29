import { useWindowStore } from '../../store/useWindowStore';
import { User, LogOut, Image, LayoutGrid } from 'lucide-react';
import './StartMenu.css';

interface StartMenuProps {
  onClose: () => void;
}

// WALLPAPERS removed as they are moved to PersonalizationApp

export default function StartMenu({ onClose }: StartMenuProps) {
  const { openWindow } = useWindowStore();

  const handleOpenApp = (appId: string) => {
    openWindow(appId);
    onClose();
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
          <div className="start-menu-section">
            <div className="start-menu-section-title">
              <LayoutGrid size={14} /> Applicazioni di Sistema
            </div>
            <div className="start-menu-widgets">
              <div 
                className="start-menu-widget-btn"
                onClick={() => handleOpenApp('personalization')}
              >
                <Image size={16} style={{ marginRight: '8px' }} />
                Personalizzazione (Sfondi e Widget)
              </div>
              <div 
                className="start-menu-widget-btn"
                onClick={() => handleOpenApp('settings')}
              >
                <LayoutGrid size={16} style={{ marginRight: '8px' }} />
                Impostazioni (Worker)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
