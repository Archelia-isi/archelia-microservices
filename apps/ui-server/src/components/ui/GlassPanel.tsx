import React from 'react';
import './GlassPanel.css';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'light' | 'heavy' | 'solid';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'full';
}

export default function GlassPanel({ 
  children, 
  variant = 'light',
  padding = 'md',
  radius = 'lg',
  className = '', 
  ...props 
}: GlassPanelProps) {
  return (
    <div 
      className={`ui-glass-panel ui-glass-${variant} ui-glass-p-${padding} ui-glass-r-${radius} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
