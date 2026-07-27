import { useState, useEffect } from 'react';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import LogViewer, { type LogEntry } from '../components/ui/LogViewer';
import { Terminal, RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const APPS_LIST = [
  { id: 'ui-server', label: 'UI Server' },
  { id: 'api-gateway', label: 'API Gateway' },
  { id: 'webhook-receiver', label: 'Webhook Receiver' },
  { id: 'ai-chatbot-service', label: 'AI Chatbot' },
  { id: 'worker-zucchetti-pull', label: 'Zucchetti Pull' },
  { id: 'worker-shopify-push', label: 'Shopify Push' },
  { id: 'worker-orders-customers', label: 'Orders & Cust.' },
  { id: 'worker-equalizzatore', label: 'Equalizzatore' },
  { id: 'worker-marketing', label: 'Marketing' },
  { id: 'worker-promo', label: 'Promo Brain' },
  { id: 'worker-analytics', label: 'Analytics' }
];

export default function LogsApp() {
  const [activeTab, setActiveTab] = useState(APPS_LIST[0].id);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

  const fetchLogs = async (category: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/logs?category=${category}&limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Errore nel recupero dei log');
      }
      const data = await res.json();
      setLogs(data.entries || []);
    } catch (error) {
      console.error(error);
      toast.error('Errore nel recupero dei log per ' + category);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(activeTab);
  }, [activeTab]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      <StickyHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={24} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>System Logs</h2>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => fetchLogs(activeTab)}
            disabled={loading}
          >
            <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            Aggiorna
          </button>
        </div>
        <Tabs
          tabs={APPS_LIST.map(app => ({
            id: app.id,
            label: app.label
          }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id.toString())}
        />
      </StickyHeader>

      <div style={{ flex: 1, padding: 'var(--spacing-md)', overflow: 'hidden' }}>
        <LogViewer 
          logs={logs} 
          loading={loading} 
          emptyMessage={`Nessun log recente trovato per il microservizio: ${activeTab}`} 
        />
      </div>
    </div>
  );
}
