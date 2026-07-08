import { Activity, Package, Settings, ShoppingCart } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <h2 className="text-h1" style={{ marginBottom: '2rem' }}>Dashboard Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {/* Stat Card 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-full)' }}>
            <ShoppingCart size={24} color="var(--color-primary)" />
          </div>
          <div>
            <p className="text-small">Ordini Oggi</p>
            <p className="text-h2">124</p>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-full)' }}>
            <Package size={24} color="var(--color-success)" />
          </div>
          <div>
            <p className="text-small">Prodotti Attivi</p>
            <p className="text-h2">4,302</p>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-full)' }}>
            <Activity size={24} color="var(--color-warning)" />
          </div>
          <div>
            <p className="text-small">Sincronizzazioni</p>
            <p className="text-h2">In corso...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
