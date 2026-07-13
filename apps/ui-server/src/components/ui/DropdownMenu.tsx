import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from './Button';
import './DropdownMenu.css';

export interface DropdownMenuItem {
  id: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'warning' | 'default';
  disabled?: boolean;
  onClick: () => void;
  dividerBefore?: boolean;
}

interface DropdownMenuProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  items: DropdownMenuItem[];
  buttonVariant?: 'modern' | 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export default function DropdownMenu({
  label,
  icon,
  items,
  buttonVariant = 'modern',
  disabled = false,
  className = ''
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`ui-dropdown-container ${className}`} ref={dropdownRef}>
      <Button
        variant={buttonVariant}
        icon={icon}
        rightIcon={
          <ChevronDown 
            size={14} 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s ease' 
            }} 
          />
        }
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {label}
      </Button>

      {isOpen && (
        <div className="ui-dropdown-menu">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.dividerBefore && <div className="ui-dropdown-divider"></div>}
              <button
                className={`ui-dropdown-item ${item.variant || 'default'}`}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
              >
                {item.icon && <span className="ui-dropdown-item-icon">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
