import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Play, Calendar, Package } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import ActionCard from '../components/ui/ActionCard';
import Badge from '../components/ui/Badge';
import Switch from '../components/ui/Switch';
import AppSplashScreen from '../components/os/AppSplashScreen';
import { useStoreContext } from '../store/useStoreContext';
import './Settings.css'; // Riutilizziamo lo stile del Centro Sync

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function SuppliersApp() {
  const { currentStore } = useStoreContext();
  const [activeTab, setActiveTab] = useState('manual');
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock dei cron per Elmark (fino all'integrazione con lo Scheduler globale)
  const [cronJobs, setCronJobs] = useState([
    { id: 'elmark-full', label: 'Cron Importazione Completa', enabled: true, intervalValue: 1, intervalUnit: 'days', startTime: '02:00', nextRun: new Date().setHours(2,0,0,0) + 86400000, action: 'FULL_SYNC' },
    { id: 'elmark-stock', label: 'Cron Aggiornamento Stock/Prezzi', enabled: false, intervalValue: 12, intervalUnit: 'hours', startTime: '14:00', nextRun: new Date().setHours(14,0,0,0), action: 'STOCK_PRICES' }
  ]);

  const [localValues, setLocalValues] = useState<Record<string, { val: number, unit: string, time: string | null }>>({});

  useEffect(() => {
    const newLocalVals: any = {};
    cronJobs.forEach((j) => {
      newLocalVals[j.id] = { val: j.intervalValue, unit: j.intervalUnit, time: j.startTime };
    });
    setLocalValues(newLocalVals);
    
    // Simulate loading delay
    setTimeout(() => setIsAppReady(true), 500);
  }, []);

  const toggleJob = (id: string, enabled: boolean) => {
    setCronJobs(prev => prev.map(job => job.id === id ? { ...job, enabled } : job));
    toast.success(enabled ? 'Cron abilitato' : 'Cron disabilitato');
  };

  const updateInterval = (id: string, val: number, unit: string, time: string | null) => {
    setCronJobs(prev => prev.map(job => job.id === id ? { ...job, intervalValue: val, intervalUnit: unit, startTime: time || '00:00' } : job));
    toast.success('Intervallo aggiornato');
  };

  const triggerManualSync = async (action: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/suppliers/sync`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Store-Context': currentStore,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplier: 'ELMARK', action })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(data.message || 'Sincronizzazione avviata');
    } catch (err: any) {
      toast.error('Errore avvio sync: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Gestione Fornitori" 
        icon={<Package size={56} color="white" />} 
      />

      <div className={`scheduler-app-container eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <StickyHeader paddingY="sm" backgroundOpacity={0}>
          <div style={{ padding: '0 var(--spacing-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <GlassPanel padding="sm" radius="lg" style={{ display: 'inline-block' }}>
              <Tabs 
                tabs={[
                  { id: 'manual', label: 'Elmark (Manuale)' },
                  { id: 'auto', label: 'Gestione Cron (Auto)' }
                ]}
                activeTab={activeTab}
                onChange={(val) => setActiveTab(val as string)}
              />
            </GlassPanel>
          </div>
        </StickyHeader>

        <div className="scheduler-content" style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg) var(--spacing-2xl)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <img src="https://it.elmarkstore.eu/data/uploads/moxesImages/shop_logo_it_13.png" alt="Elmark Logo" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Integrazione Elmark</h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>Gestisci l'importazione XML del catalogo, stock e prezzi.</p>
            </div>
          </div>

          {activeTab === 'manual' && (
            <div className="scheduler-manual-grid">
              <ActionCard 
                title="Importazione Completa"
                description="Scarica l'intero catalogo Elmark via XML, aggiornando prodotti, categorie, e creando le varianti mancanti. Operazione pesante."
                action={
                  <button className="btn btn-primary" onClick={() => triggerManualSync('FULL_SYNC')} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Play size={16} /> Avvia Sync Totale
                  </button>
                }
              />
              <ActionCard 
                title="Aggiornamento Rapido Stock e Prezzi"
                description="Esegue una passata veloce solo per allineare le giacenze di magazzino e i listini prezzi correnti, senza ricreare prodotti."
                action={
                  <button className="btn btn-primary" onClick={() => triggerManualSync('STOCK_PRICES')} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--color-primary-dark)' }}>
                    <Play size={16} /> Sync Rapido
                  </button>
                }
              />
            </div>
          )}

          {activeTab === 'auto' && (
            <div className="scheduler-auto-list">
              {cronJobs.map(job => (
                <GlassPanel key={job.id} padding="lg" style={{ marginBottom: '16px' }}>
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                            <Play size={14} /> Prossimo Run: {new Date(job.nextRun).toLocaleString('it-IT')}
                          </span>
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
                          <option value="seconds">Secondi</option>
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
