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
  Plus,
  MapPin,
  Bot,
  Play,
  Square,
  Terminal,
  Globe,
  Eye,
  Building2,
  Award,
  ChevronRight,
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
import { useWindowStore } from '../store/useWindowStore';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

const SEARCH_CATEGORIES = [
  { value: 'ALL', label: '🚀 Tutte le 11 tipologie B2B (Scansione Completa)' },
  { value: 'Installatore', label: '⚡ Installatori Elettrici (IST 40%)' },
  { value: 'Rivenditore', label: '🏪 Grossisti & Rivenditori Materiale Elettrico (RIV 50%)' },
  { value: 'Illuminazione', label: '💡 Showroom Illuminazione, Architetti & Progettisti (RIV 50%)' },
  { value: 'Fotovoltaico', label: '☀️ Installatori Fotovoltaico & Energie Rinnovabili (IST 40%)' },
  { value: 'Termoidraulica', label: '❄️ Termoidraulici & Installatori Climatizzazione HVAC (IST 40%)' },
  { value: 'Sicurezza', label: '🔒 Installatori Videosorveglianza, Antifurto & Domotica (IST 40%)' },
  { value: 'Automazione', label: '⚙️ Quadristi & Automazione Industriale (IST 40%)' },
  { value: 'Edilizia', label: '🏗️ Imprese Edili, Costruttori & General Contractor (IST 40%)' },
  { value: 'Ferramenta', label: '🧰 Ferramenta, Utensilerie & Bricolage (RIV 50%)' },
  { value: 'Ascensorista', label: '🛗 Ascensoristi & Manutentori Impianti Elevatori (IST 40%)' },
  { value: 'Manutenzione', label: '🏢 Facility Management & Global Service (IST 40%)' },
];

const CLUSTER_OPTIONS = [
  { value: 'ALL', label: 'Tutte le Tipologie B2B' },
  { value: 'Installatore', label: '⚡ Installatore Elettrico (IST 40%)' },
  { value: 'Installatore_Civile', label: '⚡ Installatore Civile (IST 40%)' },
  { value: 'Rivenditore', label: '🏪 Rivenditore Materiale Elettrico (RIV 50%)' },
  { value: 'Ferramenta', label: '🧰 Ferramenta & Utensileria (RIV 50%)' },
  { value: 'Illuminazione', label: '💡 Showroom Illuminazione (RIV 50%)' },
  { value: 'Fotovoltaico', label: '☀️ Fotovoltaico & Rinnovabili (IST 40%)' },
  { value: 'Termoidraulica', label: '❄️ Termoidraulica & Clima (IST 40%)' },
  { value: 'Sicurezza', label: '🔒 Sicurezza & Videosorveglianza (IST 40%)' },
  { value: 'Automazione', label: '⚙️ Quadristi & Automazione (IST 40%)' },
  { value: 'Edilizia', label: '🏗️ Impresa Edile & Costruzioni (IST 40%)' },
  { value: 'Ascensorista', label: '🛗 Ascensoristi (IST 40%)' },
  { value: 'Manutenzione', label: '🏢 Facility Management (IST 40%)' },
];

const ITALY_SVG_REGIONS: Array<{ name: string; d: string }> = [
  { name: "Valle d'Aosta", d: 'M 90 70 L 130 65 L 140 90 L 105 105 L 85 90 Z' },
  { name: 'Piemonte', d: 'M 85 90 L 140 90 L 165 80 L 175 145 L 140 185 L 100 195 L 75 145 Z' },
  { name: 'Liguria', d: 'M 95 195 L 140 185 L 200 195 L 210 215 L 170 210 L 105 205 Z' },
  { name: 'Lombardia', d: 'M 165 75 L 235 65 L 245 130 L 255 155 L 220 180 L 170 180 L 165 110 Z' },
  { name: 'Trentino-Alto Adige', d: 'M 235 55 L 305 45 L 300 110 L 250 115 L 240 80 Z' },
  { name: 'Veneto', d: 'M 255 120 L 320 100 L 335 145 L 335 185 L 275 190 L 250 155 Z' },
  { name: 'Friuli-Venezia Giulia', d: 'M 325 95 L 375 90 L 385 140 L 345 150 L 335 115 Z' },
  { name: 'Emilia-Romagna', d: 'M 175 185 L 275 185 L 340 190 L 370 240 L 265 240 L 210 205 Z' },
  { name: 'Toscana', d: 'M 205 215 L 270 220 L 295 260 L 285 330 L 220 310 L 205 240 Z' },
  { name: 'Marche', d: 'M 285 240 L 350 250 L 355 305 L 315 315 L 295 270 Z' },
  { name: 'Umbria', d: 'M 275 275 L 310 275 L 315 335 L 275 335 Z' },
  { name: 'Lazio', d: 'M 250 325 L 305 325 L 340 375 L 345 425 L 295 420 L 255 355 Z' },
  { name: 'Abruzzo', d: 'M 320 325 L 385 345 L 390 395 L 340 385 Z' },
  { name: 'Molise', d: 'M 370 385 L 420 390 L 415 425 L 365 420 Z' },
  { name: 'Campania', d: 'M 330 425 L 400 420 L 425 470 L 405 520 L 345 480 L 335 440 Z' },
  { name: 'Puglia', d: 'M 410 410 L 490 445 L 565 520 L 530 550 L 460 495 L 420 445 Z' },
  { name: 'Basilicata', d: 'M 415 475 L 470 480 L 465 540 L 425 530 Z' },
  { name: 'Calabria', d: 'M 425 535 L 470 545 L 460 625 L 410 655 L 405 615 L 425 565 Z' },
  { name: 'Sicilia', d: 'M 285 615 L 425 610 L 395 675 L 305 660 Z' },
  { name: 'Sardegna', d: 'M 90 330 L 155 330 L 150 470 L 85 465 Z' },
];

