import React, { useEffect, useState } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { checkOverlap, getIconDimensions, getWidgetDimensions, type Rect } from '../../utils/desktopCollision';
import WindowComponent from './WindowComponent';
import WidgetContainer from './WidgetContainer';
import Taskbar from './Taskbar';
import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import { LayoutDashboard, ShoppingCart, Package, Settings } from 'lucide-react';
import './DesktopOS.css';

export default function DesktopOS() {
  const { windows, wallpaper, registerApp, openWindow, togglePinApp, updateDesktopPosition } = useWindowStore();
  const { widgets } = useWidgetStore();
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);

  const handleDragStartDesktopIcon = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('appId', id);
    e.dataTransfer.setData('source', 'desktop');
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
    e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
    
    // Nascondi l'icona originale subito dopo che il browser ha catturato il ghost
    setTimeout(() => setDraggingAppId(id), 0);
  };

  const handleDragEndDesktopIcon = () => {
    setDraggingAppId(null);
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    const source = e.dataTransfer.getData('source');
    
    if (source === 'taskbar' && appId) {
      if (windows[appId].isPinned) togglePinApp(appId);
    } else if (source === 'desktop' && appId) {
      const offsetX = parseFloat(e.dataTransfer.getData('offsetX')) || 0;
      const offsetY = parseFloat(e.dataTransfer.getData('offsetY')) || 0;
      const targetX = e.clientX - offsetX;
      const targetY = e.clientY - offsetY;
      
      const app = windows[appId];
      const originalX = app.desktopX ?? 30;
      const originalY = app.desktopY ?? 30;

      // Snap to grid (10px) per facilitare l'allineamento
      const snappedX = Math.round(targetX / 10) * 10;
      const snappedY = Math.round(targetY / 10) * 10;

      const targetDim = getIconDimensions();
      const candidateRect = { x: snappedX, y: snappedY, ...targetDim };

      const existingItems: Rect[] = [];
      Object.values(windows).forEach(win => {
        if (!win.isPinned && win.id !== appId) {
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

      // Importante: import checkOverlap da utils/desktopCollision in cima al file se non presente
      const isOverlap = existingItems.some(item => checkOverlap(candidateRect, item));
      
      if (isOverlap) {
        // Torna al posto originale
        updateDesktopPosition(appId, originalX, originalY);
      } else {
        updateDesktopPosition(appId, snappedX, snappedY);
      }
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    // Registra le app all'avvio se non presenti
    if (Object.keys(windows).length === 0) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: <LayoutDashboard size={24} color="white" />, color: 'linear-gradient(135deg, #FF9500, #FF5E3A)', component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650, desktopX: 30, desktopY: 30 });
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: <ShoppingCart size={24} color="white" />, color: 'linear-gradient(135deg, #34C759, #32B351)', component: <Orders />, x: 150, y: 100, width: 900, height: 600, desktopX: 30, desktopY: 130 });
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: <Package size={24} color="white" />, color: 'linear-gradient(135deg, #5E5CE6, #5856D6)', component: <Products />, x: 200, y: 150, width: 900, height: 600, desktopX: 30, desktopY: 230 });
      registerApp({ id: 'settings', title: 'Impostazioni', icon: <Settings size={24} color="white" />, color: 'linear-gradient(135deg, #8E8E93, #AEAEB2)', component: <div style={{padding: '2rem'}}>Impostazioni di sistema</div>, x: 250, y: 200, width: 600, height: 400, desktopX: 30, desktopY: 330 });
    }
  }, []);

  return (
    <div className="desktop-os" style={{ backgroundImage: `url(${wallpaper})` }}>
      {/* Area Finestre e Widget */}
      <div 
        className="desktop-workspace"
        onDrop={handleWorkspaceDrop}
        onDragOver={handleWorkspaceDragOver}
      >
        {/* Shortcuts Desktop */}
        <div className="desktop-shortcuts" style={{ zIndex: 10, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {Object.values(windows).map(app => (
            <div 
              key={`shortcut-${app.id}`} 
              className="desktop-icon-wrapper"
              onClick={() => openWindow(app.id)}
              draggable={true}
              onDragStart={(e) => handleDragStartDesktopIcon(e, app.id)}
              onDragEnd={handleDragEndDesktopIcon}
              style={{
                position: 'absolute',
                left: app.desktopX ?? 30,
                top: app.desktopY ?? 30,
                pointerEvents: 'auto',
                opacity: draggingAppId === app.id ? 0 : 1
              }}
            >
              <div className="desktop-icon flex-center" style={{ background: app.color }}>
                {app.icon}
              </div>
              <span className="desktop-icon-label">{app.title.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Livello Widget Desktop */}
        <div className="desktop-widgets" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
          {widgets.map(w => (
            <WidgetContainer key={w.id} widget={w} />
          ))}
        </div>

        {Object.values(windows).map(win => (
          <WindowComponent key={win.id} id={win.id} />
        ))}
      </div>

      {/* Nuova Taskbar */}
      <Taskbar />
    </div>
  );
}
