import React from 'react';
import './Tabs.css';

export interface TabItem {
  id: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string | number;
  onChange: (id: string | number) => void;
  variant?: 'inline' | 'block';
  className?: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'inline',
  className = ''
}: TabsProps) {
  return (
    <div className={`ui-tabs-${variant}-container ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            className={`ui-tab-${variant} ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="ui-tab-icon">{tab.icon}</span>}
            <span className="ui-tab-label">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
