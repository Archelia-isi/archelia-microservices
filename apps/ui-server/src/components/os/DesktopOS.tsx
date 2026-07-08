import { useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import WindowComponent from './WindowComponent';
import WidgetContainer from './WidgetContainer';
import Dock from './Dock';
import './DesktopOS.css';

import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import { LayoutDashboard, ShoppingCart, Package, Settings } from 'lucide-react';

export default function DesktopOS() {
  const { windows, wallpaper, registerApp, openWindow } = useWindowStore();
  const { widgets, addWidget } = useWidgetStore();

  useEffect(() => {
    // Registra le app all'avvio se non presenti
    if (Object.keys(windows).length === 0) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: <LayoutDashboard size={24} color="white" />, color: 'linear-gradient(135deg, #FF9500, #FF5E3A)', component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650 });
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: <ShoppingCart size={24} color="white" />, color: 'linear-gradient(135deg, #34C759, #32B351)', component: <Orders />, x: 150, y: 100, width: 900, height: 600 });
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: <Package size={24} color="white" />, color: 'linear-gradient(135deg, #5E5CE6, #5856D6)', component: <Products />, x: 200, y: 150, width: 900, height: 600 });
      registerApp({ id: 'settings', title: 'Impostazioni', icon: <Settings size={24} color="white" />, color: 'linear-gradient(135deg, #8E8E93, #AEAEB2)', component: <div style={{padding: '2rem'}}>Impostazioni di sistema</div>, x: 250, y: 200, width: 600, height: 400 });
    }
  }, []);

  return (
    <div className="desktop-os" style={{ backgroundImage: `url(${wallpaper})` }}>
      {/* Top Menu Bar Auto-Hide */}
      <div className="mac-menubar-trigger" />
      <div className="mac-menubar">
        <div className="menu-left">
          <span className="menu-item bold"></span>
          <span className="menu-item bold">Archelia OS</span>
          <span className="menu-item" onClick={() => addWidget('clock', 100, 100)}>+ Orologio</span>
          <span className="menu-item" onClick={() => addWidget('weather', 150, 150)}>+ Meteo</span>
          <span className="menu-item" onClick={() => addWidget('kpi', 200, 200)}>+ Statistiche</span>
        </div>
        <div className="menu-right">
          <span className="menu-item">{new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="menu-item">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Area Finestre e Widget */}
      <div className="desktop-workspace">
        {/* Shortcuts Desktop */}
        <div className="desktop-shortcuts">
          {Object.values(windows).map(app => (
            <div 
              key={`shortcut-${app.id}`} 
              className="desktop-icon-wrapper"
              onDoubleClick={() => openWindow(app.id)}
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

      {/* Dock Auto-Hide */}
      <div className="dock-trigger" />
      <Dock />
    </div>
  );
}
