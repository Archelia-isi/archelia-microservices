import { type DesktopWidget } from '../../../store/useWidgetStore';

export default function KpiWidget({ widget }: { widget: DesktopWidget }) {
  const kpi1 = widget.config?.kpi1 || { label: 'Ordini Oggi', value: '124', trend: '+12%', isPositive: true };
  const kpi2 = widget.config?.kpi2 || { label: 'Fatturato', value: '€3.4K', trend: '+8%', isPositive: true };
  const kpi3 = widget.config?.kpi3 || { label: 'Nuovi Clienti', value: '18', trend: '-2%', isPositive: false };
  const kpi4 = widget.config?.kpi4 || { label: 'Visite', value: '1.2K', trend: '+24%', isPositive: true };

  const renderSingleKpi = (kpi: any, large = false) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: large ? '1rem' : '0.8rem', opacity: 0.8 }}>{kpi.label}</p>
      <h1 style={{ fontSize: large ? '3rem' : '2rem', margin: '4px 0' }}>{kpi.value}</h1>
      <p style={{ margin: 0, color: kpi.isPositive ? '#32B351' : '#FF3B30', fontWeight: 600, fontSize: large ? '1rem' : '0.9rem' }}>
        {kpi.trend}
      </p>
    </div>
  );

  return (
    <div className="widget kpi-widget" style={{ width: '100%', height: '100%', padding: '16px', display: 'flex' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%', gap: '16px' }}>
          {renderSingleKpi(kpi1)}
          {renderSingleKpi(kpi2)}
          {renderSingleKpi(kpi3)}
          {renderSingleKpi(kpi4)}
        </div>
      )}
    </div>
  );
}
