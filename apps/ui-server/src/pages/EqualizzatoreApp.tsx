import { useEffect, useState } from 'react';
import { CheckCircle, Zap, Ban, Play, Edit3, RotateCcw, Menu, Book, Users, LogOut, AlertTriangle, CloudUpload } from 'lucide-react';
import ReviewAccordion from '../components/equalizzatore/ReviewAccordion';
import './EqualizzatoreApp.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-gateway-production-2ec6.up.railway.app';
// Fallback local per test: 'http://localhost:3000'

export interface StagingItem {
  id: string;
  sourceId: string;
  sku: string;
  pipelineStatus: string;
  reviewStatus: string;
  phase1Payload: any;
  phase2Payload: any;
  phase3Payload: any;
  approvedPayload: any;
  originalRawData: any;
  imageUrl: string | null;
}

export default function EqualizzatoreApp() {
  const [items, setItems] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging?tab=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const triggerBatch = async () => {
    try {
      await fetch(`${API_URL}/api/admin/equalizzatore/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_BATCH' })
      });
      alert('Batch avviato con successo!');
    } catch (e) {
      console.error(e);
      alert('Errore innesco batch');
    }
  };

  return (
    <div className="equalizzatore-app">
      {/* Navbar in stile App Nativa / Vecchio Layout */}
      <div className="eq-top-navbar">
        <div className="eq-nav-left">
          <div className="eq-nav-item active"><Menu size={16}/> Review Station</div>
          <div className="eq-nav-item"><Book size={16}/> Dizionario Nomenclatura</div>
          <div className="eq-nav-item"><Users size={16}/> Gestione Utenti</div>
        </div>
        <div className="eq-nav-right">
          <span>Ciao, Salvatore</span>
          <LogOut size={16} className="eq-nav-icon" />
        </div>
      </div>

      <div className="eq-main-container">
        <div className="eq-header">
          <div className="eq-header-info">
            <h2>Review Station Pipeline</h2>
            <p>Controllo Qualità a 3 Step: Testi &rarr; Nomenclatura &rarr; Sincronizzazione</p>
          </div>
          <div className="eq-header-actions">
            <button className="eq-btn ghost" onClick={fetchItems}>
              Sblocca Barra
            </button>
            <button className="eq-btn warning">
              <RotateCcw size={14} /> Riavvia Errori
            </button>
            <button className="eq-btn secondary" onClick={triggerBatch}>
              <Zap size={14} /> Avvia Generazione Massiva Testi
            </button>
            <button className="eq-btn danger">
              <Ban size={14} /> Ferma
            </button>
            <button className="eq-btn accent">
              <Play size={14} /> Genera Nomenclatura Globale
            </button>
          </div>
        </div>

        <div className="eq-progress-area">
          <p>Nessun processo IA in background attivo</p>
          <div className="eq-progress-bar-bg">
            <div className="eq-progress-bar-fill" style={{width: '0%'}}></div>
          </div>
        </div>

        <div className="eq-tabs">
          <div className={`eq-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
            <Edit3 size={14}/> 1. Revisione Testi
          </div>
          <div className={`eq-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
            <CheckCircle size={14}/> 2. Revisione Nomenclatura
          </div>
          <div className={`eq-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
            <AlertTriangle size={14}/> 3. Risoluzione Codici
          </div>
          <div className={`eq-tab ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
            <CloudUpload size={14}/> 4. Da Sincronizzare (200)
          </div>
        </div>

        <div className="eq-content">
          {loading ? (
            <div className="eq-loading">Caricamento in corso...</div>
          ) : items.length === 0 ? (
            <div className="eq-empty">Nessun prodotto in revisione.</div>
          ) : (
            <div className="eq-list">
              {items.map(item => (
                <ReviewAccordion key={item.id} item={item} onRefresh={fetchItems} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
