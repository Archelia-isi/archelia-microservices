import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Play, Clock, Calendar, AlertCircle } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import ActionCard from '../components/ui/ActionCard';
import Badge from '../components/ui/Badge';
import Switch from '../components/ui/Switch';
import AppSplashScreen from '../components/os/AppSplashScreen';
import './Settings.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function Settings() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manual');
  const [isAppReady, setIsAppReady] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, { val: number, unit: string, time: string | null }>>({});

  const loadScheduler = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/scheduler`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJobs(data);
      const newLocalVals: any = {};
      data.forEach((j: any) => {
        newLocalVals[j.id] = { val: j.intervalValue, unit: j.intervalUnit, time: j.startTime };
      });
      setLocalValues(newLocalVals);
    } catch (err: any) {
      toast.error('Errore caricamento scheduler: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadScheduler();
      setTimeout(() => setIsAppReady(true), 400);
    };
    init();
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

  const manualJobs = jobs.filter(j => j.isManualOnly);
  const autoJobs = jobs.filter(j => !j.isManualOnly);

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Centro Sincronizzazione" 
        icon={<Clock size={56} />} 
      />

      <div className={`scheduler-app-container eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <StickyHeader>
          <Tabs 
            tabs={[
              { id: 'manual', label: 'Sincronizzazioni Manuali' },
              { id: 'auto', label: 'Scheduler Automatico' }
            ]}
            activeTab={activeTab}
            onChange={(val) => setActiveTab(val as string)}
          />
        </StickyHeader>

        <div className="scheduler-content" style={{ flex: 1, overflowY: 'auto', padding: '0 var(--spacing-2xl)' }}>
          {isLoading ? null : (
            <>
              {activeTab === 'manual' && (
                <div className="scheduler-manual-grid">
                  {manualJobs.map(job => (
                    <ActionCard 
                      key={job.id}
                      title={job.label}
                      description="Lancio manuale istantaneo della coda di sincronizzazione. Il task verrà accodato su BullMQ e processato dai worker."
                      action={
                        <button className="btn btn-primary" onClick={() => runNow(job.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
                          <Play size={16} /> Avvia Sync
                        </button>
                      }
                    />
                  ))}
                  {/* Per retrocompatibilità aggiungiamo i bottoni manuali per i job ibridi */}
                  {autoJobs.map(job => (
                    <ActionCard 
                      key={job.id}
                      title={job.label}
                      description="Forza l'esecuzione manuale immediata ignorando il timer cron impostato."
                      action={
                        <button className="btn btn-secondary" onClick={() => runNow(job.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                          <Play size={16} /> Forza Sync
                        </button>
                      }
                    />
                  ))}
                </div>
              )}

              {activeTab === 'auto' && (
                <div className="scheduler-auto-list">
                  {autoJobs.map(job => (
                    <GlassPanel key={job.id} padding="lg">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                        
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                            <Calendar size={24} />
                          </div>
                          <div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {job.label}
                              <Badge variant={job.enabled ? 'success' : 'danger'}>
                                {job.enabled ? 'Attivo' : 'Sospeso'}
                              </Badge>
                            </h3>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                              {job.cronExpression && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={14} /> Cron: <code style={{ background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>{job.cronExpression}</code>
                                </span>
                              )}
                              {job.nextRun && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                                  <Play size={14} /> Prossimo Run: {new Date(job.nextRun).toLocaleString('it-IT')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--color-surface)', padding: '12px 20px', borderRadius: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Esegui ogni:</span>
                            <input 
                              type="number" 
                              value={localValues[job.id]?.val ?? job.intervalValue}
                              onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], val: parseInt(e.target.value) || 1 }}))}
                              style={{ width: '60px', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border-light)', outline: 'none' }}
                            />
                            <select 
                              value={localValues[job.id]?.unit ?? job.intervalUnit}
                              onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], unit: e.target.value }}))}
                              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border-light)', outline: 'none', background: 'white' }}
                            >
                              <option value="minutes">Minuti</option>
                              <option value="hours">Ore</option>
                              <option value="days">Giorni</option>
                            </select>

                            <input 
                              type="time" 
                              value={localValues[job.id]?.time ?? job.startTime ?? ''}
                              onChange={(e) => setLocalValues(prev => ({...prev, [job.id]: { ...prev[job.id], time: e.target.value }}))}
                              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border-light)', outline: 'none', background: 'white' }}
                              disabled={(localValues[job.id]?.unit ?? job.intervalUnit) !== 'days' && (localValues[job.id]?.unit ?? job.intervalUnit) !== 'hours'}
                            />

                            <button 
                              onClick={() => updateInterval(job.id, localValues[job.id]?.val ?? job.intervalValue, localValues[job.id]?.unit ?? job.intervalUnit, localValues[job.id]?.time ?? job.startTime)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Salva impostazioni"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            </button>
                          </div>
                          
                          <div style={{ width: '1px', height: '30px', background: 'var(--color-border-dark)' }}></div>
                          
                          <Switch checked={job.enabled} onChange={(checked) => toggleJob(job.id, checked)} />
                        </div>

                      </div>
                    </GlassPanel>
                  ))}
                  
                  {autoJobs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
                      <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                      <p>Nessun job automatico configurato.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
