import { useState } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Languages, ArrowRight, Check } from 'lucide-react';

export default function TranslatorWidget({ widget }: { widget: DesktopWidget }) {
  const [text, setText] = useState('');
  const [langFrom, setLangFrom] = useState('auto');
  const [langTo, setLangTo] = useState('en');
  const [result, setResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTranslate = () => {
    if (!text.trim()) return;
    setIsTranslating(true);
    
    // MOCK: Futura chiamata a Gemini / API Google Translate
    setTimeout(() => {
      setResult(`[Traduzione in ${langTo}]: ${text}`);
      setIsTranslating(false);
    }, 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', justifyContent: 'center', alignItems: 'center' }}>
      <Languages size={32} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Traduttore</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center', marginTop: '4px' }}>Ingrandisci per tradurre testi</div>
    </div>
  );

  const renderContent = (isLarge: boolean) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>Traduttore</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select value={langFrom} onChange={e => setLangFrom(e.target.value)} style={{ padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px' }}>
            <option value="auto">Rileva Lingua</option>
            <option value="it">Italiano</option>
            <option value="en">Inglese</option>
            <option value="es">Spagnolo</option>
            <option value="fr">Francese</option>
            <option value="de">Tedesco</option>
          </select>
          <ArrowRight size={14} />
          <select value={langTo} onChange={e => setLangTo(e.target.value)} style={{ padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px' }}>
            <option value="en">Inglese</option>
            <option value="it">Italiano</option>
            <option value="es">Spagnolo</option>
            <option value="fr">Francese</option>
            <option value="de">Tedesco</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isLarge ? 'row' : 'column', gap: '12px', flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Scrivi qui il testo da tradurre..."
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', resize: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text)', minHeight: isLarge ? '0' : '80px' }}
          />
        </div>
        {isLarge && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-solid)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
              {isTranslating ? 'Traduzione in corso...' : result || 'La traduzione apparirà qui.'}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isLarge && result && (
          <div style={{ flex: 1, padding: '8px', background: 'var(--color-surface-solid)', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginRight: '8px', maxHeight: '60px', overflowY: 'auto' }}>
            {result}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {result && (
            <button onClick={handleCopy} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'transparent', color: copied ? 'var(--color-success)' : 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {copied ? <><Check size={14} /> Copiato!</> : 'Copia'}
            </button>
          )}
          <button 
            onClick={handleTranslate} 
            disabled={!text.trim() || isTranslating}
            style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: (!text.trim() || isTranslating) ? 'not-allowed' : 'pointer', opacity: (!text.trim() || isTranslating) ? 0.6 : 1 }}
          >
            {isTranslating ? '...' : 'Traduci'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="widget translator-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderContent(false)}
      {widget.size === 'large' && renderContent(true)}
    </div>
  );
}
