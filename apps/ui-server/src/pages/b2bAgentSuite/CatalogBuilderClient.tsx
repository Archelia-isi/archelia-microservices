import React, { useState, useEffect, useMemo, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  Search,
  Eye,
  Download,
  Percent,
  Trash2,
  Settings2,
  Package,
  ChevronDown,
} from 'lucide-react';
import StickyHeader from '../../components/ui/StickyHeader';
import Tabs from '../../components/ui/Tabs';
import GlassPanel from '../../components/ui/GlassPanel';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import Switch from '../../components/ui/Switch';
import { useWindowStore } from '../../store/useWindowStore';
import {
  type AgentManagedClient,
  type CatalogFacetOption,
  type CatalogPriceMode,
  type CatalogProductItem,
  type CatalogSearchFilters,
  type CatalogSearchResponse,
  type CatalogSortMode,
  type CatalogSourceMode,
  type CatalogStockMode,
  type WarehouseFilterMode,
  generateAgentCatalogPdfAction,
  searchAgentCatalogProducts,
  searchCatalogPredictiveAction,
} from './actionsClient';
import {
  type AgentDiscountRule,
  doesRuleMatchClient,
  evaluateProductDiscountWithRules,
} from './discountRulesEngine';

interface Props {
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  discountRules?: AgentDiscountRule[];
  initialSearch: CatalogSearchResponse;
  initialPreset?: any;
}

const WAREHOUSE_OPTIONS: { value: WarehouseFilterMode; label: string; desc: string }[] = [
  {
    value: 'ALL_WAREHOUSES',
    label: 'Tutti i depositi',
    desc: 'Deposito Principale 2GG + Deposito Esterno 7GG',
  },
  {
    value: 'MAIN_2GG',
    label: 'Solo 2GG',
    desc: 'Solo Deposito Principale (Pronta Consegna 2GG)',
  },
  {
    value: 'EXTERNAL_7GG',
    label: 'Solo 7GG',
    desc: 'Solo Deposito Esterno (Consegna 7GG)',
  },
];

const PRICE_MODE_OPTIONS: { value: CatalogPriceMode; label: string; desc: string }[] = [
  {
    value: 'LIST_AND_NET',
    label: 'Listino + Sconto % + Netto',
    desc: 'Mostra prezzo di listino barrato, sconto riservato e prezzo netto finale',
  },
  {
    value: 'NET_ONLY',
    label: 'Solo Prezzo Netto Riservato',
    desc: 'Mostra esclusivamente il prezzo netto finale senza esporre la % di sconto',
  },
  {
    value: 'LIST_ONLY',
    label: 'Solo Prezzo di Listino',
    desc: 'Mostra solo il prezzo di listino pubblico senza sconti',
  },
  {
    value: 'NO_PRICE',
    label: 'Senza Prezzi (Catalogo Tecnico)',
    desc: 'Mostra solo foto, codice SKU, marchio e caratteristiche tecniche',
  },
];

const STOCK_MODE_OPTIONS: { value: CatalogStockMode; label: string; desc: string }[] = [
  {
    value: 'BADGE_ONLY',
    label: 'Solo Bollino Disponibilità (2GG / 7GG)',
    desc: 'Indica Pronta Consegna 2GG o Disponibile 7GG senza mostrare i pezzi esatti',
  },
  {
    value: 'HIDE_STOCK',
    label: 'Nascondi Disponibilità al Cliente',
    desc: 'Non mostra alcuna informazione su giacenze o depositi nel PDF',
  },
  {
    value: 'EXACT_QTY',
    label: 'Mostra Quantità Esatte per Deposito',
    desc: 'Stampa i pezzi esatti disponibili in Dep. 2GG e Dep. 7GG',
  },
];

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: CatalogFacetOption[];
  selectedValues: string[];
  onChange: (next: string[]) => void;
}

