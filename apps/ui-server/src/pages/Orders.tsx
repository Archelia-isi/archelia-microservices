import { ShoppingCart } from 'lucide-react';

export default function Orders() {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Gestione Ordini</h2>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <ShoppingCart size={18} /> Sincronizza Ora
        </button>
      </div>

      <div style={{ background: 'var(--color-surface-solid)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 600 }}>ID Ordine</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Cliente</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Stato</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Totale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Nessun ordine caricato.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
