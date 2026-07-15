import { useState, useEffect } from 'react';
import { Activity, Package, ShoppingCart, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface StatsResponse {
  stats: {
    totalProducts: number;
    publishedProducts: number;
    withoutImages: number;
    withoutPrice: number;
    withoutStock: number;
    customers: number;
    syncLogs: number;
    ordersToday: number;
    revenueToday: number;
    ordersTotal: number;
    revenueTotal: number;
  };
  server: {
    uptime: number;
    memory: number;
    cpuLoad: number;
  };
  latencyMs: number;
}

interface SyncLog {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  recordsProcessed: number | null;
  errorDetails: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`${API_URL}/api/admin/sync-history?limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (logsRes.ok) {
          setLogs(await logsRes.json());
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex-center" style={{ height: '100%', width: '100%' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getLogIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={16} color="var(--color-success)" />;
      case 'FAILED': return <AlertCircle size={16} color="var(--color-danger)" />;
      default: return <Clock size={16} color="var(--color-primary)" />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Panoramica</h2>
        <p className="text-small">Tieni sotto controllo le metriche vitali in tempo reale.</p>
      </div>
      
      {/* Metric Cards - High Density */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--color-border-light)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Ordini Oggi</span>
            <ShoppingCart size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">{stats?.stats.ordersToday || 0}</span>
            <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
              ({stats?.stats.ordersTotal || 0} totali)
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--color-border-light)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Fatturato Oggi</span>
            <Activity size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">{formatCurrency(stats?.stats.revenueToday || 0)}</span>
            <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
              ({formatCurrency(stats?.stats.revenueTotal || 0)} tot)
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--color-border-light)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Totale Clienti</span>
            <Users size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">{stats?.stats.customers || 0}</span>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--color-border-light)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <span className="text-small" style={{ fontWeight: 500 }}>Prodotti Attivi (Web)</span>
            <Package size={16} color="var(--color-text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="text-h1">{stats?.stats.publishedProducts || 0}</span>
            <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>/ {stats?.stats.totalProducts || 0}</span>
          </div>
        </div>
      </div>

      {/* Recenti */}
      <div style={{ marginTop: '3rem' }}>
        <h3 className="text-h2" style={{ marginBottom: '1rem', fontSize: '18px' }}>Attività Recente</h3>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {logs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {logs.map(log => (
                <div key={log.id} style={{ 
                  display: 'flex', alignItems: 'center', padding: '1rem', 
                  borderBottom: '1px solid var(--color-border-light)',
                  gap: '1rem'
                }}>
                  {getLogIcon(log.status)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', textTransform: 'capitalize' }}>
                      Task: {log.type.replace(/_/g, ' ')}
                    </div>
                    {log.errorDetails && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '2px' }}>
                        {log.errorDetails}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {new Date(log.startedAt).toLocaleString('it-IT')}
                    </div>
                    {log.recordsProcessed !== null && (
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        {log.recordsProcessed} record elaborati
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p className="text-small" style={{ color: 'var(--color-text-muted)' }}>Nessuna attività registrata di recente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
