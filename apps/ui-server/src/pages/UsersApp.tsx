import { useState, useEffect } from 'react';
import { Users, ShieldAlert, KeyRound, Plus, Trash2, Edit2, Check, X, Shield, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import Switch from '../components/ui/Switch';
import Modal from '../components/ui/Modal';
import { getUser, UserState } from '../utils/permissions';
import './UsersApp.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-gateway-production-2ec6.up.railway.app';

interface UserData {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
  lastLogin: string | null;
  createdAt: string;
  isRoot: boolean;
  permissions: any;
  rawPassword?: string | null;
}

const APPS_LIST = [
  { id: 'orders', name: 'Gestione Ordini' },
  { id: 'products', name: 'Catalogo Prodotti' },
  { id: 'settings', name: 'Centro Sincronizzazione' },
  { id: 'equalizzatore', name: 'Equalizzatore' },
  { id: 'marketing', name: 'Centro Marketing' },
  { id: 'promo-manual', name: 'Promozioni AI (Manuale)' },
  { id: 'promo_auto', name: 'Sconti Automatici' },
  { id: 'infinity', name: 'Infinity' },
  { id: 'images', name: 'Immagini Asset' },
  { id: 'typesense', name: 'Typesense' },
  { id: 'analytics', name: 'Centro Analisi' }
];

export default function UsersApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'OPERATOR',
    allowedStores: ['RETAIL', 'B2B'],
    appPermissions: {} as Record<string, { view: boolean; write: boolean }>
  });

  useEffect(() => {
    setCurrentUser(getUser());
    const timer = setTimeout(() => setIsAppReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAppReady) {
      fetchUsers();
    }
  }, [isAppReady]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error('Errore caricamento utenti');
      }
    } catch (err) {
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      displayName: '',
      role: 'OPERATOR',
      allowedStores: ['RETAIL'],
      appPermissions: {}
    });
    setEditingUser(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Non precompilata, solo se vuole cambiarla
      displayName: user.displayName || '',
      role: user.role,
      allowedStores: user.permissions?.allowedStores || ['RETAIL'],
      appPermissions: user.permissions?.apps || {}
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${username}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Utente eliminato');
        fetchUsers();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Errore durante eliminazione');
      }
    } catch (err) {
      toast.error('Errore di connessione');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || (formData.password.length < 6 && !editingUser)) {
      toast.error('Dati incompleti o password troppo corta (minimo 6)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const payload: any = {
        username: formData.username,
        displayName: formData.displayName || formData.username,
        role: formData.role,
        permissions: {
          allowedStores: formData.allowedStores,
          apps: formData.appPermissions
        }
      };
      
      if (formData.password) {
         payload.password = formData.password;
      }

      const url = editingUser 
        ? `${API_URL}/api/auth/users/${editingUser.id}` 
        : `${API_URL}/api/auth/users`;
        
      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingUser ? 'Utente aggiornato' : 'Utente creato con successo');
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Errore salvataggio utente');
      }
    } catch (err) {
      toast.error('Errore di connessione');
    }
  };

  const toggleAppPermission = (appId: string, type: 'view' | 'write') => {
    setFormData(prev => {
      const currentApp = prev.appPermissions[appId] || { view: false, write: false };
      
      const newApp = { ...currentApp, [type]: !currentApp[type] };
      // Se do il write, forza la view
      if (type === 'write' && newApp.write) {
        newApp.view = true;
      }
      // Se tolgo view, tolgo anche write
      if (type === 'view' && !newApp.view) {
        newApp.write = false;
      }

      return {
        ...prev,
        appPermissions: {
          ...prev.appPermissions,
          [appId]: newApp
        }
      };
    });
  };

  const toggleStore = (storeId: string) => {
    setFormData(prev => {
      const stores = new Set(prev.allowedStores);
      if (stores.has(storeId)) stores.delete(storeId);
      else stores.add(storeId);
      return { ...prev, allowedStores: Array.from(stores) };
    });
  };

  const isRoleAdmin = currentUser?.role === 'ADMIN';
  const roleOptions = isRoleAdmin 
    ? [{ value: 'OPERATOR', label: 'Operatore' }, { value: 'AGENT', label: 'Agente' }, { value: 'VIEWER', label: 'Visitatore' }]
    : [
        { value: 'MASTER', label: 'Master' },
        { value: 'ADMIN', label: 'Amministratore' },
        { value: 'OPERATOR', label: 'Operatore' },
        { value: 'AGENT', label: 'Agente' },
        { value: 'VIEWER', label: 'Visitatore' }
      ];

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Gestione Utenti" icon={<Users size={48} color="white" />} />
      <div className="users-app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
        <StickyHeader 
          title="Gestione Sistema e Accessi" 
          rightContent={
             <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
               Nuovo Utente
             </Button>
          }
        />
        
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex-center" style={{ height: '200px', color: 'var(--color-text-muted)' }}>Caricamento utenti...</div>
          ) : (
            <div className="users-grid">
              {users.map(u => (
                <GlassPanel key={u.id} className="user-card" padding="1.5rem">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: u.isRoot ? 'var(--color-warning)' : 'var(--color-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.isRoot ? '#000' : 'var(--color-text-main)'
                      }}>
                        {u.isRoot ? <ShieldAlert size={20} /> : <Users size={20} />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{u.displayName}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>@{u.username}</span>
                      </div>
                    </div>
                    <Badge color={u.role === 'MASTER' ? 'warning' : u.role === 'ADMIN' ? 'primary' : 'success'}>
                      {u.role}
                    </Badge>
                  </div>
                  
                  {currentUser?.role === 'MASTER' && u.rawPassword && (
                    <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <KeyRound size={14} color="var(--color-text-muted)" />
                      <span>Pass: <code style={{ userSelect: 'all', background: 'transparent', padding: 0 }}>{u.rawPassword}</code></span>
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    Ultimo accesso: {u.lastLogin ? new Date(u.lastLogin).toLocaleString('it-IT') : 'Mai'}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <Button variant="secondary" size="small" icon={<Edit2 size={14} />} onClick={() => openEditModal(u)} style={{ flex: 1 }}>
                      Modifica
                    </Button>
                    {!u.isRoot && (currentUser?.role === 'MASTER' || (currentUser?.role === 'ADMIN' && u.createdById === currentUser.id)) && (
                      <Button variant="danger" size="small" icon={<Trash2 size={14} />} onClick={() => handleDeleteUser(u.id, u.username)} />
                    )}
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Modifica Utente' : 'Nuovo Utente'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '600px', maxWidth: '90vw' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextInput 
              label="Nome Visualizzato" 
              value={formData.displayName} 
              onChange={e => setFormData({...formData, displayName: e.target.value})} 
              placeholder="Es. Mario Rossi"
            />
            <TextInput 
              label="Username (Login)" 
              value={formData.username} 
              onChange={e => setFormData({...formData, username: e.target.value})} 
              placeholder="mario.rossi"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select 
              label="Ruolo"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              options={roleOptions}
            />
            <TextInput 
              label={editingUser ? "Nuova Password (lascia vuoto per non cambiare)" : "Password"} 
              type="password"
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Minimo 6 caratteri"
              required={!editingUser}
            />
          </div>

          {['OPERATOR', 'AGENT', 'VIEWER', 'ADMIN'].includes(formData.role) && formData.role !== 'MASTER' && (
            <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} color="var(--color-primary)" /> Permessi Aziende
              </h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.allowedStores.includes('RETAIL')} onChange={() => toggleStore('RETAIL')} />
                  ARCHELIA (Retail)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.allowedStores.includes('B2B')} onChange={() => toggleStore('B2B')} />
                  IZZO B2B
                </label>
              </div>
            </div>
          )}

          {['OPERATOR', 'AGENT', 'VIEWER', 'ADMIN'].includes(formData.role) && formData.role !== 'MASTER' && (
            <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AppWindow size={16} color="var(--color-primary)" /> Accesso Applicazioni
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {APPS_LIST.map(app => (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{app.name}</span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.appPermissions[app.id]?.view || false} onChange={() => toggleAppPermission(app.id, 'view')} />
                        Vedi
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.appPermissions[app.id]?.write || false} onChange={() => toggleAppPermission(app.id, 'write')} />
                        Scrivi
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button type="submit" variant="primary" icon={<Check size={16} />}>Salva Utente</Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .user-card {
          display: flex;
          flex-direction: column;
          height: 220px;
        }
      `}</style>
    </>
  );
}
