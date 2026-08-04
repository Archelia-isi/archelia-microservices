import React, { useState, useEffect } from 'react';
import { getThemeWallpaper, getThemeIconPath } from '../../utils/themeUtils';
import { useWindowStore } from '../../store/useWindowStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { toast, Toaster } from 'react-hot-toast';
import { getIconDimensions, getWidgetDimensions, pixelsToCell, getGridBounds, findNearestFreeCell, getMagneticSnap, CELL_WIDTH, CELL_HEIGHT, type Rect } from '../../utils/desktopCollision';
import WindowComponent from './WindowComponent';
import WidgetContainer from './WidgetContainer';
import Taskbar from './Taskbar';
import ContextMenu from '../ui/ContextMenu';
import IconPickerModal from './IconPickerModal';
import WidgetManagerModal from './WidgetManagerModal';
import Dashboard from '../../pages/Dashboard';
import Orders from '../../pages/Orders';
import Products from '../../pages/Products';
import EqualizzatoreApp from '../../pages/EqualizzatoreApp';
import { MarketingApp } from '../../pages/MarketingApp';
import Settings from '../../pages/Settings';
import { EmailBuilderApp } from '../../pages/EmailBuilderApp';
import PromoManualApp from '../../pages/PromoManualApp';
import PromoAutoApp from '../../pages/PromoAutoApp';
import AiChatbotApp from '../ai/AiChatbotApp';
import LoginScreen from './LoginScreen';
import MouseTrail from './MouseTrail';
import RobloxMinigame from './RobloxMinigame';
import './DesktopOS.css';

import InfinityApp from '../../pages/InfinityApp';
import TypesenseApp from '../../pages/TypesenseApp';
import ImagesApp from '../../pages/ImagesApp';
import AnalyticsApp from '../../pages/AnalyticsApp';
import LogsApp from '../../pages/LogsApp';
import CalendarApp from '../../pages/CalendarApp';
import NotesApp from '../../pages/NotesApp';
import OSSettingsApp from '../../pages/OSSettingsApp';
import UsersApp from '../../pages/UsersApp';
import * as FcIcons from 'react-icons/fc';
import { Terminal } from 'lucide-react';

const DynamicFcIcon = ({ name, size = 40 }: { name: string, size?: number }) => {
  const IconComponent = (FcIcons as any)[name];
  if (!IconComponent) return <FcIcons.FcFolder size={size} />;
  return <IconComponent size={size} />;
};

import { useSettingsStore } from '../../store/useSettingsStore';
import { useStoreContext } from '../../store/useStoreContext';
import { canViewApp } from '../../utils/permissions';

