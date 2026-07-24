import { useState, useEffect } from 'react';
import { Users, MousePointerClick, ShoppingCart, TrendingUp, Download } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import FunnelBar from '../components/ui/FunnelBar';
import LineChartGlass from '../components/ui/LineChartGlass';
import StickyHeader from '../components/ui/StickyHeader';
import './AnalyticsApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function AnalyticsApp() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/analytics/overview`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
      }
    };
    
    fetchData();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await fetch(`${API_URL}/api/admin/analytics/report`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const json = await response.json();
      if (response.ok) {
        alert('Richiesta inviata! Il worker-analytics sta generando il PDF in background.');
      } else {
        alert('Errore: ' + (json.error || 'Sconosciuto'));
      }
    } catch (err: any) {
      alert('Errore di connessione al server.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="analytics-spinner" />
        <p>Analisi in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-loading" style={{ color: '#ef4444' }}>
        <p>Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <StickyHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Centro Analisi</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Overview delle performance (Ibrido: Shopify + Neon DB)</p>
          </div>
          <button 
            className="ui-button primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleGenerateReport}
            disabled={generatingReport}
          >
            <Download size={16} />
            {generatingReport ? 'Invio in corso...' : 'Genera PDF'}
          </button>
        </div>
      </StickyHeader>
      
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
  );
}
