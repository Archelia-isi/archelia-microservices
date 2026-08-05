import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, RefreshCw, X } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import './CustomersApp.css';

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
    <div className="customers-app">
      <StickyHeader paddingY="md">
        <GlassPanel padding="sm" radius="lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div className="customers-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Search size={18} opacity={0.7} />
            <input 
              type="text" 
              placeholder="Cerca cliente per nome, email, ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => fetchCustomers(page, search)}>
              <RefreshCw size={14} /> Aggiorna
            </Button>
          </div>
        </GlassPanel>
      </StickyHeader>

      <div className="customers-content">
        <GlassPanel className="customers-table-container">
          {loading ? (
            <div className="customers-loading">Caricamento in corso...</div>
          ) : (
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Codice Zucchetti</th>
                  <th>ID Shopify</th>
                  <th>Nome Completo</th>
                  <th>Email</th>
                  <th>Ultimo Agg.</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.shopifyId} onClick={() => loadDetails(c.shopifyId)}>
                    <td><Badge variant="neutral">{c.zucchettiArcId || 'N/D'}</Badge></td>
                    <td>{c.shopifyId}</td>
                    <td>{c.firstName} {c.lastName}</td>
                    <td>{c.email}</td>
                    <td>{new Date(c.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Nessun cliente trovato</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          
          <div className="pagination">
             <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => fetchCustomers(page - 1, search)}>Precedente</Button>
             <span>Pagina {page} di {totalPages}</span>
             <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => fetchCustomers(page + 1, search)}>Successiva</Button>
          </div>
        </GlassPanel>
      </div>

      {/* MODALE DETTAGLI 360° */}
      {selectedCustomer && (
        <div className="customers-modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="customers-modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dettaglio Cliente a 360°</h3>
              <button className="close-btn" onClick={() => setSelectedCustomer(null)}><X size={20}/></button>
            </div>
            
            {detailsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento dati aggregati...</div>
            ) : customerDetails ? (
              <div className="modal-body">
                <div className="details-section">
                  <h4><User size={16}/> Anagrafica (Solo lettura)</h4>
                  <div className="details-grid">
                    <div><strong>ID Shopify:</strong> {customerDetails.customer.shopifyId}</div>
                    <div><strong>Codice Zucchetti:</strong> {customerDetails.customer.zucchettiArcId || 'Nessuno'}</div>
                    <div><strong>Nome:</strong> {customerDetails.customer.firstName} {customerDetails.customer.lastName}</div>
                    <div><strong>Email:</strong> {customerDetails.customer.email}</div>
                    <div><strong>Telefono:</strong> {customerDetails.customer.phone || 'N/D'}</div>
                  </div>
                </div>

                <div className="details-section">
                  <h4><ShoppingCart size={16}/> Storico Ordini Recenti</h4>
                  {customerDetails.recentOrders.length > 0 ? (
                    <ul className="orders-list">
                      {customerDetails.recentOrders.map(o => (
                        <li key={o.id}>
                          <strong>{o.shopifyOrderName}</strong> - {o.totalPrice}€ 
                          <Badge variant={o.status === 'COMPLETED' ? 'success' : o.status === 'ERROR' ? 'danger' : 'warning'}>{o.status}</Badge>
                          <small>{new Date(o.createdAt).toLocaleString()}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ opacity: 0.6 }}>Nessun ordine recente trovato.</p>
                  )}
                </div>

                <div className="details-section">
                  <h4><ShoppingCart size={16} style={{ color: 'var(--color-danger)' }}/> Carrello Abbandonato</h4>
                  {customerDetails.abandonedCart ? (
                    <div className="cart-alert">
                      <Badge variant="warning">{customerDetails.abandonedCart.status}</Badge>
                      <span>Ultimo aggiornamento: {new Date(customerDetails.abandonedCart.updatedAt).toLocaleString()}</span>
                    </div>
                  ) : (
                    <p style={{ opacity: 0.6 }}>Nessun carrello abbandonato attivo.</p>
                  )}
                </div>
              </div>
            ) : (
               <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>Impossibile caricare i dati del cliente.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
