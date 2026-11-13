import { useState, useEffect } from 'react';
import {
  Radar,
  Users,
  Mail,
  Settings2,
  RefreshCcw,
  Search,
  Flame,
  MapPin,
  Bot,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useWindowStore } from '../store/useWindowStore';
import { canWriteApp } from '../utils/permissions';

import { API_URL } from './ai-sdr-b2b/constants';
import type {
  SdrB2BAgentOption,
  SdrInboxAccountItem,
  SdrMapsBudgetState,
  SdrMapsBollaturaState,
  SdrOutreachConfigState,
} from './ai-sdr-b2b/types';
import SdrSearchMiningTab from './ai-sdr-b2b/SdrSearchMiningTab';
import SdrItalyMapTab from './ai-sdr-b2b/SdrItalyMapTab';
import SdrProspectsTableTab from './ai-sdr-b2b/SdrProspectsTableTab';
import SdrAgentsAuditTab from './ai-sdr-b2b/SdrAgentsAuditTab';
import SdrActivationTab, { type PromoActivationSubTab } from './ai-sdr-b2b/SdrActivationTab';
import SdrDraftsConfigTab from './ai-sdr-b2b/SdrDraftsConfigTab';
import SdrSmtpPoolTab from './ai-sdr-b2b/SdrSmtpPoolTab';
import SdrProspectDossierModal from './ai-sdr-b2b/SdrProspectDossierModal';

