import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

interface B2BUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  vatNumber?: string;
  zucchettiCode?: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
  agentId?: string;
  zucchettiPriceList?: string;
  customerType?: string;
  fido?: number;
  discount?: number;
  isElmarkCustomer: boolean;
  elmarkDiscounts?: any;
  isActive: boolean;
}

export default function B2BUsersApp() {
  const [users, setUsers] = useState<B2BUser[]>([]);
  const [agents, setAgents] = useState<B2BUser[]>([]);
  const [isAppReady, setIsAppReady] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<B2BUser | null>(null);
  
  const defaultForm = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: '',
    vatNumber: '',
    zucchettiCode: '',
    role: 'USER' as 'USER' | 'AGENT' | 'ADMIN',
    agentId: '',
    zucchettiPriceList: '',
    customerType: '',
    fido: 0,
    discount: 0,
    isElmarkCustomer: false,
    elmarkDiscounts: {} as any,
    isActive: true
  };
  
  const [formData, setFormData] = useState(defaultForm);
  const [zucchettiSearch, setZucchettiSearch] = useState('');
  const [zucchettiResults, setZucchettiResults] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setAgents(data.users.filter((u: B2BUser) => u.role === 'AGENT'));
      }
      setIsAppReady(true);
    } catch (e) {
      toast.error('Errore nel caricamento degli utenti B2B');
    }
  };

  const searchZucchetti = async () => {
    if (zucchettiSearch.length < 3) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/zucchetti/customers/search?q=${encodeURIComponent(zucchettiSearch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.results) {
        setZucchettiResults(data.results);
        if (data.results.length === 0) {
           toast.error('Nessun cliente trovato su Zucchetti (o limite 100 superato). Prova "ferr".');
        }
      }
    } catch (e) {
      toast.error('Errore ricerca Zucchetti');
    }
  };

  const handleSelectZucchettiCustomer = (c: any) => {
    setFormData({
      ...formData,
      companyName: c.companyName || '',
      vatNumber: c.vatNumber || '',
      zucchettiCode: c.zucchettiCode || '',
      zucchettiPriceList: c.zucchettiPriceList || '',
      customerType: c.customerType || '',
      fido: c.fido || 0,
      discount: c.discount || 0
    });
    toast.success('Dati precompilati da Zucchetti!');
    setZucchettiResults([]);
    setZucchettiSearch('');
  };

  const handleSubmit = async () => {
    if (!formData.email || (!editingUser && !formData.password)) {
      toast.error('Email e password sono obbligatori');
      return;
    }
    
    const token = localStorage.getItem('token');
    const url = editingUser 
      ? `${API_URL}/api/admin/b2b-users/${editingUser.id}` 
      : `${API_URL}/api/admin/b2b-users`;
      
    try {
      const payload: any = { ...formData };
      if (payload.agentId === '') payload.agentId = null;
      
      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio');
      
      toast.success('Utente B2B salvato!');
      setIsModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo utente B2B?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Eliminato');
        fetchUsers();
      }
    } catch (e) {
      toast.error('Errore eliminazione');
    }
  };

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Utenti B2B" icon={<Users size={32} />} />
      
      <StickyHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => {
              setEditingUser(null);
              setFormData(defaultForm);
              setIsModalOpen(true);
            }}>
              Nuovo Utente
            </Button>
            <Button variant="secondary" onClick={fetchUsers}>Aggiorna</Button>
          </div>
        </div>
      </StickyHeader>

      <div style={{ padding: '2rem' }}>
        <GlassPanel style={{ padding: '1.5rem' }}>
          <div className="users-grid">
            {users.map(u => (
              <div key={u.id} className="user-card" style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'AGENT' ? 'warning' : 'primary'}>{u.role}</Badge>
                  {u.isElmarkCustomer && <Badge variant="success">ELMARK</Badge>}
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{u.companyName || u.email}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                
                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <Button variant="secondary" icon={<Edit2 size={14} />} onClick={() => {
                    setEditingUser(u);
                    setFormData({
                      email: u.email,
                      password: '',
                      firstName: u.firstName || '',
                      lastName: u.lastName || '',
                      companyName: u.companyName || '',
                      vatNumber: u.vatNumber || '',
                      zucchettiCode: u.zucchettiCode || '',
                      role: u.role,
                      agentId: u.agentId || '',
                      zucchettiPriceList: u.zucchettiPriceList || '',
                      customerType: u.customerType || '',
                      fido: u.fido || 0,
                      discount: u.discount || 0,
                      isElmarkCustomer: u.isElmarkCustomer,
                      elmarkDiscounts: u.elmarkDiscounts || {},
                      isActive: u.isActive
                    });
                    setIsModalOpen(true);
                  }}>Modifica</Button>
                  <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => handleDelete(u.id)} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Modifica Utente B2B" : "Nuovo Utente B2B"}
        size="full"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button variant="primary" onClick={handleSubmit} icon={<Check size={16} />}>Salva</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
          
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '1rem' }}>
            
            <div style={{ padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Cerca da Zucchetti (Ragione Sociale o P.IVA)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TextInput value={zucchettiSearch} onChange={e => setZucchettiSearch(e.target.value)} placeholder="Es. Ferramenta..." />
                <Button variant="secondary" onClick={searchZucchetti} icon={<Search size={16}/>}>Cerca</Button>
              </div>
              {zucchettiResults.length > 0 && (
                <div style={{ marginTop: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', maxHeight: '150px', overflowY: 'auto' }}>
                  {zucchettiResults.map((r, i) => (
                    <div key={i} onClick={() => handleSelectZucchettiCustomer(r)} style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{r.companyName} ({r.zucchettiCode})</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>P.IVA: {r.vatNumber} - Tipo: {r.customerType} - Sconto base: {r.discount}% - Fido: €{r.fido}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <TextInput label="Ragione Sociale" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} disabled />
              <TextInput label="Partita IVA" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} disabled />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <TextInput label="Codice Zucchetti" value={formData.zucchettiCode} onChange={e => setFormData({...formData, zucchettiCode: e.target.value})} disabled />
              <TextInput label="Listino Assegnato" value={formData.zucchettiPriceList} onChange={e => setFormData({...formData, zucchettiPriceList: e.target.value})} disabled />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <TextInput label="Tipo Cliente" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value})} disabled />
              <TextInput label="Sconto Applicato (%)" type="number" value={String(formData.discount)} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value)})} disabled />
              <TextInput label="Fido (€)" type="number" value={String(formData.fido)} onChange={e => setFormData({...formData, fido: parseFloat(e.target.value)})} disabled />
            </div>
            
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '1rem 0' }}></div>

            <TextInput label="Email (Login)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            <TextInput label={editingUser ? "Nuova Password" : "Password"} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ruolo B2B</label>
                <Select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} options={[
                  {value: 'USER', label: 'Utente B2B'},
                  {value: 'AGENT', label: 'Agente / Rappresentante'},
                  {value: 'ADMIN', label: 'Amministratore (Super Agente)'}
                ]} />
              </div>
              {formData.role === 'USER' && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Agente di Riferimento</label>
                  <Select value={formData.agentId} onChange={e => setFormData({...formData, agentId: e.target.value})} options={[
                    {value: '', label: '-- Nessun Agente --'},
                    ...agents.map(a => ({ value: a.id, label: a.companyName || a.email }))
                  ]} />
                </div>
              )}
            </div>

          </div>

          {/* Colonna Destra: Elmark */}
          <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', background: formData.isElmarkCustomer ? 'rgba(0,200,0,0.1)' : 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${formData.isElmarkCustomer ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={formData.isElmarkCustomer} onChange={e => setFormData({...formData, isElmarkCustomer: e.target.checked})} />
                Cliente ELMARK
              </label>
              
              {formData.isElmarkCustomer && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Imposta lo sconto dedicato (%) per le categorie Elmark.
                  </div>
                  {/* Esempio Categorie Elmark */}
                  {['Illuminazione', 'Spine e Prese', 'Cavi', 'Smart Home'].map(cat => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem' }}>{cat}</span>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                        value={formData.elmarkDiscounts[cat] || 0}
                        onChange={e => setFormData({
                          ...formData,
                          elmarkDiscounts: { ...formData.elmarkDiscounts, [cat]: parseFloat(e.target.value) }
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <style>{`
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .user-card {
          transition: transform 0.2s;
        }
        .user-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary);
        }
      `}</style>
    </>
  );
}
