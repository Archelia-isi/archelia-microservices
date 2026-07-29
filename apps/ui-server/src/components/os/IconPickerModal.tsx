import { useState } from 'react';
import { useWindowStore } from '../../store/useWindowStore';
import { X, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as FcIcons from 'react-icons/fc';
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

const ICON_CATEGORIES = [
  { id: 'all', label: 'Tutte', keywords: [] },
  { id: 'tech', label: 'Tech & Dati', keywords: ['server', 'database', 'terminal', 'code', 'laptop', 'cpu', 'hard', 'monitor', 'cloud', 'network', 'wifi', 'bluetooth', 'usb', 'data', 'web', 'link'] },
  { id: 'business', label: 'Business & Shop', keywords: ['shopping', 'cart', 'bag', 'credit', 'dollar', 'euro', 'briefcase', 'chart', 'trending', 'package', 'box', 'store', 'shop', 'calculator', 'tag', 'wallet', 'money', 'sale'] },
  { id: 'media', label: 'Media & File', keywords: ['image', 'video', 'camera', 'music', 'play', 'volume', 'mic', 'file', 'folder', 'document', 'pdf', 'audio', 'film', 'picture', 'gallery'] },
  { id: 'communication', label: 'Comunicazione', keywords: ['mail', 'message', 'phone', 'megaphone', 'send', 'inbox', 'chat', 'bell', 'notification', 'share', 'contact'] },
  { id: 'users', label: 'Utenti & Sicurezza', keywords: ['user', 'users', 'badge', 'id', 'lock', 'shield', 'key', 'security', 'unlock', 'password'] },
  { id: 'interface', label: 'Interfaccia', keywords: ['settings', 'cog', 'gear', 'home', 'search', 'menu', 'grid', 'list', 'check', 'x', 'plus', 'minus', 'arrow', 'chevron', 'close', 'edit', 'trash'] }
];

const STANDARD_ICONS = Object.keys(LucideIcons)
  .filter(key => key[0] === key[0].toUpperCase())
  .map(key => ({
    id: key,
    icon: (LucideIcons as any)[key]
  }))
  .filter(item => typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null && item.icon.$$typeof));

const COLORED_ICONS = Object.keys(FcIcons)
  .filter(key => key.startsWith('Fc'))
  .map(key => ({
    id: key,
    icon: (FcIcons as any)[key]
  }))
  .filter(item => typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null && item.icon.$$typeof));

export default function IconPickerModal({ appId, onClose }: Props) {
  const { changeAppIcon, windows } = useWindowStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  const app = windows[appId];
  if (!app) return null;

  const handlePremiumSelect = (styleId: string) => {
    changeAppIcon(appId, `/icons/${appId}_${styleId}.jpg`);
    saveIconPreference(appId, `/icons/${appId}_${styleId}.jpg`);
    onClose();
  };

  const handleStandardSelect = (iconId: string, type: 'lucide' | 'fc' = 'lucide') => {
    const prefix = type === 'fc' ? 'fc:' : 'lucide:';
    changeAppIcon(appId, `${prefix}${iconId}`);
    saveIconPreference(appId, `${prefix}${iconId}`);
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

  const filterByKeywords = (id: string, keywords: string[]) => {
    if (keywords.length === 0) return true;
    const lowerId = id.toLowerCase();
    return keywords.some(kw => lowerId.includes(kw));
  };

  const activeCategoryKeywords = ICON_CATEGORIES.find(c => c.id === activeCategory)?.keywords || [];

  const filteredStandard = STANDARD_ICONS.filter(item => {
    const matchesSearch = item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterByKeywords(item.id, activeCategoryKeywords);
    return matchesSearch && matchesCategory;
  });

  const filteredColored = COLORED_ICONS.filter(item => {
    const matchesSearch = item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterByKeywords(item.id, activeCategoryKeywords);
    return matchesSearch && matchesCategory;
  });

  // Rimozione limiti per poterle scorrere tutte
  const displayedStandard = filteredStandard;
  const displayedColored = filteredColored;

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
          <div className="icon-search-sticky">
             <div className="icon-search" style={{ width: '100%', maxWidth: '100%', padding: '0.75rem 1rem' }}>
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Cerca tra oltre 1500+ icone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', fontSize: '1rem' }}
                />
              </div>
              <div className="icon-categories-scroll">
                {ICON_CATEGORIES.map(category => (
                  <button 
                    key={category.id} 
                    className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
          </div>

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
              <h3>Libreria Colorata ({COLORED_ICONS.length} Icone)</h3>
            </div>
            <div className="standard-icons-grid">
              {displayedColored.map(item => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="standard-icon-card" onClick={() => handleStandardSelect(item.id, 'fc')} title={item.id}>
                    <IconComponent size={28} />
                  </div>
                );
              })}
              {filteredColored.length === 0 && <p style={{opacity: 0.5, gridColumn: '1 / -1', textAlign: 'center'}}>Nessuna icona trovata</p>}
            </div>
          </section>

          <section className="icon-picker-section">
            <div className="standard-header">
              <h3>Libreria Minimal ({STANDARD_ICONS.length}+ Icone)</h3>
            </div>
            <div className="standard-icons-grid">
              {displayedStandard.map(item => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="standard-icon-card" onClick={() => handleStandardSelect(item.id, 'lucide')} title={item.id}>
                    <IconComponent size={24} />
                  </div>
                );
              })}
              {filteredStandard.length === 0 && <p style={{opacity: 0.5, gridColumn: '1 / -1', textAlign: 'center'}}>Nessuna icona trovata</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
