import React from 'react';
import './Loader.css';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  text?: React.ReactNode;
}

export default function Loader({
  size = 'md',
  color = 'primary',
  text
}: LoaderProps) {
  return (
    <div className="ui-loader-container">
      <div className={`ui-loader size-${size} color-${color}`} />
      {text && <span className="ui-loader-text">{text}</span>}
    </div>
  );
}
