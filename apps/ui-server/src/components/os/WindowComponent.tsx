import { Rnd } from 'react-rnd';
import { useWindowStore } from '../../store/useWindowStore';
import { Minus, Square, X } from 'lucide-react';
import './WindowComponent.css';

interface Props {
  id: string;
}

export default function WindowComponent({ id }: Props) {
  const windowApp = useWindowStore(state => state.windows[id]);
  const activeWindowId = useWindowStore(state => state.activeWindowId);
  const { closeWindow, minimizeWindow, toggleMaximize, focusWindow, updatePosition, updateSize } = useWindowStore();

  if (!windowApp || !windowApp.isOpen || windowApp.isMinimized) return null;

  const isActive = activeWindowId === id;

  const handleDragStop = (_e: any, d: any) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 60; // altezza taskbar
    
    // Snap Left
    if (d.x <= 0) {
      updateSize(id, screenW / 2, screenH);
      updatePosition(id, 0, 0);
      return;
    }
    // Snap Right (se l'utente trascina vicino al bordo destro)
    if (d.x >= screenW - 100) {
      updateSize(id, screenW / 2, screenH);
      updatePosition(id, screenW / 2, 0);
      return;
    }
    // Snap Top (Massimizza se tocca il tetto)
    if (d.y <= 0) {
      if (!windowApp.isMaximized) toggleMaximize(id);
      return;
    }

    updatePosition(id, d.x, d.y);
  };
  const handleResizeStop = (_e: any, _dir: any, ref: any, _delta: any, position: any) => {
    updateSize(id, ref.style.width, ref.style.height);
    updatePosition(id, position.x, position.y);
  };

  return (
    <Rnd
      size={windowApp.isMaximized ? { width: '100%', height: '100%' } : { width: windowApp.width, height: windowApp.height }}
      position={windowApp.isMaximized ? { x: 0, y: 0 } : { x: windowApp.x, y: windowApp.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableDragging={windowApp.isMaximized}
      enableResizing={!windowApp.isMaximized}
      dragHandleClassName="window-titlebar"
      onMouseDown={() => focusWindow(id)}
      style={{ zIndex: windowApp.zIndex }}
      className={`os-window ${isActive ? 'active' : ''}`}
      bounds="parent"
    >
      <div className="window-inner glass-panel">
        <div className="window-titlebar" onDoubleClick={() => toggleMaximize(id)}>
          <div className="window-controls">
            <button className="mac-btn close" onClick={(e) => { e.stopPropagation(); closeWindow(id); }}>
               <X size={10} className="icon" />
            </button>
            <button className="mac-btn minimize" onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}>
               <Minus size={10} className="icon" />
            </button>
            <button className="mac-btn maximize" onClick={(e) => { e.stopPropagation(); toggleMaximize(id); }}>
               <Square size={9} className="icon" />
            </button>
          </div>
          <div className="window-title">
             {windowApp.title}
          </div>
          <div className="window-controls-spacer" />
        </div>
        <div className="window-content">
          {windowApp.component}
        </div>
      </div>
    </Rnd>
  );
}
