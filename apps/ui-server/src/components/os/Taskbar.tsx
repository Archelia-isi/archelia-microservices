import React, { useState, useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import StartMenu from './StartMenu';
import ContextMenu from '../ui/ContextMenu';
import { getThemeIconPath } from '../../utils/themeUtils';
import { BrainCircuit, LogOut } from 'lucide-react';
import * as FcIcons from 'react-icons/fc';
import { useStoreContext } from '../../store/useStoreContext';
import './Taskbar.css';

const DynamicFcIcon = ({ name, size = 40 }: { name: string, size?: number }) => {
  const IconComponent = (FcIcons as any)[name];
  if (!IconComponent) return <FcIcons.FcFolder size={size} />;
  return <IconComponent size={size} />;
};

export default function Taskbar() {
  const { windows, openWindow, activeWindowId, minimizeWindow, closeWindow, togglePinApp, isChatbotOpen, toggleChatbot, setEditingIconAppId } = useWindowStore();
  const { taskbarPosition, taskbarAutoHide, theme } = useSettingsStore();
  const { currentStore } = useStoreContext();
  const [isStartMenuOpen, setStartMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTaskbarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    const source = e.dataTransfer.getData('source');
    if (source === 'desktop' && appId) {
      if (!windows[appId].isPinned) togglePinApp(appId);
    }
  };

  const handleDragStartTaskbarIcon = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('appId', id);
    e.dataTransfer.setData('source', 'taskbar');
  };

  const b2bAllowedApps = ['orders', 'products', 'settings', 'equalizzatore', 'infinity', 'images', 'typesense', 'analytics', 'logs', 'calendar_app', 'notes_app', 'os-settings'];
  
  const visibleApps = Object.values(windows).filter(app => {
    if (currentStore === 'B2B' && !b2bAllowedApps.includes(app.id)) return false;
    return app.isPinned || app.isOpen;
  });

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
    setContextMenu({ x: e.clientX, y: e.clientY, appId: id });
  };

  return (
    <>
      {isStartMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}
      <div 
        className={`taskbar-container pos-${taskbarPosition} ${taskbarAutoHide ? 'auto-hide' : ''}`}
        onDrop={handleTaskbarDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Sinistra: Start Button (ARCHELIA) */}
        <div className="taskbar-left">
          <div 
            className="taskbar-logo taskbar-start-btn" 
            onClick={() => setStartMenuOpen(!isStartMenuOpen)}
          >
            {currentStore === 'B2B' ? 'IZZO DISTRIBUZIONE' : 'ARCHELIA'}
          </div>
        </div>

        {/* Centro: App pinnate o aperte */}
        <div className="taskbar-center">
          {visibleApps.map(app => {
            const isActive = activeWindowId === app.id && app.isOpen && !app.isMinimized;
            const themeIconPath = getThemeIconPath(app.id, theme);
            const finalIconPath = themeIconPath || app.iconPath;
            return (
              <div 
                key={app.id} 
                className={`taskbar-item ${app.isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
                onClick={() => handleAppClick(app.id, app.isOpen, app.isMinimized, isActive)}
                onContextMenu={(e) => handleContextMenu(e, app.id)}
                draggable={true}
                onDragStart={(e) => handleDragStartTaskbarIcon(e, app.id)}
                title={app.title + " (Tasto destro per opzioni)"}
              >
                <div className="taskbar-icon flex-center" style={{ background: app.color }}>
                   {finalIconPath ? (
                     finalIconPath.startsWith('fc:') ? (
                       <DynamicFcIcon name={finalIconPath.split(':')[1]} />
                     ) : (
                       <img src={finalIconPath} alt={app.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     )
                   ) : (
                     app.icon
                   )}
                </div>
                {app.isOpen && <div className="taskbar-dot" />}
              </div>
            );
          })}
        </div>

        {/* Destra: Data, Ora, Logout e Chatbot */}
        <div className="taskbar-right">
          {/* Tasto Multi-Tenant Rimosso dalla taskbar e spostato nel menu start */}          <div 
            className={`taskbar-chatbot-btn ${isChatbotOpen ? 'active' : ''}`}
            onClick={() => toggleChatbot()}
            title="Archelia AI Chatbot"
          >
            <BrainCircuit size={20} color={isChatbotOpen ? '#00d2ff' : 'var(--color-text-main)'} />
          </div>
          <div 
            className="taskbar-chatbot-btn"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.reload();
            }}
            title="Esci da Archelia OS"
          >
            <LogOut size={18} color="var(--color-text-main)" />
          </div>
          <div className="taskbar-clock">
            <div className="taskbar-time">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="taskbar-date">{time.toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {contextMenu && windows[contextMenu.appId] && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              id: 'open',
              label: windows[contextMenu.appId].isOpen ? (windows[contextMenu.appId].isMinimized ? 'Ripristina' : 'Riduci a icona') : 'Apri',
              onClick: () => {
                const app = windows[contextMenu.appId];
                handleAppClick(app.id, app.isOpen, app.isMinimized, activeWindowId === app.id);
              }
            },
            {
              id: 'change-icon',
              label: 'Cambia immagine icona',
              dividerBefore: true,
              onClick: () => setEditingIconAppId(contextMenu.appId)
            },
            {
              id: 'pin',
              label: windows[contextMenu.appId].isPinned ? 'Rimuovi dalla taskbar' : 'Fissa sulla taskbar',
              dividerBefore: true,
              onClick: () => togglePinApp(contextMenu.appId)
            },
            {
              id: 'close',
              label: 'Chiudi',
              variant: 'danger',
              disabled: !windows[contextMenu.appId].isOpen,
              dividerBefore: true,
              onClick: () => closeWindow(contextMenu.appId)
            }
          ]}
        />
      )}
    </>
  );
}
