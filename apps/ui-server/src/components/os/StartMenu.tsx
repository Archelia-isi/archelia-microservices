import { useState, useMemo, useEffect } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { User, LogOut, Search, Sparkles, Clock, Activity, Download, Settings, LayoutDashboard, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import TextInput from '../ui/TextInput';
import Badge from '../ui/Badge';
import ContextMenu from '../ui/ContextMenu';
import { getThemeIconPath } from '../../utils/themeUtils';
import { useStoreContext } from '../../store/useStoreContext';
import './StartMenu.css';

import { useSettingsStore } from '../../store/useSettingsStore';
import * as FcIcons from 'react-icons/fc';

const DynamicFcIcon = ({ name, size = 40 }: { name: string, size?: number }) => {
  const IconComponent = (FcIcons as any)[name];
  return IconComponent ? <IconComponent size={size} /> : null;
};

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

interface StartMenuProps {
  onClose: () => void;
}

export default function StartMenu({ onClose }: StartMenuProps) {
  const { openWindow, windows, togglePinApp, toggleDesktopApp, setEditingIconAppId, toggleWidgetManager } = useWindowStore();
  const { theme } = useSettingsStore();
  const { currentStore } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [insightIndex, setInsightIndex] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'x-store-context': currentStore
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (e) {
        console.error('Failed to fetch stats for StartMenu', e);
      }
    };
    fetchStats();
  }, []);

  const insights = useMemo(() => {
    if (!stats) return [
      { title: 'Caricamento...', value: '...', icon: <Activity size={16} color="var(--color-text-muted)" />, text: 'Recupero dati...', appId: 'dashboard' },
      { title: 'Attendere', value: '...', icon: <Clock size={16} color="var(--color-text-muted)" />, text: 'Connessione al server...', appId: 'dashboard' }
    ];

    const formatCurrency = (val: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);

    const list = [
      { 
        title: 'Vendite Oggi', 
        value: formatCurrency(stats.revenueToday), 
        icon: <Activity size={16} color="var(--color-success)" />,
        text: `${stats.ordersToday} ordini ricevuti oggi`,
        appId: 'orders'
      }
    ];

    if (stats.withoutImages > 0) {
      list.push({
        title: 'Attenzione Catalogo',
        value: `${stats.withoutImages} Prod.`,
        icon: <Clock size={16} color="var(--color-warning)" />,
        text: 'Prodotti senza immagini',
        appId: 'products'
      });
    }

    if (stats.withoutStock > 0) {
      list.push({
        title: 'Scorte Zucchetti',
        value: `${stats.withoutStock} Esauriti`,
        icon: <Clock size={16} color="var(--color-danger)" />,
        text: 'Articoli da riassortire',
        appId: 'dashboard'
      });
    }

    list.push({
      title: 'Clienti Totali',
      value: `${stats.customers}`,
      icon: <User size={16} color="var(--color-primary)" />,
      text: 'Clienti sincronizzati',
      appId: 'customers'
    });

    list.push({
      title: 'Fatturato Totale',
      value: formatCurrency(stats.revenueTotal),
      icon: <Activity size={16} color="var(--color-success)" />,
      text: `${stats.ordersTotal} ordini totali`,
      appId: 'analytics'
    });

    return list;
  }, [stats]);

  useEffect(() => {
    if (insights.length <= 2) return;
    const interval = setInterval(() => {
      setInsightIndex(prev => (prev + 1) % insights.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [insights.length]);

  const activeInsight1 = insights[insightIndex];
  const activeInsight2 = insights[(insightIndex + 1) % insights.length];

  const handleOpenApp = (appId: string) => {
    openWindow(appId);
    onClose();
  };

  // Convert windows object to array and filter by search query, removing os-settings
  const apps = useMemo(() => {
    let allApps = Object.values(windows).filter(app => {
      if (app.id === 'os-settings') return false;
      if (app.id === 'roblox_game' && theme !== 'roblox') return false;
      if (currentStore === 'B2B' && ['equalizzatore', 'marketing', 'promo-manual', 'promo-auto', 'email-builder'].includes(app.id)) return false;
      return true;
    });
    if (!searchQuery.trim()) return allApps;
    return allApps.filter(app => app.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [windows, searchQuery, theme, currentStore]);

  const isElectron = !!(window as any).__IS_ELECTRON__;
  const isMac = navigator.userAgent.toLowerCase().includes('mac');
  
  const handleDownloadApp = async () => {
    const osParam = isMac ? 'mac' : 'win';
    const url = `${API_URL}/api/admin/desktop/download/${osParam}`;
    
    const loadingToast = toast.loading('Ricerca aggiornamenti in corso...');
    try {
      const res = await fetch(url);
      toast.dismiss(loadingToast);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'App non ancora disponibile per il download.');
        return;
      }
      
      // Se il file esiste, apriamo il link che forzerà il download
      window.open(url, '_blank');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Impossibile contattare il server.');
    }
  };

  return (
    <div className="start-menu-overlay" onClick={onClose}>
      <div className="start-menu" onClick={e => e.stopPropagation()}>
        
        {/* Header - Search */}
        <div className="start-menu-header" style={{ borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <TextInput 
            placeholder="Cerca un'app o chiedi all'AI..."
            fullWidth
            leftIcon={<Search size={18} color="var(--color-text-muted)" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="start-menu-content" style={{ display: 'flex', gap: '2rem' }}>
          
          {/* Colonna Sinistra: Glance & Smart */}
          <div className="start-menu-sidebar" style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Sparkles size={16} color="var(--color-primary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Sguardo Rapido</span>
            </div>



            <div 
              key={activeInsight1.title}
              className="insight-card fade-in"
              style={{
                background: 'var(--color-surface-solid)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-sm)',
                animation: 'fadeIn 0.5s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => handleOpenApp(activeInsight1.appId)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {activeInsight1.icon}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{activeInsight1.title}</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeInsight1.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{activeInsight1.text}</div>
            </div>

            <div 
              key={activeInsight2.title}
              className="insight-card fade-in"
              style={{
                background: 'var(--color-surface-solid)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-sm)',
                animation: 'fadeIn 0.5s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => handleOpenApp(activeInsight2.appId)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {activeInsight2.icon}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{activeInsight2.title}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeInsight2.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{activeInsight2.text}</div>
            </div>
          </div>

          {/* Colonna Destra: Griglia App */}
          <div className="start-menu-apps-area" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Tutte le Applicazioni</h3>
              <Badge color="primary">{apps.length} App</Badge>
            </div>

            <div className="start-menu-apps-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: '1.5rem',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '1rem'
            }}>
              {apps.map(app => (
                <div 
                  key={app.id} 
                  className="start-menu-app-item"
                  onClick={() => handleOpenApp(app.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id });
                  }}
                >
                  <div className="start-menu-app-icon" style={{
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-surface-solid)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '25%',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden'
                  }}>
                    {/* Render raw React Node or string image */}
                    {(() => {
                      const themeIconPath = getThemeIconPath(app.id, theme);
                      const finalIconPath = themeIconPath || app.iconPath;
                      if (finalIconPath) {
                        if (finalIconPath.startsWith('fc:')) {
                           return <DynamicFcIcon name={finalIconPath.split(':')[1]} size={64} />;
                        }
                        return <img src={finalIconPath} alt={app.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                      }
                      return typeof app.icon === 'string' ? <img src={app.icon} alt={app.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : app.icon;
                    })()}
                  </div>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 500, 
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.2
                  }}>
                    {app.title}
                  </span>
                </div>
              ))}
              
              {apps.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Nessuna app trovata per "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - User Profile */}
        <div className="start-menu-footer" style={{ 
          marginTop: '2rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid var(--color-border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="start-menu-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="start-menu-avatar flex-center" style={{ 
              width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white' 
            }}>
              <User size={20} />
            </div>
            <div className="start-menu-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="start-menu-name" style={{ fontWeight: 600 }}>Admin</span>
              <span className="start-menu-role" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Amministratore</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="start-menu-widgets-btn" 
              title="Gestione Widgets" 
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => { toggleWidgetManager(); onClose(); }}
            >
              <LayoutDashboard size={20} />
            </button>
            <button 
              className="start-menu-settings-btn" 
              title="Impostazioni di Sistema" 
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => handleOpenApp('os-settings')}
            >
              <Settings size={20} />
            </button>
            <button 
              className="start-menu-settings" 
              title="Cambia Azienda" 
              style={{ 
                background: currentStore === 'B2B' ? 'var(--color-primary)' : 'transparent',
                border: 'none', 
                color: currentStore === 'B2B' ? '#fff' : 'var(--color-primary)', 
                cursor: 'pointer', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => { if (currentStore !== 'B2B') e.currentTarget.style.backgroundColor = 'var(--color-surface)' }}
              onMouseLeave={(e) => { if (currentStore !== 'B2B') e.currentTarget.style.backgroundColor = 'transparent' }}
              onClick={() => {
                const newStore = currentStore === 'RETAIL' ? 'B2B' : 'RETAIL';
                setStore(newStore);
              }}
            >
              <Store size={20} />
              {currentStore === 'B2B' ? 'Passa a RETAIL' : 'Passa a B2B'}
            </button>
            {!isElectron && (
              <button 
                className="start-menu-download" 
                title={`Scarica App per ${isMac ? 'Mac' : 'Windows'}`} 
                style={{ 
                  background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={handleDownloadApp}
              >
                <Download size={20} />
              </button>
            )}
            <button className="start-menu-logout" title="Logout" style={{ 
              background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {contextMenu && windows[contextMenu.appId] && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              id: 'open',
              label: 'Apri',
              onClick: () => {
                handleOpenApp(contextMenu.appId);
                setContextMenu(null);
              }
            },
            {
              id: 'desktop',
              label: windows[contextMenu.appId].desktopX !== undefined ? 'Rimuovi dal Desktop' : 'Aggiungi al Desktop',
              onClick: () => {
                toggleDesktopApp(contextMenu.appId);
                setContextMenu(null);
              }
            },
            {
              id: 'pin',
              label: windows[contextMenu.appId].isPinned ? 'Rimuovi dalla taskbar' : 'Fissa sulla taskbar',
              dividerBefore: true,
              onClick: () => {
                togglePinApp(contextMenu.appId);
                setContextMenu(null);
              }
            },
            {
              id: 'change-icon',
              label: 'Modifica Icona',
              dividerBefore: true,
              onClick: () => {
                setEditingIconAppId(contextMenu.appId);
                setContextMenu(null);
                onClose(); // Close Start Menu when picking an icon
              }
            }
          ]}
        />
      )}
    </div>
  );
}
