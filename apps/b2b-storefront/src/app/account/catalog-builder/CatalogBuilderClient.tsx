'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  CatalogFacetOption,
  CatalogPriceMode,
  CatalogProductItem,
  CatalogSearchFilters,
  CatalogSearchResponse,
  CatalogSortMode,
  CatalogSourceMode,
  CatalogStockMode,
  WarehouseFilterMode,
  generateAgentCatalogPdfAction,
  searchAgentCatalogProducts,
  searchCatalogPredictiveAction,
} from '@/app/actions/catalogBuilder';
import { AgentManagedClient } from '@/app/actions/newClient';
import {
  AgentDiscountRule,
  doesRuleMatchClient,
  evaluateProductDiscountWithRules,
} from '@/lib/discountRulesEngine';

interface Props {
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  discountRules?: AgentDiscountRule[];
  initialSearch: CatalogSearchResponse;
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
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm rounded-lg border transition-colors bg-white ${
          selectedValues.length > 0
            ? 'border-brand-main ring-1 ring-brand-main/20 text-gray-900 font-semibold'
            : 'border-gray-300 text-gray-700 hover:border-gray-400'
        }`}
      >
        <span className="truncate">
          {selectedValues.length === 0
            ? placeholder
            : selectedValues.length === 1
            ? options.find(o => o.code === selectedValues[0])?.label || selectedValues[0]
            : `${selectedValues.length} selezionati (${selectedValues.join(', ')})`}
        </span>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {selectedValues.length > 0 && (
            <span
              onClick={e => {
                e.stopPropagation();
                onChange([]);
              }}
              className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 hover:bg-red-100 hover:text-red-700 text-gray-700 rounded transition-colors"
              title="Azzera selezione"
            >
              ✕
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Cerca in ${label.toLowerCase()}...`}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-main"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-gray-500 text-center">Nessuna opzione trovata</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.code);
                return (
                  <label
                    key={opt.code}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50/80 font-semibold text-gray-900' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(opt.code)}
                        className="rounded border-gray-300 text-brand-main focus:ring-brand-main"
                      />
                      <span className="truncate" title={opt.label}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-600 rounded shrink-0">
                      {opt.count}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[11px] text-gray-600 font-medium">
                {selectedValues.length} selezionati
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Deseleziona tutti
              </button>
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
}: Props) {
  // --- STATO FILTRI ---
  const [catalogSource] = useState<CatalogSourceMode>('ZUCCHETTI');
  const [warehouse, setWarehouse] = useState<WarehouseFilterMode>('ALL_WAREHOUSES');
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
  const [catalogTitle, setCatalogTitle] = useState('Catalogo Prodotti Selezionati');
  const [catalogSubtitle, setCatalogSubtitle] = useState('');
  const [priceMode, setPriceMode] = useState<CatalogPriceMode>('LIST_AND_NET');
  const [stockMode, setStockMode] = useState<CatalogStockMode>('BADGE_ONLY');

  // Selezione predittiva cliente per applicare automaticamente i suoi sconti
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchText, setClientSearchText] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [baseDiscount, setBaseDiscount] = useState<number>(0);
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [elmarkDiscounts, setElmarkDiscounts] = useState<Record<string, number>>({});

  // Vista UI, Modale Anteprima a tutto schermo e generazione PDF
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewViewMode, setPreviewViewMode] = useState<'SINGLE' | 'DOUBLE'>('DOUBLE');
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipMidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const totalSheets = Math.max(1, Math.ceil(sortedCatalogProducts.length / 6));
  const safeCurrentSheet = Math.min(Math.max(0, currentSheet), totalSheets - 1);

  // In modalità 2 pagine (Libro Aperto), mostriamo le pagine accoppiate (0-1, 2-3, 4-5...)
  const leftSpreadSheet =
    previewViewMode === 'DOUBLE' ? Math.floor(safeCurrentSheet / 2) * 2 : safeCurrentSheet;
  const rightSpreadSheet = previewViewMode === 'DOUBLE' ? leftSpreadSheet + 1 : null;
  const pageStep = previewViewMode === 'DOUBLE' ? 2 : 1;
  const canGoPrev =
    previewViewMode === 'DOUBLE' ? leftSpreadSheet > 0 : safeCurrentSheet > 0;
  const canGoNext =
    previewViewMode === 'DOUBLE'
      ? leftSpreadSheet + 2 < totalSheets
      : safeCurrentSheet < totalSheets - 1;

  const flipToSheet = (targetSheet: number) => {
    const clamped = Math.min(Math.max(0, targetSheet), totalSheets - 1);
    const normalizedTarget =
      previewViewMode === 'DOUBLE' ? Math.floor(clamped / 2) * 2 : clamped;
    const currentBase =
      previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet;

    if (normalizedTarget === currentBase) return;

    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    if (flipMidTimeoutRef.current) clearTimeout(flipMidTimeoutRef.current);

    const dir: 'next' | 'prev' = normalizedTarget > currentBase ? 'next' : 'prev';
    setFlipDirection(dir);

    flipMidTimeoutRef.current = setTimeout(() => {
      setCurrentSheet(normalizedTarget);
    }, 240);

    flipTimeoutRef.current = setTimeout(() => {
      setFlipDirection(null);
    }, 540);
  };

  const handlePrevPage = () => {
    if (!canGoPrev) return;
    const base = previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet;
    flipToSheet(Math.max(0, base - pageStep));
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    const base = previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet;
    flipToSheet(Math.min(totalSheets - 1, base + pageStep));
  };

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
      setCurrentSheet(Math.floor(idx / 6));
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
          stockMain: p.stockMain,
          stockEk: p.stockEk,
          stockTotal: p.stockTotal,
          catalogSource: p.catalogSource,
          imageUrl: p.imageUrl,
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

  // Renderizza un singolo Foglio A4 (6 schede 2x3) riutilizzabile sia in vista 1 Pagina che in vista 2 Pagine (Libro Aperto)
  const renderA4Sheet = (sheetIdx: number, side?: 'left' | 'right') => {
    const sheetProducts = sortedCatalogProducts.slice(sheetIdx * 6, (sheetIdx + 1) * 6);
    const isOutOfBounds = sheetIdx >= totalSheets || sheetProducts.length === 0;

    if (isOutOfBounds) {
      return (
        <div
          key={`empty-sheet-${sheetIdx}`}
          className={`flex-1 bg-white border-2 border-gray-300 shadow-2xl overflow-hidden flex flex-col justify-between min-h-[680px] ${
            side === 'left'
              ? 'rounded-l-2xl rounded-r-sm'
              : side === 'right'
              ? 'rounded-r-2xl rounded-l-sm'
              : 'rounded-2xl'
          }`}
        >
          <div className="px-5 py-3.5 bg-black text-white border-b-4 border-brand-main flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo-izzo.png"
                alt="Izzo Distribuzione"
                className="h-10 w-auto object-contain shrink-0"
              />
              <div className="h-8 w-px bg-gray-700 hidden sm:block" />
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

          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span>www.izzodistribuzione.it</span>
            <span>Catalogo Riservato B2B</span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`sheet-${sheetIdx}`}
        className={`flex-1 bg-white border-2 border-gray-300 shadow-2xl overflow-hidden flex flex-col justify-between ${
          side === 'left'
            ? 'rounded-l-2xl rounded-r-sm'
            : side === 'right'
            ? 'rounded-r-2xl rounded-l-sm'
            : 'rounded-2xl'
        }`}
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
              Schede {sheetIdx * 6 + 1}–{sheetIdx * 6 + sheetProducts.length} di{' '}
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
                      onClick={() => handleRemoveProductFromCatalog(product.id)}
                      className="px-1.5 py-0.5 text-[9px] font-bold bg-red-600/90 hover:bg-red-500 text-white rounded transition-colors"
                      title="Rimuovi scheda dal catalogo"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 2. Corpo Superiore: Foto + Categoria, Titolo e Bollino Giacenza */}
                <div className="p-3 flex gap-3 items-start">
                  <div className="w-20 h-20 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
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
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[80px]">
                    <div>
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                        {product.categoryLabel ||
                          product.familyLabel ||
                          product.productGroupLabel ||
                          'Articolo a Catalogo'}
                      </div>
                      <h3 className="text-xs font-extrabold text-gray-900 leading-snug mt-0.5">
                        {product.originalName || product.title}
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
    <div className="space-y-6">
      {/* INTESTAZIONE PRINCIPALE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-black text-brand-main font-black text-lg">
                📖
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Sviluppa Catalogo Personalizzato
              </h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Aggiungi prodotti <strong>uno alla volta per codice SKU</strong> con la barra predittiva
              oppure carica un intero reparto usando i <strong>filtri per Marchio / Categoria</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfigPanel(prev => !prev)}
              className="px-4 py-2.5 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              {showConfigPanel ? 'Nascondi Opzioni Prezzi/PDF' : 'Configura Prezzi & Cliente'}
            </button>

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              disabled={sortedCatalogProducts.length === 0}
              className="px-5 py-2.5 text-sm font-black rounded-lg bg-gray-900 hover:bg-black text-white shadow-sm transition-all disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2 border border-gray-800"
            >
              <svg className="w-4 h-4 text-brand-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Anteprima Catalogo ({sortedCatalogProducts.length} schede)
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || sortedCatalogProducts.length === 0}
              className="px-5 py-2.5 text-sm font-black rounded-lg bg-brand-main hover:bg-amber-400 text-black shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Generazione PDF ({sortedCatalogProducts.length} schede • {Math.ceil(sortedCatalogProducts.length / 6)} fogli)...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Scarica Catalogo PDF ({sortedCatalogProducts.length} schede • {Math.ceil(sortedCatalogProducts.length / 6)} {Math.ceil(sortedCatalogProducts.length / 6) === 1 ? 'foglio' : 'fogli'})
                </>
              )}
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between">
            <span>⚠️ {pdfError}</span>
            <button onClick={() => setPdfError('')} className="text-red-500 hover:text-red-800 font-bold">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* PANNELLO 1: AGGIUNTA RAPIDA SINGOLO PRODOTTO (PREDITTIVA) + FILTRI REPARTO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-black bg-gray-900 text-white rounded-md">
              1
            </span>
            <h2 className="text-base font-bold text-gray-900">
              Aggiungi Prodotti al Catalogo
            </h2>
          </div>
          {lastAddedSku && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              ✓ Aggiunto al catalogo: {lastAddedSku} — scrivi pure il prossimo codice!
            </span>
          )}
        </div>

        {/* RIGA 1: Barra Predittiva (identica a PredictiveSearchBar del sito) + Filtro Deposito */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div ref={predictiveContainerRef} className="lg:col-span-7 relative">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Inserimento Rapido per Codice o Nome (Clicca sul prodotto per aggiungerlo)
            </label>

            <div className="relative flex w-full">
              <input
                ref={searchInputRef}
                type="text"
                autoComplete="off"
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
                className="w-full px-4 py-2.5 pr-20 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent transition-all shadow-sm font-medium text-sm"
              />

              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPredictiveResults([]);
                    setIsPredictiveOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Cancella ricerca"
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="absolute right-0 top-0 bottom-0 w-11 bg-brand-main rounded-r-md flex items-center justify-center text-black pointer-events-none">
                {isPredictiveLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* TENDINA PREDITTIVA (Stile e Ordinamento identici a PredictiveSearchBar.tsx del sito) */}
            {isPredictiveOpen && query.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-2xl z-[80] overflow-hidden text-gray-900">
                {/* Context Header */}
                <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-brand-main/15 text-brand-main border border-brand-main/30">
                      Izzo Distribuzione
                    </span>
                    <span className="text-gray-500 font-medium">
                      {isPredictiveLoading
                        ? 'Ricerca in corso...'
                        : `${predictiveFound} prodott${predictiveFound === 1 ? 'o' : 'i'} trovat${predictiveFound === 1 ? 'o' : 'i'} — clicca per aggiungere al catalogo`}
                    </span>
                  </div>
                  {isPredictiveLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-brand-main rounded-full animate-spin" />
                  )}
                </div>

                {/* Lista Prodotti Predittiva */}
                <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
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
                          className={`px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                            alreadyInCatalog
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70'
                              : isHighlighted
                              ? 'bg-gray-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-12 h-12 flex-shrink-0 bg-white border border-gray-200 rounded p-1 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.originalName || product.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>

                          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {product.sku}
                              </span>
                              {product.brand && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  {product.brand}
                                </span>
                              )}
                              {renderPredictiveStockBadges(product)}
                              {alreadyInCatalog && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                  ✓ Già nel catalogo
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {product.originalName || product.title}
                            </span>
                            {(product.categoryLabel || product.familyLabel || product.productGroupLabel) && (
                              <span className="text-[11px] text-gray-400 truncate">
                                {[product.productGroupLabel, product.familyLabel, product.categoryLabel]
                                  .filter(Boolean)
                                  .join(' › ')}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end shrink-0 pl-2">
                            {pricing.discountPct > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 line-through">
                                  € {pricing.listPrice.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                                  -{pricing.discountPct}%
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                              € {pricing.netPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] font-bold text-brand-main">
                              {alreadyInCatalog ? 'Aggiunto' : '+ Clicca per aggiungere'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : !isPredictiveLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      Nessun risultato trovato in <span className="font-bold text-gray-700">Izzo Distribuzione</span> per &ldquo;{query.trim()}&rdquo;
                    </div>
                  ) : null}
                </div>

                {/* Footer CTA per aggiungere tutti i risultati della ricerca */}
                {predictiveResults.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAllFromSearchQuery}
                    className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 text-xs font-bold text-brand-main uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>
                      + Aggiungi tutti i {predictiveFound} risultati per &ldquo;{query.trim()}&rdquo; al catalogo
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Disponibilità / Deposito
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WAREHOUSE_OPTIONS.map(opt => {
                const active = warehouse === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWarehouse(opt.value)}
                    className={`px-3 py-2.5 text-xs font-bold rounded-lg border transition-all text-center ${
                      active
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <label className="mt-2.5 inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeZeroStock}
                onChange={e => setIncludeZeroStock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-main focus:ring-brand-main cursor-pointer"
              />
              <span>Includi prodotti a giacenza 0</span>
            </label>
          </div>
        </div>

        {/* RIGA 2: Oppure carica intere linee per Marchio / Gruppo / Famiglia / Categoria */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
            Oppure carica intere linee filtrando per Marchio o Tipo di Prodotto:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* RIGA 3: Ordinamento e Svuota Catalogo */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Ordina per:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as CatalogSortMode)}
                className="px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white"
              >
                <option value="TAXONOMY_ASC">Gruppo Merceologico / Famiglia / Categoria</option>
                <option value="INSERTION_ORDER">Ordine di inserimento (Come scelti)</option>
                <option value="STOCK_DESC">Giacenza Maggiore (Prima 2GG)</option>
                <option value="SKU_ASC">Codice Articolo (A-Z)</option>
                <option value="PRICE_ASC">Prezzo Crescente</option>
                <option value="PRICE_DESC">Prezzo Decrescente</option>
                <option value="TITLE_ASC">Descrizione (A-Z)</option>
              </select>
            </div>
          </div>

          {catalogItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearCatalog}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
            >
              ✕ Svuota catalogo ({catalogItems.length} schede)
            </button>
          )}
        </div>
      </div>

      {/* PANNELLO 2: CONFIGURAZIONE LISTINO, CLIENTE ASSEGNATO, PREZZI & GIACENZE NEL PDF */}
      {showConfigPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black bg-brand-main text-black rounded-md">
                2
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Personalizza Prezzi, Sconti Cliente e Layout del PDF
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              Agente: <strong>{agentName}</strong> {agentCode ? `(Cod. ${agentCode})` : ''}
            </span>
          </div>

          {/* Intestazione PDF + Selezione Cliente Predittiva */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Titolo del Catalogo PDF
              </label>
              <input
                type="text"
                value={catalogTitle}
                onChange={e => setCatalogTitle(e.target.value)}
                placeholder="Es. Selezione Illuminazione LED Primavera"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Sottotitolo / Nota Commerciale (Opzionale)
              </label>
              <input
                type="text"
                value={catalogSubtitle}
                onChange={e => setCatalogSubtitle(e.target.value)}
                placeholder="Es. Condizioni riservate valide fino a fine mese"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main"
              />
            </div>

            {/* Selettore Predittivo Cliente Assegnato */}
            <div ref={clientDropdownRef} className="lg:col-span-4 relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Associa a un tuo Cliente (Carica Sconti Automatici)
              </label>
              <div className="relative">
                <input
                  type="text"
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
                  className="w-full pl-3 pr-16 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main"
                />
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => handleSelectClient(null)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] font-bold bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 rounded"
                  >
                    Scollega
                  </button>
                )}
              </div>

              {isClientDropdownOpen && (
                <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                  <button
                    type="button"
                    onClick={() => handleSelectClient(null)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    — Nessun cliente specifico (Usa sconto manuale) —
                  </button>
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 text-center">
                      Nessun cliente trovato
                    </div>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${
                          selectedClientId === c.id ? 'bg-amber-50 font-bold' : ''
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold text-gray-900 truncate">{c.companyName}</div>
                          <div className="text-[11px] text-gray-500">
                            Cod. {c.zucchettiCode}{' '}
                            {c.customerType && !c.customerType.toLowerCase().includes('nessuna')
                              ? `• ${c.customerType}`
                              : ''}{' '}
                            {c.city ? `• ${c.city}` : ''}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded shrink-0">
                          Sc. {Number(c.discount || 0)}%
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modalità Prezzi, Sconti Manuali e Modalità Giacenze */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Scelta Modalità Prezzi */}
            <div className="lg:col-span-5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Visualizzazione Prezzi nel Catalogo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRICE_MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriceMode(opt.value)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      priceMode === opt.value
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-gray-50/60 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 leading-snug ${
                        priceMode === opt.value ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sconto Base + Extra Sconto */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Sconto Applicato ai Prezzi
              </label>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Sconto Base (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      step={0.5}
                      disabled={
                        Boolean(selectedClient) ||
                        priceMode === 'LIST_ONLY' ||
                        priceMode === 'NO_PRICE'
                      }
                      readOnly={Boolean(selectedClient)}
                      value={baseDiscount}
                      onChange={e => {
                        if (selectedClient) return;
                        setBaseDiscount(Math.max(0, Math.min(95, Number(e.target.value) || 0)));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Extra Sconto (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      step={0.5}
                      disabled={
                        Boolean(selectedClient) ||
                        priceMode === 'LIST_ONLY' ||
                        priceMode === 'NO_PRICE'
                      }
                      readOnly={Boolean(selectedClient)}
                      value={extraDiscount}
                      onChange={e => {
                        if (selectedClient) return;
                        setExtraDiscount(Math.max(0, Math.min(95, Number(e.target.value) || 0)));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {selectedClient ? (
                    <>
                      🔒 Sconto Base fisso di{' '}
                      <strong>{selectedClient.companyName}</strong> ({baseDiscount}%) +{' '}
                      <strong>{applicableRulesCount}</strong> regole di sconto attive.
                    </>
                  ) : (
                    <>
                      Imposta uno sconto manuale oppure seleziona un cliente per applicare il suo
                      listino riservato ({applicableRulesCount} regole generali attive).
                    </>
                  )}
                </p>
                <Link
                  href="/account/discounts"
                  className="w-full px-3 py-1.5 text-[11px] font-extrabold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>🏷️ Gestisci Sconti Prodotti / Marchi / Categorie ({applicableRulesCount})</span>
                </Link>
              </div>
            </div>

            {/* Scelta Modalità Giacenze */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Visualizzazione Giacenze / Depositi nel PDF
              </label>
              <div className="space-y-1.5">
                {STOCK_MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStockMode(opt.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                      stockMode === opt.value
                        ? 'border-brand-main bg-amber-50/70 text-gray-900 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-gray-500">{opt.desc}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                        stockMode === opt.value
                          ? 'border-brand-main bg-brand-main text-black'
                          : 'border-gray-300'
                      }`}
                    >
                      {stockMode === opt.value && <span className="text-[10px] font-black">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANNELLO 3: RIEPILOGO COMPATTO PRODOTTI SELEZIONATI + PULSANTE APERTURA MODALE ANTEPRIMA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-black text-gray-900">
              Articoli inseriti nel catalogo: {sortedCatalogProducts.length}{' '}
              <span className="text-xs font-semibold text-gray-500">
                ({sortedCatalogProducts.length > 0 ? totalSheets : 0}{' '}
                {totalSheets === 1 ? 'foglio A4' : 'fogli A4'})
              </span>
            </span>
            {sortedCatalogProducts.length > 0 && (
              <>
                <span className="text-xs text-gray-400">|</span>
                <button
                  type="button"
                  onClick={handleClearCatalog}
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
                >
                  Svuota tutto
                </button>
              </>
            )}
          </div>

          {sortedCatalogProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-4 py-2 text-xs sm:text-sm font-black rounded-lg bg-gray-900 hover:bg-black text-white shadow-sm transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-brand-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Apri Anteprima Catalogo (1 o 2 Pagine)
              </button>
            </div>
          )}
        </div>

        {isSearching ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-brand-main border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-600">
              Caricamento schede prodotto nel catalogo...
            </p>
          </div>
        ) : searchError ? (
          <div className="p-10 text-center text-red-600 font-semibold text-sm">{searchError}</div>
        ) : sortedCatalogProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-black">
              +
            </div>
            <p className="text-sm font-bold text-gray-800">
              Il tuo catalogo è vuoto — inizia ad aggiungere i prodotti
            </p>
            <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
              Scrivi un codice nella <strong>barra predittiva qui sopra</strong> (es.{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded font-bold text-gray-800">E45</code>
              , clicca sul prodotto, poi scrivi{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded font-bold text-gray-800">IL34</code>{' '}
              e clicca sul successivo), oppure seleziona un{' '}
              <strong>Marchio / Gruppo / Famiglia / Categoria</strong> per caricare un intero reparto.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pr-1">
              {sortedCatalogProducts.map((product, idx) => {
                const pricing = calculateProductPricing(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-black text-gray-400 w-5 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center shrink-0 p-0.5 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-gray-300">N/D</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-gray-900 truncate">
                            {product.sku}
                          </span>
                          {priceMode !== 'NO_PRICE' && (
                            <span className="text-[11px] font-extrabold text-emerald-700 shrink-0">
                              €{' '}
                              {(priceMode === 'LIST_ONLY' ? pricing.listPrice : pricing.netPrice)
                                .toFixed(2)
                                .replace('.', ',')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-600 truncate">
                          {product.originalName || product.title}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProductFromCatalog(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                      title="Rimuovi dal catalogo"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODALE A TUTTO SCHERMO PER L'ANTEPRIMA SFOGLIABILE DEL CATALOGO (1 PAGINA O 2 PAGINE CON ANIMAZIONE 3D DEL FOGLIO CHE SI GIRA) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden">
          {/* Stili 3D per l'animazione realistica del foglio che si gira */}
          <style>{`
            @keyframes catalogPageTurnNext {
              0% {
                transform: perspective(2400px) rotateY(0deg) scale(1);
                filter: brightness(1);
              }
              45% {
                transform: perspective(2400px) rotateY(-88deg) scale(0.96);
                filter: brightness(0.78);
              }
              55% {
                transform: perspective(2400px) rotateY(88deg) scale(0.96);
                filter: brightness(0.78);
              }
              100% {
                transform: perspective(2400px) rotateY(0deg) scale(1);
                filter: brightness(1);
              }
            }
            @keyframes catalogPageTurnPrev {
              0% {
                transform: perspective(2400px) rotateY(0deg) scale(1);
                filter: brightness(1);
              }
              45% {
                transform: perspective(2400px) rotateY(88deg) scale(0.96);
                filter: brightness(0.78);
              }
              55% {
                transform: perspective(2400px) rotateY(-88deg) scale(0.96);
                filter: brightness(0.78);
              }
              100% {
                transform: perspective(2400px) rotateY(0deg) scale(1);
                filter: brightness(1);
              }
            }
            @keyframes catalogCurlShadowSweep {
              0% {
                opacity: 0;
              }
              45% {
                opacity: 0.45;
              }
              55% {
                opacity: 0.45;
              }
              100% {
                opacity: 0;
              }
            }
            .catalog-3d-stage {
              perspective: 2400px;
              transform-style: preserve-3d;
            }
            .catalog-flip-next {
              animation: catalogPageTurnNext 540ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
              transform-origin: center center;
            }
            .catalog-flip-prev {
              animation: catalogPageTurnPrev 540ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
              transform-origin: center center;
            }
            .catalog-curl-shadow {
              animation: catalogCurlShadowSweep 540ms ease-in-out forwards;
            }
          `}</style>

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

            {/* Centro: Switch 1 Pagina / 2 Pagine + Controlli Sfoglia Pagina */}
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

              {/* Controlli di Sfoglia Pagine */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => flipToSheet(0)}
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
                  ◀ Sfoglia
                </button>

                <select
                  value={previewViewMode === 'DOUBLE' ? leftSpreadSheet : safeCurrentSheet}
                  onChange={e => flipToSheet(Number(e.target.value))}
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
                          Pagina {idx + 1} di {totalSheets}
                        </option>
                      ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!canGoNext}
                  className="px-3 py-1.5 text-xs font-black rounded-lg bg-gray-900 border border-gray-700 text-white hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Sfoglia ▶
                </button>
                <button
                  type="button"
                  onClick={() => flipToSheet(totalSheets - 1)}
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

          {/* Corpo Centrale Modale: Tavolo di Lettura con Fogli A4 Sfogliabili in 3D */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-[1680px] mx-auto flex items-center justify-center gap-3 sm:gap-5 my-auto">
              {/* Freccia Laterale Sinistra per Girare Pagina Indietro */}
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!canGoPrev}
                className="hidden md:flex w-13 h-32 rounded-2xl bg-gray-900/90 hover:bg-black border border-gray-700 text-brand-main items-center justify-center shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                title="Gira Pagina Indietro (←)"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Contenitore 3D con Animazione del Foglio che si Gira */}
              <div
                className={`catalog-3d-stage relative w-full ${
                  previewViewMode === 'DOUBLE' ? 'max-w-[1520px]' : 'max-w-4xl'
                } ${
                  flipDirection === 'next'
                    ? 'catalog-flip-next'
                    : flipDirection === 'prev'
                    ? 'catalog-flip-prev'
                    : ''
                }`}
              >
                {/* Ombra dinamica di curvatura del foglio durante la rotazione */}
                {flipDirection && (
                  <div
                    className="catalog-curl-shadow pointer-events-none absolute inset-0 z-30 rounded-2xl"
                    style={{
                      background:
                        flipDirection === 'next'
                          ? 'linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.38) 50%, rgba(255,255,255,0.18) 100%)'
                          : 'linear-gradient(270deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.38) 50%, rgba(255,255,255,0.18) 100%)',
                    }}
                  />
                )}

                {previewViewMode === 'SINGLE' ? (
                  /* VISTA 1 PAGINA SINGOLA */
                  renderA4Sheet(safeCurrentSheet)
                ) : (
                  /* VISTA 2 PAGINE AFFIANCATE (LIBRO APERTO CON RILEGATURA CENTRALE) */
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-0 items-stretch relative">
                    {/* Pagina Sinistra */}
                    <div className="flex flex-col">{renderA4Sheet(leftSpreadSheet, 'left')}</div>

                    {/* Rilegatura / Piega Centrale del Libro */}
                    <div
                      aria-hidden="true"
                      className="hidden xl:block pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 z-20"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 35%, rgba(255,255,255,0.25) 50%, rgba(0,0,0,0.08) 65%, rgba(0,0,0,0.24) 100%)',
                      }}
                    />

                    {/* Pagina Destra */}
                    <div className="flex flex-col">
                      {renderA4Sheet(rightSpreadSheet ?? leftSpreadSheet + 1, 'right')}
                    </div>
                  </div>
                )}
              </div>

              {/* Freccia Laterale Destra per Girare Pagina Avanti */}
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoNext}
                className="hidden md:flex w-13 h-32 rounded-2xl bg-gray-900/90 hover:bg-black border border-gray-700 text-brand-main items-center justify-center shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                title="Gira Pagina Avanti (→)"
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
