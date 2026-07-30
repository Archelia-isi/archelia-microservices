import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';

export default function KpiWidget({ widget }: { widget: DesktopWidget }) {
  const [stats, setStats] = useState<any>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [token]);

  const kpi1 = widget.config?.kpi1 || { label: 'Ordini Oggi', value: stats?.ordersToday?.toString() || '...', trend: '', isPositive: true };
  const kpi2 = widget.config?.kpi2 || { label: 'Fatturato', value: stats?.revenueToday ? `€${stats.revenueToday.toFixed(2)}` : '...', trend: '', isPositive: true };
  const kpi3 = widget.config?.kpi3 || { label: 'Clienti Totali', value: stats?.customers?.toString() || '...', trend: '', isPositive: true };
  const kpi4 = widget.config?.kpi4 || { label: 'Prodotti', value: stats?.products?.toString() || '...', trend: '', isPositive: true };

  const renderSingleKpi = (kpi: any, large = false) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: large ? '1rem' : '0.8rem', opacity: 0.8 }}>{kpi.label}</p>
      <h1 style={{ fontSize: large ? '3rem' : '2rem', margin: '4px 0' }}>{kpi.value}</h1>
      <p style={{ margin: 0, color: kpi.isPositive ? '#32B351' : '#FF3B30', fontWeight: 600, fontSize: large ? '1rem' : '0.9rem' }}>
        {kpi.trend}
      </p>
    </div>
  );

  return (
    <div className="widget kpi-widget" style={{ width: '100%', height: '100%', padding: '12px', display: 'flex' }}>
      {(!widget.size || widget.size === 'small') && (
        renderSingleKpi(kpi1, true)
      )}

      {widget.size === 'medium' && (
        <>
          {renderSingleKpi(kpi1)}
          <div style={{ width: '1px', background: 'var(--color-border-glass)', margin: '0 16px' }} />
          {renderSingleKpi(kpi2)}
        </>
      )}

      {widget.size === 'large' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%', gap: '8px' }}>
          {renderSingleKpi(kpi1)}
          {renderSingleKpi(kpi2)}
          {renderSingleKpi(kpi3)}
          {renderSingleKpi(kpi4)}
        </div>
      )}
    </div>
  );
}
