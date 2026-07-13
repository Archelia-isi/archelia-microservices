import React from 'react';
import './Badge.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export default function Badge({ 
  children, 
  variant = 'neutral',
  size = 'sm',
  className = '', 
  ...props 
}: BadgeProps) {
  return (
    <span 
      className={`ui-badge ui-badge-${variant} ui-badge-${size} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
