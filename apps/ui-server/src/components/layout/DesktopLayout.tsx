import { NavLink, Outlet } from 'react-router-dom';
import './DesktopLayout.css';
import { LayoutDashboard, ShoppingCart, Package, Settings } from 'lucide-react';

export default function DesktopLayout() {
  return (
    <div className="desktop-layout">
      <aside className="desktop-sidebar">
        <h1 className="text-h2" style={{ color: 'var(--color-primary)' }}>Archelia</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <NavLink to="/" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }} end>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <ShoppingCart size={18} /> Ordini
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <Package size={18} /> Prodotti
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <Settings size={18} /> Impostazioni
          </NavLink>
        </nav>
      </aside>
      <main className="desktop-main">
        <Outlet />
      </main>
    </div>
  );
}
