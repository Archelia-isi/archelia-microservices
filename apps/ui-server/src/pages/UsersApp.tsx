import { useState, useEffect } from 'react';
import { Users, ShieldAlert, KeyRound, Plus, Trash2, Edit2, Check, Shield, AppWindow } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { getUser } from '../utils/permissions';
import type { UserState } from '../utils/permissions';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

interface UserData {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
  lastLogin: string | null;
  createdAt: string;
  isRoot: boolean;
  permissions: any;
  createdById: string | null;
  rawPassword?: string | null;
}

const APPS_LIST = [
  { id: 'orders', name: 'Gestione Ordini', processes: [{id: 'view', label: 'Visualizza'}, {id: 'manage_status', label: 'Gestisci Stati'}, {id: 'refund', label: 'Rimborsi'}, {id: 'delete', label: 'Elimina'}] },
  { id: 'products', name: 'Catalogo Prodotti', processes: [{id: 'view', label: 'Visualizza'}, {id: 'edit', label: 'Modifica'}, {id: 'delete', label: 'Elimina'}, {id: 'sync_zucchetti', label: 'Sync Zucchetti'}] },
  { id: 'settings', name: 'Centro Sincronizzazione', processes: [{id: 'view', label: 'Visualizza'}, {id: 'trigger_sync', label: 'Avvia Sync'}, {id: 'edit_config', label: 'Configura'}] },
  { id: 'equalizzatore', name: 'Equalizzatore', processes: [{id: 'view', label: 'Visualizza'}, {id: 'approve_fields', label: 'Approva Campi'}, {id: 'regenerate_ai', label: 'Rigenera AI'}, {id: 'lock_items', label: 'Blocca Articoli'}] },
  { id: 'marketing', name: 'Centro Marketing', processes: [{id: 'view', label: 'Visualizza'}, {id: 'edit_templates', label: 'Modifica Template'}, {id: 'send_campaigns', label: 'Invia Campagne'}] },
  { id: 'promo-manual', name: 'Promozioni AI (Manuale)', processes: [{id: 'view', label: 'Visualizza'}, {id: 'create_promo', label: 'Crea Promo'}, {id: 'delete_promo', label: 'Elimina Promo'}] },
  { id: 'promo_auto', name: 'Sconti Automatici', processes: [{id: 'view', label: 'Visualizza'}, {id: 'edit_rules', label: 'Modifica Regole'}, {id: 'toggle_autopilot', label: 'Autopilot'}] },
  { id: 'infinity', name: 'Infinity', processes: [{id: 'view', label: 'Visualizza'}, {id: 'download_invoices', label: 'Scarica Fatture'}, {id: 'sync_customers', label: 'Sincronizza Clienti'}] },
  { id: 'images', name: 'Immagini Asset', processes: [{id: 'view', label: 'Visualizza'}, {id: 'upload', label: 'Carica'}, {id: 'delete', label: 'Elimina'}] },
  { id: 'typesense', name: 'Typesense', processes: [{id: 'view', label: 'Visualizza'}, {id: 'reindex', label: 'Re-indicizza'}, {id: 'manage_schema', label: 'Gestisci Schema'}] },
  { id: 'analytics', name: 'Centro Analisi', processes: [{id: 'view', label: 'Visualizza'}, {id: 'export_pdf', label: 'Esporta PDF'}, {id: 'manage_tracking', label: 'Gestisci Tracking'}] }
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
    appPermissions: {} as Record<string, Record<string, boolean>>
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

  const getPresetPermissions = (role: string) => {
    const newPerms: Record<string, Record<string, boolean>> = {};
    
    if (role === 'MASTER' || role === 'ADMIN') {
      APPS_LIST.forEach(app => {
        newPerms[app.id] = {};
        app.processes.forEach(p => {
          newPerms[app.id][p.id] = true;
        });
      });
    } else if (role === 'VIEWER') {
      APPS_LIST.forEach(app => {
        newPerms[app.id] = {};
        app.processes.forEach(p => {
          newPerms[app.id][p.id] = p.id === 'view';
        });
      });
    } else if (role === 'OPERATOR') {
      APPS_LIST.forEach(app => {
        newPerms[app.id] = {};
        app.processes.forEach(p => {
          if (p.id === 'view') {
            newPerms[app.id][p.id] = true;
          } else if (['manage_status', 'edit', 'approve_fields', 'lock_items'].includes(p.id)) {
            newPerms[app.id][p.id] = true;
          } else {
            newPerms[app.id][p.id] = false;
          }
        });
      });
    } else if (role === 'AGENT') {
      ['orders', 'products', 'analytics'].forEach(appId => {
        newPerms[appId] = { view: true };
      });
    }
    return newPerms;
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      displayName: '',
      role: 'OPERATOR',
      allowedStores: ['RETAIL'],
      appPermissions: getPresetPermissions('OPERATOR')
    });
    setEditingUser(null);
  };

  const handleRoleChange = (newRole: string) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      appPermissions: getPresetPermissions(newRole)
    }));
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    
    const initialPerms = user.permissions?.apps || getPresetPermissions(user.role);
    
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      role: user.role,
      allowedStores: user.permissions?.allowedStores || ['RETAIL'],
      appPermissions: initialPerms
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

  const toggleAppProcess = (appId: string, processId: string) => {
    if (formData.role === 'VIEWER' && processId !== 'view') return; // VIEWER non può editare nient'altro

    setFormData(prev => {
      const currentApp = prev.appPermissions[appId] || {};
      const newValue = !currentApp[processId];
      
      const newApp = { ...currentApp, [processId]: newValue };
      
      // Se do un permesso operativo, forza la view
      if (processId !== 'view' && newValue) {
        newApp.view = true;
      }
      
      // Se tolgo view, tolgo automaticamente tutti gli altri permessi
      if (processId === 'view' && !newValue) {
        Object.keys(newApp).forEach(key => {
          newApp[key] = false;
        });
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

  const isRoleAdmin = currentUser?.role === 'ADMIN' && !currentUser?.isRoot;
  const roleOptions = isRoleAdmin 
    ? [{ value: 'OPERATOR', label: 'Operatore' }, { value: 'AGENT', label: 'Agente' }, { value: 'VIEWER', label: 'Visitatore' }]
    : [
        { value: 'MASTER', label: 'Master' },
        { value: 'ADMIN', label: 'Amministratore' },
        { value: 'OPERATOR', label: 'Operatore' },
        { value: 'AGENT', label: 'Agente' },
        { value: 'VIEWER', label: 'Visitatore' }
      ];

  const isViewer = formData.role === 'VIEWER';

  return (
    <>
      <AppSplashScreen isLoading={!isAppReady} appName="Gestione Utenti" icon={<Users size={48} color="white" />} />
      <div className="users-app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
        <StickyHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Gestione Sistema e Accessi</div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
              Nuovo Utente
            </Button>
          </div>
        </StickyHeader>
        
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex-center" style={{ height: '200px', color: 'var(--color-text-muted)' }}>Caricamento utenti...</div>
          ) : (
            <div className="users-grid">
              {users.map(u => (
                <GlassPanel key={u.id} className="user-card" padding="md">
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
                    <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => openEditModal(u)} style={{ flex: 1 }}>
                      Modifica
                    </Button>
                    {!u.isRoot && (currentUser?.role === 'MASTER' || (currentUser?.role === 'ADMIN' && u.createdById === currentUser.id)) && (
                      <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDeleteUser(u.id, u.username)} />
                    )}
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--color-background)',
            width: '1200px', maxWidth: '95vw', height: '90vh',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{editingUser ? 'Modifica Utente' : 'Nuovo Utente'}</h2>
            </div>
            
            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', display: 'flex', gap: '2rem' }}>
              
              {/* Colonna Sinistra: Dati Base */}
              <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ruolo</label>
                  <Select 
                    value={formData.role}
                    onChange={e => handleRoleChange(e.target.value)}
                    options={roleOptions}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Cambiando ruolo verranno pre-caricati i permessi ideali per quel livello.
                  </div>
                </div>

                <TextInput 
                  label={editingUser ? "Nuova Password (lascia vuoto per non cambiare)" : "Password"} 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder="Minimo 6 caratteri"
                  required={!editingUser}
                />

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
              </div>

              {/* Colonna Destra: Permessi Granulari */}
              {['OPERATOR', 'AGENT', 'VIEWER', 'ADMIN'].includes(formData.role) && formData.role !== 'MASTER' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <AppWindow size={18} color="var(--color-primary)" /> Processi Applicativi (Configurazione Avanzata)
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {APPS_LIST.map(app => (
                      <div key={app.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>{app.name}</div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                          {app.processes.map(proc => {
                            const isChecked = formData.appPermissions[app.id]?.[proc.id] || false;
                            // Se il ruolo è VIEWER, e il processo NON è 'view', disabilita
                            const isDisabled = isViewer && proc.id !== 'view';

                            return (
                              <label key={proc.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', 
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.4 : 1
                              }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  disabled={isDisabled}
                                  onChange={() => toggleAppProcess(app.id, proc.id)} 
                                />
                                {proc.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formData.role === 'MASTER' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                    <ShieldAlert size={48} color="var(--color-warning)" />
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--color-warning)' }}>Accesso Illimitato</h3>
                      <p style={{ maxWidth: '400px', marginTop: '0.5rem' }}>Il ruolo MASTER possiede l'accesso assoluto a tutte le aziende e a tutti i processi applicativi. Nessuna restrizione può essere applicata.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
              <Button variant="primary" icon={<Check size={16} />} onClick={handleSubmit}>Salva Utente</Button>
            </div>
          </div>
        </div>
      )}

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