export default function AiSdrB2BApp() {
  const canWrite = canWriteApp('ai_sdr_b2b');
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('search');
  const [loading, setLoading] = useState(false);

  const [statsData, setStatsData] = useState<any>(null);
  const [b2bAgents, setB2bAgents] = useState<SdrB2BAgentOption[]>([]);
  const [selectedBatchAgentCode, setSelectedBatchAgentCode] = useState<string>('003');

  // 1. Ricerca & Mining
  const [geoRegioni, setGeoRegioni] = useState<any[]>([]);
  const [geoProvince, setGeoProvince] = useState<any[]>([]);
  const [geoComuni, setGeoComuni] = useState<any[]>([]);
  const [searchRegione, setSearchRegione] = useState<string>('TUTTA_ITALIA');
  const [searchProvincia, setSearchProvincia] = useState<string>('');
  const [searchComune, setSearchComune] = useState<string>('');
  const [searchCategoria, setSearchCategoria] = useState<string>('ALL');
  const [searchMaxResults, setSearchMaxResults] = useState<string>('50');
  const [zonaSummary, setZonaSummary] = useState<any>(null);
  const [searchStatus, setSearchStatus] = useState<any>(null);
  const [mapsBudget, setMapsBudget] = useState<SdrMapsBudgetState>({
    mode: 'free_tier',
    dailyBudgetEur: 0,
    callsToday: 0,
    spentTodayEur: 0,
    dailyCapCalls: 150,
  });
  const [dailyBudgetInput, setDailyBudgetInput] = useState<string>('0');
  const [mapsBollatura, setMapsBollatura] = useState<SdrMapsBollaturaState>({
    verifiedMapsCount: 0,
    certifiedFreeCount: 0,
    unverifiedMapsCount: 0,
    totalCount: 120714,
  });
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);

  // 2. Mappa Italia 4 Livelli
  const [territoryMapData, setTerritoryMapData] = useState<any>(null);
  const [mapMacroFilter, setMapMacroFilter] = useState<'ALL' | 'ACTIVE' | 'NORD' | 'CENTRO' | 'SUD'>('ALL');
  const [selectedMapRegion, setSelectedMapRegion] = useState<string | null>(null);
  const [selectedMapProvince, setSelectedMapProvince] = useState<string | null>(null);
  const [selectedMapComune, setSelectedMapComune] = useState<string | null>(null);
  const [provinceComuniStats, setProvinceComuniStats] = useState<any[]>([]);
  const [comuneCompanies, setComuneCompanies] = useState<any[]>([]);
  const [loadingMapComuni, setLoadingMapComuni] = useState(false);

  // 3. Lead B2B & Dossier 360°
  const [prospects, setProspects] = useState<any[]>([]);
  const [prospectsSummary, setProspectsSummary] = useState<any>({
    total: 120714,
    ready: 33543,
    phoneOnly: 87166,
    pecOnly: 5,
    vatCount: 30928,
    viesCount: 30928,
    clusterCounts: {},
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterVatOnly, setFilterVatOnly] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCluster, setFilterCluster] = useState('ALL');
  const [filterPipelineStatus, setFilterPipelineStatus] = useState('ALL');
  const [filterMaps, setFilterMaps] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterProvince, setFilterProvince] = useState('ALL');
  const [filterCity, setFilterCity] = useState('');
  const [sortBy, setSortBy] = useState('email_first');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);

  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeDossier, setActiveDossier] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<'strategy' | 'anagrafica' | 'proposal' | 'split'>('strategy');
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [draftRecipientInput, setDraftRecipientInput] = useState('');
  const [draftSubjectInput, setDraftSubjectInput] = useState('');
  const [draftBodyInput, setDraftBodyInput] = useState('');

  // 4. Agenti, Autopilot & Kill-Switch
  const [autopilotProvince, setAutopilotProvince] = useState('ALL');
  const [autopilotCategory, setAutopilotCategory] = useState('ALL');
  const [mockReplyProspectId, setMockReplyProspectId] = useState('288');
  const [inboxEvents, setInboxEvents] = useState<any[]>([]);

  // 5. Attivazione, Bozze & Configurazione
  const [promoLoggedIn, setPromoLoggedIn] = useState<any[]>([]);
  const [promoOpenedCatalog, setPromoOpenedCatalog] = useState<any[]>([]);
  const [promoContacted, setPromoContacted] = useState<any[]>([]);
  const [promoConverted, setPromoConverted] = useState<any[]>([]);
  const [promoSubTab, setPromoSubTab] = useState<PromoActivationSubTab>('logged_in');
  const [promoSearch, setPromoSearch] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);

  const [config, setConfig] = useState<SdrOutreachConfigState>({
    enableFirstPurchaseRule: true,
    istExtraDiscountPct: 10,
    rivExtraDiscountPct: 10,
    discountCalculationMode: 'EXTRA_CASCADE',
    discountTargetType: 'ALL_2GG',
    offerTitle: 'Offerta esclusiva valida per il primo acquisto',
    minOrderAmountText: "Nessun minimo d'ordine sul tuo 1° acquisto",
    freeShippingText: 'Spedizione rapida 24/48h in tutta Italia da Deposito Principale (2gg)',
    paymentTermsText: 'Condizioni B2B riservate con referente dedicato Daniele Savoia',
    customCommercialNotes: '',
    attachCatalogPdf: true,
    catalogSelectionMode: 'ALL_2GG',
    catalogWarehouse: 'MAIN_2GG',
    catalogStockMode: 'BADGE_ONLY',
    catalogMaxProducts: 180,
    catalogPriceMode: 'LIST_AND_NET',
    timeFencingEnabled: true,
    morningWindow: '08:30-12:30',
    afternoonWindow: '14:00-17:30',
    sentinelEnabled: true,
    defaultAgentCode: '003',
    defaultAgentName: 'Daniele Savoia',
    defaultAgentEmail: '',
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const copyToClipboard = (text: string, label = 'Testo') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiato negli appunti: ${text.slice(0, 48)}`);
  };

  const openDiscountsApp = () => {
    useWindowStore.getState().openWindow('b2b_discounts');
  };

  const openCatalogBuilderForClient = (
    companyName: string,
    category: 'IST' | 'RIV' = 'IST',
    extraPctOverride?: number
  ) => {
    const baseDiscount = category === 'RIV' ? 50 : 40;
    const extraPct =
      extraPctOverride !== undefined
        ? Number(extraPctOverride)
        : category === 'RIV'
          ? Number(config.rivExtraDiscountPct || 10)
          : Number(config.istExtraDiscountPct || 10);
    useWindowStore.getState().openAppWithContext('b2b_catalog_builder', {
      targetCompanyName: companyName,
      commercialCategory: category,
      extraDiscountPct: extraPct,
      calculationMode: 'EXTRA_CASCADE',
      warehouseFilter: 'MAIN_2GG',
      stockDisplayMode: 'BADGE_ONLY',
      catalogTitle: `Catalistino Riservato a ${companyName}`,
      catalogSubtitle: `Offerta esclusiva 1° acquisto — Sconto Riservato ${baseDiscount}% + ${extraPct}%`,
      minOrderText: config.minOrderAmountText,
      shippingText: config.freeShippingText,
      openPreview: true,
    });
  };

  // ==========================================================================
  // FETCHERS
  // ==========================================================================
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/stats`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setStatsData(data);
        if (data.outreachConfig) {
          setConfig((prev) => ({ ...prev, ...data.outreachConfig }));
          if (data.outreachConfig.defaultAgentCode) {
            setSelectedBatchAgentCode(data.outreachConfig.defaultAgentCode);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsAppReady(true);
    }
  };

  const fetchB2BAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/b2b-agents`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.agents)) {
        setB2bAgents(data.agents);
      }
    } catch {
      // ignore
    }
  };

  const fetchInboxEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/inbox-events`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setInboxEvents(data.events || []);
    } catch {
      // ignore
    }
  };

  const fetchGeoRegioni = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/regioni`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setGeoRegioni(data.regioni || []);
    } catch {
      // ignore
    }
  };

  const fetchGeoProvince = async (regione?: string) => {
    try {
      const q = regione && regione !== 'TUTTA_ITALIA' ? `?regione=${encodeURIComponent(regione)}` : '';
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/province${q}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setGeoProvince(data.province || []);
    } catch {
      // ignore
    }
  };

  const fetchGeoComuni = async (provinciaSigla?: string, regione?: string) => {
    if (!provinciaSigla) {
      setGeoComuni([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('provincia', provinciaSigla);
      if (regione && regione !== 'TUTTA_ITALIA') params.set('regione', regione);
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/comuni?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setGeoComuni(data.comuni || []);
    } catch {
      // ignore
    }
  };

  const fetchZonaSummary = async (reg: string, prov: string, com: string) => {
    try {
      const params = new URLSearchParams();
      if (reg && reg !== 'TUTTA_ITALIA') params.set('regione', reg);
      if (prov) params.set('provincia', prov);
      if (com) params.set('comune', com);
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/zona?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setZonaSummary(data.summary);
    } catch {
      // ignore
    }
  };

  const fetchSearchStatusAndLogs = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/sdr/search/status`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/admin/sdr/logs?limit=100`, { headers: authHeaders() }),
      ]);
      const statusData = await statusRes.json();
      const logsData = await logsRes.json();
      if (statusData.success) {
        setSearchStatus(statusData.status);
        if (statusData.status?.maps_budget) setMapsBudget(statusData.status.maps_budget);
        if (statusData.bollatura) setMapsBollatura(statusData.bollatura);
      }
      if (logsData.success) setConsoleLogs(logsData.logs || []);
    } catch {
      // ignore
    }
  };

  const fetchTerritoryMap = async (force = false) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/sdr/territory-map${force ? '?force=1' : ''}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) setTerritoryMapData(data);
    } catch {
      toast.error('Errore caricamento Mappa Territoriale Italia');
    }
  };

  const fetchProvinceComuniForMap = async (sigla: string) => {
    try {
      setLoadingMapComuni(true);
      const res = await fetch(
        `${API_URL}/api/admin/sdr/territory-comuni?provincia=${encodeURIComponent(sigla)}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) setProvinceComuniStats(data.comuni || []);
    } catch {
      toast.error('Errore caricamento comuni della provincia');
    } finally {
      setLoadingMapComuni(false);
    }
  };

  const fetchComuneCompaniesForMap = async (sigla: string, comuneName: string) => {
    try {
      setLoadingMapComuni(true);
      setSelectedMapComune(comuneName);
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        province: sigla,
        city: comuneName,
        sortBy: 'email_first',
      });
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setComuneCompanies(data.prospects || []);
    } catch {
      toast.error('Errore caricamento aziende del comune');
    } finally {
      setLoadingMapComuni(false);
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
        pipelineStatus: filterPipelineStatus,
        mapsFilter: filterMaps,
        region: filterRegion,
        province: filterProvince,
        sortBy,
        search: searchQuery,
      });
      if (filterVatOnly) params.set('vatOnly', '1');
      if (filterCity) params.set('city', filterCity);
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProspects(data.prospects || []);
        if (data.summary) setProspectsSummary(data.summary);
        setPagination(data.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
      }
    } catch {
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
        setPromoOpenedCatalog(data.openedCatalog || []);
        setPromoContacted(data.contacted || []);
        setPromoConverted(data.converted || []);
      }
    } catch {
      toast.error('Errore caricamento Clienti in Attivazione');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/drafts`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDrafts(data.drafts || []);
    } catch {
      toast.error('Errore caricamento bozze email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchB2BAgents();
    fetchGeoRegioni();
    fetchGeoProvince();
    fetchSearchStatusAndLogs();
  }, []);

  useEffect(() => {
    if (!isAppReady) return;
    if (activeTab !== 'search' && activeTab !== 'agents' && !searchStatus?.running) return;
    const timer = setInterval(() => {
      fetchSearchStatusAndLogs();
    }, 3500);
    return () => clearInterval(timer);
  }, [isAppReady, activeTab, searchStatus?.running]);

  useEffect(() => {
    fetchGeoProvince(searchRegione);
    setSearchProvincia('');
    setSearchComune('');
  }, [searchRegione]);

  useEffect(() => {
    fetchGeoComuni(searchProvincia, searchRegione);
    setSearchComune('');
  }, [searchProvincia]);

  useEffect(() => {
    if (!isAppReady) return;
    fetchZonaSummary(searchRegione, searchProvincia, searchComune);
  }, [isAppReady, searchRegione, searchProvincia, searchComune]);

  useEffect(() => {
    if (!isAppReady) return;
    if (activeTab === 'prospects') fetchProspects(1);
    if (activeTab === 'map') fetchTerritoryMap();
    if (activeTab === 'agents') fetchInboxEvents();
    if (activeTab === 'activation') fetchPromoProspects();
    if (activeTab === 'drafts') fetchDrafts();
  }, [
    activeTab,
    filterSection,
    filterVatOnly,
    filterCategory,
    filterCluster,
    filterPipelineStatus,
    filterMaps,
    filterRegion,
    filterProvince,
    filterCity,
    sortBy,
    isAppReady,
  ]);

  // ==========================================================================
  // HANDLERS OPERATIVI
  // ==========================================================================
  const handleStartSearch = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/search/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          regione: searchRegione,
          provincia: searchProvincia || null,
          comune: searchComune || null,
          categoria: searchCategoria,
          max_results: Number(searchMaxResults || 50),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Ricerca territoriale avviata!');
        fetchSearchStatusAndLogs();
      } else {
        toast.error(data.error || 'Impossibile avviare la ricerca');
      }
    } catch {
      toast.error('Errore avvio ricerca territoriale');
    } finally {
      setLoading(false);
    }
  };

  const handleStartItalyScan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/search/start-italy`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          categoria: searchCategoria,
          max_results: Number(searchMaxResults || 100),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Scansione Italia + Sentinella Auto-Update avviata!');
        fetchSearchStatusAndLogs();
      }
    } catch {
      toast.error('Errore avvio Scansione Italia');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSearch = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/search/stop`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Richiesto arresto della ricerca');
        fetchSearchStatusAndLogs();
      }
    } catch {
      toast.error('Errore arresto ricerca');
    }
  };

  const handleSaveMapsBudget = async (mode: 'free_tier' | 'daily_budget', eurAmount: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/maps-budget`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mode, daily_budget_eur: eurAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setMapsBudget(data.budget);
        setDailyBudgetInput(String(data.budget.dailyBudgetEur || 0));
        if (data.bollatura) setMapsBollatura(data.bollatura);
        toast.success(
          mode === 'free_tier'
            ? 'Attivata Strada Gratuita Google Maps (€ 0,00)!'
            : `Budget Google Maps salvato: € ${eurAmount.toFixed(2)}/giorno`
        );
      }
    } catch {
      toast.error('Errore salvataggio impostazioni Google Maps');
    }
  };

  const handleDownloadCatalogPdf = async (prospectId: number, companyName: string) => {
    try {
      toast.loading('Generazione Catalistino PDF 2gg personalizzato...', { id: 'sdr-pdf' });
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects/${prospectId}/catalog-pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Generazione PDF fallita');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = String(companyName || 'Cliente_B2B').replace(/[^a-zA-Z0-9_-]+/g, '_');
      a.href = url;
      a.download = `Catalistino_Illustrativo_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Catalistino PDF scaricato!', { id: 'sdr-pdf' });
    } catch {
      toast.error('Impossibile generare il Catalistino PDF', { id: 'sdr-pdf' });
    }
  };

  const handleCopySmartLink = async (prospectId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects/${prospectId}/smart-link`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.storefrontOfferUrl) {
        copyToClipboard(data.storefrontOfferUrl, 'Smart Link Catalistino Tracciato');
      } else {
        toast.error(data.error || 'Genera prima le credenziali per questo lead');
      }
    } catch {
      toast.error('Errore recupero Smart Link');
    }
  };

  const populateDraftInputsFromDossier = (data: any) => {
    const p = data?.prospect;
    const cat = data?.categoryInfo;
    const promo = data?.promoProspect;
    const firstDraft = data?.drafts?.[0];
    setManualEmailInput(p?.ordinaryEmail || '');
    setDraftRecipientInput(p?.ordinaryEmail || '');

    const basePct = cat?.baseDiscount ?? (p?.commercialCategory === 'RIV' ? 50 : 40);
    const extraPct = cat?.extraFirstPurchasePct ?? 10;
    const formula = `${basePct}% + ${extraPct}%`;
    const agentName = promo?.assignedAgentName || config.defaultAgentName || 'Daniele Savoia';
    const defaultSubject = `Invito a valutarci come fornitore B2B per ${p?.companyName || 'Cliente B2B'} — Izzo Distribuzione S.r.l.`;
    const defaultBody = `Gentile ${p?.companyName || 'Azienda'},

Ci permettiamo di scriverVi per presentarVi brevemente Izzo Distribuzione S.r.l., realtà specializzata nella distribuzione B2B di materiale elettrico, illuminazione LED, quadristica e fissaggio, e invitarVi a valutarci liberamente come fornitore.

Unicamente per Vostra comodità, in modo gratuito e senza alcun impegno, abbiamo preparato delle credenziali provvisorie per consultare il nostro catalogo B2B e i prezzi netti riservati, accompagnate da uno sconto di benvenuto del ${formula} qualora decideste in futuro di metterci alla prova su un primo ordine (nessun minimo d'ordine).

• Portale B2B: https://www.izzodistribuzione.it/login
• Username provvisoria: ${promo?.username || '(premi Genera Credenziali)'}
• Password temporanea: ${promo?.tempPassword || '(premi Genera Credenziali)'}
• Referente commerciale: ${agentName}

Cordiali saluti,

${agentName}
Responsabile commerciale — Izzo Distribuzione S.r.l.
Tel / WhatsApp: +39 389 0129832
Email: daniele.savoia@izzodistribuzione.com
Portale B2B: https://www.izzodistribuzione.it
Sede legale: Contrada Piano Cappelle 8, 82100 Benevento (BN) — P.IVA 01868260629 — REA BN-309049`;

    setDraftSubjectInput(firstDraft?.subject || defaultSubject);
    setDraftBodyInput(firstDraft?.bodyText || defaultBody);
  };

  const handleOpenProspectDossier = async (prospectId: number) => {
    try {
      setDossierModalOpen(true);
      setDossierLoading(true);
      setDossierTab('strategy');
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects/${prospectId}/dossier`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActiveDossier(data);
        populateDraftInputsFromDossier(data);
      } else {
        toast.error(data.error || 'Impossibile caricare il Dossier aziendale');
      }
    } catch {
      toast.error('Errore caricamento Dossier aziendale');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSaveManualEmailInDossier = async () => {
    if (!activeDossier?.prospect?.id || !manualEmailInput.trim()) return;
    try {
      setDossierLoading(true);
      const res = await fetch(
        `${API_URL}/api/admin/sdr/prospects/${activeDossier.prospect.id}/email`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ email: manualEmailInput.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        if (data.isPec) toast.error(data.message);
        else toast.success(data.message);
        if (data.dossier) setActiveDossier(data.dossier);
        fetchProspects(pagination.page);
        fetchStats();
      } else {
        toast.error(data.error || 'Indirizzo email non valido');
      }
    } catch {
      toast.error('Errore salvataggio email');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSaveDraftInDossier = async () => {
    if (!activeDossier?.prospect?.id) return;
    try {
      setDossierLoading(true);
      const res = await fetch(
        `${API_URL}/api/admin/sdr/prospects/${activeDossier.prospect.id}/draft`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            recipientEmail: draftRecipientInput,
            subject: draftSubjectInput,
            bodyText: draftBodyInput,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Bozza email salvata!');
        handleOpenProspectDossier(activeDossier.prospect.id);
      } else {
        toast.error(data.error || 'Errore salvataggio bozza');
      }
    } catch {
      toast.error('Errore salvataggio bozza');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleRerollSingleDraft = async (prospectId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects/${prospectId}/reroll-draft`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Nuova combinazione email generata!');
        if (activeDossier?.prospect?.id === prospectId && data.generated) {
          setDraftSubjectInput(data.generated.subject || '');
          setDraftBodyInput(data.generated.bodyText || '');
        }
        fetchDrafts();
      } else {
        toast.error(data.error || 'Impossibile rigenerare la combinazione');
      }
    } catch {
      toast.error('Errore rigenerazione combinazione');
    } finally {
      setLoading(false);
    }
  };

  const handleRerollReadyDrafts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/combinatorial/reroll-ready-drafts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ limit: 150 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Bozze rigenerate con testi unici!');
        fetchDrafts();
      } else {
        toast.error(data.error || 'Nessuna bozza pronta da rigenerare');
      }
    } catch {
      toast.error('Errore rigenerazione massiva bozze');
    } finally {
      setLoading(false);
    }
  };

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
          agentCode: selectedBatchAgentCode || config.defaultAgentCode || '003',
          limit: 10,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Preparate ${data.preparedCount} offerte 1° acquisto (Solo 2gg) + Smart Link Catalistino PDF!`
        );
        setSelectedProspectIds([]);
        fetchProspects(pagination.page);
        fetchStats();
        if (activeDossier?.prospect?.id && prospectIds?.includes(activeDossier.prospect.id)) {
          handleOpenProspectDossier(activeDossier.prospect.id);
        }
      } else {
        toast.error(data.error || 'Errore preparazione outreach');
      }
    } catch {
      toast.error('Errore di rete durante generazione credenziali e bozze');
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
    } catch {
      toast.error('Errore di connessione durante invio email');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExport = async (format: 'csv' | 'json') => {
    try {
      toast.loading(`Esportazione ${format.toUpperCase()} in corso...`, { id: 'sdr-export' });
      const params = new URLSearchParams({
        format,
        limit: '5000',
        section: filterSection,
        commercialCategory: filterCategory,
        categoryCluster: filterCluster,
        pipelineStatus: filterPipelineStatus,
        mapsFilter: filterMaps,
        region: filterRegion,
        province: filterProvince,
        search: searchQuery,
      });
      if (filterVatOnly) params.set('vatOnly', '1');
      if (filterCity) params.set('city', filterCity);
      const res = await fetch(`${API_URL}/api/admin/sdr/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Download fallito');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izzo_leads_b2b_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Esportazione ${format.toUpperCase()} completata!`, { id: 'sdr-export' });
    } catch {
      toast.error('Errore durante esportazione dati', { id: 'sdr-export' });
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
        setConfig((prev) => ({ ...prev, ...data.config }));
        toast.success('Configurazione SDR, Agente Predefinito e Regole 2gg salvate!');
      } else {
        toast.error(data.error || 'Errore salvataggio configurazione');
      }
    } catch {
      toast.error('Errore connessione salvataggio configurazione');
    } finally {
      setLoading(false);
    }
  };

  const handleSetSpeedGear = async (gear: 'prudente' | 'intermedia' | 'rampup_auto' | 'regime_pieno') => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/inboxes/speed-gear`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ gear }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Marcia velocità pool aggiornata!');
        fetchStats();
      } else {
        toast.error(data.error || 'Impossibile aggiornare la marcia velocità');
      }
    } catch {
      toast.error('Errore aggiornamento velocità pool');
    } finally {
      setLoading(false);
    }
  };

  const handleTestInboxSsl = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/inboxes/${id}/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Connessione SSL SMTP 465 + IMAP 993 verificata!');
      } else {
        toast.error(data.error || 'Verifica SSL fallita');
      }
      fetchStats();
    } catch {
      toast.error('Errore test connessione SSL');
    }
  };

  const handleToggleInboxActive = async (inbox: SdrInboxAccountItem) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/inboxes/${inbox.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !inbox.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(inbox.isActive ? `Casella ${inbox.email} in pausa` : `Casella ${inbox.email} riattivata`);
        fetchStats();
      }
    } catch {
      toast.error('Errore cambio stato casella');
    }
  };

  const handleDeleteInbox = async (id: number, email: string) => {
    if (!window.confirm(`Rimuovere la casella ${email} dal pool di rotazione SDR?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/inboxes/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Casella ${email} rimossa`);
        fetchStats();
      }
    } catch {
      toast.error('Errore eliminazione casella');
    }
  };

  const handleSaveInbox = async (payload: any, editId?: number): Promise<boolean> => {
    if (!payload.email) {
      toast.error('Inserisci un indirizzo email valido');
      return false;
    }
    try {
      const url = editId
        ? `${API_URL}/api/admin/sdr/inboxes/${editId}`
        : `${API_URL}/api/admin/sdr/inboxes`;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? 'Casella SSL aggiornata!' : 'Casella SSL aggiunta al pool!');
        fetchStats();
        return true;
      }
      toast.error(data.error || 'Errore salvataggio casella');
      return false;
    } catch {
      toast.error('Errore connessione salvataggio casella');
      return false;
    }
  };

  const kpis = statsData?.kpis || {
    totalProspects: 120714,
    promoLoggedIn: 0,
    promoOpenedCatalog: 0,
    promoContacted: 0,
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
        className={!isAppReady ? 'eq-splash-active' : ''}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--color-bg)',
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
                { id: 'search', label: 'Ricerca & Mining', icon: <Search size={14} /> },
                { id: 'map', label: 'Mappa Italia', icon: <MapPin size={14} /> },
                {
                  id: 'prospects',
                  label: `Lead B2B (${Number(kpis.totalProspects || 0).toLocaleString('it-IT')})`,
                  icon: <Users size={14} />,
                },
                { id: 'agents', label: 'Agenti & Audit 15/15', icon: <Bot size={14} /> },
                {
                  id: 'activation',
                  label: `Attivazione (${Number(kpis.promoLoggedIn || 0) + Number(kpis.promoOpenedCatalog || 0)})`,
                  icon: <Flame size={14} />,
                },
                { id: 'drafts', label: 'Bozze & Credenziali', icon: <Mail size={14} /> },
                { id: 'config', label: 'Offerta 1° Acquisto & PDF', icon: <Settings2 size={14} /> },
                { id: 'overview', label: 'Pool 60 Aruba SSL', icon: <Radar size={14} /> },
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
                  fetchSearchStatusAndLogs();
                  if (activeTab === 'prospects') fetchProspects(pagination.page);
                  if (activeTab === 'map') fetchTerritoryMap(true);
                  if (activeTab === 'agents') fetchInboxEvents();
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
          {activeTab === 'search' && (
            <SdrSearchMiningTab
              canWrite={canWrite}
              loading={loading}
              geoRegioni={geoRegioni}
              geoProvince={geoProvince}
              geoComuni={geoComuni}
              searchRegione={searchRegione}
              setSearchRegione={setSearchRegione}
              searchProvincia={searchProvincia}
              setSearchProvincia={setSearchProvincia}
              searchComune={searchComune}
              setSearchComune={setSearchComune}
              searchCategoria={searchCategoria}
              setSearchCategoria={setSearchCategoria}
              searchMaxResults={searchMaxResults}
              setSearchMaxResults={setSearchMaxResults}
              zonaSummary={zonaSummary}
              searchStatus={searchStatus}
              mapsBudget={mapsBudget}
              dailyBudgetInput={dailyBudgetInput}
              setDailyBudgetInput={setDailyBudgetInput}
              mapsBollatura={mapsBollatura}
              consoleLogs={consoleLogs}
              onStartSearch={handleStartSearch}
              onStartItalyScan={handleStartItalyScan}
              onStopSearch={handleStopSearch}
              onSaveMapsBudget={handleSaveMapsBudget}
              onFilterByMapsBollatura={(tier) => {
                setFilterMaps(tier);
                setFilterSection('ALL');
                setActiveTab('prospects');
              }}
              onToggleSentinel={async () => {
                const next = !(searchStatus?.sentinel?.active ?? true);
                const res = await fetch(`${API_URL}/api/admin/sdr/sentinel/toggle`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ enabled: next }),
                });
                const data = await res.json();
                if (data.success) {
                  setSearchStatus(data.status);
                  toast.success(next ? 'Sentinella 24/7 riattivata' : 'Sentinella 24/7 in pausa');
                }
              }}
              onTriggerSentinel={async () => {
                const res = await fetch(`${API_URL}/api/admin/sdr/sentinel/trigger`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ batchSize: 30 }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success(data.message);
                  fetchSearchStatusAndLogs();
                }
              }}
              onRefreshLogs={fetchSearchStatusAndLogs}
            />
          )}

          {activeTab === 'map' && (
            <SdrItalyMapTab
              territoryMapData={territoryMapData}
              mapMacroFilter={mapMacroFilter}
              setMapMacroFilter={setMapMacroFilter}
              selectedMapRegion={selectedMapRegion}
              setSelectedMapRegion={setSelectedMapRegion}
              selectedMapProvince={selectedMapProvince}
              setSelectedMapProvince={setSelectedMapProvince}
              selectedMapComune={selectedMapComune}
              setSelectedMapComune={setSelectedMapComune}
              provinceComuniStats={provinceComuniStats}
              comuneCompanies={comuneCompanies}
              loadingMapComuni={loadingMapComuni}
              onRefreshMap={() => fetchTerritoryMap(true)}
              onSelectProvince={fetchProvinceComuniForMap}
              onSelectComune={fetchComuneCompaniesForMap}
              onOpenDossier={handleOpenProspectDossier}
              onJumpToProspectsWithGeo={(reg, prov, city) => {
                setFilterRegion(reg || 'ALL');
                setFilterProvince(prov || 'ALL');
                setFilterCity(city || '');
                setActiveTab('prospects');
              }}
            />
          )}

          {activeTab === 'prospects' && (
            <SdrProspectsTableTab
              canWrite={canWrite}
              loading={loading}
              prospects={prospects}
              prospectsSummary={prospectsSummary}
              pagination={pagination}
              filterSection={filterSection}
              setFilterSection={setFilterSection}
              filterVatOnly={filterVatOnly}
              setFilterVatOnly={setFilterVatOnly}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterCluster={filterCluster}
              setFilterCluster={setFilterCluster}
              filterPipelineStatus={filterPipelineStatus}
              setFilterPipelineStatus={setFilterPipelineStatus}
              filterMaps={filterMaps}
              setFilterMaps={setFilterMaps}
              filterRegion={filterRegion}
              setFilterRegion={setFilterRegion}
              filterProvince={filterProvince}
              setFilterProvince={setFilterProvince}
              filterCity={filterCity}
              setFilterCity={setFilterCity}
              sortBy={sortBy}
              setSortBy={setSortBy}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              geoRegioni={geoRegioni}
              geoProvince={geoProvince}
              selectedProspectIds={selectedProspectIds}
              setSelectedProspectIds={setSelectedProspectIds}
              b2bAgents={b2bAgents}
              selectedBatchAgentCode={selectedBatchAgentCode}
              setSelectedBatchAgentCode={setSelectedBatchAgentCode}
              onSearchSubmit={() => fetchProspects(1)}
              onPageChange={(p) => fetchProspects(p)}
              onPrepareOutreach={handlePrepareOutreach}
              onDownloadExport={handleDownloadExport}
              onOpenDossier={handleOpenProspectDossier}
              onDownloadCatalogPdf={handleDownloadCatalogPdf}
              onCopySmartLink={handleCopySmartLink}
              onCopyValue={copyToClipboard}
              onOpenCatalogBuilder={(name, cat) => openCatalogBuilderForClient(name, cat)}
            />
          )}

          {activeTab === 'agents' && (
            <SdrAgentsAuditTab
              canWrite={canWrite}
              loading={loading}
              searchStatus={searchStatus}
              geoProvince={geoProvince}
              autopilotProvince={autopilotProvince}
              setAutopilotProvince={setAutopilotProvince}
              autopilotCategory={autopilotCategory}
              setAutopilotCategory={setAutopilotCategory}
              mockReplyProspectId={mockReplyProspectId}
              setMockReplyProspectId={setMockReplyProspectId}
              inboxEvents={inboxEvents}
              onRunProfilerAgent={async () => {
                const res = await fetch(`${API_URL}/api/admin/sdr/agents/profiler`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ limit: 30 }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success(data.message);
                  fetchSearchStatusAndLogs();
                }
              }}
              onRunMasterAuditBatch={async () => {
                const res = await fetch(`${API_URL}/api/admin/sdr/agents/audit`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ limit: 200 }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success(data.message);
                  fetchSearchStatusAndLogs();
                }
              }}
              onStartAutopilot={async () => {
                const res = await fetch(`${API_URL}/api/admin/sdr/autopilot/start`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ province: autopilotProvince, category: autopilotCategory }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('Autopilot Continuo avviato!');
                  fetchSearchStatusAndLogs();
                }
              }}
              onStopAutopilot={async () => {
                const res = await fetch(`${API_URL}/api/admin/sdr/autopilot/stop`, {
                  method: 'POST',
                  headers: authHeaders(),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('Autopilot Continuo arrestato');
                  fetchSearchStatusAndLogs();
                }
              }}
              onSimulateKillSwitchReply={async (sentiment) => {
                const res = await fetch(`${API_URL}/api/admin/sdr/agents/mock-reply`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ prospectId: Number(mockReplyProspectId || 288), sentiment }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success(data.message);
                  setInboxEvents(data.events || []);
                } else {
                  toast.error(data.error || 'Errore simulazione risposta');
                }
              }}
              onRefreshInboxEvents={fetchInboxEvents}
            />
          )}

          {activeTab === 'activation' && (
            <SdrActivationTab
              loading={loading}
              promoLoggedIn={promoLoggedIn}
              promoOpenedCatalog={promoOpenedCatalog}
              promoContacted={promoContacted}
              promoConverted={promoConverted}
              promoSubTab={promoSubTab}
              setPromoSubTab={setPromoSubTab}
              promoSearch={promoSearch}
              setPromoSearch={setPromoSearch}
              onRefreshPromo={fetchPromoProspects}
              onOpenDiscountsApp={openDiscountsApp}
              onOpenDossier={handleOpenProspectDossier}
              onDownloadCatalogPdf={handleDownloadCatalogPdf}
              onCopySmartLink={handleCopySmartLink}
              onCopyValue={copyToClipboard}
            />
          )}

          {(activeTab === 'drafts' || activeTab === 'config') && (
            <SdrDraftsConfigTab
              mode={activeTab}
              apiUrl={API_URL}
              authHeaders={authHeaders}
              canWrite={canWrite}
              loading={loading}
              drafts={drafts}
              config={config}
              setConfig={setConfig}
              b2bAgents={b2bAgents}
              enableGlobalWrites={Boolean(statsData?.enableGlobalWrites)}
              onDispatchOutreach={handleDispatchOutreach}
              onRerollSingleDraft={handleRerollSingleDraft}
              onRerollReadyDrafts={handleRerollReadyDrafts}
              onSaveConfig={handleSaveConfig}
              onOpenDiscountsApp={openDiscountsApp}
              onOpenDossier={handleOpenProspectDossier}
              onDownloadCatalogPdf={handleDownloadCatalogPdf}
              onCopySmartLink={handleCopySmartLink}
            />
          )}

          {activeTab === 'overview' && (
            <SdrSmtpPoolTab
              canWrite={canWrite}
              loading={loading}
              statsData={statsData}
              onSetSpeedGear={handleSetSpeedGear}
              onTestInboxSsl={handleTestInboxSsl}
              onToggleInboxActive={handleToggleInboxActive}
              onDeleteInbox={handleDeleteInbox}
              onSaveInbox={handleSaveInbox}
            />
          )}
        </div>
      </div>

      <SdrProspectDossierModal
        isOpen={dossierModalOpen}
        onClose={() => setDossierModalOpen(false)}
        canWrite={canWrite}
        loading={loading}
        dossierLoading={dossierLoading}
        activeDossier={activeDossier}
        dossierTab={dossierTab}
        setDossierTab={setDossierTab}
        manualEmailInput={manualEmailInput}
        setManualEmailInput={setManualEmailInput}
        draftRecipientInput={draftRecipientInput}
        setDraftRecipientInput={setDraftRecipientInput}
        draftSubjectInput={draftSubjectInput}
        setDraftSubjectInput={setDraftSubjectInput}
        draftBodyInput={draftBodyInput}
        setDraftBodyInput={setDraftBodyInput}
        onSaveManualEmail={handleSaveManualEmailInDossier}
        onSaveDraft={handleSaveDraftInDossier}
        onRerollDraft={() => {
          if (activeDossier?.prospect?.id) {
            handleRerollSingleDraft(activeDossier.prospect.id);
          }
        }}
        onPrepareOutreach={handlePrepareOutreach}
        onDispatchOutreach={handleDispatchOutreach}
        onDownloadCatalogPdf={handleDownloadCatalogPdf}
        onCopySmartLink={handleCopySmartLink}
        onOpenCatalogBuilder={openCatalogBuilderForClient}
        onCopyValue={copyToClipboard}
      />
    </>
  );
}
