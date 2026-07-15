import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Database, RotateCcw } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Switch from '../components/ui/Switch';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TextInput from '../components/ui/TextInput';
import AppSplashScreen from '../components/os/AppSplashScreen';
import './InfinityApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function InfinityApp() {
  const [status, setStatus] = useState({ enabled: false, records: 0, lastSync: null, intervalValue: 30, intervalUnit: 'minutes' });
  const [logs, setLogs] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [totalData, setTotalData] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  
  const [isAppReady, setIsAppReady] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/status`);
      if (res.ok) {
        const d = await res.json();
        setStatus(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/logs?category=infinity_db&limit=50`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/data?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const d = await res.json();
        setData(d.data || []);
        setTotalData(d.total || 0);
        setTotalPages(d.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchLogs(), fetchData()]);
      setTimeout(() => setIsAppReady(true), 400);
    };
    init();

    const timer = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAppReady) {
      fetchData();
    }
  }, [page]);

  const handleToggle = async (checked: boolean) => {
    setStatus(prev => ({ ...prev, enabled: checked }));
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked })
      });
      if (res.ok) {
        toast.success(checked ? 'Sincronizzazione Automatica Attivata' : 'Sincronizzazione Automatica Disattivata');
        fetchStatus();
      } else {
        throw new Error('Errore nel toggle');
      }
    } catch (e) {
      toast.error('Errore nel salvataggio stato');
      setStatus(prev => ({ ...prev, enabled: !checked }));
    }
  };

  const updateInterval = async (intervalValue: number, intervalUnit: string) => {
    setStatus(prev => ({ ...prev, intervalValue, intervalUnit }));
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/update-interval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalValue, intervalUnit })
      });
      if (!res.ok) throw new Error();
      toast.success('Intervallo di sincronizzazione aggiornato');
      fetchStatus();
    } catch (e) {
      toast.error('Errore aggiornamento intervallo');
    }
  };

  const handleSyncNow = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/sync-now`, { method: 'POST' });
      if (res.ok) {
        toast.success('Sync accodato con successo!');
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
        appName="Infinity DB" 
        icon={<Database size={56} />} 
      />
      
      <div className={`infinity-app eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <div className="infinity-main-container">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <Database size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    Zucchetti DB Infinity (FDW)
                  </h2>
                  <Badge variant={status.enabled ? 'success' : 'danger'} size="sm">
                    {status.enabled ? 'Attivo' : 'Sospeso'}
                  </Badge>
                </div>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Ponte di esportazione dati per ERP Zucchetti
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', background: '#f5f5f7', padding: '12px 24px', borderRadius: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Totale Mappati</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1.2 }}>{status.records.toLocaleString()}</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'var(--color-border-dark)' }}></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Ultimo Sync</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.2, marginTop: '2px' }}>
                  {status.lastSync ? new Date(status.lastSync).toLocaleString('it-IT') : 'Mai'}
                </div>
              </div>
            </div>
          </div>

          <div className="infinity-content-grid">
            <GlassPanel padding="lg" variant="light" className="infinity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-main)' }}>Sincronizzazione Automatica</h3>
                <Switch checked={status.enabled} onChange={handleToggle} />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.5 }}>
                Quando attivo, il sistema allinea costantemente le mappe immagini e i dati verso il DB Foreign Wrapper utilizzato da Zucchetti.
              </p>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Esegui ogni:</span>
                <input 
                  type="number" 
                  value={status.intervalValue}
                  onChange={(e) => updateInterval(parseInt(e.target.value) || 1, status.intervalUnit)}
                  style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border-light)', outline: 'none' }}
                />
                <select 
                  value={status.intervalUnit}
                  onChange={(e) => updateInterval(status.intervalValue, e.target.value)}
                  style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border-light)', outline: 'none', background: 'white' }}
                >
                  <option value="minutes">Minuti</option>
                  <option value="hours">Ore</option>
                  <option value="days">Giorni</option>
                </select>
              </div>

              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={handleSyncNow} style={{ width: '100%', justifyContent: 'center' }}>
                Forza Sync Immediato
              </Button>
            </GlassPanel>

            <GlassPanel padding="none" variant="solid" className="infinity-logs-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Console Log (infinity_db)</h3>
              </div>
              <div className="infinity-terminal">
                {logs.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>Nessun log recente</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`log-line level-${log.level.toLowerCase()}`}>
                      <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString('it-IT', { hour12: false })}]</span>
                      <span className="log-msg">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel padding="lg" variant="light" className="infinity-table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-main)' }}>Dati Condivisi con Zucchetti</h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Questa è la vista reale in live di ciò che il Foreign Data Wrapper sta servendo in sola lettura all'ERP.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <TextInput 
                  placeholder="Cerca codice ARCODART..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())}
                  style={{ width: '250px' }}
                />
                <Button variant="secondary" onClick={() => { setPage(1); fetchData(); }}>Cerca</Button>
              </div>
            </div>

            <div className="infinity-table-responsive">
              <table className="infinity-table">
                <thead>
                  <tr>
                    <th>Codice Articolo (ARCODART)</th>
                    <th>URL Immagine (Cloudinary)</th>
                    <th>Timestamp Aggiornamento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>Nessun dato trovato</td>
                    </tr>
                  ) : (
                    data.map((row) => (
                      <tr key={row.arcodart}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{row.arcodart}</td>
                        <td>
                          {row.arfulres ? (
                            <a href={row.arfulres} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                              {row.arfulres.substring(0, 60)}...
                            </a>
                          ) : '-'}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>
                          {row.updatedAt ? new Date(row.updatedAt).toLocaleString('it-IT') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                <Button 
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => page > 1 && setPage(page - 1)}
                >
                  Precedente
                </Button>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>
                  Pagina {page} di {totalPages} ({totalData} record)
                </div>
                <Button 
                  variant="secondary"
                  disabled={page === totalPages}
                  onClick={() => page < totalPages && setPage(page + 1)}
                >
                  Successivo
                </Button>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </>
  );
}
