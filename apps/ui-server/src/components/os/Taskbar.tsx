import React, { useState, useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import StartMenu from './StartMenu';
import './Taskbar.css';

export default function Taskbar() {
  const { windows, openWindow, activeWindowId, minimizeWindow, togglePinApp } = useWindowStore();
  const [isStartMenuOpen, setStartMenuOpen] = useState(false);
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
    <>
      {isStartMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}
      <div 
        className="taskbar-container"
        onDrop={handleTaskbarDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Sinistra: Start Button (ARCHELIA) */}
        <div className="taskbar-left">
          <div 
            className="taskbar-logo taskbar-start-btn" 
            onClick={() => setStartMenuOpen(!isStartMenuOpen)}
          >
            ARCHELIA
          </div>
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
                draggable={true}
                onDragStart={(e) => handleDragStartTaskbarIcon(e, app.id)}
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

        {/* Destra: Data e Ora */}
        <div className="taskbar-right">
          <div className="taskbar-clock">
            <div className="taskbar-time">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="taskbar-date">{time.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
