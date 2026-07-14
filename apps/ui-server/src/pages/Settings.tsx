import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Play, Power } from 'lucide-react';
import Button from '../components/ui/Button';

interface SchedulerJob {
  id: string;
  label: string;
  enabled: boolean;
  intervalValue: number;
  intervalUnit: string;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function Settings() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    'Content-Type': 'application/json'
  });

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      } else {
        console.error("API returned non-array data:", data);
        setJobs([]);
      }
    } catch (e) {
      console.error("Failed to fetch scheduler jobs", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await fetch(`${API_URL}/api/v1/admin/scheduler/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, enabled: !currentEnabled })
      });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateInterval = async (id: string, value: number, unit: string) => {
    try {
      await fetch(`${API_URL}/api/v1/admin/scheduler/update-interval`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, intervalValue: value, intervalUnit: unit })
      });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/v1/admin/scheduler/run-now`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      alert(`Job ${id} avviato in background.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Centro Sincronizzazione</h2>
        <SettingsIcon size={24} color="var(--color-text-muted)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-h2" style={{ marginBottom: '1rem' }}>Sync Control Center</h3>
          
          {loading ? (
            <p>Caricamento...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {jobs.map(job => (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: job.enabled ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
                      {job.label}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Esegue automaticamente ogni {job.intervalValue} {job.intervalUnit}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={job.intervalValue} 
                      onChange={(e) => handleUpdateInterval(job.id, parseInt(e.target.value) || 1, job.intervalUnit)}
                      style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
                    />
                    <select 
                      value={job.intervalUnit} 
                      onChange={(e) => handleUpdateInterval(job.id, job.intervalValue, e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                    >
                      <option value="minutes">Minuti</option>
                      <option value="hours">Ore</option>
                      <option value="days">Giorni</option>
                    </select>

                    <Button 
                      variant={job.enabled ? "secondary" : "primary"} 
                      onClick={() => handleToggle(job.id, job.enabled)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '110px', justifyContent: 'center' }}
                    >
                      <Power size={16} />
                      {job.enabled ? 'Disattiva' : 'Attiva'}
                    </Button>
                    
                    <Button 
                      variant="primary" 
                      onClick={() => handleRunNow(job.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Play size={16} />
                      Run Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
