import { useEffect, useState } from 'react';
import AppSplashScreen from '../components/os/AppSplashScreen';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import Tabs from '../components/ui/Tabs';
import './MarketingApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

interface MarketingJob {
  id: string;
  jobType: string;
  status: string;
  scheduledFor: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  event?: any;
}

interface PushJob {
  id: string;
  jobType: string;
  status: string;
  deviceId: string;
  scheduledFor: string;
  payload: any;
  createdAt: string;
}

interface CartSync {
  id: string;
  customerId: string;
  status: string;
  source: string;
  cartPayload: any;
  updatedAt: string;
}

export function MarketingApp() {
  const [activeTab, setActiveTab] = useState<'emails' | 'pushes' | 'carts'>('emails');
  const [jobs, setJobs] = useState<MarketingJob[]>([]);
  const [pushes, setPushes] = useState<PushJob[]>([]);
  const [carts, setCarts] = useState<CartSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    fetchData().then(() => setIsAppReady(true));
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
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
      console.error('Error fetching marketing data', error);
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

  if (!isAppReady) {
    return <AppSplashScreen appName="Marketing" isLoading={true} icon="/icons/marketing.jpg" />;
  }

  return (
    <div className="marketing-app">
      <div className="marketing-header sticky-header glass-effect">
        <div className="marketing-title">
          <h2>📣 Marketing & Automations</h2>
          <p>Monitora le email di recupero carrello, le notifiche push e i carrelli abbandonati.</p>
        </div>
        <div className="marketing-tabs">
          <Tabs
            tabs={[
              { id: 'emails', label: 'Email Automations' },
              { id: 'pushes', label: 'Push Notifications' },
              { id: 'carts', label: 'Carrelli Abbandonati' }
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>
      </div>

      <div className="marketing-content">
        {loading ? (
          <div className="marketing-loader">
            <Loader size="lg" />
            <p>Caricamento dati in corso...</p>
          </div>
        ) : (
          <GlassPanel className="marketing-table-container">
            {activeTab === 'emails' && (
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled For</th>
                    <th>Attempts</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr><td colSpan={5} className="empty-state">Nessun job email trovato.</td></tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.id}>
                        <td><strong>{job.jobType}</strong></td>
                        <td>{getStatusBadge(job.status)}</td>
                        <td>{new Date(job.scheduledFor).toLocaleString('it-IT')}</td>
                        <td>{job.attempts}</td>
                        <td className="error-text">{job.lastError || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'pushes' && (
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled For</th>
                    <th>Device ID</th>
                  </tr>
                </thead>
                <tbody>
                  {pushes.length === 0 ? (
                    <tr><td colSpan={4} className="empty-state">Nessuna notifica push trovata.</td></tr>
                  ) : (
                    pushes.map(push => (
                      <tr key={push.id}>
                        <td><strong>{push.jobType}</strong></td>
                        <td>{getStatusBadge(push.status)}</td>
                        <td>{new Date(push.scheduledFor).toLocaleString('it-IT')}</td>
                        <td><span className="device-id">{push.deviceId.substring(0, 15)}...</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'carts' && (
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Stato</th>
                    <th>Sorgente</th>
                    <th>Ultimo Aggiornamento</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.length === 0 ? (
                    <tr><td colSpan={4} className="empty-state">Nessun carrello trovato.</td></tr>
                  ) : (
                    carts.map(cart => (
                      <tr key={cart.id}>
                        <td><strong>{cart.customerId}</strong></td>
                        <td>{getStatusBadge(cart.status)}</td>
                        <td>{cart.source}</td>
                        <td>{new Date(cart.updatedAt).toLocaleString('it-IT')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
