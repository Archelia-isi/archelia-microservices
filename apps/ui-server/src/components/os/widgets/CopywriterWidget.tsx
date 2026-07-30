import { useState, useRef } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Sparkles, Paperclip, Send, X, FileText, Check } from 'lucide-react';

export default function CopywriterWidget({ widget }: { widget: DesktopWidget }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professionale');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (!prompt.trim() && attachments.length === 0) return;
    setIsGenerating(true);
    setResult('');
    
    // MOCK: In futuro qui andrà la chiamata al gateway (es. POST /api/v1/ai/generate con Gemini)
    setTimeout(() => {
      let mockRes = `Ecco una bozza ${tone} in risposta alla tua richiesta:\n\n`;
      if (attachments.length > 0) {
        mockRes += `(Ho analizzato anche ${attachments.length} file allegati)\n\n`;
      }
      mockRes += "Gentile Cliente,\nGrazie per averci contattato. Stiamo verificando la sua richiesta e le faremo sapere al più presto.\nCordiali saluti.";
      
      setResult(mockRes);
      setIsGenerating(false);
    }, 1500);
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

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
      <Sparkles size={32} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Copywriter</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center', marginTop: '4px' }}>Ingrandisci per usare l'assistente email</div>
    </div>
  );

  const renderContent = (isLarge: boolean) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', gap: '8px', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>AI Copywriter</span>
        </div>
        <select 
          value={tone}
          onChange={e => setTone(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.8rem' }}
        >
          <option value="professionale">Professionale</option>
          <option value="informale">Informale</option>
          <option value="persuasivo">Persuasivo (Vendita)</option>
          <option value="scuse">Scuse (Customer Care)</option>
        </select>
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-surface-solid)', padding: '8px', borderRadius: '8px' }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Di cosa vuoi parlare? Incolla qui l'email del cliente..."
          style={{ width: '100%', height: isLarge ? '80px' : '40px', padding: '8px', border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text)' }}
        />
        
        {attachments.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px' }}>
            {attachments.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                <FileText size={12} />
                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Allega File o Immagini">
            <Paperclip size={16} /> <span style={{ fontSize: '0.75rem' }}>Allega</span>
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileChange} />
          
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || (!prompt.trim() && attachments.length === 0)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: isGenerating ? 'wait' : 'pointer', opacity: (isGenerating || (!prompt.trim() && attachments.length === 0)) ? 0.6 : 1 }}
          >
            {isGenerating ? 'Elaborazione...' : <><Send size={14} /> Genera</>}
          </button>
        </div>
      </div>

      {/* Output Area */}
      {result && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '8px', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
          <button 
            onClick={handleCopy}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: copied ? 'var(--color-success)' : 'var(--color-text)' }}
          >
            {copied ? <><Check size={14} /> Copiato!</> : 'Copia Testo'}
          </button>
        </div>
      )}

    </div>
  );

  return (
    <div className="widget copywriter-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderContent(false)}
      {widget.size === 'large' && renderContent(true)}
    </div>
  );
}
