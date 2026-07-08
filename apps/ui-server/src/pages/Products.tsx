import { Package, SearchX } from 'lucide-react';

export default function Products() {
  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Catalogo Prodotti</h2>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Package size={16} /> Aggiorna Giacenze
        </button>
      </div>

      {/* Empty State Apple Style */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '5rem 2rem',
        textAlign: 'center',
        border: '1px dashed var(--color-border)'
      }}>
        <div style={{ 
          width: '64px', height: '64px', 
          borderRadius: '50%', 
          background: 'var(--color-bg)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <SearchX size={28} color="var(--color-text-muted)" />
        </div>
        <h3 className="text-h2" style={{ marginBottom: '0.5rem', fontSize: '18px' }}>Catalogo Vuoto</h3>
        <p className="text-body" style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
          L'Equalizzatore non ha ancora elaborato i prodotti o il Worker Zucchetti non è stato avviato.
        </p>
      </div>
    </div>
  );
}
