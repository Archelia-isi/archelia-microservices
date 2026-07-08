import { ShoppingCart, Inbox } from 'lucide-react';

export default function Orders() {
  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Gestione Ordini</h2>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <ShoppingCart size={16} /> Sincronizza Ora
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
          <Inbox size={28} color="var(--color-text-muted)" />
        </div>
        <h3 className="text-h2" style={{ marginBottom: '0.5rem', fontSize: '18px' }}>Nessun ordine trovato</h3>
        <p className="text-body" style={{ color: 'var(--color-text-muted)', maxWidth: '400px', marginBottom: '2rem' }}>
          Non ci sono ordini caricati nel database locale. Connetti l'API Gateway per iniziare a scaricare gli ordini da Shopify.
        </p>
        <button style={{ 
          background: 'white', 
          border: '1px solid var(--color-border)', 
          padding: '8px 16px', 
          borderRadius: '6px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}>
          Configura Connessione
        </button>
      </div>
    </div>
  );
}
