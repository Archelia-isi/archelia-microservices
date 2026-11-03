import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Percent,
  Users,
  Layers,
  Globe,
  Package,
  Tag,
  FolderTree,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Check,
  Search,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StickyHeader from '../../components/ui/StickyHeader';
import Tabs from '../../components/ui/Tabs';
import GlassPanel from '../../components/ui/GlassPanel';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TextInput from '../../components/ui/TextInput';
import Switch from '../../components/ui/Switch';
import { useWindowStore } from '../../store/useWindowStore';
import {
  type AgentManagedClient,
  type CommercialCategoryOption,
  type CatalogFacetOption,
  type CatalogProductItem,
  searchAgentCatalogProducts,
  searchCatalogPredictiveAction,
  saveAgentDiscountRuleAction,
  toggleAgentDiscountRuleAction,
  deleteAgentDiscountRuleAction,
  removeDiscountFromClientAction,
} from './actionsClient';
import {
  type AgentDiscountRule,
  type DiscountCalculationMode,
  type DiscountClientScope,
  type DiscountExpiryType,
  type DiscountTargetClientMeta,
  type DiscountTargetProductMeta,
  type DiscountTargetType,
  doesRuleMatchClient,
  isDiscountRuleExpired,
  normalizeClientCategoryCode,
} from './discountRulesEngine';

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
  initialPreset?: any;
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
    <GlassPanel padding="md" radius="md">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-main)',
            }}
          >
            {label}
          </span>
          {selectedValues.length > 0 && (
            <Badge variant="primary" size="sm">
              {selectedValues.length} selezionat{selectedValues.length === 1 ? 'o' : 'i'}
            </Badge>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <div style={{ width: '240px' }}>
            <TextInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              leftIcon={<Search size={14} />}
              fullWidth
            />
          </div>
          {selectedValues.length > 0 && (
            <Button variant="danger" size="sm" type="button" onClick={() => onChange([])}>
              Svuota
            </Button>
          )}
        </div>
      </div>

      {selectedValues.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: 'var(--spacing-sm)',
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          {selectedValues.map(code => {
            const opt = options.find(o => o.code.toUpperCase() === code.toUpperCase());
            return (
              <Badge key={code} variant="primary" size="sm">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {opt ? opt.label : code}
                  <span
                    style={{ cursor: 'pointer', fontWeight: 800 }}
                    onClick={() => toggleValue(code)}
                  >
                    ×
                  </span>
                </span>
              </Badge>
            );
          })}
        </div>
      )}

      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '6px',
          paddingTop: '4px',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--spacing-lg)',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
            }}
          >
            Nessuna voce trovata
          </div>
        ) : (
          filtered.map(opt => {
            const checked = selectedValues.includes(opt.code.toUpperCase());
            return (
              <div
                key={opt.code}
                onClick={() => toggleValue(opt.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: checked ? 700 : 500,
                  background: checked ? 'var(--color-primary-light)' : 'var(--color-surface-solid)',
                  border: checked
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  transition: 'var(--transition-fast)',
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
                    checked={checked}
                    readOnly
                    style={{ accentColor: 'var(--color-primary)', flexShrink: 0 }}
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
                <Badge variant={checked ? 'primary' : 'neutral'} size="sm">
                  {opt.count}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}

export default function DiscountsManagerClient({
  agentName,
  agentCode,
  clients,
  clientCategories,
  facets,
  initialRules,
  initialPreset,
}: Props) {
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [rules, setRules] = useState<AgentDiscountRule[]>(initialRules || []);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Stato form regola
  const [ruleName, setRuleName] = useState<string>('');
  const [clientScope, setClientScope] = useState<DiscountClientScope>('SELECTED_CLIENTS');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedClientCategories, setSelectedClientCategories] = useState<string[]>([]);
  const [dropdownClientCatFilter, setDropdownClientCatFilter] = useState<string>('ALL');

  const [clientSearchText, setClientSearchText] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState<boolean>(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [targetType, setTargetType] = useState<DiscountTargetType>('PRODUCTS');
  const [selectedProducts, setSelectedProducts] = useState<DiscountTargetProductMeta[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [calculationMode, setCalculationMode] =
    useState<DiscountCalculationMode>('EXTRA_CASCADE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [expiryType, setExpiryType] = useState<DiscountExpiryType>('NONE');
  const [expiresAtDate, setExpiresAtDate] = useState<string>('');

  useEffect(() => {
    if (!initialPreset) return;
    setActiveTab('editor');
    if (initialPreset.ruleName) setRuleName(initialPreset.ruleName);
    if (initialPreset.targetType) setTargetType(initialPreset.targetType);
    if (initialPreset.calculationMode) setCalculationMode(initialPreset.calculationMode);
    if (initialPreset.discountValue !== undefined) {
      setDiscountValue(Number(initialPreset.discountValue));
    }
    if (initialPreset.expiryType) setExpiryType(initialPreset.expiryType);
    if (initialPreset.targetCompanyName && clients.length > 0) {
      const targetLower = String(initialPreset.targetCompanyName).trim().toLowerCase();
      const matched = clients.find(
        c => (c.companyName || '').trim().toLowerCase() === targetLower
      );
      if (matched) {
        setClientScope('SELECTED_CLIENTS');
        setSelectedClientIds([matched.id]);
      }
    }
  }, [initialPreset, clients]);

  const getDatePlusDaysStr = (days: number): string => {
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatExpiryDisplay = (isoOrDate?: string | null): string => {
    if (!isoOrDate) return 'Senza scadenza';
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Barra predittiva per selezione prodotti singoli
  const [productQuery, setProductQuery] = useState<string>('');
  const [predictiveResults, setPredictiveResults] = useState<CatalogProductItem[]>([]);
  const [isPredictiveOpen, setIsPredictiveOpen] = useState<boolean>(false);
  const [isPredictiveLoading, setIsPredictiveLoading] = useState<boolean>(false);
  const predictiveRef = useRef<HTMLDivElement>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [filterClientScope, setFilterClientScope] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

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

  // Ricerca predittiva prodotti (160ms debounce)
  useEffect(() => {
    const q = productQuery.trim();
    if (q.length < 1 || targetType !== 'PRODUCTS') {
      setPredictiveResults([]);
      setIsPredictiveOpen(false);
      setIsPredictiveLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPredictiveLoading(true);
      try {
        const res = await searchCatalogPredictiveAction(q, 'ALL_WAREHOUSES', true);
        if (cancelled) return;
        if (res.success) {
          setPredictiveResults(res.products || []);
          setIsPredictiveOpen(true);
        }
      } finally {
        if (!cancelled) setIsPredictiveLoading(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productQuery, targetType]);

  // --- ANTEPRIMA LIVE PRODOTTI ---
  const [previewSampleProducts, setPreviewSampleProducts] = useState<CatalogProductItem[]>([]);
  const [previewTotalCatalogCount, setPreviewTotalCatalogCount] = useState<number>(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  useEffect(() => {
    if (targetType === 'PRODUCTS') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const res = await searchAgentCatalogProducts({
          catalogSource: 'ZUCCHETTI',
          query: '',
          warehouse: 'ALL_WAREHOUSES',
          includeZeroStock: true,
          brands: targetType === 'BRAND' ? selectedBrands : [],
          productGroups: targetType === 'PRODUCT_GROUP' ? selectedProductGroups : [],
          families: targetType === 'FAMILY' ? selectedFamilies : [],
          categories: targetType === 'CATEGORY' ? selectedCategories : [],
          sortBy: 'TAXONOMY_ASC',
          limit: 60,
        });
        if (cancelled) return;
        if (res.success) {
          setPreviewSampleProducts(res.products || []);
          setPreviewTotalCatalogCount(res.totalFound || (res.products || []).length);
        }
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    }, 180);

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

  const enrichedClientCategories = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; discount: number; clientsCount: number }
    >();

    const defaults = [
      { code: 'RIV', name: 'RIV - Rivenditore', discount: 50 },
      { code: 'IST', name: 'IST - Installatore / Impiantista', discount: 40 },
      { code: 'GEN', name: 'GEN - Generale', discount: 25 },
      { code: 'NONE', name: 'Nessuna Categoria (Sconto Base 0%)', discount: 0 },
    ];
    for (const d of defaults) {
      map.set(d.code, { ...d, clientsCount: 0 });
    }

    for (const cat of clientCategories) {
      const upper = normalizeClientCategoryCode(cat.code);
      if (!upper) continue;
      const cleanName = cat.label.replace(/\s*\(Sconto.*\)$/i, '').trim() || upper;
      map.set(upper, {
        code: upper,
        name: cleanName,
        discount: cat.discount,
        clientsCount: 0,
      });
    }

    for (const c of clients) {
      const code = normalizeClientCategoryCode(
        c.categoriaCode || c.customerType,
        c.discount
      );
      if (!code) continue;
      const existing = map.get(code);
      if (existing) {
        existing.clientsCount += 1;
      } else {
        map.set(code, {
          code,
          name: c.customerType || code,
          discount: c.discount || 0,
          clientsCount: 1,
        });
      }
    }

    return Array.from(map.values());
  }, [clientCategories, clients]);

  const selectedClientsObjects = useMemo(
    () => clients.filter(c => selectedClientIds.includes(c.id)),
    [clients, selectedClientIds]
  );

  const getClientCategoryLabel = (client: AgentManagedClient): string => {
    const norm = normalizeClientCategoryCode(
      client.categoriaCode || client.customerType,
      client.discount
    );
    const found = enrichedClientCategories.find(c => c.code === norm);
    return found ? found.name : client.customerType || 'Nessuna Categoria';
  };

  const filteredClientsForDropdown = useMemo(() => {
    const q = clientSearchText.trim().toLowerCase();
    return clients
      .filter(c => {
        const normCat = normalizeClientCategoryCode(
          c.categoriaCode || c.customerType,
          c.discount
        );
        if (dropdownClientCatFilter !== 'ALL' && normCat !== dropdownClientCatFilter) {
          return false;
        }
        if (!q) return true;
        const catLabel = getClientCategoryLabel(c).toLowerCase();
        return (
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.zucchettiCode || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.vatNumber || '').toLowerCase().includes(q) ||
          normCat.toLowerCase().includes(q) ||
          catLabel.includes(q)
        );
      })
      .slice(0, 80);
  }, [clients, clientSearchText, dropdownClientCatFilter, enrichedClientCategories]);

  const toggleSelectClient = (client: AgentManagedClient) => {
    setSelectedClientIds(prev =>
      prev.includes(client.id)
        ? prev.filter(id => id !== client.id)
        : [...prev, client.id]
    );
  };

  const toggleSelectClientCategory = (catCode: string) => {
    const upper = normalizeClientCategoryCode(catCode);
    setSelectedClientCategories(prev =>
      prev.includes(upper) ? prev.filter(c => c !== upper) : [...prev, upper]
    );
  };

  const handleAddProduct = (prod: CatalogProductItem) => {
    setSelectedProducts(prev => {
      if (prev.some(p => p.sku.toUpperCase() === prod.sku.toUpperCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          sku: prod.sku,
          title: prod.originalName || prod.title,
          brand: prod.brandLabel || prod.brand,
          listPrice: prod.listPrice,
          imageUrl: prod.imageUrl,
        },
      ];
    });
    setProductQuery('');
    setPredictiveResults([]);
    setIsPredictiveOpen(false);
  };

  const handleAddAllFromSearch = async () => {
    const q = productQuery.trim();
    if (!q) return;
    setIsPredictiveOpen(false);
    const res = await searchAgentCatalogProducts({
      catalogSource: 'ZUCCHETTI',
      query: q,
      warehouse: 'ALL_WAREHOUSES',
      includeZeroStock: true,
      brands: [],
      productGroups: [],
      families: [],
      categories: [],
      sortBy: 'TAXONOMY_ASC',
      limit: 100,
    });
    if (res.success && res.products.length > 0) {
      setSelectedProducts(prev => {
        const existingSkus = new Set(prev.map(p => p.sku.toUpperCase()));
        const additions: DiscountTargetProductMeta[] = [];
        for (const p of res.products) {
          if (!existingSkus.has(p.sku.toUpperCase())) {
            existingSkus.add(p.sku.toUpperCase());
            additions.push({
              sku: p.sku,
              title: p.originalName || p.title,
              brand: p.brandLabel || p.brand,
              listPrice: p.listPrice,
              imageUrl: p.imageUrl,
            });
          }
        }
        return [...prev, ...additions];
      });
      setProductQuery('');
    }
  };

  const handleRemoveProduct = (sku: string) => {
    setSelectedProducts(prev =>
      prev.filter(p => p.sku.toUpperCase() !== sku.toUpperCase())
    );
  };

  const resetForm = () => {
    setEditingRuleId(null);
    setRuleName('');
    setClientScope('SELECTED_CLIENTS');
    setSelectedClientIds([]);
    setSelectedClientCategories([]);
    setDropdownClientCatFilter('ALL');
    setClientSearchText('');
    setTargetType('PRODUCTS');
    setSelectedProducts([]);
    setSelectedBrands([]);
    setSelectedProductGroups([]);
    setSelectedFamilies([]);
    setSelectedCategories([]);
    setCalculationMode('EXTRA_CASCADE');
    setDiscountValue(10);
    setExpiryType('NONE');
    setExpiresAtDate('');
  };

  const handleEditRule = (rule: AgentDiscountRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name || '');

    if (rule.clientScope === 'ALL_CLIENTS') {
      setClientScope('ALL_CLIENTS');
      setSelectedClientIds([]);
      setSelectedClientCategories([]);
    } else if (rule.clientScope === 'CLIENT_CATEGORY') {
      setClientScope('CLIENT_CATEGORY');
      setSelectedClientCategories(
        (rule.clientCategories || []).map(c => normalizeClientCategoryCode(c))
      );
      setSelectedClientIds([]);
    } else {
      setClientScope('SELECTED_CLIENTS');
      const ids = new Set<string>(rule.clientIds || []);
      if (rule.clientId) ids.add(rule.clientId);
      for (const code of rule.clientCodes || []) {
        const match = clients.find(
          c => c.zucchettiCode.toUpperCase() === code.toUpperCase()
        );
        if (match) ids.add(match.id);
      }
      if (rule.clientCode) {
        const match = clients.find(
          c => c.zucchettiCode.toUpperCase() === rule.clientCode!.toUpperCase()
        );
        if (match) ids.add(match.id);
      }
      setSelectedClientIds(Array.from(ids));
      setSelectedClientCategories([]);
    }

    setTargetType(rule.targetType);
    setSelectedProducts(
      rule.targetProductsMeta && rule.targetProductsMeta.length > 0
        ? rule.targetProductsMeta
        : (rule.targetSkus || []).map(sku => ({
            sku,
            title: sku,
            brand: '',
            listPrice: 0,
            imageUrl: '',
          }))
    );
    setSelectedBrands(rule.targetBrands || []);
    setSelectedProductGroups(rule.targetProductGroups || []);
    setSelectedFamilies(rule.targetFamilies || []);
    setSelectedCategories(rule.targetCategories || []);
    setCalculationMode(rule.calculationMode);
    setDiscountValue(rule.discountValue);
    if (rule.expiryType === 'FIRST_PURCHASE') {
      setExpiryType('FIRST_PURCHASE');
      setExpiresAtDate('');
    } else if (rule.expiryType === 'NEXT_PURCHASE') {
      setExpiryType('NEXT_PURCHASE');
      setExpiresAtDate('');
    } else if (rule.expiresAt) {
      setExpiryType('DATE');
      setExpiresAtDate(rule.expiresAt.slice(0, 10));
    } else {
      setExpiryType('NONE');
      setExpiresAtDate('');
    }
    setActiveTab('editor');
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientScope === 'SELECTED_CLIENTS' && selectedClientsObjects.length === 0) {
      toast.error('Seleziona almeno un cliente a cui applicare la regola di sconto.');
      return;
    }
    if (clientScope === 'CLIENT_CATEGORY' && selectedClientCategories.length === 0) {
      toast.error(
        'Seleziona almeno una Categoria Cliente (es. Rivenditore o Installatore).'
      );
      return;
    }

    const clientsMetaPayload: DiscountTargetClientMeta[] =
      clientScope === 'SELECTED_CLIENTS'
        ? selectedClientsObjects.map(c => ({
            id: c.id,
            code: c.zucchettiCode,
            name: c.companyName,
            category: normalizeClientCategoryCode(
              c.categoriaCode || c.customerType,
              c.discount
            ),
          }))
        : [];

    const isSpecificClients = clientScope === 'SELECTED_CLIENTS';
    const singleClient =
      isSpecificClients && selectedClientsObjects.length === 1
        ? selectedClientsObjects[0]
        : null;

    setIsSaving(true);
    try {
      const res = await saveAgentDiscountRuleAction({
        id: editingRuleId || undefined,
        name: ruleName,
        clientScope:
          isSpecificClients && selectedClientsObjects.length === 1
            ? 'SINGLE_CLIENT'
            : clientScope,
        clientId: singleClient ? singleClient.id : null,
        clientCode: singleClient ? singleClient.zucchettiCode : null,
        clientName: singleClient ? singleClient.companyName : null,
        clientIds: isSpecificClients ? selectedClientsObjects.map(c => c.id) : [],
        clientCodes: isSpecificClients
          ? selectedClientsObjects.map(c => c.zucchettiCode)
          : [],
        clientsMeta: clientsMetaPayload,
        clientCategories:
          clientScope === 'CLIENT_CATEGORY' ? selectedClientCategories : [],
        targetType,
        targetSkus: selectedProducts.map(p => p.sku),
        targetProductsMeta: selectedProducts,
        targetBrands: selectedBrands,
        targetProductGroups: selectedProductGroups,
        targetFamilies: selectedFamilies,
        targetCategories: selectedCategories,
        calculationMode,
        discountValue,
        isActive: true,
        expiryType,
        expiresAt: expiryType === 'DATE' ? expiresAtDate || null : null,
      });

      if (!res.success) {
        toast.error(res.error || 'Errore durante il salvataggio della regola.');
        return;
      }

      if (res.rules) {
        setRules(res.rules);
      }
      toast.success(
        editingRuleId
          ? 'Regola di sconto aggiornata con successo!'
          : 'Nuova regola di sconto creata e attivata!'
      );
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRule = async (rule: AgentDiscountRule) => {
    const res = await toggleAgentDiscountRuleAction(rule.id, !rule.isActive);
    if (res.success && res.rules) {
      setRules(res.rules);
      toast.success(rule.isActive ? 'Regola disattivata' : 'Regola attivata');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const res = await deleteAgentDiscountRuleAction(ruleId);
    if (res.success && res.rules) {
      setRules(res.rules);
      if (editingRuleId === ruleId) resetForm();
      toast.success('Regola eliminata');
    }
  };

  const handleRemoveRuleFromSingleClient = async (
    rule: AgentDiscountRule,
    client: AgentManagedClient
  ) => {
    const res = await removeDiscountFromClientAction(
      rule.id,
      client.id,
      client.zucchettiCode
    );
    if (!res.success) {
      toast.error(res.error || 'Impossibile rimuovere lo sconto dal cliente.');
      return;
    }
    if (res.rules) {
      setRules(res.rules);
      toast.success(`Sconto rimosso per ${client.companyName}`);
    }
  };

  // --- SIMULAZIONE LIVE PREZZO ---
  const exampleBaseDiscount = useMemo(() => {
    if (clientScope === 'SELECTED_CLIENTS' && selectedClientsObjects.length > 0) {
      return Number(selectedClientsObjects[0].discount || 0);
    }
    if (clientScope === 'CLIENT_CATEGORY' && selectedClientCategories.length > 0) {
      const firstCat = enrichedClientCategories.find(
        c => c.code === selectedClientCategories[0]
      );
      if (firstCat) return Number(firstCat.discount || 0);
    }
    return 40;
  }, [
    clientScope,
    selectedClientsObjects,
    selectedClientCategories,
    enrichedClientCategories,
  ]);

  const exampleListPrice = 100;
  const exampleAfterBase = exampleListPrice * (1 - exampleBaseDiscount / 100);
  const exampleFinalNet =
    calculationMode === 'FIXED_OVERRIDE'
      ? exampleListPrice * (1 - discountValue / 100)
      : exampleAfterBase * (1 - discountValue / 100);
  const exampleEffectivePct =
    calculationMode === 'FIXED_OVERRIDE'
      ? discountValue
      : Math.round((1 - (1 - exampleBaseDiscount / 100) * (1 - discountValue / 100)) * 10000) /
        100;

  const previewSummaryClients = useMemo(() => {
    if (clientScope === 'SELECTED_CLIENTS') {
      return selectedClientsObjects;
    }
    if (clientScope === 'CLIENT_CATEGORY') {
      if (selectedClientCategories.length === 0) return [];
      return clients.filter(c => {
        const norm = normalizeClientCategoryCode(
          c.categoriaCode || c.customerType,
          c.discount
        );
        return selectedClientCategories.includes(norm);
      });
    }
    return clients;
  }, [clientScope, selectedClientsObjects, selectedClientCategories, clients]);

  const previewSummaryProducts = useMemo<DiscountTargetProductMeta[]>(() => {
    if (targetType === 'PRODUCTS') {
      return selectedProducts;
    }
    if (
      (targetType === 'BRAND' && selectedBrands.length === 0) ||
      (targetType === 'PRODUCT_GROUP' && selectedProductGroups.length === 0) ||
      (targetType === 'FAMILY' && selectedFamilies.length === 0) ||
      (targetType === 'CATEGORY' && selectedCategories.length === 0)
    ) {
      return [];
    }
    return previewSampleProducts.map(p => ({
      sku: p.sku,
      title: p.originalName || p.title,
      brand: p.brandLabel || p.brand,
      listPrice: p.listPrice,
      imageUrl: p.imageUrl,
    }));
  }, [
    targetType,
    selectedProducts,
    selectedBrands,
    selectedProductGroups,
    selectedFamilies,
    selectedCategories,
    previewSampleProducts,
  ]);

  const previewProductsTotal = useMemo(() => {
    if (targetType === 'PRODUCTS') return selectedProducts.length;
    if (
      (targetType === 'BRAND' && selectedBrands.length === 0) ||
      (targetType === 'PRODUCT_GROUP' && selectedProductGroups.length === 0) ||
      (targetType === 'FAMILY' && selectedFamilies.length === 0) ||
      (targetType === 'CATEGORY' && selectedCategories.length === 0)
    ) {
      return 0;
    }
    return previewTotalCatalogCount || previewSummaryProducts.length;
  }, [
    targetType,
    selectedProducts.length,
    selectedBrands.length,
    selectedProductGroups.length,
    selectedFamilies.length,
    selectedCategories.length,
    previewTotalCatalogCount,
    previewSummaryProducts.length,
  ]);

  const evaluateDiscountedPrice = (listPrice?: number) => {
    const lp = Number(listPrice || 0);
    if (lp <= 0) return 0;
    const afterBase = lp * (1 - exampleBaseDiscount / 100);
    return calculationMode === 'FIXED_OVERRIDE'
      ? lp * (1 - discountValue / 100)
      : afterBase * (1 - discountValue / 100);
  };

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (filterClientScope === 'ALL_CLIENTS' && r.clientScope !== 'ALL_CLIENTS') {
        return false;
      }
      if (
        filterClientScope === 'SELECTED_CLIENTS' &&
        r.clientScope !== 'SINGLE_CLIENT' &&
        r.clientScope !== 'SELECTED_CLIENTS'
      ) {
        return false;
      }
      if (
        filterClientScope === 'CLIENT_CATEGORY' &&
        r.clientScope !== 'CLIENT_CATEGORY'
      ) {
        return false;
      }

      const q = filterSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.clientCode || '').toLowerCase().includes(q) ||
        (r.clientsMeta || []).some(
          cm =>
            cm.name.toLowerCase().includes(q) || cm.code.toLowerCase().includes(q)
        ) ||
        (r.clientCategories || []).some(cat => cat.toLowerCase().includes(q)) ||
        (r.targetSkus || []).some(s => s.toLowerCase().includes(q)) ||
        (r.targetBrands || []).some(b => b.toLowerCase().includes(q)) ||
        (r.targetProductGroups || []).some(g => g.toLowerCase().includes(q)) ||
        (r.targetFamilies || []).some(f => f.toLowerCase().includes(q)) ||
        (r.targetCategories || []).some(c => c.toLowerCase().includes(q))
      );
    });
  }, [rules, filterClientScope, filterSearch]);

  const activeRulesCount = useMemo(
    () => rules.filter(r => r.isActive && !isDiscountRuleExpired(r)).length,
    [rules]
  );

  const formatTargetBadge = (rule: AgentDiscountRule): string => {
    switch (rule.targetType) {
      case 'ALL_CATALOG':
        return '🌐 Tutto il Catalogo';
      case 'PRODUCTS':
        return `🎯 ${rule.targetSkus.length} Prodott${rule.targetSkus.length === 1 ? 'o' : 'i'} Specific${rule.targetSkus.length === 1 ? 'o' : 'i'}`;
      case 'BRAND':
        return `🏷️ ${rule.targetBrands.length} March${rule.targetBrands.length === 1 ? 'io' : 'i'}`;
      case 'PRODUCT_GROUP':
        return `📦 ${rule.targetProductGroups.length} Grupp${rule.targetProductGroups.length === 1 ? 'o' : 'i'} (L1)`;
      case 'FAMILY':
        return `📂 ${rule.targetFamilies.length} Famigli${rule.targetFamilies.length === 1 ? 'a' : 'e'} (L2)`;
      case 'CATEGORY':
        return `📑 ${rule.targetCategories.length} Categori${rule.targetCategories.length === 1 ? 'a' : 'e'} (L3)`;
      default:
        return rule.targetType;
    }
  };

  const resolveFacetLabel = (
    list: CatalogFacetOption[],
    code: string
  ): string => {
    const found = list.find(o => o.code.toUpperCase() === code.toUpperCase());
    return found ? found.label : code;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* STICKY HEADER CON TABS E CONTROLLI (NESSUN H1 RIDONDANTE) */}
      <StickyHeader paddingY="sm">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            activeTab={activeTab}
            onChange={id => setActiveTab(id as 'editor' | 'list')}
            tabs={[
              {
                id: 'editor',
                label: editingRuleId ? 'Modifica Regola Sconto' : 'Configuratore Regola Sconto',
                icon: <Plus size={14} />,
              },
              {
                id: 'list',
                label: `Regole & Matrice Clienti (${rules.length})`,
                icon: <Percent size={14} />,
              },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Badge variant="neutral" size="sm">
              Agente: {agentName} ({agentCode})
            </Badge>
            <Badge variant="success" size="sm">
              {activeRulesCount} Regole Attive
            </Badge>
            <Button
              variant="primary"
              size="sm"
              icon={<BookOpen size={14} />}
              onClick={() => useWindowStore.getState().openWindow('b2b_catalog_builder')}
            >
              Vai a Sviluppa Catalogo PDF
            </Button>
          </div>
        </div>
      </StickyHeader>

      {/* CONTENUTO PRINCIPALE */}
      <div style={{ padding: 'var(--spacing-lg)', flex: 1 }}>
        {activeTab === 'editor' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 300px',
              gap: 'var(--spacing-lg)',
              alignItems: 'start',
            }}
          >
            {/* COLONNA SINISTRA: FORM 4 STEP */}
            <form
              onSubmit={handleSaveRule}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}
            >
              {/* STEP 1: CLIENTI */}
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
                    <Badge variant="primary" size="sm">
                      STEP 1
                    </Badge>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      A quali clienti vuoi applicare lo sconto?
                    </span>
                  </div>
                  {editingRuleId && (
                    <Button variant="secondary" size="sm" type="button" onClick={resetForm}>
                      Annulla Modifica
                    </Button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  {[
                    {
                      id: 'SELECTED_CLIENTS' as DiscountClientScope,
                      title: 'Uno o più Clienti Scelti',
                      desc: 'Seleziona 1 cliente singolo oppure più clienti specifici',
                      icon: <Users size={15} />,
                    },
                    {
                      id: 'CLIENT_CATEGORY' as DiscountClientScope,
                      title: 'Per Categoria Cliente',
                      desc: 'Rivenditore (RIV), Installatore (IST), Generale (GEN)...',
                      icon: <Layers size={15} />,
                    },
                    {
                      id: 'ALL_CLIENTS' as DiscountClientScope,
                      title: 'Tutti i miei Clienti',
                      desc: `Valido per l'intero portafoglio (${clients.length} clienti)`,
                      icon: <Globe size={15} />,
                    },
                  ].map(item => {
                    const active =
                      clientScope === item.id ||
                      (item.id === 'SELECTED_CLIENTS' && clientScope === 'SINGLE_CLIENT');
                    return (
                      <div
                        key={item.id}
                        onClick={() => setClientScope(item.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: active
                            ? 'var(--color-primary-light)'
                            : 'var(--color-surface-solid)',
                          border: active
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--color-text-main)',
                          }}
                        >
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            marginTop: '4px',
                          }}
                        >
                          {item.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CONTENUTO STEP 1A: CLIENTI SCELTI */}
                {(clientScope === 'SELECTED_CLIENTS' || clientScope === 'SINGLE_CLIENT') && (
                  <div ref={clientDropdownRef} style={{ position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Cerca e seleziona uno o più clienti B2B ({selectedClientsObjects.length}{' '}
                        selezionati)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <Button
                          type="button"
                          size="sm"
                          variant={dropdownClientCatFilter === 'ALL' ? 'primary' : 'secondary'}
                          onClick={() => setDropdownClientCatFilter('ALL')}
                        >
                          Tutti ({clients.length})
                        </Button>
                        {enrichedClientCategories
                          .filter(c => c.clientsCount > 0)
                          .map(cat => (
                            <Button
                              key={cat.code}
                              type="button"
                              size="sm"
                              variant={
                                dropdownClientCatFilter === cat.code ? 'primary' : 'secondary'
                              }
                              onClick={() => setDropdownClientCatFilter(cat.code)}
                            >
                              {cat.name} ({cat.clientsCount})
                            </Button>
                          ))}
                      </div>
                    </div>

                    <div onClick={() => setIsClientDropdownOpen(true)}>
                      <TextInput
                        value={clientSearchText}
                        onChange={e => {
                          setClientSearchText(e.target.value);
                          setIsClientDropdownOpen(true);
                        }}
                        placeholder="Digita ragione sociale, codice cliente, categoria o città..."
                        leftIcon={<Search size={15} />}
                        fullWidth
                      />
                    </div>

                    {selectedClientsObjects.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '10px',
                        }}
                      >
                        {selectedClientsObjects.map(c => (
                          <Badge key={c.id} variant="primary" size="md">
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <strong>{c.companyName}</strong> ({c.zucchettiCode}) • Base{' '}
                              {c.discount}%
                              <span
                                style={{ cursor: 'pointer', fontWeight: 800 }}
                                onClick={() => toggleSelectClient(c)}
                              >
                                ×
                              </span>
                            </span>
                          </Badge>
                        ))}
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setSelectedClientIds([])}
                        >
                          Svuota selezione
                        </Button>
                      </div>
                    )}

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
                          maxHeight: '280px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--color-bg)',
                            position: 'sticky',
                            top: 0,
                          }}
                        >
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Clicca sui clienti per aggiungerli ({filteredClientsForDropdown.length}{' '}
                            risultati)
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => setIsClientDropdownOpen(false)}
                          >
                            Chiudi tendina ✓
                          </Button>
                        </div>
                        {filteredClientsForDropdown.map(c => {
                          const isChecked = selectedClientIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => toggleSelectClient(c)}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--color-border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: isChecked
                                  ? 'var(--color-primary-light)'
                                  : 'transparent',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  style={{ accentColor: 'var(--color-primary)' }}
                                />
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                    {c.companyName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--color-text-muted)',
                                    }}
                                  >
                                    Cod: {c.zucchettiCode}{' '}
                                    {c.city ? `• ${c.city} (${c.province})` : ''}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Badge variant="neutral" size="sm">
                                  {getClientCategoryLabel(c)}
                                </Badge>
                                <Badge variant="success" size="sm">
                                  Base {c.discount}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* CONTENUTO STEP 1B: PER CATEGORIA CLIENTE */}
                {clientScope === 'CLIENT_CATEGORY' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    {enrichedClientCategories.map(cat => {
                      const checked = selectedClientCategories.includes(cat.code);
                      return (
                        <div
                          key={cat.code}
                          onClick={() => toggleSelectClientCategory(cat.code)}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            background: checked
                              ? 'var(--color-primary-light)'
                              : 'var(--color-surface-solid)',
                            border: checked
                              ? '2px solid var(--color-primary)'
                              : '1px solid var(--color-border)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '13px' }}>{cat.name}</span>
                            <Badge variant={checked ? 'primary' : 'neutral'} size="sm">
                              Base {cat.discount}%
                            </Badge>
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-muted)',
                              marginTop: '4px',
                            }}
                          >
                            {cat.clientsCount} client{cat.clientsCount === 1 ? 'e' : 'i'} in
                            portafoglio
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* CONTENUTO STEP 1C: TUTTI I CLIENTI */}
                {clientScope === 'ALL_CLIENTS' && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <strong>Regola Globale Portafoglio Agente:</strong> questo sconto si
                    applicherà automaticamente a tutti i tuoi <strong>{clients.length}</strong>{' '}
                    clienti gestiti (mantenendo per ciascuno il proprio Sconto Base fisso).
                  </div>
                )}
              </GlassPanel>

              {/* STEP 2: ARTICOLI / REPARTI */}
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  <Badge variant="primary" size="sm">
                    STEP 2
                  </Badge>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    Su quali articoli vuoi applicare lo sconto?
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  {[
                    {
                      id: 'ALL_CATALOG' as DiscountTargetType,
                      title: 'Tutto il Catalogo',
                      sub: 'Intero listino prodotti',
                      icon: <Globe size={14} />,
                    },
                    {
                      id: 'PRODUCTS' as DiscountTargetType,
                      title: 'Singolo / Più Prodotti',
                      sub: 'Ricerca predittiva SKU',
                      icon: <Package size={14} />,
                    },
                    {
                      id: 'BRAND' as DiscountTargetType,
                      title: 'Per Marchio',
                      sub: `${facets.brands.length} marchi`,
                      icon: <Tag size={14} />,
                    },
                    {
                      id: 'PRODUCT_GROUP' as DiscountTargetType,
                      title: 'Gruppo Merceol.',
                      sub: `${facets.productGroups.length} gruppi (L1)`,
                      icon: <FolderTree size={14} />,
                    },
                    {
                      id: 'FAMILY' as DiscountTargetType,
                      title: 'Per Famiglia',
                      sub: `${facets.families.length} famiglie (L2)`,
                      icon: <FolderTree size={14} />,
                    },
                    {
                      id: 'CATEGORY' as DiscountTargetType,
                      title: 'Per Categoria',
                      sub: `${facets.categories.length} categorie (L3)`,
                      icon: <FolderTree size={14} />,
                    },
                  ].map(t => {
                    const active = targetType === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTargetType(t.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: active
                            ? 'var(--color-primary-light)'
                            : 'var(--color-surface-solid)',
                          border: active
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {t.icon}
                          <span>{t.title}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {t.sub}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {targetType === 'ALL_CATALOG' && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      fontSize: '12px',
                    }}
                  >
                    🌐 <strong>Sconto applicato a TUTTO IL CATALOGO:</strong> le regole più
                    specifiche (es. singolo prodotto o marchio) avranno sempre priorità.
                  </div>
                )}

                {targetType === 'PRODUCTS' && (
                  <div ref={predictiveRef} style={{ position: 'relative' }}>
                    <TextInput
                      label="Aggiungi uno o più prodotti con la barra predittiva (per codice SKU o nome)"
                      value={productQuery}
                      onChange={e => setProductQuery(e.target.value)}
                      onFocus={() => {
                        if (predictiveResults.length > 0) setIsPredictiveOpen(true);
                      }}
                      placeholder="Digita codice SKU (es. E45, IL34) o descrizione prodotto..."
                      leftIcon={<Search size={15} />}
                      rightIcon={
                        isPredictiveLoading ? (
                          <span style={{ fontSize: '11px' }}>...</span>
                        ) : undefined
                      }
                      fullWidth
                    />

                    {isPredictiveOpen && predictiveResults.length > 0 && (
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
                          maxHeight: '280px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--color-bg)',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Clicca su un articolo per aggiungerlo alla regola
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={handleAddAllFromSearch}
                          >
                            + Aggiungi tutti i risultati per "{productQuery}"
                          </Button>
                        </div>
                        {predictiveResults.map(prod => {
                          const already = selectedProducts.some(
                            p => p.sku.toUpperCase() === prod.sku.toUpperCase()
                          );
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleAddProduct(prod)}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--color-border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: already ? 'var(--color-primary-light)' : 'transparent',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Badge variant="neutral" size="sm">
                                  {prod.sku}
                                </Badge>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                  {prod.originalName || prod.title}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                  € {prod.listPrice.toFixed(2)}
                                </span>
                                <Badge variant={already ? 'success' : 'primary'} size="sm">
                                  {already ? '✓ Già presente' : '+ Aggiungi'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedProducts.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: '10px',
                        }}
                      >
                        {selectedProducts.map(p => (
                          <Badge key={p.sku} variant="primary" size="md">
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <strong>{p.sku}</strong> — {p.title.slice(0, 32)}
                              <span
                                style={{ cursor: 'pointer', fontWeight: 800 }}
                                onClick={() => handleRemoveProduct(p.sku)}
                              >
                                ×
                              </span>
                            </span>
                          </Badge>
                        ))}
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setSelectedProducts([])}
                        >
                          Svuota ({selectedProducts.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {targetType === 'BRAND' && (
                  <MultiSelectPicker
                    label="Seleziona uno o più Marchi (Brand)"
                    placeholder="Cerca marchio..."
                    options={facets.brands}
                    selectedValues={selectedBrands}
                    onChange={setSelectedBrands}
                  />
                )}

                {targetType === 'PRODUCT_GROUP' && (
                  <MultiSelectPicker
                    label="Seleziona uno o più Gruppi Merceologici (L1)"
                    placeholder="Cerca gruppo merceologico..."
                    options={facets.productGroups}
                    selectedValues={selectedProductGroups}
                    onChange={setSelectedProductGroups}
                  />
                )}

                {targetType === 'FAMILY' && (
                  <MultiSelectPicker
                    label="Seleziona una o più Famiglie Prodotto (L2)"
                    placeholder="Cerca famiglia..."
                    options={facets.families}
                    selectedValues={selectedFamilies}
                    onChange={setSelectedFamilies}
                  />
                )}

                {targetType === 'CATEGORY' && (
                  <MultiSelectPicker
                    label="Seleziona una o più Categorie Specifiche (L3)"
                    placeholder="Cerca categoria..."
                    options={facets.categories}
                    selectedValues={selectedCategories}
                    onChange={setSelectedCategories}
                  />
                )}
              </GlassPanel>

              {/* STEP 3 & STEP 4: MODALITÀ CALCOLO, VALORE E SCADENZA */}
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  <Badge variant="primary" size="sm">
                    STEP 3 & 4
                  </Badge>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    Modalità di Calcolo, Percentuale e Scadenza dello Sconto
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1.1fr',
                    gap: 'var(--spacing-md)',
                    alignItems: 'start',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  {/* Modalità */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      onClick={() => setCalculationMode('EXTRA_CASCADE')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background:
                          calculationMode === 'EXTRA_CASCADE'
                            ? 'var(--color-primary-light)'
                            : 'var(--color-surface-solid)',
                        border:
                          calculationMode === 'EXTRA_CASCADE'
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>
                        ➕ Extra Sconto a Cascata (X% + Y%)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Si aggiunge in cascata allo Sconto Base fisso del cliente (es. 40% + 10%)
                      </div>
                    </div>

                    <div
                      onClick={() => setCalculationMode('FIXED_OVERRIDE')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background:
                          calculationMode === 'FIXED_OVERRIDE'
                            ? 'var(--color-primary-light)'
                            : 'var(--color-surface-solid)',
                        border:
                          calculationMode === 'FIXED_OVERRIDE'
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>
                        🎯 Sconto Fisso Sostitutivo
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Imposta una % fissa sugli articoli scelti (es. 55% fisso)
                      </div>
                    </div>
                  </div>

                  {/* Valore % + Nota */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <TextInput
                      label={
                        calculationMode === 'EXTRA_CASCADE'
                          ? 'Extra Sconto a Cascata (%)'
                          : 'Sconto Fisso Totale (%)'
                      }
                      type="number"
                      min={0}
                      max={95}
                      step={0.5}
                      value={discountValue}
                      onChange={e =>
                        setDiscountValue(
                          Math.min(95, Math.max(0, parseFloat(e.target.value) || 0))
                        )
                      }
                      fullWidth
                    />
                    <TextInput
                      label="Nota / Nome regola (opzionale)"
                      value={ruleName}
                      onChange={e => setRuleName(e.target.value)}
                      placeholder="Es. Promo 1° Acquisto Pronta Consegna"
                      fullWidth
                    />
                  </div>

                  {/* Simulazione Prezzo */}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-text-main)',
                      color: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#fbbf24',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Simulazione Prezzo (Listino €100,00)
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                      {calculationMode === 'EXTRA_CASCADE'
                        ? `Base ${exampleBaseDiscount}% + Extra ${discountValue}% (${exampleEffectivePct}% netto)`
                        : `Sconto Fisso ${discountValue}%`}
                    </div>
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontSize: '11px', opacity: 0.75 }}>
                        Solo Base: €{exampleAfterBase.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#34d399' }}>
                        € {exampleFinalNet.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scadenza */}
                <div
                  style={{
                    paddingTop: 'var(--spacing-md)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} />
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      Scadenza dello Sconto:
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <Button
                      type="button"
                      size="sm"
                      variant={expiryType === 'NONE' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setExpiryType('NONE');
                        setExpiresAtDate('');
                      }}
                    >
                      ∞ Senza scadenza
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={expiryType === 'FIRST_PURCHASE' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setExpiryType('FIRST_PURCHASE');
                        setExpiresAtDate('');
                      }}
                    >
                      🎁 Sul primo acquisto
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={expiryType === 'NEXT_PURCHASE' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setExpiryType('NEXT_PURCHASE');
                        setExpiresAtDate('');
                      }}
                    >
                      🛒 Sul prossimo acquisto
                    </Button>
                    {[15, 30, 60, 90].map(d => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={
                          expiryType === 'DATE' && expiresAtDate === getDatePlusDaysStr(d)
                            ? 'primary'
                            : 'secondary'
                        }
                        onClick={() => {
                          setExpiryType('DATE');
                          setExpiresAtDate(getDatePlusDaysStr(d));
                        }}
                      >
                        ⏱️ {d} gg
                      </Button>
                    ))}
                    <input
                      type="date"
                      value={expiresAtDate}
                      onChange={e => {
                        const val = e.target.value;
                        setExpiresAtDate(val);
                        setExpiryType(val ? 'DATE' : 'NONE');
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* Submit Bar */}
                <div
                  style={{
                    marginTop: 'var(--spacing-md)',
                    paddingTop: 'var(--spacing-md)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<RotateCcw size={14} />}
                    onClick={resetForm}
                  >
                    Ripristina
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<Check size={15} />}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Salvataggio in corso...'
                      : editingRuleId
                      ? 'Salva Modifiche Regola'
                      : 'Salva ed Attiva Regola di Sconto'}
                  </Button>
                </div>
              </GlassPanel>
            </form>

            {/* COLONNA DESTRA: RIEPILOGO LIVE (CLIENTI + PRODOTTI) SENZA ALCUNA SOVRAPPOSIZIONE */}
            <div style={{ position: 'sticky', top: '72px' }}>
              <GlassPanel padding="md" radius="lg">
                {/* Riquadro 1: Clienti */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                    Clienti Target ({previewSummaryClients.length})
                  </span>
                  <Badge variant="primary" size="sm">
                    {clientScope === 'ALL_CLIENTS'
                      ? 'Tutti'
                      : clientScope === 'CLIENT_CATEGORY'
                      ? 'Categorie'
                      : `${previewSummaryClients.length} scelti`}
                  </Badge>
                </div>

                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: 'var(--spacing-md)',
                    paddingBottom: 'var(--spacing-sm)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {previewSummaryClients.length === 0 ? (
                    <div
                      style={{
                        padding: '16px 8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Nessun cliente selezionato
                    </div>
                  ) : (
                    previewSummaryClients.slice(0, 60).map((client, idx) => (
                      <div
                        key={client.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface-solid)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {idx + 1}. {client.companyName}
                          </div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                            {client.zucchettiCode} • Base {client.discount}%
                          </div>
                        </div>
                        {clientScope === 'SELECTED_CLIENTS' && (
                          <button
                            type="button"
                            onClick={() => toggleSelectClient(client)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--color-danger)',
                              fontWeight: 800,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Riquadro 2: Prodotti */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                    Prodotti ({previewProductsTotal})
                  </span>
                  <Badge variant="success" size="sm">
                    {targetType === 'ALL_CATALOG' ? 'Intero catalogo' : targetType}
                  </Badge>
                </div>

                <div
                  style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {isPreviewLoading ? (
                    <div
                      style={{
                        padding: '16px 8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Caricamento articoli...
                    </div>
                  ) : previewSummaryProducts.length === 0 ? (
                    <div
                      style={{
                        padding: '16px 8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Nessun prodotto selezionato
                    </div>
                  ) : (
                    previewSummaryProducts.map((prod, idx) => {
                      const netPrice = evaluateDiscountedPrice(prod.listPrice);
                      return (
                        <div
                          key={prod.sku}
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
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700 }}>
                              {idx + 1}. {prod.sku}{' '}
                              {netPrice > 0 && (
                                <span style={{ color: 'var(--color-success)' }}>
                                  € {netPrice.toFixed(2)}
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
                              {prod.title}
                            </div>
                          </div>
                          {targetType === 'PRODUCTS' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(prod.sku)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--color-danger)',
                                fontWeight: 800,
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </GlassPanel>
            </div>
          </div>
        )}

        {/* TAB 2: LISTA REGOLE E MATRICE CLIENTI */}
        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <GlassPanel padding="md" radius="lg">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-md)',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `Tutte (${rules.length})` },
                    { id: 'SELECTED_CLIENTS', label: 'Clienti Scelti' },
                    { id: 'CLIENT_CATEGORY', label: 'Categorie Clienti' },
                    { id: 'ALL_CLIENTS', label: 'Tutti i Clienti' },
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      size="sm"
                      variant={filterClientScope === tab.id ? 'primary' : 'secondary'}
                      onClick={() => setFilterClientScope(tab.id)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                <div style={{ width: '320px' }}>
                  <TextInput
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Cerca regola per cliente, SKU, marchio..."
                    leftIcon={<Search size={14} />}
                    fullWidth
                  />
                </div>
              </div>
            </GlassPanel>

            {filteredRules.length === 0 ? (
              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-xl)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Nessuna regola di sconto trovata.
                </div>
              </GlassPanel>
            ) : (
              filteredRules.map(rule => {
                const expired = isDiscountRuleExpired(rule);
                const ruleMatchedClients = clients.filter(c =>
                  doesRuleMatchClient(rule, {
                    clientId: c.id,
                    clientCode: c.zucchettiCode,
                    clientCategory: normalizeClientCategoryCode(
                      c.categoriaCode || c.customerType,
                      c.discount
                    ),
                    baseDiscount: c.discount,
                  })
                );

                return (
                  <GlassPanel key={rule.id} padding="md" radius="lg">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 'var(--spacing-md)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginBottom: '6px',
                          }}
                        >
                          <Badge
                            variant={
                              !rule.isActive
                                ? 'neutral'
                                : expired
                                ? 'danger'
                                : 'success'
                            }
                            size="sm"
                          >
                            {!rule.isActive
                              ? 'Disattivata'
                              : expired
                              ? 'Scaduta / Consumata'
                              : 'Attiva'}
                          </Badge>
                          <Badge variant="primary" size="sm">
                            {formatTargetBadge(rule)}
                          </Badge>
                          <Badge variant="warning" size="sm">
                            {rule.calculationMode === 'EXTRA_CASCADE'
                              ? `Extra +${rule.discountValue}% a cascata`
                              : `Fisso ${rule.discountValue}%`}
                          </Badge>
                          <Badge variant="neutral" size="sm">
                            {rule.expiryType === 'FIRST_PURCHASE'
                              ? '🎁 Sul 1° Acquisto'
                              : rule.expiryType === 'NEXT_PURCHASE'
                              ? '🛒 Sul Prossimo Acquisto'
                              : rule.expiresAt
                              ? `Scade: ${formatExpiryDisplay(rule.expiresAt)}`
                              : '∞ Senza scadenza'}
                          </Badge>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                          {rule.name || 'Regola Sconto B2B'}
                        </div>

                        {/* Dettaglio clienti associati */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {rule.clientScope === 'ALL_CLIENTS' ? (
                            <Badge variant="primary" size="sm">
                              Tutti i clienti ({clients.length})
                            </Badge>
                          ) : rule.clientScope === 'CLIENT_CATEGORY' ? (
                            (rule.clientCategories || []).map(cat => (
                              <Badge key={cat} variant="primary" size="sm">
                                Categoria: {cat.toUpperCase()}
                              </Badge>
                            ))
                          ) : (
                            ruleMatchedClients.slice(0, 12).map(c => (
                              <Badge key={c.id} variant="neutral" size="sm">
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  {c.companyName} ({c.zucchettiCode})
                                  {ruleMatchedClients.length > 1 && (
                                    <span
                                      style={{ cursor: 'pointer', fontWeight: 800 }}
                                      title="Rimuovi questo cliente dalla regola"
                                      onClick={() => handleRemoveRuleFromSingleClient(rule, c)}
                                    >
                                      ×
                                    </span>
                                  )}
                                </span>
                              </Badge>
                            ))
                          )}
                        </div>

                        {/* Dettaglio target */}
                        {rule.targetType === 'BRAND' && rule.targetBrands.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              marginTop: '6px',
                            }}
                          >
                            {rule.targetBrands.map(b => (
                              <Badge key={b} variant="neutral" size="sm">
                                {resolveFacetLabel(facets.brands, b)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Switch
                          checked={rule.isActive}
                          onChange={() => handleToggleRule(rule)}
                          label={rule.isActive ? 'Attiva' : 'Off'}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit3 size={14} />}
                          onClick={() => handleEditRule(rule)}
                        >
                          Modifica
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={14} />}
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </GlassPanel>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
