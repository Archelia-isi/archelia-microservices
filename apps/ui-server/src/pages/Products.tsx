import { Package, SearchX, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function Products() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSyncZucchetti = async () => {
    setIsSyncing(true);
    setStatusMsg('Invio comando in coda...');
    try {
      // Endpoint api-gateway per triggerare il pull (che manderà un job su BullMQ)
      const res = await fetch('http://localhost:3000/api/admin/trigger-sync/import-products', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Comando inviato! Il worker Zucchetti sta elaborando in background.');
      } else {
        setStatusMsg('Errore: ' + data.error);
      }
    } catch (err: any) {
      setStatusMsg('Errore di connessione: ' + err.message);
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Catalogo Prodotti</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {statusMsg && <span style={{ alignSelf: 'center', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 500 }}>{statusMsg}</span>}
          <button 
            className="btn-primary flex-center" 
            style={{ gap: '0.5rem', opacity: isSyncing ? 0.7 : 1 }}
            onClick={handleSyncZucchetti}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> 
            {isSyncing ? 'In coda...' : 'Sincronizza da Zucchetti'}
          </button>
        </div>
      </div>

      {/* Empty State Native App Style */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '5rem 2rem',
        textAlign: 'center',
        height: '100%'
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
          Clicca "Sincronizza da Zucchetti" in alto per accendere il worker-zucchetti-pull!
        </p>
      </div>
    </div>
  );
}
