import React, { useEffect, useState } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { checkOverlap, getIconDimensions, getWidgetDimensions, type Rect } from '../../utils/desktopCollision';
import WindowComponent from './WindowComponent';
import WidgetContainer from './WidgetContainer';
import Taskbar from './Taskbar';
import ContextMenu from '../ui/ContextMenu';
import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import EqualizzatoreApp from '../../pages/EqualizzatoreApp';
import { MarketingApp } from '../../pages/MarketingApp';
import { EmailBuilderApp } from '../../pages/EmailBuilderApp';
import PromoManualApp from '../../pages/PromoManualApp';
import PromoAutoApp from '../../pages/PromoAutoApp';
import './DesktopOS.css';

export default function DesktopOS() {
  const { windows, wallpaper, registerApp, openWindow, togglePinApp, updateDesktopPosition } = useWindowStore();
  const { widgets } = useWidgetStore();
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null);

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
      let snappedX = Math.round(targetX / 10) * 10;
      let snappedY = Math.round(targetY / 10) * 10;
      
      // Clamp boundaries so icons don't go outside or under taskbar
      const iconWidth = 80;
      const iconHeight = 85;
      const maxW = window.innerWidth - iconWidth;
      const maxH = window.innerHeight - 52 - iconHeight; // 52px is taskbar height
      
      snappedX = Math.max(0, Math.min(snappedX, maxW));
      snappedY = Math.max(0, Math.min(snappedY, maxH));

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
          ...getWidgetDimensions(w.type, w.size || 'small'),
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
    // Registra le app all'avvio se non presenti (check per singola app invece che globalmente vuoto)
    const getImg = (src: string) => <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Icon" />;
    if (!windows['dashboard']) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: getImg('/icons/dashboard.jpg'), color: 'transparent', component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650, desktopX: 30, desktopY: 30 });
    }
    if (!windows['orders']) {
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: getImg('/icons/orders.jpg'), color: 'transparent', component: <Orders />, x: 150, y: 100, width: 900, height: 600, desktopX: 30, desktopY: 130 });
    }
    if (!windows['products']) {
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: getImg('/icons/products.jpg'), color: 'transparent', component: <Products />, x: 200, y: 150, width: 900, height: 600, desktopX: 30, desktopY: 230 });
    }
    if (!windows['settings']) {
      registerApp({ id: 'settings', title: 'Impostazioni', icon: getImg('/icons/settings.jpg'), color: 'transparent', component: <div style={{padding: '2rem'}}>Impostazioni di sistema</div>, x: 250, y: 200, width: 600, height: 400, desktopX: 30, desktopY: 330 });
    }
    if (!windows['equalizzatore']) {
      registerApp({ id: 'equalizzatore', title: 'Equalizzatore', icon: getImg('/icons/dashboard.jpg'), color: 'transparent', component: <EqualizzatoreApp />, x: 100, y: 100, width: 1100, height: 750, desktopX: 130, desktopY: 30 });
    }
    if (!windows['promo_manual']) {
      registerApp({ id: 'promo_manual', title: 'Promo Manuali', icon: getImg('/icons/dashboard.jpg'), color: 'transparent', component: <PromoManualApp />, x: 150, y: 150, width: 850, height: 600, desktopX: 130, desktopY: 130 });
    }
    if (!windows['promo_auto']) {
      registerApp({ id: 'promo_auto', title: 'Promo Automazioni', icon: getImg('/icons/dashboard.jpg'), color: 'transparent', component: <PromoAutoApp />, x: 200, y: 200, width: 950, height: 650, desktopX: 130, desktopY: 230 });
    }
    if (!windows['marketing']) {
      registerApp({ id: 'marketing', title: 'Marketing', icon: getImg('/icons/marketing.jpg'), color: 'transparent', component: <MarketingApp />, x: 250, y: 250, width: 1000, height: 700, desktopX: 130, desktopY: 330 });
    }
    if (!windows['email_builder']) {
      registerApp({ id: 'email_builder', title: 'Email AI Builder', icon: getImg('/icons/marketing.jpg'), color: 'transparent', component: <EmailBuilderApp />, x: 300, y: 150, width: 1100, height: 750, desktopX: 230, desktopY: 30 });
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
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id });
              }}
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
              <span className="desktop-icon-label">{app.title}</span>
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

      {/* Context Menu Desktop */}
      {contextMenu && windows[contextMenu.appId] && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              id: 'open',
              label: 'Apri',
              onClick: () => openWindow(contextMenu.appId)
            },
            {
              id: 'change-icon',
              label: 'Cambia immagine icona',
              onClick: () => { /* Placeholder per futuro sviluppo */ }
            },
            {
              id: 'pin',
              label: windows[contextMenu.appId].isPinned ? 'Rimuovi dalla taskbar' : 'Fissa sulla taskbar',
              dividerBefore: true,
              onClick: () => togglePinApp(contextMenu.appId)
            }
          ]}
        />
      )}
    </div>
  );
}
