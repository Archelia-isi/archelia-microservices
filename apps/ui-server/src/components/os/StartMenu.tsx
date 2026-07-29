import { useState, useMemo } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { User, LogOut, Search, Sparkles, Clock, Activity } from 'lucide-react';
import TextInput from '../ui/TextInput';
import Badge from '../ui/Badge';
import './StartMenu.css';

interface StartMenuProps {
  onClose: () => void;
}

export default function StartMenu({ onClose }: StartMenuProps) {
  const { openWindow, windows } = useWindowStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenApp = (appId: string) => {
    openWindow(appId);
    onClose();
  };

  // Convert windows object to array and filter by search query
  const apps = useMemo(() => {
    const allApps = Object.values(windows);
    if (!searchQuery.trim()) return allApps;
    return allApps.filter(app => app.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [windows, searchQuery]);

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
              style={{
                background: 'var(--color-surface-solid)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => handleOpenApp('dashboard')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Activity size={16} color="var(--color-success)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Vendite Oggi</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>€ 1.250,00</div>
            </div>

            <div 
              style={{
                background: 'var(--color-surface-solid)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => handleOpenApp('os-settings')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={16} color="var(--color-warning)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Suggerimento</span>
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>È ora di controllare le scorte Zucchetti</div>
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
                    {typeof app.icon === 'string' ? <img src={app.icon} alt={app.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : app.icon}
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
  );
}
