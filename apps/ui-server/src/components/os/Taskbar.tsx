import { useWindowStore } from '../../store/useWindowStore';
import { LogOut, GalleryHorizontalEnd } from 'lucide-react';
import './Taskbar.css';

export default function Taskbar() {
  const { windows, openWindow, activeWindowId, minimizeWindow, togglePinApp } = useWindowStore();
  
  // Mostra l'app se è pinnata oppure se è aperta
  const visibleApps = Object.values(windows).filter(app => app.isPinned || app.isOpen);

  const handleAppClick = (id: string, isOpen: boolean, isMinimized: boolean, isActive: boolean) => {
    if (!isOpen || isMinimized) {
      openWindow(id);
    } else if (isActive) {
      minimizeWindow(id);
    } else {
      openWindow(id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    togglePinApp(id);
  };

  return (
    <div className="taskbar">
      {/* Sinistra: Utente e Logout */}
      <div className="taskbar-left">
        <div className="taskbar-user">
          <div className="user-avatar flex-center">A</div>
          <span className="user-name">Admin</span>
        </div>
        <button className="taskbar-btn" title="Logout">
          <LogOut size={16} />
        </button>
      </div>

      {/* Centro: App pinnate o aperte */}
      <div className="taskbar-center">
        {visibleApps.map(app => {
          const isActive = activeWindowId === app.id && app.isOpen && !app.isMinimized;
          return (
            <div 
              key={app.id} 
              className={`taskbar-item ${app.isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
              onClick={() => handleAppClick(app.id, app.isOpen, app.isMinimized, isActive)}
              onContextMenu={(e) => handleContextMenu(e, app.id)}
              title={app.title + (app.isPinned ? " (Pinnata - Tasto destro per rimuovere)" : " (Tasto destro per fissare)")}
            >
              <div className="taskbar-icon flex-center" style={{ background: app.color }}>
                 {app.icon}
              </div>
              {app.isOpen && <div className="taskbar-dot" />}
            </div>
          );
        })}
      </div>

      {/* Destra: Sistema e Widget */}
      <div className="taskbar-right">
        <button className="taskbar-btn" onClick={() => openWindow('widget-gallery')} title="Galleria Widget">
          <GalleryHorizontalEnd size={18} />
        </button>
        <div className="taskbar-logo">
          ARCHELIA
        </div>
      </div>
    </div>
  );
}
