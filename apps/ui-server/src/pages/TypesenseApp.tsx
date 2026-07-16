import { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import AppSplashScreen from '../components/os/AppSplashScreen';
import toast from 'react-hot-toast';
import './TypesenseApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function TypesenseApp() {
  const [status, setStatus] = useState<any>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/status`);
      if (res.ok) {
        const d = await res.json();
        setStatus(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchStatus();
      setTimeout(() => setIsAppReady(true), 400);
    };
    init();
  }, []);

  const handleSyncNow = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/sync`, { method: 'POST' });
      if (res.ok) {
        toast.success('Sync Typesense accodato con successo!');
      } else {
        toast.error('Errore durante il sync');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    }
  };

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Typesense" 
        icon={<Search size={56} />} 
      />
      
      <div className={`typesense-app eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <div className="typesense-main-container">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', paddingTop: '16px' }}>
            
            <GlassPanel padding="lg" variant="light" className="typesense-card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-main)' }}>Sincronizzazione Dati</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5, flex: 1 }}>
                Typesense è il motore di ricerca vettoriale che alimenta il sito. Puoi forzare la sincronizzazione manuale per ricostruire gli indici dai dati più recenti.
              </p>
              
              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={handleSyncNow} style={{ width: '100%', justifyContent: 'center' }}>
                Forza Sync Immediato
              </Button>
            </GlassPanel>

            <GlassPanel padding="lg" variant="light" className="typesense-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: 'var(--color-text-main)', textAlign: 'center' }}>Stato Motore Typesense</h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>Stato</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: status?.ok ? 'var(--color-success)' : 'var(--color-danger)', lineHeight: 1.2 }}>
                    {status?.ok ? 'Online' : 'Offline'}
                  </div>
                </div>
                
                <div style={{ width: '1px', height: '60px', background: 'var(--color-border-dark)' }}></div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>Documenti</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                    {status?.collection ? status.collection.num_documents.toLocaleString() : '0'}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {status?.collection ? status.collection.name : 'N/A'}
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

        </div>
      </div>
    </>
  );
}
