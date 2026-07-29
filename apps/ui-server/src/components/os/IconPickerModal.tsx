import { useState } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { X, Search } from 'lucide-react';
import './IconPickerModal.css';

interface Props {
  appId: string;
  onClose: () => void;
}

const PREMIUM_STYLES = [
  { id: 'macos', name: 'MacOS 3D' },
  { id: 'minimalist', name: 'Vettoriale Minimal' },
  { id: 'glassmorphism', name: 'Vetro Satinato' },
  { id: 'neon', name: 'Cyber Neon' },
  { id: 'abstract', name: 'Astratto Geometrico' }
];

import * as LucideIcons from 'lucide-react';

const STANDARD_ICONS = Object.keys(LucideIcons)
  .filter(key => key[0] === key[0].toUpperCase() && key !== 'createLucideIcon' && key !== 'LucideProps' && key !== 'IconNode')
  .map(key => ({
    id: key,
    icon: (LucideIcons as any)[key]
  }));

export default function IconPickerModal({ appId, onClose }: Props) {
  const { changeAppIcon, windows } = useWindowStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const app = windows[appId];
  if (!app) return null;

  const handlePremiumSelect = (styleId: string) => {
    changeAppIcon(appId, `/icons/${appId}_${styleId}.jpg`);
    saveIconPreference(appId, `/icons/${appId}_${styleId}.jpg`);
    onClose();
  };

  const handleStandardSelect = (iconId: string) => {
    changeAppIcon(appId, `lucide:${iconId}`);
    saveIconPreference(appId, `lucide:${iconId}`);
    onClose();
  };

  const saveIconPreference = async (appId: string, iconPath: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://api-gateway-production-2ec6.up.railway.app';
      
      const res = await fetch(`${API_URL}/api/admin/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        let config = data.widgetConfig || {};
        
        if (!config.desktopIcons) config.desktopIcons = {};
        if (!config.desktopIcons[appId]) config.desktopIcons[appId] = {};
        
        config.desktopIcons[appId].iconPath = iconPath;
        
        await fetch(`${API_URL}/api/admin/preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ widgetConfig: config })
        });
      }
    } catch (e) {
      console.error('Failed to save icon preference', e);
    }
  };

  const filteredStandard = STANDARD_ICONS.filter(item => item.id.toLowerCase().includes(searchTerm.toLowerCase()));
  const displayedStandard = searchTerm.length > 1 ? filteredStandard : filteredStandard.slice(0, 100);

  return (
    <div className="icon-picker-overlay" onClick={onClose}>
      <div className="icon-picker-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="icon-picker-header">
          <h2>Modifica Icona: {app.title}</h2>
          <button className="icon-picker-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="icon-picker-content">
          <section className="icon-picker-section">
            <h3>Archelia Premium 3D AI</h3>
            <p className="icon-picker-desc">Icone esclusive ad altissima risoluzione generate appositamente per questa applicazione.</p>
            <div className="premium-icons-grid">
              {PREMIUM_STYLES.map(style => (
                <div key={style.id} className="premium-icon-card" onClick={() => handlePremiumSelect(style.id)}>
                  <div className="premium-icon-preview">
                    <img src={`/icons/${appId}_${style.id}.jpg`} alt={style.name} onError={(e) => { e.currentTarget.src = '/icons/dashboard.jpg' }} />
                  </div>
                  <span className="premium-icon-name">{style.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="icon-picker-section">
            <div className="standard-header">
              <h3>Libreria Standard ({STANDARD_ICONS.length}+ Icone)</h3>
              <div className="icon-search">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Cerca icone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="standard-icons-grid">
              {displayedStandard.map(item => (
                <div key={item.id} className="standard-icon-card" onClick={() => handleStandardSelect(item.id)} title={item.id}>
                  <item.icon size={24} />
                </div>
              ))}
              {filteredStandard.length === 0 && <p style={{opacity: 0.5, gridColumn: '1 / -1', textAlign: 'center'}}>Nessuna icona trovata</p>}
              {searchTerm.length <= 1 && filteredStandard.length > 100 && (
                <p style={{opacity: 0.5, gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.8rem', marginTop: '1rem'}}>
                  Mostrando 100 di {filteredStandard.length} icone. Usa la ricerca per vederne altre.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
