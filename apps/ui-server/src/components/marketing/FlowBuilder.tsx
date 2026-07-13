import { useState, useEffect } from 'react';
import GlassPanel from '../ui/GlassPanel';
import Loader from '../ui/Loader';
import './FlowBuilder.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

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
            <p className="flow-info">Le email partiranno in automatico dopo 24 ore dall'abbandono.</p>
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
            <div className="input-group">
              <label>Giorni di Cooldown:</label>
              <input 
                type="number" 
                value={config.browseCooldownDays} 
                onChange={e => updateConfig('browseCooldownDays', parseInt(e.target.value) || 10)} 
              />
            </div>
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
          </div>
        )}
      </GlassPanel>

    </div>
  );
}
