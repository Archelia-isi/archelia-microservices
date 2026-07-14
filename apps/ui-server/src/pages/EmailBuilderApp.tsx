import { useState } from 'react';
import AppSplashScreen from '../components/os/AppSplashScreen';
import Loader from '../components/ui/Loader';
import './EmailBuilderApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export function EmailBuilderApp() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [mjml, setMjml] = useState('');
  const [html, setHtml] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const isAppReady = true;

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

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !mjml) return;
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/admin/marketing/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: templateName, 
          subject: templateSubject, 
          htmlContent: html,
          mjml 
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Template salvato con successo nella libreria!');
        setTemplateName('');
        setTemplateSubject('');
      } else {
        alert('Errore salvataggio: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Errore di connessione al server per il salvataggio');
    } finally {
      setSaving(false);
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
            <h4>Salvataggio Template</h4>
            <div className="save-form">
              <input 
                type="text" 
                placeholder="Nome Template (es. Winback v1)" 
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="template-input"
              />
              <input 
                type="text" 
                placeholder="Oggetto Email (opzionale)" 
                value={templateSubject}
                onChange={e => setTemplateSubject(e.target.value)}
                className="template-input"
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSaveTemplate}
                disabled={saving || !templateName.trim()}
              >
                {saving ? 'Salvataggio...' : '💾 Salva nella Libreria'}
              </button>
            </div>
            
            <h4 style={{marginTop: '20px'}}>Codice Sorgente MJML</h4>
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
