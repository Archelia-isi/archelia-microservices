import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { TrendingUp, TrendingDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


export default function FinanceWidget({ widget }: { widget: DesktopWidget }) {
  const [data, setData] = useState<any[]>([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/finance/quote?symbols=AAPL,MSFT,TSLA,EURUSD=X,BTC-USD`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const results = json.quoteResponse?.result || [];
          if (results.length > 0) {
            setData(results.map((r: any) => ({
              symbol: r.symbol,
              name: r.shortName || r.longName || r.symbol,
              price: r.regularMarketPrice || 0,
              change: r.regularMarketChange || 0,
              changePercent: r.regularMarketChangePercent || 0
            })));
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      // Fallback
      setData([
        { symbol: 'AAPL', name: 'Apple Inc.', price: 189.43, change: +1.24, changePercent: +0.66 },
        { symbol: 'MSFT', name: 'Microsoft', price: 420.55, change: -2.10, changePercent: -0.50 },
        { symbol: 'TSLA', name: 'Tesla', price: 175.22, change: +8.40, changePercent: +5.03 },
        { symbol: 'EUR/USD', name: 'Euro / Dollaro', price: 1.08, change: -0.001, changePercent: -0.09 },
        { symbol: 'BTC', name: 'Bitcoin', price: 65430.00, change: +1200.50, changePercent: +1.87 },
      ]);
    };
    
    fetchFinance();
  }, [token]);

  const renderStock = (stock: any, showName: boolean = true) => {
    const isUp = stock.change >= 0;
    const color = isUp ? 'var(--color-success)' : 'var(--color-danger)';
    const Icon = isUp ? TrendingUp : TrendingDown;

    return (
      <div key={stock.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--color-surface-solid)', borderRadius: '8px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{stock.symbol}</span>
          {showName && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{stock.name}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 600 }}>{stock.price.toFixed(2)}</span>
          <span style={{ fontSize: '0.85rem', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon size={14} />
            {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>
    );
  };

  const renderSquareCard = (stock: any) => {
    const isUp = stock.change >= 0;
    const color = isUp ? 'var(--color-success)' : 'var(--color-danger)';
    const Icon = isUp ? TrendingUp : TrendingDown;

    return (
      <div key={stock.symbol} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'var(--color-surface-solid)', borderRadius: '12px', flex: 1 }}>
         <div style={{ alignSelf: 'flex-end', fontWeight: 600, fontSize: '1.2rem' }}>{stock.price.toFixed(2)}</div>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
           <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stock.symbol}</span>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color, fontSize: '0.8rem' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Icon size={12} /> {isUp ? '+' : ''}{stock.change.toFixed(2)}</span>
             <span>({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)</span>
           </div>
         </div>
      </div>
    );
  };

  if (data.length === 0) return <div className="widget flex-center">Caricamento...</div>;

  return (
    <div className="widget finance-widget" style={{ width: '100%', height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {(!widget.size || widget.size === 'small') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px', fontWeight: 600 }}>MERCATI</div>
          {renderSquareCard(data[0])}
        </div>
      )}

      {widget.size === 'medium' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '8px', fontWeight: 600 }}>MERCATI & VALUTE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
            {renderSquareCard(data[0])}
            {renderSquareCard(data[2])}
          </div>
        </div>
      )}

      {widget.size === 'large' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '8px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>MERCATI GLOBALI</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>Mercato Aperto</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
            {data.map(stock => renderStock(stock, true))}
          </div>
        </div>
      )}

    </div>
  );
}
