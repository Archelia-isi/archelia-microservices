import { useWindowStore } from '../../store/useWindowStore';
import './Dock.css';

export default function Dock() {
  const { windows, openWindow, activeWindowId, minimizeWindow } = useWindowStore();
  const apps = Object.values(windows);

  const handleDockClick = (id: string, isOpen: boolean, isMinimized: boolean, isActive: boolean) => {
    if (!isOpen || isMinimized) {
      openWindow(id);
    } else if (isActive) {
      minimizeWindow(id);
    } else {
      openWindow(id);
    }
  };

  return (
    <div className="dock-container">
      <div className="dock">
        {apps.map(app => {
          const isActive = activeWindowId === app.id && app.isOpen && !app.isMinimized;
          return (
            <div 
              key={app.id} 
              className="dock-item"
              onClick={() => handleDockClick(app.id, app.isOpen, app.isMinimized, isActive)}
            >
              <div className="dock-icon flex-center" style={{ background: app.color }}>
                 {app.icon}
              </div>
              {app.isOpen && <div className={`dock-dot ${isActive ? 'active' : ''}`} />}
              <div className="dock-tooltip">{app.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
