import { useState, useEffect } from 'react';
import { Users, MousePointerClick, ShoppingCart, TrendingUp, Download } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import FunnelBar from '../components/ui/FunnelBar';
import LineChartGlass from '../components/ui/LineChartGlass';
import toast from 'react-hot-toast';
import { useStoreContext } from '../store/useStoreContext';
import AppSplashScreen from '../components/os/AppSplashScreen';
import './AnalyticsApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function AnalyticsApp() {
  const { currentStore } = useStoreContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [period, setPeriod] = useState<string>('7d');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `${API_URL}/api/admin/analytics/overview`;
        
        if (period !== 'all') {
          const endDate = new Date();
          const startDate = new Date();
          
          if (period === '7d') startDate.setDate(endDate.getDate() - 7);
          else if (period === '30d') startDate.setDate(endDate.getDate() - 30);
          else if (period === 'this_year') startDate.setMonth(0, 1);
          
          url += `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        }

        const response = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Store-Context': currentStore
          }
        });
        
        if (!response.ok) {
          throw new Error('Errore nel recupero dati analitici');
        }
        
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setTimeout(() => setIsAppReady(true), 400);
      }
    };
    
    fetchData();
  }, [period, currentStore]);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      
      const toastId = toast.loading('Generazione Report in corso...');
      
      const response = await fetch(`${API_URL}/api/admin/analytics/report`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Store-Context': currentStore
        }
      });
      
      const json = await response.json();
      if (response.ok) {
        toast.success('Report inviato correttamente al worker in background!', { id: toastId });
      } else {
        toast.error('Errore: ' + (json.error || 'Sconosciuto'), { id: toastId });
      }
    } catch (err: any) {
      toast.error('Errore di connessione al server.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (error) {
    return (
      <div className="analytics-loading" style={{ color: '#ef4444' }}>
        <p>Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className={`${!isAppReady ? 'eq-splash-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'transparent', overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Centro Analisi" 
        icon={<TrendingUp size={56} color="white" />} 
      />
      <div className={`eq-app-entry ${isAppReady && data ? 'ready' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {data && (
          <div className="analytics-container">
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-md)' }}>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)}
          className="ui-input"
          style={{ width: '200px', cursor: 'pointer', background: 'var(--color-glass)' }}
        >
          <option value="7d">Ultimi 7 Giorni</option>
          <option value="30d">Ultimi 30 Giorni</option>
          <option value="this_year">Quest'Anno</option>
          <option value="all">Sempre (Storico Completo)</option>
        </select>
      </div>

      <button 
        className="analytics-floating-btn" 
        onClick={handleGenerateReport}
        disabled={generatingReport}
      >
        <div className="analytics-floating-btn-glow"></div>
        <Download size={18} />
        <span>{generatingReport ? 'Generazione in corso...' : 'Genera Report PDF'}</span>
      </button>
      <div className="analytics-grid">
        <StatCard 
          title="Visite Totali (Shopify)" 
          value={data.overview.visits.toLocaleString()} 
          trend={data.overview.visitsTrend} 
          icon={<Users size={20} />} 
        />
        <StatCard 
          title="Conversion Rate (Shopify)" 
          value={`${data.overview.conversionRate}%`} 
          trend={data.overview.conversionTrend} 
          trendSuffix=" pt"
          icon={<MousePointerClick size={20} />} 
        />
        <StatCard 
          title="Entrate (Stimate)" 
          value={`€ ${data.overview.revenue.toLocaleString()}`} 
          trend={data.overview.revenueTrend} 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="Ordini (Database)" 
          value={data.overview.orders.toLocaleString()} 
          trend={data.overview.ordersTrend} 
          icon={<ShoppingCart size={20} />} 
        />
      </div>

      <div className="analytics-charts-row">
        {/* Main Chart */}
        <LineChartGlass 
          title="Andamento Visite e Vendite"
          subtitle="Ultimi 7 Giorni"
          data={data.trends}
          lines={[
            { dataKey: 'visits', name: 'Visite', stroke: '#3b82f6', fill: '#3b82f6' },
            { dataKey: 'sales', name: 'Vendite (€)', stroke: '#10b981', fill: '#10b981' }
          ]}
        />
        
        {/* Funnel Card */}
        <div className="analytics-card-glass">
          <h3 className="analytics-card-title">Funnel & Carrelli</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 'var(--spacing-xl)' }}>
            Dati ricavati da CartSyncQueue e Webhook.
          </p>
          <FunnelBar 
            visits={data.funnel.totalVisits}
            carts={data.funnel.totalCarts}
            abandoned={data.funnel.abandonedCarts}
            purchases={data.funnel.purchases}
          />
          
          <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Carrelli Recuperati:</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{data.funnel.recoveredCarts}</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
        )}
      </div>
    </div>
  );
}
