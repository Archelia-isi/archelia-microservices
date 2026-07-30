import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Package, AlertCircle } from 'lucide-react';

export default function PendingOrdersWidget({ widget }: { widget: DesktopWidget }) {
  const [orders, setOrders] = useState<any[]>([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/orders?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setOrders(json.data.map((o: any) => {
            const zq = o.zucchettiQueue;
            let status = 'syncing';
            if (!zq) status = 'pending';
            else if (zq.status === 'COMPLETED') status = 'completed';
            else if (zq.status === 'FAILED') status = 'error';

            return {
              id: o.orderNumber || o.shopifyOrderId,
              customer: o.customerName || 'Cliente Shopify',
              amount: o.totalPrice || 0,
              status,
              time: new Date(o.createdAt).toLocaleDateString()
            };
          }).filter((o: any) => o.status !== 'completed')); // Show only pending/syncing/errors
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrders();
  }, [token]);

  if (orders.length === 0) return <div className="widget flex-center">Caricamento Ordini...</div>;

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const errorCount = orders.filter(o => o.status === 'error').length;

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
      <Package size={32} style={{ color: errorCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)', marginBottom: '8px' }} />
      <div style={{ fontSize: '2rem', fontWeight: 300 }}>{pendingCount}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>ORDINI IN CODA</div>
      {errorCount > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={12} /> {errorCount} Errori
        </div>
      )}
    </div>
  );

  const renderOrder = (o: any) => {
    let statusColor = 'var(--color-text-muted)';
    let statusText = 'In Coda';
    if (o.status === 'error') { statusColor = 'var(--color-danger)'; statusText = 'Errore Zucchetti'; }
    if (o.status === 'syncing') { statusColor = 'var(--color-primary)'; statusText = 'Sincronizzazione...'; }

    return (
      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border-glass)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.id} - {o.customer}</span>
          <span style={{ fontSize: '0.75rem', color: statusColor }}>{statusText} • {o.time}</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          €{o.amount.toFixed(2)}
        </div>
      </div>
    );
  };

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Package size={18} style={{ color: 'var(--color-warning)' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Coda Sincronizzazione ({pendingCount})</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {orders.slice(0, 2).map(renderOrder)}
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} style={{ color: 'var(--color-warning)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Ordini da Sincronizzare</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ padding: '4px 8px', background: 'var(--color-warning-transparent)', color: 'var(--color-warning)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
            {pendingCount} IN CODA
          </div>
          {errorCount > 0 && (
            <div style={{ padding: '4px 8px', background: 'var(--color-danger-transparent)', color: 'var(--color-danger)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errorCount} ERRORI
            </div>
          )}
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
        {orders.map(renderOrder)}
      </div>
    </div>
  );

  return (
    <div className="widget pending-orders-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
