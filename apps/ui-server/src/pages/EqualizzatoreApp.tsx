import React, { useEffect, useState } from 'react';
import { RefreshCcw, CheckCircle, Zap, Ban, Play, Edit3 } from 'lucide-react';
import ReviewAccordion from '../components/equalizzatore/ReviewAccordion';
import './EqualizzatoreApp.css';

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

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/admin/equalizzatore/staging');
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
  }, []);

  const triggerBatch = async () => {
    try {
      await fetch('http://localhost:3000/api/admin/equalizzatore/trigger', {
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
      <div className="eq-header">
        <div className="eq-header-info">
          <h2>Review Station Pipeline</h2>
          <p>Controllo Qualità a 3 Step: Testi &rarr; Nomenclatura &rarr; Sincronizzazione</p>
        </div>
        <div className="eq-header-actions">
          <button className="eq-btn secondary" onClick={fetchItems}>
            <RefreshCcw size={16} /> Ricarica
          </button>
          <button className="eq-btn primary" onClick={triggerBatch}>
            <Zap size={16} /> Avvia Generazione Massiva
          </button>
          <button className="eq-btn danger">
            <Ban size={16} /> Ferma
          </button>
          <button className="eq-btn accent">
            <Play size={16} /> Genera Nomenclatura Globale
          </button>
        </div>
      </div>

      <div className="eq-content">
        <div className="eq-tabs">
          <div className="eq-tab active"><Edit3 size={16}/> 1. Revisione Testi</div>
          <div className="eq-tab"><CheckCircle size={16}/> 2. Revisione Nomenclatura</div>
        </div>

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
  );
}
