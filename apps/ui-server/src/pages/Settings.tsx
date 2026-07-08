import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-h1">Impostazioni Sistema</h2>
        <SettingsIcon size={24} color="var(--color-text-muted)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-h2" style={{ marginBottom: '0.5rem' }}>Connessioni API</h3>
          <p className="text-body text-small">Configura i parametri di Zucchetti e Shopify.</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-h2" style={{ marginBottom: '0.5rem' }}>Equalizzatore AI</h3>
          <p className="text-body text-small">Gestione dei prompt per Gemini e Anthropic.</p>
        </div>
      </div>
    </div>
  );
}
