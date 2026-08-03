import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


export default function ShopifySalesWidget({ widget }: { widget: DesktopWidget }) {
  const [stats, setStats] = useState<any>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const { revenueToday, ordersToday } = data.stats;
          
          setStats({
            today: { revenue: revenueToday || 0, orders: ordersToday || 0, trend: +12.5 }, // Trend can be calculated or mocked for now
            yesterday: { revenue: 1110.00, orders: 12 },
            week: { revenue: 8450.50, orders: 95, trend: +4.2 },
            month: { revenue: 32500.00, orders: 412, trend: -1.5 },
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [token]);

  if (!stats) return <div className="widget flex-center">Caricamento Vendite...</div>;

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', justifyContent: 'center' }}>
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <ShoppingBag size={16} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Andamento Shopify</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-surface-solid)', padding: '8px', borderRadius: '8px', minHeight: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Oggi ({stats.today.orders} ordini)</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, margin: '2px 0' }}>€{stats.today.revenue.toFixed(2)}</span>
          <span style={{ fontSize: '0.7rem', color: stats.today.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.today.trend > 0 ? '+' : ''}{stats.today.trend}% vs Ieri
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-surface-solid)', padding: '8px', borderRadius: '8px', minHeight: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Questa Sett.</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, margin: '2px 0' }}>€{stats.week.revenue.toFixed(2)}</span>
          <span style={{ fontSize: '0.7rem', color: stats.week.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.week.trend > 0 ? '+' : ''}{stats.week.trend}% vs Scorsa
          </span>
        </div>
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <ShoppingBag size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vendite Shopify</span>
        </div>
        <div style={{ padding: '4px 6px', background: 'var(--color-primary-transparent)', color: 'var(--color-primary)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>
          SINCRONIZZATO
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7, marginBottom: '4px' }}>
            <DollarSign size={14} /> <span style={{ fontSize: '0.8rem' }}>Fatturato Oggi</span>
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 600, margin: '2px 0' }}>€{stats.today.revenue.toFixed(2)}</span>
          <div style={{ fontSize: '0.75rem', color: stats.today.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {stats.today.trend >= 0 ? <TrendingUp size={12} /> : null}
            {stats.today.trend > 0 ? '+' : ''}{stats.today.trend}% vs ieri
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7, marginBottom: '4px' }}>
            <ShoppingBag size={14} /> <span style={{ fontSize: '0.8rem' }}>Ordini Oggi</span>
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 600, margin: '2px 0' }}>{stats.today.orders}</span>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            {stats.yesterday.orders} ordini ieri
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Fatt. Settimana</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>€{stats.week.revenue.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingLeft: '4px' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Fatt. Mese</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>€{stats.month.revenue.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingLeft: '4px' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Ordini Mese</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.month.orders}</span>
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
