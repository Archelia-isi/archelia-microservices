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

  const stopProp = (e: any) => e.stopPropagation();

  const renderDropdowns = (isSmall = false) => {
    let options: string[] = [];
    if (category === 'valute') options = Object.keys(rates).sort();
    if (category === 'pesi') options = Object.keys(WEIGHTS);
    if (category === 'distanze') options = Object.keys(LENGTHS);

    return (
      <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center', margin: isSmall ? '4px 0' : '8px 0' }}>
        <select 
          value={from} 
          onMouseDown={stopProp} 
          onChange={e => setFrom(e.target.value)} 
          style={{ flex: 1, padding: isSmall ? '2px' : '4px', borderRadius: '4px', fontSize: isSmall ? '0.8rem' : '1rem', minWidth: 0, outline: 'none', cursor: 'pointer' }}
          className="nodrag"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ArrowRightLeft size={isSmall ? 12 : 16} style={{ cursor: 'pointer', flexShrink: 0 }} onMouseDown={stopProp} onClick={() => { const f = from; setFrom(to); setTo(f); }} />
        <select 
          value={to} 
          onMouseDown={stopProp} 
          onChange={e => setTo(e.target.value)} 
          style={{ flex: 1, padding: isSmall ? '2px' : '4px', borderRadius: '4px', fontSize: isSmall ? '0.8rem' : '1rem', minWidth: 0, outline: 'none', cursor: 'pointer' }}
          className="nodrag"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  };

  const renderOtherRates = () => {
    let options: string[] = [];
    let calcObj: Record<string, number> = {};
    
    if (category === 'valute') {
      options = ['USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
      calcObj = rates;
    } else if (category === 'pesi') {
      options = Object.keys(WEIGHTS);
      calcObj = WEIGHTS;
    } else if (category === 'distanze') {
      options = Object.keys(LENGTHS);
      calcObj = LENGTHS;
    }

    // Filter out current 'from' and 'to' and missing rates
    const validOptions = options.filter(o => o !== from && o !== to && calcObj[o] !== undefined);
    
    if (validOptions.length === 0) return null;

    return (
      <div style={{ marginTop: '16px', flex: 1, borderTop: '1px solid var(--color-border-glass)', paddingTop: '16px', overflowY: 'auto' }}>
         <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px' }}>ALTRE CONVERSIONI DI {amount} {from}</div>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
           {validOptions.map(opt => {
             let converted = 0;
             const val = parseFloat(amount) || 1;
             
             if (category === 'valute') {
               converted = (val / calcObj[from]) * calcObj[opt];
             } else {
               converted = (val / calcObj[from]) * calcObj[opt];
             }
             
             return (
               <div key={opt} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--color-surface-solid)', borderRadius: '6px' }}>
                 <span style={{ fontWeight: 600 }}>{opt}</span>
                 <span>{converted.toFixed(2)}</span>
               </div>
             );
           })}
         </div>
      </div>
    );
  };

  return (
    <div className="widget converter-widget" style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      
      {(!widget.size || widget.size === 'small') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 600 }}>CONVERTITORE</div>
             <select 
               value={category} 
               onChange={e => handleCategoryChange(e.target.value as any)} 
               onMouseDown={stopProp}
               className="nodrag"
               style={{ fontSize: '0.7rem', padding: '2px', borderRadius: '4px', border: 'none', background: 'var(--color-surface-solid)', outline: 'none' }}
             >
               <option value="valute">Valute</option>
               <option value="pesi">Pesi</option>
               <option value="distanze">Distanze</option>
             </select>
          </div>
          
          {renderDropdowns(true)}

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
            <input 
              type="number" 
              value={amount} 
              onMouseDown={stopProp}
              onChange={e => setAmount(e.target.value)} 
              className="nodrag"
              style={{ flex: 1, padding: '4px', minWidth: 0, borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>=</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: '4px' }}>
              {getResult()} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{to}</span>
            </span>
          </div>
        </div>
      )}

      {(widget.size === 'medium' || widget.size === 'large') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {['valute', 'pesi', 'distanze'].map(c => (
              <button 
                key={c}
                onMouseDown={stopProp}
                onClick={() => handleCategoryChange(c as any)}
                className="nodrag"
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: category === c ? 'var(--color-primary)' : 'var(--color-surface-solid)', color: category === c ? 'white' : 'var(--color-text)', textTransform: 'capitalize', fontSize: '0.8rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                {c}
              </button>
            ))}
          </div>
          
          {renderDropdowns()}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginTop: '4px', minHeight: 0 }}>
             <input 
               type="number" 
               value={amount} 
               onMouseDown={stopProp}
               onChange={e => setAmount(e.target.value)} 
               className="nodrag"
               style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-solid)', color: 'var(--color-text)', fontSize: '1.2rem', outline: 'none' }}
             />
             <div style={{ fontSize: '1.8rem', fontWeight: 200, flexShrink: 0 }}>=</div>
             <div style={{ flex: 1, minWidth: 0, padding: '8px', background: 'transparent', fontSize: '1.4rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
               {getResult()}
             </div>
          </div>

          {widget.size === 'large' && renderOtherRates()}
        </div>
      )}

    </div>
  );
}
