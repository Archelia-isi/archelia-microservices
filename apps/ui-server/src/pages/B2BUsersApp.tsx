import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Check, Search, Wallet, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

interface FidoSummary {
  fidoEnabled: boolean;
  fidoConcesso: number;
  fidoPaymentType?: string;
  fidoUtilizzato: number;
  fidoDisponibile: number;
  unpaidOrdersGross: number;
  manualPaymentsTotal: number;
  isOverFido: boolean;
  overFidoAmount: number;
  usagePct: number;
}

const FIDO_PAYMENT_OPTIONS = [
  { value: '', label: '-- Seleziona Tipo di Pagamento --' },
  { value: '30GG', label: '30 gg' },
  { value: '60GG', label: '60 gg' },
  { value: '90GG', label: '90 gg' },
  { value: '30_60GG', label: '30 / 60 gg' },
  { value: '30_60_90GG', label: '30 / 60 / 90 gg' },
  { value: '30GG_FM', label: '30 gg Fine Mese' },
  { value: '60GG_FM', label: '60 gg Fine Mese' },
  { value: '90GG_FM', label: '90 gg Fine Mese' },
  { value: '30_60GG_FM', label: '30 / 60 gg Fine Mese' },
  { value: '30_60_90GG_FM', label: '30 / 60 / 90 gg Fine Mese' },
];

function getPaymentTypeLabel(code?: string | null): string {
  if (!code) return '';
  const found = FIDO_PAYMENT_OPTIONS.find((o) => o.value === code);
  return found ? found.label : code;
}

interface B2BUser {
  id: string;
  username: string;
  email?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  vatNumber?: string;
  zucchettiCode?: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
  agentId?: string;
  zucchettiPriceList?: string;
  customerType?: string;
  fidoEnabled?: boolean;
  fido?: number;
  fidoPaymentType?: string | null;
  fidoSummary?: FidoSummary;
  discount?: number;
  address?: string;
  city?: string;
  zip?: string;
  province?: string;
  phone?: string;
  isElmarkCustomer: boolean;
  elmarkDiscounts?: any;
  isActive: boolean;
}

