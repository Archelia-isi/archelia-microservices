import { useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import WindowComponent from './WindowComponent';
import WidgetContainer from './WidgetContainer';
import Taskbar from './Taskbar';
import WidgetGallery from '../../pages/WidgetGallery';
import './DesktopOS.css';

import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import { LayoutDashboard, ShoppingCart, Package, Settings, GalleryHorizontalEnd } from 'lucide-react';

export default function DesktopOS() {
  const { windows, wallpaper, registerApp, openWindow } = useWindowStore();
  const { widgets } = useWidgetStore();

  useEffect(() => {
    // Registra le app all'avvio se non presenti
    if (Object.keys(windows).length === 0) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: <LayoutDashboard size={24} color="white" />, color: 'linear-gradient(135deg, #FF9500, #FF5E3A)', component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650 });
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: <ShoppingCart size={24} color="white" />, color: 'linear-gradient(135deg, #34C759, #32B351)', component: <Orders />, x: 150, y: 100, width: 900, height: 600 });
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: <Package size={24} color="white" />, color: 'linear-gradient(135deg, #5E5CE6, #5856D6)', component: <Products />, x: 200, y: 150, width: 900, height: 600 });
      registerApp({ id: 'settings', title: 'Impostazioni', icon: <Settings size={24} color="white" />, color: 'linear-gradient(135deg, #8E8E93, #AEAEB2)', component: <div style={{padding: '2rem'}}>Impostazioni di sistema</div>, x: 250, y: 200, width: 600, height: 400 });
      registerApp({
        id: 'widget-gallery',
        title: 'Galleria Widget',
        component: <WidgetGallery />,
        icon: <GalleryHorizontalEnd size={24} color="white" />,
        width: 800,
        height: 500,
        x: window.innerWidth / 2 - 400,
        y: window.innerHeight / 2 - 250,
        color: '#8E8E93'
      });
    }
  }, []);

  return (
    <div className="desktop-os" style={{ backgroundImage: `url(${wallpaper})` }}>
      {/* Area Finestre e Widget */}
      <div className="desktop-workspace">
        {/* Shortcuts Desktop */}
        <div className="desktop-shortcuts" style={{ zIndex: 10 }}>
          {Object.values(windows).map(app => (
            <div 
              key={`shortcut-${app.id}`} 
              className="desktop-icon-wrapper"
              onClick={() => openWindow(app.id)}
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
