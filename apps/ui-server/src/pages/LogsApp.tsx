import { useState, useEffect } from 'react';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import LogViewer, { type LogEntry } from '../components/ui/LogViewer';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStoreContext } from '../store/useStoreContext';

const APPS_LIST = [
  { id: 'api-gateway', label: 'API Gateway' },
  { id: 'webhook-receiver', label: 'Webhook Receiver' },
  { id: 'ai-chatbot-service', label: 'AI Chatbot' },
  { id: 'worker-zucchetti-pull', label: 'Zucchetti Pull' },
  { id: 'worker-shopify-push', label: 'Shopify Push' },
  { id: 'worker-orders-customers', label: 'Orders & Cust.' },
  { id: 'worker-equalizzatore', label: 'Equalizzatore' },
  { id: 'worker-marketing', label: 'Marketing' },
  { id: 'worker-promo', label: 'Promo Brain' },
  { id: 'worker-analytics', label: 'Analytics' },
  { id: 'ui-server', label: 'UI Server' }
];

export default function LogsApp() {
  const { currentStore } = useStoreContext();
  const [activeTab, setActiveTab] = useState(APPS_LIST[0].id);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

  const fetchLogs = async (category: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // For api-gateway we also want to catch api-gateway:customers etc.
      // But the backend `/api/admin/logs?category=` matches exact category.
      // We will let the backend handle exact matches for now.
      const res = await fetch(`${API_URL}/api/admin/logs?category=${category}&limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Store-Context': currentStore
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
  }, [activeTab, currentStore]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'transparent'
    }}>
      <StickyHeader paddingY="sm" backgroundOpacity={0}>
        <div style={{ padding: '0 var(--spacing-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <GlassPanel padding="sm" radius="lg" style={{ display: 'flex', alignItems: 'center', flex: 1, overflowX: 'auto', marginRight: 'var(--spacing-md)' }}>
            <Tabs
              tabs={APPS_LIST.map(app => ({
                id: app.id,
                label: app.label
              }))}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id.toString())}
            />
          </GlassPanel>
          <GlassPanel padding="sm" radius="lg">
            <Button 
              variant="primary" 
              size="sm"
              icon={<RefreshCcw size={14} className={loading ? 'spin' : ''} />}
              onClick={() => fetchLogs(activeTab)}
              disabled={loading}
              style={{ margin: 0 }}
            >
              Aggiorna
            </Button>
          </GlassPanel>
        </div>
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
