import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'modern';
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export default function Button({ 
  variant = 'secondary', 
  size = 'md',
  icon, 
  rightIcon, 
  children, 
  className = '', 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`} 
      {...props}
    >
      {icon && <span className="ui-btn-icon">{icon}</span>}
      {children && <span className="ui-btn-text">{children}</span>}
      {rightIcon && <span className="ui-btn-icon-right">{rightIcon}</span>}
    </button>
  );
}
