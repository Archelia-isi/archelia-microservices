import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './DesktopLayout.css';
import { LayoutDashboard, ShoppingCart, Package, Settings, Search, Bell, User } from 'lucide-react';

export default function DesktopLayout() {
  const location = useLocation();
  const pathNames: Record<string, string> = {
    '/': 'Dashboard',
    '/orders': 'Ordini',
    '/products': 'Prodotti',
    '/settings': 'Impostazioni',
  };

  const currentTitle = pathNames[location.pathname] || 'Dashboard';

  return (
    <div className="desktop-layout">
      {/* Sidebar Vetrata */}
      <aside className="desktop-sidebar">
        <div style={{ padding: '0 12px', marginBottom: '1.5rem' }}>
          <h1 className="text-h2" style={{ color: 'var(--color-primary)' }}>Archelia</h1>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p className="text-small" style={{ padding: '0 12px', marginBottom: '0.25rem', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Generale</p>
          <NavLink to="/" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }} end>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1.5rem' }}>
          <p className="text-small" style={{ padding: '0 12px', marginBottom: '0.25rem', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vendite & Catalogo</p>
          <NavLink to="/orders" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <ShoppingCart size={16} /> Ordini
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <Package size={16} /> Prodotti
          </NavLink>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'auto' }}>
          <NavLink to="/settings" className={({ isActive }) => `nav-item flex-center ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <Settings size={16} /> Impostazioni
          </NavLink>
        </div>
      </aside>

      {/* Main Area con Top Bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
        
        {/* Top Bar macOS Style */}
        <header style={{ 
          height: '60px', 
          borderBottom: '1px solid var(--color-border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>Archelia</span>
            <span className="text-small" style={{ color: 'var(--color-border)' }}>/</span>
            <span className="text-body" style={{ fontWeight: 600 }}>{currentTitle}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                placeholder="Cerca ovunque..." 
                style={{ 
                  padding: '8px 12px 8px 32px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--color-border)', 
                  background: 'white',
                  fontSize: '13px',
                  width: '240px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Bell size={18} color="var(--color-text-muted)" style={{ cursor: 'pointer' }} />
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <User size={16} color="white" />
              </div>
            </div>
          </div>
        </header>

        {/* Contenuto Pagina */}
        <main className="desktop-main" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}
