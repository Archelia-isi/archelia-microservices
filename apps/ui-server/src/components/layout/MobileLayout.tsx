import './MobileLayout.css';

export default function MobileLayout() {
  return (
    <div className="mobile-layout">
      <main className="mobile-main">
        <h1 className="text-h2" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Archelia</h1>
        <div className="glass-panel animate-slide-up" style={{ padding: '1.5rem' }}>
          <h2 className="text-h2">Mobile View</h2>
          <p className="text-body" style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
            Design ottimizzato per smartphone. Qui sotto trovi la Bottom Navigation Bar glassmorfica.
          </p>
          <button className="btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Azione Rapida</button>
        </div>
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-item active">
          <span style={{ fontSize: '1.2rem' }}>🏠</span>
          <span>Home</span>
        </div>
        <div className="bottom-nav-item">
          <span style={{ fontSize: '1.2rem' }}>📦</span>
          <span>Ordini</span>
        </div>
        <div className="bottom-nav-item">
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          <span>Impostazioni</span>
        </div>
      </nav>
    </div>
  );
}
