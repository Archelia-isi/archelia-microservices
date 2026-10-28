'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  AgentManagedClient,
  CommercialCategoryOption,
} from '@/app/actions/newClient';
import {
  CatalogFacetOption,
  CatalogProductItem,
  searchAgentCatalogProducts,
  searchCatalogPredictiveAction,
} from '@/app/actions/catalogBuilder';
import {
  saveAgentDiscountRuleAction,
  toggleAgentDiscountRuleAction,
  deleteAgentDiscountRuleAction,
} from '@/app/actions/discountRules';
import {
  AgentDiscountRule,
  DiscountCalculationMode,
  DiscountClientScope,
  DiscountTargetClientMeta,
  DiscountTargetProductMeta,
  DiscountTargetType,
  doesRuleMatchClient,
  normalizeClientCategoryCode,
} from '@/lib/discountRulesEngine';

interface Props {
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  clientCategories: CommercialCategoryOption[];
  facets: {
    brands: CatalogFacetOption[];
    productGroups: CatalogFacetOption[];
    families: CatalogFacetOption[];
    categories: CatalogFacetOption[];
  };
  initialRules: AgentDiscountRule[];
}

function MultiSelectPicker({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: CatalogFacetOption[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      o => o.code.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggleValue = (code: string) => {
    const upper = code.toUpperCase();
    if (selectedValues.includes(upper)) {
      onChange(selectedValues.filter(v => v !== upper));
    } else {
      onChange([...selectedValues, upper]);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
            {label}
          </span>
          {selectedValues.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 rounded-full">
              {selectedValues.length} selezionat{selectedValues.length === 1 ? 'o' : 'i'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full sm:w-56 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-main"
          />
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-bold text-red-600 hover:underline whitespace-nowrap"
            >
              Svuota
            </button>
          )}
        </div>
      </div>

      {/* Chip valori selezionati */}
      {selectedValues.length > 0 && (
        <div className="px-3 py-2 bg-amber-50/60 border-b border-amber-100 flex flex-wrap gap-1.5">
          {selectedValues.map(code => {
            const opt = options.find(o => o.code.toUpperCase() === code.toUpperCase());
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-200/80 text-amber-950"
              >
                <span>{opt ? opt.label : code}</span>
                <button
                  type="button"
                  onClick={() => toggleValue(code)}
                  className="text-amber-800 hover:text-red-700 font-black"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {filtered.length === 0 ? (
          <div className="col-span-2 py-6 text-center text-xs text-gray-400">
            Nessuna voce trovata
          </div>
        ) : (
          filtered.map(opt => {
            const checked = selectedValues.includes(opt.code.toUpperCase());
            return (
              <label
                key={opt.code}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  checked
                    ? 'bg-amber-50 text-gray-900 font-bold border border-amber-300'
                    : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(opt.code)}
                    className="rounded border-gray-300 text-brand-main focus:ring-brand-main shrink-0"
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
    </div>
  );
}

export default function DiscountsManagerClient({
  agentName,
  agentCode,
  clients,
  clientCategories,
  facets,
  initialRules,
}: Props) {
  const [rules, setRules] = useState<AgentDiscountRule[]>(initialRules || []);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Stato form regola
  const [ruleName, setRuleName] = useState<string>('');
  const [clientScope, setClientScope] =
    useState<DiscountClientScope>('SELECTED_CLIENTS');
  // Array di ID clienti selezionati (1 o più clienti)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  // Array di Categorie Clienti selezionate (es. ['RIV', 'IST'])
  const [selectedClientCategories, setSelectedClientCategories] = useState<string[]>(
    []
  );
  // Filtro rapido per categoria cliente dentro la tendina di selezione clienti
  const [dropdownClientCatFilter, setDropdownClientCatFilter] =
    useState<string>('ALL');

  const [clientSearchText, setClientSearchText] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState<boolean>(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  const [targetType, setTargetType] = useState<DiscountTargetType>('PRODUCTS');
  const [selectedProducts, setSelectedProducts] = useState<DiscountTargetProductMeta[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [calculationMode, setCalculationMode] =
    useState<DiscountCalculationMode>('EXTRA_CASCADE');
  const [discountValue, setDiscountValue] = useState<number>(10);

  // Barra predittiva per selezione prodotti singoli
  const [productQuery, setProductQuery] = useState<string>('');
  const [predictiveResults, setPredictiveResults] = useState<CatalogProductItem[]>([]);
  const [isPredictiveOpen, setIsPredictiveOpen] = useState<boolean>(false);
  const [isPredictiveLoading, setIsPredictiveLoading] = useState<boolean>(false);
  const predictiveRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);

  // Stato salvataggio / filtri lista regole
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [filterClientScope, setFilterClientScope] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
      if (predictiveRef.current && !predictiveRef.current.contains(e.target as Node)) {
        setIsPredictiveOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Ricerca predittiva prodotti (identica alle barre del sito)
  useEffect(() => {
    const q = productQuery.trim();
    if (q.length < 1) {
      setPredictiveResults([]);
      setIsPredictiveLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPredictiveLoading(true);
      try {
        const res = await searchCatalogPredictiveAction(q, 'ALL_WAREHOUSES', true);
        if (res.success) {
          setPredictiveResults(res.products);
        }
      } catch (e) {
        console.error('Errore ricerca predittiva prodotti sconti:', e);
      } finally {
        setIsPredictiveLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [productQuery]);

  // Helper per determinare il codice e l'etichetta della categoria di un cliente
  const getClientCategoryInfo = (c: AgentManagedClient) => {
    const normCode = normalizeClientCategoryCode(
      c.categoriaCode || c.customerType,
      c.discount
    );
    if (normCode === 'RIV') {
      return { code: 'RIV', shortLabel: 'Rivenditore', fullLabel: 'RIV - Rivenditore' };
    }
    if (normCode === 'IST') {
      return {
        code: 'IST',
        shortLabel: 'Installatore / Impiantista',
        fullLabel: 'IST - Installatore / Impiantista',
      };
    }
    if (normCode === 'GEN') {
      return { code: 'GEN', shortLabel: 'Generale', fullLabel: 'GEN - Generale' };
    }
    if (normCode) {
      return {
        code: normCode,
        shortLabel: c.customerType || normCode,
        fullLabel: c.customerType || normCode,
      };
    }
    return {
      code: '',
      shortLabel: 'Nessuna Cat.',
      fullLabel: 'Nessuna Categoria',
    };
  };

  // Lista categorie clienti disponibili (arricchita col conteggio dei clienti dell'agente in ogni categoria)
  const enrichedClientCategories = useMemo(() => {
    const baseList =
      clientCategories && clientCategories.length > 0
        ? clientCategories
        : [
            { code: 'RIV', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
            {
              code: 'IST',
              label: 'IST - Installatore / Impiantista (Sconto base 40%)',
              discount: 40,
            },
            { code: 'GEN', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
          ];

    return baseList.map(cat => {
      const upperCode = normalizeClientCategoryCode(cat.code, cat.discount);
      const matchingClientsCount = clients.filter(
        c => getClientCategoryInfo(c).code === upperCode
      ).length;
      const cleanName = cat.label.replace(/\s*\(Sconto.*\)$/i, '').trim();
      return {
        code: upperCode,
        name: cleanName,
        label: cat.label,
        discount: cat.discount,
        clientsCount: matchingClientsCount,
      };
    });
  }, [clientCategories, clients]);

  const selectedClientsObjects = useMemo(
    () => clients.filter(c => selectedClientIds.includes(c.id)),
    [clients, selectedClientIds]
  );

  // Clienti effettivamente coinvolti dalla regola in creazione (mostrati nel 1/3 superiore della barra destra)
  const sidebarClients = useMemo(() => {
    if (clientScope === 'ALL_CLIENTS') {
      return clients;
    }
    if (clientScope === 'CLIENT_CATEGORY') {
      if (selectedClientCategories.length === 0) return [];
      return clients.filter(c =>
        selectedClientCategories.includes(getClientCategoryInfo(c).code)
      );
    }
    return selectedClientsObjects;
  }, [clientScope, clients, selectedClientCategories, selectedClientsObjects]);

  // Prodotti corrispondenti a Marchio / Gruppo / Famiglia / Categoria / Tutto il Catalogo per il 2/3 inferiore della barra destra
  const [scopeProducts, setScopeProducts] = useState<CatalogProductItem[]>([]);
  const [scopeProductsTotal, setScopeProductsTotal] = useState<number>(0);
  const [isLoadingScopeProducts, setIsLoadingScopeProducts] = useState<boolean>(false);

  useEffect(() => {
    if (targetType === 'PRODUCTS') {
      setScopeProducts([]);
      setScopeProductsTotal(0);
      setIsLoadingScopeProducts(false);
      return;
    }

    const activeBrands = targetType === 'BRAND' ? selectedBrands : [];
    const activeGroups = targetType === 'PRODUCT_GROUP' ? selectedProductGroups : [];
    const activeFamilies = targetType === 'FAMILY' ? selectedFamilies : [];
    const activeCategories = targetType === 'CATEGORY' ? selectedCategories : [];

    const hasActiveFacet =
      targetType === 'ALL_CATALOG' ||
      activeBrands.length > 0 ||
      activeGroups.length > 0 ||
      activeFamilies.length > 0 ||
      activeCategories.length > 0;

    if (!hasActiveFacet) {
      setScopeProducts([]);
      setScopeProductsTotal(0);
      setIsLoadingScopeProducts(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingScopeProducts(true);
      try {
        const res = await searchAgentCatalogProducts({
          catalogSource: 'ALL',
          query: '',
          warehouse: 'ALL_WAREHOUSES',
          includeZeroStock: true,
          brands: activeBrands,
          productGroups: activeGroups,
          families: activeFamilies,
          categories: activeCategories,
          sortBy: 'SKU_ASC',
          limit: 200,
        });
        if (!cancelled && res.success) {
          setScopeProducts(res.products);
          setScopeProductsTotal(res.totalFound || res.products.length);
        }
      } catch (e) {
        console.error('Errore caricamento prodotti ambito sconto:', e);
      } finally {
        if (!cancelled) setIsLoadingScopeProducts(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    targetType,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
  ]);

  const sidebarProductsList = useMemo<DiscountTargetProductMeta[]>(() => {
    if (targetType === 'PRODUCTS') {
      return selectedProducts;
    }
    return scopeProducts.map(p => ({
      sku: p.sku,
      title: p.originalName || p.title,
      brand: p.brandLabel || p.brand,
      imageUrl: p.imageUrl,
      listPrice: p.listPrice,
    }));
  }, [targetType, selectedProducts, scopeProducts]);

  const sidebarProductsTotalCount =
    targetType === 'PRODUCTS'
      ? selectedProducts.length
      : scopeProductsTotal || scopeProducts.length;

  const filteredClientsForDropdown = useMemo(() => {
    const q = clientSearchText.trim().toLowerCase();
    return clients.filter(c => {
      if (dropdownClientCatFilter !== 'ALL') {
        const catInfo = getClientCategoryInfo(c);
        if (catInfo.code !== dropdownClientCatFilter) return false;
      }
      if (!q) return true;
      const catInfo = getClientCategoryInfo(c);
      return (
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.zucchettiCode || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        catInfo.fullLabel.toLowerCase().includes(q)
      );
    });
  }, [clients, clientSearchText, dropdownClientCatFilter]);

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleClientCategorySelection = (catCode: string) => {
    const upper = catCode.toUpperCase();
    setSelectedClientCategories(prev =>
      prev.includes(upper) ? prev.filter(c => c !== upper) : [...prev, upper]
    );
  };

  const addProductToRule = (p: CatalogProductItem) => {
    const cleanSku = p.sku.trim().toUpperCase();
    setSelectedProducts(prev => {
      if (prev.some(item => item.sku.toUpperCase() === cleanSku)) {
        return prev.filter(item => item.sku.toUpperCase() !== cleanSku);
      }
      return [
        ...prev,
        {
          sku: cleanSku,
          title: p.originalName || p.title,
          brand: p.brandLabel || p.brand,
          imageUrl: p.imageUrl,
          listPrice: p.listPrice,
        },
      ];
    });
    setProductQuery('');
    setPredictiveResults([]);
    setIsPredictiveOpen(false);
    productSearchInputRef.current?.focus();
  };

  const removeProductFromRule = (sku: string) => {
    const cleanSku = sku.trim().toUpperCase();
    setSelectedProducts(prev => prev.filter(p => p.sku.toUpperCase() !== cleanSku));
  };

  const resetForm = () => {
    setEditingRuleId(null);
    setRuleName('');
    setClientScope('SELECTED_CLIENTS');
    setSelectedClientIds([]);
    setSelectedClientCategories([]);
    setClientSearchText('');
    setDropdownClientCatFilter('ALL');
    setTargetType('PRODUCTS');
    setSelectedProducts([]);
    setSelectedBrands([]);
    setSelectedProductGroups([]);
    setSelectedFamilies([]);
    setSelectedCategories([]);
    setCalculationMode('EXTRA_CASCADE');
    setDiscountValue(10);
    setFormError('');
  };

  const handleEditRule = (rule: AgentDiscountRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    if (rule.clientScope === 'ALL_CLIENTS') {
      setClientScope('ALL_CLIENTS');
      setSelectedClientIds([]);
      setSelectedClientCategories([]);
      setClientSearchText('');
    } else if (rule.clientScope === 'CLIENT_CATEGORY') {
      setClientScope('CLIENT_CATEGORY');
      setSelectedClientCategories(
        (rule.clientCategories || []).map(c => normalizeClientCategoryCode(c)).filter(Boolean)
      );
      setSelectedClientIds([]);
      setClientSearchText('');
    } else {
      setClientScope('SELECTED_CLIENTS');
      setSelectedClientCategories([]);
      const ruleIds = new Set(rule.clientIds || (rule.clientId ? [rule.clientId] : []));
      const ruleCodes = new Set(
        (rule.clientCodes || (rule.clientCode ? [rule.clientCode] : [])).map(c =>
          c.toUpperCase()
        )
      );
      const matchedIds = clients
        .filter(
          c =>
            ruleIds.has(c.id) ||
            (c.zucchettiCode && ruleCodes.has(c.zucchettiCode.toUpperCase()))
        )
        .map(c => c.id);
      setSelectedClientIds(matchedIds);
      setClientSearchText('');
    }

    setTargetType(rule.targetType);
    setSelectedProducts(
      rule.targetProductsMeta && rule.targetProductsMeta.length > 0
        ? rule.targetProductsMeta
        : rule.targetSkus.map(sku => ({ sku, title: `Articolo ${sku}` }))
    );
    setSelectedBrands(rule.targetBrands || []);
    setSelectedProductGroups(rule.targetProductGroups || []);
    setSelectedFamilies(rule.targetFamilies || []);
    setSelectedCategories(rule.targetCategories || []);
    setCalculationMode(rule.calculationMode);
    setDiscountValue(rule.discountValue);
    setFormError('');
    setFormSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSaving(true);

    try {
      const targetSkus = selectedProducts.map(p => p.sku.trim().toUpperCase());
      const clientsMeta: DiscountTargetClientMeta[] = selectedClientsObjects.map(c => {
        const catInfo = getClientCategoryInfo(c);
        return {
          id: c.id,
          code: c.zucchettiCode,
          name: c.companyName,
          baseDiscount: Number(c.discount || 0),
          categoryCode: catInfo.code,
          categoryLabel: catInfo.shortLabel,
        };
      });

      const resolvedScope: DiscountClientScope =
        clientScope === 'ALL_CLIENTS'
          ? 'ALL_CLIENTS'
          : clientScope === 'CLIENT_CATEGORY'
            ? 'CLIENT_CATEGORY'
            : selectedClientsObjects.length > 1
              ? 'SELECTED_CLIENTS'
              : 'SINGLE_CLIENT';

      const isSpecificClients =
        resolvedScope === 'SINGLE_CLIENT' || resolvedScope === 'SELECTED_CLIENTS';

      const res = await saveAgentDiscountRuleAction({
        id: editingRuleId || undefined,
        name: ruleName,
        clientScope: resolvedScope,
        clientId:
          isSpecificClients && selectedClientsObjects[0]
            ? selectedClientsObjects[0].id
            : null,
        clientCode:
          isSpecificClients && selectedClientsObjects[0]
            ? selectedClientsObjects[0].zucchettiCode
            : null,
        clientName:
          isSpecificClients && selectedClientsObjects[0]
            ? selectedClientsObjects[0].companyName
            : null,
        clientIds: isSpecificClients ? selectedClientsObjects.map(c => c.id) : [],
        clientCodes: isSpecificClients
          ? selectedClientsObjects.map(c => c.zucchettiCode)
          : [],
        clientsMeta: isSpecificClients ? clientsMeta : [],
        clientCategories:
          resolvedScope === 'CLIENT_CATEGORY' ? selectedClientCategories : [],
        targetType,
        targetSkus,
        targetProductsMeta: selectedProducts,
        targetBrands: selectedBrands,
        targetProductGroups: selectedProductGroups,
        targetFamilies: selectedFamilies,
        targetCategories: selectedCategories,
        calculationMode,
        discountValue,
        isActive: true,
      });

      if (!res.success) {
        setFormError(res.error || 'Errore durante il salvataggio della regola.');
      } else {
        if (res.rules) setRules(res.rules);
        setFormSuccess(
          editingRuleId
            ? 'Regola di sconto aggiornata con successo!'
            : 'Nuova regola di sconto salvata e attivata!'
        );
        resetForm();
      }
    } catch (err: any) {
      setFormError(err.message || 'Errore imprevisto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRule = async (rule: AgentDiscountRule) => {
    const res = await toggleAgentDiscountRuleAction(rule.id, !rule.isActive);
    if (res.success && res.rules) {
      setRules(res.rules);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const res = await deleteAgentDiscountRuleAction(ruleId);
    if (res.success && res.rules) {
      setRules(res.rules);
      if (editingRuleId === ruleId) {
        resetForm();
      }
    }
  };

  // Simulazione prezzo in tempo reale nel pannello di creazione
  const simulationPreview = useMemo(() => {
    let sampleBaseDiscount = 40;
    let sampleClientName = 'Cliente tipo';

    if (clientScope === 'CLIENT_CATEGORY' && selectedClientCategories.length > 0) {
      const firstCat = enrichedClientCategories.find(
        c => c.code === selectedClientCategories[0]
      );
      if (firstCat) {
        sampleBaseDiscount = Number(firstCat.discount || 0);
        sampleClientName = firstCat.name;
      }
    } else if (
      clientScope !== 'ALL_CLIENTS' &&
      clientScope !== 'CLIENT_CATEGORY' &&
      selectedClientsObjects.length > 0
    ) {
      sampleBaseDiscount = Number(selectedClientsObjects[0].discount || 0);
      sampleClientName = selectedClientsObjects[0].companyName;
    }

    const sampleListPrice =
      targetType === 'PRODUCTS' &&
      selectedProducts.length > 0 &&
      selectedProducts[0].listPrice
        ? Number(selectedProducts[0].listPrice)
        : 100;
    const baseNetPrice = sampleListPrice * (1 - sampleBaseDiscount / 100);
    const val = Math.max(0, Math.min(95, Number(discountValue || 0)));

    if (calculationMode === 'FIXED_OVERRIDE') {
      const finalNet = sampleListPrice * (1 - val / 100);
      return {
        sampleClientName,
        sampleListPrice,
        sampleBaseDiscount,
        baseNetPrice,
        finalNet,
        effectivePct: val,
        formulaText: `Sconto Fisso Sostitutivo ${val}% (sostituisce lo sconto base ${sampleBaseDiscount}%)`,
      };
    } else {
      const finalNet = baseNetPrice * (1 - val / 100);
      const effectivePct =
        sampleListPrice > 0
          ? Number(((1 - finalNet / sampleListPrice) * 100).toFixed(2))
          : 0;
      return {
        sampleClientName,
        sampleListPrice,
        sampleBaseDiscount,
        baseNetPrice,
        finalNet,
        effectivePct,
        formulaText: `Sconto Base Fisso ${sampleBaseDiscount}% + Extra ${val}% a cascata (${effectivePct}% effettivo)`,
      };
    }
  }, [
    clientScope,
    selectedClientsObjects,
    selectedClientCategories,
    enrichedClientCategories,
    targetType,
    selectedProducts,
    calculationMode,
    discountValue,
  ]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (filterClientScope === 'ALL_CLIENTS' && r.clientScope !== 'ALL_CLIENTS') {
        return false;
      }
      if (filterClientScope.startsWith('CAT:')) {
        const catCode = filterClientScope.replace('CAT:', '');
        if (r.clientScope !== 'CLIENT_CATEGORY') return false;
        if (!(r.clientCategories || []).includes(catCode)) return false;
      } else if (filterClientScope !== 'ALL' && filterClientScope !== 'ALL_CLIENTS') {
        const targetClient = clients.find(c => c.id === filterClientScope);
        const catInfo = targetClient ? getClientCategoryInfo(targetClient) : null;
        if (
          r.clientScope === 'ALL_CLIENTS' ||
          !doesRuleMatchClient(r, {
            clientId: filterClientScope,
            clientCode: targetClient?.zucchettiCode || filterClientScope,
            clientCategory: catInfo?.code || targetClient?.customerType || '',
            baseDiscount: targetClient?.discount ?? null,
          })
        ) {
          return false;
        }
      }
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const hay = [
          r.name,
          r.clientName || '',
          r.clientCode || '',
          ...(r.clientCodes || []),
          ...(r.clientsMeta || []).map(cm => `${cm.name} ${cm.code} ${cm.categoryLabel || ''}`),
          ...(r.clientCategories || []),
          ...r.targetSkus,
          ...r.targetBrands,
          ...r.targetProductGroups,
          ...r.targetFamilies,
          ...r.targetCategories,
          r.targetType === 'ALL_CATALOG' ? 'tutto il catalogo' : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rules, clients, filterClientScope, filterSearch]);

  const formatFacetLabel = (code: string, list: CatalogFacetOption[]) => {
    const found = list.find(o => o.code.toUpperCase() === code.toUpperCase());
    return found ? found.label : code;
  };

  const formatClientCategoryBadge = (catCode: string) => {
    const upper = normalizeClientCategoryCode(catCode);
    const found = enrichedClientCategories.find(c => c.code === upper);
    if (found) {
      return `${found.name} (Sconto Base Fisso: ${found.discount}%)`;
    }
    if (upper === 'RIV') return 'RIV - Rivenditore (Sconto Base Fisso: 50%)';
    if (upper === 'IST') return 'IST - Installatore / Impiantista (Sconto Base Fisso: 40%)';
    if (upper === 'GEN') return 'GEN - Generale (Sconto Base Fisso: 25%)';
    return upper;
  };

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          body > main {
            max-width: 1620px !important;
            padding-right: 286px !important;
          }
        }
      `}</style>
      <div className="space-y-6 pb-12">
      {/* INTESTAZIONE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-brand-main text-black rounded">
                Gestione Sconti B2B
              </span>
              {agentCode && (
                <span className="text-xs text-gray-500 font-mono">
                  Agente: {agentName} ({agentCode})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              Gestione Sconti Prodotti, Marchi, Categorie e Catalogo
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Ogni cliente mantiene il suo <strong>Sconto Base fisso non modificabile</strong>. Qui puoi abbinare sconti dedicati su{' '}
              <strong>tutto il catalogo</strong>, <strong>singoli prodotti (o selezioni di prodotti)</strong>,{' '}
              <strong>marchi</strong>, <strong>gruppi</strong>, <strong>famiglie</strong> o <strong>categorie</strong> per{' '}
              <strong>uno o più clienti scelti</strong>, per <strong>Categoria Cliente (Rivenditore, Installatore / Impiantista, ecc.)</strong> oppure per{' '}
              <strong>tutti i tuoi clienti</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/account/catalog-builder"
              className="px-4 py-2.5 text-xs font-extrabold rounded-lg bg-black hover:bg-gray-800 text-white shadow-sm transition-colors flex items-center gap-2"
            >
              <span>📖 Vai a Sviluppa Catalogo PDF</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FORM CREAZIONE / MODIFICA REGOLA DI SCONTO */}
      <form
        onSubmit={handleSaveRule}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <span>{editingRuleId ? '✏️ Modifica Regola di Sconto' : '➕ Nuova Regola di Sconto'}</span>
            </h2>
            <p className="text-xs text-gray-300 mt-0.5">
              Le regole attive vengono applicate automaticamente sia nello Sviluppo Catalogo PDF sia nel listino B2B dei clienti selezionati.
            </p>
          </div>
          {editingRuleId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              Annulla modifica
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              ✅ {formSuccess}
            </div>
          )}

          {/* STEP 1: DESTINATARIO (CLIENTI SCELTI, CATEGORIA CLIENTE: RIVENDITORE/IMPIANTISTA/ECC., OPPURE TUTTI I CLIENTI) */}
          <div className="space-y-4">
            <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
              1. A quali clienti vuoi applicare lo sconto?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setClientScope('SELECTED_CLIENTS')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  clientScope === 'SELECTED_CLIENTS' || clientScope === 'SINGLE_CLIENT'
                    ? 'border-brand-main bg-amber-50/70 ring-2 ring-brand-main/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-900">
                    👤 Uno o più Clienti Scelti
                  </span>
                  {selectedClientsObjects.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-black bg-brand-main text-black rounded-full">
                      {selectedClientsObjects.length}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Seleziona 1 cliente singolo oppure più clienti specifici
                </div>
              </button>

              <button
                type="button"
                onClick={() => setClientScope('CLIENT_CATEGORY')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  clientScope === 'CLIENT_CATEGORY'
                    ? 'border-brand-main bg-amber-50/70 ring-2 ring-brand-main/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-900">
                    🏢 Per Categoria Cliente
                  </span>
                  {selectedClientCategories.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-black bg-brand-main text-black rounded-full">
                      {selectedClientCategories.length}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Rivenditore (RIV), Installatore / Impiantista (IST), Generale (GEN)...
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClientScope('ALL_CLIENTS');
                  setSelectedClientIds([]);
                  setSelectedClientCategories([]);
                  setClientSearchText('');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  clientScope === 'ALL_CLIENTS'
                    ? 'border-brand-main bg-amber-50/70 ring-2 ring-brand-main/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-extrabold text-gray-900">
                  👥 Tutti i miei Clienti
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Valido per l&apos;intero tuo portafoglio ({clients.length} clienti)
                </div>
              </button>
            </div>

            {/* CONTENUTO DESTINATARIO: UNO O PIÙ CLIENTI SCELTI */}
            {(clientScope === 'SELECTED_CLIENTS' || clientScope === 'SINGLE_CLIENT') && (
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200">
                <div className="relative" ref={clientDropdownRef}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                      Cerca e seleziona uno o più Clienti B2B ({selectedClientsObjects.length} selezionat{selectedClientsObjects.length === 1 ? 'o' : 'i'})
                    </label>

                    {/* Pill filtro rapido per Categoria Cliente */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-gray-500 font-semibold mr-1">
                        Filtra per categoria:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownClientCatFilter('ALL');
                          setIsClientDropdownOpen(true);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                          dropdownClientCatFilter === 'ALL'
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        Tutti ({clients.length})
                      </button>
                      {enrichedClientCategories.map(cat => (
                        <button
                          key={cat.code}
                          type="button"
                          onClick={() => {
                            setDropdownClientCatFilter(cat.code);
                            setIsClientDropdownOpen(true);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            dropdownClientCatFilter === cat.code
                              ? 'bg-brand-main text-black border-brand-main'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50'
                          }`}
                        >
                          {cat.name} ({cat.clientsCount})
                        </button>
                      ))}
                      {selectedClientsObjects.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedClientIds([])}
                          className="ml-2 text-xs font-bold text-red-600 hover:underline"
                        >
                          Svuota ({selectedClientsObjects.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      ref={clientSearchInputRef}
                      type="text"
                      value={clientSearchText}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onChange={e => {
                        setClientSearchText(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      placeholder="Digita ragione sociale, codice cliente, categoria (es. Rivenditore, Installatore) o città..."
                      className="w-full px-3.5 py-2.5 pr-28 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-main"
                    />
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(prev => !prev)}
                      className="absolute right-2 px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                    >
                      {isClientDropdownOpen ? 'Chiudi ▲' : 'Sfoglia ▼'}
                    </button>
                  </div>

                  {isClientDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 overflow-hidden">
                      <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-semibold">
                          Clicca sui clienti per selezionarli o deselezionarli ({filteredClientsForDropdown.length} trovati)
                        </span>
                        <div className="flex items-center gap-3">
                          {filteredClientsForDropdown.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const idsToAdd = filteredClientsForDropdown.map(c => c.id);
                                setSelectedClientIds(prev =>
                                  Array.from(new Set([...prev, ...idsToAdd]))
                                );
                              }}
                              className="font-bold text-brand-main hover:underline"
                            >
                              + Seleziona tutti i {filteredClientsForDropdown.length} filtrati
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsClientDropdownOpen(false)}
                            className="font-bold text-gray-500 hover:text-gray-800"
                          >
                            Chiudi ✕
                          </button>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                        {filteredClientsForDropdown.length === 0 ? (
                          <div className="p-4 text-xs text-gray-400 text-center">
                            Nessun cliente trovato
                          </div>
                        ) : (
                          filteredClientsForDropdown.map(c => {
                            const isSelected = selectedClientIds.includes(c.id);
                            const catInfo = getClientCategoryInfo(c);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleClientSelection(c.id)}
                                className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-50/90 hover:bg-emerald-100/80'
                                    : 'hover:bg-amber-50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    readOnly
                                    checked={isSelected}
                                    className="rounded border-gray-300 text-brand-main focus:ring-brand-main pointer-events-none"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-gray-900 truncate">
                                        {c.companyName}
                                      </span>
                                      {catInfo.code && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                          🏢 {catInfo.fullLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-500 font-mono">
                                      Cod. {c.zucchettiCode} {c.city ? `• ${c.city}` : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 text-[11px] font-extrabold bg-gray-100 text-gray-800 rounded">
                                    🔒 Sconto Base: {c.discount || 0}%
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-brand-main text-black'
                                    }`}
                                  >
                                    {isSelected ? '✓ Scelto' : '+ Aggiungi'}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTENUTO DESTINATARIO: PER CATEGORIA CLIENTE (RIVENDITORE, INSTALLATORE / IMPIANTISTA, GENERALE, ECC.) */}
            {clientScope === 'CLIENT_CATEGORY' && (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      🏢 Seleziona una o più Categorie Clienti
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      Lo sconto verrà applicato automaticamente a tutti i tuoi clienti appartenenti alla categoria scelta (mantenendo fisso il rispettivo Sconto Base di categoria).
                    </p>
                  </div>
                  {selectedClientCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedClientCategories([])}
                      className="text-xs font-bold text-red-600 hover:underline shrink-0"
                    >
                      Deseleziona tutte
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {enrichedClientCategories.map(cat => {
                    const checked = selectedClientCategories.includes(cat.code);
                    return (
                      <button
                        key={cat.code}
                        type="button"
                        onClick={() => toggleClientCategorySelection(cat.code)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                          checked
                            ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/30 shadow-sm'
                            : 'border-gray-200 bg-white/80 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              readOnly
                              checked={checked}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                            />
                            <span className="text-xs font-extrabold text-gray-900">
                              {cat.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-900 rounded-full shrink-0">
                            {cat.clientsCount} client{cat.clientsCount === 1 ? 'e' : 'i'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                          <span className="text-gray-500 font-medium">
                            🔒 Sconto Base Fisso:
                          </span>
                          <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {cat.discount}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONTENUTO DESTINATARIO: TUTTI I CLIENTI */}
            {clientScope === 'ALL_CLIENTS' && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950">
                <div className="font-extrabold">
                  👥 Regola valida per tutti i tuoi clienti ({clients.length} clienti in anagrafica)
                </div>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Ogni cliente manterrà il proprio <strong>Sconto Base fisso individuale</strong> (es. Rivenditore 50%, Installatore 40%, Generale 25%) come punto di partenza, a cui si applicherà questa regola.
                </p>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* STEP 2: AMBITO PRODOTTI (TUTTO IL CATALOGO, PRODOTTI SCELTI, MARCHIO, GRUPPO, FAMIGLIA, CATEGORIA) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                2. Su quali articoli vuoi applicare lo sconto?
              </label>

              {/* Riepilogo filtri attivi nella regola */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {targetType === 'ALL_CATALOG' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold">
                    🌐 Tutto il Catalogo
                  </span>
                ) : (
                  <>
                    {selectedProducts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        {selectedProducts.length} Prodott{selectedProducts.length === 1 ? 'o' : 'i'}
                      </span>
                    )}
                    {selectedBrands.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                        {selectedBrands.length} March{selectedBrands.length === 1 ? 'io' : 'i'}
                      </span>
                    )}
                    {selectedProductGroups.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                        {selectedProductGroups.length} Grupp{selectedProductGroups.length === 1 ? 'o' : 'i'}
                      </span>
                    )}
                    {selectedFamilies.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold">
                        {selectedFamilies.length} Famigli{selectedFamilies.length === 1 ? 'a' : 'e'}
                      </span>
                    )}
                    {selectedCategories.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                        {selectedCategories.length} Categori{selectedCategories.length === 1 ? 'a' : 'e'}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* TABS DI SELEZIONE AMBITO (INCLUSO TUTTO IL CATALOGO) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                {
                  id: 'ALL_CATALOG' as DiscountTargetType,
                  title: '🌐 Tutto il Catalogo',
                  sub: 'Intero listino prodotti',
                  count: targetType === 'ALL_CATALOG' ? 1 : 0,
                },
                {
                  id: 'PRODUCTS' as DiscountTargetType,
                  title: '🎯 Singolo / Più Prodotti',
                  sub: 'Ricerca predittiva SKU',
                  count: selectedProducts.length,
                },
                {
                  id: 'BRAND' as DiscountTargetType,
                  title: '🏷️ Per Marchio',
                  sub: `${facets.brands.length} marchi`,
                  count: selectedBrands.length,
                },
                {
                  id: 'PRODUCT_GROUP' as DiscountTargetType,
                  title: '📦 Gruppo Merceol.',
                  sub: `${facets.productGroups.length} gruppi (L1)`,
                  count: selectedProductGroups.length,
                },
                {
                  id: 'FAMILY' as DiscountTargetType,
                  title: '📂 Per Famiglia',
                  sub: `${facets.families.length} famiglie (L2)`,
                  count: selectedFamilies.length,
                },
                {
                  id: 'CATEGORY' as DiscountTargetType,
                  title: '📑 Per Categoria',
                  sub: `${facets.categories.length} categorie (L3)`,
                  count: selectedCategories.length,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTargetType(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    targetType === tab.id
                      ? 'border-brand-main bg-amber-50/80 ring-2 ring-brand-main/30'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-gray-900">
                      {tab.title}
                    </span>
                    {tab.count > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-black bg-brand-main text-black rounded-full">
                        {tab.id === 'ALL_CATALOG' ? '✓' : tab.count}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{tab.sub}</div>
                </button>
              ))}
            </div>

            {/* CONTENUTO TAB: TUTTO IL CATALOGO */}
            {targetType === 'ALL_CATALOG' && (
              <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                    <span>🌐 Sconto applicato a TUTTO IL CATALOGO</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Questa regola verrà applicata automaticamente su <strong>tutti gli articoli del catalogo</strong>. Se imposti anche regole più specifiche (es. su un singolo prodotto o un marchio), quelle più specifiche avranno sempre priorità.
                  </p>
                </div>
              </div>
            )}

            {/* CONTENUTO TAB: SINGOLO PRODOTTO O SELEZIONE DI PRODOTTI */}
            {targetType === 'PRODUCTS' && (
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-4">
                <div ref={predictiveRef} className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cerca e clicca i prodotti da includere nello sconto (es. scrivi <code className="bg-white px-1 py-0.5 rounded border">e45</code> e clicca, poi <code className="bg-white px-1 py-0.5 rounded border">il34</code> e clicca...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      ref={productSearchInputRef}
                      type="text"
                      value={productQuery}
                      onFocus={() => {
                        if (productQuery.trim().length > 0) setIsPredictiveOpen(true);
                      }}
                      onChange={e => {
                        setProductQuery(e.target.value);
                        setIsPredictiveOpen(true);
                      }}
                      placeholder="Digita codice articolo (SKU) o descrizione per aggiungere un prodotto..."
                      className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-brand-main"
                    />
                    {isPredictiveLoading && (
                      <span className="absolute right-3 text-xs text-gray-400 font-bold">
                        Ricerca...
                      </span>
                    )}
                  </div>

                  {/* TENDINA PREDITTIVA */}
                  {isPredictiveOpen && productQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {predictiveResults.length === 0 && !isPredictiveLoading ? (
                        <div className="p-4 text-center text-xs text-gray-500">
                          Nessun prodotto trovato per &ldquo;{productQuery}&rdquo;
                        </div>
                      ) : (
                        predictiveResults.map(p => {
                          const isSelected = selectedProducts.some(
                            sp => sp.sku.toUpperCase() === p.sku.toUpperCase()
                          );
                          return (
                            <button
                              key={p.sku}
                              type="button"
                              onClick={() => addProductToRule(p)}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                                isSelected ? 'bg-emerald-50' : 'hover:bg-amber-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                                  {p.imageUrl ? (
                                    <img
                                      src={p.imageUrl}
                                      alt={p.sku}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[9px] text-gray-300 font-mono">
                                      NO IMG
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-extrabold text-gray-900">
                                      {p.sku}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                      {p.brandLabel || p.brand}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {p.originalName || p.title}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-extrabold text-gray-800">
                                  € {p.listPrice.toFixed(2)}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-brand-main text-black'
                                  }`}
                                >
                                  {isSelected ? '✓ Scelto' : '+ Seleziona'}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {targetType === 'BRAND' && (
              <MultiSelectPicker
                label="Seleziona uno o più Marchi"
                placeholder="Cerca marchio..."
                options={facets.brands}
                selectedValues={selectedBrands}
                onChange={setSelectedBrands}
              />
            )}

            {targetType === 'PRODUCT_GROUP' && (
              <MultiSelectPicker
                label="Seleziona uno o più Gruppi Merceologici (Livello 1)"
                placeholder="Cerca gruppo merceologico..."
                options={facets.productGroups}
                selectedValues={selectedProductGroups}
                onChange={setSelectedProductGroups}
              />
            )}

            {targetType === 'FAMILY' && (
              <MultiSelectPicker
                label="Seleziona una o più Famiglie (Livello 2)"
                placeholder="Cerca famiglia..."
                options={facets.families}
                selectedValues={selectedFamilies}
                onChange={setSelectedFamilies}
              />
            )}

            {targetType === 'CATEGORY' && (
              <MultiSelectPicker
                label="Seleziona una o più Categorie (Livello 3)"
                placeholder="Cerca categoria..."
                options={facets.categories}
                selectedValues={selectedCategories}
                onChange={setSelectedCategories}
              />
            )}
          </div>

          <hr className="border-gray-100" />

          {/* STEP 3: MODALITÀ DI CALCOLO, PERCENTUALE E ANTEPRIMA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 space-y-2">
              <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                3. Come deve agire questo sconto rispetto allo Sconto Base?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCalculationMode('EXTRA_CASCADE')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    calculationMode === 'EXTRA_CASCADE'
                      ? 'border-brand-main bg-amber-50/70 ring-2 ring-brand-main/30'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-extrabold text-gray-900">
                    ➕ Extra Sconto a Cascata
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Si aggiunge oltre allo Sconto Base fisso del cliente (es. Base 40% + 10%)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCalculationMode('FIXED_OVERRIDE')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    calculationMode === 'FIXED_OVERRIDE'
                      ? 'border-brand-main bg-amber-50/70 ring-2 ring-brand-main/30'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-extrabold text-gray-900">
                    🎯 Sconto Fisso Sostitutivo
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Imposta una % fissa sugli articoli scelti (es. 55% fisso)
                  </div>
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-2">
              <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                {calculationMode === 'EXTRA_CASCADE'
                  ? 'Extra Sconto (%)'
                  : 'Sconto Fisso (%)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.5}
                  max={95}
                  step={0.5}
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value || 0))}
                  className="w-full px-4 py-2.5 text-lg font-black border-2 border-gray-300 rounded-xl focus:outline-none focus:border-brand-main"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-500">
                  %
                </span>
              </div>
              <input
                type="text"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="Nota / Nome regola (opzionale)"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-main"
              />
            </div>

            {/* BOX SIMULAZIONE CALCOLO IN TEMPO REALE */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-gray-900 text-white space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Simulazione Prezzo ({simulationPreview.sampleClientName})
              </div>
              <div className="text-xs text-gray-300">
                {simulationPreview.formulaText}
              </div>
              <div className="pt-1 border-t border-gray-800 flex items-baseline justify-between">
                <div className="text-[11px] text-gray-400">
                  Listino: <span className="line-through">€ {simulationPreview.sampleListPrice.toFixed(2)}</span>
                  <span className="ml-2">
                    (Solo Base: € {simulationPreview.baseNetPrice.toFixed(2)})
                  </span>
                </div>
                <div className="text-base font-black text-emerald-400">
                  Netto: € {simulationPreview.finalNet.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            {editingRuleId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 text-xs font-black uppercase tracking-wider rounded-xl bg-brand-main hover:bg-amber-400 text-black shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving
                ? 'Salvataggio in corso...'
                : editingRuleId
                  ? '💾 Aggiorna Regola di Sconto'
                  : '✅ Salva e Attiva Regola di Sconto'}
            </button>
          </div>
        </div>
      </form>

      {/* ELENCO REGOLE CONFIGURATE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              Regole di Sconto Configurate ({filteredRules.length})
            </h2>
            <p className="text-xs text-gray-500">
              Ordine di priorità automatico: <strong>Clienti Scelti</strong> &gt; <strong>Categoria Cliente</strong> &gt; Tutti i Clienti •{' '}
              <strong>Prodotto Singolo</strong> &gt; Categoria &gt; Famiglia &gt; Gruppo &gt; Marchio &gt; Tutto il Catalogo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterClientScope}
              onChange={e => setFilterClientScope(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg bg-white"
            >
              <option value="ALL">Tutti i destinatari ({rules.length})</option>
              <option value="ALL_CLIENTS">👥 Solo regole &ldquo;Tutti i clienti&rdquo;</option>
              <optgroup label="🏢 Per Categoria Cliente">
                {enrichedClientCategories.map(cat => (
                  <option key={cat.code} value={`CAT:${cat.code}`}>
                    🏢 {cat.name} (Base {cat.discount}%)
                  </option>
                ))}
              </optgroup>
              <optgroup label="👤 Per Singolo Cliente">
                {clients.map(c => {
                  const catInfo = getClientCategoryInfo(c);
                  return (
                    <option key={c.id} value={c.id}>
                      👤 {c.companyName} ({catInfo.code || 'Base'} {c.discount || 0}%)
                    </option>
                  );
                })}
              </optgroup>
            </select>

            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Cerca SKU, marchio, cliente, categoria..."
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="text-sm font-bold text-gray-700">
              Nessuna regola di sconto presente.
            </div>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Usa il modulo qui sopra per aggiungere uno sconto su tutto il catalogo, singoli prodotti, marchi o categorie per uno o più clienti, per Categoria Cliente (Rivenditore, Installatore / Impiantista, ecc.) o per tutti i tuoi clienti.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRules.map(rule => {
              // Risolvi la lista dei clienti associati alla regola
              const ruleClientIds = new Set(
                rule.clientIds?.length ? rule.clientIds : rule.clientId ? [rule.clientId] : []
              );
              const ruleClientCodes = new Set(
                (rule.clientCodes?.length
                  ? rule.clientCodes
                  : rule.clientCode
                    ? [rule.clientCode]
                    : []
                ).map(c => c.toUpperCase())
              );

              const matchedClients =
                rule.clientScope === 'SINGLE_CLIENT' ||
                rule.clientScope === 'SELECTED_CLIENTS'
                  ? clients.filter(
                      c =>
                        ruleClientIds.has(c.id) ||
                        (c.zucchettiCode &&
                          ruleClientCodes.has(c.zucchettiCode.toUpperCase()))
                    )
                  : [];

              return (
                <div
                  key={rule.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    rule.isActive ? 'bg-white hover:bg-gray-50/60' : 'bg-gray-50 opacity-65'
                  }`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {rule.clientScope === 'ALL_CLIENTS' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-blue-100 text-blue-900">
                          👥 Tutti i miei Clienti
                        </span>
                      ) : rule.clientScope === 'CLIENT_CATEGORY' ? (
                        (rule.clientCategories || []).map(catCode => (
                          <span
                            key={catCode}
                            className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200"
                          >
                            🏢 Categoria: {formatClientCategoryBadge(catCode)}
                          </span>
                        ))
                      ) : matchedClients.length > 0 ? (
                        matchedClients.map(mc => {
                          const catInfo = getClientCategoryInfo(mc);
                          return (
                            <span
                              key={mc.id}
                              className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-purple-100 text-purple-900"
                            >
                              👤 {mc.companyName}{' '}
                              {catInfo.code ? `[${catInfo.shortLabel}] ` : ''}(Base Fisso:{' '}
                              {mc.discount || 0}%)
                            </span>
                          );
                        })
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-purple-100 text-purple-900">
                          👤 {rule.clientName || rule.clientCode || 'Clienti selezionati'}
                        </span>
                      )}

                      {rule.calculationMode === 'EXTRA_CASCADE' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-900">
                          ➕ +{rule.discountValue}% Extra a cascata (oltre Sconto Base)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-amber-200 text-amber-950">
                          🎯 {rule.discountValue}% Sconto Fisso Sostitutivo
                        </span>
                      )}

                      <span className="text-xs font-bold text-gray-800">{rule.name}</span>
                    </div>

                    {/* Dettaglio target */}
                    <div className="flex flex-wrap gap-1.5">
                      {rule.targetType === 'ALL_CATALOG' && (
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded bg-emerald-600 text-white">
                          🌐 TUTTO IL CATALOGO
                        </span>
                      )}
                      {rule.targetSkus.map(sku => {
                        const meta = rule.targetProductsMeta?.find(
                          m => m.sku.toUpperCase() === sku.toUpperCase()
                        );
                        return (
                          <span
                            key={sku}
                            className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-gray-100 text-gray-800 border border-gray-200"
                            title={meta?.title || sku}
                          >
                            🎯 {sku}
                            {meta?.title ? ` - ${meta.title.slice(0, 32)}` : ''}
                          </span>
                        );
                      })}
                      {rule.targetBrands.map(b => (
                        <span
                          key={b}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-50 text-blue-900 border border-blue-200"
                        >
                          🏷️ Marchio: {formatFacetLabel(b, facets.brands)}
                        </span>
                      ))}
                      {rule.targetProductGroups.map(g => (
                        <span
                          key={g}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-50 text-purple-900 border border-purple-200"
                        >
                          📦 Gruppo: {formatFacetLabel(g, facets.productGroups)}
                        </span>
                      ))}
                      {rule.targetFamilies.map(f => (
                        <span
                          key={f}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-50 text-indigo-900 border border-indigo-200"
                        >
                          📂 Famiglia: {formatFacetLabel(f, facets.families)}
                        </span>
                      ))}
                      {rule.targetCategories.map(c => (
                        <span
                          key={c}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 text-emerald-900 border border-emerald-200"
                        >
                          📑 Categoria: {formatFacetLabel(c, facets.categories)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Azioni regola */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-colors ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {rule.isActive ? '● Attiva' : '○ Disattivata'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditRule(rule)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Modifica
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* COLONNA DESTRA ANCORATA ALLA BARRA SUPERIORE E AL BORDO DESTRO DELLO SCHERMO (1/3 CLIENTI + 2/3 PRODOTTI, CORPO UNICO) */}
      <aside className="fixed top-[81px] right-0 bottom-0 z-40 w-[270px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        {/* SEZIONE SUPERIORE (1/3): CLIENTI A CUI STIAMO APPLICANDO LO SCONTO */}
        <div className="h-1/3 flex flex-col min-h-0">
          <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-extrabold text-gray-800">
              Clienti ({sidebarClients.length})
            </span>
            {(clientScope === 'SELECTED_CLIENTS' || clientScope === 'SINGLE_CLIENT') &&
            selectedClientsObjects.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedClientIds([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota tutto
              </button>
            ) : clientScope === 'CLIENT_CATEGORY' && selectedClientCategories.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedClientCategories([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota
              </button>
            ) : clientScope === 'ALL_CLIENTS' ? (
              <span className="text-[11px] font-semibold text-blue-600">Tutti</span>
            ) : (
              <span className="text-[11px] text-gray-400">0 scelti</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-gray-50/40">
            {sidebarClients.length === 0 ? (
              <div className="py-8 px-3 text-center space-y-1">
                <p className="text-xs font-semibold text-gray-500">
                  Nessun cliente inserito
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {clientScope === 'CLIENT_CATEGORY'
                    ? 'Seleziona una o più categorie clienti a sinistra.'
                    : 'Seleziona i clienti a cui applicare lo sconto.'}
                </p>
              </div>
            ) : (
              sidebarClients.map((client, idx) => {
                const catInfo = getClientCategoryInfo(client);
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-gray-900 truncate">
                          {client.companyName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span className="font-mono">{client.zucchettiCode}</span>
                          {catInfo.code && (
                            <span className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-800 font-bold text-[9px]">
                              {catInfo.code}
                            </span>
                          )}
                          <span className="font-extrabold text-emerald-700">
                            Base {client.discount || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {(clientScope === 'SELECTED_CLIENTS' ||
                      clientScope === 'SINGLE_CLIENT') && (
                      <button
                        type="button"
                        onClick={() => toggleClientSelection(client.id)}
                        title="Rimuovi cliente"
                        className="w-6 h-6 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center shrink-0 transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SEZIONE INFERIORE (2/3): PRODOTTI SU CUI STIAMO APPLICANDO LO SCONTO */}
        <div className="h-2/3 flex flex-col min-h-0 border-t border-gray-200">
          <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-extrabold text-gray-800">
              Prodotti ({sidebarProductsTotalCount})
            </span>
            {targetType === 'PRODUCTS' && selectedProducts.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedProducts([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota tutto
              </button>
            ) : targetType === 'BRAND' && selectedBrands.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota
              </button>
            ) : targetType === 'PRODUCT_GROUP' && selectedProductGroups.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedProductGroups([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota
              </button>
            ) : targetType === 'FAMILY' && selectedFamilies.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedFamilies([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota
              </button>
            ) : targetType === 'CATEGORY' && selectedCategories.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline"
              >
                Svuota
              </button>
            ) : targetType === 'ALL_CATALOG' ? (
              <span className="text-[11px] font-semibold text-emerald-700">
                Intero catalogo
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">0 articoli</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-gray-50/40">
            {isLoadingScopeProducts ? (
              <div className="py-12 px-4 text-center space-y-2.5">
                <div className="w-6 h-6 border-2 border-brand-main border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-gray-600">
                  Caricamento prodotti...
                </p>
              </div>
            ) : sidebarProductsList.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-1.5">
                <p className="text-xs font-semibold text-gray-500">
                  Nessun prodotto selezionato
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {targetType === 'PRODUCTS'
                    ? 'Aggiungi i prodotti dalla barra di ricerca.'
                    : 'Seleziona uno o più filtri per visualizzare i prodotti inclusi.'}
                </p>
              </div>
            ) : (
              sidebarProductsList.map((product, idx) => {
                const listPrice = Number(product.listPrice || 0);
                const val = Math.max(0, Math.min(95, Number(discountValue || 0)));
                const baseDisc = simulationPreview.sampleBaseDiscount;
                const netPrice =
                  listPrice > 0
                    ? calculationMode === 'FIXED_OVERRIDE'
                      ? listPrice * (1 - val / 100)
                      : listPrice * (1 - baseDisc / 100) * (1 - val / 100)
                    : 0;

                return (
                  <div
                    key={`${product.sku}-${idx}`}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="w-8 h-8 rounded border border-gray-100 bg-white flex items-center justify-center shrink-0 p-0.5 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title || product.sku}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-gray-300">N/D</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-black text-gray-900 truncate">
                            {product.sku}
                          </span>
                          {listPrice > 0 && (
                            <span className="text-[11px] font-extrabold text-emerald-700 shrink-0">
                              € {netPrice.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {product.title}
                        </div>
                      </div>
                    </div>

                    {targetType === 'PRODUCTS' && (
                      <button
                        type="button"
                        onClick={() => removeProductFromRule(product.sku)}
                        title="Rimuovi prodotto"
                        className="w-6 h-6 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center shrink-0 transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
