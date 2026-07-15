import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import './SchedulerApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function SchedulerApp() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadScheduler = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      toast.error('Errore caricamento scheduler: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduler();
  }, []);

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
      loadScheduler();
    } catch (err: any) {
      toast.error('Errore modifica stato: ' + err.message);
    }
  };

  const updateInterval = async (id: string, intervalValue: number, intervalUnit: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler/update-interval`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, intervalValue, intervalUnit })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Intervallo aggiornato');
      loadScheduler();
    } catch (err: any) {
      toast.error('Errore aggiornamento intervallo: ' + err.message);
    }
  };

  const runNow = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/scheduler/run-now`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      const res = await response.json();
      if (res.success) {
        toast.success(res.message || 'Avviato con successo');
      } else {
        toast.error(res.message || 'Impossibile avviare il job');
      }
    } catch (err: any) {
      toast.error('Errore avvio job: ' + err.message);
    }
  };

  return (
    <div className="scheduler-app-container">
      <div className="scheduler-header">
        <div>
          <h1 className="scheduler-title">Gestione Job Asincroni</h1>
          <p className="scheduler-subtitle">Gestione Job Asincroni, BullMQ e code di Sincronizzazione</p>
        </div>
      </div>

      <div className="scheduler-content" style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="loader-apple"></div>
          </div>
        ) : (
          <div className="scheduler-list">
            {jobs.map(job => (
              <div key={job.id} className="scheduler-item">
                <div className="scheduler-info">
                  <div className="scheduler-icon">
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <div>
                    <div className="scheduler-name">{job.label}</div>
                    <span className={`scheduler-status ${job.status}`}>
                      {job.enabled ? 'Attivo' : 'Sospeso'}
                    </span>
                  </div>
                </div>

                <div className="scheduler-actions">
                  <div className="scheduler-interval">
                    <input 
                      type="number" 
                      className="input" 
                      defaultValue={job.intervalValue} 
                      onBlur={(e) => updateInterval(job.id, parseInt(e.target.value, 10), job.intervalUnit)}
                    />
                    <select 
                      className="input" 
                      defaultValue={job.intervalUnit}
                      onChange={(e) => updateInterval(job.id, job.intervalValue, e.target.value)}
                    >
                      <option value="minutes">Minuti</option>
                      <option value="hours">Ore</option>
                      <option value="days">Giorni</option>
                    </select>
                  </div>

                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={job.enabled} 
                      onChange={(e) => toggleJob(job.id, e.target.checked)} 
                    />
                    <span className="slider"></span>
                  </label>

                  <button className="btn btn-secondary" onClick={() => runNow(job.id)}>
                    <i className="fa-solid fa-play"></i> Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
