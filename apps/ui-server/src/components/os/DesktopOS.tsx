import { useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import WindowComponent from './WindowComponent';
import Dock from './Dock';
import './DesktopOS.css';

import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import { LayoutDashboard, ShoppingCart, Package, Settings } from 'lucide-react';

export default function DesktopOS() {
  const { windows, wallpaper, registerApp } = useWindowStore();

  useEffect(() => {
    // Registra le app all'avvio se non presenti
    if (Object.keys(windows).length === 0) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: <LayoutDashboard size={24} color="white" />, component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650 });
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: <ShoppingCart size={24} color="white" />, component: <Orders />, x: 150, y: 100, width: 900, height: 600 });
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: <Package size={24} color="white" />, component: <Products />, x: 200, y: 150, width: 900, height: 600 });
      registerApp({ id: 'settings', title: 'Impostazioni di Sistema', icon: <Settings size={24} color="white" />, component: <div style={{padding: '2rem'}}>Impostazioni di sistema</div>, x: 250, y: 200, width: 600, height: 400 });
    }
  }, []);

  return (
    <div className="desktop-os" style={{ backgroundImage: `url(${wallpaper})` }}>
      {/* Top Menu Bar macOS */}
      <div className="mac-menubar">
        <div className="menu-left">
          <span className="menu-item bold"></span>
          <span className="menu-item bold">Archelia OS</span>
          <span className="menu-item">Archivio</span>
          <span className="menu-item">Modifica</span>
          <span className="menu-item">Finestra</span>
        </div>
        <div className="menu-right">
          <span className="menu-item">{new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="menu-item">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Area Finestre */}
      <div className="desktop-workspace">
        {Object.values(windows).map(win => (
          <WindowComponent key={win.id} id={win.id} />
        ))}
      </div>

      {/* Dock Inferiore */}
      <Dock />
    </div>
  );
}
