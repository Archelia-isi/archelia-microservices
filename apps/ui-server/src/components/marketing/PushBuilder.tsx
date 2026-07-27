import { useState, useEffect } from 'react';
import { Trash2, Bot } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';
import Loader from '../ui/Loader';
import Button from '../ui/Button';
import TextInput from '../ui/TextInput';
import './FlowBuilder.css'; // Possiamo riutilizzare gli stili dei layout del FlowBuilder

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

type PushStep = { id: string, delay: number };

function PushSequenceEditor({ 
  sequence, 
  onChange, 
  delayLabel,
}: { 
  sequence: PushStep[], 
  onChange: (s: PushStep[]) => void, 
  delayLabel: string
}) {
  const addStep = () => {
    onChange([...sequence, { id: Math.random().toString(36).substring(7), delay: 1 }]);
  };

  const updateStep = (index: number, field: keyof PushStep, value: any) => {
    const newSeq = [...sequence];
    newSeq[index] = { ...newSeq[index], [field]: value };
    onChange(newSeq);
  };

  const removeStep = (index: number) => {
    const newSeq = [...sequence];
    newSeq.splice(index, 1);
    onChange(newSeq);
  };

  return (
    <div className="sequence-editor">
      <div style={{ padding: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bot size={16} style={{ color: 'var(--color-primary)' }} />
        <span>I testi delle notifiche web vengono scritti automaticamente caso per caso dall'Intelligenza Artificiale (Gemini) ottimizzati per le conversioni!</span>
      </div>
      
      {sequence.map((step, idx) => (
        <div key={step.id} className="sequence-step">
          <div className="input-group" style={{ flex: '0 0 160px' }}>
            <TextInput 
              label={delayLabel}
              type="number" 
              value={step.delay} 
              onChange={e => updateStep(idx, 'delay', parseInt(e.target.value) || 0)} 
            />
          </div>
          <Button variant="danger" onClick={() => removeStep(idx)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <div style={{ marginTop: '12px' }}>
        <Button variant="modern" onClick={addStep}>
          + Aggiungi Notifica
        </Button>
      </div>
    </div>
  );
}

export default function PushBuilder() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/marketing/config`);
      const json = await res.json();
      if (json.success && json.data) {
        // Normalizza i sequence field nel caso arrivino nulli o stringati
        const normalized = { ...json.data };
        if (typeof normalized.pushCartSequence === 'string') normalized.pushCartSequence = JSON.parse(normalized.pushCartSequence);
        if (typeof normalized.pushBrowseSequence === 'string') normalized.pushBrowseSequence = JSON.parse(normalized.pushBrowseSequence);
        if (typeof normalized.pushWinbackSequence === 'string') normalized.pushWinbackSequence = JSON.parse(normalized.pushWinbackSequence);
        setConfig(normalized);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setSaving(true);
    
    try {
      await fetch(`${API_URL}/api/v1/admin/marketing/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) {
      console.error('Failed to save config', e);
    } finally {
      setTimeout(() => setSaving(false), 500); // UI feedback
    }
  };

  if (loading) return <div className="flow-loader"><Loader size="md" /> Caricamento flussi push...</div>;
  if (!config) return <div className="flow-loader">Errore caricamento configurazione.</div>;

  return (
    <div className="flow-builder">
      <div className="save-status">
        {saving ? <span className="saving-text">⏳ Salvataggio in corso...</span> : <span className="saved-text">✅ Sincronizzato col Database</span>}
      </div>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>🛒 Carrelli Abbandonati</h3>
            <p>Invia una notifica web allo smartphone o al PC per ricordare il carrello.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.pushCartEnabled} onChange={e => updateConfig('pushCartEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.pushCartEnabled && (
          <div className="flow-body">
            <PushSequenceEditor 
              sequence={Array.isArray(config.pushCartSequence) ? config.pushCartSequence : []} 
              onChange={seq => updateConfig('pushCartSequence', seq)} 
              delayLabel="Ritardo Innesco (Ore)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>🎯 WinBack Clienti Dormienti</h3>
            <p>Riattiva vecchi clienti tramite push notification.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.pushWinbackEnabled} onChange={e => updateConfig('pushWinbackEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.pushWinbackEnabled && (
          <div className="flow-body">
            <PushSequenceEditor 
              sequence={Array.isArray(config.pushWinbackSequence) ? config.pushWinbackSequence : []} 
              onChange={seq => updateConfig('pushWinbackSequence', seq)} 
              delayLabel="Ritardo Innesco (Giorni)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>👁️ Browse Abandonment</h3>
            <p>Notifica push immediata quando il cliente visualizza un prodotto e poi esce.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.pushBrowseEnabled} onChange={e => updateConfig('pushBrowseEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.pushBrowseEnabled && (
          <div className="flow-body">
            <PushSequenceEditor 
              sequence={Array.isArray(config.pushBrowseSequence) ? config.pushBrowseSequence : []} 
              onChange={seq => updateConfig('pushBrowseSequence', seq)} 
              delayLabel="Ritardo Innesco (Ore)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>🔥 Promozioni e Sconti (Auto Broadcast)</h3>
            <p>Invia un broadcast a tutti gli utenti iscritti quando l'AI Brain attiva una promozione Flash o Daily.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.pushPromoEnabled} onChange={e => updateConfig('pushPromoEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </GlassPanel>

    </div>
  );
}
