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

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

export default function B2BCatalogBuilderApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [loading, setLoading] = useState(false);

  const [facets, setFacets] = useState<any>({
    brands: [],
    productGroups: [],
    families: [],
    categories: [],
  });

  // Catalog Filters
  const [query, setQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<
    'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG'
  >('ALL_WAREHOUSES');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [maxProducts, setMaxProducts] = useState(60);

  // Pricing Simulation & Cover Info
  const [commercialCategory, setCommercialCategory] = useState<'IST' | 'RIV'>('IST');
  const [extraDiscountPct, setExtraDiscountPct] = useState(10);
  const [calculationMode, setCalculationMode] = useState<
    'EXTRA_CASCADE' | 'EXTRA_ADDITIVE' | 'FIXED_TOTAL'
  >('EXTRA_CASCADE');
  const [expiryBadgeText, setExpiryBadgeText] = useState('Valido sul 1° Acquisto');
  const [targetCompanyName, setTargetCompanyName] = useState('Partner B2B Selezionato');
  const [offerTitle, setOfferTitle] = useState(
    'Catalogo Personalizzato Materiale Elettrico, Illuminazione & Ferramenta'
  );
  const [minOrderText, setMinOrderText] = useState("Nessun minimo d'ordine sul 1° acquisto");
  const [shippingText, setShippingText] = useState(
    'Spedizione 24/48h da Deposito Principale (5/7gg da Deposito Esterno)'
  );

  // Results
  const [products, setProducts] = useState<any[]>([]);
  const [effectiveDiscountPct, setEffectiveDiscountPct] = useState(46);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [initRes, searchRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/b2b-discounts/init`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/admin/b2b-catalog/search`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            warehouseFilter: 'ALL_WAREHOUSES',
            limit: 60,
            commercialCategory: 'IST',
            extraDiscountPct: 10,
            calculationMode: 'EXTRA_CASCADE',
          }),
        }),
      ]);

      const initData = await initRes.json();
      if (initData.success && initData.facets) {
        setFacets(initData.facets);
      }

      const searchData = await searchRes.json();
      if (searchData.success) {
        setProducts(searchData.products || []);
        setEffectiveDiscountPct(searchData.effectiveDiscountPct || 46);
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

  const handleSearchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/b2b-catalog/search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          query,
          warehouseFilter,
          brands: selectedBrand ? [selectedBrand] : [],
          productGroups: selectedGroup ? [selectedGroup] : [],
          families: selectedFamily ? [selectedFamily] : [],
          limit: maxProducts,
          commercialCategory,
          extraDiscountPct,
          calculationMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setEffectiveDiscountPct(data.effectiveDiscountPct || 40);
      }
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
          catalogWarehouse: warehouseFilter,
          catalogMaxProducts: maxProducts,
          offerTitle,
          minOrderAmountText: minOrderText,
          freeShippingText: shippingText,
          istExtraDiscountPct: commercialCategory === 'IST' ? extraDiscountPct : undefined,
          rivExtraDiscountPct: commercialCategory === 'RIV' ? extraDiscountPct : undefined,
          discountCalculationMode: calculationMode,
          globalCatalogFiltersJson: {
            brand: selectedBrand,
            productGroup: selectedGroup,
            family: selectedFamily,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          'Preset Catalogo PDF salvato! Verrà allegato automaticamente alle prossime email AI SDR.'
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
                  label: `Configura & Filtra Articoli (${products.length})`,
                  icon: <Package size={14} />,
                },
                {
                  id: 'preview',
                  label: 'Anteprima Copertina Integrata & Pagina 2 Riepilogo',
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
                Usa come Catalogo Allegato AI SDR
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
                Stampa / Esporta PDF
              </Button>
            </div>
          </div>
        </StickyHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
          {activeTab === 'builder' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '340px 1fr',
                gap: 'var(--spacing-lg)',
                alignItems: 'start',
              }}
            >
              <GlassPanel padding="lg" radius="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    1. Disponibilità & Tassonomia Zucchetti
                  </div>

                  <TextInput
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
                      Filtro Magazzino
                    </label>
                    <Select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value as any)}
                      options={[
                        {
                          value: 'ALL_WAREHOUSES',
                          label: 'Tutti i Depositi (Principale 2gg + Esterno 7gg)',
                        },
                        {
                          value: 'MAIN_2GG',
                          label: 'Solo Deposito Principale (Consegna 2gg)',
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
                    2. Simulazione Listino & Sconto Primo Acquisto
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
                      Listino Base Categoria
                    </label>
                    <Select
                      value={commercialCategory}
                      onChange={(e) => setCommercialCategory(e.target.value as 'IST' | 'RIV')}
                      options={[
                        {
                          value: 'IST',
                          label: 'Installatori & Professionisti (IST — Base 40%)',
                        },
                        {
                          value: 'RIV',
                          label: 'Rivenditori & Ferramenta (RIV — Base 50%)',
                        },
                      ]}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <TextInput
                      label="Extra Sconto (%)"
                      type="number"
                      value={String(extraDiscountPct)}
                      onChange={(e) => setExtraDiscountPct(Number(e.target.value))}
                    />
                    <TextInput
                      label="Max Articoli"
                      type="number"
                      value={String(maxProducts)}
                      onChange={(e) => setMaxProducts(Number(e.target.value))}
                    />
                  </div>

                  <TextInput
                    label="Azienda Destinataria (senza codici interni)"
                    value={targetCompanyName}
                    onChange={(e) => setTargetCompanyName(e.target.value)}
                  />

                  <TextInput
                    label="Badge Scadenza Sconto sulle Schede"
                    value={expiryBadgeText}
                    onChange={(e) => setExpiryBadgeText(e.target.value)}
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
                      Modalità Calcolo Extra Sconto
                    </label>
                    <Select
                      value={calculationMode}
                      onChange={(e) => setCalculationMode(e.target.value as any)}
                      options={[
                        { value: 'EXTRA_CASCADE', label: 'Extra in Cascata' },
                        { value: 'EXTRA_ADDITIVE', label: 'Somma Diretta' },
                        { value: 'FIXED_TOTAL', label: 'Sconto Totale Fisso' },
                      ]}
                    />
                  </div>

                  <TextInput
                    label="Titolo Copertina Catalogo"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                  />

                  <TextInput
                    label="Condizione Minimo d'Ordine (Pagina 2)"
                    value={minOrderText}
                    onChange={(e) => setMinOrderText(e.target.value)}
                  />

                  <TextInput
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
                    Aggiorna Selezione & Prezzi Netti
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
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      Articoli nel Catalogo ({products.length}) — Sconto Netto Applicato:{' '}
                      <span style={{ color: 'var(--color-primary)' }}>
                        -{effectiveDiscountPct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Ogni scheda segnala automaticamente la scadenza dello sconto attivo (
                      {expiryBadgeText}).
                    </div>
                  </div>
                  <Badge variant="success" size="md">
                    {commercialCategory === 'RIV'
                      ? 'Listino Rivenditori & Ferramenta (50%)'
                      : 'Listino Installatori & Professionisti (40%)'}
                  </Badge>
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
                          <Badge
                            variant={prod.stockMain > 0 ? 'success' : 'warning'}
                            size="sm"
                          >
                            {prod.stockMain > 0 ? 'Consegna 2gg' : 'Consegna 7gg'}
                          </Badge>
                        </div>

                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            lineHeight: 1.35,
                            marginBottom: '6px',
                          }}
                        >
                          {prod.title}
                        </div>

                        {extraDiscountPct > 0 && (
                          <div style={{ marginBottom: '6px' }}>
                            <Badge variant="warning" size="sm">
                              ⏳ {expiryBadgeText} (-{effectiveDiscountPct}%)
                            </Badge>
                          </div>
                        )}
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
                          € {Number(prod.listPrice).toFixed(2)}
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

          {/* TAB 2: ANTEPRIMA COPERTINA INTEGRATA (STRISCE VERDI IN ALTO E IN FONDO) + PAGINA 2 DATI */}
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

                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      maxWidth: '580px',
                      lineHeight: 1.3,
                    }}
                  >
                    {offerTitle}
                  </div>

                  <div
                    style={{
                      fontSize: '15px',
                      color: '#cbd5e1',
                      maxWidth: '540px',
                      lineHeight: 1.6,
                    }}
                  >
                    Soluzioni professionali ad alta rotazione selezionate per installatori,
                    imprese, tecnici specializzati, rivendite edili e ferramenta, con condizioni
                    commerciali B2B dedicate.
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
                    Riservato a: {targetCompanyName}
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

              {/* PAGINA 2: RIEPILOGO DATI AZIENDA & CONDIZIONI COMMERCIALI (SENZA CODICI INTERNI E SENZA CONTEGGIO PAGINE/ARTICOLI) */}
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
                      Riepilogo Condizioni Riservate &amp; Dettagli Offerta
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>
                      Izzo Distribuzione — Forniture B2B Materiale Elettrico, Illuminazione e
                      Ferramenta
                    </div>
                  </div>
                  <CheckCircle2 size={28} color="#16a34a" />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
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
                      AGEVOLAZIONE PRIMO ACQUISTO ATTIVA
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#15803d',
                        marginTop: '4px',
                      }}
                    >
                      Sconto Netto Totale -{effectiveDiscountPct}% ({expiryBadgeText})
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
                      LOGISTICA &amp; TEMPI DI CONSEGNA
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                      {shippingText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
