import { useState, useEffect } from 'react';
import { ShoppingCart, Inbox, AlertTriangle, CheckCircle, Clock, MapPin, Package, Tag, Box, Image as ImageIcon } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Loader from '../components/ui/Loader';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders?limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
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

  const handleProductClick = async (sku: string) => {
    setLoadingProduct(true);
    setSelectedProduct({ sku }); // Show skeleton/loader immediately
    try {
      const res = await fetch(`${API_URL}/api/admin/products/by-sku/${sku}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const productData = await res.json();
        setSelectedProduct(productData);
      } else {
        setSelectedProduct({ error: 'Prodotto non trovato nel database' });
      }
    } catch (e) {
      console.error(e);
      setSelectedProduct({ error: 'Errore di connessione' });
    } finally {
      setLoadingProduct(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Gestione Ordini</h2>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={fetchOrders}>
          <ShoppingCart size={16} /> Sincronizza Ora
        </button>
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
                  <tr 
                    key={order.id} 
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => setSelectedOrder(order)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{order.orderNumber || order.shopifyOrderId}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      {new Date(order.createdAt).toLocaleString('it-IT')}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {order.zucchettiQueue?.payload?.customer?.first_name} {order.zucchettiQueue?.payload?.customer?.last_name} 
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {order.zucchettiQueue?.payload?.customer?.email || order.shopifyCustomerId || '-'}
                      </span>
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

      {/* MODAL DETTAGLIO ORDINE */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Dettaglio Ordine ${selectedOrder?.orderNumber || selectedOrder?.shopifyOrderId || ''}`}>
        {selectedOrder && selectedOrder.zucchettiQueue?.payload ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Info Cliente & Indirizzo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <GlassPanel padding="sm">
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={14} /> Dati Cliente
                </h4>
                <p style={{ fontWeight: 600 }}>{selectedOrder.zucchettiQueue.payload.customer?.first_name} {selectedOrder.zucchettiQueue.payload.customer?.last_name}</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.zucchettiQueue.payload.customer?.email}</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.zucchettiQueue.payload.customer?.phone}</p>
              </GlassPanel>
              
              <GlassPanel padding="sm">
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} /> Indirizzo Spedizione
                </h4>
                <p style={{ fontWeight: 600 }}>{selectedOrder.zucchettiQueue.payload.shipping_address?.name}</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.zucchettiQueue.payload.shipping_address?.address1}</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.zucchettiQueue.payload.shipping_address?.zip} {selectedOrder.zucchettiQueue.payload.shipping_address?.city} ({selectedOrder.zucchettiQueue.payload.shipping_address?.province_code})</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.zucchettiQueue.payload.shipping_address?.country}</p>
              </GlassPanel>
            </div>

            {/* Prodotti */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Prodotti Acquistati</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedOrder.zucchettiQueue.payload.line_items?.map((item: any) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '1rem', 
                      background: 'var(--color-bg-alt)', 
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'border 0.2s'
                    }}
                    onClick={() => handleProductClick(item.sku)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                  >
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{item.title}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={12} /> SKU: {item.sku} <span style={{ opacity: 0.5 }}>|</span> Q.tà: {item.quantity}
                      </p>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      €{parseFloat(item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Totali */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Subtotale: €{selectedOrder.zucchettiQueue.payload.subtotal_price}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Spedizione: €{selectedOrder.zucchettiQueue.payload.total_shipping_price_set?.shop_money?.amount || '0.00'}</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.5rem' }}>Totale: €{selectedOrder.zucchettiQueue.payload.total_price}</p>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Nessun dettaglio JSON Shopify disponibile per questo ordine.
          </div>
        )}
      </Modal>

      {/* MODAL DETTAGLIO PRODOTTO */}
      <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Scheda Prodotto">
        {loadingProduct ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size="md" /></div>
        ) : selectedProduct?.error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 1rem auto' }} />
            {selectedProduct.error}
          </div>
        ) : selectedProduct ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: 'var(--radius-md)', 
                background: 'var(--color-bg-alt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid var(--color-border)'
              }}>
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={32} color="var(--color-text-muted)" />
                )}
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {selectedProduct.title || selectedProduct.originalName}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <Badge variant="neutral">SKU: {selectedProduct.sku}</Badge>
                  <Badge variant="neutral">Marca: {selectedProduct.brand}</Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  €{selectedProduct.price?.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <GlassPanel padding="sm" style={{ background: 'var(--color-bg-alt)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={14} /> Magazzino I.S.I. srl (PR)
                </h4>
                <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{selectedProduct.stock} pz <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>(Disponibili)</span></p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Giacenza reale: {selectedProduct.rawStock} pz <br/>
                  Impegnata: {selectedProduct.committedStock} pz
                </div>
              </GlassPanel>

              <GlassPanel padding="sm" style={{ background: 'var(--color-bg-alt)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={14} /> Magazzino Elmark (EK)
                </h4>
                <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{selectedProduct.stockEk} pz <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>(Disponibili)</span></p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Giacenza reale: {selectedProduct.rawStockEk} pz <br/>
                  Impegnata: {selectedProduct.committedStockEk} pz
                </div>
              </GlassPanel>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
