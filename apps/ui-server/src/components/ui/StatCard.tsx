import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import './StatCard.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendSuffix?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, trend, trendSuffix = '%', icon }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  const isNeutral = trend === 0;

  let trendClass = 'neutral';
  if (isPositive) trendClass = 'positive';
  if (isNegative) trendClass = 'negative';

  return (
    <div className="ui-stat-card">
      <div className="ui-stat-header">
        <h3 className="ui-stat-title">{title}</h3>
        {icon && <div className="ui-stat-icon">{icon}</div>}
      </div>
      <div className="ui-stat-value">{value}</div>
      
      {trend !== undefined && (
        <div className={`ui-stat-trend ${trendClass}`}>
          {isPositive && <ArrowUpRight size={16} />}
          {isNegative && <ArrowDownRight size={16} />}
          {isNeutral && <Minus size={16} />}
          <span>
            {isPositive ? '+' : ''}{trend}{trendSuffix} rispetto al periodo precedente
          </span>
        </div>
      )}
    </div>
  );
}
