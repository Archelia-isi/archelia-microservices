import React from 'react';
import './ActionCard.css';

interface ActionCardProps {
  title: string;
  description: React.ReactNode;
  action: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function ActionCard({ title, description, action, className = '', style }: ActionCardProps) {
  return (
    <div className={`ui-action-card ${className}`} style={style}>
      <div className="ui-action-card-content">
        <h3 className="ui-action-card-title">{title}</h3>
        <p className="ui-action-card-description">{description}</p>
      </div>
      <div className="ui-action-card-action">
        {action}
      </div>
    </div>
  );
}
