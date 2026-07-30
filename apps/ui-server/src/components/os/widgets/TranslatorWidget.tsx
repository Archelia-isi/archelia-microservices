import { useState, useEffect } from 'react';
import { useWidgetStore, type DesktopWidget } from '../../../store/useWidgetStore';
import { Languages, ArrowRight, Check, ArrowLeft, FileText, Send } from 'lucide-react';

export default function TranslatorWidget({ widget }: { widget: DesktopWidget }) {
  const updateWidgetSize = useWidgetStore(s => s.updateWidgetSize);
  
  const [text, setText] = useState('');
  const [langFrom, setLangFrom] = useState('auto');
  const [langTo, setLangTo] = useState('en');
  const [result, setResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Forza la taglia Large
  useEffect(() => {
    if (widget.size !== 'large') {
      updateWidgetSize(widget.id, 'large');
    }
  }, [widget.size, widget.id, updateWidgetSize]);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setIsTranslating(true);
    setResult('');
    
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${langFrom}&tl=${langTo}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data && data[0]) {
        const translatedText = data[0].map((item: any) => item[0]).join('');
        setResult(translatedText);
      } else {
        setResult("Errore nella traduzione.");
      }
    } catch (err) {
      console.error(err);
      setResult("Errore di rete. Riprova più tardi.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="widget translator-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', perspective: '1000px', overflow: 'hidden' }}>
      
      <div style={{ width: '100%', height: '100%', transition: 'transform 0.6s', transformStyle: 'preserve-3d', position: 'relative', transform: result ? 'rotateY(180deg)' : '' }}>
        
        {/* FRONTE: Input */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
          
          {/* Header Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Languages size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>Traduttore</span>
          </div>
            
          {/* Selezione Lingue (Row) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <select value={langFrom} onChange={e => setLangFrom(e.target.value)} className="nodrag" style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', outline: 'none', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <option value="auto">Rileva Lingua</option>
              <option value="it">Italiano</option>
              <option value="en">Inglese</option>
              <option value="es">Spagnolo</option>
              <option value="fr">Francese</option>
              <option value="de">Tedesco</option>
              <option value="zh-CN">Cinese</option>
            </select>
            <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            <select value={langTo} onChange={e => setLangTo(e.target.value)} className="nodrag" style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', outline: 'none', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <option value="en">Inglese</option>
              <option value="it">Italiano</option>
              <option value="es">Spagnolo</option>
              <option value="fr">Francese</option>
              <option value="de">Tedesco</option>
              <option value="zh-CN">Cinese</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', flex: 1, marginTop: '4px' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="nodrag"
              placeholder="Scrivi qui il testo da tradurre..."
              style={{ width: '100%', flex: 1, padding: '0', border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text)' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button 
                onClick={handleTranslate} 
                disabled={isTranslating || !text.trim()}
                className="nodrag"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: isTranslating ? 'wait' : 'pointer', opacity: (isTranslating || !text.trim()) ? 0.6 : 1 }}
              >
                {isTranslating ? 'Traduzione...' : <><Send size={14} /> Traduci</>}
              </button>
            </div>
          </div>
        </div>

        {/* RETRO: Risultato */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Languages size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Traduzione</span>
            </div>
            <button className="nodrag" onClick={() => setResult('')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
               <ArrowLeft size={14} /> Indietro
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-surface-solid)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--color-text)' }} className="nodrag">
            {result}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleCopy}
              className="nodrag"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: copied ? 'var(--color-success)' : 'var(--color-surface-hover)', color: copied ? 'white' : 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
            >
              {copied ? <><Check size={14} /> Copiato negli appunti!</> : <><FileText size={14} /> Copia Testo</>}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
