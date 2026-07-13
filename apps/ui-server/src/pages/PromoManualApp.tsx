import { useState } from 'react';
import type { FormEvent } from 'react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';

export default function PromoManualApp() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tipo_promozione: '',
    target_mode: 'collection',
    collezione_target: '',
    prodotti_target: '',
    data_inizio: '',
    data_fine: '',
    
    valore_sconto: '',
    codice_sconto: '',
    prodotti_regalo: '',
    
    mostra_strip: true,
    mostra_banner: true,
    badge_testo: '',
    badge_colore: '#E53935',
    testo_cta: '',
    link_cta: '',
    immagine_banner: '',
    
    titolo: '',
    descrizione: '',
    regia_ai: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        valore_sconto: formData.valore_sconto ? Number(formData.valore_sconto) : undefined,
        prodotti_target: formData.prodotti_target ? formData.prodotti_target.split(',').map(s => s.trim()) : undefined,
      };
      
      const res = await fetch('http://localhost:3000/api/admin/promo/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Errore di rete');
      setMessage(data.message || 'Promozione accodata con successo!');
      
      setTimeout(() => {
        setStep(1);
        setMessage(null);
        setFormData({
          tipo_promozione: '', target_mode: 'collection', collezione_target: '', prodotti_target: '', data_inizio: '', data_fine: '',
          valore_sconto: '', codice_sconto: '', prodotti_regalo: '',
          mostra_strip: true, mostra_banner: true, badge_testo: '', badge_colore: '#E53935', testo_cta: '', link_cta: '', immagine_banner: '',
          titolo: '', descrizione: '', regia_ai: ''
        });
      }, 3000);

    } catch (err: any) {
      setMessage(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepNav = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', overflowX: 'auto' }}>
      {[
        { num: 1, label: 'Dati & Target' },
        { num: 2, label: 'Regole Offerta' },
        { num: 3, label: 'Design UI' },
        { num: 4, label: 'AI Copy & Lancio' }
      ].map((s) => (
        <div 
          key={s.num}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: step === s.num ? 'var(--color-primary)' : step > s.num ? 'var(--color-bg-elevated)' : 'transparent',
            color: step === s.num ? 'white' : step > s.num ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontWeight: step === s.num ? 600 : 400,
            cursor: step > s.num ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onClick={() => { if (step > s.num) setStep(s.num); }}
        >
          <span style={{ 
            width: '24px', height: '24px', borderRadius: '50%', 
            background: step === s.num ? 'rgba(255,255,255,0.2)' : 'var(--color-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
          }}>
            {step > s.num ? '✓' : s.num}
          </span>
          {s.label}
        </div>
      ))}
    </div>
  );

  return (
    <div className="app-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      {renderStepNav()}

      {message && (
        <GlassPanel style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: message.startsWith('Errore') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}>
          {message}
        </GlassPanel>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (step === 4) handleSubmit(); }}>
        <GlassPanel style={{ padding: '2rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          
          {/* STEP 1: Dati & Target */}
          {step === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 className="text-h2" style={{ fontSize: '18px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                Dati Fondamentali
              </h3>
              <p className="text-small" style={{ marginTop: '-1rem' }}>Scegli la meccanica promozionale, le tempistiche e la collezione a cui applicare questa promozione.</p>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>TIPO PROMOZIONE (OBBLIGATORIO) *</label>
                <select 
                  value={formData.tipo_promozione}
                  onChange={(e) => setFormData({...formData, tipo_promozione: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text)', fontSize: '15px' }}
                >
                  <option value="" disabled>-- Seleziona Formato da Shopify --</option>
                  <option value="sconto_percentuale">✓ Sconto Percentuale</option>
                  <option value="buy_x_get_y">Buy X Get Y (Regalo)</option>
                </select>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Dal tipo scelto dipendono i campi successivi.</div>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>Modalità Target</label>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="target_mode" 
                      value="collection" 
                      checked={formData.target_mode === 'collection'}
                      onChange={(e) => setFormData({...formData, target_mode: e.target.value})}
                    />
                    Target su Collezione Intera
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="target_mode" 
                      value="sku" 
                      checked={formData.target_mode === 'sku'}
                      onChange={(e) => setFormData({...formData, target_mode: e.target.value})}
                    />
                    Target su Prodotti Singoli (SKU)
                  </label>
                </div>
              </div>

              {formData.target_mode === 'collection' ? (
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Collezione Target *</label>
                  <select 
                    className="input" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text)' }}
                    value={formData.collezione_target}
                    onChange={(e) => setFormData({...formData, collezione_target: e.target.value})}
                  >
                    <option value="">Seleziona una collezione...</option>
                    <option value="all">Tutti i prodotti</option>
                    <option value="123456">Nuovi Arrivi (123456)</option>
                    <option value="654321">Outlet (654321)</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <TextInput 
                    label="Prodotti Target (SKU) *" 
                    value={formData.prodotti_target}
                    onChange={(e) => setFormData({...formData, prodotti_target: e.target.value})}
                    placeholder="Inserisci gli SKU separati da virgola"
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Data Inizio *</label>
                  <input 
                    type="date" 
                    value={formData.data_inizio}
                    onChange={(e) => setFormData({...formData, data_inizio: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Data Fine *</label>
                  <input 
                    type="date" 
                    value={formData.data_fine}
                    onChange={(e) => setFormData({...formData, data_fine: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Regole Offerta */}
          {step === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 className="text-h2" style={{ fontSize: '18px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                Condizioni della Promozione
              </h3>
              <p className="text-small" style={{ marginTop: '-1rem' }}>Configura le metriche matematiche dell'offerta in base al tipo scelto.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <TextInput 
                    label="Sconto Percentuale (%) *" 
                    type="number"
                    value={formData.valore_sconto}
                    onChange={(e) => setFormData({...formData, valore_sconto: e.target.value})}
                    placeholder="20"
                    required
                  />
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>La percentuale di sconto applicata.</div>
                </div>
              </div>

              {formData.tipo_promozione === 'buy_x_get_y' && (
                <div style={{ background: 'var(--color-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <TextInput 
                    label="Prodotti Regalo (Solo BxGy) *" 
                    value={formData.prodotti_regalo}
                    onChange={(e) => setFormData({...formData, prodotti_regalo: e.target.value})}
                    placeholder="Inserisci gli SKU in omaggio"
                    required
                  />
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>I prodotti che verranno rilasciati in regalo nel carrello (Max 100).</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Design UI */}
          {step === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 className="text-h2" style={{ fontSize: '18px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                Design UI
              </h3>
              <p className="text-small" style={{ marginTop: '-1rem' }}>Configura badge e cta che i clienti vedranno sullo store.</p>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mostra_strip} onChange={(e) => setFormData({...formData, mostra_strip: e.target.checked})} />
                  <span>Mostra Strip / Countdown Ticker</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <TextInput 
                  label="Testo Badge Prodotto *" 
                  value={formData.badge_testo}
                  onChange={(e) => setFormData({...formData, badge_testo: e.target.value})}
                  placeholder="Es. SUPER PROMO"
                  required
                />
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Colore Badge (Hex)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={formData.badge_colore}
                      onChange={(e) => setFormData({...formData, badge_colore: e.target.value})}
                      style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" 
                      value={formData.badge_colore}
                      onChange={(e) => setFormData({...formData, badge_colore: e.target.value})}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <TextInput 
                  label="Testo Bottone (CTA) *" 
                  value={formData.testo_cta}
                  onChange={(e) => setFormData({...formData, testo_cta: e.target.value})}
                  placeholder="Es. Scopri di più"
                  required
                />
                <TextInput 
                  label="Link Bottone (CTA) *" 
                  value={formData.link_cta}
                  onChange={(e) => setFormData({...formData, link_cta: e.target.value})}
                  placeholder="Es. /collections/saldi"
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 4: AI Copy & Lancio */}
          {step === 4 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 className="text-h2" style={{ fontSize: '24px', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                  Testi Aggiuntivi & Setup Finale
                </h3>
                <p className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                  Revisiona gli ultimi campi prima di lanciare la promozione in produzione.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  REGIA PER L'AI (PROMPT OPZIONALE)
                </label>
                <input 
                  className="input"
                  type="text"
                  value={formData.regia_ai}
                  onChange={(e) => setFormData({...formData, regia_ai: e.target.value})}
                  placeholder="Es. Usa un tono molto urgente e festoso, fai leva sulla scarsità..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    TITOLO PROMOZIONE (OBBLIGATORIO) *
                  </label>
                  <Button type="button" style={{ background: '#10b981', color: 'white', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none' }} onClick={() => alert('Generazione AI in sviluppo...')}>
                    ✨ Genera Titolo AI
                  </Button>
                </div>
                <input 
                  type="text"
                  className="input"
                  value={formData.titolo}
                  onChange={(e) => setFormData({...formData, titolo: e.target.value})}
                  placeholder="Es. Offerta Primavera -20%"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '16px', fontWeight: 600 }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Il nome principale e pubblico della Promozione. Se possibile usa l'AI.</div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', textTransform: 'uppercase' }}>
                    DESCRIZIONE PERSUASIVA (OBBLIGATORIO) *
                  </label>
                  <Button type="button" style={{ background: '#10b981', color: 'white', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none' }} onClick={() => alert('Generazione AI in sviluppo...')}>
                    ✨ Genera Descrizione AI
                  </Button>
                </div>
                <textarea 
                  className="input"
                  rows={5}
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  placeholder="Testo espanso generato dall'AI..."
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '15px', resize: 'vertical' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Ultimo campo in assoluto. Scrivi un copy persuasivo che accompagna il banner.</div>
              </div>
              
              <div style={{ marginTop: '20px', textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <span style={{ fontSize: '16px', color: 'var(--color-text)' }}>✅ La Promozione sarà <strong>Sempre Attiva</strong> al completamento.</span>
              </div>
            </div>
          )}

          {/* FOOTER WIZARD */}
          <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Indietro
              </Button>
            ) : <div></div>}

            {step < 4 ? (
              <Button type="button" variant="primary" onClick={() => {
                if (step === 1 && formData.tipo_promozione === '') return;
                setStep(step + 1);
              }}>
                Avanti
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={loading} style={{ background: '#10b981', color: 'white', borderColor: '#10b981' }}>
                {loading ? 'Lancio in corso...' : 'Lancia Promozione'}
              </Button>
            )}
          </div>

        </GlassPanel>
      </form>
    </div>
  );
}