export default function AiSdrB2BApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('search');
  const [loading, setLoading] = useState(false);

  // Overview Stats
  const [statsData, setStatsData] = useState<any>(null);

  // ==========================================================================
  // 1. STATO RICERCA & MINING (SELETTORE ISTAT + MAPS BUDGET + SENTINELLA + LOG)
  // ==========================================================================
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
  const [mapsBudget, setMapsBudget] = useState<any>({
    mode: 'free_tier',
    dailyBudgetEur: 0,
    callsToday: 0,
    spentTodayEur: 0,
    dailyCapCalls: 150,
  });
  const [dailyBudgetInput, setDailyBudgetInput] = useState<string>('0');
  const [mapsBollatura, setMapsBollatura] = useState<any>({
    verifiedMapsCount: 0,
    certifiedFreeCount: 0,
    unverifiedMapsCount: 0,
    totalCount: 120714,
  });
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);

  // ==========================================================================
  // 2. STATO MAPPA ITALIA INTERATTIVA A 3 LIVELLI
  // ==========================================================================
  const [territoryMapData, setTerritoryMapData] = useState<any>(null);
  const [selectedMapRegion, setSelectedMapRegion] = useState<string | null>(null);
  const [selectedMapProvince, setSelectedMapProvince] = useState<string | null>(null);
  const [provinceComuniStats, setProvinceComuniStats] = useState<any[]>([]);
  const [loadingMapComuni, setLoadingMapComuni] = useState(false);

  // ==========================================================================
  // 3. STATO ESPLORA PROSPECTS & MODALE DOSSIER A 3 SCHEDE
  // ==========================================================================
  const [prospects, setProspects] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCluster, setFilterCluster] = useState('ALL');
  const [filterMaps, setFilterMaps] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterProvince, setFilterProvince] = useState('ALL');
  const [filterCity, setFilterCity] = useState('');
  const [sortBy, setSortBy] = useState('email_first');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);

  // Modale Dossier Azienda a 3 Schede
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeDossier, setActiveDossier] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<'strategy' | 'anagrafica' | 'proposal'>('strategy');
  const [manualEmailInput, setManualEmailInput] = useState('');

  // ==========================================================================
  // 4. CLIENTI IN ATTIVAZIONE, BOZZE, CONFIG & POOL SMTP
  // ==========================================================================
  const [promoLoggedIn, setPromoLoggedIn] = useState<any[]>([]);
  const [promoContacted, setPromoContacted] = useState<any[]>([]);
  const [promoConverted, setPromoConverted] = useState<any[]>([]);
  const [promoSubTab, setPromoSubTab] = useState<'logged_in' | 'contacted' | 'converted'>(
    'logged_in'
  );
  const [promoSearch, setPromoSearch] = useState('');

  const [drafts, setDrafts] = useState<any[]>([]);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);

  const [config, setConfig] = useState<any>({
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
    catalogMaxProducts: 250,
    catalogPriceMode: 'LIST_AND_NET',
    timeFencingEnabled: true,
    morningWindow: '08:30-12:30',
    afternoonWindow: '14:00-17:30',
    sentinelEnabled: true,
  });

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
    const discountFormula = `${baseDiscount}% + ${extraPct}%`;
    useWindowStore.getState().openAppWithContext('b2b_catalog_builder', {
      targetCompanyName: companyName,
      commercialCategory: category,
      extraDiscountPct: extraPct,
      calculationMode: 'EXTRA_CASCADE',
      warehouseFilter: 'MAIN_2GG',
      stockDisplayMode: 'BADGE_ONLY',
      catalogTitle: `Catalistino Riservato a ${companyName}`,
      catalogSubtitle: `Offerta esclusiva valida per il primo acquisto — Sconto Riservato ${discountFormula}`,
      minOrderText: config.minOrderAmountText || "Nessun minimo d'ordine sul tuo 1° acquisto",
      shippingText:
        config.freeShippingText ||
        'Spedizione rapida 24/48h in tutta Italia da Deposito Principale (2gg)',
      openPreview: true,
    });
  };

  // ==========================================================================
  // FETCHERS
  // ==========================================================================

  const fetchStats = async () => {
    try {
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
    } catch {
      // Ignore background errors
    } finally {
      setIsAppReady(true);
    }
  };

  const fetchGeoRegioni = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/regioni`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setGeoRegioni(data.regioni || []);
    } catch {
      // ignore
    }
  };

  const fetchGeoProvince = async (regione?: string) => {
    try {
      const q = regione && regione !== 'TUTTA_ITALIA' ? `?regione=${encodeURIComponent(regione)}` : '';
      const res = await fetch(`${API_URL}/api/admin/sdr/geo/province${q}`, {
        headers: authHeaders(),
      });
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
      if (provinciaSigla) params.set('provincia', provinciaSigla);
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
        if (statusData.status?.maps_budget) {
          setMapsBudget(statusData.status.maps_budget);
        }
        if (statusData.bollatura) {
          setMapsBollatura(statusData.bollatura);
        }
      }
      if (logsData.success) {
        setConsoleLogs(logsData.logs || []);
      }
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
      if (data.success) {
        setTerritoryMapData(data);
      }
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
      if (data.success) {
        setProvinceComuniStats(data.comuni || []);
      }
    } catch {
      toast.error('Errore caricamento comuni della provincia');
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
        mapsFilter: filterMaps,
        region: filterRegion,
        province: filterProvince,
        sortBy,
        search: searchQuery,
      });
      if (filterCity) params.set('city', filterCity);
      const res = await fetch(`${API_URL}/api/admin/sdr/prospects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProspects(data.prospects || []);
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
      const res = await fetch(`${API_URL}/api/admin/sdr/drafts`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts || []);
      }
    } catch {
      toast.error('Errore caricamento bozze email');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchGeoRegioni();
    fetchGeoProvince();
    fetchSearchStatusAndLogs();
  }, []);

  // Poll search status & logs when on search or agents tab or while search is running
  useEffect(() => {
    if (!isAppReady) return;
    if (activeTab !== 'search' && activeTab !== 'agents' && !searchStatus?.running) return;
    const timer = setInterval(() => {
      fetchSearchStatusAndLogs();
    }, 3000);
    return () => clearInterval(timer);
  }, [isAppReady, activeTab, searchStatus?.running]);

  // Update geo cascading dropdowns
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
    if (activeTab === 'activation') fetchPromoProspects();
    if (activeTab === 'drafts') fetchDrafts();
  }, [
    activeTab,
    filterSection,
    filterCategory,
    filterCluster,
    filterMaps,
    filterRegion,
    filterProvince,
    filterCity,
    sortBy,
    isAppReady,
  ]);

  // ==========================================================================
  // HANDLERS RICERCA, MAPS BUDGET, AGENTI & DOSSIER
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
        body: JSON.stringify({
          mode,
          daily_budget_eur: eurAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMapsBudget(data.budget);
        setDailyBudgetInput(String(data.budget.dailyBudgetEur || 0));
        if (data.bollatura) setMapsBollatura(data.bollatura);
        toast.success(
          mode === 'free_tier'
            ? 'Attivata Strada Gratuita Google Maps (Franchigia 0,00 €)!'
            : `Budget Giornaliero Google Maps salvato: € ${eurAmount.toFixed(2)}/giorno`
        );
        fetchSearchStatusAndLogs();
      }
    } catch {
      toast.error('Errore salvataggio impostazioni Google Maps');
    }
  };

  const handleFilterByMapsBollatura = (tier: string) => {
    setFilterMaps(tier);
    setFilterSection('ALL');
    setActiveTab('prospects');
  };

  const handleRunProfilerAgent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/agents/profiler`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          regione: searchRegione !== 'TUTTA_ITALIA' ? searchRegione : undefined,
          provincia: searchProvincia || undefined,
          comune: searchComune || undefined,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSearchStatusAndLogs();
        fetchStats();
      }
    } catch {
      toast.error('Errore esecuzione Profiler Web');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMasterAuditBatch = async () => {
    try {
      setLoading(true);
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
    } catch {
      toast.error('Errore esecuzione Master Audit 15/15');
    } finally {
      setLoading(false);
    }
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
        setManualEmailInput(data.prospect?.ordinaryEmail || '');
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
    if (!activeDossier?.prospect?.id) return;
    if (!manualEmailInput.trim()) {
      toast.error('Inserisci un indirizzo email');
      return;
    }
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
        if (data.isPec) {
          toast.error(data.message);
        } else {
          toast.success(data.message);
        }
        if (data.dossier) {
          setActiveDossier(data.dossier);
        }
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
          `Create ${data.preparedCount} credenziali permanenti + Sconto 1° Acquisto + Catalistino PDF (Agente: Daniele Savoia)!`
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
    } catch {
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
          'Configurazione Sconto 1° Acquisto, Dettagli Ordine e Catalistino Allegato salvata!'
        );
      } else {
        toast.error(data.error || 'Errore salvataggio configurazione');
      }
    } catch {
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
        fetchSearchStatusAndLogs();
      }
    } catch {
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
    } catch {
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
                {
                  id: 'search',
                  label: 'Ricerca & Mining',
                  icon: <Search size={14} />,
                },
                {
                  id: 'map',
                  label: 'Mappa Italia',
                  icon: <MapPin size={14} />,
                },
                {
                  id: 'prospects',
                  label: `Lead B2B (${kpis.totalProspects.toLocaleString('it-IT')})`,
                  icon: <Users size={14} />,
                },
                {
                  id: 'agents',
                  label: 'Agenti & Audit 15/15',
                  icon: <Bot size={14} />,
                },
                {
                  id: 'activation',
                  label: `Clienti in Attivazione (${kpis.promoLoggedIn + kpis.promoContacted})`,
                  icon: <Flame size={14} />,
                },
                {
                  id: 'drafts',
                  label: 'Bozze & Credenziali',
                  icon: <Mail size={14} />,
                },
                {
                  id: 'config',
                  label: 'Offerta 1° Acquisto & PDF',
                  icon: <Settings2 size={14} />,
                },
                {
                  id: 'overview',
                  label: 'Panoramica & SMTP',
                  icon: <Radar size={14} />,
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
                  fetchSearchStatusAndLogs();
                  if (activeTab === 'prospects') fetchProspects(pagination.page);
                  if (activeTab === 'map') fetchTerritoryMap(true);
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
          {/* ====================================================================
              TAB 1: RICERCA & MINING TERRITORIALE (1:1 CON RICERCA CLIENTI)
             ==================================================================== */}
          {activeTab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {/* SELETTORE GEOGRAFICO ISTAT A 3 LIVELLI + CARD TURBO */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: 'var(--spacing-lg)',
                  alignItems: 'stretch',
                }}
              >
                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>
                        🔍 Ricerca Clienti B2B in Tutta Italia (Catalogo Ufficiale ISTAT: 20 Regioni • 107 Province • 7.904 Comuni)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Seleziona Regione, Provincia o singolo Comune (oppure scansiona l&apos;intera penisola) e la tipologia B2B.
                      </div>
                    </div>
                    <Badge variant="primary" size="sm">
                      3 Scout + 35 Sub-Agenti
                    </Badge>
                  </div>

                  {/* 3 Livelli Geografici */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        1. Regione
                      </div>
                      <Select
                        value={searchRegione}
                        onChange={(e) => setSearchRegione(e.target.value)}
                        options={[
                          { value: 'TUTTA_ITALIA', label: '🇮🇹 Tutta Italia (20 Regioni - 7.904 Comuni)' },
                          ...geoRegioni.map((r) => ({
                            value: r.nome,
                            label: `${r.nome} (${r.province_count} prov. - ${r.comuni_count} comuni)`,
                          })),
                        ]}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        2. Provincia
                      </div>
                      <Select
                        value={searchProvincia}
                        onChange={(e) => setSearchProvincia(e.target.value)}
                        options={[
                          {
                            value: '',
                            label:
                              searchRegione === 'TUTTA_ITALIA'
                                ? 'Tutte le 107 province italiane'
                                : `Tutte le province (${geoProvince.length})`,
                          },
                          ...geoProvince.map((p) => ({
                            value: p.sigla,
                            label: `${p.nome} (${p.sigla}) — ${p.comuni_count} comuni`,
                          })),
                        ]}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        3. Comune
                      </div>
                      <Select
                        value={searchComune}
                        onChange={(e) => setSearchComune(e.target.value)}
                        options={[
                          {
                            value: '',
                            label: searchProvincia
                              ? `Tutti i comuni della provincia (${geoComuni.length})`
                              : 'Tutti i comuni della zona selezionata',
                          },
                          ...geoComuni.map((c) => ({
                            value: c.nome,
                            label: `${c.nome} (${c.popolazione.toLocaleString('it-IT')} ab.)`,
                          })),
                        ]}
                      />
                    </div>
                  </div>

                  {/* Categoria B2B + Limite + Pulsanti Azione */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Tipologia di cliente (11 Categorie B2B)
                      </div>
                      <Select
                        value={searchCategoria}
                        onChange={(e) => setSearchCategoria(e.target.value)}
                        options={SEARCH_CATEGORIES}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Quante aziende nuove (per tipologia)
                      </div>
                      <Select
                        value={searchMaxResults}
                        onChange={(e) => setSearchMaxResults(e.target.value)}
                        options={[
                          { value: '10', label: '10 aziende per tipologia' },
                          { value: '25', label: '25 aziende per tipologia' },
                          { value: '50', label: '50 aziende per tipologia' },
                          { value: '100', label: '100 aziende per tipologia' },
                          { value: '250', label: '250 aziende per tipologia' },
                          { value: '500', label: '500 aziende per tipologia' },
                          { value: '10000', label: 'Nessun limite (tutta la zona)' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Riepilogo Zona ISTAT + Bottoni Avvio */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      📍 Ambito selezionato:{' '}
                      <strong style={{ color: 'var(--color-text)' }}>
                        {(zonaSummary?.comuni_in_scope ?? 7904).toLocaleString('it-IT')} comuni ISTAT
                      </strong>{' '}
                      • Già censite nel DB in questa zona:{' '}
                      <strong style={{ color: 'var(--color-primary)' }}>
                        {(zonaSummary?.aziende_gia_in_db ?? kpis.totalProspects).toLocaleString('it-IT')} aziende
                      </strong>{' '}
                      ({(zonaSummary?.email_pronte_in_db ?? kpis.emailProntaCount).toLocaleString('it-IT')} con email pronta)
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        size="md"
                        icon={<Globe size={15} />}
                        onClick={handleStartItalyScan}
                        disabled={Boolean(searchStatus?.running) || loading}
                      >
                        🇮🇹 Scansione Italia + Auto-Update
                      </Button>

                      {!searchStatus?.running ? (
                        <Button
                          variant="primary"
                          size="md"
                          icon={<Play size={15} />}
                          onClick={handleStartSearch}
                          disabled={loading}
                        >
                          Avvia ricerca
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="md"
                          icon={<Square size={15} />}
                          onClick={handleStopSearch}
                        >
                          Ferma ricerca
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassPanel>

                {/* CARD LATERALE: COSA FA LA RICERCA TURBO */}
                <GlassPanel padding="lg" radius="lg">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px' }}>
                    ⚡ Cosa fa la ricerca (TURBO: 3 Scout + 35 Sub-Agenti)
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '12px',
                      lineHeight: 1.45,
                    }}
                  >
                    <div>
                      <strong>1. 3 Scout Paralleli (PagineGialle + PagineBianche + Google Maps):</strong>{' '}
                      scansionano comune per comune saltando i comuni già esplorati e deduplicando in RAM O(1).
                    </div>
                    <div>
                      <strong>2. Verifica P.IVA &amp; VIES:</strong> recupera e valida la Partita IVA a 11 cifre (Modulo 10) e il codice ATECO.
                    </div>
                    <div>
                      <strong>3. Web Discovery Automatico:</strong> individua il sito web ufficiale e scansiona le pagine Contatti / Chi Siamo / Privacy.
                    </div>
                    <div>
                      <strong>4. Filtro Anti-PEC a 4 Livelli:</strong> scarta al 100% le caselle PEC (AgID / INI-PEC / MX) salvandole a parte come PEC Camerale.
                    </div>
                    <div>
                      <strong>5. Matching Listino IST (40%) / RIV (50%):</strong> assegna in automatico sconto base, categoria e famiglia prodotti Elmark.
                    </div>
                    <div>
                      <strong>6. Sentinella Web 24/7:</strong> continua in automatico a recuperare le email mancanti delle aziende Senza_Email.
                    </div>
                  </div>
                </GlassPanel>
              </div>

              {/* CONTROLLO COSTI GOOGLE MAPS API & 3 FASCE DI BOLLATURA */}
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      🗺️ Controllo Google Maps API: Strada Gratuita (0,00 €) vs Budget Giornaliero (€ / giorno)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Scegli se usare solo la franchigia mensile gratuita di Google Maps (0,00 €) oppure impostare un tetto massimo giornaliero.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Badge variant="primary" size="md">
                      Chiamate Maps Oggi: {mapsBudget.callsToday} / {mapsBudget.dailyCapCalls}
                    </Badge>
                    <Badge variant={mapsBudget.spentTodayEur > 0 ? 'warning' : 'success'} size="md">
                      Spesa Maps Oggi: € {Number(mapsBudget.spentTodayEur || 0).toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '14px',
                    marginBottom: '14px',
                  }}
                >
                  {/* STRADA 1: FRANCHIGIA GRATUITA 0,00 € */}
                  <div
                    onClick={() => handleSaveMapsBudget('free_tier', 0)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border:
                        mapsBudget.mode === 'free_tier'
                          ? '2px solid #16a34a'
                          : '1px solid var(--color-border)',
                      background:
                        mapsBudget.mode === 'free_tier'
                          ? 'rgba(22, 163, 74, 0.08)'
                          : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '13.5px' }}>
                        🛡️ Strada 1 — Strada Gratuita Google (Franchigia 0,00 €)
                      </span>
                      <Badge
                        variant={mapsBudget.mode === 'free_tier' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {mapsBudget.mode === 'free_tier' ? 'ATTIVA (0,00 €)' : 'Seleziona'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Usa Google Maps solo entro la soglia gratuita mensile (max 150 chiamate/giorno), dando priorità alle aziende senza sito web. Raggiunta la soglia gratuita, prosegue a costo zero su PagineGialle, PagineBianche e VIES.
                    </div>
                  </div>

                  {/* STRADA 2: BUDGET GIORNALIERO */}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border:
                        mapsBudget.mode === 'daily_budget'
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '13.5px' }}>
                        💳 Strada 2 — Imposta Budget Giornaliero (€ / giorno)
                      </span>
                      <Badge
                        variant={mapsBudget.mode === 'daily_budget' ? 'primary' : 'neutral'}
                        size="sm"
                      >
                        {mapsBudget.mode === 'daily_budget'
                          ? `ATTIVA (€ ${Number(mapsBudget.dailyBudgetEur).toFixed(2)}/g)`
                          : 'Opzionale'}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: '120px' }}>
                        <TextInput
                          type="number"
                          placeholder="0.00"
                          value={dailyBudgetInput}
                          onChange={(e) => setDailyBudgetInput(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveMapsBudget('free_tier', 0)}
                      >
                        0 € (Solo Gratis)
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveMapsBudget('daily_budget', 2)}
                      >
                        2 € / giorno
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveMapsBudget('daily_budget', 5)}
                      >
                        5 € / giorno
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleSaveMapsBudget(
                            Number(dailyBudgetInput) > 0 ? 'daily_budget' : 'free_tier',
                            Number(dailyBudgetInput || 0)
                          )
                        }
                      >
                        Salva Budget
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3 FASCE DI BOLLATURA GOOGLE MAPS (CLICCABILI) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div
                    onClick={() => handleFilterByMapsBollatura('verified_maps')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(22, 163, 74, 0.35)',
                      background: 'rgba(22, 163, 74, 0.06)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#15803d' }}>
                        ✅ Verificate su Google Maps
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Clicca per filtrare le aziende certificate Maps
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: '#15803d' }}>
                      {Number(mapsBollatura.verifiedMapsCount || 0).toLocaleString('it-IT')}
                    </div>
                  </div>

                  <div
                    onClick={() => handleFilterByMapsBollatura('certified_free')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(37, 99, 235, 0.35)',
                      background: 'rgba(37, 99, 235, 0.06)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--color-primary)' }}>
                        🌐 Date per Buone Gratis (Web / VIES / Email)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Certificate a costo 0 € tramite sito web, P.IVA o email
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-primary)' }}>
                      {Number(mapsBollatura.certifiedFreeCount || 0).toLocaleString('it-IT')}
                    </div>
                  </div>

                  <div
                    onClick={() => handleFilterByMapsBollatura('unverified_maps')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(217, 119, 6, 0.35)',
                      background: 'rgba(217, 119, 6, 0.06)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#b45309' }}>
                        ⏳ Bollate &quot;Non controllato su Maps&quot;
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        In coda per verifica gratuita Sentinella / Maps
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: '#b45309' }}>
                      {Number(mapsBollatura.unverifiedMapsCount || 0).toLocaleString('it-IT')}
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* AVANZAMENTO FASE 1 + MOTORE SENTINELLA 24/7 (FASE 2) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                {/* Avanzamento Fase 1 */}
                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      📡 Avanzamento Fase 1 (Scansione Territoriale Primaria)
                    </div>
                    <Badge
                      variant={searchStatus?.running ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {searchStatus?.phase || 'Pronto'}
                    </Badge>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                    {searchStatus?.last_message || 'Seleziona una zona e avvia la scansione.'}
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '10px',
                      borderRadius: '999px',
                      background: 'rgba(15, 23, 42, 0.1)',
                      overflow: 'hidden',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: `${searchStatus?.progress || 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #16a34a, #2563eb)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>
                        {searchStatus?.comuni_completati || 0} / {searchStatus?.comuni_totali || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        COMUNI ESPLORATI
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#15803d' }}>
                        {searchStatus?.trovate || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        AZIENDE NUOVE
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-primary)' }}>
                        {searchStatus?.profilate || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        SITI ANALIZZATI
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#d97706' }}>
                        {searchStatus?.email_pronte || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        EMAIL ORDINARIE
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Motore Autonomo Sentinella Web 24/7 (Fase 2) */}
                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px' }}>
                        🛰️ Sentinella Web 24/7 (Fase 1 → Fase 2 Automatica)
                      </span>
                      <Badge variant="success" size="sm">
                        🟢 ATTIVA IN AUTOMATICO
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Sparkles size={13} />}
                        onClick={handleRunProfilerAgent}
                        disabled={loading}
                      >
                        Esegui Ciclo Ora
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<RefreshCcw size={13} />}
                        onClick={handleTriggerSentinel}
                        disabled={loading}
                      >
                        Accoda Worker 24/7
                      </Button>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    {searchStatus?.sentinel?.last_activity ||
                      'Sentinella attiva in background: recupera email mancanti dalle aziende Senza_Email e verifica Anti-PEC.'}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>
                        {(searchStatus?.sentinel?.cycles_completed || 0) +
                          (statsData?.sentinelRuns?.length || 0)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        CICLI ESEGUITI
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#15803d' }}>
                        {kpis.emailProntaCount.toLocaleString('it-IT')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        EMAIL CERTIFICATE
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#d97706' }}>
                        {kpis.senzaEmailCount.toLocaleString('it-IT')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        IN CODA SENTINELLA
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-primary)' }}>
                        7.904
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        COMUNI ISTAT
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </div>

              {/* REGISTRO ATTIVITÀ IN TEMPO REALE (TERMINALE LIVE) */}
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                    <Terminal size={15} />
                    <span>Registro attività in tempo reale (Scout • Profiler • Anti-PEC • Master Audit 15/15)</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchSearchStatusAndLogs}
                  >
                    Aggiorna Log
                  </Button>
                </div>
                <div
                  style={{
                    background: '#0f172a',
                    color: '#e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    height: '210px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {consoleLogs.map((entry) => (
                    <div key={entry.id}>
                      <span style={{ color: '#64748b' }}>[{entry.timestamp}]</span>{' '}
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            entry.level === 'SUCCESS'
                              ? '#4ade80'
                              : entry.level === 'WARN'
                                ? '#fbbf24'
                                : entry.level === 'ERROR'
                                  ? '#f87171'
                                  : '#38bdf8',
                        }}
                      >
                        [{entry.agent}]
                      </span>{' '}
                      <span>{entry.message}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ====================================================================
              TAB 2: MAPPA TERRITORIALE ITALIA A 3 LIVELLI (SVG + DRILL-DOWN)
             ==================================================================== */}
          {activeTab === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {/* KPI Mappa */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--spacing-md)',
                }}
              >
                <StatCard
                  title="Regioni Italiane Censite"
                  value="20 / 20"
                  icon={<Globe size={18} />}
                />
                <StatCard
                  title="Province Coperte"
                  value="107 / 107"
                  icon={<MapPin size={18} />}
                />
                <StatCard
                  title="Comuni ISTAT a Catalogo"
                  value="7.904"
                  icon={<Building2 size={18} />}
                />
                <StatCard
                  title="Aziende B2B Mappate"
                  value={(territoryMapData?.totalProspects || kpis.totalProspects).toLocaleString('it-IT')}
                  icon={<Users size={18} />}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '5fr 7fr',
                  gap: 'var(--spacing-lg)',
                  alignItems: 'start',
                }}
              >
                {/* COLONNA SINISTRA: MAPPA VETTORIALE SVG DELLE 20 REGIONI */}
                <GlassPanel padding="lg" radius="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      🇮🇹 Selettore Grafico Penisola (20 Regioni)
                    </div>
                    {selectedMapRegion && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedMapRegion(null);
                          setSelectedMapProvince(null);
                          setProvinceComuniStats([]);
                        }}
                      >
                        Torna a Tutta Italia
                      </Button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <svg
                      viewBox="0 0 620 700"
                      style={{ width: '100%', maxWidth: '370px', height: 'auto', userSelect: 'none' }}
                    >
                      {ITALY_SVG_REGIONS.map((reg) => {
                        const isSelected =
                          selectedMapRegion &&
                          (selectedMapRegion.toLowerCase().includes(reg.name.toLowerCase().slice(0, 6)) ||
                            reg.name.toLowerCase().includes(selectedMapRegion.toLowerCase().slice(0, 6)));
                        return (
                          <path
                            key={reg.name}
                            d={reg.d}
                            onClick={() => {
                              setSelectedMapRegion(reg.name);
                              setSelectedMapProvince(null);
                              setProvinceComuniStats([]);
                            }}
                            fill={isSelected ? '#16a34a' : '#1e293b'}
                            stroke={isSelected ? '#4ade80' : '#64748b'}
                            strokeWidth={isSelected ? 2.5 : 1.5}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                          >
                            <title>{reg.name}</title>
                          </path>
                        );
                      })}
                    </svg>
                  </div>

                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--color-text-muted)',
                      textAlign: 'center',
                      marginTop: '6px',
                    }}
                  >
                    Clicca su una regione sulla mappa o nella lista a destra per esplorare Province e Comuni.
                  </div>
                </GlassPanel>

                {/* COLONNA DESTRA: DRILL-DOWN 3 LIVELLI (REGIONI -> PROVINCE -> COMUNI) */}
                <GlassPanel padding="lg" radius="lg">
                  {/* Breadcrumb */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                      <span
                        style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                        onClick={() => {
                          setSelectedMapRegion(null);
                          setSelectedMapProvince(null);
                          setProvinceComuniStats([]);
                        }}
                      >
                        🇮🇹 Tutta Italia
                      </span>
                      {selectedMapRegion && (
                        <>
                          <ChevronRight size={14} />
                          <span
                            style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                            onClick={() => {
                              setSelectedMapProvince(null);
                              setProvinceComuniStats([]);
                            }}
                          >
                            {selectedMapRegion}
                          </span>
                        </>
                      )}
                      {selectedMapProvince && (
                        <>
                          <ChevronRight size={14} />
                          <span>Provincia di {selectedMapProvince}</span>
                        </>
                      )}
                    </div>

                    {selectedMapRegion && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Users size={13} />}
                          onClick={() => {
                            setFilterRegion(selectedMapRegion);
                            setFilterProvince(selectedMapProvince || 'ALL');
                            setActiveTab('prospects');
                          }}
                        >
                          Vedi Aziende della Zona
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Search size={13} />}
                          onClick={() => {
                            setSearchRegione(selectedMapRegion);
                            if (selectedMapProvince) setSearchProvincia(selectedMapProvince);
                            setActiveTab('search');
                          }}
                        >
                          Lancia Scout Qui
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* LIVELLO 1: ELENCO 20 REGIONI */}
                  {!selectedMapRegion && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        maxHeight: '520px',
                        overflowY: 'auto',
                      }}
                    >
                      {(territoryMapData?.regions || []).map((r: any) => (
                        <div
                          key={r.region}
                          onClick={() => {
                            setSelectedMapRegion(r.region);
                            setSelectedMapProvince(null);
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{r.region}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {r.province_count} prov. • {r.comuni_count} comuni
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-primary)' }}>
                              {Number(r.total || 0).toLocaleString('it-IT')} lead
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                              ✉️ {Number(r.ready_count || 0).toLocaleString('it-IT')} pronte
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* LIVELLO 2: PROVINCE DELLA REGIONE SELEZIONATA */}
                  {selectedMapRegion && !selectedMapProvince && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        maxHeight: '520px',
                        overflowY: 'auto',
                      }}
                    >
                      {(territoryMapData?.provinces || [])
                        .filter(
                          (p: any) =>
                            p.regione.toLowerCase().includes(selectedMapRegion.toLowerCase().slice(0, 6)) ||
                            selectedMapRegion.toLowerCase().includes(p.regione.toLowerCase().slice(0, 6))
                        )
                        .map((p: any) => (
                          <div
                            key={p.sigla}
                            onClick={() => {
                              setSelectedMapProvince(p.sigla);
                              fetchProvinceComuniForMap(p.sigla);
                            }}
                            style={{
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                                {p.nome} ({p.sigla})
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                {p.comuni_count} comuni ISTAT • {Number(p.popolazione || 0).toLocaleString('it-IT')} ab.
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-primary)' }}>
                                {Number(p.total || 0).toLocaleString('it-IT')} lead
                              </div>
                              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                                ✉️ {Number(p.ready_count || 0).toLocaleString('it-IT')} pronte
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* LIVELLO 3: COMUNI DELLA PROVINCIA SELEZIONATA */}
                  {selectedMapRegion && selectedMapProvince && (
                    <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                      {loadingMapComuni ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          Caricamento comuni della provincia di {selectedMapProvince}...
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr
                              style={{
                                textAlign: 'left',
                                borderBottom: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              <th style={{ padding: '8px' }}>Comune ISTAT</th>
                              <th style={{ padding: '8px' }}>Popolazione</th>
                              <th style={{ padding: '8px' }}>Aziende nel DB</th>
                              <th style={{ padding: '8px' }}>Email Pronte</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {provinceComuniStats.map((c) => (
                              <tr key={c.nome} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px', fontWeight: 700 }}>
                                  {c.nome} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({c.cap})</span>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {Number(c.popolazione || 0).toLocaleString('it-IT')} ab.
                                </td>
                                <td style={{ padding: '8px', fontWeight: 700 }}>
                                  {c.total}
                                </td>
                                <td style={{ padding: '8px', color: '#15803d', fontWeight: 700 }}>
                                  {c.ready_count}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setFilterRegion('ALL');
                                        setFilterProvince(c.sigla);
                                        setFilterCity(c.nome);
                                        setActiveTab('prospects');
                                      }}
                                    >
                                      Vedi ({c.total})
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSearchRegione(c.regione);
                                        setSearchProvincia(c.sigla);
                                        setSearchComune(c.nome);
                                        setActiveTab('search');
                                      }}
                                    >
                                      Scout
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </GlassPanel>
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 3: ESPLORA 120.714 PROSPECTS + PILLOLE CLUSTER + DOSSIER 3 SCHEDE
             ==================================================================== */}
          {activeTab === 'prospects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {/* Barra Filtri Avanzata (1:1 con ricerca clienti) */}
              <GlassPanel padding="md" radius="lg">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <TextInput
                    placeholder="Cerca ragione sociale, P.IVA, comune, telefono o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProspects(1)}
                    leftIcon={<Search size={15} />}
                  />
                  <Select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tutti gli stati (120.714)' },
                      { value: 'Email_Pronta', label: '✉️ Email Ordinaria Pronta' },
                      { value: 'Senza_Email', label: '📞 Solo Telefono (Coda Sentinella)' },
                      { value: 'PEC_Scartata', label: '🛡️ Solo PEC (Bloccata)' },
                    ]}
                  />
                  <Select
                    value={filterMaps}
                    onChange={(e) => setFilterMaps(e.target.value)}
                    options={[
                      { value: 'ALL', label: '🗺️ Tutte (Bollatura Maps)' },
                      { value: 'verified_maps', label: '✅ Verificate su Google Maps' },
                      { value: 'certified_free', label: '🌐 Date per Buone Gratis (Web/VIES)' },
                      { value: 'unverified_maps', label: '⏳ Non controllato su Maps' },
                    ]}
                  />
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Listini: IST (40%) + RIV (50%)' },
                      { value: 'IST', label: 'Solo Installatori (IST — 40%)' },
                      { value: 'RIV', label: 'Solo Rivenditori / Ferramenta (RIV — 50%)' },
                    ]}
                  />
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    options={[
                      { value: 'email_first', label: 'Ordina: ✉️ Email Pronta + Score' },
                      { value: 'score_desc', label: 'Ordina: ⭐ Lead Score (0–100)' },
                      { value: 'recent', label: 'Ordina: ⏱️ Più Recenti' },
                      { value: 'city_asc', label: 'Ordina: 🏙️ Comune (A → Z)' },
                      { value: 'province_asc', label: 'Ordina: 📍 Provincia (A → Z)' },
                      { value: 'name_asc', label: 'Ordina: 🏢 Ragione Sociale (A → Z)' },
                    ]}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1.2fr auto',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <Select
                    value={filterRegion}
                    onChange={(e) => {
                      setFilterRegion(e.target.value);
                      setFilterProvince('ALL');
                      setFilterCity('');
                    }}
                    options={[
                      { value: 'ALL', label: '🗺️ Tutte le 20 Regioni' },
                      ...geoRegioni.map((r) => ({ value: r.nome, label: r.nome })),
                    ]}
                  />
                  <Select
                    value={filterProvince}
                    onChange={(e) => {
                      setFilterProvince(e.target.value);
                      setFilterCity('');
                    }}
                    options={[
                      { value: 'ALL', label: '📍 Tutte le 107 Province' },
                      ...geoProvince.map((p) => ({
                        value: p.sigla,
                        label: `${p.nome} (${p.sigla})`,
                      })),
                    ]}
                  />
                  <Select
                    value={filterCluster}
                    onChange={(e) => setFilterCluster(e.target.value)}
                    options={CLUSTER_OPTIONS}
                  />
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {filterCity && (
                      <Badge variant="primary" size="sm">
                        Comune: {filterCity}{' '}
                        <span
                          style={{ cursor: 'pointer', marginLeft: '4px' }}
                          onClick={() => setFilterCity('')}
                        >
                          ✕
                        </span>
                      </Badge>
                    )}
                    {(filterRegion !== 'ALL' ||
                      filterProvince !== 'ALL' ||
                      filterMaps !== 'ALL' ||
                      filterCluster !== 'ALL' ||
                      filterCity) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFilterRegion('ALL');
                          setFilterProvince('ALL');
                          setFilterMaps('ALL');
                          setFilterCluster('ALL');
                          setFilterCity('');
                          setSearchQuery('');
                        }}
                      >
                        Reset Filtri
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<KeyRound size={15} />}
                    onClick={() => handlePrepareOutreach()}
                    disabled={loading}
                  >
                    {selectedProspectIds.length > 0
                      ? `Genera Credenziali + Offerta 1° Acquisto (${selectedProspectIds.length})`
                      : 'Genera Batch Top 10'}
                  </Button>
                </div>
              </GlassPanel>

              {/* Tabella Lead B2B con pulsante Scheda Dossier 3 Tab */}
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
                        <th style={{ padding: '10px 8px' }}>Azienda, Score & Bollatura</th>
                        <th style={{ padding: '10px 8px' }}>Cluster & Listino</th>
                        <th style={{ padding: '10px 8px' }}>Sede Operativa</th>
                        <th style={{ padding: '10px 8px' }}>Recapiti Diretti (Zero PEC)</th>
                        <th style={{ padding: '10px 8px' }}>Credenziali B2B</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Dossier & Azioni</th>
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
                              <div
                                style={{
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: 'var(--color-text)',
                                }}
                                onClick={() => handleOpenProspectDossier(p.id)}
                              >
                                {p.companyName}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '6px',
                                  alignItems: 'center',
                                  marginTop: '3px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Badge variant="primary" size="sm">
                                  ⭐ Score {p.leadScore || 50}/100
                                </Badge>
                                {p.mapsVerificationStatus === 'Verificato_Maps' ? (
                                  <Badge variant="success" size="sm">
                                    ✅ Maps
                                  </Badge>
                                ) : p.mapsVerificationStatus === 'Certificato_Gratis' ? (
                                  <Badge variant="primary" size="sm">
                                    🌐 Certificato Gratis
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" size="sm">
                                    ⏳ Non contr. Maps
                                  </Badge>
                                )}
                                {p.vatNumber && (
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                    P.IVA {p.vatNumber}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Badge
                                  variant={p.commercialCategory === 'RIV' ? 'success' : 'primary'}
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
                              <div style={{ fontWeight: 600 }}>
                                {p.city} ({p.province})
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                {p.region}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {p.ordinaryEmail ? (
                                <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>
                                  ✉️ {p.ordinaryEmail}
                                </div>
                              ) : (
                                <Badge variant="warning" size="sm">
                                  Senza Email (Coda Sentinella)
                                </Badge>
                              )}
                              {p.phone && (
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                  📞 {p.phone}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {p.promoProspect ? (
                                <div style={{ fontSize: '11.5px' }}>
                                  <div>
                                    User: <code>{p.promoProspect.username}</code>
                                  </div>
                                  {p.promoProspect.tempPassword && (
                                    <div style={{ color: 'var(--color-text-muted)' }}>
                                      Pass: <code>{p.promoProspect.tempPassword}</code>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                  Da generare
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<Eye size={13} />}
                                  onClick={() => handleOpenProspectDossier(p.id)}
                                >
                                  Dossier 360°
                                </Button>
                                {p.ordinaryEmail && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<KeyRound size={13} />}
                                    onClick={() => handlePrepareOutreach([p.id])}
                                  >
                                    Prepara Offerta
                                  </Button>
                                )}
                              </div>
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
                    Pagina {pagination.page} di {pagination.totalPages} (Totale filtrato:{' '}
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

          {/* ====================================================================
              TAB 4: CENTRO AGENTI & MASTER AUDIT 15/15 (1:1 CON TAB-AGENTS)
             ==================================================================== */}
          {activeTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {/* 4 Agenti Operativi */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
                <GlassPanel padding="lg" radius="lg">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    1. 🔭 Agente Scout Miner
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Scansione reale su PagineGialle, PagineBianche e Google Places con filtro geografico ISTAT (7.904 comuni).
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Play size={14} />}
                    onClick={() => setActiveTab('search')}
                  >
                    Configura &amp; Avvia Scout
                  </Button>
                </GlassPanel>

                <GlassPanel padding="lg" radius="lg">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    2. 🛡️ Profiler &amp; Anti-PEC 4 Livelli
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Crawling siti web, estrazione email ordinarie, blocco AgID/INI-PEC al 100% e rilevamento marchi elettrici.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={14} />}
                    onClick={handleRunProfilerAgent}
                    disabled={loading}
                  >
                    Avvia Profiler Web (30 Siti)
                  </Button>
                </GlassPanel>

                <GlassPanel padding="lg" radius="lg">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    3. ✍️ Copywriter &amp; Credenziali B2B
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Genera Username definitiva, Password provvisoria, Regola Sconto 1° Acquisto (X%+Y%) e Catalistino PDF 2gg.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<KeyRound size={14} />}
                    onClick={() => handlePrepareOutreach()}
                    disabled={loading}
                  >
                    Genera Lotto Top 10
                  </Button>
                </GlassPanel>

                <GlassPanel padding="lg" radius="lg">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    4. 📤 Dispatcher SMTP (Time-Fencing)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Invio scaglionato con Gaussian Jitter (180–420s) nelle finestre lavorative 08:30–12:30 e 14:00–17:30.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send size={14} />}
                    onClick={() => handleDispatchOutreach()}
                    disabled={loading}
                  >
                    Invia Bozze Pronte
                  </Button>
                </GlassPanel>
              </div>

              {/* MASTER AUDIT AGENT + 15 SUB-AGENTI VALIDATORI (V01 - V15) */}
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>
                      🛡️ Master Audit Agent + 15 Sub-Agenti Validatori Specializzati (V01–V15)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Verifica ogni campo anagrafico, ripara automaticamente i dati mancanti (Self-Healing), controlla il filtro Anti-PEC e certifica i listini IST (40%) / RIV (50%).
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Award size={15} />}
                    onClick={handleRunMasterAuditBatch}
                    disabled={loading}
                  >
                    Esegui Master Audit 15/15 (Lotto 200 Aziende)
                  </Button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    fontSize: '12px',
                  }}
                >
                  {[
                    ['V01', 'Integrità Ragione Sociale & Forma Giuridica'],
                    ['V02', 'Validazione P.IVA (11 cifre Modulo 10) & VIES'],
                    ['V03', 'Coerenza Cluster B2B & Codice ATECO'],
                    ['V04', 'Allineamento Geografico ISTAT (Città, Prov, Reg, CAP)'],
                    ['V05', 'Normalizzazione Telefono E.164 & WhatsApp Mobile'],
                    ['V06', 'Verifica Sito Web Ufficiale & Dominio'],
                    ['V07', 'Filtro Anti-PEC a 4 Livelli (AgID / INI-PEC / MX)'],
                    ['V08', 'Gerarchia Casella B2B (info@ / commerciale@ / acquisti@)'],
                    ['V09', 'Matching Famiglia Prodotti Elmark & Brand Elettrici'],
                    ['V10', 'Calcolo Lead Score Multi-Fattore (0–100)'],
                    ['V11', 'Bollatura Fonte & Controllo Costi Google Maps'],
                    ['V12', 'Allineamento Listino B2B (IST Base 40% vs RIV Base 50%)'],
                    ['V13', 'Controllo Blacklist Opt-Out & Conformità GDPR B2B'],
                    ['V14', 'Integrità Sezione Operativa (Email_Pronta / Senza_Email)'],
                    ['V15', 'Assegnazione Agente Referente (Daniele Savoia - 003)'],
                  ].map(([code, label]) => (
                    <div
                      key={code}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Badge variant="success" size="sm">
                        {code}
                      </Badge>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ====================================================================
              TAB 5: CLIENTI IN ATTIVAZIONE (CONTATTATI VS 1° ACCESSO)
             ==================================================================== */}
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
                      <th style={{ padding: '10px 8px' }}>Sconto 1° Acquisto (X% + Y% • Solo 2gg)</th>
                      <th style={{ padding: '10px 8px' }}>Telemetria Accessi & GDPR</th>
                      <th style={{ padding: '10px 8px' }}>Carrello / 1° Ordine</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Catalistino & Sconti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promoSubTab === 'logged_in'
                      ? promoLoggedIn
                      : promoSubTab === 'contacted'
                        ? promoContacted
                        : promoConverted
                    ).map((item) => {
                      const basePct = item.commercialCategory === 'RIV' ? 50 : 40;
                      const extraPct = Number(
                        item.firstPurchaseRule?.discountValue ??
                          (item.commercialCategory === 'RIV'
                            ? config.rivExtraDiscountPct || 10
                            : config.istExtraDiscountPct || 10)
                      );
                      return (
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
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <Badge
                                variant={item.commercialCategory === 'RIV' ? 'success' : 'primary'}
                                size="sm"
                              >
                                {item.commercialCategory} ({basePct}% + {extraPct}%)
                              </Badge>
                              <Badge variant="warning" size="sm">
                                🎁 Sul 1° Acquisto • Solo 2gg
                              </Badge>
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
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<FileText size={13} />}
                                onClick={() =>
                                  openCatalogBuilderForClient(
                                    item.companyName,
                                    item.commercialCategory === 'RIV' ? 'RIV' : 'IST',
                                    extraPct
                                  )
                                }
                              >
                                Catalistino PDF
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Percent size={13} />}
                                onClick={openDiscountsApp}
                              >
                                Regola Sconto
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </GlassPanel>
            </div>
          )}

          {/* ====================================================================
              TAB 6: BOZZE EMAIL & CREDENZIALI
             ==================================================================== */}
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
                      Coda Bozze Outreach con Credenziali, Sconto 1° Acquisto (X% + Y% • Solo 2gg) e Catalistino PDF
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Verifica le bozze e apri il Catalistino Riservato in Catalog Builder B2B prima dell&apos;invio.
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
                      <th style={{ padding: '10px 8px' }}>Catalistino Riservato Allegato</th>
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
                            variant={d.status.includes('Inviata') ? 'success' : 'primary'}
                            size="sm"
                          >
                            {d.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<FileText size={13} />}
                              onClick={() =>
                                openCatalogBuilderForClient(
                                  d.prospect?.companyName || 'Cliente B2B',
                                  d.prospect?.commercialCategory === 'RIV' ? 'RIV' : 'IST'
                                )
                              }
                            >
                              Catalistino PDF
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setPreviewDraft(d)}
                            >
                              Anteprima Mail
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

          {/* ====================================================================
              TAB 7: CONFIGURAZIONE OFFERTA 1° ACQUISTO & CATALISTINO PDF
             ==================================================================== */}
          {activeTab === 'config' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-lg)',
                alignItems: 'start',
              }}
            >
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      1. Generatore Automatico Regola Sconto (App Sconti B2B)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Crea in automatico la regola sconto individuale per ogni lead contattato.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Percent size={14} />}
                    onClick={openDiscountsApp}
                  >
                    Apri App Sconti B2B
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(config.enableFirstPurchaseRule)}
                      onChange={(e) =>
                        setConfig({ ...config, enableFirstPurchaseRule: e.target.checked })
                      }
                    />
                    Attiva generazione automatica regola in Sconti B2B e sul Sito E-Commerce
                  </label>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Scadenza Regola Sconto:
                      </span>
                      <Badge variant="warning" size="sm">
                        🎁 Sempre &quot;Sul 1° Acquisto&quot; (Auto-consumo al checkout)
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Formula Sconto:
                      </span>
                      <Badge variant="primary" size="sm">
                        📐 Sempre X% + Y% in Cascata Composta
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Prodotti Validità Sconto:
                      </span>
                      <Badge variant="success" size="sm">
                        🟢 Sempre Tutti e Solo i Prodotti 2gg (Deposito Principale)
                      </Badge>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <TextInput
                        fullWidth
                        label="Extra Y% Installatori (IST — Base 40%)"
                        type="number"
                        value={String(config.istExtraDiscountPct)}
                        onChange={(e) =>
                          setConfig({ ...config, istExtraDiscountPct: Number(e.target.value) })
                        }
                      />
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                        Formula applicata: 40% + {Number(config.istExtraDiscountPct || 0)}% (Netto{' '}
                        {(100 - 60 * (1 - Number(config.istExtraDiscountPct || 0) / 100)).toFixed(1)}%)
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <TextInput
                        fullWidth
                        label="Extra Y% Rivenditori (RIV — Base 50%)"
                        type="number"
                        value={String(config.rivExtraDiscountPct)}
                        onChange={(e) =>
                          setConfig({ ...config, rivExtraDiscountPct: Number(e.target.value) })
                        }
                      />
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                        Formula applicata: 50% + {Number(config.rivExtraDiscountPct || 0)}% (Netto{' '}
                        {(100 - 50 * (1 - Number(config.rivExtraDiscountPct || 0) / 100)).toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '8px' }}>
                    2. Condizioni Commerciali 1° Acquisto (Mail &amp; Pagina 2 Catalistino PDF)
                  </div>
                  <TextInput
                    fullWidth
                    label="Condizione Minimo d'Ordine"
                    value={config.minOrderAmountText || ''}
                    onChange={(e) => setConfig({ ...config, minOrderAmountText: e.target.value })}
                  />
                  <TextInput
                    fullWidth
                    label="Condizioni Spedizione e Tempi di Consegna (2gg)"
                    value={config.freeShippingText || ''}
                    onChange={(e) => setConfig({ ...config, freeShippingText: e.target.value })}
                  />
                  <TextInput
                    fullWidth
                    label="Modalità di Pagamento & Referente B2B"
                    value={config.paymentTermsText || ''}
                    onChange={(e) => setConfig({ ...config, paymentTermsText: e.target.value })}
                  />
                </div>
              </GlassPanel>

              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      3. Generatore Automatico Catalistino PDF (App Catalog Builder B2B)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Pilota in automatico Catalog Builder B2B con le impostazioni predefinite per ogni cliente.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FileText size={14} />}
                    onClick={() => openCatalogBuilderForClient('Esempio Cliente B2B S.r.l.', 'IST')}
                  >
                    Apri in Catalog Builder B2B
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(config.attachCatalogPdf)}
                      onChange={(e) =>
                        setConfig({ ...config, attachCatalogPdf: e.target.checked })
                      }
                    />
                    Genera e allega automaticamente il Catalistino PDF personalizzato ad ogni email
                  </label>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 23, 42, 0.04)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Titolo Copertina &amp; Intestazione (Dinamico sul Cliente)
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text)', marginTop: '2px' }}>
                        Catalistino Riservato a [Ragione Sociale Cliente]
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Sottotitolo Offerta (Dinamico su Situazione 1° Acquisto &amp; Categoria)
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#15803d', marginTop: '2px' }}>
                        Offerta esclusiva valida per il primo acquisto — Sconto Riservato [40% o 50%] + [Y]%
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          Prodotti Inclusi nel Catalistino:
                        </span>
                        <Badge variant="success" size="sm">
                          🟢 Sempre Tutti e Solo i Prodotti 2gg
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          Visualizzazione Giacenza:
                        </span>
                        <Badge variant="success" size="sm">
                          🟢 Solo Bollino di Giacenza (Disponibile 2gg)
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          Sconto Visualizzato sulle Schede:
                        </span>
                        <Badge variant="primary" size="sm">
                          🏷️ Sempre X% + Y% (es. 40% + {Number(config.istExtraDiscountPct || 10)}%)
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginTop: '4px',
                    }}
                  >
                    <TextInput
                      fullWidth
                      label="Finestra Invio Mattina (Time-Fencing)"
                      value={config.morningWindow || '08:30-12:30'}
                      onChange={(e) => setConfig({ ...config, morningWindow: e.target.value })}
                    />
                    <TextInput
                      fullWidth
                      label="Finestra Invio Pomeriggio"
                      value={config.afternoonWindow || '14:00-17:30'}
                      onChange={(e) => setConfig({ ...config, afternoonWindow: e.target.value })}
                    />
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <Button
                      variant="primary"
                      size="md"
                      icon={<ShieldCheck size={16} />}
                      onClick={handleSaveConfig}
                      disabled={loading}
                    >
                      Salva Impostazioni Generatore Automatico (Sconto 1° Acquisto &amp; Catalistino 2gg)
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ====================================================================
              TAB 8: PANORAMICA & POOL SMTP
             ==================================================================== */}
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
                      Pool Caselle SMTP/IMAP a Rotazione &amp; Firewall Anti-PEC
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Blacklisted &amp; PEC bloccate: {kpis.blacklistCount} indirizzi.
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

      {/* ====================================================================
          MODALE DOSSIER AZIENDA COMPLETO A 3 SCHEDE (1:1 CON RICERCA CLIENTI)
         ==================================================================== */}
      <Modal
        isOpen={dossierModalOpen}
        onClose={() => {
          setDossierModalOpen(false);
          setActiveDossier(null);
        }}
        title={
          activeDossier?.prospect?.companyName
            ? `Dossier Strategico B2B — ${activeDossier.prospect.companyName}`
            : 'Caricamento Dossier Strategico...'
        }
        size="lg"
      >
        {dossierLoading && !activeDossier ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Analisi dossier e controllo Master Audit 15/15 in corso...
          </div>
        ) : activeDossier ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Selettore 3 Schede Dossier */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant={dossierTab === 'strategy' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('strategy')}
              >
                1. 📊 Relazione Strategica &amp; Prodotti Elmark
              </Button>
              <Button
                variant={dossierTab === 'anagrafica' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('anagrafica')}
              >
                2. 🏛️ Anagrafica, Contatti &amp; Audit 15/15 ({activeDossier.audit?.passedCount || 15}/15)
              </Button>
              <Button
                variant={dossierTab === 'proposal' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('proposal')}
              >
                3. ✉️ Credenziali B2B, Sconto 1° Acquisto &amp; Catalistino PDF
              </Button>
            </div>

            {/* SCHEDA 1: RELAZIONE STRATEGICA & PRODOTTI CONSIGLIATI */}
            {dossierTab === 'strategy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>
                      {activeDossier.prospect.companyName}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Badge
                        variant={
                          activeDossier.categoryInfo.commercialCategory === 'RIV'
                            ? 'success'
                            : 'primary'
                        }
                        size="sm"
                      >
                        {activeDossier.categoryInfo.commercialCategory} — Sconto Base{' '}
                        {activeDossier.categoryInfo.baseDiscount}% + Extra{' '}
                        {activeDossier.categoryInfo.extraFirstPurchasePct}%
                      </Badge>
                      <Badge variant="primary" size="sm">
                        ⭐ Score {activeDossier.prospect.leadScore}/100
                      </Badge>
                    </div>
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                    📍 {activeDossier.prospect.address || 'Indirizzo operativo'} —{' '}
                    <strong>
                      {activeDossier.prospect.city} ({activeDossier.prospect.province})
                    </strong>{' '}
                    • {activeDossier.prospect.region}
                    {activeDossier.prospect.vatNumber
                      ? ` • P.IVA: ${activeDossier.prospect.vatNumber}`
                      : ''}
                    {activeDossier.categoryInfo.atecoCode
                      ? ` • ATECO: ${activeDossier.categoryInfo.atecoCode}`
                      : ''}
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                      🎯 Famiglia Prodotti Elmark Consigliata per {activeDossier.categoryInfo.label}:
                    </div>
                    <div>{activeDossier.categoryInfo.recommendedFamily}</div>
                    {activeDossier.prospect.brandsDetected && (
                      <div style={{ marginTop: '6px', fontSize: '12px' }}>
                        <strong>Marchi trattati rilevati sul sito:</strong>{' '}
                        {activeDossier.prospect.brandsDetected}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOX INSERIMENTO / AGGIORNAMENTO EMAIL MANUALE CON ANTI-PEC */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    ✉️ Casella Email Ordinaria per Invio Offerta &amp; Credenziali (Firewall Anti-PEC Attivo)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <TextInput
                        fullWidth
                        placeholder="Inserisci o aggiorna email ordinaria (es. info@azienda.it)..."
                        value={manualEmailInput}
                        onChange={(e) => setManualEmailInput(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSaveManualEmailInDossier}
                      disabled={dossierLoading}
                    >
                      Salva &amp; Verifica Anti-PEC
                    </Button>
                  </div>
                  {activeDossier.prospect.pecCamerale && (
                    <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '6px' }}>
                      🛡️ PEC Camerale rilevata e isolata (non usata per invio promozionale):{' '}
                      <code>{activeDossier.prospect.pecCamerale}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCHEDA 2: ANAGRAFICA, BOLLATURA MAPS & MASTER AUDIT 15/15 */}
            {dossierTab === 'anagrafica' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '12.5px',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <strong>Fonte Acquisizione:</strong>{' '}
                    {activeDossier.prospect.sourceEngine || 'Directory B2B / ISTAT'} (
                    {activeDossier.mapsVerificationStatus})
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <strong>Recapito Telefonico / WhatsApp:</strong>{' '}
                    {activeDossier.prospect.phone || 'N/D'}{' '}
                    {activeDossier.prospect.whatsappPhone
                      ? `• WA: ${activeDossier.prospect.whatsappPhone}`
                      : ''}
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  🛡️ Esito 15 Sub-Agenti Validatori Master Audit ({activeDossier.audit?.passedCount || 15}/15 Superati):
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                  }}
                >
                  {(activeDossier.audit?.checks || []).map((chk: any) => (
                    <div
                      key={chk.code}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>
                          [{chk.code}] {chk.name}
                        </span>
                        <Badge variant={chk.passed ? 'success' : 'warning'} size="sm">
                          {chk.passed ? 'OK' : 'WARN'}
                        </Badge>
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        {chk.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCHEDA 3: PROPOSTA COMMERCIALE, CREDENZIALI B2B & CATALISTINO PDF */}
            {dossierTab === 'proposal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      Credenziali Portale B2B &amp; Sconto 1° Acquisto ({activeDossier.categoryInfo.baseDiscount}% + {activeDossier.categoryInfo.extraFirstPurchasePct}%)
                    </div>
                    {activeDossier.promoProspect ? (
                      <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                        Username definitiva: <code>{activeDossier.promoProspect.username}</code> •{' '}
                        Password provvisoria:{' '}
                        <code>{activeDossier.promoProspect.tempPassword || 'Impostata dal cliente'}</code>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Credenziali non ancora generate per questa azienda.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FileText size={14} />}
                      onClick={() =>
                        openCatalogBuilderForClient(
                          activeDossier.prospect.companyName,
                          activeDossier.categoryInfo.commercialCategory === 'RIV' ? 'RIV' : 'IST',
                          activeDossier.categoryInfo.extraFirstPurchasePct
                        )
                      }
                    >
                      Apri Catalistino PDF
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<KeyRound size={14} />}
                      onClick={() => handlePrepareOutreach([activeDossier.prospect.id])}
                      disabled={!activeDossier.prospect.ordinaryEmail || loading}
                    >
                      Genera / Aggiorna Credenziali &amp; Bozza
                    </Button>
                  </div>
                </div>

                {activeDossier.drafts?.[0] && (
                  <div
                    style={{
                      padding: '14px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      maxHeight: '280px',
                      overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        activeDossier.drafts[0].bodyHtml || activeDossier.drafts[0].bodyText,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

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
