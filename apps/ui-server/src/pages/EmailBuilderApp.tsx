import { useState } from 'react';
import AppSplashScreen from '../components/os/AppSplashScreen';
import GlassPanel from '../components/ui/GlassPanel';
import Loader from '../components/ui/Loader';
import './EmailBuilderApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export function EmailBuilderApp() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [mjml, setMjml] = useState('');
  const [html, setHtml] = useState('');
  const [isAppReady, setIsAppReady] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setMjml('');
    setHtml('');

    try {
      const res = await fetch(`${API_URL}/api/v1/admin/marketing/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMjml(json.data.mjml);
        setHtml(json.data.html);
      } else {
        alert('Errore durante la generazione: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Errore di connessione al server AI');
    } finally {
      setLoading(false);
    }
  };

  if (!isAppReady) {
    return <AppSplashScreen appName="AI Email Atelier" isLoading={true} icon="/icons/marketing.jpg" />;
  }

  return (
    <div className="email-builder-app">
      <div className="eb-sidebar glass-effect">
        <div className="eb-header">
          <h2>✨ AI Email Atelier</h2>
          <p>Scrivi un prompt per generare template premium in MJML. Usa i Magic Tags (es. {'{{Nome}}'}).</p>
        </div>

        <div className="eb-prompt-area">
          <textarea 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Es. Crea una mail per i carrelli abbandonati elegante, sfondo scuro, con un bottone 'Completa Ordine'."
            rows={6}
            disabled={loading}
          />
          <button 
            className="btn btn-primary generate-btn" 
            onClick={handleGenerate} 
            disabled={loading || !prompt.trim()}
          >
            {loading ? <><Loader size="sm" /> Generazione in corso...</> : '🚀 Genera Template MJML'}
          </button>
        </div>

        {mjml && (
          <div className="eb-code-area">
            <h4>Codice Sorgente MJML</h4>
            <textarea value={mjml} readOnly className="code-view" />
          </div>
        )}
      </div>

      <div className="eb-preview glass-effect">
        {loading ? (
          <div className="preview-loader">
            <Loader size="lg" />
            <p>L'Intelligenza Artificiale sta scrivendo il codice e compilando la vista...</p>
          </div>
        ) : html ? (
          <iframe 
            title="Email Preview"
            srcDoc={html} 
            className="preview-iframe"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="preview-empty">
            <div className="empty-icon">🎨</div>
            <h3>Area di Anteprima</h3>
            <p>Il risultato visivo della generazione apparirà qui in tempo reale.</p>
          </div>
        )}
      </div>
    </div>
  );
}