function MultiSelectFacetDropdown({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggleOption = (code: string) => {
    if (selectedValues.includes(code)) {
      onChange(selectedValues.filter(v => v !== code));
    } else {
      onChange([...selectedValues, code]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--color-text-muted)',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <div
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border:
            selectedValues.length > 0
              ? '2px solid var(--color-primary)'
              : '1px solid var(--color-border)',
          background: 'var(--color-surface-solid)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: selectedValues.length > 0 ? 700 : 500,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedValues.length === 0
            ? placeholder
            : selectedValues.length === 1
            ? options.find(o => o.code === selectedValues[0])?.label || selectedValues[0]
            : `${selectedValues.length} selezionati (${selectedValues.join(', ')})`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {selectedValues.length > 0 && (
            <span
              onClick={e => {
                e.stopPropagation();
                onChange([]);
              }}
              style={{
                padding: '1px 5px',
                fontSize: '10px',
                fontWeight: 800,
                background: 'var(--color-hover-dark)',
                borderRadius: '4px',
              }}
              title="Azzera selezione"
            >
              ✕
            </span>
          )}
          <ChevronDown size={14} />
        </div>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 60,
            left: 0,
            right: 0,
            marginTop: '6px',
            background: 'var(--color-surface-solid)',
            border: '1px solid var(--color-border-dark)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
            <TextInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Cerca in ${label.toLowerCase()}...`}
              leftIcon={<Search size={13} />}
              fullWidth
            />
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                }}
              >
                Nessuna opzione trovata
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.code);
                return (
                  <div
                    key={opt.code}
                    onClick={() => toggleOption(opt.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                      fontWeight: isSelected ? 700 : 500,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={opt.label}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <Badge variant={isSelected ? 'primary' : 'neutral'} size="sm">
                      {opt.count}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
          {selectedValues.length > 0 && (
            <div
              style={{
                padding: '6px 10px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {selectedValues.length} selezionati
              </span>
              <Button type="button" variant="danger" size="sm" onClick={() => onChange([])}>
                Deseleziona tutti
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CatalogBuilderClient({
  agentName,
  agentCode,
  clients,
  discountRules = [],
  initialSearch,
  initialPreset,
}: Props) {
  // --- STATO FILTRI ---
  const [catalogSource] = useState<CatalogSourceMode>('ZUCCHETTI');
  const [warehouse, setWarehouse] = useState<WarehouseFilterMode>(
    initialPreset?.warehouseFilter || 'ALL_WAREHOUSES'
  );
  const [includeZeroStock, setIncludeZeroStock] = useState<boolean>(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortMode>('TAXONOMY_ASC');

  // --- STATO BARRA PREDITTIVA (COME NELLE BARRE ESISTENTI DEL SITO) ---
  const [query, setQuery] = useState('');
  const [predictiveResults, setPredictiveResults] = useState<CatalogProductItem[]>([]);
  const [predictiveFound, setPredictiveFound] = useState<number>(0);
  const [isPredictiveOpen, setIsPredictiveOpen] = useState<boolean>(false);
  const [isPredictiveLoading, setIsPredictiveLoading] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const predictiveContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- LISTA UNICA E DIRETTA DELLE SCHEDE NEL CATALOGO ---
  // Parte vuota: si popola cliccando i prodotti dalla barra predittiva (es. e45 -> il34 -> ...)
  // oppure selezionando un filtro (Marchio, Gruppo, Famiglia, Categoria).
  const [catalogItems, setCatalogItems] = useState<CatalogProductItem[]>([]);
  const [facets, setFacets] = useState(
    initialSearch.facets || { brands: [], productGroups: [], families: [], categories: [] }
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastAddedSku, setLastAddedSku] = useState<string | null>(null);
  const [currentSheet, setCurrentSheet] = useState<number>(0);

  // --- STATO CONFIGURAZIONE CATALOGO / CLIENTE / PREZZI / GIACENZE ---
  const [catalogTitle, setCatalogTitle] = useState(
    initialPreset?.catalogTitle || 'Catalogo Prodotti Selezionati'
  );
  const [catalogSubtitle, setCatalogSubtitle] = useState(initialPreset?.catalogSubtitle || '');
  const [priceMode, setPriceMode] = useState<CatalogPriceMode>('LIST_AND_NET');
  const [stockMode, setStockMode] = useState<CatalogStockMode>(
    initialPreset?.stockDisplayMode || 'BADGE_ONLY'
  );

  // Selezione predittiva cliente per applicare automaticamente i suoi sconti
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchText, setClientSearchText] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [baseDiscount, setBaseDiscount] = useState<number>(
    initialPreset?.commercialCategory === 'RIV'
      ? 50
      : initialPreset?.commercialCategory === 'IST'
      ? 40
      : 0
  );
  const [extraDiscount, setExtraDiscount] = useState<number>(
    initialPreset?.extraDiscountPct !== undefined ? Number(initialPreset.extraDiscountPct) : 0
  );
  const [elmarkDiscounts, setElmarkDiscounts] = useState<Record<string, number>>({});

  // Se l'app viene aperta da AI SDR con un preset per un cliente specifico, pre-seleziona il cliente e carica i prodotti 2GG
  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.catalogTitle) setCatalogTitle(initialPreset.catalogTitle);
    if (initialPreset.catalogSubtitle) setCatalogSubtitle(initialPreset.catalogSubtitle);
    if (initialPreset.warehouseFilter) setWarehouse(initialPreset.warehouseFilter);
    if (initialPreset.stockDisplayMode) setStockMode(initialPreset.stockDisplayMode);

    if (initialPreset.targetCompanyName && clients.length > 0) {
      const targetLower = String(initialPreset.targetCompanyName).trim().toLowerCase();
      const matched = clients.find(
        c => (c.companyName || '').trim().toLowerCase() === targetLower
      );
      if (matched) {
        setSelectedClientId(matched.id);
        setClientSearchText(`${matched.companyName} (${matched.zucchettiCode})`);
        setBaseDiscount(Number(matched.discount || (initialPreset.commercialCategory === 'RIV' ? 50 : 40)));
        setExtraDiscount(0);
        setElmarkDiscounts(matched.elmarkDiscounts || {});
      } else {
        setClientSearchText(initialPreset.targetCompanyName);
        setBaseDiscount(initialPreset.commercialCategory === 'RIV' ? 50 : 40);
        setExtraDiscount(Number(initialPreset.extraDiscountPct || 10));
      }
    }

    // Carica automaticamente tutti i prodotti 2GG per il Catalistino AI SDR
    let cancelled = false;
    setIsSearching(true);
    searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: '',
      warehouse: initialPreset.warehouseFilter || 'MAIN_2GG',
      includeZeroStock: false,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'TAXONOMY_ASC',
    }).then(res => {
      if (cancelled) return;
      setIsSearching(false);
      if (res.success) {
        setFacets(res.facets);
        setCatalogItems(res.products);
        setCurrentSheet(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialPreset]);

  // Vista UI, Modale Anteprima a tutto schermo, FlipBook Ref, Zoom e generazione PDF
  const [showConfigPanel, _setShowConfigPanel] = useState<boolean>(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewViewMode, setPreviewViewMode] = useState<'SINGLE' | 'DOUBLE'>('DOUBLE');
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const flipBookRef = useRef<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Chiudi dropdown predittivi cliccando fuori
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (
        predictiveContainerRef.current &&
        !predictiveContainerRef.current.contains(e.target as Node)
      ) {
        setIsPredictiveOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Ricerca predittiva live (160ms debounce, identica a PredictiveSearchBar.tsx del sito)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setPredictiveResults([]);
      setPredictiveFound(0);
      setIsPredictiveOpen(false);
      setIsPredictiveLoading(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPredictiveLoading(true);
      try {
        const res = await searchCatalogPredictiveAction(trimmed, warehouse, includeZeroStock);
        if (cancelled) return;
        if (res.success) {
          setPredictiveResults(res.products || []);
          setPredictiveFound(res.totalFound || 0);
          setIsPredictiveOpen(true);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) {
          setIsPredictiveLoading(false);
        }
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, warehouse, includeZeroStock]);

  // Verifica se c'è almeno un filtro di reparto/marchio attivo
  const hasCategoryOrBrandFilter =
    selectedBrands.length > 0 ||
    selectedProductGroups.length > 0 ||
    selectedFamilies.length > 0 ||
    selectedCategories.length > 0;

  // Quando l'agente seleziona o modifica i filtri (Marchio, Gruppo, Famiglia, Categoria, Deposito),
  // aggiorna le faccette; se ha selezionato un Marchio/Gruppo/Famiglia/Categoria, carica quei prodotti nel catalogo.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    async function syncFilters() {
      // Se non c'è alcun filtro Marchio/Gruppo/Famiglia/Categoria selezionato, aggiorniamo solo le faccette
      // senza sovrascrivere i prodotti che l'agente ha aggiunto a mano uno per uno!
      if (!hasCategoryOrBrandFilter) {
        const res = await searchAgentCatalogProducts({
          catalogSource,
          query: '',
          warehouse,
          includeZeroStock,
          brands: [],
          productGroups: [],
          families: [],
          categories: [],
          sortBy,
          limit: 1,
        });
        if (!cancelled && res.success) {
          setFacets(res.facets);
        }
        return;
      }

      setIsSearching(true);
      setSearchError('');
      const filters: CatalogSearchFilters = {
        catalogSource,
        query: '',
        warehouse,
        includeZeroStock,
        brands: selectedBrands,
        productGroups: selectedProductGroups,
        families: selectedFamilies,
        categories: selectedCategories,
        sortBy,
      };
      const res = await searchAgentCatalogProducts(filters);
      if (cancelled) return;
      setIsSearching(false);
      if (!res.success) {
        setSearchError(res.error || 'Errore durante il caricamento dei prodotti.');
        return;
      }
      setFacets(res.facets);
      setCatalogItems(res.products);
      setCurrentSheet(0);
    }

    syncFilters();
    return () => {
      cancelled = true;
    };
  }, [
    catalogSource,
    warehouse,
    includeZeroStock,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
    hasCategoryOrBrandFilter,
  ]);

  // Aggiunge un singolo prodotto al catalogo dalla tendina predittiva e svuota subito la barra
  // così l'agente può digitare immediatamente il codice successivo (es. e45 -> clic -> il34 -> clic)
  const handleAddSingleProductFromPredictive = (product: CatalogProductItem) => {
    setCatalogItems(prev => {
      // Se è già presente, non duplicarlo
      if (prev.some(p => p.id === product.id || p.sku === product.sku)) {
        return prev;
      }
      return [...prev, product];
    });
    setLastAddedSku(product.sku);
    setQuery('');
    setPredictiveResults([]);
    setIsPredictiveOpen(false);
    setActiveIndex(-1);
    searchInputRef.current?.focus();
  };

  // Aggiunge TUTTI i risultati corrispondenti alla parola cercata nella barra predittiva
  const handleAddAllFromSearchQuery = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsPredictiveOpen(false);
    setIsSearching(true);
    setSearchError('');
    const res = await searchAgentCatalogProducts({
      catalogSource,
      query: trimmed,
      warehouse,
      includeZeroStock,
      brands: selectedBrands,
      productGroups: selectedProductGroups,
      families: selectedFamilies,
      categories: selectedCategories,
      sortBy,
    });
    setIsSearching(false);
    if (!res.success) {
      setSearchError(res.error || 'Errore durante il caricamento dei prodotti.');
      return;
    }
    setCatalogItems(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = res.products.filter(p => !existingIds.has(p.id));
      return [...prev, ...toAdd];
    });
    setQuery('');
  };

  // Gestione tasti frecce / Invio / Escape nella barra predittiva (come in PredictiveSearchBar.tsx)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPredictiveOpen) {
      if (e.key === 'ArrowDown' && query.trim().length > 0 && predictiveResults.length > 0) {
        setIsPredictiveOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < predictiveResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < predictiveResults.length) {
        handleAddSingleProductFromPredictive(predictiveResults[activeIndex]);
      } else if (predictiveResults.length > 0) {
        handleAddSingleProductFromPredictive(predictiveResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsPredictiveOpen(false);
      setActiveIndex(-1);
    }
  };

  // Rimuove una scheda dal catalogo con 1 clic
  const handleRemoveProductFromCatalog = (productId: string) => {
    setCatalogItems(prev => prev.filter(p => p.id !== productId));
  };

  // Svuota tutto il catalogo
  const handleClearCatalog = () => {
    setCatalogItems([]);
    setSelectedBrands([]);
    setSelectedProductGroups([]);
    setSelectedFamilies([]);
    setSelectedCategories([]);
    setLastAddedSku(null);
    setCurrentSheet(0);
  };

  // Clienti filtrati in modo predittivo
  const filteredClients = useMemo(() => {
    const q = clientSearchText.trim().toLowerCase();
    if (!q) return clients.slice(0, 60);
    return clients
      .filter(
        c =>
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.zucchettiCode || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.vatNumber || '').toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [clients, clientSearchText]);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const handleSelectClient = (client: AgentManagedClient | null) => {
    if (!client) {
      setSelectedClientId('');
      setClientSearchText('');
      setBaseDiscount(0);
      setExtraDiscount(0);
      setElmarkDiscounts({});
      setIsClientDropdownOpen(false);
      return;
    }
    setSelectedClientId(client.id);
    setClientSearchText(`${client.companyName} (${client.zucchettiCode})`);
    setBaseDiscount(Number(client.discount || 0));
    setExtraDiscount(0);
    setElmarkDiscounts(client.elmarkDiscounts || {});
    setIsClientDropdownOpen(false);
  };

  // Regole di sconto attive pertinenti per il cliente selezionato (o per tutti i clienti)
  const applicableRulesCount = useMemo(() => {
    return (discountRules || []).filter(r => {
      if (!r.isActive) return false;
      if (r.clientScope === 'ALL_CLIENTS') return true;
      if (!selectedClient) return false;
      return doesRuleMatchClient(r, {
        clientId: selectedClient.id,
        clientCode: selectedClient.zucchettiCode,
        clientCategory: selectedClient.categoriaCode || selectedClient.customerType || null,
        baseDiscount: Number(selectedClient.discount || 0),
      });
    }).length;
  }, [discountRules, selectedClient]);

  // Calcolo prezzo netto e sconto per singolo prodotto (Sconto Base Fisso + Regole Sconto Prodotto/Marchio/Categoria)
  const calculateProductPricing = (product: CatalogProductItem) => {
    return evaluateProductDiscountWithRules(
      {
        sku: product.sku,
        brand: product.brand,
        productGroup: product.productGroup,
        family: product.family,
        category: product.category,
        listPrice: Number(product.listPrice || 0),
        catalogSource: product.catalogSource,
        discgroup: product.discgroup,
      },
      Number(baseDiscount || 0),
      discountRules || [],
      {
        clientId: selectedClient?.id || null,
        clientCode: selectedClient?.zucchettiCode || null,
        clientCategory: selectedClient?.categoriaCode || selectedClient?.customerType || null,
        baseDiscount: Number(baseDiscount || 0),
      },
      selectedClient ? 0 : Number(extraDiscount || 0)
    );
  };

  // Prodotti del catalogo ordinati secondo la scelta "Ordina per"
  const sortedCatalogProducts = useMemo(() => {
    const copy = [...catalogItems];
    if (sortBy === 'INSERTION_ORDER') {
      return copy;
    }
    if (sortBy === 'TAXONOMY_ASC') {
      copy.sort((a, b) => {
        const gA = (a.productGroupLabel || a.productGroup || 'ZZZ').trim();
        const gB = (b.productGroupLabel || b.productGroup || 'ZZZ').trim();
        const cmpG = gA.localeCompare(gB, 'it', { sensitivity: 'base' });
        if (cmpG !== 0) return cmpG;

        const fA = (a.familyLabel || a.family || 'ZZZ').trim();
        const fB = (b.familyLabel || b.family || 'ZZZ').trim();
        const cmpF = fA.localeCompare(fB, 'it', { sensitivity: 'base' });
        if (cmpF !== 0) return cmpF;

        const cA = (a.categoryLabel || a.category || 'ZZZ').trim();
        const cB = (b.categoryLabel || b.category || 'ZZZ').trim();
        const cmpC = cA.localeCompare(cB, 'it', { sensitivity: 'base' });
        if (cmpC !== 0) return cmpC;

        return (a.sku || '').localeCompare(b.sku || '', 'it', { numeric: true });
      });
    } else if (sortBy === 'STOCK_DESC') {
      copy.sort((a, b) => b.stockMain - a.stockMain || b.stockEk - a.stockEk);
    } else if (sortBy === 'SKU_ASC') {
      copy.sort((a, b) => (a.sku || '').localeCompare(b.sku || '', 'it', { numeric: true }));
    } else if (sortBy === 'PRICE_ASC') {
      copy.sort((a, b) => a.listPrice - b.listPrice);
    } else if (sortBy === 'PRICE_DESC') {
      copy.sort((a, b) => b.listPrice - a.listPrice);
    } else if (sortBy === 'TITLE_ASC') {
      copy.sort((a, b) =>
        (a.originalName || a.title || '').localeCompare(b.originalName || b.title || '', 'it', {
          sensitivity: 'base',
        })
      );
    }
    return copy;
  }, [catalogItems, sortBy]);

  const productSheetsCount = Math.max(1, Math.ceil(sortedCatalogProducts.length / 6));
  const totalSheets = sortedCatalogProducts.length > 0 ? 2 + productSheetsCount : 1;
  const safeCurrentSheet = Math.min(Math.max(0, currentSheet), totalSheets - 1);

  // In modalità 2 pagine (Libro Aperto), mostriamo le pagine accoppiate (0-1, 2-3, 4-5...)
  const leftSpreadSheet =
    previewViewMode === 'DOUBLE' ? Math.floor(safeCurrentSheet / 2) * 2 : safeCurrentSheet;
  const _rightSpreadSheet = previewViewMode === 'DOUBLE' ? leftSpreadSheet + 1 : null;
  void _rightSpreadSheet;
  const pageStep = previewViewMode === 'DOUBLE' ? 2 : 1;
  const canGoPrev =
    previewViewMode === 'DOUBLE' ? leftSpreadSheet > 0 : safeCurrentSheet > 0;
  const canGoNext =
    previewViewMode === 'DOUBLE'
      ? leftSpreadSheet + 2 < totalSheets
      : safeCurrentSheet < totalSheets - 1;

  const goToSheet = (targetSheet: number) => {
    const clamped = Math.min(Math.max(0, targetSheet), totalSheets - 1);
    const normalizedTarget =
      previewViewMode === 'DOUBLE' ? Math.floor(clamped / 2) * 2 : clamped;
    const pf = flipBookRef.current?.pageFlip?.();
    if (pf) {
      try {
        pf.flip(normalizedTarget, 'top');
        return;
      } catch {
        // fallback diretto se l'animazione non è disponibile
      }
    }
    setCurrentSheet(normalizedTarget);
  };

  const handlePrevPage = () => {
    if (!canGoPrev) return;
    const pf = flipBookRef.current?.pageFlip?.();
    if (pf) {
      try {
        pf.flipPrev('top');
        return;
      } catch {
        // fallback
      }
    }
    const base = previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet;
    setCurrentSheet(Math.max(0, base - pageStep));
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    const pf = flipBookRef.current?.pageFlip?.();
    if (pf) {
      try {
        pf.flipNext('top');
        return;
      } catch {
        // fallback
      }
    }
    const base = previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet;
    setCurrentSheet(Math.min(totalSheets - 1, base + pageStep));
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(50, prev - 15));
  const handleZoomReset = () => setZoomLevel(100);

  // Navigazione da tastiera e blocco scroll pagina quando il modale anteprima è aperto
  useEffect(() => {
    if (!isPreviewModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewModalOpen(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPreviewModalOpen, safeCurrentSheet, leftSpreadSheet, previewViewMode, totalSheets]);

  // Quando l'agente aggiunge un singolo prodotto dalla barra predittiva,
  // sfoglia automaticamente al foglio A4 dove si trova quel prodotto appena inserito
  useEffect(() => {
    if (!lastAddedSku || sortedCatalogProducts.length === 0) return;
    const idx = sortedCatalogProducts.findIndex(p => p.sku === lastAddedSku);
    if (idx >= 0) {
      setCurrentSheet(2 + Math.floor(idx / 6));
    }
  }, [lastAddedSku, sortedCatalogProducts]);

  // Stringa descrittiva dei filtri attivi (stampata anche nel PDF)
  const filterSummaryText = useMemo(() => {
    const parts: string[] = ['Izzo Distribuzione'];

    const whLabel = WAREHOUSE_OPTIONS.find(w => w.value === warehouse)?.label;
    if (whLabel) {
      parts.push(
        `Deposito: ${whLabel}${includeZeroStock ? ' (inclusi giacenza 0)' : ''}`
      );
    }

    if (selectedBrands.length > 0) {
      const labels = selectedBrands.map(
        b => facets.brands.find(f => f.code === b)?.label || b
      );
      parts.push(`Marchi: ${labels.join(', ')}`);
    }
    if (selectedProductGroups.length > 0) {
      const labels = selectedProductGroups.map(
        g => facets.productGroups.find(f => f.code === g)?.label || g
      );
      parts.push(`Gruppi: ${labels.join(', ')}`);
    }
    if (selectedFamilies.length > 0) {
      const labels = selectedFamilies.map(
        fam => facets.families.find(f => f.code === fam)?.label || fam
      );
      parts.push(`Famiglie: ${labels.join(', ')}`);
    }
    if (selectedCategories.length > 0) {
      const labels = selectedCategories.map(
        cat => facets.categories.find(f => f.code === cat)?.label || cat
      );
      parts.push(`Categorie: ${labels.join(', ')}`);
    }
    return parts.join(' • ');
  }, [
    warehouse,
    includeZeroStock,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
    facets,
  ]);

  const handleDownloadPdf = async () => {
    if (sortedCatalogProducts.length === 0) {
      setPdfError('Aggiungi almeno un prodotto al catalogo per generare il PDF.');
      return;
    }
    setIsGeneratingPdf(true);
    setPdfError('');

    try {
      const siteOrigin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://www.izzodistribuzione.it';

      const itemsPayload = sortedCatalogProducts.map(p => {
        const pricing = calculateProductPricing(p);
        const catParts = [p.productGroupLabel, p.familyLabel, p.categoryLabel].filter(Boolean);
        return {
          sku: p.sku,
          title: p.originalName || p.title,
          brand: p.brandLabel || p.brand,
          categoryLabel: catParts[catParts.length - 1] || '',
          technicalDesc: p.technicalDesc || p.description || '',
          unit: p.unit || 'PZ',
          listPrice: pricing.listPrice,
          netPrice: pricing.netPrice,
          discountPct: pricing.discountPct,
          discountLabel: pricing.discountLabel,
          discountExpiresFormatted: pricing.appliedRuleExpiresFormatted || undefined,
          stockMain: p.stockMain,
          stockEk: p.stockEk,
          stockTotal: p.stockTotal,
          catalogSource: p.catalogSource,
          imageUrl: p.imageUrl,
          productId: p.id,
          productUrl: `${siteOrigin}/product/${encodeURIComponent(p.id || p.sku)}`,
        };
      });

      const res = await generateAgentCatalogPdfAction({
        catalogTitle: catalogTitle.trim() || 'Catalogo Prodotti Selezionati',
        catalogSubtitle: catalogSubtitle.trim() || undefined,
        clientName: selectedClient?.companyName || undefined,
        clientCode: selectedClient?.zucchettiCode || undefined,
        agentName,
        filterSummary: filterSummaryText,
        priceMode,
        stockMode,
        baseDiscount,
        extraDiscount,
        elmarkDiscounts,
        items: itemsPayload,
      });

      if (!res.success || !res.pdfBase64) {
        setPdfError(res.error || 'Impossibile generare il PDF.');
        setIsGeneratingPdf(false);
        return;
      }

      const byteCharacters = atob(res.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = res.pdfFileName || 'Catalogo_Izzo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      setPdfError(e.message || 'Errore imprevisto durante la creazione del PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Bollini giacenza identici a PredictiveSearchBar.tsx del sito
  const renderPredictiveStockBadges = (product: CatalogProductItem) => {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {product.stockMain > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-main/10 text-brand-main border border-brand-main/20">
            2GG: {product.stockMain} {product.unit || 'PZ'}
          </span>
        )}
        {product.stockEk > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
            7GG: {product.stockEk} {product.unit || 'PZ'}
          </span>
        )}
        {product.stockMain <= 0 && product.stockEk <= 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
            Esaurito
          </span>
        )}
      </div>
    );
  };

  const catalogIdsSet = useMemo(
    () => new Set(catalogItems.map(p => p.id)),
    [catalogItems]
  );

  // Renderizza un singolo Foglio A4 (Copertina su sheetIdx === 0 + Pagine da 6 schede 2x3) compatibile con HTMLFlipBook (StPageFlip)
  const renderA4Sheet = (sheetIdx: number) => {
    const todayStr = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // FOGLIO 1 (sheetIdx === 0): COPERTINA INTEGRATA (SENZA BLOCCHI) CON IL LOGO AL CENTRO
    if (sheetIdx === 0 && sortedCatalogProducts.length > 0) {
      return (
        <div
          key="cover-sheet-0"
          className="w-[740px] h-[1020px] bg-black text-white border border-gray-800 shadow-2xl overflow-hidden select-none relative"
        >
          {/* Wrapper interno a tutta altezza (necessario perché HTMLFlipBook/StPageFlip forza display:block sul nodo radice) */}
          <div className="w-full h-[1020px] relative bg-black text-white">
            {/* Striscia verde istituzionale in alto */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-[#00c800]" />

            {/* Cornice perimetrale unica continua da cima a fondo (nessuna divisione a blocchi) */}
            <div className="absolute top-8 bottom-8 left-6 right-6 border border-slate-800 p-1.5 flex flex-col">
              {/* Angolari verdi agli estremi della cornice della pagina */}
              <span className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#00e626]" />
              <span className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#00e626]" />
              <span className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#00e626]" />
              <span className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#00e626]" />

              <div className="flex-1 h-full border border-[#00c800]/50 px-10 py-10 flex flex-col items-center justify-between text-center">
                {/* 1. Intestazione superiore integrata: i 3 settori merceologici */}
                <div className="w-full flex flex-col items-center pt-2">
                  <div className="text-xs font-black tracking-[0.25em] text-[#00e626] uppercase mb-2.5">
                    Distribuzione B2B Ufficiale
                  </div>
                  <div className="text-base font-black tracking-[0.18em] text-white uppercase">
                    Materiale Elettrico &nbsp;&bull;&nbsp; Illuminazione &nbsp;&bull;&nbsp; Ferramenta
                  </div>
                  <div className="w-80 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mt-4" />
                </div>

                {/* 2. CENTRO UNICO INTEGRATO: LOGO IZZO DISTRIBUZIONE + FRASE AD EFFETTO */}
                <div className="w-full flex flex-col items-center justify-center my-auto py-6">
                  <div className="w-64 h-px bg-gradient-to-r from-transparent via-[#00c800]/60 to-transparent mb-8" />

                  <img
                    src="/logo-izzo.png"
                    alt="Izzo Distribuzione S.r.l."
                    className="w-[540px] max-w-full h-auto max-h-[235px] object-contain mx-auto drop-shadow-[0_0_35px_rgba(0,200,0,0.28)]"
                  />

                  {/* Divisore centrale luminoso */}
                  <div className="flex items-center justify-center gap-3.5 mt-9 mb-7">
                    <span className="w-28 h-0.5 bg-gradient-to-r from-transparent to-[#00d600]" />
                    <span className="w-2.5 h-2.5 bg-[#00e626] rotate-45 inline-block shadow-[0_0_10px_#00e626]" />
                    <span className="w-28 h-0.5 bg-gradient-to-l from-transparent to-[#00d600]" />
                  </div>

                  {/* Frase ad effetto e copy dedicato a Professionisti e Ferramenta */}
                  <h2 className="text-[22px] font-black tracking-wide text-[#00eb3b] uppercase leading-snug max-w-2xl">
                    &ldquo;ENERGIA, LUCE E STRUMENTI
                    <br />
                    PER CHI COSTRUISCE OGNI GIORNO.&rdquo;
                  </h2>
                  <p className="text-sm font-extrabold text-white tracking-wide mt-3">
                    Forniture di Materiale Elettrico, Illuminazione e Ferramenta d&apos;eccellenza.
                  </p>
                  <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed mt-2.5">
                    Il partner di riferimento per una clientela che spazia dai professionisti e
                    installatori fino alle ferramenta e alle rivendite specializzate, con qualità
                    certificata e pronta consegna.
                  </p>
                </div>

                {/* 3. Firma istituzionale integrata in basso */}
                <div className="w-full flex flex-col items-center pb-1">
                  <div className="w-72 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-4" />
                  <div className="text-xs font-black tracking-[0.16em] text-slate-100 uppercase">
                    IZZO DISTRIBUZIONE S.R.L. &mdash; www.izzodistribuzione.it
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Soluzioni e forniture B2B per Professionisti, Installatori, Rivenditori e
                    Ferramenta
                  </div>
                </div>
              </div>
            </div>

            {/* Striscia verde istituzionale in fondo */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#00c800]" />
          </div>
        </div>
      );
    }

    // FOGLIO 2 (sheetIdx === 1): PAGINA SUCCESSIVA CON I DATI DEL CATALOGO E DEL CLIENTE
    // (Senza codici clienti interni, senza numero di articoli e senza numero di pagine)
    if (sheetIdx === 1 && sortedCatalogProducts.length > 0) {
      return (
        <div
          key="info-sheet-1"
          className="w-[740px] h-[1020px] bg-black text-white border border-gray-800 shadow-2xl overflow-hidden select-none relative"
        >
          <div className="w-full h-[1020px] relative bg-black text-white">
            {/* Striscia verde istituzionale in alto */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-[#00c800]" />

            <div className="absolute top-8 bottom-8 left-6 right-6 border border-slate-800 p-1.5 flex flex-col">
              <div className="flex-1 h-full border border-[#00c800]/50 px-12 py-12 flex flex-col items-center justify-between text-center">
                {/* Richiamo Logo superiore */}
                <div className="w-full flex flex-col items-center">
                  <img
                    src="/logo-izzo.png"
                    alt="Izzo Distribuzione S.r.l."
                    className="w-[260px] h-auto object-contain mx-auto mb-3"
                  />
                  <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                    Materiale Elettrico &nbsp;&bull;&nbsp; Illuminazione &nbsp;&bull;&nbsp; Ferramenta
                  </div>
                  <div className="w-full max-w-lg h-px bg-slate-800 mt-5" />
                </div>

                {/* Dati Catalogo, Destinatario (solo nome azienda) e Riferimenti Agente */}
                <div className="w-full max-w-xl my-auto space-y-8">
                  <div className="space-y-2.5">
                    <div className="text-xs font-black tracking-[0.22em] text-[#00e626] uppercase">
                      Edizione Catalogo Personalizzato B2B
                    </div>
                    <div className="text-2xl font-black text-white uppercase tracking-wide leading-snug break-words">
                      {catalogTitle || 'Catalogo Prodotti Selezionati'}
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed break-words">
                      {catalogSubtitle ||
                        'Selezione tecnica ed economica riservata con condizioni commerciali dedicate'}
                    </div>
                  </div>

                  <div className="w-3/4 mx-auto h-px bg-[#00c800]/70" />

                  <div className="grid grid-cols-2 gap-8 pt-2 text-left">
                    <div className="border-r border-slate-800 pr-6">
                      <div className="text-[11px] font-black tracking-wider text-[#00e626] uppercase mb-2">
                        Destinatario / Cliente Riservato
                      </div>
                      {selectedClient ? (
                        <div className="text-base font-black text-white uppercase leading-snug">
                          {selectedClient.companyName}
                        </div>
                      ) : (
                        <>
                          <div className="text-base font-black text-white uppercase">
                            Professionisti e Ferramenta B2B
                          </div>
                          <div className="text-xs text-slate-400 mt-1.5">
                            Selezione ufficiale Izzo Distribuzione
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pl-2 space-y-2">
                      <div className="text-[11px] font-black tracking-wider text-[#00e626] uppercase mb-2">
                        Dettagli Documento e Riferimenti
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        Agente: {agentName || 'Ufficio Commerciale'}
                      </div>
                      <div className="text-xs text-slate-400">Data emissione: {todayStr}</div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-800" />
                </div>

                {/* Nota condizioni e footer */}
                <div className="w-full flex flex-col items-center">
                  <div className="text-[11px] text-slate-400 mb-1.5">
                    Tutti i prezzi e le condizioni commerciali riportati si intendono IVA esclusa e
                    riservati agli operatori B2B.
                  </div>
                  <div className="text-xs font-black tracking-[0.14em] text-slate-200 uppercase">
                    IZZO DISTRIBUZIONE S.R.L. &mdash; www.izzodistribuzione.it
                  </div>
                </div>
              </div>
            </div>

            {/* Striscia verde istituzionale in fondo */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#00c800]" />
          </div>
        </div>
      );
    }

    const productSheetIdx = sortedCatalogProducts.length > 0 ? sheetIdx - 2 : sheetIdx;
    const sheetProducts = sortedCatalogProducts.slice(
      productSheetIdx * 6,
      (productSheetIdx + 1) * 6
    );
    const isOutOfBounds =
      sheetIdx >= totalSheets || productSheetIdx < 0 || sheetProducts.length === 0;

    if (isOutOfBounds) {
      return (
        <div
          key={`empty-sheet-${sheetIdx}`}
          className="w-[740px] h-[1020px] bg-white border border-gray-300 shadow-2xl overflow-hidden flex flex-col justify-between select-none"
        >
          <div className="px-5 py-3.5 bg-black text-white border-b-4 border-brand-main flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/logo-izzo.png"
                alt="Izzo Distribuzione"
                className="h-10 w-auto object-contain shrink-0"
              />
              <div className="h-8 w-px bg-gray-700" />
              <div>
                <div className="text-[10px] font-extrabold text-brand-main tracking-wider uppercase">
                  IZZO DISTRIBUZIONE - CATALOGO PRODOTTI B2B
                </div>
                <div className="text-xs font-black tracking-wide uppercase">
                  {catalogTitle || 'Catalogo Prodotti B2B'}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-black bg-gray-800 text-gray-300 rounded">
              FINE CATALOGO
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-slate-50 to-white">
            <div className="p-4 rounded-2xl bg-black mb-4 shadow-md">
              <img
                src="/logo-izzo.png"
                alt="Izzo Distribuzione"
                className="h-14 w-auto object-contain mx-auto"
              />
            </div>
            <p className="text-sm font-black text-gray-800 uppercase tracking-wide">
              Izzo Distribuzione S.r.l.
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Fine delle schede selezionate ({sortedCatalogProducts.length} articoli in {totalSheets}{' '}
              {totalSheets === 1 ? 'foglio' : 'fogli'}).
            </p>
          </div>

          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
            <span>www.izzodistribuzione.it</span>
            <span>Catalogo Riservato B2B</span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`sheet-${sheetIdx}`}
        className="w-[740px] h-[1020px] bg-white border border-gray-300 shadow-2xl overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Intestazione Foglio A4 (come nel PDF stampato) */}
        <div className="px-5 py-3 bg-black text-white border-b-4 border-brand-main flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-izzo.png"
              alt="Izzo Distribuzione"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="h-8 w-px bg-gray-700 hidden sm:block shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold text-brand-main tracking-wider uppercase truncate">
                IZZO DISTRIBUZIONE - CATALOGO PRODOTTI B2B
              </div>
              <div className="text-xs sm:text-sm font-black tracking-wide uppercase truncate">
                {catalogTitle || 'Catalogo Prodotti B2B'}
              </div>
              <div className="text-[10px] text-gray-300 truncate">
                {selectedClient
                  ? `Cliente: ${selectedClient.companyName}  •  Agente: ${agentName}`
                  : `Agente: ${agentName}`}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
            <span className="px-2.5 py-0.5 text-[11px] font-black bg-brand-main text-black rounded">
              FOGLIO {sheetIdx + 1} / {totalSheets}
            </span>
            <div className="text-[10px] text-gray-400">
              Schede {productSheetIdx * 6 + 1}–{productSheetIdx * 6 + sheetProducts.length} di{' '}
              {sortedCatalogProducts.length}
            </div>
          </div>
        </div>

        {/* Griglia 2 colonne x 3 righe = 6 Schede Prodotto del Foglio */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
          {sheetProducts.map(product => {
            const pricing = calculateProductPricing(product);

            return (
              <div
                key={product.id}
                className="rounded-xl border-2 border-gray-900 bg-white shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* 1. Fascia Superiore Scheda: SKU + Marchio + Tasto Rimuovi */}
                <div className="px-3 py-1.5 bg-gray-900 text-white border-b-2 border-emerald-500 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-black tracking-wide text-white truncate">
                    COD. {product.sku}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded uppercase">
                      {product.brandLabel || product.brand || 'IZZO'}
                    </span>
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveProductFromCatalog(product.id);
                      }}
                      className="px-1.5 py-0.5 text-[9px] font-bold bg-red-600/90 hover:bg-red-500 text-white rounded transition-colors"
                      title="Rimuovi scheda dal catalogo"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 2. Corpo Superiore: Foto + Categoria, Titolo e Bollino Giacenza */}
                <div className="p-3 flex gap-3 items-start">
                  <a
                    href={`/product/${encodeURIComponent(product.id || product.sku)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    className="w-20 h-20 rounded-lg border border-gray-200 hover:border-brand-main bg-white flex items-center justify-center overflow-hidden shrink-0 p-1 transition-colors"
                    title="Apri scheda prodotto sul sito"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-gray-300 text-center">
                        IMMAGINE NON DISP.
                      </span>
                    )}
                  </a>

                  <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[80px]">
                    <div>
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                        {product.categoryLabel ||
                          product.familyLabel ||
                          product.productGroupLabel ||
                          'Articolo a Catalogo'}
                      </div>
                      <h3 className="text-xs font-extrabold text-gray-900 leading-snug mt-0.5">
                        <a
                          href={`/product/${encodeURIComponent(product.id || product.sku)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseDown={e => e.stopPropagation()}
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => e.stopPropagation()}
                          className="hover:text-emerald-700 hover:underline transition-colors"
                          title="Apri scheda prodotto sul sito"
                        >
                          {product.originalName || product.title}
                        </a>
                      </h3>
                    </div>

                    {/* Bollino Disponibilità */}
                    <div className="mt-1.5">
                      {stockMode === 'HIDE_STOCK' ? (
                        <span className="inline-block px-2 py-0.5 text-[9px] text-gray-400 bg-gray-100 rounded italic">
                          Giacenza nascosta nel PDF
                        </span>
                      ) : stockMode === 'EXACT_QTY' ? (
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                              product.stockMain > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            2GG: {product.stockMain} {product.unit}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                              product.stockEk > 0
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            7GG: {product.stockEk} {product.unit}
                          </span>
                        </div>
                      ) : product.stockMain > 0 ? (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                          ● Pronta Consegna (2GG)
                        </span>
                      ) : product.stockEk > 0 ? (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          ● Disponibile (Consegna 7GG)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-500 rounded">
                          Su Ordinazione
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Fascia Centrale: Box Specifiche Tecniche */}
                <div className="mx-3 mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                    Specifiche e Descrizione Tecnica
                  </div>
                  <p className="text-[10px] text-slate-700 leading-relaxed break-words line-clamp-3">
                    {(
                      product.technicalDesc ||
                      product.description ||
                      product.originalName ||
                      product.title ||
                      ''
                    ).replace(/;/g, '  |  ')}
                  </p>
                </div>

                {/* 4. Fascia Inferiore: Box Prezzi della Scheda */}
                <div className="mx-3 mb-3 px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  {priceMode === 'NO_PRICE' ? (
                    <div className="w-full flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-bold">SCHEDA TECNICA PRODOTTO</span>
                      <span className="text-[10px]">Unità: {product.unit || 'PZ'}</span>
                    </div>
                  ) : priceMode === 'LIST_ONLY' ? (
                    <>
                      <div>
                        <div className="text-[9px] font-extrabold text-slate-600 uppercase">
                          Prezzo di Listino
                        </div>
                        <div className="text-[9px] text-slate-500">
                          IVA esclusa / per {product.unit || 'PZ'}
                        </div>
                      </div>
                      <div className="text-sm font-black text-gray-900">
                        € {pricing.listPrice.toFixed(2).replace('.', ',')}
                      </div>
                    </>
                  ) : priceMode === 'NET_ONLY' ? (
                    <>
                      <div>
                        <div className="text-[9px] font-extrabold text-emerald-800 uppercase">
                          Prezzo Netto Riservato
                        </div>
                        <div className="text-[9px] text-slate-500">
                          IVA esclusa / per {product.unit || 'PZ'}
                        </div>
                        {pricing.discountPct > 0 && pricing.appliedRuleExpiresFormatted && (
                          <div className="text-[9px] font-extrabold text-amber-700 mt-0.5">
                            ⏳ Valido{' '}
                            {pricing.appliedRuleExpiresFormatted.charAt(0).toLowerCase() +
                              pricing.appliedRuleExpiresFormatted.slice(1)}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-black text-emerald-800">
                        € {pricing.netPrice.toFixed(2).replace('.', ',')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-[11px] text-slate-500">
                          Listino:{' '}
                          <span className="line-through font-semibold">
                            € {pricing.listPrice.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        {pricing.discountPct > 0 ? (
                          <div>
                            <div className="text-[10px] font-extrabold text-red-600">
                              Sconto riservato: -
                              {pricing.discountLabel ||
                                `${pricing.discountPct.toFixed(1).replace('.0', '')}%`}
                            </div>
                            {pricing.appliedRuleName && (
                              <div className="text-[9px] font-bold text-emerald-700 truncate max-w-[140px]">
                                🏷️ {pricing.appliedRuleName}
                              </div>
                            )}
                            {pricing.appliedRuleExpiresFormatted && (
                              <div className="text-[9px] font-extrabold text-amber-700 mt-0.5">
                                ⏳ Valido{' '}
                                {pricing.appliedRuleExpiresFormatted.charAt(0).toLowerCase() +
                                  pricing.appliedRuleExpiresFormatted.slice(1)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-500">
                            IVA esclusa / {product.unit || 'PZ'}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-extrabold text-emerald-800 uppercase">
                          Prezzo Netto / {product.unit || 'PZ'}
                        </div>
                        <div className="text-sm font-black text-emerald-800">
                          € {pricing.netPrice.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Piè di Pagina Foglio A4 */}
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            Izzo Distribuzione S.r.l. • Agente: <strong className="text-gray-700">{agentName}</strong>
          </span>
          <span className="font-bold text-gray-800">
             Pagina {sheetIdx + 1} di {totalSheets}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      {/* STICKY HEADER CON TABS E CONTROLLI (NESSUN H1 RIDONDANTE) */}
      <StickyHeader
        paddingY="sm"
        backgroundOpacity={0.96}
        style={{
          flexShrink: 0,
          background: 'var(--color-surface-solid)',
          borderBottom: '1px solid var(--color-border)',
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: '0 var(--spacing-lg)',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            activeTab={showConfigPanel ? 'all' : 'products'}
            onChange={id => _setShowConfigPanel(id === 'all')}
            tabs={[
              {
                id: 'all',
                label: 'Configuratore Completo (Prodotti + Layout PDF)',
                icon: <Settings2 size={14} />,
              },
              {
                id: 'products',
                label: 'Solo Ricerca & Filtri Prodotti',
                icon: <Package size={14} />,
              },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Badge variant="neutral" size="sm">
              Agente: {agentName} ({agentCode})
            </Badge>
            <Badge variant="primary" size="sm">
              {sortedCatalogProducts.length} articoli • {totalSheets} fogli A4
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={<Percent size={14} />}
              onClick={() => useWindowStore.getState().openWindow('b2b_discounts')}
            >
              Sconti ({applicableRulesCount})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye size={14} />}
              disabled={sortedCatalogProducts.length === 0}
              onClick={() => setIsPreviewModalOpen(true)}
            >
              Anteprima Sfogliabile ({sortedCatalogProducts.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={14} />}
              disabled={isGeneratingPdf || sortedCatalogProducts.length === 0}
              onClick={handleDownloadPdf}
            >
              {isGeneratingPdf
                ? 'Generazione PDF...'
                : `Scarica PDF (${sortedCatalogProducts.length} • ${Math.ceil(sortedCatalogProducts.length / 6)} fogli)`}
            </Button>
          </div>
        </div>
      </StickyHeader>

      {/* CONTENUTO PRINCIPALE (SCROLLABILE SOTTO L'HEADER, MAI SOTTOPOSTO ALLE TAB) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
        {/* LAYOUT A 2 COLONNE SENZA SOVRAPPOSIZIONI */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 310px',
            gap: 'var(--spacing-lg)',
            alignItems: 'start',
          }}
        >
        {/* COLONNA SINISTRA: STEP 1 E STEP 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {pdfError && (
            <GlassPanel padding="sm" radius="md">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--color-danger)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span>⚠️ {pdfError}</span>
                <Button size="sm" variant="danger" onClick={() => setPdfError('')}>
                  Chiudi
                </Button>
              </div>
            </GlassPanel>
          )}

          {/* PANNELLO 1: AGGIUNGI PRODOTTI AL CATALOGO */}
          <GlassPanel padding="lg" radius="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant="primary" size="sm">
                  STEP 1
                </Badge>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>
                  Aggiungi Prodotti al Catalogo
                </span>
              </div>
              {lastAddedSku && (
                <Badge variant="success" size="sm">
                  ✓ Aggiunto al catalogo: {lastAddedSku} — scrivi pure il prossimo codice!
                </Badge>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: 'var(--spacing-md)',
                alignItems: 'start',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              {/* Barra Predittiva */}
              <div ref={predictiveContainerRef} style={{ position: 'relative' }}>
                <TextInput
                  label="Inserimento Rapido per Codice o Nome (Clicca sul prodotto per aggiungerlo)"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    if (!isPredictiveOpen && e.target.value.trim().length > 0) {
                      setIsPredictiveOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (query.trim().length > 0) {
                      setIsPredictiveOpen(true);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Scrivi codice SKU o prodotto (es. E45, IL34, faretto)... clicca e passa al successivo"
                  leftIcon={<Search size={15} />}
                  fullWidth
                />

                {isPredictiveOpen && query.trim().length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '6px',
                      background: 'var(--color-surface-solid)',
                      border: '1px solid var(--color-border-dark)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 80,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        background: 'var(--color-bg)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge variant="primary" size="sm">
                          Izzo Distribuzione
                        </Badge>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {isPredictiveLoading
                            ? 'Ricerca in corso...'
                            : `${predictiveFound} prodotti trovati — clicca per aggiungere`}
                        </span>
                      </div>
                      {predictiveResults.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={handleAddAllFromSearchQuery}
                        >
                          + Aggiungi tutti ({predictiveFound})
                        </Button>
                      )}
                    </div>

                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      {predictiveResults.length > 0 ? (
                        predictiveResults.map((product, index) => {
                          const isHighlighted = index === activeIndex;
                          const alreadyInCatalog = catalogIdsSet.has(product.id);
                          const pricing = calculateProductPricing(product);

                          return (
                            <div
                              key={product.id || product.sku}
                              onClick={() => handleAddSingleProductFromPredictive(product)}
                              onMouseEnter={() => setActiveIndex(index)}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--color-border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                cursor: 'pointer',
                                background: alreadyInCatalog
                                  ? 'var(--color-primary-light)'
                                  : isHighlighted
                                  ? 'var(--color-hover-light)'
                                  : 'transparent',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)',
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    padding: '2px',
                                  }}
                                >
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.title}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>N/D</span>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <Badge variant="neutral" size="sm">
                                      {product.sku}
                                    </Badge>
                                    {renderPredictiveStockBadges(product)}
                                    {alreadyInCatalog && (
                                      <Badge variant="success" size="sm">
                                        ✓ Già nel catalogo
                                      </Badge>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {product.originalName || product.title}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 800 }}>
                                  € {pricing.netPrice.toFixed(2).replace('.', ',')}
                                </div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  {alreadyInCatalog ? 'Aggiunto' : '+ Clicca per aggiungere'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : !isPredictiveLoading ? (
                        <div
                          style={{
                            padding: '16px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Nessun risultato trovato per "{query.trim()}"
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Disponibilità / Deposito */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  Disponibilità / Deposito
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {WAREHOUSE_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={warehouse === opt.value ? 'primary' : 'secondary'}
                      onClick={() => setWarehouse(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Switch
                  checked={includeZeroStock}
                  onChange={setIncludeZeroStock}
                  label="Includi prodotti a giacenza 0"
                />
              </div>
            </div>

            {/* RIGA 2: FILTRI REPARTO / MARCHIO */}
            <div
              style={{
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: '10px',
                }}
              >
                Oppure carica intere linee filtrando per Marchio o Tipo di Prodotto:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <MultiSelectFacetDropdown
                  label="Marchio (Brand)"
                  placeholder="Tutti i Marchi"
                  options={facets.brands}
                  selectedValues={selectedBrands}
                  onChange={setSelectedBrands}
                />
                <MultiSelectFacetDropdown
                  label="Tipo Prodotto — Gruppo (L1)"
                  placeholder="Tutti i Gruppi Merceologici"
                  options={facets.productGroups}
                  selectedValues={selectedProductGroups}
                  onChange={setSelectedProductGroups}
                />
                <MultiSelectFacetDropdown
                  label="Tipo Prodotto — Famiglia (L2)"
                  placeholder="Tutte le Famiglie"
                  options={facets.families}
                  selectedValues={selectedFamilies}
                  onChange={setSelectedFamilies}
                />
                <MultiSelectFacetDropdown
                  label="Tipo Prodotto — Categoria (L3)"
                  placeholder="Tutte le Categorie"
                  options={facets.categories}
                  selectedValues={selectedCategories}
                  onChange={setSelectedCategories}
                />
              </div>
            </div>

            {/* RIGA 3: ORDINAMENTO E SVUOTA */}
            <div
              style={{
                marginTop: 'var(--spacing-md)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Ordina per:</span>
                <div style={{ width: '320px' }}>
                  <Select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as CatalogSortMode)}
                    options={[
                      {
                        value: 'TAXONOMY_ASC',
                        label: 'Gruppo Merceologico / Famiglia / Categoria',
                      },
                      {
                        value: 'INSERTION_ORDER',
                        label: 'Ordine di inserimento (Come scelti)',
                      },
                      { value: 'STOCK_DESC', label: 'Giacenza Maggiore (Prima 2GG)' },
                      { value: 'SKU_ASC', label: 'Codice Articolo (A-Z)' },
                      { value: 'PRICE_ASC', label: 'Prezzo Crescente' },
                      { value: 'PRICE_DESC', label: 'Prezzo Decrescente' },
                      { value: 'TITLE_ASC', label: 'Descrizione (A-Z)' },
                    ]}
                  />
                </div>
              </div>

              {catalogItems.length > 0 && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={handleClearCatalog}
                >
                  Svuota catalogo ({catalogItems.length} schede)
                </Button>
              )}
            </div>
          </GlassPanel>

          {/* PANNELLO 2: PERSONALIZZA PREZZI, SCONTI CLIENTE E LAYOUT PDF */}
          {showConfigPanel && (
            <GlassPanel padding="lg" radius="lg">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="success" size="sm">
                    STEP 2
                  </Badge>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    Personalizza Prezzi, Sconti Cliente e Layout del PDF
                  </span>
                </div>
                <Badge variant="neutral" size="sm">
                  Agente: {agentName} ({agentCode})
                </Badge>
              </div>

              {/* Riga Titolo, Sottotitolo e Cliente */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-md)',
                }}
              >
                <TextInput
                  label="Titolo del Catalogo PDF"
                  value={catalogTitle}
                  onChange={e => setCatalogTitle(e.target.value)}
                  placeholder="Es. Catalistino Riservato a..."
                  fullWidth
                />
                <TextInput
                  label="Sottotitolo / Nota Commerciale (Opzionale)"
                  value={catalogSubtitle}
                  onChange={e => setCatalogSubtitle(e.target.value)}
                  placeholder="Es. Offerta esclusiva valida per il primo acquisto"
                  fullWidth
                />

                {/* Selettore Cliente */}
                <div ref={clientDropdownRef} style={{ position: 'relative' }}>
                  <TextInput
                    label="Associa a un tuo Cliente (Carica Sconti Automatici)"
                    value={clientSearchText}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    onChange={e => {
                      setClientSearchText(e.target.value);
                      setIsClientDropdownOpen(true);
                      if (!e.target.value.trim()) {
                        setSelectedClientId('');
                        setBaseDiscount(0);
                        setExtraDiscount(0);
                        setElmarkDiscounts({});
                      }
                    }}
                    placeholder="Cerca tuo cliente per Ragione Sociale o Codice..."
                    rightIcon={
                      selectedClient ? (
                        <span
                          style={{
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--color-danger)',
                          }}
                          onClick={() => handleSelectClient(null)}
                        >
                          ✕
                        </span>
                      ) : undefined
                    }
                    fullWidth
                  />

                  {isClientDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 60,
                        left: 0,
                        right: 0,
                        marginTop: '6px',
                        background: 'var(--color-surface-solid)',
                        border: '1px solid var(--color-border-dark)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      <div
                        onClick={() => handleSelectClient(null)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        — Nessun cliente specifico (Usa sconto manuale) —
                      </div>
                      {filteredClients.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-border-light)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background:
                              selectedClientId === c.id
                                ? 'var(--color-primary-light)'
                                : 'transparent',
                          }}
                        >
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700 }}>{c.companyName}</div>
                            <div
                              style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                            >
                              Cod. {c.zucchettiCode} {c.city ? `• ${c.city}` : ''}
                            </div>
                          </div>
                          <Badge variant="success" size="sm">
                            Sc. {Number(c.discount || 0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Riga Modalità Prezzi, Sconto Applicato, Modalità Giacenze */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1.1fr',
                  gap: 'var(--spacing-md)',
                  alignItems: 'start',
                }}
              >
                {/* Visualizzazione Prezzi */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Visualizzazione Prezzi nel Catalogo
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {PRICE_MODE_OPTIONS.map(opt => {
                      const active = priceMode === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setPriceMode(opt.value)}
                          style={{
                            padding: '10px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            background: active
                              ? 'var(--color-primary-light)'
                              : 'var(--color-surface-solid)',
                            border: active
                              ? '2px solid var(--color-primary)'
                              : '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{opt.label}</div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            {opt.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sconto Applicato ai Prezzi */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Sconto Applicato ai Prezzi
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-solid)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      <TextInput
                        label="Sconto Base (%)"
                        type="number"
                        min={0}
                        max={95}
                        step={0.5}
                        disabled={
                          Boolean(selectedClient) ||
                          priceMode === 'LIST_ONLY' ||
                          priceMode === 'NO_PRICE'
                        }
                        value={baseDiscount}
                        onChange={e => {
                          if (selectedClient) return;
                          setBaseDiscount(
                            Math.max(0, Math.min(95, Number(e.target.value) || 0))
                          );
                        }}
                        fullWidth
                      />
                      <TextInput
                        label="Extra Sconto (%)"
                        type="number"
                        min={0}
                        max={95}
                        step={0.5}
                        disabled={
                          Boolean(selectedClient) ||
                          priceMode === 'LIST_ONLY' ||
                          priceMode === 'NO_PRICE'
                        }
                        value={extraDiscount}
                        onChange={e => {
                          if (selectedClient) return;
                          setExtraDiscount(
                            Math.max(0, Math.min(95, Number(e.target.value) || 0))
                          );
                        }}
                        fullWidth
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {selectedClient ? (
                        <>
                          🔒 Sconto Base fisso di{' '}
                          <strong>{selectedClient.companyName}</strong> ({baseDiscount}%) +{' '}
                          <strong>{applicableRulesCount}</strong> regole di sconto attive.
                        </>
                      ) : (
                        <>
                          Imposta uno sconto manuale oppure seleziona un cliente (
                          {applicableRulesCount} regole generali attive).
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Percent size={13} />}
                      onClick={() => useWindowStore.getState().openWindow('b2b_discounts')}
                    >
                      Gestisci Sconti Prodotti / Marchi / Categorie ({applicableRulesCount})
                    </Button>
                  </div>
                </div>

                {/* Visualizzazione Giacenze */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Visualizzazione Giacenze / Depositi nel PDF
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {STOCK_MODE_OPTIONS.map(opt => {
                      const active = stockMode === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setStockMode(opt.value)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            background: active
                              ? 'var(--color-primary-light)'
                              : 'var(--color-surface-solid)',
                            border: active
                              ? '2px solid var(--color-primary)'
                              : '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{opt.label}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            {opt.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>

        {/* COLONNA DESTRA: LISTA ARTICOLI NEL CATALOGO (STICKY IN GRIGLIA, ZERO SOVRAPPOSIZIONI) */}
        <div style={{ position: 'sticky', top: 0 }}>
          <GlassPanel padding="md" radius="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                Articoli ({sortedCatalogProducts.length})
              </span>
              {sortedCatalogProducts.length > 0 ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleClearCatalog}
                >
                  Svuota tutto
                </Button>
              ) : (
                <Badge variant="neutral" size="sm">
                  0 fogli
                </Badge>
              )}
            </div>

            <div
              style={{
                maxHeight: '420px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {isSearching ? (
                <div
                  style={{
                    padding: '24px 8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Caricamento articoli...
                </div>
              ) : searchError ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--color-danger)',
                  }}
                >
                  {searchError}
                </div>
              ) : sortedCatalogProducts.length === 0 ? (
                <div
                  style={{
                    padding: '28px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    Nessun articolo inserito
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Aggiungi i prodotti dalla barra di ricerca o dai filtri.
                  </div>
                </div>
              ) : (
                sortedCatalogProducts.map((product, idx) => {
                  const pricing = calculateProductPricing(product);
                  return (
                    <div
                      key={product.id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-surface-solid)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          {idx + 1}.
                        </span>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontFamily: 'monospace' }}>{product.sku}</strong>
                            {priceMode !== 'NO_PRICE' && (
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: 'var(--color-success)',
                                }}
                              >
                                €{' '}
                                {(priceMode === 'LIST_ONLY'
                                  ? pricing.listPrice
                                  : pricing.netPrice
                                )
                                  .toFixed(2)
                                  .replace('.', ',')}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {product.originalName || product.title}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProductFromCatalog(product.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--color-danger)',
                          fontWeight: 800,
                        }}
                        title="Rimuovi dal catalogo"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>{sortedCatalogProducts.length} schede</span>
              <Badge variant="primary" size="sm">
                {sortedCatalogProducts.length > 0
                  ? `${totalSheets} ${totalSheets === 1 ? 'foglio A4' : 'fogli A4'}`
                  : '0 fogli A4'}
              </Badge>
            </div>
          </GlassPanel>
        </div>
        </div>
      </div>

      {/* MODALE A TUTTO SCHERMO PER L'ANTEPRIMA SFOGLIABILE DEL CATALOGO (1 PAGINA O 2 PAGINE + ZOOM) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden">
          {/* Barra Superiore Modale Anteprima */}
          <div className="px-4 sm:px-6 py-3 bg-black border-b border-gray-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Sinistra: Logo + Info Catalogo */}
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo-izzo.png"
                alt="Izzo Distribuzione"
                className="h-9 w-auto object-contain shrink-0"
              />
              <div className="h-7 w-px bg-gray-800 hidden sm:block" />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black tracking-wide uppercase text-white truncate">
                  {catalogTitle || 'Catalogo Prodotti B2B'}
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  {sortedCatalogProducts.length} schede • {totalSheets}{' '}
                  {totalSheets === 1 ? 'foglio A4' : 'fogli A4'}
                  {selectedClient ? ` • Cliente: ${selectedClient.companyName}` : ''}
                </div>
              </div>
            </div>

            {/* Centro: Switch 1 Pagina / 2 Pagine + Controlli Zoom + Controlli Sfoglia Pagina */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selettore Modalità di Visualizzazione: 1 Pagina vs 2 Pagine */}
              <div className="inline-flex rounded-lg bg-gray-900 p-1 border border-gray-800">
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('SINGLE')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-md transition-all flex items-center gap-1.5 ${
                    previewViewMode === 'SINGLE'
                      ? 'bg-brand-main text-black shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span>📄</span>
                  <span>1 Pagina</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewViewMode('DOUBLE');
                    setCurrentSheet(prev => Math.floor(prev / 2) * 2);
                  }}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-md transition-all flex items-center gap-1.5 ${
                    previewViewMode === 'DOUBLE'
                      ? 'bg-brand-main text-black shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span>📖</span>
                  <span>2 Pagine (Libro)</span>
                </button>
              </div>

              {/* Controlli Zoom - / % / + */}
              <div className="inline-flex items-center rounded-lg bg-gray-900 p-1 border border-gray-700">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="px-2.5 py-1 text-xs font-black rounded text-white hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="Rimpicciolisci catalogo (Zoom -)"
                >
                  🔍 −
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-2.5 py-1 text-xs font-mono font-black text-brand-main hover:bg-gray-800 rounded transition-colors min-w-[54px] text-center"
                  title="Clicca per riportare lo zoom al 100%"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  className="px-2.5 py-1 text-xs font-black rounded text-white hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="Ingrandisci catalogo (Zoom +)"
                >
                  🔍 +
                </button>
              </div>

              {/* Controlli di Sfoglia Pagine */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToSheet(0)}
                  disabled={!canGoPrev}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="Prima pagina"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={!canGoPrev}
                  className="px-3 py-1.5 text-xs font-black rounded-lg bg-gray-900 border border-gray-700 text-white hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  ◀ Indietro
                </button>

                <select
                  value={previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet}
                  onChange={e => goToSheet(Number(e.target.value))}
                  className="bg-gray-900 text-brand-main text-xs font-black px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none cursor-pointer"
                >
                  {previewViewMode === 'DOUBLE'
                    ? Array.from({ length: Math.ceil(totalSheets / 2) }).map((_, spreadIdx) => {
                        const leftIdx = spreadIdx * 2;
                        const rightIdx = leftIdx + 1;
                        return (
                          <option key={spreadIdx} value={leftIdx}>
                            {rightIdx < totalSheets
                              ? `Pagine ${leftIdx + 1}–${rightIdx + 1} di ${totalSheets}`
                              : `Pagina ${leftIdx + 1} di ${totalSheets}`}
                          </option>
                        );
                      })
                    : Array.from({ length: totalSheets }).map((_, idx) => (
                        <option key={idx} value={idx}>
                          {idx === 0 && sortedCatalogProducts.length > 0
                            ? `Copertina (Pag. 1 di ${totalSheets})`
                            : idx === 1 && sortedCatalogProducts.length > 0
                            ? `Dati Offerta e Cliente (Pag. 2 di ${totalSheets})`
                            : `Pagina ${idx + 1} di ${totalSheets}`}
                        </option>
                      ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!canGoNext}
                  className="px-3 py-1.5 text-xs font-black rounded-lg bg-gray-900 border border-gray-700 text-white hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Avanti ▶
                </button>
                <button
                  type="button"
                  onClick={() => goToSheet(totalSheets - 1)}
                  disabled={!canGoNext}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="Ultima pagina"
                >
                  ⏭
                </button>
              </div>
            </div>

            {/* Destra: Scarica PDF + Chiudi Modale */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || sortedCatalogProducts.length === 0}
                className="px-4 py-2 text-xs font-black rounded-lg bg-brand-main hover:bg-amber-400 text-black transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGeneratingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Generazione PDF...
                  </>
                ) : (
                  <>⬇ Scarica PDF</>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-3.5 py-2 text-xs font-black rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5"
              >
                ✕ Chiudi
              </button>
            </div>
          </div>

          {/* Corpo Centrale Modale: Tavolo di Lettura con Zoom e Fogli A4 */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
            <div className="w-full max-w-[1680px] mx-auto flex items-center justify-center gap-3 sm:gap-5 my-auto">
              {/* Freccia Laterale Sinistra */}
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!canGoPrev}
                className="hidden md:flex w-13 h-32 rounded-2xl bg-gray-900/90 hover:bg-black border border-gray-700 text-brand-main items-center justify-center shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0 sticky top-1/2"
                title="Pagina Precedente (←)"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Contenitore FlipBook (react-pageflip / StPageFlip) con Zoom Dinamico e Piega Angolo Realistica */}
              <div
                style={{ zoom: zoomLevel / 100 } as React.CSSProperties}
                className="relative flex items-center justify-center transition-all duration-150"
              >
                <HTMLFlipBook
                  key={`flipbook-${previewViewMode}-${totalSheets}-${priceMode}-${stockMode}-${baseDiscount}-${extraDiscount}-${selectedClientId}`}
                  ref={flipBookRef}
                  width={740}
                  height={1020}
                  size="fixed"
                  minWidth={740}
                  maxWidth={740}
                  minHeight={1020}
                  maxHeight={1020}
                  drawShadow={true}
                  maxShadowOpacity={0.55}
                  flippingTime={750}
                  usePortrait={previewViewMode === 'SINGLE'}
                  startPage={previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet}
                  startZIndex={10}
                  autoSize={false}
                  showCover={false}
                  mobileScrollSupport={true}
                  clickEventForward={true}
                  useMouseEvents={true}
                  swipeDistance={30}
                  showPageCorners={true}
                  disableFlipByClick={false}
                  className="shadow-2xl"
                  style={{
                    width: previewViewMode === 'SINGLE' ? 740 : 1480,
                    height: 1020,
                    margin: '0 auto',
                  }}
                  onFlip={(e: any) => {
                    if (typeof e?.data === 'number') {
                      setCurrentSheet(e.data);
                    }
                  }}
                >
                  {Array.from({
                    length:
                      previewViewMode === 'DOUBLE' && totalSheets % 2 !== 0
                        ? totalSheets + 1
                        : totalSheets,
                  }).map((_, idx) => renderA4Sheet(idx))}
                </HTMLFlipBook>
              </div>

              {/* Freccia Laterale Destra */}
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoNext}
                className="hidden md:flex w-13 h-32 rounded-2xl bg-gray-900/90 hover:bg-black border border-gray-700 text-brand-main items-center justify-center shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0 sticky top-1/2"
                title="Pagina Successiva (→)"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
