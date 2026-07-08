import { Activity, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Panoramica</h2>
        <p className="text-small">Tieni sotto controllo le metriche vitali in tempo reale.</p>
      </div>
      
      {/* Metric Cards - High Density */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Ordini Oggi</span>
            <ShoppingCart size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">124</span>
            <span style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <TrendingUp size={12} /> +12%
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Fatturato</span>
            <Activity size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">€4.200</span>
            <span style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <TrendingUp size={12} /> +5%
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Nuovi Clienti</span>
            <Users size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">18</span>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Prodotti Attivi</span>
            <Package size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">4.302</span>
          </div>
        </div>
      </div>

      {/* Recenti */}
      <div style={{ marginTop: '3rem' }}>
        <h3 className="text-h2" style={{ marginBottom: '1rem', fontSize: '18px' }}>Attività Recente</h3>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="text-small">Il flusso degli eventi apparirà qui non appena collegheremo Redis.</p>
        </div>
      </div>
    </div>
  );
}
