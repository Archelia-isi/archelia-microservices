import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Play, Save, StopCircle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import GlassPanel from '../components/ui/GlassPanel';
import StickyHeader from '../components/ui/StickyHeader';
import AppSplashScreen from '../components/os/AppSplashScreen';

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
  const [isAppReady, setIsAppReady] = useState(false);

  // Manteniamo lo stato locale degli input prima del salvataggio
  const [localValues, setLocalValues] = useState<Record<string, { val: number, unit: string }>>({});

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    'Content-Type': 'application/json'
  });

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
        const newLocalVals: any = {};
        data.forEach(j => {
          newLocalVals[j.id] = { val: j.intervalValue, unit: j.intervalUnit };
        });
        setLocalValues(newLocalVals);
      } else {
        setJobs([]);
      }
    } catch (e) {
      console.error("Failed to fetch scheduler jobs", e);
      setJobs([]);
    } finally {
      setLoading(false);
      setTimeout(() => setIsAppReady(true), 300);
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

  const handleSaveInterval = async (id: string) => {
    const vals = localValues[id];
    if (!vals) return;
    try {
      await fetch(`${API_URL}/api/v1/admin/scheduler/update-interval`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, intervalValue: vals.val, intervalUnit: vals.unit })
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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Centro Sincronizzazione" 
        icon={<SettingsIcon size={56} />} 
      />

      <div className={`eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <div className="eq-main-container">
          
          <StickyHeader paddingY="md">
            <GlassPanel padding="sm" radius="lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="eq-header-modern-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={24} style={{ color: '#1d1d1f' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Scheduler Automatico</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#86868b' }}>Flusso: Zucchetti → Middleware DB → Shopify. Configura intervalli e abilita i job.</p>
                </div>
              </div>
              <div className="eq-header-modern-right">
                <Button variant="danger" icon={<StopCircle size={16} />}>
                  Kill All
                </Button>
              </div>
            </GlassPanel>
          </StickyHeader>

          <div className="eq-content" style={{ padding: '0 2rem 2rem 2rem' }}>
            <GlassPanel padding="none" radius="lg">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#86868b' }}>Caricamento...</div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#86868b' }}>Nessun job trovato.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {jobs.map((job, idx) => (
                    <div 
                      key={job.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1.25rem 1.5rem', 
                        borderBottom: idx < jobs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {/* Left: Title */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>
                          {job.label}
                        </span>
                      </div>
                      
                      {/* Right: Controls */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          value={localValues[job.id]?.val || job.intervalValue} 
                          onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], val: parseInt(e.target.value) || 1 }}))}
                          style={{ 
                            width: '60px', 
                            padding: '0.4rem', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            background: '#f5f5f7', 
                            color: '#1d1d1f',
                            textAlign: 'center',
                            fontSize: '14px'
                          }}
                        />
                        <select 
                          value={localValues[job.id]?.unit || job.intervalUnit} 
                          onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], unit: e.target.value }}))}
                          style={{ 
                            padding: '0.4rem', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            background: '#f5f5f7', 
                            color: '#1d1d1f',
                            fontSize: '14px'
                          }}
                        >
                          <option value="minutes">Minuti</option>
                          <option value="hours">Ore</option>
                          <option value="days">Giorni</option>
                        </select>

                        <div style={{ 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '8px', 
                          background: '#f5f5f7', 
                          color: '#86868b',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          -- : -- <Clock size={12} />
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                          <button 
                            onClick={() => handleSaveInterval(job.id)}
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#e8e8ed', color: '#4f4f5c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            title="Salva Intervallo"
                          >
                            <Save size={16} />
                          </button>
                          
                          <button 
                            onClick={() => handleRunNow(job.id)}
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#e8e8ed', color: '#4f4f5c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            title="Esegui Subito"
                          >
                            <Play size={16} />
                          </button>
                        </div>

                        <div style={{ marginLeft: '12px' }}>
                          <Switch 
                            checked={job.enabled} 
                            onChange={(val) => handleToggle(job.id, !val)} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
}
