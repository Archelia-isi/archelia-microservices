import { Terminal, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  data?: any;
}

interface LogViewerProps {
  logs: LogEntry[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function LogViewer({ logs, loading, emptyMessage = 'Nessun log disponibile' }: LogViewerProps) {
  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          margin: '0 auto var(--spacing-md)',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        Caricamento log in corso...
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <Terminal size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.2 }} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
      case 'fatal':
        return '#ef4444'; // Red
      case 'warn':
      case 'warning':
        return '#f59e0b'; // Amber
      case 'info':
        return '#3b82f6'; // Blue
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
      case 'fatal':
        return <XCircle size={14} color="#ef4444" />;
      case 'warn':
      case 'warning':
        return <AlertTriangle size={14} color="#f59e0b" />;
      default:
        return <Info size={14} color="#3b82f6" />;
    }
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-md)',
      fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '0.85rem',
      color: '#e5e7eb',
      height: '100%',
      overflowY: 'auto',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      {logs.map((log) => (
        <div 
          key={log.id} 
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-xs) 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div style={{ opacity: 0.6, whiteSpace: 'nowrap', minWidth: '140px' }}>
            {new Date(log.createdAt).toLocaleString('it-IT')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '80px', gap: '4px', color: getLevelColor(log.level) }}>
            {getLevelIcon(log.level)}
            {log.level?.toUpperCase()}
          </div>
          <div style={{ flex: 1, wordBreak: 'break-word' }}>
            {log.message}
            {log.data && Object.keys(log.data).length > 0 && (
              <pre style={{ 
                marginTop: '4px', 
                background: 'rgba(0,0,0,0.3)', 
                padding: '8px', 
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                overflowX: 'auto'
              }}>
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
