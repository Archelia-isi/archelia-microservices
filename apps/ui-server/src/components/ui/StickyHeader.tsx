import React from 'react';
import './StickyHeader.css';

interface StickyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  backgroundOpacity?: number;
}

export default function StickyHeader({ 
  children, 
  paddingY = 'md',
  backgroundOpacity = 0.7,
  className = '', 
  ...props 
}: StickyHeaderProps) {
  return (
    <div 
      className={`ui-sticky-header ui-sticky-py-${paddingY} ${className}`}
      style={{
        background: `rgba(245, 245, 247, ${backgroundOpacity})`
      }}
      {...props}
    >
      {children}
    </div>
  );
}
