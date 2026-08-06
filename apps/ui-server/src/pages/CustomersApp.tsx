import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, RefreshCw, Users, Inbox, Bell, MapPin, FileText, ChevronLeft, Package, AlertTriangle, ImageIcon, Box } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';
import Loader from '../components/ui/Loader';

interface Customer {
  shopifyId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  zucchettiArcId: string | null;
  updatedAt: string;
  billingAddress?: any;
  addresses?: any;
  fiscalData?: any;
}

interface CustomerDetails {
  customer: Customer;
  orders: any[];
  abandonedCart: any | null;
  notifications: any[];
}

export default function CustomersApp() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('list');
  const [modalActiveTab, setModalActiveTab] = useState('orders');

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

  const handleProductClick = async (sku: string) => {
    if (!sku) return;
    setSelectedProduct(null);
    setLoadingProduct(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/products/${sku}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedProduct(data.data || { error: 'Prodotto non trovato o non sincronizzato.' });
    } catch (e) {
      setSelectedProduct({ error: 'Errore durante la ricerca del prodotto.' });
    } finally {
      setLoadingProduct(false);
    }
  };

  const fetchCustomers = async (pageNum = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/customers?page=${pageNum}&limit=20&search=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCustomers(data.data || []);
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(1, search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const loadDetails = async (shopifyId: string) => {
    setSelectedCustomer(shopifyId);
    setDetailsLoading(true);
    setModalActiveTab('orders');
    setSelectedOrder(null);
    setSelectedNotification(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/customers/${shopifyId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setCustomerDetails(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <Badge variant="success">Completato ERP</Badge>;
      case 'FAILED': return <Badge variant="danger">Fallito ERP</Badge>;
      case 'PROCESSING': return <Badge variant="warning">In Elaborazione</Badge>;
      default: return <Badge variant="neutral">In Coda ERP</Badge>;
    }
  }

  const renderLeftColumn = (c: Customer) => {
    return (
      <div style={{ paddingRight: '2rem', borderRight: '1px solid var(--color-border)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}><User size={18}/> Anagrafica Base</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div><strong style={{ color: 'var(--color-text-muted)' }}>ID Shopify:</strong> {c.shopifyId}</div>
              <div><strong style={{ color: 'var(--color-text-muted)' }}>Codice Zucchetti:</strong> {c.zucchettiArcId || 'Nessuno'}</div>
              <div><strong style={{ color: 'var(--color-text-muted)' }}>Nome Completo:</strong> {c.firstName} {c.lastName}</div>
              <div><strong style={{ color: 'var(--color-text-muted)' }}>Email:</strong> {c.email || '-'}</div>
              <div><strong style={{ color: 'var(--color-text-muted)' }}>Telefono:</strong> {c.phone || '-'}</div>
           </div>
        </div>

        <div>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}><MapPin size={18}/> Indirizzo di Fatturazione</h3>
           {c.billingAddress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.95rem', background: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span>{c.billingAddress.name}</span>
                <span>{c.billingAddress.address1} {c.billingAddress.address2}</span>
                <span>{c.billingAddress.zip} {c.billingAddress.city} ({c.billingAddress.provinceCode})</span>
                <span>{c.billingAddress.country}</span>
              </div>
           ) : <span style={{ color: 'var(--color-text-muted)' }}>Nessun indirizzo di fatturazione.</span>}
        </div>

        <div>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}><FileText size={18}/> Dati Fiscali</h3>
           {c.fiscalData ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', background: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
               <div><strong style={{ color: 'var(--color-text-muted)' }}>Codice Fiscale:</strong> {c.fiscalData.codice_fiscale || '-'}</div>
               <div><strong style={{ color: 'var(--color-text-muted)' }}>Partita IVA:</strong> {c.fiscalData.partita_iva || '-'}</div>
               <div><strong style={{ color: 'var(--color-text-muted)' }}>PEC:</strong> {c.fiscalData.pec || '-'}</div>
               <div><strong style={{ color: 'var(--color-text-muted)' }}>Codice Univoco:</strong> {c.fiscalData.codice_univoco || '-'}</div>
             </div>
           ) : <span style={{ color: 'var(--color-text-muted)' }}>Dati fiscali non inseriti.</span>}
        </div>
      </div>
    );
  }

  const renderRightColumn = () => {
    if (!customerDetails) return null;
    return (
      <div style={{ paddingLeft: '2rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Tabs 
            activeTab={modalActiveTab}
            onChange={(id) => {
              setModalActiveTab(id as string);
              setSelectedOrder(null);
              setSelectedNotification(null);
            }}
            tabs={[
              { id: 'orders', label: `Ordini (${(customerDetails.orders || []).length})`, icon: <ShoppingCart size={14} /> },
              { id: 'cart', label: 'Carrello Abbandonato', icon: <Package size={14} /> },
              { id: 'notifications', label: `Notifiche (${(customerDetails.notifications || []).length})`, icon: <Bell size={14} /> }
            ]}
        />
        
        <div style={{ marginTop: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {modalActiveTab === 'orders' && renderOrdersTab()}
          {modalActiveTab === 'cart' && renderCartTab()}
          {modalActiveTab === 'notifications' && renderNotificationsTab()}
        </div>
      </div>
    )
  }

  const renderOrdersTab = () => {
    if (selectedOrder) {
      const payload = selectedOrder.zucchettiQueue?.payload || {};
      const items = payload.line_items || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button variant="secondary" onClick={() => setSelectedOrder(null)}><ChevronLeft size={16}/> Indietro</Button>
            <h3 style={{ margin: 0 }}>Ordine: {selectedOrder.orderNumber}</h3>
            {getOrderStatusBadge(selectedOrder.zucchettiQueue?.status || 'PENDING')}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <GlassPanel padding="md">
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Dettagli Economici</strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Subtotale:</span> <span>€{payload.current_subtotal_price || '0.00'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Spedizione:</span> <span>€{payload.total_shipping_price_set?.shop_money?.amount || '0.00'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Sconti:</span> <span>-€{payload.current_total_discounts || '0.00'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Tasse:</span> <span>€{payload.current_total_tax || '0.00'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}><span>Totale:</span> <span>€{payload.current_total_price || selectedOrder.totalPrice?.toFixed(2) || '0.00'}</span></div>
            </GlassPanel>
            <GlassPanel padding="md">
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Altre Info</strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Data:</span> <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Num. Ordine:</span> <span>{payload.order_number || selectedOrder.orderNumber}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Pagamento:</span> <span>{payload.payment_gateway_names?.join(', ') || '-'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>Status Finanziario:</span> <span><Badge variant="neutral">{payload.financial_status || '-'}</Badge></span></div>
            </GlassPanel>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem' }}>Prodotti Acquistati ({items.length})</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>Prodotto</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>SKU</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'right' }}>Q.tà</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'right' }}>Prezzo unitario</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'right' }}>Totale</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr 
                    key={item.id} 
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onClick={() => handleProductClick(item.sku)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem' }}>{item.title} {item.variant_title ? `- ${item.variant_title}` : ''}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>{item.sku}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>€{parseFloat(item.price).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>€{(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (!customerDetails!.orders || customerDetails!.orders.length === 0) {
       return <div style={{ color: 'var(--color-text-muted)' }}>Nessun ordine presente per questo cliente.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {customerDetails!.orders.map(o => {
          const p = o.zucchettiQueue?.payload || {};
          return (
          <GlassPanel 
            key={o.id} 
            padding="md"
            onClick={() => setSelectedOrder(o)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
          >
            <div style={{ background: 'var(--color-bg-alt)', padding: '0.75rem', borderRadius: '50%' }}>
               <ShoppingCart size={20} color="var(--color-primary)" />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem' }}>Ordine: {o.orderNumber || '-'}</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                {new Date(o.createdAt).toLocaleDateString()} · Numero Ordine: {p.order_number || o.orderNumber || '-'} · Totale: €{p.current_total_price || o.totalPrice?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {getOrderStatusBadge(o.zucchettiQueue?.status || 'PENDING')}
            </div>
          </GlassPanel>
        )})}
      </div>
    );
  };

  const renderCartTab = () => {
    if (!customerDetails!.abandonedCart) {
      return (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <Package size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem auto' }} opacity={0.3} />
          <h4 style={{ color: 'var(--color-text-muted)' }}>Nessun carrello abbandonato attivo</h4>
        </div>
      );
    }
    const cart = customerDetails!.abandonedCart;
    const items = cart.payload?.line_items || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <Badge variant="danger">CARRELLO ABBANDONATO ({cart.status})</Badge>
          <span>Ultimo aggiornamento: {new Date(cart.updatedAt).toLocaleString('it-IT')}</span>
        </div>
        <div>
          <h4>Contenuto del carrello</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>Prodotto</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'right' }}>Q.tà</th>
                  <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'right' }}>Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.key || item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem' }}>{item.title}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>€{parseFloat(item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => {
    if (selectedNotification) {
       return (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button variant="secondary" onClick={() => setSelectedNotification(null)}><ChevronLeft size={16}/> Indietro</Button>
              <h3 style={{ margin: 0 }}>Dettaglio Notifica</h3>
              <Badge variant={selectedNotification.type === 'EMAIL' ? 'primary' : 'warning'}>{selectedNotification.type}</Badge>
              <Badge variant={selectedNotification.status === 'COMPLETED' ? 'success' : 'neutral'}>{selectedNotification.status}</Badge>
           </div>
           
           <GlassPanel padding="md">
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               <div><strong style={{ color: 'var(--color-text-muted)', display: 'block' }}>Job Type</strong> <span>{selectedNotification.jobType}</span></div>
               <div><strong style={{ color: 'var(--color-text-muted)', display: 'block' }}>Data Schedulata</strong> <span>{new Date(selectedNotification.scheduledFor).toLocaleString()}</span></div>
               {selectedNotification.type === 'EMAIL' && (
                 <>
                   <div><strong style={{ color: 'var(--color-text-muted)', display: 'block' }}>Template</strong> <span>{selectedNotification.templateName || '-'}</span></div>
                   <div><strong style={{ color: 'var(--color-text-muted)', display: 'block' }}>Oggetto</strong> <span>{selectedNotification.templateSubject || '-'}</span></div>
                 </>
               )}
             </div>
           </GlassPanel>

           <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff', padding: '1rem', minHeight: '300px' }}>
             {selectedNotification.type === 'EMAIL' ? (
                <div style={{ width: '100%', height: '100%', overflowY: 'auto', color: '#000' }} dangerouslySetInnerHTML={{ __html: selectedNotification.htmlContent || 'Nessun contenuto HTML disponibile' }} />
             ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#000' }}>
                  {JSON.stringify(selectedNotification.payload, null, 2)}
                </pre>
             )}
           </div>
         </div>
       );
    }

    if (!(customerDetails!.notifications || []).length) {
       return <div style={{ color: 'var(--color-text-muted)' }}>Nessuna notifica presente per questo cliente.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {(customerDetails!.notifications || []).map(n => (
          <div 
            key={n.id} 
            onClick={() => setSelectedNotification(n)}
            style={{ background: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)')}
          >
            <div style={{ padding: '0.5rem', background: 'var(--color-bg)', borderRadius: '50%' }}>
              <Bell size={18} color="var(--color-primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1rem' }}>{n.jobType}</strong>
                <Badge variant={n.type === 'EMAIL' ? 'primary' : 'warning'}>{n.type}</Badge>
                <Badge variant={n.status === 'COMPLETED' ? 'success' : 'neutral'}>{n.status}</Badge>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Schedulata per: {new Date(n.scheduledFor).toLocaleString('it-IT')}
              </div>
            </div>
            <ChevronLeft size={20} color="var(--color-text-muted)" style={{ transform: 'rotate(180deg)' }} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '0', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <StickyHeader paddingY="md" backgroundOpacity={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 2rem' }}>
          <Tabs 
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as string)}
            tabs={[
              { id: 'list', label: 'Lista Clienti', icon: <Users size={14} /> }
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-alt)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Cerca per nome, email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontSize: '14px', width: '200px' }}
              />
            </div>
            <Button variant="secondary" onClick={() => fetchCustomers(page, search)}>
              <RefreshCw size={14} /> Aggiorna
            </Button>
          </div>
        </div>
      </StickyHeader>

      <div style={{ padding: '1rem 2rem 2rem 2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <GlassPanel padding="none" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {loading && customers.length === 0 ? (
             <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size="md" /></div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: 'var(--shadow-sm)' }}>
                <Inbox size={28} color="var(--color-text-muted)" />
              </div>
              <h3 className="text-h2" style={{ marginBottom: '0.5rem', fontSize: '18px' }}>Nessun cliente trovato</h3>
              <p className="text-body" style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
                Non ci sono clienti che corrispondono alla ricerca.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Codice Zucchetti</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>ID Shopify</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nome Completo</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Email</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Ultimo Agg.</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr 
                      key={c.shopifyId} 
                      onClick={() => loadDetails(c.shopifyId)}
                      style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem' }}><Badge variant="neutral">{c.zucchettiArcId || 'N/D'}</Badge></td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{c.shopifyId}</td>
                      <td style={{ padding: '1rem' }}>{c.firstName} {c.lastName}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{c.email}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(c.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
             <Button variant="secondary" disabled={page <= 1} onClick={() => fetchCustomers(page - 1, search)}>Precedente</Button>
             <span style={{ fontSize: '0.9rem' }}>Pagina {page} di {totalPages}</span>
             <Button variant="secondary" disabled={page >= totalPages} onClick={() => fetchCustomers(page + 1, search)}>Successiva</Button>
          </div>
        </GlassPanel>
      </div>

      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={customerDetails ? `${customerDetails.customer.firstName} ${customerDetails.customer.lastName}` : "Caricamento dettagli..."}
        size="full"
      >
        {detailsLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size="md" /></div>
        ) : customerDetails ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', height: '100%', overflow: 'hidden' }}>
            {renderLeftColumn(customerDetails.customer)}
            {renderRightColumn()}
          </div>
        ) : (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>Impossibile caricare i dati del cliente.</div>
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
