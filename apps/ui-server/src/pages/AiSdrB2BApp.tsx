import { useState, useEffect } from 'react';
import {
  Radar,
  Users,
  Mail,
  Settings2,
  ShieldCheck,
  Sparkles,
  RefreshCcw,
  Send,
  Search,
  Flame,
  FileText,
  KeyRound,
  Percent,
  CheckCircle2,
  Inbox,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

const CLUSTER_OPTIONS = [
  { value: 'ALL', label: 'Tutti gli 11 Cluster B2B' },
  { value: 'Installatore_Civile', label: 'Installatore Civile (IST 40%)' },
  { value: 'Impresa_Edile', label: 'Impresa Edile (IST 40%)' },
  { value: 'Termoidraulica_Clima', label: 'Termoidraulica & Clima (IST 40%)' },
  { value: 'Architetto_Ingegnere', label: 'Architetto / Ingegnere (IST 40%)' },
  { value: 'Serramentista', label: 'Serramentista (IST 40%)' },
  { value: 'Sicurezza_Automazione', label: 'Sicurezza & Automazione (IST 40%)' },
  { value: 'Fotovoltaico_Rinnovabili', label: 'Fotovoltaico & Rinnovabili (IST 40%)' },
  { value: 'Quadrista', label: 'Quadrista (IST 40%)' },
  { value: 'Ferramenta', label: 'Ferramenta (RIV 50%)' },
  { value: 'Rivendita_Edile', label: 'Rivendita Edile (RIV 50%)' },
  { value: 'Illuminazione', label: 'Showroom Illuminazione (RIV 50%)' },
];

export default function AiSdrB2BApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(false);

  // Overview Stats
  const [statsData, setStatsData] = useState<any>(null);

  // Prospects Explorer
  const [prospects, setProspects] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [filterSection, setFilterSection] = useState('Email_Pronta');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCluster, setFilterCluster] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);

  // Clienti in Attivazione (b2b_promo_prospects)
  const [promoLoggedIn, setPromoLoggedIn] = useState<any[]>([]);
  const [promoContacted, setPromoContacted] = useState<any[]>([]);
  const [promoConverted, setPromoConverted] = useState<any[]>([]);
  const [promoSubTab, setPromoSubTab] = useState<'logged_in' | 'contacted' | 'converted'>(
    'logged_in'
  );
  const [promoSearch, setPromoSearch] = useState('');

  // Drafts
  const [drafts, setDrafts] = useState<any[]>([]);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);

  // Outreach Config (Sconto 1° Acquisto + Dettagli Ordine + Catalogo Allegato)
  const [config, setConfig] = useState<any>({
    enableFirstPurchaseRule: true,
    istExtraDiscountPct: 10,
    rivExtraDiscountPct: 10,
    discountCalculationMode: 'EXTRA_CASCADE',
    discountTargetType: 'ALL_CATALOG',
    offerTitle: 'Offerta Riservata Nuovi Partner B2B — Extra Sconto sul 1° Acquisto',
    minOrderAmountText: "Nessun minimo d'ordine sul tuo 1° acquisto",
    freeShippingText: 'Spedizione rapida 24/48h in tutta Italia da Deposito Principale',
    paymentTermsText: 'Condizioni B2B riservate con referente dedicato Daniele Savoia',
    customCommercialNotes: '',
    attachCatalogPdf: true,
    catalogSelectionMode: 'BY_CLUSTER',
    catalogWarehouse: 'ALL_WAREHOUSES',
    catalogMaxProducts: 60,
    catalogPriceMode: 'LIST_AND_NET',
    timeFencingEnabled: true,
    morningWindow: '08:30-12:30',
    afternoonWindow: '14:00-17:30',
    sentinelEnabled: true,
  });

  // New Inbox Modal
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [newInbox, setNewInbox] = useState({
    email: '',
    displayName: 'Daniele Savoia — Izzo Distribuzione',
    smtpHost: 'smtp.ionos.it',
    smtpPort: 465,
    dailyLimit: 45,
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/stats`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStatsData(data);
        if (data.outreachConfig) {
          setConfig((prev: any) => ({ ...prev, ...data.outreachConfig }));
        }
      }
    } catch (e: any) {
      toast.error('Errore caricamento metriche AI SDR');
    } finally {
      setLoading(false);
      setIsAppReady(true);
    }
  };

  const fetchProspects = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
        section: filterSection,
        commercialCategory: filterCategory,
        categoryCluster: filterCluster,
        search: searchQuery,
      });
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProspects(data.prospects || []);
        setPagination(data.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
      }
    } catch (e) {
      toast.error('Errore caricamento lead B2B');
    } finally {
      setLoading(false);
    }
  };

  const fetchPromoProspects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search: promoSearch });
      const res = await fetch(`${API_URL}/api/admin/sdr/promo-prospects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setPromoLoggedIn(data.loggedIn || []);
        setPromoContacted(data.contacted || []);
        setPromoConverted(data.converted || []);
      }
    } catch (e) {
      toast.error('Errore caricamento Clienti in Attivazione');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/drafts`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts || []);
      }
    } catch (e) {
      toast.error('Errore caricamento bozze email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!isAppReady) return;
    if (activeTab === 'prospects') fetchProspects(1);
    if (activeTab === 'activation') fetchPromoProspects();
    if (activeTab === 'drafts') fetchDrafts();
  }, [activeTab, filterSection, filterCategory, filterCluster, isAppReady]);

  const handlePrepareOutreach = async (prospectIds?: number[]) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/prepare-outreach`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          prospectIds: prospectIds && prospectIds.length > 0 ? prospectIds : selectedProspectIds,
          commercialCategory: filterCategory,
          categoryCluster: filterCluster,
          limit: 10,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Create ${data.preparedCount} credenziali permanenti + Sconto 1° Acquisto + Catalogo PDF allegato (Agente: Daniele Savoia)!`
        );
        setSelectedProspectIds([]);
        fetchProspects(pagination.page);
        fetchStats();
      } else {
        toast.error(data.error || 'Errore preparazione outreach');
      }
    } catch (e: any) {
      toast.error('Errore di rete durante la generazione credenziali e bozze');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchOutreach = async (draftIds?: number[]) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/dispatch-outreach`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ draftIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchDrafts();
        fetchStats();
      } else {
        toast.error(data.error || 'Errore invio email');
      }
    } catch (e) {
      toast.error('Errore di connessione durante invio email');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success(
          'Configurazione Sconto 1° Acquisto, Dettagli Ordine e Catalogo Allegato salvata!'
        );
      } else {
        toast.error(data.error || 'Errore salvataggio configurazione');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSentinel = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/sentinel/trigger`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ batchSize: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchStats();
      }
    } catch (e) {
      toast.error('Errore avvio Sentinella 24/7');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInbox = async () => {
    if (!newInbox.email) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/inboxes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newInbox),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Casella SMTP/IMAP aggiunta al pool B2B');
        setIsInboxModalOpen(false);
        setNewInbox({
          email: '',
          displayName: 'Daniele Savoia — Izzo Distribuzione',
          smtpHost: 'smtp.ionos.it',
          smtpPort: 465,
          dailyLimit: 45,
        });
        fetchStats();
      }
    } catch (e) {
      toast.error('Errore salvataggio casella');
    }
  };

  const kpis = statsData?.kpis || {
    totalProspects: 120714,
    emailProntaCount: 33543,
    senzaEmailCount: 87166,
    pecScartataCount: 5,
    istCount: 103103,
    rivCount: 17611,
    promoContacted: 0,
    promoLoggedIn: 0,
    promoPendingOrder: 0,
    promoConverted: 0,
  };

  return (
    <>
      <AppSplashScreen
        isLoading={!isAppReady}
        appName="AI SDR & Lead B2B"
        icon={<Radar size={56} color="white" />}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          opacity: isAppReady ? 1 : 0,
          pointerEvents: isAppReady ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
        }}
      >
        <StickyHeader paddingY="sm">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              padding: '0 var(--spacing-lg)',
              width: '100%',
            }}
          >
            <Tabs
              activeTab={activeTab}
              onChange={(id) => setActiveTab(String(id))}
              tabs={[
                { id: 'overview', label: 'Panoramica & Sentinella', icon: <Radar size={14} /> },
                {
                  id: 'prospects',
                  label: `Lead B2B (${kpis.totalProspects.toLocaleString('it-IT')})`,
                  icon: <Users size={14} />,
                },
                {
                  id: 'activation',
                  label: `Clienti in Attivazione (${kpis.promoLoggedIn + kpis.promoContacted})`,
                  icon: <Flame size={14} />,
                },
                {
                  id: 'drafts',
                  label: 'Bozze Email & Credenziali',
                  icon: <Mail size={14} />,
                },
                {
                  id: 'config',
                  label: 'Offerta 1° Acquisto & Catalogo PDF',
                  icon: <Settings2 size={14} />,
                },
                {
                  id: 'inboxes',
                  label: 'Pool SMTP & Anti-PEC',
                  icon: <Inbox size={14} />,
                },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Badge variant={statsData?.enableGlobalWrites ? 'success' : 'warning'} size="sm">
                {statsData?.enableGlobalWrites ? 'LIVE MODE' : 'DRY-RUN PROTETTO'}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCcw size={14} />}
                onClick={() => {
                  fetchStats();
                  if (activeTab === 'prospects') fetchProspects(pagination.page);
                  if (activeTab === 'activation') fetchPromoProspects();
                  if (activeTab === 'drafts') fetchDrafts();
                }}
              >
                Aggiorna
              </Button>
            </div>
          </div>
        </StickyHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
          {/* TAB 1: PANORAMICA */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--spacing-md)',
                }}
              >
                <StatCard
                  title="Database Ricerca B2B (IZZO_AI_SDR)"
                  value={kpis.totalProspects.toLocaleString('it-IT')}
                  icon={<Radar size={18} />}
                />
                <StatCard
                  title="Email Ordinaria Pronta (Zero PEC)"
                  value={kpis.emailProntaCount.toLocaleString('it-IT')}
                  icon={<Mail size={18} />}
                />
                <StatCard
                  title="Installatori (IST — Base 40%)"
                  value={kpis.istCount.toLocaleString('it-IT')}
                  icon={<Users size={18} />}
                />
                <StatCard
                  title="Rivenditori / Ferramenta (RIV — Base 50%)"
                  value={kpis.rivCount.toLocaleString('it-IT')}
                  icon={<Percent size={18} />}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--spacing-md)',
                }}
              >
                <StatCard
                  title="📩 Contattati (In attesa 1° accesso)"
                  value={kpis.promoContacted}
                  icon={<Send size={18} />}
                />
                <StatCard
                  title="🔥 Hanno Effettuato il 1° Accesso"
                  value={kpis.promoLoggedIn}
                  icon={<Flame size={18} />}
                />
                <StatCard
                  title="📦 1° Ordine in Attesa Approvazione"
                  value={kpis.promoPendingOrder}
                  icon={<FileText size={18} />}
                />
                <StatCard
                  title="✅ Promossi a Clienti Attivi B2B"
                  value={kpis.promoConverted}
                  icon={<CheckCircle2 size={18} />}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: 'var(--spacing-lg)',
                }}
              >
                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--spacing-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        Aggregazione Ufficiale 11 Cluster B2B → Categorie IST (40%) & RIV (50%)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Tutti i lead contattati vengono assegnati in automatico a Daniele Savoia
                        (Cod. 003) nella tabella isolata b2b_promo_prospects.
                      </div>
                    </div>
                    <Badge variant="primary" size="md">
                      Agente: Daniele Savoia (003)
                    </Badge>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    {(statsData?.clusters || []).map((c: any) => (
                      <div
                        key={c.cluster}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {c.cluster.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {Number(c.count).toLocaleString('it-IT')} aziende
                          </div>
                        </div>
                        <Badge
                          variant={c.commercialCategory === 'RIV' ? 'success' : 'primary'}
                          size="sm"
                        >
                          {c.commercialCategory === 'RIV' ? 'RIV 50%' : 'IST 40%'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </GlassPanel>

                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--spacing-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        Sentinella 24/7 (Arricchimento Web)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Scansiona le {kpis.senzaEmailCount.toLocaleString('it-IT')} aziende
                        Senza_Email scartando rigorosamente le PEC.
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles size={14} />}
                      onClick={handleTriggerSentinel}
                      disabled={loading}
                    >
                      Avvia Ciclo
                    </Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(statsData?.sentinelRuns || []).slice(0, 5).map((run: any) => (
                      <div
                        key={run.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <span>
                          Ciclo #{run.cycleNumber} — {run.processedCount} siti analizzati
                        </span>
                        <Badge variant="success" size="sm">
                          +{run.upgradedEmailCount} Email / -{run.pecFilteredCount} PEC
                        </Badge>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              </div>
            </div>
          )}

          {/* TAB 2: ESPLORA 120.714 PROSPECTS */}
          {activeTab === 'prospects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr auto',
                    gap: 'var(--spacing-sm)',
                    alignItems: 'center',
                  }}
                >
                  <TextInput
                    placeholder="Cerca ragione sociale, email, P.IVA, città..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProspects(1)}
                    leftIcon={<Search size={15} />}
                  />
                  <Select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tutte le Sezioni (120.714)' },
                      { value: 'Email_Pronta', label: '✅ Email Ordinaria Pronta (33.543)' },
                      { value: 'Senza_Email', label: '🔍 Senza Email — Coda Sentinella (87.166)' },
                      { value: 'PEC_Scartata', label: '🛡️ PEC Scartata (Firewall)' },
                    ]}
                  />
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'IST (40%) + RIV (50%)' },
                      { value: 'IST', label: 'Solo Installatori (IST — 40%)' },
                      { value: 'RIV', label: 'Solo Rivenditori / Ferramenta (RIV — 50%)' },
                    ]}
                  />
                  <Select
                    value={filterCluster}
                    onChange={(e) => setFilterCluster(e.target.value)}
                    options={CLUSTER_OPTIONS}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    icon={<KeyRound size={15} />}
                    onClick={() => handlePrepareOutreach()}
                    disabled={loading}
                  >
                    {selectedProspectIds.length > 0
                      ? `Genera Credenziali + Sconto 1° Acquisto (${selectedProspectIds.length})`
                      : 'Genera Batch Top 10'}
                  </Button>
                </div>
              </GlassPanel>

              <GlassPanel padding="md" radius="lg">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr
                        style={{
                          textAlign: 'left',
                          borderBottom: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <th style={{ padding: '10px 8px' }}>Sel.</th>
                        <th style={{ padding: '10px 8px' }}>Azienda & Località</th>
                        <th style={{ padding: '10px 8px' }}>Cluster & Listino</th>
                        <th style={{ padding: '10px 8px' }}>Email Ordinaria (No PEC)</th>
                        <th style={{ padding: '10px 8px' }}>Credenziali B2B (Definitive)</th>
                        <th style={{ padding: '10px 8px' }}>Stato Attivazione</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Azione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospects.map((p) => {
                        const checked = selectedProspectIds.includes(p.id);
                        return (
                          <tr
                            key={p.id}
                            style={{ borderBottom: '1px solid var(--color-border)' }}
                          >
                            <td style={{ padding: '10px 8px' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProspectIds((prev) => [...prev, p.id]);
                                  } else {
                                    setSelectedProspectIds((prev) =>
                                      prev.filter((id) => id !== p.id)
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ fontWeight: 700 }}>{p.companyName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                {p.city} ({p.province}) — {p.region}
                                {p.vatNumber ? ` • P.IVA ${p.vatNumber}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Badge
                                  variant={
                                    p.commercialCategory === 'RIV' ? 'success' : 'primary'
                                  }
                                  size="sm"
                                >
                                  {p.commercialCategory === 'RIV' ? 'RIV 50%' : 'IST 40%'}
                                </Badge>
                                <span style={{ fontSize: '12px' }}>
                                  {p.categoryCluster?.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {p.ordinaryEmail ? (
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {p.ordinaryEmail}
                                </span>
                              ) : (
                                <Badge variant="warning" size="sm">
                                  In coda Sentinella
                                </Badge>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {p.promoProspect ? (
                                <div style={{ fontSize: '12px' }}>
                                  <div>
                                    User: <code>{p.promoProspect.username}</code>
                                  </div>
                                  {p.promoProspect.tempPassword && (
                                    <div style={{ color: 'var(--color-text-muted)' }}>
                                      Temp Pass: <code>{p.promoProspect.tempPassword}</code>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                  Non ancora generata
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {p.promoProspect ? (
                                <Badge
                                  variant={
                                    p.promoProspect.loginCount > 0 ? 'success' : 'primary'
                                  }
                                  size="sm"
                                >
                                  {p.promoProspect.loginCount > 0
                                    ? `🔥 1° Accesso (${p.promoProspect.loginCount}x)`
                                    : '📩 Contattato (0 accessi)'}
                                </Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">
                                  {p.pipelineStatus}
                                </Badge>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                              {p.ordinaryEmail && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<KeyRound size={13} />}
                                  onClick={() => handlePrepareOutreach([p.id])}
                                >
                                  Prepara Mail + Sconto
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'var(--spacing-md)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Pagina {pagination.page} di {pagination.totalPages} (Totale:{' '}
                    {pagination.total.toLocaleString('it-IT')} aziende)
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchProspects(pagination.page - 1)}
                    >
                      Precedente
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchProspects(pagination.page + 1)}
                    >
                      Successiva
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* TAB 3: CLIENTI IN ATTIVAZIONE (CONTATTATI VS 1° ACCESSO) */}
          {activeTab === 'activation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <Button
                      variant={promoSubTab === 'logged_in' ? 'primary' : 'secondary'}
                      size="sm"
                      icon={<Flame size={14} />}
                      onClick={() => setPromoSubTab('logged_in')}
                    >
                      🔥 Hanno Effettuato l&apos;Accesso ({promoLoggedIn.length})
                    </Button>
                    <Button
                      variant={promoSubTab === 'contacted' ? 'primary' : 'secondary'}
                      size="sm"
                      icon={<Mail size={14} />}
                      onClick={() => setPromoSubTab('contacted')}
                    >
                      📩 Clienti Contattati — In attesa di 1° accesso ({promoContacted.length})
                    </Button>
                    <Button
                      variant={promoSubTab === 'converted' ? 'primary' : 'secondary'}
                      size="sm"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => setPromoSubTab('converted')}
                    >
                      ✅ Promossi in Clienti Attivi ({promoConverted.length})
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', minWidth: '300px' }}>
                    <TextInput
                      placeholder="Cerca per azienda, username, email..."
                      value={promoSearch}
                      onChange={(e) => setPromoSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchPromoProspects()}
                      leftIcon={<Search size={14} />}
                    />
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel padding="md" radius="lg">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: 'left',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <th style={{ padding: '10px 8px' }}>Ragione Sociale & Contatti</th>
                      <th style={{ padding: '10px 8px' }}>Username Definitiva & Password</th>
                      <th style={{ padding: '10px 8px' }}>Listino & Sconto 1° Acquisto</th>
                      <th style={{ padding: '10px 8px' }}>Telemetria Accessi & GDPR</th>
                      <th style={{ padding: '10px 8px' }}>Carrello / 1° Ordine</th>
                      <th style={{ padding: '10px 8px' }}>Agente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promoSubTab === 'logged_in'
                      ? promoLoggedIn
                      : promoSubTab === 'contacted'
                      ? promoContacted
                      : promoConverted
                    ).map((item) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 700 }}>{item.companyName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {item.email} • {item.city || ''} ({item.province || ''})
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div>
                            User: <code>{item.username}</code>
                          </div>
                          {item.tempPassword ? (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              Temp Pass: <code>{item.tempPassword}</code>
                            </div>
                          ) : (
                            <Badge variant="success" size="sm">
                              Password personale impostata (GDPR OK)
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Badge
                              variant={item.commercialCategory === 'RIV' ? 'success' : 'primary'}
                              size="sm"
                            >
                              {item.commercialCategory} (Base {item.discount}%)
                            </Badge>
                            {item.firstPurchaseRule && (
                              <Badge variant="warning" size="sm">
                                +{item.firstPurchaseRule.discountValue}% Sul 1° Acquisto
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {item.loginCount > 0 ? (
                            <div>
                              <Badge variant="success" size="sm">
                                {item.loginCount} accessi effettuati
                              </Badge>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                1° login:{' '}
                                {item.firstLoginAt
                                  ? new Date(item.firstLoginAt).toLocaleString('it-IT')
                                  : '-'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              Inviata il{' '}
                              {item.emailSentAt
                                ? new Date(item.emailSentAt).toLocaleDateString('it-IT')
                                : '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {item.status === 'ORDER_PENDING_APPROVAL' ? (
                            <Badge variant="warning" size="sm">
                              1° Ordine in attesa di approvazione Agente
                            </Badge>
                          ) : item.cartItemsCount > 0 ? (
                            <Badge variant="primary" size="sm">
                              🛒 {item.cartItemsCount} art. nel carrello ({item.cartTotalUnits} pz)
                            </Badge>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              Nessun carrello attivo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <Badge variant="neutral" size="sm">
                            Daniele Savoia ({item.agentCode})
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassPanel>
            </div>
          )}

          {/* TAB 4: BOZZE EMAIL & CREDENZIALI */}
          {activeTab === 'drafts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      Coda Bozze Outreach con Credenziali, Sconto 1° Acquisto e Catalogo PDF
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Verifica le bozze prima dell&apos;invio automatico tramite il pool SMTP.
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send size={14} />}
                    onClick={() => handleDispatchOutreach()}
                    disabled={loading}
                  >
                    Invia Bozze Pronte (Dry-Run Safe)
                  </Button>
                </div>
              </GlassPanel>

              <GlassPanel padding="md" radius="lg">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: 'left',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <th style={{ padding: '10px 8px' }}>Destinatario</th>
                      <th style={{ padding: '10px 8px' }}>Oggetto Email</th>
                      <th style={{ padding: '10px 8px' }}>Catalogo Allegato</th>
                      <th style={{ padding: '10px 8px' }}>Stato</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 700 }}>{d.prospect?.companyName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {d.prospect?.ordinaryEmail}
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', maxWidth: '360px' }}>{d.subject}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {d.attachedCatalogUrl ? (
                            <Badge variant="primary" size="sm">
                              📎 {d.attachedCatalogUrl}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <Badge
                            variant={
                              d.status.includes('Inviata') ? 'success' : 'primary'
                            }
                            size="sm"
                          >
                            {d.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setPreviewDraft(d)}
                            >
                              Anteprima
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send size={13} />}
                              onClick={() => handleDispatchOutreach([d.id])}
                            >
                              Invia
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassPanel>
            </div>
          )}

          {/* TAB 5: CONFIGURAZIONE OFFERTA, SCONTO 1° ACQUISTO & CATALOGO ALLEGATO */}
          {activeTab === 'config' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-lg)',
              }}
            >
              <GlassPanel padding="lg" radius="lg">
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                  1. Sconto Primo Acquisto Autogenerato (Scadenza: Sul 1° Acquisto)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(config.enableFirstPurchaseRule)}
                      onChange={(e) =>
                        setConfig({ ...config, enableFirstPurchaseRule: e.target.checked })
                      }
                    />
                    Genera automaticamente regola sconto individuale &quot;Sul primo acquisto&quot;
                    per ogni prospect contattato
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <TextInput
                      label="Extra Sconto 1° Acquisto IST (su base 40%) %"
                      type="number"
                      value={String(config.istExtraDiscountPct)}
                      onChange={(e) =>
                        setConfig({ ...config, istExtraDiscountPct: Number(e.target.value) })
                      }
                    />
                    <TextInput
                      label="Extra Sconto 1° Acquisto RIV (su base 50%) %"
                      type="number"
                      value={String(config.rivExtraDiscountPct)}
                      onChange={(e) =>
                        setConfig({ ...config, rivExtraDiscountPct: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Modalità Calcolo Sconto 1° Acquisto
                    </label>
                    <Select
                      value={config.discountCalculationMode}
                      onChange={(e) =>
                        setConfig({ ...config, discountCalculationMode: e.target.value })
                      }
                      options={[
                        {
                          value: 'EXTRA_CASCADE',
                          label: 'Extra in Cascata Composta (es. 40% + 10% = 46% netto)',
                        },
                        {
                          value: 'EXTRA_ADDITIVE',
                          label: 'Somma Diretta Percentuale (es. 40% + 10% = 50% netto)',
                        },
                      ]}
                    />
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '15px',
                      marginTop: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    2. Zona Dettagli Ordine (Inseriti nella Mail e nella Pagina 2 del Catalogo PDF)
                  </div>
                  <TextInput
                    label="Titolo Offerta Benvenuto"
                    value={config.offerTitle || ''}
                    onChange={(e) => setConfig({ ...config, offerTitle: e.target.value })}
                  />
                  <TextInput
                    label="Condizione Minimo d'Ordine"
                    value={config.minOrderAmountText || ''}
                    onChange={(e) => setConfig({ ...config, minOrderAmountText: e.target.value })}
                  />
                  <TextInput
                    label="Condizioni Spedizione e Tempi di Consegna"
                    value={config.freeShippingText || ''}
                    onChange={(e) => setConfig({ ...config, freeShippingText: e.target.value })}
                  />
                  <TextInput
                    label="Modalità di Pagamento & Referente"
                    value={config.paymentTermsText || ''}
                    onChange={(e) => setConfig({ ...config, paymentTermsText: e.target.value })}
                  />
                </div>
              </GlassPanel>

              <GlassPanel padding="lg" radius="lg">
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                  3. Parametri Catalogo PDF Allegato Automaticamente alla Mail
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(config.attachCatalogPdf)}
                      onChange={(e) =>
                        setConfig({ ...config, attachCatalogPdf: e.target.checked })
                      }
                    />
                    Allega automaticamente il Catalogo PDF personalizzato con i prezzi netti 1°
                    acquisto
                  </label>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Filtro Disponibilità Magazzino nel Catalogo Allegato
                    </label>
                    <Select
                      value={config.catalogWarehouse || 'ALL_WAREHOUSES'}
                      onChange={(e) =>
                        setConfig({ ...config, catalogWarehouse: e.target.value })
                      }
                      options={[
                        {
                          value: 'ALL_WAREHOUSES',
                          label: 'Tutti i Depositi (Principale 2gg + Esterno 7gg)',
                        },
                        {
                          value: 'MAIN_2GG',
                          label: 'Solo Deposito Principale (Pronta Consegna 24/48h)',
                        },
                        {
                          value: 'EXTERNAL_7GG',
                          label: 'Solo Deposito Esterno (Consegna 5/7gg)',
                        },
                      ]}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Strategia Selezione Articoli
                    </label>
                    <Select
                      value={config.catalogSelectionMode || 'BY_CLUSTER'}
                      onChange={(e) =>
                        setConfig({ ...config, catalogSelectionMode: e.target.value })
                      }
                      options={[
                        {
                          value: 'BY_CLUSTER',
                          label: 'Adattivo per Cluster (Installatori vs Ferramenta/Rivenditori)',
                        },
                        {
                          value: 'GLOBAL',
                          label: 'Selezione Globale Personalizzata (Top Rotazione B2B)',
                        },
                      ]}
                    />
                  </div>

                  <TextInput
                    label="Numero Massimo Articoli nel PDF Allegato"
                    type="number"
                    value={String(config.catalogMaxProducts || 60)}
                    onChange={(e) =>
                      setConfig({ ...config, catalogMaxProducts: Number(e.target.value) })
                    }
                  />

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginTop: '8px',
                    }}
                  >
                    <TextInput
                      label="Finestra Invio Mattina (Time-Fencing)"
                      value={config.morningWindow || '08:30-12:30'}
                      onChange={(e) => setConfig({ ...config, morningWindow: e.target.value })}
                    />
                    <TextInput
                      label="Finestra Invio Pomeriggio"
                      value={config.afternoonWindow || '14:00-17:30'}
                      onChange={(e) => setConfig({ ...config, afternoonWindow: e.target.value })}
                    />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <Button
                      variant="primary"
                      size="md"
                      icon={<ShieldCheck size={16} />}
                      onClick={handleSaveConfig}
                      disabled={loading}
                    >
                      Salva Configurazione Offerta, Sconto 1° Acquisto & Catalogo
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* TAB 6: POOL CASELLE & FIREWALL ANTI-PEC */}
          {activeTab === 'inboxes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      Pool Caselle SMTP/IMAP a Rotazione & Firewall Triplo Anti-PEC
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Blacklisted & PEC bloccate: {kpis.blacklistCount} indirizzi.
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => setIsInboxModalOpen(true)}
                  >
                    Aggiungi Casella SMTP
                  </Button>
                </div>
              </GlassPanel>

              <GlassPanel padding="md" radius="lg">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: 'left',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <th style={{ padding: '10px 8px' }}>Casella Email</th>
                      <th style={{ padding: '10px 8px' }}>Nome Visualizzato</th>
                      <th style={{ padding: '10px 8px' }}>Host SMTP</th>
                      <th style={{ padding: '10px 8px' }}>Quota Giornaliera</th>
                      <th style={{ padding: '10px 8px' }}>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statsData?.inboxAccounts || []).map((inb: any) => (
                      <tr key={inb.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{inb.email}</td>
                        <td style={{ padding: '10px 8px' }}>{inb.displayName}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {inb.smtpHost}:{inb.smtpPort}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {inb.sentToday} / {inb.dailyLimit}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <Badge variant={inb.isActive ? 'success' : 'neutral'} size="sm">
                            {inb.isActive ? 'Attiva' : 'Pausa'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ANTEPRIMA BOZZA EMAIL */}
      <Modal
        isOpen={Boolean(previewDraft)}
        onClose={() => setPreviewDraft(null)}
        title={previewDraft?.subject || 'Anteprima Email B2B'}
        size="lg"
      >
        {previewDraft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Destinatario: <strong>{previewDraft.prospect?.companyName}</strong> (
              {previewDraft.prospect?.ordinaryEmail})
            </div>
            <div
              style={{
                padding: '16px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
              }}
              dangerouslySetInnerHTML={{ __html: previewDraft.bodyHtml || previewDraft.bodyText }}
            />
          </div>
        )}
      </Modal>

      {/* MODAL NUOVA CASELLA SMTP */}
      <Modal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        title="Aggiungi Casella al Pool Outreach B2B"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsInboxModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={handleCreateInbox}>
              Salva Casella
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TextInput
            label="Indirizzo Email"
            placeholder="d.savoia@izzodistribuzione-b2b.it"
            value={newInbox.email}
            onChange={(e) => setNewInbox({ ...newInbox, email: e.target.value })}
          />
          <TextInput
            label="Nome Mittente"
            value={newInbox.displayName}
            onChange={(e) => setNewInbox({ ...newInbox, displayName: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
            <TextInput
              label="Host SMTP"
              value={newInbox.smtpHost}
              onChange={(e) => setNewInbox({ ...newInbox, smtpHost: e.target.value })}
            />
            <TextInput
              label="Porta"
              type="number"
              value={String(newInbox.smtpPort)}
              onChange={(e) => setNewInbox({ ...newInbox, smtpPort: Number(e.target.value) })}
            />
            <TextInput
              label="Limite/Giorno"
              type="number"
              value={String(newInbox.dailyLimit)}
              onChange={(e) => setNewInbox({ ...newInbox, dailyLimit: Number(e.target.value) })}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
