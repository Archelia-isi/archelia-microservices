import { useEffect, useState } from 'react';
import { Edit3, CheckCircle, AlertTriangle, CloudUpload, Zap, Play, RotateCcw, Ban, Settings2 } from 'lucide-react';
import ReviewAccordion from '../components/equalizzatore/ReviewAccordion';
import AppSplashScreen from '../components/os/AppSplashScreen';
import Button from '../components/ui/Button';
import GlassPanel from '../components/ui/GlassPanel';
import StickyHeader from '../components/ui/StickyHeader';
import ProgressBar from '../components/ui/ProgressBar';
import Tabs from '../components/ui/Tabs';
import DropdownMenu from '../components/ui/DropdownMenu';
import './EqualizzatoreApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export interface StagingItem {
  id: string;
  sourceId: string;
  sku: string;
  displaySku?: string;
  pipelineStatus: string;
  reviewStatus: string;
  phase1Payload: any;
  phase2Payload: any;
  phase3Payload: any;
  approvedPayload: any;
  originalRawData: any;
  imageUrl: string | null;
  lockedBy?: string;
  lockedAt?: string;
}

export default function EqualizzatoreApp() {
  const [items, setItems] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [progress, setProgress] = useState({ isActive: false, progress: 0, total: 0, message: '' });
  
  const [taxonomy, setTaxonomy] = useState<{groups: any[], families: any[], categories: any[]}>({ groups: [], families: [], categories: [] });

  const fetchItems = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging?tab=${activeTab}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
      setTimeout(() => setIsAppReady(true), 300); // slight delay to ensure smooth transition
    }
  };

  const fetchTaxonomy = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/taxonomy`);
      const data = await res.json();
      if (data.success) setTaxonomy(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTaxonomy();
    // Fetch initial progress
    fetch(`${API_URL}/api/admin/equalizzatore/progress`)
      .then(r => r.json())
      .then(d => { if (d.success && d.data?.payload) setProgress(d.data.payload); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchItems(true);

    const sse = new EventSource(`${API_URL}/api/admin/equalizzatore/sse`);
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOCK_CHANGED') {
          fetchItems(false);
        } else if (data.type === 'PROGRESS_UPDATE' && data.payload) {
          setProgress(data.payload);
        }
      } catch (e) {}
    };

    const pollInterval = setInterval(() => {
      fetchItems(false);
    }, 5000);

    return () => {
      sse.close();
      clearInterval(pollInterval);
    };
  }, [activeTab]);

  const triggerBatch = async () => {
    if (!confirm("Avviare generazione massiva testi?")) return;
    try {
      await fetch(`${API_URL}/api/admin/equalizzatore/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_BATCH' })
      });
      alert('Batch avviato con successo!');
    } catch (e) {
      console.error(e);
    }
  };

  const startNomenclature = async () => {
    if (!confirm("Vuoi avviare la generazione Nomenclatura?")) return;
    try {
      await fetch(`${API_URL}/api/admin/equalizzatore/generate-nomenclature-batch`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const syncApproved = async () => {
    if (!confirm(`Sincronizzare massivamente ${items.length} prodotti?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/sync-approved`, { method: 'POST' });
      const json = await res.json();
      alert(json.message);
      fetchItems(true);
    } catch (e) {
      console.error(e);
    }
  };

  const resetProgress = async () => {
    await fetch(`${API_URL}/api/admin/equalizzatore/reset-progress`, { method: 'POST' });
    setProgress({ isActive: false, progress: 0, total: 0, message: '' });
  };

  const getTabStatus = (tabNum: number) => {
    if (tabNum === 1) return 'PENDING_TEXT';
    if (tabNum === 2) return 'PENDING_NOMENCLATURE';
    if (tabNum === 3) return 'PENDING_DUPLICATE_CHECK';
    if (tabNum === 4) return 'READY_FOR_SYNC';
    return '';
  };

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Equalizzatore" 
        icon={<Settings2 size={56} />} 
      />
      
      {/* Main App Container */}
      <div className={`equalizzatore-app eq-app-entry ${isAppReady ? 'ready' : ''}`}>
        <div className="eq-main-container">
        
        {/* Dynamic Header & Progress bar & Tabs merged */}
        <StickyHeader paddingY="sm" backgroundOpacity={0}>
          <div style={{ padding: '0 var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <GlassPanel padding="sm" radius="lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="eq-header-modern-left">
                <h2>Review Station Pipeline</h2>
                
                <ProgressBar 
                  progress={progress.progress} 
                  total={Math.max(progress.total, 1)} 
                  isActive={progress.isActive} 
                  message={progress.message || 'Nessun processo IA attivo'} 
                />
              </div>

              <div className="eq-header-modern-right">
                <DropdownMenu
                  label="Azioni Pipeline"
                  icon={<Settings2 size={16} />}
                  items={[
                    { id: 'batch', label: 'Avvia Generazione Massiva Testi', icon: <Zap size={14} />, variant: 'primary', disabled: progress.isActive, onClick: triggerBatch },
                    { id: 'nom', label: 'Genera Nomenclatura Globale', icon: <Play size={14} />, variant: 'primary', disabled: progress.isActive, onClick: startNomenclature },
                    { id: 'reset', label: 'Sblocca Barra / Riavvia Errori', icon: <RotateCcw size={14} />, variant: 'warning', dividerBefore: true, onClick: resetProgress },
                    { id: 'stop', label: 'Ferma Processi Correnti', icon: <Ban size={14} />, variant: 'danger', onClick: () => {} }
                  ]}
                />
              </div>
            </GlassPanel>

            <GlassPanel padding="sm" radius="lg" style={{ display: 'inline-block', width: 'max-content' }}>
              <Tabs 
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as number)}
                tabs={[
                  { id: 1, label: '1. Revisione Testi', icon: <Edit3 size={14}/> },
                  { id: 2, label: '2. Revisione Nomenclatura', icon: <CheckCircle size={14}/> },
                  { id: 3, label: '3. Risoluzione Codici', icon: <AlertTriangle size={14}/> },
                  { id: 4, label: `4. Da Sincronizzare (${activeTab === 4 ? items.length : '...'})`, icon: <CloudUpload size={14}/> },
                ]}
              />
            </GlassPanel>
          </div>
        </StickyHeader>

        {activeTab === 4 && items.length > 0 && (
          <GlassPanel padding="lg" radius="lg" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1d1d1f', fontSize: '24px', fontWeight: 700 }}>Prodotti pronti per la produzione</h3>
            <p style={{ margin: '0 0 24px 0', color: '#86868b', fontSize: '15px' }}>Questi prodotti hanno completato tutti gli step di approvazione.</p>
            <Button variant="success" size="lg" icon={<CloudUpload size={16} />} onClick={syncApproved}>
              Sincronizza Tutti ({items.length}) nel Database Neon
            </Button>
          </GlassPanel>
        )}

        <div className="eq-content">
          {loading ? (
            <div className="eq-loading"><RotateCcw className="spin" size={24}/> Caricamento...</div>
          ) : items.length === 0 ? (
            <div className="eq-empty">
              <CheckCircle size={48} className="empty-icon" />
              <p>Nessun prodotto in questa fase.</p>
            </div>
          ) : (
            <div className="eq-list">
              {items.map(item => (
                <ReviewAccordion 
                  key={item.id} 
                  item={item} 
                  onRefresh={() => fetchItems(false)} 
                  taxonomy={taxonomy}
                  currentTab={getTabStatus(activeTab)}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
