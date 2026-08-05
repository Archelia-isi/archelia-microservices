import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, RefreshCw, Users, Inbox } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
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
}

interface CustomerDetails {
  customer: Customer;
  recentOrders: any[];
  abandonedCart: any | null;
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

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

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
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => fetchCustomers(page, search)}>
              <RefreshCw size={14} /> Aggiorna
            </button>
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
             <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={page <= 1} onClick={() => fetchCustomers(page - 1, search)}>Precedente</button>
             <span style={{ fontSize: '0.9rem' }}>Pagina {page} di {totalPages}</span>
             <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={page >= totalPages} onClick={() => fetchCustomers(page + 1, search)}>Successiva</button>
          </div>
        </GlassPanel>
      </div>

      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Dettaglio Cliente a 360°"
        size="lg"
      >
        {detailsLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size="md" /></div>
        ) : customerDetails ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                <User size={16}/> Anagrafica
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div><strong style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.85rem' }}>ID Shopify</strong> <span>{customerDetails.customer.shopifyId}</span></div>
                <div><strong style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.85rem' }}>Codice Zucchetti</strong> <span>{customerDetails.customer.zucchettiArcId || 'Nessuno'}</span></div>
                <div><strong style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.85rem' }}>Nome Completo</strong> <span>{customerDetails.customer.firstName} {customerDetails.customer.lastName}</span></div>
                <div><strong style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.85rem' }}>Email</strong> <span>{customerDetails.customer.email}</span></div>
              </div>
            </div>

            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                <ShoppingCart size={16}/> Storico Ordini Recenti
              </h4>
              {customerDetails.recentOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {customerDetails.recentOrders.map(o => (
                    <div key={o.id} style={{ background: 'var(--color-bg-alt)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <strong style={{ minWidth: '80px' }}>{o.shopifyOrderName}</strong>
                      <span style={{ fontWeight: 500 }}>€{o.totalPrice?.toFixed(2) || '0.00'}</span>
                      <Badge variant={o.status === 'COMPLETED' ? 'success' : o.status === 'FAILED' ? 'danger' : 'warning'}>{o.status}</Badge>
                      <small style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>{new Date(o.createdAt).toLocaleString('it-IT')}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)' }}>Nessun ordine recente trovato.</p>
              )}
            </div>

            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                <ShoppingCart size={16}/> Carrello Abbandonato
              </h4>
              {customerDetails.abandonedCart ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <Badge variant="danger">{customerDetails.abandonedCart.status}</Badge>
                  <span>Ultimo aggiornamento: {new Date(customerDetails.abandonedCart.updatedAt).toLocaleString('it-IT')}</span>
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)' }}>Nessun carrello abbandonato attivo.</p>
              )}
            </div>
          </div>
        ) : (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>Impossibile caricare i dati del cliente.</div>
        )}
      </Modal>
    </div>
  );
}
