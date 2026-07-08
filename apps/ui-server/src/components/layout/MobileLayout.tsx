import { NavLink, Outlet } from 'react-router-dom';
import './MobileLayout.css';
import { LayoutDashboard, ShoppingCart, Package, Settings } from 'lucide-react';

export default function MobileLayout() {
  return (
    <div className="mobile-layout">
      <main className="mobile-main">
        <h1 className="text-h2" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Archelia</h1>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={20} />
          <span>Ordini</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Prodotti</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Config</span>
        </NavLink>
      </nav>
    </div>
  );
}