export default function B2BUsersApp() {
  const [users, setUsers] = useState<B2BUser[]>([]);
  const [agents, setAgents] = useState<B2BUser[]>([]);
  const [elmarkGroups, setElmarkGroups] = useState<{id: string, label: string}[]>([]);
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<string>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<B2BUser | null>(null);
  const [isUsernameEditable, setIsUsernameEditable] = useState(false);

  // Stato Gestione Fido & Pagamenti per il cliente selezionato
  const [fidoDetails, setFidoDetails] = useState<{
    fidoSummary: FidoSummary;
    orders: Array<{
      id: string;
      createdAt: string;
      storeMode: string;
      zucchettiOrderRef?: string | null;
      totalAmount: number;
      totalIva: number;
      totalGross: number;
      paidAmount: number;
      remainingGross: number;
      isPaid: boolean;
      paidAt?: string | null;
      movements?: Array<{
        id: string;
        orderId?: string | null;
        amount: number;
        note?: string | null;
        createdAt: string;
      }>;
    }>;
    movements: Array<{
      id: string;
      orderId?: string | null;
      amount: number;
      note?: string | null;
      createdAt: string;
    }>;
  } | null>(null);
  const [isLoadingFido, setIsLoadingFido] = useState(false);
  const [fidoInput, setFidoInput] = useState<string>('0');
  const [orderPartialInputs, setOrderPartialInputs] = useState<
    Record<string, { amount: string; note: string }>
  >({});
  
  const defaultForm = {
    username: '',
    email: '',
    password: '',
    tempPassword: '',
    mustChangePassword: false,
    firstName: '',
    lastName: '',
    companyName: '',
    vatNumber: '',
    zucchettiCode: '',
    role: 'USER' as 'USER' | 'AGENT' | 'ADMIN',
    agentId: '',
    zucchettiPriceList: '',
    customerType: '',
    fidoEnabled: false,
    fido: 0,
    fidoPaymentType: '',
    discount: 0,
    address: '',
    city: '',
    zip: '',
    province: '',
    phone: '',
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
      
      // Fetch Elmark Groups
      try {
        const elRes = await fetch(`${API_URL}/api/admin/b2b-users/elmark-groups`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const elData = await elRes.json();
        if (elData.success && elData.groups) {
          const ELMARK_LABELS: Record<string, string> = {
            'E1': 'Electrical Part 1',
            'E2': 'Electrical Part 2',
            'L': 'Lighting',
            'C': 'Cables',
            'F': 'Fixtures'
          };
          setElmarkGroups(elData.groups.map((g: any) => ({
             id: g.id,
             label: ELMARK_LABELS[g.id] || g.id
          })));
        }
      } catch(e) {}

      setIsAppReady(true);
    } catch (e) {
      toast.error('Errore nel caricamento degli utenti B2B');
    }
  };

  const searchZucchetti = async () => {
    if (zucchettiSearch.length < 3) return;
    try {
      const token = localStorage.getItem('token');
      const typeParam = formData.role === 'AGENT' ? '&type=AGENT' : formData.role === 'ADMIN' ? '&type=ADMIN' : '';
      const url = `${API_URL}/api/admin/zucchetti/customers/search?q=${encodeURIComponent(zucchettiSearch)}${typeParam}`;
      const res = await fetch(url, {
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

  const handleSelectZucchettiCustomer = async (c: any) => {
    // 1. Controllo Codice Zucchetti duplicato
    if (c.zucchettiCode) {
      try {
        const res = await fetch(`${API_URL}/api/admin/b2b-users/check-zucchetti?code=${c.zucchettiCode}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const json = await res.json();
        if (json.exists) {
          toast.error('Questo cliente ha già un account B2B!');
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Generazione Username Univoco
    let baseUsername = (c.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    if (!baseUsername) baseUsername = 'user';
    let finalUsername = baseUsername;
    let counter = 0;
    let isAvailable = false;
    
    toast.loading('Verifica username...', { id: 'check-u' });
    while (!isAvailable && counter < 50) { // max 50 tentativi di fallback
       try {
         const res = await fetch(`${API_URL}/api/admin/b2b-users/check-username?u=${encodeURIComponent(finalUsername)}`, {
           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
         });
         
         if (!res.ok) {
            console.error('Errore API check-username:', await res.text());
            isAvailable = true; // Usciamo dal loop per non bloccare tutto
            break;
         }
         
         const json = await res.json();
         if (json.available) {
           isAvailable = true;
         } else {
           counter++;
           finalUsername = `${baseUsername}.${counter}`;
         }
       } catch (e) {
         console.error('Eccezione di rete:', e);
         isAvailable = true; // Fallback in caso di errore di rete
       }
    }
    toast.dismiss('check-u');

    let matchedAgentId = formData.agentId;
    if (c.zucchettiAgentCode) {
      const foundAgent = agents.find(a => a.zucchettiCode === c.zucchettiAgentCode);
      if (foundAgent) {
        matchedAgentId = foundAgent.id;
        toast.success(`Agente auto-assegnato: ${foundAgent.companyName || foundAgent.username}`);
      }
    }

    setFormData({
      ...formData,
      username: finalUsername,
      password: formData.password || (!editingUser ? Math.random().toString(36).slice(-8) : ''),
      companyName: c.companyName || '',
      vatNumber: c.vatNumber || '',
      zucchettiCode: c.zucchettiCode || '',
      zucchettiPriceList: c.zucchettiPriceList || '',
      customerType: c.customerType || '',
      fido: formData.fido || 0, // Gestito internamente in Archelia OS, non importato da Zucchetti
      agentId: matchedAgentId,
      discount: c.discount || 0,
      address: c.address || '',
      city: c.city || '',
      zip: c.zip || '',
      province: c.province || '',
      phone: c.phone || '',
      email: c.email || formData.email
    });
    toast.success('Dati e Username precompilati!');
    setZucchettiResults([]);
    setZucchettiSearch('');
  };

  const fetchUserFidoDetails = async (userId: string) => {
    setIsLoadingFido(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users/${userId}/fido-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFidoDetails(data);
      }
    } catch (e) {
      console.error('Errore caricamento dettagli fido:', e);
    } finally {
      setIsLoadingFido(false);
    }
  };

  const handleSaveFidoSettings = async () => {
    if (!editingUser) return;
    const parsedFido = parseFloat(String(fidoInput).replace(',', '.'));
    const cleanFido = isNaN(parsedFido) ? 0 : Math.max(0, Math.round(parsedFido * 100) / 100);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users/${editingUser.id}/fido-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fidoEnabled: Boolean(formData.fidoEnabled),
          fido: cleanFido,
          fidoPaymentType: formData.fidoPaymentType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio fido');
      setFormData((prev) => ({
        ...prev,
        fidoEnabled: Boolean(formData.fidoEnabled),
        fido: cleanFido,
      }));
      setFidoInput(String(cleanFido));
      setFidoDetails({
        fidoSummary: data.fidoSummary,
        orders: data.orders,
        movements: data.movements,
      });
      toast.success('Configurazione Fido e Tipo Pagamento salvati!');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Errore salvataggio fido');
    }
  };

  const handleToggleOrderPaid = async (orderId: string) => {
    if (!editingUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users/${editingUser.id}/orders/${orderId}/toggle-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore aggiornamento ordine');
      setFidoDetails({
        fidoSummary: data.fidoSummary,
        orders: data.orders,
        movements: data.movements,
      });
      toast.success('Stato pagamento ordine aggiornato!');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Errore aggiornamento pagamento');
    }
  };

  const handleAddOrderPartialPayment = async (orderId: string) => {
    if (!editingUser) return;
    const entry = orderPartialInputs[orderId] || { amount: '', note: '' };
    const amountNum = parseFloat(String(entry.amount).replace(',', '.'));
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Inserisci un importo parziale valido in €');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/api/admin/b2b-users/${editingUser.id}/orders/${orderId}/partial-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amountNum,
            note: entry.note?.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore registrazione pagamento parziale');
      setFidoDetails({
        fidoSummary: data.fidoSummary,
        orders: data.orders,
        movements: data.movements,
      });
      setOrderPartialInputs((prev) => ({
        ...prev,
        [orderId]: { amount: '', note: '' },
      }));
      toast.success('Pagamento parziale registrato sull\'ordine!');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Errore registrazione pagamento parziale');
    }
  };

  const handleDeleteFidoPayment = async (movementId: string) => {
    if (!editingUser) return;
    if (!confirm('Eliminare questo pagamento parziale?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/b2b-users/${editingUser.id}/fido-movements/${movementId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione pagamento');
      setFidoDetails({
        fidoSummary: data.fidoSummary,
        orders: data.orders,
        movements: data.movements,
      });
      toast.success('Pagamento parziale rimosso');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Errore eliminazione');
    }
  };

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setFidoDetails(null);
    setOrderPartialInputs({});
    const initialFido = Number(u.fido) || 0;
    const initialFidoEnabled = u.fidoEnabled !== undefined ? Boolean(u.fidoEnabled) : initialFido > 0;
    setFidoInput(String(initialFido));
    setFormData({
      username: u.username || '',
      email: u.email || '',
      password: '',
      tempPassword: u.tempPassword || '',
      mustChangePassword: u.mustChangePassword || false,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      companyName: u.companyName || '',
      vatNumber: u.vatNumber || '',
      zucchettiCode: u.zucchettiCode || '',
      role: u.role,
      agentId: u.agentId || '',
      zucchettiPriceList: u.zucchettiPriceList || '',
      customerType: u.customerType || '',
      fidoEnabled: initialFidoEnabled,
      fido: initialFido,
      fidoPaymentType: u.fidoPaymentType || '',
      discount: u.discount || 0,
      address: u.address || '',
      city: u.city || '',
      zip: u.zip || '',
      province: u.province || '',
      phone: u.phone || '',
      isElmarkCustomer: u.isElmarkCustomer,
      elmarkDiscounts: u.elmarkDiscounts || {},
      isActive: u.isActive
    });
    setIsModalOpen(true);
    if (u.role === 'USER' && u.id) {
      fetchUserFidoDetails(u.id);
    }
  };

  const handleSubmit = async () => {
    if (!formData.username || (!editingUser && !formData.password)) {
      toast.error('Username e password sono obbligatori');
      return;
    }
    
    const token = localStorage.getItem('token');
    const url = editingUser 
      ? `${API_URL}/api/admin/b2b-users/${editingUser.id}` 
      : `${API_URL}/api/admin/b2b-users`;
      
    try {
      const parsedFido = parseFloat(String(fidoInput).replace(',', '.'));
      const payload: any = {
        ...formData,
        fidoEnabled: Boolean(formData.fidoEnabled),
        fido: isNaN(parsedFido) ? 0 : Math.max(0, Math.round(parsedFido * 100) / 100),
        fidoPaymentType: formData.fidoPaymentType || null,
      };
      if (payload.agentId === '') delete payload.agentId;
      if (payload.email === '') delete payload.email;
      if (isNaN(payload.fido)) payload.fido = 0;
      if (isNaN(payload.discount)) payload.discount = 0;
      delete payload.mustChangePassword; // not in schema
      delete payload.tempPassword; // not in schema
      
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

  const filteredUsers = users.filter((u) => {
    const isFidoActiveForUser = Boolean(u.fidoSummary?.fidoEnabled ?? u.fidoEnabled) && (u.fidoSummary?.fidoConcesso || u.fido || 0) > 0;
    if (activeFilterTab === 'WITH_FIDO') {
      if (u.role !== 'USER' || !isFidoActiveForUser) return false;
    } else if (activeFilterTab === 'OVER_FIDO') {
      if (u.role !== 'USER' || !u.fidoSummary?.isOverFido) return false;
    } else if (activeFilterTab === 'AGENTS') {
      if (u.role === 'USER') return false;
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.trim().toLowerCase();
      const matchName = (u.companyName || '').toLowerCase().includes(q);
      const matchUser = (u.username || '').toLowerCase().includes(q);
      const matchVat = (u.vatNumber || '').toLowerCase().includes(q);
      const matchCode = (u.zucchettiCode || '').toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchVat && !matchCode) return false;
    }
    return true;
  });

  const overFidoCount = users.filter((u) => u.role === 'USER' && u.fidoSummary?.isOverFido).length;
  const withFidoCount = users.filter(
    (u) =>
      u.role === 'USER' &&
      Boolean(u.fidoSummary?.fidoEnabled ?? u.fidoEnabled) &&
      (u.fidoSummary?.fidoConcesso || u.fido || 0) > 0
  ).length;

  // Calcolo live nel modal al variare del Fido Concesso e del Check Fido
  const parsedInputFido = parseFloat(String(fidoInput).replace(',', '.'));
  const liveFidoAmount = isNaN(parsedInputFido) ? 0 : Math.max(0, Math.round(parsedInputFido * 100) / 100);
  const liveFidoConcesso = formData.fidoEnabled ? liveFidoAmount : 0;
  const liveFidoUtilizzato = fidoDetails?.fidoSummary?.fidoUtilizzato || 0;
  const liveRawDisponibile = liveFidoConcesso - liveFidoUtilizzato;
  const liveFidoDisponibile = formData.fidoEnabled ? Math.max(0, Math.round(liveRawDisponibile * 100) / 100) : 0;
  const liveIsOverFido = Boolean(formData.fidoEnabled) && liveFidoConcesso > 0 && liveRawDisponibile < 0;
  const liveOverFidoAmount = liveIsOverFido ? Math.round(Math.abs(liveRawDisponibile) * 100) / 100 : 0;

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Utenti B2B" icon={<Users size={32} />} />
      
      <StickyHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <Tabs
            activeTab={activeFilterTab}
            onChange={(id) => setActiveFilterTab(String(id))}
            tabs={[
              { id: 'ALL', label: `Tutti (${users.length})` },
              { id: 'WITH_FIDO', label: `Con Fido (${withFidoCount})`, icon: <Wallet size={14} /> },
              { id: 'OVER_FIDO', label: `Oltre Fido (${overFidoCount})`, icon: <AlertTriangle size={14} /> },
              { id: 'AGENTS', label: 'Agenti / Admin' },
            ]}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: '220px' }}>
              <TextInput
                placeholder="Cerca ragione sociale, P.IVA..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => {
              setEditingUser(null);
              setFidoDetails(null);
              setOrderPartialInputs({});
              setFidoInput('0');
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
            {filteredUsers.map(u => {
              const fs = u.fidoSummary;
              const fidoEnabled = Boolean(fs?.fidoEnabled ?? u.fidoEnabled);
              const fidoConcesso = fidoEnabled ? (fs?.fidoConcesso ?? (u.fido || 0)) : 0;
              const paymentLabel = getPaymentTypeLabel(fs?.fidoPaymentType || u.fidoPaymentType);
              const fidoUtilizzato = fs?.fidoUtilizzato ?? 0;
              const fidoDisponibile = fs?.fidoDisponibile ?? Math.max(0, fidoConcesso - fidoUtilizzato);
              const isOverFido = fs?.isOverFido ?? false;
              const overFidoAmount = fs?.overFidoAmount ?? 0;
              const usagePct = fs?.usagePct ?? 0;
              const barColor = isOverFido
                ? 'var(--color-danger, #ef4444)'
                : usagePct >= 80
                ? 'var(--color-warning, #f59e0b)'
                : 'var(--color-success, #10b981)';

              return (
              <div 
                key={u.id} 
                className="user-card" 
                onClick={() => handleEditUser(u)}
                style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${isOverFido ? 'var(--color-danger, #ef4444)' : 'var(--color-border)'}`, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'AGENT' ? 'warning' : 'primary'}>{u.role}</Badge>
                    {u.isElmarkCustomer && <Badge variant="success">ELMARK</Badge>}
                  </div>
                  {u.role === 'USER' && isOverFido && (
                    <Badge variant="danger">OLTRE FIDO (-€ {overFidoAmount.toFixed(2)})</Badge>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{u.companyName || u.username}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}><strong>User:</strong> {u.username}</div>
                {u.email && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Email: {u.email}</div>}

                {u.role === 'USER' && (
                  <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-text-muted)' }}>
                        <Wallet size={12} /> FIDO (IVA incl.)
                      </span>
                      <span>
                        {fidoEnabled ? (
                          <>Concesso: <strong>€ {fidoConcesso.toFixed(2)}</strong></>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Non attivo</span>
                        )}
                      </span>
                    </div>
                    {paymentLabel && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Pagamento: {paymentLabel}
                      </div>
                    )}
                    {fidoEnabled && fidoConcesso > 0 ? (
                      <>
                        <div style={{ width: '100%', height: '6px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                          <div style={{ width: `${Math.min(100, usagePct)}%`, height: '100%', background: barColor, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            Impegnato: <strong>€ {fidoUtilizzato.toFixed(2)}</strong>
                          </span>
                          <span style={{ fontWeight: 700, color: isOverFido ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #10b981)' }}>
                            {isOverFido ? `Sforato: -€ ${overFidoAmount.toFixed(2)}` : `Disp: € ${fidoDisponibile.toFixed(2)}`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{fidoEnabled ? 'Importo fido € 0.00' : 'Fido disattivato'}</span>
                        {fidoUtilizzato > 0 && (
                          <span>Da saldare: <strong>€ {fidoUtilizzato.toFixed(2)}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <Button variant="secondary" icon={<Edit2 size={14} />} onClick={(e) => {
                    e.stopPropagation();
                    handleEditUser(u);
                  }}>Modifica</Button>
                  <Button variant="danger" icon={<Trash2 size={14} />} onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(u.id);
                  }} />
                </div>
              </div>
            )})}
          </div>
        </GlassPanel>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Modifica Utente B2B" : "Nuovo Utente B2B"}
        size="xl"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button variant="primary" onClick={handleSubmit} icon={<Check size={16} />}>Salva</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
          
          <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '1rem', paddingBottom: '1rem' }}>
            
            <div style={{ padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. Seleziona Ruolo B2B</label>
                <Select value={formData.role} onChange={e => {
                  setFormData({...formData, role: e.target.value as any});
                  setZucchettiSearch('');
                  setZucchettiResults([]);
                }} options={[
                  {value: 'USER', label: 'Utente B2B (Cliente Standard)'},
                  {value: 'AGENT', label: 'Agente / Rappresentante'},
                  {value: 'ADMIN', label: 'Amministratore (Super Agente)'}
                ]} />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', margin: '1rem 0' }}></div>
              
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                2. Cerca anagrafica da Zucchetti {formData.role === 'AGENT' ? '(Agenti)' : formData.role === 'ADMIN' ? '(Persone)' : '(Clienti)'}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TextInput value={zucchettiSearch} onChange={e => setZucchettiSearch(e.target.value)} placeholder="Es. Ferramenta..." />
                <Button variant="secondary" onClick={searchZucchetti} icon={<Search size={16}/>}>Cerca</Button>
              </div>
              {zucchettiResults.length > 0 && (
                <div style={{ marginTop: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', maxHeight: '150px', overflowY: 'auto' }}>
                  {zucchettiResults.map((r, i) => (
                    <div key={i} onClick={() => handleSelectZucchettiCustomer(r)} style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{r.companyName} ({r.zucchettiCode})</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>P.IVA: {r.vatNumber} - Tipo: {r.customerType} - Sconto base: {r.discount}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}><TextInput label="Ragione Sociale" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Partita IVA" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Codice Zucchetti" value={formData.zucchettiCode} onChange={e => setFormData({...formData, zucchettiCode: e.target.value})} disabled /></div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 2 }}><TextInput label="Indirizzo" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Località" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} disabled /></div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}><TextInput label="CAP" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Provincia" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Telefono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Email Anagrafica" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}><TextInput label="Tipo Cliente" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Listino Assegnato" value={formData.zucchettiPriceList} onChange={e => setFormData({...formData, zucchettiPriceList: e.target.value})} disabled /></div>
              <div style={{ flex: 1 }}><TextInput label="Sconto Applicato (%)" type="number" value={String(formData.discount)} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value)})} disabled /></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <TextInput label="Username (Login)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!isUsernameEditable} required />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setIsUsernameEditable(!isUsernameEditable)} icon={<Edit2 size={16} />}>
                    Modifica
                  </Button>
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                {!editingUser ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <TextInput label="Password Provvisoria" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setFormData({...formData, password: Math.random().toString(36).slice(-8)})}>
                      Genera
                    </Button>
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Stato Password</div>
                    {editingUser.tempPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>In attesa di primo accesso: </span>
                          <strong style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{editingUser.tempPassword}</strong>
                        </div>
                        <Button size="sm" type="button" variant="danger" onClick={async () => {
                          toast.loading('Reset in corso...', { id: 'reset' });
                          try {
                            const res = await fetch(`${API_URL}/api/admin/b2b-users/${editingUser.id}/reset-password`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });
                            const json = await res.json();
                            toast.dismiss('reset');
                            if (json.success) {
                              setEditingUser({...editingUser, tempPassword: json.tempPassword});
                              toast.success('Password resettata!');
                            }
                          } catch(e) {
                            toast.dismiss('reset');
                            toast.error('Errore');
                          }
                        }}>Rigenera</Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Badge variant="success">Configurata dall'utente (Privata)</Badge>
                        <Button size="sm" type="button" variant="danger" onClick={async () => {
                          if(!confirm('Attenzione: sovrascriverai la password privata dell\'utente con una provvisoria. Procedere?')) return;
                          toast.loading('Reset in corso...', { id: 'reset' });
                          try {
                            const res = await fetch(`${API_URL}/api/admin/b2b-users/${editingUser.id}/reset-password`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });
                            const json = await res.json();
                            toast.dismiss('reset');
                            if (json.success) {
                              setEditingUser({...editingUser, tempPassword: json.tempPassword});
                              toast.success('Password resettata e resa provvisoria!');
                            }
                          } catch(e) {
                            toast.dismiss('reset');
                            toast.error('Errore');
                          }
                        }}>Forza Reset</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {formData.role === 'USER' && formData.zucchettiCode && (
              <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>3. Assegnazione Agente</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <Select value={formData.agentId} onChange={e => setFormData({...formData, agentId: e.target.value})} options={[
                      {value: '', label: '-- Nessun Agente --'},
                      ...agents.map(a => ({ value: a.id, label: a.companyName || a.username }))
                    ]} />
                  </div>
                  <div style={{ flex: 2, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Seleziona l'agente a cui assegnare questo cliente per la visibilità ordini e sconti.
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'USER' && (
              <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Wallet size={16} /> 4. Gestione Fido &amp; Stato Pagamenti (Totale IVA Inclusa)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {formData.fidoEnabled ? (
                      <Badge variant="success">FIDO ATTIVO</Badge>
                    ) : (
                      <Badge variant="neutral">FIDO DISATTIVATO</Badge>
                    )}
                    {liveIsOverFido && (
                      <Badge variant="danger">CLIENTE OLTRE FIDO (-€ {liveOverFidoAmount.toFixed(2)})</Badge>
                    )}
                  </div>
                </div>

                {/* Barra Configurazione Fido: Check Attivazione + Importo Fido Modificabile + Tipo di Pagamento */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: editingUser ? 'auto 1fr 1.2fr auto' : 'auto 1fr 1.2fr',
                    gap: '0.75rem',
                    alignItems: 'end',
                    padding: '0.85rem',
                    background: 'var(--color-surface-hover)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${formData.fidoEnabled ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: formData.fidoEnabled ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
                      border: `1px solid ${formData.fidoEnabled ? 'var(--color-success, #10b981)' : 'var(--color-border)'}`,
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(formData.fidoEnabled)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fidoEnabled: e.target.checked,
                        }))
                      }
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    Attiva Fido
                  </label>

                  <div>
                    <TextInput
                      label="Fido Concesso (€ IVA incl.)"
                      type="text"
                      inputMode="decimal"
                      placeholder="Es. 5000"
                      value={fidoInput}
                      onFocus={() => {
                        if (fidoInput === '0') setFidoInput('');
                      }}
                      onBlur={() => {
                        if (fidoInput.trim() === '') setFidoInput('0');
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFidoInput(val);
                        const num = parseFloat(val.replace(',', '.'));
                        setFormData((prev) => ({
                          ...prev,
                          fido: isNaN(num) ? 0 : Math.max(0, num),
                          fidoEnabled: !isNaN(num) && num > 0 ? true : prev.fidoEnabled,
                        }));
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '0.35rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Tipo di Pagamento
                    </label>
                    <Select
                      value={formData.fidoPaymentType || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fidoPaymentType: e.target.value,
                        }))
                      }
                      options={FIDO_PAYMENT_OPTIONS}
                    />
                  </div>

                  {editingUser && (
                    <Button
                      type="button"
                      variant="primary"
                      icon={<Check size={15} />}
                      onClick={handleSaveFidoSettings}
                    >
                      Salva Fido
                    </Button>
                  )}
                </div>

                {/* Riepilogo Numerico Live */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fido Concesso</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      {formData.fidoEnabled ? `€ ${liveFidoConcesso.toFixed(2)}` : 'Disattivato (€ 0.00)'}
                    </div>
                    {formData.fidoPaymentType && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                        {getPaymentTypeLabel(formData.fidoPaymentType)}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ordini da Saldare (IVA incl.)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      € {(fidoDetails?.fidoSummary?.unpaidOrdersGross || 0).toFixed(2)}
                    </div>
                    {(fidoDetails?.fidoSummary?.manualPaymentsTotal || 0) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-success, #10b981)', fontWeight: 600, marginTop: '0.15rem' }}>
                        Acconti versati: € {(fidoDetails?.fidoSummary?.manualPaymentsTotal || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fido Impegnato (Residuo)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>€ {liveFidoUtilizzato.toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: `1px solid ${liveIsOverFido ? 'var(--color-danger, #ef4444)' : 'var(--color-border)'}` }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {liveIsOverFido ? 'Sforamento Fido' : 'Fido Disponibile'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem', color: liveIsOverFido ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #10b981)' }}>
                      {!formData.fidoEnabled
                        ? '€ 0.00'
                        : liveIsOverFido
                        ? `-€ ${liveOverFidoAmount.toFixed(2)}`
                        : `€ ${liveFidoDisponibile.toFixed(2)}`}
                    </div>
                  </div>
                </div>

                {editingUser && (
                  isLoadingFido ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                      Caricamento ordini e pagamenti...
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', background: 'var(--color-surface-hover)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                          Ordini Approvati del Cliente ({fidoDetails?.orders?.length || 0}) — Gestione Saldo e Pagamento Parziale per Ordine
                        </div>
                      </div>
                      {(!fidoDetails?.orders || fidoDetails.orders.length === 0) ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Nessun ordine approvato presente per questo cliente.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '320px', overflowY: 'auto' }}>
                          {fidoDetails.orders.map((ord) => {
                            const ordInput = orderPartialInputs[ord.id] || { amount: '', note: '' };
                            const paidAmt = Number(ord.paidAmount) || 0;
                            const remAmt =
                              ord.remainingGross !== undefined
                                ? Number(ord.remainingGross)
                                : Math.max(0, ord.totalGross - paidAmt);
                            const isPartial = !ord.isPaid && paidAmt > 0;

                            return (
                              <div
                                key={ord.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  padding: '0.65rem 0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--color-surface)',
                                  border: `1px solid ${
                                    ord.isPaid
                                      ? 'var(--color-border)'
                                      : isPartial
                                      ? 'var(--color-primary)'
                                      : 'var(--color-border)'
                                  }`,
                                  opacity: ord.isPaid ? 0.78 : 1,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, flexWrap: 'wrap' }}>
                                      <span>#{ord.id.slice(-6).toUpperCase()}</span>
                                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                                        ({new Date(ord.createdAt).toLocaleDateString('it-IT')})
                                      </span>
                                      <Badge variant={ord.isPaid ? 'success' : isPartial ? 'primary' : 'warning'}>
                                        {ord.isPaid
                                          ? 'Saldato'
                                          : isPartial
                                          ? `Parziale (Versato € ${paidAmt.toFixed(2)})`
                                          : 'Da saldare'}
                                      </Badge>
                                      {ord.zucchettiOrderRef && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                          Doc: {ord.zucchettiOrderRef}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                      <span>
                                        Totale IVA incl.: <strong style={{ color: 'var(--color-text)' }}>€ {ord.totalGross.toFixed(2)}</strong>
                                      </span>
                                      {!ord.isPaid && paidAmt > 0 && (
                                        <>
                                          <span style={{ color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
                                            Acconto versato: € {paidAmt.toFixed(2)}
                                          </span>
                                          <span style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 700 }}>
                                            Residuo da saldare: € {remAmt.toFixed(2)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    {!ord.isPaid && (
                                      <>
                                        <div style={{ width: '130px' }}>
                                          <TextInput
                                            type="text"
                                            inputMode="decimal"
                                            placeholder={`Parziale € (max ${remAmt.toFixed(2)})`}
                                            value={ordInput.amount}
                                            onChange={(e) =>
                                              setOrderPartialInputs((prev) => ({
                                                ...prev,
                                                [ord.id]: {
                                                  ...(prev[ord.id] || { amount: '', note: '' }),
                                                  amount: e.target.value,
                                                },
                                              }))
                                            }
                                          />
                                        </div>
                                        <div style={{ width: '150px' }}>
                                          <TextInput
                                            placeholder="Nota (es. Bonifico)"
                                            value={ordInput.note}
                                            onChange={(e) =>
                                              setOrderPartialInputs((prev) => ({
                                                ...prev,
                                                [ord.id]: {
                                                  ...(prev[ord.id] || { amount: '', note: '' }),
                                                  note: e.target.value,
                                                },
                                              }))
                                            }
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          icon={<Plus size={13} />}
                                          onClick={() => handleAddOrderPartialPayment(ord.id)}
                                        >
                                          Acconto
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={ord.isPaid ? 'secondary' : 'primary'}
                                      icon={ord.isPaid ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                                      onClick={() => handleToggleOrderPaid(ord.id)}
                                    >
                                      {ord.isPaid ? 'Riapri' : 'Segna Saldato'}
                                    </Button>
                                  </div>
                                </div>

                                {/* Elenco acconti parziali registrati su questo specifico ordine */}
                                {ord.movements && ord.movements.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--color-border)' }}>
                                    {ord.movements.map((mov) => (
                                      <div
                                        key={mov.id}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: 'var(--radius-sm)',
                                          background: 'var(--color-surface-hover)',
                                          border: '1px solid var(--color-border)',
                                          fontSize: '0.73rem',
                                        }}
                                      >
                                        <strong style={{ color: 'var(--color-success, #10b981)' }}>
                                          + € {Number(mov.amount).toFixed(2)}
                                        </strong>
                                        <span style={{ color: 'var(--color-text-muted)' }}>
                                          ({new Date(mov.createdAt).toLocaleDateString('it-IT')})
                                        </span>
                                        {mov.note && <span>• {mov.note}</span>}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFidoPayment(mov.id)}
                                          title="Elimina pagamento parziale"
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--color-danger, #ef4444)',
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
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
                  {elmarkGroups.map(cat => (
                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem' }}>{cat.label} ({cat.id})</span>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                        value={formData.elmarkDiscounts[cat.id] || 0}
                        onChange={e => setFormData({
                          ...formData,
                          elmarkDiscounts: { ...formData.elmarkDiscounts, [cat.id]: parseFloat(e.target.value) }
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
