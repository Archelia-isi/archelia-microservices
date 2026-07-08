import { Package } from 'lucide-react';

export default function Products() {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Catalogo Prodotti</h2>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Package size={18} /> Aggiorna Giacenze
        </button>
      </div>

      <div style={{ background: 'var(--color-surface-solid)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Nessun prodotto caricato dal Database Neon.
      </div>
    </div>
  );
}
