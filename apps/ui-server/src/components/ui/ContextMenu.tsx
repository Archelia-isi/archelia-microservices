import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'warning' | 'default';
  disabled?: boolean;
  onClick?: () => void; // Made optional since submenu items might not have a direct onClick
  dividerBefore?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenuId, setActiveSubmenuId] = React.useState<string | number | null>(null);

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
  
  const menuWidth = 200;
  const menuHeight = items.length * 36 + 16; // approx

  if (x + menuWidth > window.innerWidth) {
    adjustedX = window.innerWidth - menuWidth - 8;
  }
  if (y + menuHeight > window.innerHeight) {
    adjustedY = window.innerHeight - menuHeight - 8;
  }

  const handleMouseEnter = (item: ContextMenuItem) => {
    if (item.submenu && item.submenu.length > 0) {
      setActiveSubmenuId(item.id);
    } else {
      setActiveSubmenuId(null);
    }
  };

  const renderSubmenu = (parentItem: ContextMenuItem) => {
    if (!parentItem.submenu || parentItem.submenu.length === 0) return null;
    
    // Determine if submenu should open to the left or right
    // Standard is right (100%), if no space, left (-100%)
    const parentNode = menuRef.current;
    let openLeft = false;
    
    if (parentNode) {
      const rect = parentNode.getBoundingClientRect();
      const submenuWidth = 200; // estimated
      if (rect.right + submenuWidth > window.innerWidth) {
        openLeft = true;
      }
    }

    return (
      <div 
        className="ui-context-submenu"
        style={{
          left: openLeft ? 'auto' : '100%',
          right: openLeft ? '100%' : 'auto',
          top: 0
        }}
      >
        {parentItem.submenu.map((subItem) => (
          <React.Fragment key={subItem.id}>
            {subItem.dividerBefore && <div className="ui-context-divider"></div>}
            <button
              className={`ui-context-item ${subItem.variant || 'default'}`}
              disabled={subItem.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (subItem.onClick) subItem.onClick();
                onClose();
              }}
            >
              <div className="ui-context-item-content">
                {subItem.icon && <span className="ui-context-item-icon">{subItem.icon}</span>}
                {subItem.label}
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return createPortal(
    <div 
      className="ui-context-menu" 
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {items.map((item) => (
        <div 
          key={item.id} 
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter(item)}
        >
          {item.dividerBefore && <div className="ui-context-divider"></div>}
          <button
            className={`ui-context-item ${item.variant || 'default'}`}
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (item.onClick) item.onClick();
              if (!item.submenu) onClose();
            }}
          >
            <div className="ui-context-item-content">
              {item.icon && <span className="ui-context-item-icon">{item.icon}</span>}
              {item.label}
              {item.submenu && <span className="ui-context-item-chevron">▶</span>}
            </div>
          </button>
          {activeSubmenuId === item.id && renderSubmenu(item)}
        </div>
      ))}
    </div>,
    document.body
  );
}
