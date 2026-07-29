import { useState, useEffect } from 'react';
import { useWindowStore } from '../store/useWindowStore';
import { Palette, AppWindow, Bell, Shield, Info, Monitor, Moon, Sun, MonitorPlay, Zap, Layout } from 'lucide-react';
import AppSplashScreen from '../components/os/AppSplashScreen';
import Switch from '../components/ui/Switch';
import Select from '../components/ui/Select';
import './OSSettingsApp.css';

export default function OSSettingsApp() {
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [isAppReady, setIsAppReady] = useState(false);
  const { setWallpaper, wallpaper } = useWindowStore();

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const categories = [
    { id: 'appearance', icon: <Palette size={18} />, label: 'Aspetto e Temi' },
    { id: 'taskbar', icon: <Layout size={18} />, label: 'Dock & Taskbar' },
    { id: 'windows', icon: <AppWindow size={18} />, label: 'Gestione Finestre' },
    { id: 'audio', icon: <Bell size={18} />, label: 'Audio e Notifiche' },
    { id: 'security', icon: <Shield size={18} />, label: 'Account e Sicurezza' },
    { id: 'about', icon: <Info size={18} />, label: 'Informazioni Sistema' }
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return (
          <div className="os-settings-section fade-in">
            <h2>Aspetto e Temi</h2>
            
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Tema di Sistema</h3>
                  <p>Scegli tra modalità chiara, scura o automatica.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="os-theme-btn active"><Sun size={18}/> Chiaro</button>
                  <button className="os-theme-btn"><Moon size={18}/> Scuro</button>
                  <button className="os-theme-btn"><Monitor size={18}/> Auto</button>
                </div>
              </div>
            </div>

            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Colore Accento</h3>
                  <p>Personalizza il colore principale di Archelia OS.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="os-color-circle active" style={{ background: '#0066cc' }}></div>
                  <div className="os-color-circle" style={{ background: '#32B351' }}></div>
                  <div className="os-color-circle" style={{ background: '#A154F2' }}></div>
                  <div className="os-color-circle" style={{ background: '#FF3B30' }}></div>
                  <div className="os-color-circle" style={{ background: '#FF9500' }}></div>
                </div>
              </div>
            </div>

            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Intensità Glassmorphism</h3>
                  <p>Regola la sfocatura (blur) dell'effetto vetro.</p>
                </div>
                <input type="range" min="10" max="60" defaultValue="40" className="os-slider" />
              </div>
            </div>
            
            <div className="os-settings-card">
              <h3>Sfondo Desktop</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Scegli un nuovo sfondo per la scrivania.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {[
                  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1506744626753-dba7d41543f4?q=80&w=2940&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?q=80&w=2874&auto=format&fit=crop'
                ].map((wp, i) => (
                  <div 
                    key={i} 
                    className={`os-wallpaper-preview ${wallpaper === wp ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${wp})` }}
                    onClick={() => setWallpaper(wp)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 'taskbar':
        return (
          <div className="os-settings-section fade-in">
            <h2>Dock & Taskbar</h2>
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Posizione sullo Schermo</h3>
                  <p>Dove ancorare la barra delle applicazioni.</p>
                </div>
                <Select 
                  value="bottom"
                  onChange={() => {}}
                  options={[
                    { value: 'bottom', label: 'In Basso' },
                    { value: 'top', label: 'In Alto' },
                    { value: 'left', label: 'A Sinistra' },
                    { value: 'right', label: 'A Destra' }
                  ]}
                />
              </div>
            </div>
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Nascondi Automaticamente</h3>
                  <p>La taskbar scompare quando non viene utilizzata.</p>
                </div>
                <Switch checked={false} onChange={() => {}} />
              </div>
            </div>
          </div>
        );
      case 'windows':
        return (
          <div className="os-settings-section fade-in">
            <h2>Gestione Finestre e Multitasking</h2>
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Effetti di Animazione</h3>
                  <p>Abilita il rimbalzo elastico all'apertura delle app.</p>
                </div>
                <Switch checked={true} onChange={() => {}} />
              </div>
            </div>
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Focus Mode (Focus Assist)</h3>
                  <p>Sfoca lo sfondo quando una finestra è al centro.</p>
                </div>
                <Switch checked={false} onChange={() => {}} />
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="os-settings-section fade-in">
            <h2>Account e Sicurezza</h2>
            <div className="os-settings-card">
              <div className="os-settings-row">
                <div>
                  <h3>Blocco Automatico</h3>
                  <p>Richiedi la password dopo un periodo di inattività.</p>
                </div>
                <Select 
                  value="15"
                  onChange={() => {}}
                  options={[
                    { value: '0', label: 'Mai' },
                    { value: '5', label: '5 minuti' },
                    { value: '15', label: '15 minuti' },
                    { value: '30', label: '30 minuti' }
                  ]}
                />
              </div>
            </div>
            <div className="os-settings-card">
              <h3>Modifica Password</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Cambia la password di accesso ad Archelia OS.</p>
              <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', maxWidth: '300px' }}>
                <input type="password" placeholder="Vecchia Password" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                <input type="password" placeholder="Nuova Password" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                <button style={{ padding: '0.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Aggiorna Password</button>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="os-settings-section fade-in">
            <h2>Informazioni Sistema</h2>
            <div className="os-settings-card" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, var(--color-primary), #00C6FF)', borderRadius: '25%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '3rem', fontWeight: 800 }}>A</div>
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Archelia OS</h1>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Versione 2.4.0 (Enterprise Edition)</p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                  <button className="os-theme-btn"><MonitorPlay size={16} /> Controlla Aggiornamenti</button>
                  <button className="os-theme-btn"><Zap size={16} /> Status Server</button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="os-settings-section fade-in">
            <h2>{categories.find(c => c.id === activeCategory)?.label}</h2>
            <div className="os-settings-card">
              <p>Work in progress...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Impostazioni di Sistema" icon="/icons/settings.jpg" />
      <div className="os-settings-container">
        {/* Sidebar */}
        <div className="os-settings-sidebar">
          <div className="os-settings-sidebar-header">
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Impostazioni</h3>
          </div>
          <div className="os-settings-sidebar-nav">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className={`os-settings-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="os-settings-content-area">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
