'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from '@/app/actions/catalogBuilder';
import { AgentManagedClient } from '@/app/actions/newClient';

interface Props {
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  initialSearch: CatalogSearchResponse;
}

const WAREHOUSE_OPTIONS: { value: WarehouseFilterMode; label: string; desc: string }[] = [
  {
    value: 'ALL_AVAILABLE',
    label: 'Tutti i Disponibili (2GG + 7GG)',
    desc: 'Prodotti con giacenza > 0 in almeno un deposito',
  },
  {
    value: 'MAIN_2GG',
    label: 'Deposito Principale (Pronta Consegna 2GG)',
    desc: 'Solo articoli fisicamente pronti nel magazzino principale (stock_main > 0)',
  },
  {
    value: 'EXTERNAL_7GG',
    label: 'Deposito Esterno (Consegna 7GG)',
    desc: 'Articoli disponibili nel deposito logistico esterno (stock_ek > 0)',
  },
  {
    value: 'BOTH_WAREHOUSES',
    label: 'Presenti in Entrambi i Depositi',
    desc: 'Giacenza attiva sia nel deposito 2GG che nel deposito 7GG',
  },
  {
    value: 'ALL_INCLUDING_OOS',
    label: 'Tutti i Prodotti (Inclusi Esauriti)',
    desc: 'Intero catalogo anche con giacenza temporaneamente a zero',
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
  initialSearch,
}: Props) {
  // --- STATO FILTRI RICERCA ---
  const [catalogSource, setCatalogSource] = useState<CatalogSourceMode>('ZUCCHETTI');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [warehouse, setWarehouse] = useState<WarehouseFilterMode>('ALL_AVAILABLE');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortMode>('STOCK_DESC');
  const [limit, setLimit] = useState<number>(60);

  // --- STATO RISULTATI & SELEZIONE ---
  const [products, setProducts] = useState<CatalogProductItem[]>(initialSearch.products || []);
  const [totalFound, setTotalFound] = useState<number>(initialSearch.totalFound || 0);
  const [facets, setFacets] = useState(
    initialSearch.facets || { brands: [], productGroups: [], families: [], categories: [] }
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((initialSearch.products || []).map(p => p.id))
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  // Vista UI e generazione PDF
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Chiudi dropdown predittivo cliente cliccando fuori
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Debounce della ricerca testuale scritta dall'agente
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Esegui ricerca su Typesense al variare dei filtri
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    async function runSearch() {
      setIsSearching(true);
      setSearchError('');
      const filters: CatalogSearchFilters = {
        catalogSource,
        query: debouncedQuery,
        warehouse,
        brands: selectedBrands,
        productGroups: selectedProductGroups,
        families: selectedFamilies,
        categories: selectedCategories,
        sortBy,
        limit,
      };
      const res = await searchAgentCatalogProducts(filters);
      if (cancelled) return;
      setIsSearching(false);
      if (!res.success) {
        setSearchError(res.error || 'Errore durante il caricamento dei prodotti.');
        return;
      }
      setProducts(res.products);
      setTotalFound(res.totalFound);
      setFacets(res.facets);
      // Seleziona automaticamente i risultati caricati per comodità dell'agente
      setSelectedIds(new Set(res.products.map(p => p.id)));
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [
    catalogSource,
    debouncedQuery,
    warehouse,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
    sortBy,
    limit,
  ]);

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

  // Calcolo prezzo netto e sconto per singolo prodotto
  const calculateProductPricing = (product: CatalogProductItem) => {
    const listPrice = Number(product.listPrice || 0);
    if (product.catalogSource === 'elmark') {
      const dgKey = (product.discgroup || '').trim();
      const hasCustomDg =
        dgKey &&
        elmarkDiscounts &&
        typeof elmarkDiscounts[dgKey] === 'number' &&
        elmarkDiscounts[dgKey] > 0;
      const bDisc = hasCustomDg ? Number(elmarkDiscounts[dgKey]) : Number(baseDiscount || 0);
      const eDisc = Number(extraDiscount || 0);
      const afterBase = listPrice * (1 - bDisc / 100);
      const netPrice = Number((afterBase * (1 - eDisc / 100)).toFixed(4));
      const effectivePct =
        listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
      return { listPrice, netPrice, discountPct: Math.max(0, effectivePct) };
    } else {
      const bDisc = Number(baseDiscount || 0);
      const eDisc = Number(extraDiscount || 0);
      const afterBase = listPrice * (1 - bDisc / 100);
      const netPrice = Number((afterBase * (1 - eDisc / 100)).toFixed(4));
      const effectivePct =
        listPrice > 0 ? Number(((1 - netPrice / listPrice) * 100).toFixed(2)) : 0;
      return { listPrice, netPrice, discountPct: Math.max(0, effectivePct) };
    }
  };

  const selectedProducts = useMemo(
    () => products.filter(p => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const toggleProductSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const resetAllFilters = () => {
    setCatalogSource('ZUCCHETTI');
    setQuery('');
    setDebouncedQuery('');
    setWarehouse('ALL_AVAILABLE');
    setSelectedBrands([]);
    setSelectedProductGroups([]);
    setSelectedFamilies([]);
    setSelectedCategories([]);
    setSortBy('STOCK_DESC');
    setLimit(60);
  };

  // Stringa descrittiva dei filtri attivi (stampata anche nel PDF)
  const filterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (catalogSource === 'ZUCCHETTI') parts.push('Listino Principale Izzo');
    else if (catalogSource === 'ELMARK') parts.push('Catalogo Elmark');
    else parts.push('Tutti i Cataloghi');

    const whLabel = WAREHOUSE_OPTIONS.find(w => w.value === warehouse)?.label;
    if (whLabel) parts.push(`Deposito: ${whLabel}`);

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
    if (debouncedQuery.trim()) {
      parts.push(`Ricerca: "${debouncedQuery.trim()}"`);
    }
    return parts.join(' • ');
  }, [
    catalogSource,
    warehouse,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
    debouncedQuery,
    facets,
  ]);

  const handleDownloadPdf = async () => {
    if (selectedProducts.length === 0) {
      setPdfError('Seleziona almeno un prodotto per generare il catalogo PDF.');
      return;
    }
    setIsGeneratingPdf(true);
    setPdfError('');

    try {
      const itemsPayload = selectedProducts.map(p => {
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

  const hasActiveFilters =
    query.trim() !== '' ||
    warehouse !== 'ALL_AVAILABLE' ||
    selectedBrands.length > 0 ||
    selectedProductGroups.length > 0 ||
    selectedFamilies.length > 0 ||
    selectedCategories.length > 0;

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
              Filtra il catalogo per <strong>Marchio</strong>, <strong>Deposito</strong>,{' '}
              <strong>Tipo di Prodotto</strong> o con una <strong>Ricerca scritta da te</strong>,
              personalizza prezzi e disponibilità e scarica il PDF pronto per il cliente.
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
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || selectedProducts.length === 0}
              className="px-5 py-2.5 text-sm font-black rounded-lg bg-brand-main hover:bg-amber-400 text-black shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Generazione PDF ({selectedProducts.length} schede • {Math.ceil(selectedProducts.length / 6)} fogli)...
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
                  Scarica Catalogo PDF ({selectedProducts.length} schede • {Math.ceil(selectedProducts.length / 6)} {Math.ceil(selectedProducts.length / 6) === 1 ? 'foglio' : 'fogli'})
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

      {/* PANNELLO 1: FILTRI CATALOGO (MARCHIO, DEPOSITO, TIPO DI PRODOTTO, RICERCA LIBERA) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-black bg-gray-900 text-white rounded-md">
              1
            </span>
            <h2 className="text-base font-bold text-gray-900">
              Filtra Prodotti del Catalogo
            </h2>
          </div>

          {/* Switch Sorgente Catalogo */}
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {(
              [
                { id: 'ZUCCHETTI', label: 'Catalogo Izzo (Multi-brand)' },
                { id: 'ELMARK', label: 'Catalogo Elmark' },
                { id: 'ALL', label: 'Tutti i Cataloghi' },
              ] as { id: CatalogSourceMode; label: string }[]
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCatalogSource(tab.id);
                  setSelectedBrands([]);
                  setSelectedProductGroups([]);
                  setSelectedFamilies([]);
                  setSelectedCategories([]);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  catalogSource === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIGA 1: Ricerca Libera scritta dall'Agente + Filtro Deposito */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Ricerca Libera (Scritta dall&apos;Agente)
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Scrivi codice SKU, descrizione, potenza, colore, attacco (es. 'faretto nero 3000K', 'plafoniera IP65', 'E27')..."
                className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-brand-main"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Pulisci
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Deposito / Disponibilità Magazzino
            </label>
            <select
              value={warehouse}
              onChange={e => setWarehouse(e.target.value as WarehouseFilterMode)}
              className="w-full px-3 py-2.5 text-sm font-medium border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-main"
            >
              {WAREHOUSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RIGA 2: Marchio + Tipo di Prodotto (Gruppo Merceologico, Famiglia, Categoria) */}
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

        {/* RIGA 3: Ordinamento, Numero massimo di articoli e Reset Filtri */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Ordina per:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as CatalogSortMode)}
                className="px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white"
              >
                <option value="STOCK_DESC">Giacenza Maggiore (Prima 2GG)</option>
                <option value="SKU_ASC">Codice Articolo (A-Z)</option>
                <option value="PRICE_ASC">Prezzo Crescente</option>
                <option value="PRICE_DESC">Prezzo Decrescente</option>
                <option value="TITLE_ASC">Descrizione (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Max schede in catalogo (6 per foglio):</label>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white"
              >
                <option value={18}>18 schede (3 fogli)</option>
                <option value={30}>30 schede (5 fogli)</option>
                <option value={60}>60 schede (10 fogli)</option>
                <option value={120}>120 schede (20 fogli)</option>
                <option value={180}>180 schede (30 fogli)</option>
                <option value={300}>300 schede (50 fogli)</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
            >
              ✕ Azzera tutti i filtri
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
                            Cod. {c.zucchettiCode} {c.city ? `• ${c.city}` : ''}
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
                      disabled={priceMode === 'LIST_ONLY' || priceMode === 'NO_PRICE'}
                      value={baseDiscount}
                      onChange={e =>
                        setBaseDiscount(Math.max(0, Math.min(95, Number(e.target.value) || 0)))
                      }
                      className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded-md bg-white disabled:opacity-50"
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
                      disabled={priceMode === 'LIST_ONLY' || priceMode === 'NO_PRICE'}
                      value={extraDiscount}
                      onChange={e =>
                        setExtraDiscount(Math.max(0, Math.min(95, Number(e.target.value) || 0)))
                      }
                      className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded-md bg-white disabled:opacity-50"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {selectedClient ? (
                    <>
                      Sconti caricati da <strong>{selectedClient.companyName}</strong>. Puoi
                      comunque ritoccarli per questo catalogo.
                    </>
                  ) : (
                    <>
                      Imposta uno sconto manuale oppure seleziona un cliente per applicare il suo
                      listino riservato.
                    </>
                  )}
                </p>
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

      {/* PANNELLO 3: ANTEPRIMA INTERATTIVA DEL CATALOGO E SELEZIONE ARTICOLI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar Risultati */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={products.length > 0 && selectedIds.size === products.length}
                onChange={toggleAllVisible}
                className="w-4 h-4 rounded border-gray-300 text-brand-main focus:ring-brand-main"
              />
              <span>
                Seleziona tutti ({selectedIds.size} di {products.length} caricati)
              </span>
            </label>

            <span className="text-xs text-gray-400">|</span>

            <span className="text-xs text-gray-600">
              Totale corrispondenti ai filtri:{' '}
              <strong className="text-gray-900">{totalFound.toLocaleString('it-IT')}</strong> articoli
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-900 text-white">
              Formato Stampa: 6 Schede per Foglio A4 (2×3) • {Math.ceil(selectedProducts.length / 6)}{' '}
              {Math.ceil(selectedProducts.length / 6) === 1 ? 'foglio' : 'fogli'}
            </span>
          </div>
        </div>

        {/* Barra riepilogo filtri attivi */}
        <div className="px-4 py-2.5 bg-amber-50/50 border-b border-gray-100 text-xs text-gray-700 flex flex-wrap items-center justify-between gap-2">
          <div className="truncate">
            <span className="font-bold text-gray-900"> Sintesi Catalogo: </span>
            <span>{filterSummaryText}</span>
          </div>
          {selectedClient && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] shrink-0">
              Cliente: {selectedClient.companyName} ({selectedClient.zucchettiCode})
            </span>
          )}
        </div>

        {/* Stato di caricamento / errore / lista prodotti a schede (6 per foglio) */}
        {isSearching ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-brand-main border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-600">
              Ricerca prodotti nel catalogo in corso...
            </p>
          </div>
        ) : searchError ? (
          <div className="p-12 text-center text-red-600 font-semibold text-sm">{searchError}</div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <p className="text-base font-bold text-gray-800">
              Nessun prodotto trovato con i filtri selezionati
            </p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Prova ad allargare la ricerca scritta, cambiare il deposito oppure deselezionare uno
              dei filtri di marchio o categoria.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-2 px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Ripristina Filtri Predefiniti
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-8 bg-gray-100/70">
            {Array.from({ length: Math.ceil(products.length / 6) }).map((_, sheetIdx) => {
              const sheetProducts = products.slice(sheetIdx * 6, (sheetIdx + 1) * 6);
              const totalSheets = Math.ceil(products.length / 6);

              return (
                <div
                  key={sheetIdx}
                  className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden"
                >
                  {/* Intestazione Foglio A4 (6 Schede per foglio) */}
                  <div className="px-5 py-3 bg-gray-900 text-white border-b-2 border-brand-main flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 text-xs font-black bg-brand-main text-black rounded">
                        FOGLIO {sheetIdx + 1} / {totalSheets}
                      </span>
                      <span className="text-xs font-bold text-gray-300">
                        Schede {sheetIdx * 6 + 1}–{sheetIdx * 6 + sheetProducts.length} (Griglia 2×3 — 6 schede per foglio)
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                      {catalogTitle || 'Catalogo Prodotti B2B'}
                    </span>
                  </div>

                  {/* Griglia 2 colonne x 3 righe = 6 Schede Prodotto */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {sheetProducts.map(product => {
                      const isSelected = selectedIds.has(product.id);
                      const pricing = calculateProductPricing(product);

                      return (
                        <div
                          key={product.id}
                          onClick={() => toggleProductSelection(product.id)}
                          className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-gray-900 bg-white shadow-sm'
                              : 'border-gray-200 bg-gray-50/60 opacity-60 hover:opacity-95'
                          }`}
                        >
                          {/* 1. Fascia Superiore Scheda: Checkbox + SKU + Marchio */}
                          <div className="px-3.5 py-2 bg-gray-900 text-white border-b-2 border-emerald-500 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onClick={e => e.stopPropagation()}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-4 h-4 rounded border-gray-400 text-brand-main focus:ring-brand-main cursor-pointer"
                              />
                              <span className="font-mono text-xs font-black tracking-wide text-white truncate">
                                COD. {product.sku}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded uppercase shrink-0">
                              {product.brandLabel || product.brand || 'IZZO'}
                            </span>
                          </div>

                          {/* 2. Corpo Superiore: Foto Grande (96x96) + Categoria, Titolo e Bollino Giacenza */}
                          <div className="p-3.5 flex gap-3.5 items-start">
                            <div className="w-24 h-24 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.title}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300 text-center">
                                  IMMAGINE NON DISP.
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[96px]">
                              <div>
                                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                                  {product.categoryLabel ||
                                    product.familyLabel ||
                                    product.productGroupLabel ||
                                    'Articolo a Catalogo'}
                                </div>
                                <h3 className="text-sm font-extrabold text-gray-900 leading-snug mt-0.5">
                                  {product.originalName || product.title}
                                </h3>
                              </div>

                              {/* Bollino Disponibilità */}
                              <div className="mt-2">
                                {stockMode === 'HIDE_STOCK' ? (
                                  <span className="inline-block px-2 py-0.5 text-[10px] text-gray-400 bg-gray-100 rounded italic">
                                    Giacenza nascosta nel PDF (2GG: {product.stockMain} | 7GG:{' '}
                                    {product.stockEk})
                                  </span>
                                ) : stockMode === 'EXACT_QTY' ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                        product.stockMain > 0
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-gray-100 text-gray-500 border-gray-200'
                                      }`}
                                    >
                                      2GG: {product.stockMain} {product.unit}
                                    </span>
                                    {product.catalogSource !== 'elmark' && (
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                          product.stockEk > 0
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}
                                      >
                                        7GG: {product.stockEk} {product.unit}
                                      </span>
                                    )}
                                  </div>
                                ) : product.stockMain > 0 && product.catalogSource !== 'elmark' ? (
                                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                    ● Pronta Consegna (Dep. 2GG)
                                  </span>
                                ) : product.stockEk > 0 ||
                                  (product.catalogSource === 'elmark' && product.stockTotal > 0) ? (
                                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                    ● Disponibile (Dep. 7GG)
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded">
                                    Su Ordinazione
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3. Fascia Centrale: Box Specifiche Tecniche (non troncata) */}
                          <div className="mx-3.5 mb-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                              Specifiche e Descrizione Tecnica
                            </div>
                            <p className="text-[11px] text-slate-700 leading-relaxed break-words">
                              {(product.technicalDesc || product.description || product.originalName || product.title || '')
                                .replace(/;/g, '  |  ')}
                            </p>
                          </div>

                          {/* 4. Fascia Inferiore: Box Prezzi della Scheda */}
                          <div className="mx-3.5 mb-3.5 px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                            {priceMode === 'NO_PRICE' ? (
                              <div className="w-full flex items-center justify-between text-xs text-slate-600">
                                <span className="font-bold">SCHEDA TECNICA PRODOTTO</span>
                                <span className="text-[11px]">Unità: {product.unit || 'PZ'}</span>
                              </div>
                            ) : priceMode === 'LIST_ONLY' ? (
                              <>
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-600 uppercase">
                                    Prezzo di Listino
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    IVA esclusa / per {product.unit || 'PZ'}
                                  </div>
                                </div>
                                <div className="text-base font-black text-gray-900">
                                  € {pricing.listPrice.toFixed(2).replace('.', ',')}
                                </div>
                              </>
                            ) : priceMode === 'NET_ONLY' ? (
                              <>
                                <div>
                                  <div className="text-[10px] font-extrabold text-emerald-800 uppercase">
                                    Prezzo Netto Riservato
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    IVA esclusa / per {product.unit || 'PZ'}
                                  </div>
                                </div>
                                <div className="text-base font-black text-emerald-800">
                                  € {pricing.netPrice.toFixed(2).replace('.', ',')}
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <div className="text-xs text-slate-500">
                                    Listino:{' '}
                                    <span className="line-through font-semibold">
                                      € {pricing.listPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                  {pricing.discountPct > 0 ? (
                                    <div className="text-[11px] font-extrabold text-red-600">
                                      Sconto riservato: -{pricing.discountPct.toFixed(1).replace('.0', '')}%
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-500">
                                      IVA esclusa / {product.unit || 'PZ'}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-[9px] font-extrabold text-emerald-800 uppercase">
                                    Prezzo Netto / {product.unit || 'PZ'}
                                  </div>
                                  <div className="text-base font-black text-emerald-800">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
