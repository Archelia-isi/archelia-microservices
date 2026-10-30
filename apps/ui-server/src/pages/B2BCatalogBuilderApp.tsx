import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  Save,
  Package,
  Sparkles,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import GlassPanel from '../components/ui/GlassPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import Select from '../components/ui/Select';
import { useWindowStore } from '../store/useWindowStore';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

export default function B2BCatalogBuilderApp() {
  const appContext = useWindowStore((state) => state.windows['b2b_catalog_builder']?.appContext);

  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [loading, setLoading] = useState(false);

  const [facets, setFacets] = useState<any>({
    brands: [],
    productGroups: [],
    families: [],
    categories: [],
  });

  // Catalog Filters — Default fisso: Tutti e solo i prodotti 2gg (MAIN_2GG)
  const [query, setQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<
    'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG'
  >('MAIN_2GG');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [maxProducts, setMaxProducts] = useState(250);

  // Pricing Simulation & Cover Info — Default: X% + Y% e Catalistino Riservato a [Cliente]
  const [commercialCategory, setCommercialCategory] = useState<'IST' | 'RIV'>('IST');
  const [extraDiscountPct, setExtraDiscountPct] = useState(10);
  const [calculationMode, setCalculationMode] = useState<
    'EXTRA_CASCADE' | 'EXTRA_ADDITIVE' | 'FIXED_TOTAL'
  >('EXTRA_CASCADE');
  const [targetCompanyName, setTargetCompanyName] = useState('Cliente Partner B2B');
  const [minOrderText, setMinOrderText] = useState("Nessun minimo d'ordine sul tuo 1° acquisto");
  const [shippingText, setShippingText] = useState(
    'Spedizione rapida 24/48h in tutta Italia da Deposito Principale (2gg)'
  );

  // Results
  const [products, setProducts] = useState<any[]>([]);

  const baseDiscountPct = commercialCategory === 'RIV' ? 50 : 40;
  const discountFormulaLabel =
    extraDiscountPct > 0
      ? `${baseDiscountPct}% + ${extraDiscountPct}%`
      : `${baseDiscountPct}%`;
  const dynamicCatalogTitle = `Catalistino Riservato a ${targetCompanyName}`;
  const dynamicCatalogSubtitle = `Offerta esclusiva valida per il primo acquisto — Sconto Riservato ${discountFormulaLabel}`;

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const executeCatalogSearch = async (params: {
    q?: string;
    wh?: 'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG';
    brand?: string;
    group?: string;
    family?: string;
    limit?: number;
    cat?: 'IST' | 'RIV';
    extraPct?: number;
    mode?: 'EXTRA_CASCADE' | 'EXTRA_ADDITIVE' | 'FIXED_TOTAL';
  }) => {
    const res = await fetch(`${API_URL}/api/admin/b2b-catalog/search`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        query: params.q ?? query,
        warehouseFilter: params.wh ?? warehouseFilter,
        brands: (params.brand ?? selectedBrand) ? [params.brand ?? selectedBrand] : [],
        productGroups: (params.group ?? selectedGroup) ? [params.group ?? selectedGroup] : [],
        families: (params.family ?? selectedFamily) ? [params.family ?? selectedFamily] : [],
        limit: params.limit ?? maxProducts,
        commercialCategory: params.cat ?? commercialCategory,
        extraDiscountPct: params.extraPct ?? extraDiscountPct,
        calculationMode: params.mode ?? calculationMode,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts(data.products || []);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const initCat = appContext?.commercialCategory === 'RIV' ? 'RIV' : 'IST';
      const initExtra =
        appContext?.extraDiscountPct !== undefined ? Number(appContext.extraDiscountPct) : 10;
      const initWh = appContext?.warehouseFilter || 'MAIN_2GG';

      const [initRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/b2b-discounts/init`, { headers: authHeaders() }),
        executeCatalogSearch({
          wh: initWh,
          limit: 250,
          cat: initCat,
          extraPct: initExtra,
          mode: 'EXTRA_CASCADE',
        }),
      ]);

      const initData = await initRes.json();
      if (initData.success && initData.facets) {
        setFacets(initData.facets);
      }
    } catch (e) {
      toast.error('Errore caricamento Catalog Builder B2B');
    } finally {
      setLoading(false);
      setIsAppReady(true);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Sync when opened via AI SDR with specific client context
  useEffect(() => {
    if (!appContext) return;
    const nextCompany = appContext.targetCompanyName || 'Cliente Partner B2B';
    const nextCat: 'IST' | 'RIV' = appContext.commercialCategory === 'RIV' ? 'RIV' : 'IST';
    const nextExtra =
      appContext.extraDiscountPct !== undefined ? Number(appContext.extraDiscountPct) : 10;
    const nextWh = appContext.warehouseFilter || 'MAIN_2GG';

    setTargetCompanyName(nextCompany);
    setCommercialCategory(nextCat);
    setExtraDiscountPct(nextExtra);
    setWarehouseFilter(nextWh);
    setCalculationMode('EXTRA_CASCADE');
    if (appContext.minOrderText) setMinOrderText(appContext.minOrderText);
    if (appContext.shippingText) setShippingText(appContext.shippingText);
    if (appContext.openPreview) setActiveTab('preview');

    executeCatalogSearch({
      wh: nextWh,
      limit: 250,
      cat: nextCat,
      extraPct: nextExtra,
      mode: 'EXTRA_CASCADE',
    });
  }, [appContext]);

  const handleSearchCatalog = async () => {
    try {
      setLoading(true);
      await executeCatalogSearch({});
    } catch (e) {
      toast.error('Errore ricerca articoli catalogo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsSdrPreset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/sdr/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          attachCatalogPdf: true,
          catalogWarehouse: 'MAIN_2GG',
          catalogStockMode: 'BADGE_ONLY',
          catalogMaxProducts: maxProducts,
          offerTitle: 'Offerta esclusiva valida per il primo acquisto',
          minOrderAmountText: minOrderText,
          freeShippingText: shippingText,
          istExtraDiscountPct: commercialCategory === 'IST' ? extraDiscountPct : undefined,
          rivExtraDiscountPct: commercialCategory === 'RIV' ? extraDiscountPct : undefined,
          discountCalculationMode: 'EXTRA_CASCADE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          'Preset Catalistino 2gg (X% + Y%) salvato nel generatore automatico AI SDR!'
        );
      }
    } catch (e) {
      toast.error('Errore salvataggio preset AI SDR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSplashScreen
        isLoading={!isAppReady}
        appName="Catalog Builder B2B"
        icon={<FileText size={56} color="white" />}
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
                  id: 'builder',
                  label: `Configura & Filtra Articoli 2gg (${products.length})`,
                  icon: <Package size={14} />,
                },
                {
                  id: 'preview',
                  label: `Anteprima Catalistino Riservato (${dynamicCatalogTitle})`,
                  icon: <Eye size={14} />,
                },
              ]}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<Save size={14} />}
                onClick={handleSaveAsSdrPreset}
                disabled={loading}
              >
                Allinea Preset con AI SDR
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => {
                  setActiveTab('preview');
                  setTimeout(() => window.print(), 300);
                }}
              >
                Stampa / Esporta Catalistino PDF
              </Button>
            </div>
          </div>
        </StickyHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
          {activeTab === 'builder' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: 'var(--spacing-lg)',
                alignItems: 'start',
              }}
            >
              <GlassPanel padding="lg" radius="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    1. Disponibilità (2gg) &amp; Tassonomia Zucchetti
                  </div>

                  <TextInput
                    fullWidth
                    label="Cerca SKU o Descrizione"
                    placeholder="Es. interruttore, led, cacciavite..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    leftIcon={<Search size={14} />}
                  />

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Filtro Magazzino (AI SDR usa sempre Solo 2gg)
                    </label>
                    <Select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value as any)}
                      options={[
                        {
                          value: 'MAIN_2GG',
                          label: '🟢 Solo Deposito Principale (Tutti e solo i prodotti 2gg)',
                        },
                        {
                          value: 'ALL_WAREHOUSES',
                          label: 'Tutti i Depositi (Principale 2gg + Esterno 7gg)',
                        },
                        {
                          value: 'EXTERNAL_7GG',
                          label: 'Solo Deposito Esterno (Consegna 7gg)',
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
                      Marchio
                    </label>
                    <Select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      options={[
                        { value: '', label: 'Tutti i Marchi' },
                        ...(facets.brands || []).map((b: any) => ({
                          value: b.value,
                          label: `${b.value} (${b.count})`,
                        })),
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
                      Gruppo Merceologico
                    </label>
                    <Select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      options={[
                        { value: '', label: 'Tutti i Gruppi' },
                        ...(facets.productGroups || []).map((g: any) => ({
                          value: g.value,
                          label: `${g.value} (${g.count})`,
                        })),
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
                      Famiglia Prodotto
                    </label>
                    <Select
                      value={selectedFamily}
                      onChange={(e) => setSelectedFamily(e.target.value)}
                      options={[
                        { value: '', label: 'Tutte le Famiglie' },
                        ...(facets.families || []).map((f: any) => ({
                          value: f.value,
                          label: `${f.value} (${f.count})`,
                        })),
                      ]}
                    />
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      marginTop: '8px',
                    }}
                  >
                    2. Destinatario &amp; Formula Sconto X% + Y%
                  </div>

                  <TextInput
                    fullWidth
                    label="Ragione Sociale Cliente Destinatario"
                    value={targetCompanyName}
                    onChange={(e) => setTargetCompanyName(e.target.value)}
                  />

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Categoria Listino Base (X%)
                    </label>
                    <Select
                      value={commercialCategory}
                      onChange={(e) => setCommercialCategory(e.target.value as 'IST' | 'RIV')}
                      options={[
                        {
                          value: 'IST',
                          label: 'Installatori & Professionisti (IST — X = 40%)',
                        },
                        {
                          value: 'RIV',
                          label: 'Rivenditori & Ferramenta (RIV — X = 50%)',
                        },
                      ]}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <TextInput
                      fullWidth
                      label="Extra 1° Acquisto Y%"
                      type="number"
                      value={String(extraDiscountPct)}
                      onChange={(e) => setExtraDiscountPct(Number(e.target.value))}
                    />
                    <TextInput
                      fullWidth
                      label="Max Articoli 2gg"
                      type="number"
                      value={String(maxProducts)}
                      onChange={(e) => setMaxProducts(Number(e.target.value))}
                    />
                  </div>

                  {/* Preview automatica Titolo e Sottotitolo */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                      {dynamicCatalogTitle}
                    </div>
                    <div style={{ fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                      {dynamicCatalogSubtitle}
                    </div>
                  </div>

                  <TextInput
                    fullWidth
                    label="Condizione Minimo d'Ordine (Pagina 2)"
                    value={minOrderText}
                    onChange={(e) => setMinOrderText(e.target.value)}
                  />

                  <TextInput
                    fullWidth
                    label="Logistica & Consegna (Pagina 2)"
                    value={shippingText}
                    onChange={(e) => setShippingText(e.target.value)}
                  />

                  <Button
                    variant="primary"
                    size="md"
                    icon={<Sparkles size={15} />}
                    onClick={handleSearchCatalog}
                    disabled={loading}
                  >
                    Aggiorna Prodotti 2gg &amp; Sconto {discountFormulaLabel}
                  </Button>
                </div>
              </GlassPanel>

              <GlassPanel padding="lg" radius="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>
                      {dynamicCatalogTitle} ({products.length} prodotti 2gg)
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                      {dynamicCatalogSubtitle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant="success" size="md">
                      🟢 Solo Bollino di Giacenza (2gg)
                    </Badge>
                    <Badge variant="primary" size="md">
                      Sconto Visualizzato: {discountFormulaLabel}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                    gap: 'var(--spacing-md)',
                  }}
                >
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.65)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            {prod.sku}
                          </span>
                          {/* SOLO BOLLINO DI GIACENZA — MAI QUANTITÀ NUMERICHE */}
                          <Badge
                            variant={prod.stockMain > 0 ? 'success' : 'warning'}
                            size="sm"
                          >
                            {prod.stockMain > 0
                              ? '🟢 Disponibile 2gg'
                              : '🟡 Disponibile 7gg'}
                          </Badge>
                        </div>

                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            lineHeight: 1.35,
                            marginBottom: '8px',
                          }}
                        >
                          {prod.title}
                        </div>

                        {/* SCONTO VISUALIZZATO SEMPRE X% + Y% */}
                        <div style={{ marginBottom: '6px' }}>
                          <Badge variant="warning" size="sm">
                            🏷️ Sconto 1° Acquisto: {discountFormulaLabel}
                          </Badge>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          borderTop: '1px solid var(--color-border)',
                          paddingTop: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            textDecoration: 'line-through',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Listino € {Number(prod.listPrice).toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#15803d',
                          }}
                        >
                          € {Number(prod.netPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* TAB 2: ANTEPRIMA COPERTINA INTEGRATA + PAGINA 2 CONDIZIONI + GRIGLIA PRODOTTI 2GG */}
          {activeTab === 'preview' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xl)',
                alignItems: 'center',
              }}
            >
              {/* PAGINA 1: COPERTINA UNICA INTEGRATA CON STRISCE VERDI IN ALTO E IN FONDO */}
              <div
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  background: '#0a0f1d',
                  color: '#ffffff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                }}
              >
                {/* Striscia Verde In Alto */}
                <div
                  style={{
                    height: '18px',
                    width: '100%',
                    background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #15803d 100%)',
                  }}
                />

                {/* Contenuto Centrale Integrato con Logo al Centro */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '64px 56px',
                    gap: '28px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: '#4ade80',
                      fontWeight: 700,
                    }}
                  >
                    DISTRIBUZIONE B2B PER PROFESSIONISTI, INSTALLATORI E FERRAMENTA
                  </div>

                  {/* Logo Centrale */}
                  <div
                    style={{
                      padding: '24px 40px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '36px',
                        fontWeight: 900,
                        letterSpacing: '2px',
                        color: '#ffffff',
                      }}
                    >
                      IZZO DISTRIBUZIONE
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#86efac',
                        letterSpacing: '1.5px',
                        marginTop: '4px',
                      }}
                    >
                      ELETTRICO • ILLUMINAZIONE • FERRAMENTA TECNICA
                    </div>
                  </div>

                  {/* TITOLO DINAMICO SUL CLIENTE */}
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      maxWidth: '620px',
                      lineHeight: 1.3,
                      color: '#ffffff',
                    }}
                  >
                    {dynamicCatalogTitle}
                  </div>

                  {/* SOTTOTITOLO DINAMICO SULL'OFFERTA 1° ACQUISTO E FORMULA X% + Y% */}
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#4ade80',
                      maxWidth: '580px',
                      lineHeight: 1.45,
                    }}
                  >
                    {dynamicCatalogSubtitle}
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      color: '#cbd5e1',
                      maxWidth: '540px',
                      lineHeight: 1.6,
                    }}
                  >
                    Selezione integrale dei prodotti disponibili nel Deposito Principale (Consegna
                    rapida 2gg) con listino riservato e agevolazione sul primo acquisto già
                    calcolata.
                  </div>

                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px 32px',
                      borderRadius: '999px',
                      background: 'rgba(22, 163, 74, 0.2)',
                      border: '1px solid rgba(74, 222, 128, 0.45)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#bbf7d0',
                    }}
                  >
                    Sconto Riservato 1° Acquisto: {discountFormulaLabel} • Pronta Consegna 2gg
                  </div>
                </div>

                {/* Striscia Verde In Fondo */}
                <div
                  style={{
                    height: '18px',
                    width: '100%',
                    background: 'linear-gradient(90deg, #15803d 0%, #22c55e 50%, #16a34a 100%)',
                  }}
                />
              </div>

              {/* PAGINA 2: RIEPILOGO DATI AZIENDA & CONDIZIONI COMMERCIALI */}
              <div
                style={{
                  width: '794px',
                  padding: '48px',
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                }}
              >
                <div
                  style={{
                    borderBottom: '3px solid #16a34a',
                    paddingBottom: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {dynamicCatalogTitle}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                      {dynamicCatalogSubtitle}
                    </div>
                  </div>
                  <CheckCircle2 size={28} color="#16a34a" />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '28px',
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                      AZIENDA DESTINATARIA
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                      {targetCompanyName}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                      OFFERTA VALIDA PER IL PRIMO ACQUISTO
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#15803d',
                        marginTop: '4px',
                      }}
                    >
                      Sconto Riservato {discountFormulaLabel} (Solo Prodotti 2gg)
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                      CONDIZIONI D&apos;ORDINE
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                      {minOrderText}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                      DISPONIBILITÀ &amp; TEMPI DI CONSEGNA
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                      {shippingText}
                    </div>
                  </div>
                </div>

                {/* SCHEDE PRODOTTI 2GG CON BOLLINO DI GIACENZA E SCONTO X% + Y% */}
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    marginBottom: '12px',
                    color: '#0f172a',
                  }}
                >
                  Articoli Disponibili in Pronta Consegna 2gg — Sconto {discountFormulaLabel}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}
                >
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#64748b',
                            }}
                          >
                            {prod.sku}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '999px',
                              background: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            🟢 Disponibile 2gg
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.3,
                            marginBottom: '4px',
                          }}
                        >
                          {prod.title}
                        </div>
                        <div
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#b45309',
                          }}
                        >
                          Sconto 1° Acquisto: {discountFormulaLabel}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            textDecoration: 'line-through',
                            color: '#94a3b8',
                          }}
                        >
                          € {Number(prod.listPrice).toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#15803d',
                          }}
                        >
                          € {Number(prod.netPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
