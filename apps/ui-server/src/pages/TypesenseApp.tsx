import { useState, useEffect } from 'react';
import { Search, Play, Save, Zap } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import AppSplashScreen from '../components/os/AppSplashScreen';
import toast from 'react-hot-toast';
import './TypesenseApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function TypesenseApp() {
  const [status, setStatus] = useState<any>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [schedulerJobs, setSchedulerJobs] = useState<any[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, { val: number, unit: string, time: string | null }>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const d = await res.json();
        setStatus(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScheduler = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const typesenseJobs = data.filter((j: any) => j.id === 'sync-typesense' || j.id === 'sync-typesense-promo');
        setSchedulerJobs(typesenseJobs);
        
        const newLocalVals: any = {};
        typesenseJobs.forEach((j: any) => {
          newLocalVals[j.id] = { val: j.intervalValue, unit: j.intervalUnit, time: j.startTime };
        });
        setLocalValues(newLocalVals);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchScheduler()]);
      setTimeout(() => setIsAppReady(true), 400);
    };
    init();
  }, []);

  const handleSyncNow = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/sync`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success('Sync Typesense accodato con successo!');
      } else {
        toast.error('Errore durante il sync');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    }
  };

  const handleFastSyncPromo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/sync-promo`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success('Fast Sync Promozioni accodato!');
      } else {
        toast.error('Errore durante il sync');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    }
  };

  const toggleJob = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler/toggle`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, enabled })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(enabled ? 'Job abilitato' : 'Job disabilitato');
      fetchScheduler();
    } catch (err: any) {
      toast.error('Errore modifica stato: ' + err.message);
    }
  };

  const updateInterval = async (id: string, intervalValue: number, intervalUnit: string, startTime: string | null) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler/update-interval`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, intervalValue, intervalUnit, startTime })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Intervallo aggiornato');
      fetchScheduler();
    } catch (err: any) {
      toast.error('Errore aggiornamento: ' + err.message);
    }
  };

  const runNow = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler/run-now`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Avviato con successo');
      } else {
        toast.error(data.message || 'Errore avvio');
      }
    } catch (err: any) {
      toast.error('Errore avvio job: ' + err.message);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults({ empty: true });
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/typesense/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults({ error: true });
      }
    } catch (err) {
      setSearchResults({ error: true });
    } finally {
      setIsSearching(false);
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
                Typesense è il motore di ricerca vettoriale che alimenta il sito. Puoi lanciare un Fast Sync (solo prezzi e promo) o una Sincronizzazione Massiva.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" onClick={handleFastSyncPromo} style={{ flex: 1, justifyContent: 'center', background: '#f39c12', borderColor: '#e67e22' }}>
                  Fast Sync Promozioni
                </Button>
                <Button variant="primary" onClick={handleSyncNow} style={{ flex: 1, justifyContent: 'center' }}>
                  Avvia Sync Massiva
                </Button>
              </div>
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

          <GlassPanel padding="lg" variant="light" className="typesense-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--color-text-main)' }}>Pianificazione Automatica</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schedulerJobs.map(job => (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-main)', fontSize: '14px' }}>
                    {job.id === 'sync-typesense' ? <Search size={16} /> : <Zap size={16} color="#f39c12" />}
                    {job.label}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="number" 
                      value={localValues[job.id]?.val ?? job.intervalValue}
                      onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], val: parseInt(e.target.value) || 1 }}))}
                      style={{ width: '50px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border-light)', outline: 'none', fontSize: '13px' }}
                    />
                    <select 
                      value={localValues[job.id]?.unit ?? job.intervalUnit}
                      onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], unit: e.target.value }}))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border-light)', outline: 'none', background: 'white', fontSize: '13px' }}
                    >
                      <option value="minutes">Minuti</option>
                      <option value="hours">Ore</option>
                      <option value="days">Giorni</option>
                    </select>

                    <input 
                      type="time" 
                      value={localValues[job.id]?.time ?? job.startTime ?? ''}
                      onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], time: e.target.value }}))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border-light)', outline: 'none', background: 'white', fontSize: '13px' }}
                      disabled={(localValues[job.id]?.unit ?? job.intervalUnit) !== 'days' && (localValues[job.id]?.unit ?? job.intervalUnit) !== 'hours'}
                    />

                    <button 
                      onClick={() => updateInterval(job.id, localValues[job.id]?.val ?? job.intervalValue, localValues[job.id]?.unit ?? job.intervalUnit, localValues[job.id]?.time ?? job.startTime)}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Salva impostazioni"
                    >
                      <Save size={16} />
                    </button>
                    
                    <button 
                      onClick={() => runNow(job.id)}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Esegui ORA"
                    >
                      <Play size={16} />
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--color-border-dark)', margin: '0 4px' }}></div>
                    
                    <Switch checked={job.enabled} onChange={(checked) => toggleJob(job.id, checked)} />
                  </div>
                </div>
              ))}
              
              {schedulerJobs.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Caricamento configurazioni di sincronizzazione in corso...
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel padding="lg" variant="light" className="typesense-card" style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--color-text-main)' }}>🧪 Test Ricerca Typesense (con priorità)</h3>
            
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca prodotto..." 
                style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--color-border-light)', borderRadius: '8px', background: 'white', color: 'var(--color-text-main)', fontSize: '14px', outline: 'none' }}
              />
              <Button variant="primary" type="submit" disabled={isSearching}>
                {isSearching ? 'Ricerca...' : 'Cerca'}
              </Button>
            </form>

            <div style={{ background: '#ffffff', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '16px', minHeight: '100px', maxHeight: '400px', overflowY: 'auto', fontSize: '13px' }}>
              {isSearching ? (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>Caricamento...</div>
              ) : searchResults?.empty ? (
                <div style={{ color: 'var(--color-text-muted)' }}>Inserisci un termine di ricerca.</div>
              ) : searchResults?.error ? (
                <div style={{ color: 'var(--color-danger)' }}>Errore durante la ricerca.</div>
              ) : searchResults?.hits?.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)' }}>Nessun risultato trovato.</div>
              ) : searchResults?.hits ? (
                <div>
                  <div style={{ marginBottom: '12px', color: 'var(--color-text-main)' }}>
                    <strong>Risultati: {searchResults.found}</strong> (tempo: {searchResults.search_time_ms}ms)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                        <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Prodotto</th>
                        <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>SKU</th>
                        <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Promo</th>
                        <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Stock</th>
                        <th style={{ padding: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.hits.map((hit: any, i: number) => {
                        const doc = hit.document;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>
                              <strong style={{ color: 'var(--color-text-main)' }}>{doc.title}</strong><br/>
                              <small style={{ color: 'var(--color-text-muted)' }}>{doc.brand || ''} - {doc.family || ''}</small>
                            </td>
                            <td style={{ padding: '8px', color: 'var(--color-text-main)' }}>{doc.sku}</td>
                            <td style={{ padding: '8px' }}>
                              {doc.is_in_promo ? (
                                <span style={{ background: doc.promo_badge_color || '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  {doc.promo_badge || doc.promo_type} 
                                  {doc.promo_discount ? ` (-${doc.promo_discount}%)` : ''}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--color-text-main)' }}>{doc.stock}</td>
                            <td style={{ padding: '8px', color: 'var(--color-text-main)' }}>{hit.text_match}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)' }}>I risultati appariranno qui...</div>
              )}
            </div>
          </GlassPanel>

        </div>
      </div>
    </>
  );
}
