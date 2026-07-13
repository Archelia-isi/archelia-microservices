import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlayClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true
}: ModalProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setShouldRender(false), 300); // Wait for animation
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`ui-modal-overlay ${isOpen ? 'open' : 'closed'}`} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div 
        className={`ui-modal-content size-${size} ${isOpen ? 'open' : 'closed'}`} 
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="ui-modal-header">
            <h3 className="ui-modal-title">{title}</h3>
            <button className="ui-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        {!title && (
          <button className="ui-modal-close floating" onClick={onClose}>
            <X size={18} />
          </button>
        )}
        
        <div className="ui-modal-body">
          {children}
        </div>

        {footer && (
          <div className="ui-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
