import { useState } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Delete, Divide, Minus, Plus, X as MultiplyIcon } from 'lucide-react';

export default function CalculatorWidget({ widget }: { widget: DesktopWidget }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);
  
  // For Small Size
  const [smallInput, setSmallInput] = useState('');

  const handleSmallEval = () => {
    try {
      // Unsafe eval is generally bad, but for a simple desktop calculator we'll use a safer approach using Function
      const result = new Function('return ' + smallInput)();
      if (Number.isFinite(result)) {
        setSmallInput(String(result));
      } else {
        setSmallInput('Errore');
      }
    } catch (e) {
      setSmallInput('Errore');
    }
  };

  const handleNum = (num: string) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOp = (op: string) => {
    const currentVal = parseFloat(display);
    if (equation.endsWith('+ ') || equation.endsWith('- ') || equation.endsWith('* ') || equation.endsWith('/ ')) {
      if (isNewNumber) {
        setEquation(equation.slice(0, -2) + op + ' ');
        return;
      }
    }
    
    const newEquation = equation + currentVal + ' ' + op + ' ';
    setEquation(newEquation);
    setIsNewNumber(true);
  };

  const handleEval = () => {
    try {
      const fullEq = equation + display;
      const result = new Function('return ' + fullEq)();
      setDisplay(String(result));
      setEquation('');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Errore');
      setEquation('');
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  const handleDelete = () => {
    if (isNewNumber) return;
    if (display.length === 1) {
      setDisplay('0');
      setIsNewNumber(true);
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const renderSmall = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px' }}>Calcolo rapido</div>
      <input 
        type="text" 
        value={smallInput}
        onChange={e => setSmallInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSmallEval()}
        placeholder="es. 24*15"
        style={{ 
          width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--color-border)', background: 'var(--color-surface-solid)', 
          color: 'var(--color-text)', fontSize: '1.2rem', textAlign: 'right' 
        }}
      />
    </div>
  );

  const renderMedium = (isLarge: boolean = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-surface-solid)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.7, minHeight: '1.2rem' }}>{equation}</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'right' }}>{display}</div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: isLarge ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '8px', flex: 2 }}>
        {isLarge && (
          <>
            <button className="calc-btn advanced" onClick={() => setDisplay(String(Math.sin(parseFloat(display))))}>sin</button>
            <button className="calc-btn advanced" onClick={() => setDisplay(String(Math.cos(parseFloat(display))))}>cos</button>
            <button className="calc-btn advanced" onClick={() => setDisplay(String(Math.tan(parseFloat(display))))}>tan</button>
            <button className="calc-btn advanced" onClick={() => setDisplay(String(Math.log(parseFloat(display))))}>log</button>
            <button className="calc-btn advanced" onClick={() => setDisplay(String(Math.sqrt(parseFloat(display))))}>√</button>
          </>
        )}
        
        <button className="calc-btn action" onClick={handleClear}>C</button>
        <button className="calc-btn action" onClick={handleDelete}><Delete size={18} /></button>
        <button className="calc-btn action" onClick={() => handleOp('/')}><Divide size={18} /></button>
        <button className="calc-btn action" onClick={() => handleOp('*')}><MultiplyIcon size={18} /></button>
        
        <button className="calc-btn" onClick={() => handleNum('7')}>7</button>
        <button className="calc-btn" onClick={() => handleNum('8')}>8</button>
        <button className="calc-btn" onClick={() => handleNum('9')}>9</button>
        <button className="calc-btn action" onClick={() => handleOp('-')}><Minus size={18} /></button>
        
        <button className="calc-btn" onClick={() => handleNum('4')}>4</button>
        <button className="calc-btn" onClick={() => handleNum('5')}>5</button>
        <button className="calc-btn" onClick={() => handleNum('6')}>6</button>
        <button className="calc-btn action" onClick={() => handleOp('+')}><Plus size={18} /></button>
        
        <button className="calc-btn" onClick={() => handleNum('1')}>1</button>
        <button className="calc-btn" onClick={() => handleNum('2')}>2</button>
        <button className="calc-btn" onClick={() => handleNum('3')}>3</button>
        <button className="calc-btn action equal" style={{ gridRow: 'span 2', background: 'var(--color-primary)', color: 'white' }} onClick={handleEval}>=</button>
        
        <button className="calc-btn" style={{ gridColumn: 'span 2' }} onClick={() => handleNum('0')}>0</button>
        <button className="calc-btn" onClick={() => handleNum('.')}>.</button>
      </div>
    </div>
  );

  return (
    <div className="widget calculator-widget" style={{ width: '100%', height: '100%' }}>
      <style>{`
        .calc-btn {
          border: none;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .calc-btn:hover { background: var(--color-border); }
        .calc-btn.action { background: var(--color-surface-solid); font-weight: 600; }
        .calc-btn.action:hover { background: var(--color-border); }
        .calc-btn.advanced { font-size: 0.9rem; background: var(--color-primary-light); color: var(--color-primary); }
      `}</style>
      
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium(false)}
      {widget.size === 'large' && renderMedium(true)}
    </div>
  );
}
