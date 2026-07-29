import { useState, useEffect } from 'react';
import { useWindowStore } from '../store/useWindowStore';
import { useWidgetStore } from '../store/useWidgetStore';
import { findNearestFreeSpot, getWidgetDimensions, getIconDimensions, type Rect } from '../utils/desktopCollision';
import { Image, LayoutGrid } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import AppSplashScreen from '../components/os/AppSplashScreen';

const WALLPAPERS = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744626753-dba7d41543f4?q=80&w=2940&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?q=80&w=2874&auto=format&fit=crop'
];

export default function PersonalizationApp() {
  const [activeTab, setActiveTab] = useState('wallpapers');
  const [isAppReady, setIsAppReady] = useState(false);
  
  const { windows, setWallpaper, wallpaper } = useWindowStore();
  const { addWidget, widgets } = useWidgetStore();

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const isWidgetAdded = (type: "clock" | "weather" | "kpi") => widgets.some(w => w.type === type);

  const handleAddWidget = (type: "clock" | "weather" | "kpi") => {
    if (!isWidgetAdded(type)) {
      const existingItems: Rect[] = [];
      Object.values(windows).forEach((win: any) => {
        if (!win.isPinned) {
          existingItems.push({
            id: win.id,
            x: win.desktopX ?? 30,
            y: win.desktopY ?? 30,
            ...getIconDimensions(),
            type: 'icon'
          });
        }
      });
      widgets.forEach((w: any) => {
        existingItems.push({
          id: w.id,
          x: w.x,
          y: w.y,
          ...getWidgetDimensions(w.type, w.size || 'small'),
          type: 'widget'
        });
      });

      const dim = getWidgetDimensions(type, 'small');
      const target = { x: window.innerWidth / 2 - dim.width / 2, y: window.innerHeight / 2 - dim.height / 2, width: dim.width, height: dim.height };
      
      const spot = findNearestFreeSpot(target, existingItems, window.innerWidth, window.innerHeight);
      
      addWidget(type, spot.x, spot.y);
    }
  };

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Personalizzazione" icon="/icons/settings.jpg" />
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <StickyHeader>
          <Tabs
            tabs={[
              { id: 'wallpapers', label: 'Sfondi Desktop' },
              { id: 'widgets', label: 'Widget & Gadget' }
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id.toString())}
          />
        </StickyHeader>
        
        <div style={{ padding: '2rem' }}>
          {activeTab === 'wallpapers' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Image size={24} /> Scegli lo Sfondo
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {WALLPAPERS.map((wp, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      height: '200px', 
                      borderRadius: 'var(--radius-lg)', 
                      backgroundImage: `url(${wp})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      border: wallpaper === wp ? '4px solid var(--color-primary)' : '2px solid transparent',
                      transition: 'transform 0.2s, border 0.2s',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onClick={() => setWallpaper(wp)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'widgets' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutGrid size={24} /> Aggiungi Widget
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {['clock', 'weather', 'kpi'].map(type => {
                  const label = type === 'clock' ? 'Orologio' : type === 'weather' ? 'Meteo' : 'Statistiche';
                  const added = isWidgetAdded(type as any);
                  return (
                    <div 
                      key={type}
                      style={{
                        padding: '2rem 1rem',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center',
                        cursor: added ? 'not-allowed' : 'pointer',
                        opacity: added ? 0.5 : 1,
                        border: '1px solid var(--color-border-glass)'
                      }}
                      onClick={() => handleAddWidget(type as any)}
                    >
                      <h3 style={{ margin: 0 }}>{label}</h3>
                      {added && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Già aggiunto</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
