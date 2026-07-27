import { useState, useEffect } from 'react';
import { ShoppingCart, Inbox, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Loader from '../components/ui/Loader';
import Badge from '../components/ui/Badge';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders?limit=50`);
      const data = await res.json();
      if (data.data) {
        setOrders(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30s
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (queueStatus: string | undefined) => {
    switch (queueStatus) {
      case 'COMPLETED': return <Badge variant="success"><CheckCircle size={12}/> Inviato ERP</Badge>;
      case 'FAILED': return <Badge variant="danger"><AlertTriangle size={12}/> Fallito ERP</Badge>;
      case 'PENDING': return <Badge variant="warning"><Clock size={12}/> In Coda ERP</Badge>;
      default: return <Badge variant="neutral">Solo Shopify</Badge>;
    }
  };

  const recoverOrders = async () => {
    if (!window.confirm('Vuoi davvero scaricare gli ultimi 20 ordini da Shopify e forzare il reinvio a Zucchetti?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/recover`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setTimeout(fetchOrders, 2000);
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Errore di rete durante il recupero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Gestione Ordini</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary flex-center" style={{ gap: '0.5rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }} onClick={recoverOrders}>
            Recupera Vecchi
          </button>
          <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={fetchOrders}>
            <ShoppingCart size={16} /> Sincronizza Ora
          </button>
        </div>
      </div>

      <GlassPanel padding="none">
        {loading && orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size="md" /></div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: 'var(--shadow-sm)' }}>
              <Inbox size={28} color="var(--color-text-muted)" />
            </div>
            <h3 className="text-h2" style={{ marginBottom: '0.5rem', fontSize: '18px' }}>Nessun ordine trovato</h3>
            <p className="text-body" style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
              Non ci sono ordini caricati nel database locale.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>ID Ordine</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Data</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cliente</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Totale</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Stato Zucchetti</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 600 }}>{order.orderNumber || order.shopifyOrderId}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      {new Date(order.createdAt).toLocaleString('it-IT')}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {order.shopifyCustomerId || '-'}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      €{order.totalPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(order.zucchettiQueue?.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
