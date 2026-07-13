import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  total?: number;
  message?: string;
  isActive?: boolean;
  maxWidth?: number | string;
  className?: string;
}

export default function ProgressBar({
  progress,
  total = 100,
  message = '',
  isActive = false,
  maxWidth = 400,
  className = ''
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`ui-progress-slim ${className}`} style={{ maxWidth }}>
      <div className="ui-progress-slim-text">
        <span className={isActive ? 'active' : ''}>
          {isActive && message ? message : message || 'Completato'}
        </span>
        {isActive && <span className="pct">{clampedPct}%</span>}
      </div>
      <div className="ui-progress-slim-bg">
        <div 
          className={`ui-progress-slim-fill ${isActive ? 'active' : ''}`}
          style={{ width: isActive ? `${clampedPct}%` : '100%' }}
        />
      </div>
    </div>
  );
}
