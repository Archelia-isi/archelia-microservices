import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'warning' | 'default';
  disabled?: boolean;
  onClick: () => void;
  dividerBefore?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Chiudi cliccando fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Gestione escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Adjust position if it goes off-screen
  let adjustedX = x;
  let adjustedY = y;
  
  // Stima della larghezza/altezza. Potremmo usare un useLayoutEffect, 
  // ma per un context menu semplice una stima o un ricalcolo rapido va bene.
  const menuWidth = 200;
  const menuHeight = items.length * 36 + 16; // approx

  if (x + menuWidth > window.innerWidth) {
    adjustedX = window.innerWidth - menuWidth - 8;
  }
  if (y + menuHeight > window.innerHeight) {
    adjustedY = window.innerHeight - menuHeight - 8;
  }

  return createPortal(
    <div 
      className="ui-context-menu" 
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          {item.dividerBefore && <div className="ui-context-divider"></div>}
          <button
            className={`ui-context-item ${item.variant || 'default'}`}
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span className="ui-context-item-icon">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}