export default function DesktopOS() {
  const { 
    windows, openWindow, togglePinApp, activeWindowId,
    wallpaper, isChatbotOpen, editingIconAppId, setEditingIconAppId, toggleDesktopApp,
    registerApp, updateDesktopPosition, setWallpaper, changeAppIcon, isWidgetManagerOpen, toggleWidgetManager
  } = useWindowStore();
  const { widgets } = useWidgetStore();
  const settings = useSettingsStore();
  const { currentStore } = useStoreContext();
  const { desktopSnapEnabled, desktopSnapRadius, desktopMargin } = settings;

  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [isReady, setIsReady] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

  const [showIntro, setShowIntro] = useState(false);
  const [showSwitchIntro, setShowSwitchIntro] = useState(false);
  const [prevStore, setPrevStore] = useState(currentStore);

  useEffect(() => {
    if (currentStore !== prevStore) {
      useWindowStore.getState().closeAllWindows();
      setShowSwitchIntro(true);
      setPrevStore(currentStore);
    }
  }, [currentStore, prevStore]);

  const activeTheme = settings.theme;
  const currentWallpaper = getThemeWallpaper(activeTheme, wallpaper);
  useEffect(() => {
    const root = document.documentElement;
    const settings = useSettingsStore.getState();
    // Accent Color (Reset Inline Overrides)
    root.style.setProperty('--color-primary', settings.accentColor);
    
    // Glass Intensity
    root.style.setProperty('--glass-app-blur', `blur(${settings.glassIntensity}px)`);
    
    // Animations
    if (!settings.animationsEnabled) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }

    // Rimuovi tutti i temi precedenti
    document.body.className = document.body.className.replace(/\b(dark-theme|theme-\w+)\b/g, '').trim();

    // Theme (Light/Dark mode + Sarcastic themes)
    const customThemes = ['retro', 'panic', 'zen', 'matrix', 'kawaii', 'cartoon', 'neon', 'roblox'];
    if (customThemes.includes(settings.theme)) {
      document.body.classList.add(`theme-${settings.theme}`);
      // Alcuni temi sarcastici forzano la modalità scura per l'UI di base
      if (['matrix', 'neon', 'panic'].includes(settings.theme)) {
        document.body.classList.add('dark-theme');
      }
    } else {
      const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.body.classList.add('dark-theme');
      }
    }
    
    // Override Multi-Tenant Theme Izzo
    if (currentStore === 'B2B') {
      document.body.classList.add('theme-izzo');
    } else {
      document.body.classList.remove('theme-izzo');
    }
  }, [settings.theme, settings.accentColor, settings.glassIntensity, settings.animationsEnabled, currentStore]);

  useEffect(() => {
    if (isLoggedIn) {
      loadPreferences();
    }
  }, [isLoggedIn]);

  const loadPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsReady(true);
        return;
      }
      
      const res = await fetch(`${API_URL}/api/admin/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.osSettings) {
          useSettingsStore.getState().hydrate(data.osSettings);
        }
        if (data.widgetConfig) {
          const config = data.widgetConfig;
          if (config.wallpaper) setWallpaper(config.wallpaper.startsWith('/') ? '.' + config.wallpaper : config.wallpaper);
          
          // Restore desktop positions and pinned state
          if (config.desktopIcons) {
            Object.entries(config.desktopIcons).forEach(([appId, pos]: [string, any]) => {
              if (pos.x !== undefined && pos.y !== undefined) {
                updateDesktopPosition(appId, pos.x, pos.y, 'RETAIL');
              } else {
                updateDesktopPosition(appId, undefined, undefined, 'RETAIL');
              }
              if (pos.xB2B !== undefined && pos.yB2B !== undefined) {
                updateDesktopPosition(appId, pos.xB2B, pos.yB2B, 'B2B');
              } else {
                updateDesktopPosition(appId, undefined, undefined, 'B2B');
              }
              if (pos.isPinned && useWindowStore.getState().windows[appId] && !useWindowStore.getState().windows[appId].isPinned) {
                togglePinApp(appId);
              } else if (!pos.isPinned && useWindowStore.getState().windows[appId]?.isPinned) {
                togglePinApp(appId); // unpin if it was pinned
              }
              if (pos.iconPath && useWindowStore.getState().windows[appId]) {
                changeAppIcon(appId, pos.iconPath.startsWith('/') ? '.' + pos.iconPath : pos.iconPath);
              }
            });
          }

          // Restore widgets
          if (config.widgets && Array.isArray(config.widgets)) {
             useWidgetStore.setState({ widgets: config.widgets });
          }
        }
      } else {
        // Se il token è invalido o scaduto, eseguiamo il logout
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoggedIn(false);
        }
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
    } finally {
      setIsReady(true);
    }
  };

  // Sincronizza su Redis le impostazioni OS quando cambiano (debounce di 1 secondo)
  const syncTimeoutRef = React.useRef<any>(null);
  useEffect(() => {
    if (!isLoggedIn || !isReady) return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        await fetch(`${API_URL}/api/admin/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            osSettings: useSettingsStore.getState()
          })
        });
      } catch (err) {
        console.error('Failed to sync osSettings', err);
      }
    }, 1000);
    
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [useSettingsStore.getState(), isLoggedIn, isReady]);

  const savePreferences = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const desktopIcons: Record<string, { x?: number, y?: number, xB2B?: number, yB2B?: number, isPinned: boolean, iconPath?: string }> = {};
    Object.values(windows).forEach(win => {
      desktopIcons[win.id] = {
        ...(win.desktopX !== undefined && { x: win.desktopX }),
        ...(win.desktopY !== undefined && { y: win.desktopY }),
        ...(win.desktopX_B2B !== undefined && { xB2B: win.desktopX_B2B }),
        ...(win.desktopY_B2B !== undefined && { yB2B: win.desktopY_B2B }),
        isPinned: win.isPinned,
        ...(win.iconPath && { iconPath: win.iconPath })
      };
    });

    const configToSave = {
      wallpaper,
      desktopIcons,
      widgets: useWidgetStore.getState().widgets
    };

    try {
      const res = await fetch(`${API_URL}/api/admin/preferences`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ widgetConfig: configToSave })
      });
      
      if (!res.ok) {
        toast.error(`Errore salvataggio: ${res.status}`);
      } else {
        console.log('Salvataggio effettuato con successo');
      }
    } catch (err: any) {
      toast.error(`Errore di rete salvataggio: ${err.message}`);
      console.error('Failed to save preferences', err);
    }
  };

  // React-based auto-save mechanism
  useEffect(() => {
    if (!isLoggedIn || !isReady) return;

    const saveTimeout = setTimeout(() => {
      savePreferences();
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [windows, wallpaper, widgets, isReady, isLoggedIn]);

  // Auto-Lock Inactivity Timer
  useEffect(() => {
    const settings = useSettingsStore.getState();
    if (!isLoggedIn || settings.autoLockMinutes === 0) return;

    let inactivityTimer: ReturnType<typeof setTimeout>;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Log out user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
      }, settings.autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn, useSettingsStore.getState().autoLockMinutes]);

  const handleDragStartDesktopIcon = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('appId', id);
    e.dataTransfer.setData('source', 'desktop');
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
    e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
    
    // Nascondi l'icona originale subito dopo che il browser ha catturato il ghost
    setTimeout(() => setDraggingAppId(id), 0);
  };

  const handleDragEndDesktopIcon = () => {
    setDraggingAppId(null);
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    const source = e.dataTransfer.getData('source');
    
    if (source === 'taskbar' && appId) {
      if (windows[appId].isPinned) togglePinApp(appId);
    } else if ((source === 'desktop' || source === 'start-menu') && appId) {
      const offsetX = parseFloat(e.dataTransfer.getData('offsetX')) || 0;
      const offsetY = parseFloat(e.dataTransfer.getData('offsetY')) || 0;
      const targetX = e.clientX - offsetX;
      const targetY = e.clientY - offsetY;
      
      const targetDim = getIconDimensions();
      const { maxCols, maxRows } = getGridBounds(window.innerWidth, window.innerHeight);
      
      // Calculate target cell
      let targetCol = pixelsToCell(targetX, targetY).col;
      let targetRow = pixelsToCell(targetX, targetY).row;

      const existingItems: Rect[] = [];
      Object.values(windows).forEach(win => {
        // INOLTRE: escludi 'os-settings' e 'system-settings' che non devono mai occupare spazio sul desktop
        const currentX = currentStore === 'B2B' ? (win as any).desktopX_B2B : win.desktopX;
        const currentY = currentStore === 'B2B' ? (win as any).desktopY_B2B : win.desktopY;

        if (!win.isPinned && currentX !== undefined && currentY !== undefined && win.id !== appId) {
          if (win.id === 'os-settings' || win.id === 'system-settings') return;
          if (win.id === 'roblox_game' && activeTheme !== 'roblox') return;
          const pos = pixelsToCell(currentX, currentY);
          existingItems.push({
            id: win.id,
            col: pos.col,
            row: pos.row,
            ...getIconDimensions(),
            type: 'icon'
          });
        }
      });
      widgets.forEach(w => {
        const pos = pixelsToCell(w.x, w.y);
        existingItems.push({
          id: w.id,
          col: pos.col,
          row: pos.row,
          ...getWidgetDimensions(w.type, w.size || 'small'),
          type: 'widget'
        });
      });
      
      // Magnetic Snapping
      if (desktopSnapEnabled) {
        const snapped = getMagneticSnap(targetCol, targetRow, targetDim.colSpan, targetDim.rowSpan, existingItems, desktopSnapRadius, desktopMargin, appId);
        targetCol = snapped.col;
        targetRow = snapped.row;
      }

      // Find nearest free cell if there is still an overlap
      const bestSpot = findNearestFreeCell(
        targetCol, 
        targetRow, 
        targetDim.colSpan, 
        targetDim.rowSpan, 
        existingItems, 
        maxCols, 
        maxRows,
        desktopMargin
      );
      
      updateDesktopPosition(appId, bestSpot.col * CELL_WIDTH, bestSpot.row * CELL_HEIGHT, currentStore);
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    // Registra le app all'avvio se non presenti (check per singola app invece che globalmente vuoto)
    const getImg = (src: string) => <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Icon" />;
    if (!windows['dashboard']) {
      registerApp({ id: 'dashboard', title: 'Dashboard Archelia', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <Dashboard />, x: 100, y: 50, width: 1000, height: 650, desktopX: 30, desktopY: 30 });
    }
    if (!windows['orders']) {
      registerApp({ id: 'orders', title: 'Gestione Ordini', icon: getImg('./icons/orders.jpg'), color: 'transparent', component: <Orders />, x: 150, y: 100, width: 900, height: 600, desktopX: 30, desktopY: 130 });
    }
    if (!windows['products']) {
      registerApp({ id: 'products', title: 'Catalogo Prodotti', icon: getImg('./icons/products.jpg'), color: 'transparent', component: <Products />, x: 200, y: 150, width: 900, height: 600, desktopX: 30, desktopY: 230 });
    }
    if (!windows['settings']) {
      registerApp({ id: 'settings', title: 'Centro Sincronizzazione', icon: getImg('./icons/settings.jpg'), color: 'transparent', component: <Settings />, x: 250, y: 200, width: 600, height: 400, desktopX: 30, desktopY: 330 });
    }
    if (!windows['equalizzatore']) {
      registerApp({ id: 'equalizzatore', title: 'Equalizzatore', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <EqualizzatoreApp />, x: 100, y: 100, width: 1100, height: 750, desktopX: 130, desktopY: 30 });
    }
    if (!windows['marketing']) {
      registerApp({ id: 'marketing', title: 'Centro Marketing', icon: getImg('./icons/marketing.jpg'), color: 'transparent', component: <MarketingApp />, x: 120, y: 120, width: 1200, height: 800, desktopX: 130, desktopY: 130 });
    }
    if (!windows['email_builder']) {
      registerApp({ id: 'email_builder', title: 'Generatore Email', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <EmailBuilderApp />, x: 140, y: 140, width: 1200, height: 800, desktopX: 130, desktopY: 230 });
    }
    if (!windows['promo_manual']) {
      registerApp({ id: 'promo-manual', title: 'Promozioni AI (Manuale)', icon: <DynamicFcIcon name="FcBullish" />, color: 'transparent', component: <PromoManualApp />, x: 60, y: 60, width: 900, height: 600, desktopX: 230, desktopY: 230 });
    }
    
    if (!windows['os-settings']) {
      registerApp({ id: 'os-settings', title: 'Impostazioni', icon: <DynamicFcIcon name="FcSettings" />, color: 'transparent', component: <OSSettingsApp />, x: 100, y: 100, width: 900, height: 700 });
    }

    if (!windows['promo_auto']) {
      registerApp({ id: 'promo_auto', title: 'Sconti Automatici', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <PromoAutoApp />, x: 180, y: 180, width: 1100, height: 800, desktopX: 230, desktopY: 130 });
    }
    if (!windows['infinity']) {
      registerApp({ id: 'infinity', title: 'Infinity', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <InfinityApp />, x: 200, y: 200, width: 1100, height: 800, desktopX: 230, desktopY: 230 });
    }
    if (!windows['images']) {
      registerApp({ id: 'images', title: 'Immagini Asset', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <ImagesApp />, x: 250, y: 150, width: 900, height: 600, desktopX: 230, desktopY: 330 });
    }
    if (!windows['typesense']) {
      registerApp({ id: 'typesense', title: 'Typesense', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <TypesenseApp />, x: 220, y: 220, width: 1100, height: 800, desktopX: 330, desktopY: 30 });
    }
    if (!windows['analytics']) {
      registerApp({ id: 'analytics', title: 'Centro Analisi', icon: getImg('./icons/dashboard.jpg'), color: 'transparent', component: <AnalyticsApp />, x: 100, y: 100, width: 1200, height: 800, desktopX: 330, desktopY: 130 });
    }
    if (!windows['logs']) {
      const TerminalIconWidget = () => (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
          <Terminal color="#10b981" size={40} />
        </div>
      );
      registerApp({ id: 'logs', title: 'System Logs', icon: <TerminalIconWidget />, color: 'transparent', component: <LogsApp />, x: 120, y: 120, width: 1000, height: 750, desktopX: 330, desktopY: 230 });
      registerApp({ id: 'roblox_game', title: 'Roblox Obby', icon: getImg('./icons/themes/roblox/roblox_game.jpg'), color: 'transparent', component: <RobloxMinigame />, x: 150, y: 150, width: 800, height: 600, desktopX: 430, desktopY: 30 });
      registerApp({ id: 'calendar_app', title: 'Calendario', icon: <DynamicFcIcon name="FcCalendar" />, color: 'transparent', component: <CalendarApp />, x: 150, y: 100, width: 1000, height: 700, desktopX: 430, desktopY: 130 });
      registerApp({ id: 'notes_app', title: 'Note', icon: <DynamicFcIcon name="FcDocument" />, color: 'transparent', component: <NotesApp />, x: 200, y: 150, width: 1000, height: 700, desktopX: 430, desktopY: 230 });
      registerApp({ id: 'users_management', title: 'Gestione Utenti', icon: <DynamicFcIcon name="FcBusinessman" />, color: 'transparent', component: <UsersApp />, x: 250, y: 150, width: 1000, height: 700, desktopX: 530, desktopY: 30 });
    }
  }, []);

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => {
      setIsLoggedIn(true);
      setShowIntro(true);
    }} wallpaper={wallpaper} />;
  }

  if (showIntro || showSwitchIntro) {
    const videoSrc = currentStore === 'B2B' ? './videos/intro-izzo.mp4' : './videos/intro.mp4';
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video 
          src={videoSrc} 
          autoPlay 
          playsInline
          onEnded={() => {
            setShowIntro(false);
            setShowSwitchIntro(false);
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  // Prevent showing the desktop until preferences are loaded to avoid flickering
  if (!isReady) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Avvio Archelia OS...</div>
      </div>
    );
  }

  return (
    <div className="desktop-os" style={{ backgroundImage: `url(${currentWallpaper})` }}>
      <Toaster position="top-right" />
      {/* Mouse Trail Globale (Attivo solo se tema Panic) */}     
      <MouseTrail />

      {/* Login Screen Overlay */}
      <div 
        className="desktop-workspace"
        onDrop={handleWorkspaceDrop}
        onDragOver={handleWorkspaceDragOver}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu(null);
            setDesktopContextMenu({ x: e.clientX, y: e.clientY });
          }
        }}
        onClick={() => setDesktopContextMenu(null)}
      >
        {/* Shortcuts Desktop */}
        <div className="desktop-shortcuts" style={{ zIndex: 10, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {Object.values(windows).map(app => {
            if (app.id === 'roblox_game' && activeTheme !== 'roblox') return null;
            if (app.id === 'os-settings') return null;
            const gridPos = currentStore === 'B2B' ? { x: (app as any).desktopX_B2B, y: (app as any).desktopY_B2B } : { x: app.desktopX, y: app.desktopY };
            if (gridPos.x == null || gridPos.y == null) return null;
            
            const b2bAllowedApps = ['orders', 'products', 'settings', 'equalizzatore', 'infinity', 'images', 'typesense', 'analytics', 'logs', 'calendar_app', 'notes_app', 'os-settings', 'users_management'];
            if (currentStore === 'B2B' && !b2bAllowedApps.includes(app.id)) return null;
            if (!canViewApp(app.id, currentStore)) return null;
            
            const themeIconPath = getThemeIconPath(app.id, activeTheme);
            const finalIconPath = themeIconPath || app.iconPath;
            return (
            <div 
              key={`shortcut-${app.id}`} 
              className="desktop-icon-wrapper"
              onClick={() => openWindow(app.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id });
              }}
              draggable={true}
              onDragStart={(e) => handleDragStartDesktopIcon(e, app.id)}
              onDragEnd={handleDragEndDesktopIcon}
              style={{
                position: 'absolute',
                left: pixelsToCell(gridPos.x ?? 0, 0).col * CELL_WIDTH,
                top: pixelsToCell(0, gridPos.y ?? 0).row * CELL_HEIGHT,
                pointerEvents: 'auto',
                opacity: draggingAppId === app.id ? 0 : 1
              }}
            >
              <div className="desktop-icon flex-center" style={{ background: app.color }}>
                {finalIconPath ? (
                  finalIconPath.startsWith('fc:') ? (
                    <DynamicFcIcon name={finalIconPath.split(':')[1]} />
                  ) : (
                    <img src={finalIconPath} alt={app.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  app.icon
                )}
              </div>
              <span className="desktop-icon-label">{app.title}</span>
            </div>
            );
          })}
        </div>

        {/* Livello Widget Desktop */}
        <div className="desktop-widgets" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
          {widgets.map(w => (
            <WidgetContainer key={w.id} widget={w} />
          ))}
        </div>

        {/* Focus Mode Overlay */}
        {settings.focusMode && activeWindowId && windows[activeWindowId] && !windows[activeWindowId].isMinimized && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: (windows[activeWindowId].zIndex ?? 10) - 1,
              pointerEvents: 'none',
              transition: 'opacity 0.3s'
            }}
          />
        )}

        {Object.values(windows).map(win => {
          const b2bAllowedApps = ['orders', 'products', 'settings', 'equalizzatore', 'infinity', 'images', 'typesense', 'analytics', 'logs', 'calendar_app', 'notes_app', 'os-settings', 'users_management'];
          if (currentStore === 'B2B' && !b2bAllowedApps.includes(win.id)) return null;
          if (!canViewApp(win.id, currentStore)) return null;
          return <WindowComponent key={win.id} id={win.id} />;
        })}
      </div>

      {/* Nuova Taskbar */}
      <Taskbar />

      {/* Pannello Chatbot Olografico (Flottante) */}
      {isChatbotOpen && <AiChatbotApp />}

      {/* Context Menu Desktop */}
      {contextMenu && windows[contextMenu.appId] && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              id: 'open',
              label: 'Apri',
              onClick: () => openWindow(contextMenu.appId)
            },
            {
              id: 'remove-desktop',
              label: 'Rimuovi dal Desktop',
              onClick: () => toggleDesktopApp(contextMenu.appId, currentStore)
            },
            {
              id: 'change-icon',
              label: 'Cambia immagine icona',
              dividerBefore: true,
              onClick: () => setEditingIconAppId(contextMenu.appId)
            },
            {
              id: 'pin',
              label: windows[contextMenu.appId].isPinned ? 'Rimuovi dalla taskbar' : 'Fissa sulla taskbar',
              dividerBefore: true,
              onClick: () => togglePinApp(contextMenu.appId)
            }
          ]}
        />
      )}

      {/* Context Menu Desktop Vuoto */}
      {desktopContextMenu && (
        <ContextMenu
          x={desktopContextMenu.x}
          y={desktopContextMenu.y}
          onClose={() => setDesktopContextMenu(null)}
          items={[
            {
              id: 'manage-widgets',
              label: 'Gestione Widgets',
              onClick: () => {
                toggleWidgetManager();
                setDesktopContextMenu(null);
              }
            },
            {
              id: 'system-settings',
              label: 'Impostazioni di Sistema',
              dividerBefore: true,
              onClick: () => {
                openWindow('os-settings');
                setDesktopContextMenu(null);
              }
            }
          ]}
        />
      )}

      {editingIconAppId && (
        <IconPickerModal 
          appId={editingIconAppId} 
          onClose={() => setEditingIconAppId(null)} 
        />
      )}

      {isWidgetManagerOpen && <WidgetManagerModal />}
    </div>
  );
}
