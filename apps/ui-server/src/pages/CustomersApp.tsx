import { useState, useEffect } from 'react';
import { Search, Plus, User, ShoppingCart, RefreshCw, X } from 'lucide-react';
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

  // Form Modale Inserimento/Modifica
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});

  const fetchCustomers = async (pageNum = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/admin/customers?page=${pageNum}&limit=20&search=${searchQuery}`);
      const data = await res.json();
      setCustomers(data.data);
      setTotalPages(data.totalPages);
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
      const res = await fetch(`http://localhost:3000/api/admin/customers/${shopifyId}/details`);
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

  const handleSaveCustomer = async () => {
    try {
      const isUpdate = customers.some(c => c.shopifyId === editForm.shopifyId);
      const url = isUpdate 
        ? `http://localhost:3000/api/admin/customers/${editForm.shopifyId}`
        : `http://localhost:3000/api/admin/customers`;
        
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchCustomers(page, search);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openNewCustomer = () => {
    setEditForm({
      shopifyId: '',
      zucchettiArcId: '',
      email: '',
      firstName: '',
      lastName: ''
    });
    setIsEditModalOpen(true);
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
            <Button variant="primary" size="sm" onClick={openNewCustomer}>
              <Plus size={14} /> Nuovo Cliente
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

      {/* MODALE INSERIMENTO / MODIFICA */}
      {isEditModalOpen && (
        <div className="customers-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="customers-modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{customers.some(c => c.shopifyId === editForm.shopifyId) ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>ID Shopify *</label>
                <input type="text" value={editForm.shopifyId || ''} onChange={e => setEditForm({...editForm, shopifyId: e.target.value})} disabled={customers.some(c => c.shopifyId === editForm.shopifyId)} />
              </div>
              <div className="form-group">
                <label>Codice Zucchetti</label>
                <input type="text" value={editForm.zucchettiArcId || ''} onChange={e => setEditForm({...editForm, zucchettiArcId: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Nome</label>
                <input type="text" value={editForm.firstName || ''} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Cognome</label>
                <input type="text" value={editForm.lastName || ''} onChange={e => setEditForm({...editForm, lastName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Annulla</Button>
              <Button variant="primary" onClick={handleSaveCustomer}>Salva nel DB (V2)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
