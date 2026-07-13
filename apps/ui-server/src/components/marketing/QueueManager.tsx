import { useState, useEffect } from 'react';
import GlassPanel from '../ui/GlassPanel';
import Badge from '../ui/Badge';
import Loader from '../ui/Loader';
import Tabs from '../ui/Tabs';
import './QueueManager.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function QueueManager() {
  const [activeTab, setActiveTab] = useState<'emails' | 'pushes' | 'carts'>('emails');
  const [jobs, setJobs] = useState<any[]>([]);
  const [pushes, setPushes] = useState<any[]>([]);
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      if (activeTab === 'emails') {
        const res = await fetch(`${API_URL}/api/v1/admin/marketing/jobs`);
        const json = await res.json();
        setJobs(json.data || []);
      } else if (activeTab === 'pushes') {
        const res = await fetch(`${API_URL}/api/v1/admin/marketing/pushes`);
        const json = await res.json();
        setPushes(json.data || []);
      } else if (activeTab === 'carts') {
        const res = await fetch(`${API_URL}/api/v1/admin/marketing/carts`);
        const json = await res.json();
        setCarts(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching queue data', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">Completato</Badge>;
      case 'PENDING': return <Badge variant="warning">In Attesa</Badge>;
      case 'FAILED': return <Badge variant="danger">Fallito</Badge>;
      case 'PROCESSING': return <Badge variant="primary">In Elaborazione</Badge>;
      case 'EMPTY': return <Badge variant="neutral">Vuoto</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Vuoi davvero eliminare ${selectedIds.size} elementi dalla coda?`)) return;

    try {
      // Per semplicità eliminiamo solo i marketing jobs.
      // Se si vogliono eliminare carts o pushes andrebbe estesa l'API.
      if (activeTab === 'emails') {
        await fetch(`${API_URL}/api/v1/admin/marketing/jobs`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedIds) })
        });
      }
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="queue-manager">
      <div className="queue-toolbar">
        <Tabs
          tabs={[
            { id: 'emails', label: 'Email PENDING' },
            { id: 'pushes', label: 'Push Notifications' },
            { id: 'carts', label: 'Carrelli' }
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
        <div className="queue-actions">
          <button className="btn btn-secondary" onClick={fetchData}>🔄 Aggiorna</button>
          {selectedIds.size > 0 && (
             <button className="btn btn-danger" onClick={deleteSelected}>🗑️ Rimuovi Spuntati ({selectedIds.size})</button>
          )}
        </div>
      </div>

      <GlassPanel className="marketing-table-container">
        {loading ? (
          <div className="marketing-loader"><Loader size="md" /></div>
        ) : (
          <table className="marketing-table">
            <thead>
              {activeTab === 'emails' && (
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" onChange={() => toggleSelectAll(jobs)} checked={jobs.length > 0 && selectedIds.size === jobs.length} />
                  </th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled For</th>
                  <th>Error</th>
                </tr>
              )}
              {activeTab === 'pushes' && (
                <tr>
                  <th style={{ width: '40px' }}><input type="checkbox" onChange={() => toggleSelectAll(pushes)} checked={pushes.length > 0 && selectedIds.size === pushes.length} /></th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled For</th>
                  <th>Device ID</th>
                </tr>
              )}
              {activeTab === 'carts' && (
                <tr>
                  <th style={{ width: '40px' }}><input type="checkbox" onChange={() => toggleSelectAll(carts)} checked={carts.length > 0 && selectedIds.size === carts.length} /></th>
                  <th>Customer ID</th>
                  <th>Stato</th>
                  <th>Sorgente</th>
                  <th>Ultimo Aggiornamento</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'emails' && jobs.length === 0 && <tr><td colSpan={5} className="empty-state">Nessun job trovato.</td></tr>}
              {activeTab === 'emails' && jobs.map(job => (
                <tr key={job.id}>
                  <td><input type="checkbox" checked={selectedIds.has(job.id)} onChange={() => toggleSelect(job.id)} /></td>
                  <td><strong>{job.jobType}</strong></td>
                  <td>{getStatusBadge(job.status)}</td>
                  <td>{new Date(job.scheduledFor).toLocaleString('it-IT')}</td>
                  <td className="error-text">{job.lastError || '-'}</td>
                </tr>
              ))}

              {activeTab === 'pushes' && pushes.length === 0 && <tr><td colSpan={5} className="empty-state">Nessun push trovato.</td></tr>}
              {activeTab === 'pushes' && pushes.map(push => (
                <tr key={push.id}>
                  <td><input type="checkbox" checked={selectedIds.has(push.id)} onChange={() => toggleSelect(push.id)} /></td>
                  <td><strong>{push.jobType}</strong></td>
                  <td>{getStatusBadge(push.status)}</td>
                  <td>{new Date(push.scheduledFor).toLocaleString('it-IT')}</td>
                  <td><span className="device-id">{push.deviceId.substring(0, 15)}...</span></td>
                </tr>
              ))}

              {activeTab === 'carts' && carts.length === 0 && <tr><td colSpan={5} className="empty-state">Nessun carrello trovato.</td></tr>}
              {activeTab === 'carts' && carts.map(cart => (
                <tr key={cart.id}>
                  <td><input type="checkbox" checked={selectedIds.has(cart.id)} onChange={() => toggleSelect(cart.id)} /></td>
                  <td><strong>{cart.customerId}</strong></td>
                  <td>{getStatusBadge(cart.status)}</td>
                  <td>{cart.source}</td>
                  <td>{new Date(cart.updatedAt).toLocaleString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassPanel>
    </div>
  );
}
