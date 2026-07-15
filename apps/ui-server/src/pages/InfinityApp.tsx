import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import './InfinityApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function InfinityApp() {
  const [status, setStatus] = useState({ enabled: false, records: 0, lastSync: null });
  const [logs, setLogs] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [totalData, setTotalData] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchLogs(), fetchData()]);
      setIsLoading(false);
    };
    init();

    const timer = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setStatus(prev => ({ ...prev, enabled }));
    try {
      const res = await fetch(`${API_URL}/api/admin/infinity/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        toast.success(enabled ? 'Sincronizzazione Automatica Attivata' : 'Sincronizzazione Automatica Disattivata');
        fetchStatus();
      } else {
        throw new Error('Errore nel toggle');
      }
    } catch (e) {
      toast.error('Errore nel salvataggio stato');
      setStatus(prev => ({ ...prev, enabled: !enabled }));
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

  if (isLoading) {
    return (
      <div className="infinity-app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loader-apple"></div>
      </div>
    );
  }

  return (
    <div className="infinity-app-container">
      <div className="infinity-header glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 className="infinity-title">Zucchetti DB Infinity (FDW)</h1>
            <p className="infinity-subtitle">Ponte di esportazione dati per ERP Zucchetti</p>
          </div>
          <span className={`badge ${status.enabled ? 'badge-success' : 'badge-danger'}`}>
            {status.enabled ? 'Attivo (Auto)' : 'Sospeso'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="infinity-stat">
            <span className="infinity-stat-label">Totale Record Mappati</span>
            <span className="infinity-stat-value">{status.records.toLocaleString()}</span>
          </div>
          <div className="infinity-stat">
            <span className="infinity-stat-label">Ultimo Sync</span>
            <span className="infinity-stat-value" style={{ fontSize: '16px' }}>
              {status.lastSync ? new Date(status.lastSync).toLocaleString('it-IT') : 'Mai'}
            </span>
          </div>
        </div>
      </div>

      <div className="infinity-controls-row">
        <div className="infinity-control-card glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Sincronizzazione Automatica</h3>
            <label className="ios-switch">
              <input type="checkbox" checked={status.enabled} onChange={handleToggle} />
              <span className="ios-slider"></span>
            </label>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Quando attivo, il sistema allinea costantemente le mappe immagini e i dati verso il DB Foreign Wrapper utilizzato da Zucchetti.
          </p>
          <button className="btn btn-primary" onClick={handleSyncNow} style={{ width: '100%', justifyContent: 'center' }}>
            Forza Sync Immediato
          </button>
        </div>

        <div className="infinity-logs-card glass-panel">
          <h3 style={{ marginBottom: '12px' }}>Console Log (infinity_db)</h3>
          <div className="infinity-terminal">
            {logs.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>Nessun log recente</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`log-line level-${log.level.toLowerCase()}`}>
                  <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="infinity-data-section glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3>Dati Condivisi con Zucchetti</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Questa è la vista reale in live di ciò che il Foreign Data Wrapper sta servendo in sola lettura all'ERP.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Cerca codice ARCODART..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())}
              style={{ width: '250px' }}
            />
            <button className="btn btn-secondary" onClick={() => { setPage(1); fetchData(); }}>Cerca</button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
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
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nessun dato trovato</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.arcodart}>
                    <td style={{ fontWeight: 600 }}>{row.arcodart}</td>
                    <td>
                      {row.arfulres ? (
                        <a href={row.arfulres} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {row.arfulres.substring(0, 50)}...
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString('it-IT') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button 
              className={`btn btn-secondary ${page === 1 ? 'disabled' : ''}`} 
              onClick={() => page > 1 && setPage(page - 1)}
            >Precedente</button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              Pagina {page} di {totalPages} ({totalData} record)
            </div>
            <button 
              className={`btn btn-secondary ${page === totalPages ? 'disabled' : ''}`} 
              onClick={() => page < totalPages && setPage(page + 1)}
            >Successivo</button>
          </div>
        )}
      </div>
    </div>
  );
}
