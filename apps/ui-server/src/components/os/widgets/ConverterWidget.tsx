import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { ArrowRightLeft } from 'lucide-react';

const WEIGHTS = { kg: 1, lbs: 2.20462, g: 1000, oz: 35.274 };
const LENGTHS = { m: 1, km: 0.001, cm: 100, inch: 39.3701, ft: 3.28084 };

export default function ConverterWidget({ widget }: { widget: DesktopWidget }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<'valute' | 'pesi' | 'distanze'>('valute');
  
  const [amount, setAmount] = useState<string>('1');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('USD');
  
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('https://api.frankfurter.app/latest?from=EUR');
        const data = await res.json();
        setRates({ EUR: 1, ...data.rates });
      } catch (e) {
        console.error('Failed to fetch rates', e);
      }
    }
    fetchRates();
  }, []);

  const handleCategoryChange = (cat: 'valute' | 'pesi' | 'distanze') => {
    setCategory(cat);
    if (cat === 'valute') { setFrom('EUR'); setTo('USD'); }
    if (cat === 'pesi') { setFrom('kg'); setTo('lbs'); }
    if (cat === 'distanze') { setFrom('m'); setTo('ft'); }
  };

  const getResult = () => {
    const val = parseFloat(amount) || 0;
    if (category === 'valute') {
      if (!rates[from] || !rates[to]) return '...';
      const inEur = val / rates[from];
      return (inEur * rates[to]).toFixed(2);
    }
    if (category === 'pesi') {
      const wRates = WEIGHTS as Record<string, number>;
      const base = val / wRates[from];
      return (base * wRates[to]).toFixed(2);
    }
    if (category === 'distanze') {
      const lRates = LENGTHS as Record<string, number>;
      const base = val / lRates[from];
      return (base * lRates[to]).toFixed(2);
    }
    return '0';
  };

  const renderDropdowns = () => {
    let options: string[] = [];
    if (category === 'valute') options = Object.keys(rates).sort();
    if (category === 'pesi') options = Object.keys(WEIGHTS);
    if (category === 'distanze') options = Object.keys(LENGTHS);

    return (
      <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center', margin: '8px 0' }}>
        <select value={from} onChange={e => setFrom(e.target.value)} style={{ flex: 1, padding: '4px', borderRadius: '4px' }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ArrowRightLeft size={16} style={{ cursor: 'pointer' }} onClick={() => { const f = from; setFrom(to); setTo(f); }} />
        <select value={to} onChange={e => setTo(e.target.value)} style={{ flex: 1, padding: '4px', borderRadius: '4px' }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="widget converter-widget" style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      
      {(!widget.size || widget.size === 'small') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, justifyContent: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px', fontWeight: 600 }}>CONVERTITORE</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{from}</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 300, marginTop: '8px' }}>
            {getResult()} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{to}</span>
          </div>
        </div>
      )}

      {(widget.size === 'medium' || widget.size === 'large') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['valute', 'pesi', 'distanze'].map(c => (
              <button 
                key={c}
                onClick={() => handleCategoryChange(c as any)}
                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: 'none', background: category === c ? 'var(--color-primary)' : 'var(--color-surface-solid)', color: category === c ? 'white' : 'var(--color-text)', textTransform: 'capitalize', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {c}
              </button>
            ))}
          </div>
          
          {renderDropdowns()}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginTop: '8px' }}>
             <input 
               type="number" 
               value={amount} 
               onChange={e => setAmount(e.target.value)} 
               style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-solid)', color: 'var(--color-text)', fontSize: '1.2rem' }}
             />
             <div style={{ fontSize: '2rem', fontWeight: 200 }}>=</div>
             <div style={{ flex: 1, padding: '12px', background: 'transparent', fontSize: '1.5rem', fontWeight: 600 }}>
               {getResult()}
             </div>
          </div>

          {widget.size === 'large' && category === 'valute' && Object.keys(rates).length > 0 && (
            <div style={{ marginTop: '16px', flex: 1, borderTop: '1px solid var(--color-border-glass)', paddingTop: '16px', overflowY: 'auto' }}>
               <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px' }}>PRINCIPALI (da {from})</div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 {['USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'].map(cur => (
                   cur !== from && rates[cur] && (
                     <div key={cur} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--color-surface-solid)', borderRadius: '4px' }}>
                       <span style={{ fontWeight: 600 }}>{cur}</span>
                       <span>{(((parseFloat(amount) || 1) / rates[from]) * rates[cur]).toFixed(2)}</span>
                     </div>
                   )
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
