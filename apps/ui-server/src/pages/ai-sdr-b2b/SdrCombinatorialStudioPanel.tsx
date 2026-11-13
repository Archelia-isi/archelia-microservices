import { useEffect, useMemo, useState } from 'react';
import {
  Shuffle,
  Plus,
  Edit3,
  RefreshCw,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Sparkles,
  BookOpen,
  FileText,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import GlassPanel from '../../components/ui/GlassPanel';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { sanitizeEmailHtml } from './constants';

export type CombinatorialSubMode = 'simulator' | 'templates' | 'tokens';

interface SdrCombinatorialStudioPanelProps {
  apiUrl: string;
  authHeaders: () => Record<string, string>;
  canWrite: boolean;
  subMode: CombinatorialSubMode;
  onChangeSubMode: (m: CombinatorialSubMode) => void;
}

const ANGLE_LABELS: Record<string, string> = {
  Presentazione_Fornitore: '🏢 Presentazione Istituzionale Da Azienda ad Azienda',
  Valutazione_Listino_B2B: '📊 Ufficio Acquisti & Trasparenza Prezzi Netti',
  Credenziali_Comodita: '🔑 Accesso Riservato B2B per Consultazione Autonoma',
  Sconto_Benvenuto_Prova: '📐 Condizioni Riservate sul Primo Ordine di Prova',
  Catalogo_Illustrativo_PDF: '📄 Prospetto Tecnico PDF & Portale B2B',
  Gamma_Tecnica_Completa: '⚙️ Gamma Tecnica, Marchi & Compatibilità Installativa',
  Presentazione_Referente: '👤 Filo Diretto col Referente Commerciale B2B',
  Fornitore_Alternativo: '🔄 Secondo Fornitore Indipendente a Supporto Acquisti',
  Nota_Conoscitiva_Breve: '📋 Nota Esecutiva Sintetica ad Alta Leggibilità',
  Supporto_Aziende_Territorio: '📍 Logistica Nazionale & Quotazioni su Commessa',
};

const LAYOUT_LABELS: Record<string, string> = {
  executive_card: 'Scheda Tecnica Sobria',
  plain_personal: 'Stile Lettera Diretta',
  compact_memo: 'Prospetto Compatto Ardesia',
  accent_stripe: 'Fascia Istituzionale Blu Navy',
  clean_table: 'Tabella Ufficio Acquisti',
};

const TOKEN_CATEGORY_LABELS: Record<string, string> = {
  '01_Saluti_Apertura': '1. Intestazioni & Aperture Sobrie Da Azienda ad Azienda',
  '02_Oggetto_Email': '2. Oggetti Istituzionali & Tecnici B2B',
  '03_Presentazione_Azienda': '3. Identità Izzo Distribuzione S.r.l.',
  '04_Contesto_Cliente': '4. Contesto Operativo Impiantisti, Quadristi & Rivendite',
  '05_Offerta_Sconti': '5. Condizioni Riservate 1° Ordine & Confronto Netti',
  '06_Magazzino_Consegna': '6. Continuità di Fornitura & Logistica Nazionale',
  '07_Portale_Credenziali': '7. Accesso Riservato Non Vincolante & Prospetto PDF',
  '08_Referente_Supporto': '8. Referente Commerciale Diretto & Preventivi su Lista',
  '09_Chiusura_Saluti': '9. Formule di Congedo Esecutive B2B',
};

const QUICK_HELP_TOKENS = [
  '[SALUTO_AZIENDA]',
  '[SALUTO_UFFICIO]',
  '[VERBO_CONTATTARE]',
  '[IDENTITA_IZZO]',
  '[QUALIFICA_DISTRIBUTORE]',
  '[ABBIAMO_ATTIVATO]',
  '[LE_CREDENZIALI]',
  '[IL_CATALISTINO_PDF]',
  '[IL_DOPPIO_SCONTO]',
  '[FRASE_DISPONIBILITA]',
  '[SALUTO_CHIUSURA]',
];

const QUICK_CLIENT_VARS = [
  '{SALUTO_PERSONALIZZATO}',
  '{INTESTAZIONE_OGGETTO}',
  '{FRASE_CONTESTO_DB}',
  '{INCISO_CONTESTO_DB}',
  '{LINEE_PRODOTTI_IZZO}',
  '{SCOPO_FORNITURA_SETTORE}',
  '{CHIUSURA_SETTORE}',
  '{COMPANY_NAME}',
  '{CITY}',
  '{DISCOUNT_FORMULA}',
  '{CREDENTIALS_BLOCK}',
];

export default function SdrCombinatorialStudioPanel({
  apiUrl,
  authHeaders,
  canWrite,
  subMode,
  onChangeSubMode,
}: SdrCombinatorialStudioPanelProps) {
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  // Simulatore state
  const [simUseRealDb, setSimUseRealDb] = useState<boolean>(true);
  const [simSampledProspect, setSimSampledProspect] = useState<any | null>(null);
  const [simCompany, setSimCompany] = useState('Elettroimpianti Rossi S.r.l.');
  const [simCity, setSimCity] = useState('Napoli');
  const [simProvince, setSimProvince] = useState('NA');
  const [simCategory, setSimCategory] = useState<'ALL' | 'IST' | 'RIV'>('ALL');
  const [simTemplateCode, setSimTemplateCode] = useState<string>('RANDOM');
  const [simLoading, setSimLoading] = useState(false);
  const [simPreview, setSimPreview] = useState<any | null>(null);

  // Filtri 100 Email Madri
  const [tplSearch, setTplSearch] = useState('');
  const [tplAngleFilter, setTplAngleFilter] = useState('ALL');
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Filtri 108 Parole Dinamiche
  const [tokSearch, setTokSearch] = useState('');
  const [tokCategoryFilter, setTokCategoryFilter] = useState('ALL');
  const [editingToken, setEditingToken] = useState<any | null>(null);
  const [editingTokenVariantsText, setEditingTokenVariantsText] = useState('');
  const [isNewToken, setIsNewToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoadingData(true);
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/overview`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || null);
        setTemplates(data.templates || []);
        setTokens(data.tokens || []);
      } else {
        toast.error(data.error || 'Errore caricamento libreria combinatoria');
      }
    } catch {
      toast.error('Errore connessione libreria combinatoria');
    } finally {
      setLoadingData(false);
    }
  };

  const runSimulation = async (
    overrideTemplateCode?: string,
    overrideUseRealDb?: boolean
  ) => {
    try {
      setSimLoading(true);
      const chosenCode = overrideTemplateCode ?? simTemplateCode;
      const useReal = overrideUseRealDb ?? simUseRealDb;
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          templateCode: chosenCode === 'RANDOM' ? null : chosenCode,
          commercialCategory: simCategory === 'ALL' ? undefined : simCategory,
          useRealProspect: useReal,
          companyName: simCompany,
          city: simCity,
          province: simProvince,
        }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setSimPreview(data.preview);
        setSimSampledProspect(data.sampledProspect || null);
      } else {
        toast.error(data.error || 'Impossibile generare la simulazione');
      }
    } catch {
      toast.error('Errore simulazione combinatoria');
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    runSimulation('RANDOM', true);
  }, []);

  const handleSyncDefaults = async () => {
    try {
      setLoadingData(true);
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/sync-defaults`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ overwrite: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Libreria sincronizzata!');
        fetchOverview();
        runSimulation();
      } else {
        toast.error(data.error || 'Errore sincronizzazione');
      }
    } catch {
      toast.error('Errore sincronizzazione libreria');
    } finally {
      setLoadingData(false);
    }
  };

  // ==========================================================================
  // CRUD EMAIL MADRI
  // ==========================================================================
  const openCreateTemplate = () => {
    setIsNewTemplate(true);
    setEditingTemplate({
      code: '',
      name: '',
      angleGroup: 'Presentazione_Fornitore',
      targetCategory: 'ALL',
      htmlLayoutVariant: 'executive_card',
      subjectTemplate:
        '[OGG_TIPO_DOC] per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
      bodyTemplate: `{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB}\n\n[VERBO_CONTATTARE] **Izzo Distribuzione S.r.l.**, [QUALIFICA_DISTRIBUTORE], per sottoporre alla Vostra valutazione una linea di fornitura diretta {SCOPO_FORNITURA_SETTORE}:\n{LINEE_PRODOTTI_IZZO}\n\nPer consultare autonomamente listini netti e disponibilità effettive, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] insieme a [IL_CATALISTINO_PDF]:\n\n{CREDENTIALS_BLOCK}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]`,
      isActive: true,
    });
  };

  const openEditTemplate = (tpl: any) => {
    setIsNewTemplate(false);
    setEditingTemplate({ ...tpl });
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      setSavingTemplate(true);
      const url = isNewTemplate
        ? `${apiUrl}/api/admin/sdr/combinatorial/templates`
        : `${apiUrl}/api/admin/sdr/combinatorial/templates/${editingTemplate.id}`;
      const method = isNewTemplate ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Email Madre salvata!');
        setEditingTemplate(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Errore salvataggio Email Madre');
      }
    } catch {
      toast.error('Errore salvataggio Email Madre');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleToggleTemplateActive = async (tpl: any) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/templates/${tpl.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !tpl.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          !tpl.isActive
            ? `Modello ${tpl.code} riattivato`
            : `Modello ${tpl.code} messo in pausa`
        );
        fetchOverview();
      }
    } catch {
      toast.error('Errore aggiornamento stato modello');
    }
  };

  const handleDeleteTemplate = async (tpl: any) => {
    if (!window.confirm(`Vuoi eliminare definitivamente l'Email Madre ${tpl.code} (${tpl.name})?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/templates/${tpl.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Email Madre eliminata');
        fetchOverview();
      }
    } catch {
      toast.error('Errore eliminazione modello');
    }
  };

  // ==========================================================================
  // CRUD PAROLE DINAMICHE
  // ==========================================================================
  const openCreateToken = () => {
    setIsNewToken(true);
    setEditingToken({
      tokenKey: '',
      category: '01_Saluti_Apertura',
      description: '',
      isActive: true,
    });
    setEditingTokenVariantsText('Gentilissima\nSpettabile\nCortese');
  };

  const openEditToken = (tk: any) => {
    setIsNewToken(false);
    setEditingToken({ ...tk });
    setEditingTokenVariantsText(Array.isArray(tk.variants) ? tk.variants.join('\n') : '');
  };

  const handleSaveToken = async () => {
    if (!editingToken) return;
    const variantsList = editingTokenVariantsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (variantsList.length === 0) {
      toast.error('Inserisci almeno una variante (una per riga)');
      return;
    }
    try {
      setSavingToken(true);
      const url = isNewToken
        ? `${apiUrl}/api/admin/sdr/combinatorial/tokens`
        : `${apiUrl}/api/admin/sdr/combinatorial/tokens/${editingToken.id}`;
      const method = isNewToken ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          ...editingToken,
          variants: variantsList,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Parola dinamica salvata!');
        setEditingToken(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Errore salvataggio parola dinamica');
      }
    } catch {
      toast.error('Errore salvataggio parola dinamica');
    } finally {
      setSavingToken(false);
    }
  };

  const handleToggleTokenActive = async (tk: any) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/tokens/${tk.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !tk.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          !tk.isActive
            ? `Parola [${tk.tokenKey}] attivata`
            : `Parola [${tk.tokenKey}] messa in pausa`
        );
        fetchOverview();
      }
    } catch {
      toast.error('Errore aggiornamento parola dinamica');
    }
  };

  const handleDeleteToken = async (tk: any) => {
    if (!window.confirm(`Vuoi eliminare il gruppo [${tk.tokenKey}]?`)) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/sdr/combinatorial/tokens/${tk.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Gruppo di parole eliminato');
        fetchOverview();
      }
    } catch {
      toast.error('Errore eliminazione gruppo parole');
    }
  };

  // Filtered lists
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (tplAngleFilter !== 'ALL' && t.angleGroup !== tplAngleFilter) return false;
      if (tplSearch.trim()) {
        const q = tplSearch.toLowerCase();
        const hay = `${t.code} ${t.name} ${t.angleGroup} ${t.subjectTemplate} ${t.bodyTemplate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, tplAngleFilter, tplSearch]);

  const filteredTokens = useMemo(() => {
    return tokens.filter((tk) => {
      if (tokCategoryFilter !== 'ALL' && tk.category !== tokCategoryFilter) return false;
      if (tokSearch.trim()) {
        const q = tokSearch.toLowerCase();
        const variantsText = Array.isArray(tk.variants) ? tk.variants.join(' ') : '';
        const hay = `${tk.tokenKey} ${tk.description} ${tk.category} ${variantsText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tokens, tokCategoryFilter, tokSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* KPI DEL MOTORE ANTI-SPAM 100 × 108 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 'var(--spacing-sm)',
        }}
      >
        <StatCard
          title="Email Madri Attive"
          value={stats ? `${stats.activeTemplates} / ${stats.totalTemplates}` : '100 / 100'}
          icon={<FileText size={18} />}
        />
        <StatCard
          title="Gruppi Parole Dinamiche"
          value={stats ? stats.activeTokens : 108}
          icon={<BookOpen size={18} />}
        />
        <StatCard
          title="Sinonimi & Frasi nel DB"
          value={stats ? stats.totalVariantsCount : 651}
          icon={<Sparkles size={18} />}
        />
        <StatCard
          title="Combinazioni Possibili"
          value={stats?.exponentBase10 ? `> 10^${stats.exponentBase10}` : '> 10^17'}
          icon={<Shuffle size={18} />}
        />
      </div>

      {/* =====================================================================
          VISTA 1: SIMULATORE LIVE COMBINAZIONI
         ===================================================================== */}
      {subMode === 'simulator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <GlassPanel padding="md" radius="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '14.5px' }}>
                  🎲 Simulatore in Tempo Reale — Personalizzazione DB + 100×108 Combinazioni
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Il motore legge in automatico i dati reali dal database (sito web, titolare, specializzazioni, marchi, storico, settore), pesca 1 delle 100 Email Madri e sostituisce decine di blocchi lessicali.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant={simUseRealDb ? 'success' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    const next = !simUseRealDb;
                    setSimUseRealDb(next);
                    runSimulation(undefined, next);
                  }}
                  disabled={simLoading}
                >
                  {simUseRealDb ? '🎯 Sorgente: Aziende Vere del DB' : '✏️ Sorgente: Dati Manuali'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Shuffle size={14} />}
                  onClick={() => runSimulation()}
                  disabled={simLoading}
                >
                  {simLoading
                    ? 'Generazione...'
                    : simUseRealDb
                    ? '🎲 Pesca Azienda Vera & Genera Combinazione'
                    : '🎲 Genera Nuova Combinazione'}
                </Button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '10px',
              }}
            >
              {!simUseRealDb && (
                <>
                  <TextInput
                    label="Azienda Cliente di Prova"
                    value={simCompany}
                    onChange={(e) => setSimCompany(e.target.value)}
                  />
                  <TextInput
                    label="Città"
                    value={simCity}
                    onChange={(e) => setSimCity(e.target.value)}
                  />
                  <TextInput
                    label="Provincia (Sigla)"
                    value={simProvince}
                    onChange={(e) => setSimProvince(e.target.value.toUpperCase().slice(0, 2))}
                  />
                </>
              )}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  FILTRO LISTINO COMMERCIALE
                </label>
                <Select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value as 'ALL' | 'IST' | 'RIV')}
                  options={[
                    { value: 'ALL', label: 'Tutti i Profili B2B (Installatori + Rivendite)' },
                    { value: 'IST', label: 'Solo Installatori & Tecnici (40% + 10%)' },
                    { value: 'RIV', label: 'Solo Rivenditori & Ferramenta (50% + 10%)' },
                  ]}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  SCELTA EMAIL MADRE (1–100)
                </label>
                <Select
                  value={simTemplateCode}
                  onChange={(e) => {
                    setSimTemplateCode(e.target.value);
                    runSimulation(e.target.value);
                  }}
                  options={[
                    { value: 'RANDOM', label: '🎲 Casuale tra tutte le 100 Email' },
                    ...templates.map((t) => ({
                      value: t.code,
                      label: `${t.code} — ${t.name}`,
                    })),
                  ]}
                />
              </div>
            </div>

            {simPreview?.prospectIntelligence && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>
                  🧠 Segnali DB letti in automatico:
                </span>
                <Badge variant="primary" size="sm">
                  🏢 {simPreview.prospectIntelligence.companyClean}
                </Badge>
                {simSampledProspect?.city && (
                  <Badge variant="neutral" size="sm">
                    📍 {simSampledProspect.city}
                    {simSampledProspect.province ? ` (${simSampledProspect.province})` : ''}
                  </Badge>
                )}
                <Badge variant="neutral" size="sm">
                  ⚙️ {simPreview.prospectIntelligence.cluster}
                </Badge>
                {simPreview.prospectIntelligence.domain ? (
                  <Badge variant="success" size="sm">
                    🌐 {simPreview.prospectIntelligence.domain}
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    🌐 Senza sito (Fallback Territorio/Settore attivo)
                  </Badge>
                )}
                {simPreview.prospectIntelligence.decisionMaker && (
                  <Badge variant="warning" size="sm">
                    👤 Titolare: {simPreview.prospectIntelligence.decisionMaker}
                  </Badge>
                )}
                {simPreview.prospectIntelligence.foundationYear && (
                  <Badge variant="neutral" size="sm">
                    🏛️ Dal {simPreview.prospectIntelligence.foundationYear}
                  </Badge>
                )}
                {simPreview.prospectIntelligence.certifications && (
                  <Badge variant="success" size="sm">
                    🏅 {simPreview.prospectIntelligence.certifications}
                  </Badge>
                )}
                {simPreview.prospectIntelligence.civilBrandMatched && (
                  <Badge variant="primary" size="sm">
                    🔌 Compatibilità {simPreview.prospectIntelligence.civilBrandMatched}
                  </Badge>
                )}
                {(simPreview.prospectIntelligence.specializations || []).map(
                  (sp: string, i: number) => (
                    <Badge key={i} variant="neutral" size="sm">
                      🔹 {sp}
                    </Badge>
                  )
                )}
              </div>
            )}
          </GlassPanel>

          {simPreview && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 'var(--spacing-md)',
                alignItems: 'start',
              }}
            >
              {/* ANTEPRIMA EMAIL GENERATA */}
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge variant="primary" size="sm">
                      Modello {simPreview.templateCode}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {ANGLE_LABELS[simPreview.angleGroup] || simPreview.angleGroup}
                    </Badge>
                    <Badge variant="success" size="sm">
                      {LAYOUT_LABELS[simPreview.htmlLayoutVariant] || simPreview.htmlLayoutVariant}
                    </Badge>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    <strong>{simPreview.tokensReplacedCount}</strong> blocchi lessicali sostituiti
                  </span>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '10px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    Oggetto:{' '}
                  </span>
                  <strong>{simPreview.subject}</strong>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeEmailHtml(simPreview.bodyHtml, simPreview.bodyText),
                  }}
                />
              </GlassPanel>

              {/* RADIOGRAFIA DELLE PAROLE PESCATE DAL DATABASE */}
              <GlassPanel padding="md" radius="lg">
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
                  🔍 Parole Dinamiche Pescate in Questa Email ({simPreview.replacedTokensPreview?.length || 0})
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginBottom: '12px',
                  }}
                >
                  Ecco cosa ha scelto il codice per questa singola generazione. Se riclicchi &quot;Genera&quot;, sia la struttura sia queste parole cambieranno ancora.
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    maxHeight: '540px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {(simPreview.replacedTokensPreview || []).map((tr: any, idx: number) => (
                    <div
                      key={`${tr.tokenKey}-${idx}`}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <code
                          style={{
                            fontWeight: 800,
                            color: 'var(--color-primary)',
                            fontSize: '11px',
                          }}
                        >
                          [{tr.tokenKey}]
                        </code>
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                          1 su {tr.poolSize} varianti
                        </span>
                      </div>
                      <div style={{ fontWeight: 600 }}>→ &ldquo;{tr.chosenValue}&rdquo;</div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VISTA 2: ARCHIVIO DELLE 100 EMAIL MADRI
         ===================================================================== */}
      {subMode === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <GlassPanel padding="md" radius="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '230px' }}>
                  <TextInput
                    placeholder="Cerca codice (T001) o testo..."
                    value={tplSearch}
                    onChange={(e) => setTplSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '280px' }}>
                  <Select
                    value={tplAngleFilter}
                    onChange={(e) => setTplAngleFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tutti i 10 Angoli Istituzionali' },
                      ...Object.entries(ANGLE_LABELS).map(([k, v]) => ({ value: k, label: v })),
                    ]}
                  />
                </div>
                <Badge variant="success" size="sm">
                  100/100 Universali per Tutti i Clienti B2B
                </Badge>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={13} />}
                  onClick={handleSyncDefaults}
                  disabled={!canWrite || loadingData}
                >
                  Sincronizza Base 100×108
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={openCreateTemplate}
                  disabled={!canWrite}
                >
                  Nuova Email Madre
                </Button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel padding="none" radius="lg" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    textAlign: 'left',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <th style={{ padding: '10px 12px' }}>Codice</th>
                  <th style={{ padding: '10px 12px' }}>Titolo &amp; Angolo Commerciale</th>
                  <th style={{ padding: '10px 12px' }}>Target</th>
                  <th style={{ padding: '10px 12px' }}>Struttura Oggetto Dinamico</th>
                  <th style={{ padding: '10px 12px' }}>Invii</th>
                  <th style={{ padding: '10px 12px' }}>Stato</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800 }}>
                      <Badge variant="primary" size="sm">
                        {tpl.code}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {ANGLE_LABELS[tpl.angleGroup] || tpl.angleGroup} •{' '}
                        {LAYOUT_LABELS[tpl.htmlLayoutVariant] || tpl.htmlLayoutVariant}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant="success" size="sm">
                        Tutti i Clienti B2B
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        maxWidth: '330px',
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {tpl.subjectTemplate}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      {tpl.usageCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={tpl.isActive ? 'success' : 'neutral'} size="sm">
                        {tpl.isActive ? 'Attiva' : 'In Pausa'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Shuffle size={13} />}
                          title="Prova subito questo modello nel Simulatore"
                          onClick={() => {
                            setSimTemplateCode(tpl.code);
                            onChangeSubMode('simulator');
                            runSimulation(tpl.code);
                          }}
                        >
                          Prova
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit3 size={13} />}
                          disabled={!canWrite}
                          onClick={() => openEditTemplate(tpl)}
                        >
                          Modifica
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={
                            tpl.isActive ? <PauseCircle size={13} /> : <PlayCircle size={13} />
                          }
                          disabled={!canWrite}
                          title={tpl.isActive ? 'Metti in pausa' : 'Riattiva'}
                          onClick={() => handleToggleTemplateActive(tpl)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          disabled={!canWrite}
                          title="Elimina modello"
                          onClick={() => handleDeleteTemplate(tpl)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: LIBRERIA DELLE 108 PAROLE & FRASI DINAMICHE
         ===================================================================== */}
      {subMode === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <GlassPanel padding="md" radius="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '260px' }}>
                  <TextInput
                    placeholder="Cerca es. Gentilissima o SALUTO..."
                    value={tokSearch}
                    onChange={(e) => setTokSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '290px' }}>
                  <Select
                    value={tokCategoryFilter}
                    onChange={(e) => setTokCategoryFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: `Tutte le Categorie (${tokens.length} gruppi)` },
                      ...Object.entries(TOKEN_CATEGORY_LABELS).map(([k, v]) => ({
                        value: k,
                        label: v,
                      })),
                    ]}
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={openCreateToken}
                disabled={!canWrite}
              >
                Nuova Parola Dinamica
              </Button>
            </div>
          </GlassPanel>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 'var(--spacing-sm)',
            }}
          >
            {filteredTokens.map((tk) => (
              <GlassPanel key={tk.id} padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <div>
                    <code
                      style={{
                        fontWeight: 800,
                        fontSize: '12.5px',
                        color: 'var(--color-primary)',
                      }}
                    >
                      [{tk.tokenKey}]
                    </code>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                      {tk.description}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <Badge variant={tk.isActive ? 'success' : 'neutral'} size="sm">
                      {Array.isArray(tk.variants) ? tk.variants.length : 0} varianti
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Edit3 size={12} />}
                      disabled={!canWrite}
                      onClick={() => openEditToken(tk)}
                    >
                      Modifica
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={tk.isActive ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
                      disabled={!canWrite}
                      onClick={() => handleToggleTokenActive(tk)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      disabled={!canWrite}
                      onClick={() => handleDeleteToken(tk)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {(tk.variants || []).map((v: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL EDITOR EMAIL MADRE
         ===================================================================== */}
      <Modal
        isOpen={Boolean(editingTemplate)}
        onClose={() => setEditingTemplate(null)}
        title={
          isNewTemplate
            ? 'Nuova Email Madre Anti-Spam'
            : `Modifica Email Madre ${editingTemplate?.code || ''}`
        }
        size="lg"
      >
        {editingTemplate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
              }}
            >
              <TextInput
                label="Codice (es. T101)"
                placeholder="Auto se vuoto"
                value={editingTemplate.code || ''}
                disabled={!isNewTemplate}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, code: e.target.value })
                }
              />
              <TextInput
                label="Nome descrittivo"
                value={editingTemplate.name || ''}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
              />
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  STILE / ANGOLO
                </label>
                <Select
                  value={editingTemplate.angleGroup || 'Ufficio_Acquisti'}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, angleGroup: e.target.value })
                  }
                  options={Object.entries(ANGLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  APPLICABILITÀ CLIENTI
                </label>
                <Select
                  value="ALL"
                  onChange={() =>
                    setEditingTemplate({ ...editingTemplate, targetCategory: 'ALL' })
                  }
                  options={[{ value: 'ALL', label: 'Tutti i Clienti B2B (Universale)' }]}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  LAYOUT GRAFICO HTML
                </label>
                <Select
                  value={editingTemplate.htmlLayoutVariant || 'executive_card'}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, htmlLayoutVariant: e.target.value })
                  }
                  options={Object.entries(LAYOUT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>
            </div>

            <TextInput
              label="Oggetto Email (usa [PAROLE_DINAMICHE] e {COMPANY_NAME})"
              fullWidth
              value={editingTemplate.subjectTemplate || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, subjectTemplate: e.target.value })
              }
            />

            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  marginBottom: '6px',
                }}
              >
                INSERIMENTO RAPIDO PAROLE DINAMICHE (clicca per aggiungere al testo):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {QUICK_HELP_TOKENS.map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        bodyTemplate: `${editingTemplate.bodyTemplate || ''} ${tok}`,
                      })
                    }
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {tok}
                  </button>
                ))}
                {QUICK_CLIENT_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        bodyTemplate: `${editingTemplate.bodyTemplate || ''} ${v}`,
                      })
                    }
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <textarea
                rows={11}
                value={editingTemplate.bodyTemplate || ''}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, bodyTemplate: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  lineHeight: 1.55,
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Nota: <code>{'{CREDENTIALS_BLOCK}'}</code> inserisce automaticamente il riquadro con Username, Password temporanea, Sconto 1° Acquisto e pulsante PDF.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" size="sm" onClick={() => setEditingTemplate(null)}>
                Annulla
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 size={14} />}
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? 'Salvataggio...' : 'Salva Email Madre'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL EDITOR PAROLA DINAMICA (SINONIMI)
         ===================================================================== */}
      <Modal
        isOpen={Boolean(editingToken)}
        onClose={() => setEditingToken(null)}
        title={
          isNewToken
            ? 'Nuova Parola o Frase Dinamica'
            : `Modifica Varianti per [${editingToken?.tokenKey || ''}]`
        }
        size="md"
      >
        {editingToken && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TextInput
              label="Codice Segnaposto (es. SALUTO_AZIENDA)"
              value={editingToken.tokenKey || ''}
              onChange={(e) =>
                setEditingToken({ ...editingToken, tokenKey: e.target.value.toUpperCase() })
              }
            />
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                CATEGORIA
              </label>
              <Select
                value={editingToken.category || '01_Saluti_Apertura'}
                onChange={(e) => setEditingToken({ ...editingToken, category: e.target.value })}
                options={Object.entries(TOKEN_CATEGORY_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                }))}
              />
            </div>
            <TextInput
              label="Spiegazione semplice (a cosa serve)"
              value={editingToken.description || ''}
              onChange={(e) => setEditingToken({ ...editingToken, description: e.target.value })}
            />

            <div>
              <label
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                VARIANTI INTERCAMBIABILI (scrivine UNA PER RIGA — il sistema ne pescherà una a caso):
              </label>
              <textarea
                rows={8}
                value={editingTokenVariantsText}
                onChange={(e) => setEditingTokenVariantsText(e.target.value)}
                placeholder={'Gentilissima\nSpettabile\nCortese\nGentile'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" size="sm" onClick={() => setEditingToken(null)}>
                Annulla
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 size={14} />}
                onClick={handleSaveToken}
                disabled={savingToken}
              >
                {savingToken ? 'Salvataggio...' : 'Salva Varianti nel Database'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
