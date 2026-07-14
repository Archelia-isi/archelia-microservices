import { useState, useEffect } from 'react';
import GlassPanel from '../ui/GlassPanel';
import Loader from '../ui/Loader';
import './FlowBuilder.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

type Step = { id: string, delay: number, template: string };

function SequenceEditor({ 
  sequence, 
  onChange, 
  delayLabel 
}: { 
  sequence: Step[], 
  onChange: (s: Step[]) => void, 
  delayLabel: string 
}) {
  const addStep = () => {
    onChange([...sequence, { id: Math.random().toString(36).substring(7), delay: 1, template: '' }]);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
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
      {sequence.map((step, idx) => (
        <div key={step.id} className="sequence-step">
          <div className="input-group" style={{ flex: '0 0 100px' }}>
            <label>{delayLabel}</label>
            <input 
              type="number" 
              value={step.delay} 
              onChange={e => updateStep(idx, 'delay', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Template Email</label>
            <input 
              type="text" 
              value={step.template} 
              onChange={e => updateStep(idx, 'template', e.target.value)} 
              placeholder="Prompt o nome del template..."
            />
          </div>
          <button className="btn btn-icon delete-btn" onClick={() => removeStep(idx)}>
            ❌
          </button>
        </div>
      ))}
      <button className="btn btn-secondary add-step-btn" onClick={addStep}>
        + Aggiungi Step
      </button>
    </div>
  );
}

export default function FlowBuilder() {
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
        setConfig(json.data);
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

  if (loading) return <div className="flow-loader"><Loader size="md" /> Caricamento flussi...</div>;
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
            <p>Recupera i clienti che hanno lasciato prodotti nel carrello.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.cartEnabled} onChange={e => updateConfig('cartEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.cartEnabled && (
          <div className="flow-body">
            <SequenceEditor 
              sequence={Array.isArray(config.cartSequence) ? config.cartSequence : []} 
              onChange={seq => updateConfig('cartSequence', seq)} 
              delayLabel="Ritardo (Ore)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>🎯 WinBack Clienti Dormienti</h3>
            <p>Riconquista gli acquirenti che non fanno ordini da diverso tempo.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.winbackEnabled} onChange={e => updateConfig('winbackEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.winbackEnabled && (
          <div className="flow-body">
            <SequenceEditor 
              sequence={Array.isArray(config.winbackSequence) ? config.winbackSequence : []} 
              onChange={seq => updateConfig('winbackSequence', seq)} 
              delayLabel="Ritardo (Giorni)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>👁️ Browse Abandonment</h3>
            <p>Invia email a chi ha solo guardato uno o più prodotti ("Vetrina").</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.browseEnabled} onChange={e => updateConfig('browseEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.browseEnabled && (
          <div className="flow-body">
            <div className="input-group" style={{ marginBottom: '16px', maxWidth: '300px' }}>
              <label>Giorni di Cooldown:</label>
              <input 
                type="number" 
                value={config.browseCooldownDays} 
                onChange={e => updateConfig('browseCooldownDays', parseInt(e.target.value) || 10)} 
              />
            </div>
            <SequenceEditor 
              sequence={Array.isArray(config.browseSequence) ? config.browseSequence : []} 
              onChange={seq => updateConfig('browseSequence', seq)} 
              delayLabel="Ritardo (Ore)"
            />
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flow-card">
        <div className="flow-header">
          <div>
            <h3>♾️ Nurturing Perpetuo (Evergreen Loop)</h3>
            <p>Newsletter ciclica automatica per riscaldare gli utenti passivi.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.loopEnabled} onChange={e => updateConfig('loopEnabled', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        {config.loopEnabled && (
          <div className="flow-body flow-grid">
            <div className="input-group">
              <label>Ritardo Innesco (Giorni):</label>
              <input type="number" value={config.loopStartDays} onChange={e => updateConfig('loopStartDays', parseInt(e.target.value) || 30)} />
            </div>
            <div className="input-group">
              <label>Ritardo Ciclico (Giorni):</label>
              <input type="number" value={config.loopIntervalDays} onChange={e => updateConfig('loopIntervalDays', parseInt(e.target.value) || 20)} />
            </div>
            <div className="input-group">
              <label>Template Email:</label>
              <input type="text" value={config.loopTemplateId || ''} onChange={e => updateConfig('loopTemplateId', e.target.value)} placeholder="Template ID" />
            </div>
          </div>
        )}
      </GlassPanel>

    </div>
  );
}
