import { useState, useRef, useEffect } from 'react';
import { useWidgetStore, type DesktopWidget } from '../../../store/useWidgetStore';
import { Sparkles, Paperclip, Send, X, FileText, Check, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


export default function CopywriterWidget({ widget }: { widget: DesktopWidget }) {
  const updateWidgetSize = useWidgetStore(s => s.updateWidgetSize);
  
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professionale');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forza la taglia Large
  useEffect(() => {
    if (widget.size !== 'large') {
      updateWidgetSize(widget.id, 'large');
    }
  }, [widget.size, widget.id, updateWidgetSize]);

  const token = localStorage.getItem('token');

  const handleGenerate = async () => {
    if (!prompt.trim() && attachments.length === 0) return;
    setIsGenerating(true);
    setResult('');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/ai/copywriter`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ prompt: `${prompt}\n\nTono: ${tone}` })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.text || 'Nessun risultato');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setResult(errorData.text || 'Errore durante la generazione del testo.');
      }
    } catch (e) {
      console.error(e);
      setResult('Errore di connessione.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles].slice(0, 3)); // Max 3 per ora
    }
  };

  return (
    <div className="widget copywriter-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', perspective: '1000px', overflow: 'hidden' }}>
      
      <div style={{ width: '100%', height: '100%', transition: 'transform 0.6s', transformStyle: 'preserve-3d', position: 'relative', transform: result ? 'rotateY(180deg)' : '' }}>
        
        {/* FRONTE: Input */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>AI Copywriter</span>
            </div>
            <select 
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="nodrag"
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.8rem', outline: 'none', width: '100%' }}
            >
              <option value="professionale">Professionale</option>
              <option value="informale">Informale</option>
              <option value="persuasivo">Persuasivo (Vendita)</option>
              <option value="scuse">Scuse (Customer Care)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', flex: 1 }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="nodrag"
              placeholder="Di cosa vuoi parlare? Incolla qui l'email del cliente..."
              style={{ width: '100%', flex: 1, padding: '0', border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text)' }}
            />
            
            {attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px 0' }}>
                {attachments.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                    <FileText size={12} />
                    <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <X size={12} className="nodrag" style={{ cursor: 'pointer' }} onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="nodrag" onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Allega File o Immagini">
                <Paperclip size={16} /> <span style={{ fontSize: '0.75rem' }}>Allega</span>
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileChange} />
              
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating || (!prompt.trim() && attachments.length === 0)}
                className="nodrag"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: isGenerating ? 'wait' : 'pointer', opacity: (isGenerating || (!prompt.trim() && attachments.length === 0)) ? 0.6 : 1 }}
              >
                {isGenerating ? 'Elaborazione...' : <><Send size={14} /> Genera</>}
              </button>
            </div>
          </div>
        </div>

        {/* RETRO: Risultato */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Testo Generato</span>
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
