import './DesktopLayout.css';

export default function DesktopLayout() {
  return (
    <div className="desktop-layout">
      <aside className="desktop-sidebar">
        <h1 className="text-h2" style={{ color: 'var(--color-primary)' }}>Archelia</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Ordini</div>
          <div className="nav-item">Prodotti</div>
          <div className="nav-item">Impostazioni</div>
        </nav>
      </aside>
      <main className="desktop-main">
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 className="text-h1">Dashboard Desktop</h2>
          <p className="text-body" style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
            Benvenuto in Archelia V2. Questa interfaccia sfrutta il Glassmorphism e apre i dettagli tramite Pop-up Modali.
          </p>
          <button className="btn-primary" style={{ marginTop: '2rem' }}>Testa Bottone Primary</button>
        </div>
      </main>
    </div>
  );
}
