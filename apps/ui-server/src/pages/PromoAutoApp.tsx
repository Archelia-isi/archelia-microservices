import { useState } from 'react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import TextInput from '../components/ui/TextInput';

type LaunchItem = {
  startH: number;
  startM: number;
  durH: number;
  durM: number;
};

export default function PromoAutoApp() {
  const [masterActive, setMasterActive] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'daily'|'flash'|'std'|'timeline'>('daily');

  const [dailySettings, setDailySettings] = useState({
    enabled: true, discount: '', months: '', count: '', targetActive: false
  });
  
  const [flashSettings, setFlashSettings] = useState({
    enabled: true, discount: '', targetActive: false
  });
  const [flashLaunches, setFlashLaunches] = useState<LaunchItem[]>(
    Array(4).fill({ startH: 10, startM: 0, durH: 1, durM: 0 })
  );
  
  const [stdSettings, setStdSettings] = useState({
    enabled: true, discount: '', months: '', targetActive: false
  });
  const [stdLaunches, setStdLaunches] = useState<LaunchItem[]>(
    Array(4).fill({ startH: 11, startM: 0, durH: 1, durM: 0 })
  );

  const [blacklist, setBlacklist] = useState('');
  const [sloganMode, setSloganMode] = useState('STATIC');
  const [staticSlogans, setStaticSlogans] = useState('');

  const handleFlashCountChange = (val: string) => {
    let count = parseInt(val, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 12) count = 12;
    setFlashLaunches(prev => {
      const arr = [...prev];
      while (arr.length > count) arr.pop();
      while (arr.length < count) {
        arr.push(arr.length > 0 ? { ...arr[arr.length - 1] } : { startH: 10, startM: 0, durH: 1, durM: 0 });
      }
      return arr;
    });
  };

  const handleStdCountChange = (val: string) => {
    let count = parseInt(val, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 12) count = 12;
    setStdLaunches(prev => {
      const arr = [...prev];
      while (arr.length > count) arr.pop();
      while (arr.length < count) {
        arr.push(arr.length > 0 ? { ...arr[arr.length - 1] } : { startH: 11, startM: 0, durH: 1, durM: 0 });
      }
      return arr;
    });
  };

  const renderLaunches = (launches: LaunchItem[], setter: React.Dispatch<React.SetStateAction<LaunchItem[]>>) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {launches.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-bg-elevated)', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', width: '50px', textAlign: 'center', flexShrink: 0 }}>
              Lancio<br/>{i + 1}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', width: '20px', textAlign: 'center' }}>🕒</span>
                <select 
                  className="input" 
                  value={l.startH} 
                  onChange={(e) => { const n = [...launches]; n[i].startH = parseInt(e.target.value); setter(n); }}
                  style={{ flex: 1, padding: '4px', fontSize: '12px', background: 'var(--color-bg)', borderColor: 'var(--color-border)', borderRadius: '4px' }}
                >
                  {Array.from({length: 24}).map((_, h) => <option key={h} value={h}>{h.toString().padStart(2,'0')}</option>)}
                </select>
                <span>:</span>
                <select 
                  className="input" 
                  value={l.startM} 
                  onChange={(e) => { const n = [...launches]; n[i].startM = parseInt(e.target.value); setter(n); }}
                  style={{ flex: 1, padding: '4px', fontSize: '12px', background: 'var(--color-bg)', borderColor: 'var(--color-border)', borderRadius: '4px' }}
                >
                  {Array.from({length: 12}).map((_, m) => <option key={m*5} value={m*5}>{(m*5).toString().padStart(2,'0')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', width: '20px', textAlign: 'center' }}>⏳</span>
                <select 
                  className="input" 
                  value={l.durH} 
                  onChange={(e) => { const n = [...launches]; n[i].durH = parseInt(e.target.value); setter(n); }}
                  style={{ flex: 1, padding: '4px', fontSize: '12px', background: 'var(--color-bg)', borderColor: 'var(--color-border)', borderRadius: '4px' }}
                >
                  {Array.from({length: 25}).map((_, h) => <option key={h} value={h}>{h}h</option>)}
                </select>
                <span>-</span>
                <select 
                  className="input" 
                  value={l.durM} 
                  onChange={(e) => { const n = [...launches]; n[i].durM = parseInt(e.target.value); setter(n); }}
                  style={{ flex: 1, padding: '4px', fontSize: '12px', background: 'var(--color-bg)', borderColor: 'var(--color-border)', borderRadius: '4px' }}
                >
                  {Array.from({length: 12}).map((_, m) => <option key={m*5} value={m*5}>{(m*5).toString().padStart(2,'0')}m</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      {/* --- PARTE SUPERIORE FISSA --- */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Interruttore Mastro */}
        <GlassPanel style={{ borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="text-h2" style={{ fontSize: '16px', margin: 0 }}>Motore AI Principale</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: masterActive ? '#10b981' : 'var(--color-text-muted)' }}>
              {masterActive ? 'ATTIVO' : 'DISATTIVO'}
            </span>
            <Switch checked={masterActive} onChange={setMasterActive} />
          </div>
        </GlassPanel>

        {/* Azioni Manuali */}
        <GlassPanel style={{ borderLeft: '4px solid #3b82f6', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', padding: '1rem' }}>
          <Button variant="secondary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 12px', fontSize: '13px' }}>
            ⚡ 1 Flash Deal ORA
          </Button>
          <Button variant="primary" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }}>
            🌙 Forza Elaborazione Notturna
          </Button>
          <Button variant="primary" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }}>
            🗑️ Svuota Promo
          </Button>
          <Button variant="secondary" style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 12px', fontSize: '13px' }}>
            👁️ Visualizza Attive
          </Button>
        </GlassPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Blacklist */}
        <GlassPanel>
          <h3 className="text-h2" style={{ fontSize: '16px', margin: 0, marginBottom: '0.5rem' }}>🚫 Blacklist Categorie</h3>
          <TextInput value={blacklist} onChange={e => setBlacklist(e.target.value)} placeholder="CV01, EL02..." />
        </GlassPanel>

        {/* Copywriting */}
        <GlassPanel>
          <h3 className="text-h2" style={{ fontSize: '16px', margin: 0, marginBottom: '1rem' }}>✍️ Generazione Slogan</h3>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name="sloganMode" value="STATIC" checked={sloganMode === 'STATIC'} onChange={() => setSloganMode('STATIC')} /> 
              <span style={{ fontSize: '14px', fontWeight: 500 }}>🔄 Frasi Standard a Rotazione</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name="sloganMode" value="AI" checked={sloganMode === 'AI'} onChange={() => setSloganMode('AI')} /> 
              <span style={{ fontSize: '14px', fontWeight: 500 }}>🧠 Generazione Dinamica Gemini</span>
            </label>
          </div>
          {sloganMode === 'STATIC' && (
            <textarea 
              value={staticSlogans}
              onChange={e => setStaticSlogans(e.target.value)}
              placeholder="Offerta Imperdibile!\nSolo per oggi..."
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', resize: 'vertical' }}
            />
          )}
        </GlassPanel>
      </div>

      {/* --- PARTE INFERIORE: SCHEDE (TABS) --- */}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('daily')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'daily' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'daily' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: activeTab === 'daily' ? 700 : 500, cursor: 'pointer', fontSize: '15px' }}
        >
          📦 Giornaliere
        </button>
        <button 
          onClick={() => setActiveTab('flash')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'flash' ? '2px solid #ef4444' : '2px solid transparent', color: activeTab === 'flash' ? '#ef4444' : 'var(--color-text-muted)', fontWeight: activeTab === 'flash' ? 700 : 500, cursor: 'pointer', fontSize: '15px' }}
        >
          🔥 Flash
        </button>
        <button 
          onClick={() => setActiveTab('std')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'std' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'std' ? '#3b82f6' : 'var(--color-text-muted)', fontWeight: activeTab === 'std' ? 700 : 500, cursor: 'pointer', fontSize: '15px' }}
        >
          ⏱️ Standard
        </button>
        <button 
          onClick={() => setActiveTab('timeline')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'timeline' ? '2px solid #10b981' : '2px solid transparent', color: activeTab === 'timeline' ? '#10b981' : 'var(--color-text-muted)', fontWeight: activeTab === 'timeline' ? 700 : 500, cursor: 'pointer', fontSize: '15px' }}
        >
          🗓️ Timeline Eventi
        </button>
      </div>

      <GlassPanel style={{ marginBottom: '1.5rem', borderTopLeftRadius: 0, minHeight: '300px' }}>
        
        {/* Modulo Daily */}
        {activeTab === 'daily' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Impostazioni Promozioni Giornaliere</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Stato:</span>
                <Switch checked={dailySettings.enabled} onChange={(v) => setDailySettings({...dailySettings, enabled: v})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <TextInput label="Sconto Fisso (%)" placeholder="es. 30" type="number" value={dailySettings.discount} onChange={e => setDailySettings({...dailySettings, discount: e.target.value})} />
              <TextInput label="Soglia Fermo (Mesi)" placeholder="es. 6" type="number" value={dailySettings.months} onChange={e => setDailySettings({...dailySettings, months: e.target.value})} />
              <TextInput label="Prodotti da Inserire (Qtà)" placeholder="es. 10" type="number" value={dailySettings.count} onChange={e => setDailySettings({...dailySettings, count: e.target.value})} />
            </div>

            <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#10b981', fontSize: '14px' }}>
                <input type="checkbox" checked={dailySettings.targetActive} onChange={e => setDailySettings({...dailySettings, targetActive: e.target.checked})} /> 
                🎯 Filtra per Categoria/Marca
              </label>
              {dailySettings.targetActive && (
                <div style={{ marginTop: '16px' }}>
                  <Button variant="secondary" style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }}>🔄 Aggiorna Opzioni</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modulo Flash */}
        {activeTab === 'flash' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Impostazioni Promozione Flash</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Stato:</span>
                <Switch checked={flashSettings.enabled} onChange={(v) => setFlashSettings({...flashSettings, enabled: v})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <TextInput label="Sconto Fisso (%)" placeholder="es. 40" type="number" value={flashSettings.discount} onChange={e => setFlashSettings({...flashSettings, discount: e.target.value})} />
              <TextInput label="Numero Lanci al Giorno (max 12)" value={flashLaunches.length.toString()} type="number" onChange={e => handleFlashCountChange(e.target.value)} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Impostazioni Orari Lanci</label>
              {renderLaunches(flashLaunches, setFlashLaunches)}
            </div>

            <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', border: '1px solid #ef4444', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#ef4444', fontSize: '14px' }}>
                <input type="checkbox" checked={flashSettings.targetActive} onChange={e => setFlashSettings({...flashSettings, targetActive: e.target.checked})} /> 
                🎯 Filtra per Categoria/Marca
              </label>
              {flashSettings.targetActive && (
                <div style={{ marginTop: '16px' }}>
                  <Button variant="secondary" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }}>🔄 Aggiorna Opzioni</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modulo Standard */}
        {activeTab === 'std' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Impostazioni Offerte a Tempo</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Stato:</span>
                <Switch checked={stdSettings.enabled} onChange={(v) => setStdSettings({...stdSettings, enabled: v})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <TextInput label="Sconto Fisso (%)" placeholder="es. 30" type="number" value={stdSettings.discount} onChange={e => setStdSettings({...stdSettings, discount: e.target.value})} />
              <TextInput label="Soglia Fermo (Mesi)" placeholder="es. 6" type="number" value={stdSettings.months} onChange={e => setStdSettings({...stdSettings, months: e.target.value})} />
              <TextInput label="Numero Lanci al Giorno (max 12)" value={stdLaunches.length.toString()} type="number" onChange={e => handleStdCountChange(e.target.value)} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Impostazioni Orari Lanci</label>
              {renderLaunches(stdLaunches, setStdLaunches)}
            </div>

            <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', border: '1px solid #3b82f6', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#3b82f6', fontSize: '14px' }}>
                <input type="checkbox" checked={stdSettings.targetActive} onChange={e => setStdSettings({...stdSettings, targetActive: e.target.checked})} /> 
                🎯 Filtra per Categoria/Marca
              </label>
              {stdSettings.targetActive && (
                <div style={{ marginTop: '16px' }}>
                  <Button variant="secondary" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }}>🔄 Aggiorna Opzioni</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modulo Timeline */}
        {activeTab === 'timeline' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#10b981', margin: 0, fontSize: '16px' }}>Eventi Pianificati nel Database</h3>
              <Button variant="secondary" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>🔄 Aggiorna</Button>
            </div>
            
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '10px 0', width: '100px' }}>Data</th>
                  <th style={{ padding: '10px 0', width: '80px' }}>Ora</th>
                  <th style={{ padding: '10px 0', width: '170px' }}>Azione</th>
                  <th style={{ padding: '10px 0' }}>Offerta Coinvolta</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--color-text)' }}>
                <tr>
                  <td colSpan={4} style={{ padding: '16px 0', textAlign: 'center' }}>Nessun evento schedulato al momento.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </GlassPanel>

    </div>
  );
}
