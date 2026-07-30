import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';

export default function ShopifySalesWidget({ widget }: { widget: DesktopWidget }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // MOCK: Futura chiamata a /api/admin/shopify/sales
    setTimeout(() => {
      setStats({
        today: { revenue: 1250.00, orders: 15, trend: +12.5 },
        yesterday: { revenue: 1110.00, orders: 12 },
        week: { revenue: 8450.50, orders: 95, trend: +4.2 },
        month: { revenue: 32500.00, orders: 412, trend: -1.5 },
      });
    }, 500);
  }, []);

  if (!stats) return <div className="widget flex-center">Caricamento Vendite...</div>;

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7 }}>
        <ShoppingBag size={14} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VENDITE OGGI</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 300 }}>€{stats.today.revenue.toFixed(2)}</div>
      <div style={{ fontSize: '0.8rem', color: stats.today.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
        {stats.today.trend >= 0 ? <TrendingUp size={12} /> : null}
        {stats.today.trend > 0 ? '+' : ''}{stats.today.trend}% vs Ieri
      </div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Andamento Shopify</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Oggi ({stats.today.orders} ordini)</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 600, margin: '4px 0' }}>€{stats.today.revenue.toFixed(2)}</span>
          <span style={{ fontSize: '0.75rem', color: stats.today.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {stats.today.trend > 0 ? '+' : ''}{stats.today.trend}% vs Ieri
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Questa Settimana</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 600, margin: '4px 0' }}>€{stats.week.revenue.toFixed(2)}</span>
          <span style={{ fontSize: '0.75rem', color: stats.week.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {stats.week.trend > 0 ? '+' : ''}{stats.week.trend}% vs Scorsa
          </span>
        </div>
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Andamento Vendite Shopify</span>
        </div>
        <div style={{ padding: '4px 8px', background: 'var(--color-primary-transparent)', color: 'var(--color-primary)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
          SINCRONIZZATO
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface-solid)', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, marginBottom: '8px' }}>
            <DollarSign size={16} /> <span style={{ fontSize: '0.9rem' }}>Fatturato Oggi</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 300, margin: '4px 0' }}>€{stats.today.revenue.toFixed(2)}</span>
          <div style={{ fontSize: '0.85rem', color: stats.today.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {stats.today.trend >= 0 ? <TrendingUp size={14} /> : null}
            {stats.today.trend > 0 ? '+' : ''}{stats.today.trend}% rispetto a ieri
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface-solid)', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, marginBottom: '8px' }}>
            <ShoppingBag size={16} /> <span style={{ fontSize: '0.9rem' }}>Ordini Oggi</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 300, margin: '4px 0' }}>{stats.today.orders}</span>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            {stats.yesterday.orders} ordini ieri
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', padding: '16px 8px 0 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Fatturato Settimana</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>€{stats.week.revenue.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Fatturato Mese</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>€{stats.month.revenue.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Ordini Mese</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{stats.month.orders}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="widget shopify-sales-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
