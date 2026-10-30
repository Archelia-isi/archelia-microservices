import { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Layers,
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

export default function B2BDiscountsApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('active_rules');
  const [loading, setLoading] = useState(false);

  const [rules, setRules] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [promoProspects, setPromoProspects] = useState<any[]>([]);
  const [facets, setFacets] = useState<any>({
    brands: [],
    productGroups: [],
    families: [],
    categories: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    clientScope: 'ALL_CLIENTS',
    clientId: '',
    clientName: '',
    targetCategory: 'IST',
    targetType: 'ALL_CATALOG',
    selectedTargetValue: '',
    calculationMode: 'EXTRA_CASCADE',
    discountValue: 10,
    expiryType: 'FIRST_PURCHASE',
    expiresAt: '',
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchInit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/b2b-discounts/init`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setClients(data.clients || []);
        setPromoProspects(data.promoProspects || []);
        if (data.facets) setFacets(data.facets);
      }
    } catch (e) {
      toast.error('Errore caricamento regole sconto B2B');
    } finally {
      setLoading(false);
      setIsAppReady(true);
    }
  };

  useEffect(() => {
    fetchInit();
  }, []);

  const handleSaveRule = async () => {
    if (!form.name.trim()) {
      toast.error('Inserisci un nome per la regola di sconto');
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, any> = {
        id: form.id || undefined,
        name: form.name,
        clientScope: form.clientScope,
        clientId: form.clientScope === 'SINGLE_CLIENT' ? form.clientId : null,
        clientName: form.clientScope === 'SINGLE_CLIENT' ? form.clientName : null,
        clientCategories: form.clientScope === 'CATEGORY' ? [form.targetCategory] : [],
        targetType: form.targetType,
        targetBrands:
          form.targetType === 'BRAND' && form.selectedTargetValue
            ? [form.selectedTargetValue]
            : [],
        targetProductGroups:
          form.targetType === 'PRODUCT_GROUP' && form.selectedTargetValue
            ? [form.selectedTargetValue]
            : [],
        targetFamilies:
          form.targetType === 'FAMILY' && form.selectedTargetValue
            ? [form.selectedTargetValue]
            : [],
        targetCategories:
          form.targetType === 'CATEGORY' && form.selectedTargetValue
            ? [form.selectedTargetValue]
            : [],
        calculationMode: form.calculationMode,
        discountValue: Number(form.discountValue),
        expiryType: form.expiryType,
        expiresAt: form.expiryType === 'DATE' && form.expiresAt ? form.expiresAt : null,
        isActive: true,
      };

      const res = await fetch(`${API_URL}/api/admin/b2b-discounts/rules`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Regola sconto B2B salvata con successo!');
        setIsModalOpen(false);
        fetchInit();
      } else {
        toast.error(data.error || 'Errore salvataggio regola');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/b2b-discounts/rules/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Stato regola aggiornato');
        fetchInit();
      }
    } catch (e) {
      toast.error('Errore aggiornamento regola');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/b2b-discounts/rules/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Regola sconto eliminata');
        fetchInit();
      }
    } catch (e) {
      toast.error('Errore eliminazione regola');
    }
  };

  const formatExpiryLabel = (r: any) => {
    if (r.expiryType === 'FIRST_PURCHASE') return '🎁 Sul Primo Acquisto';
    if (r.expiryType === 'NEXT_PURCHASE') return '🛒 Sul Prossimo Acquisto';
    if (r.expiryType === 'DATE' && r.expiresAt) {
      return `📅 Fino al ${new Date(r.expiresAt).toLocaleDateString('it-IT')}`;
    }
    return '♾️ Nessuna Scadenza';
  };

  const filteredRules = rules.filter((r) => {
    if (activeTab === 'first_purchase') return r.expiryType === 'FIRST_PURCHASE';
    if (activeTab === 'next_purchase') return r.expiryType === 'NEXT_PURCHASE';
    return true;
  });

  return (
    <>
      <AppSplashScreen
        isLoading={!isAppReady}
        appName="Motore Sconti B2B"
        icon={<Percent size={56} color="white" />}
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
                  id: 'active_rules',
                  label: `Tutte le Regole (${rules.length})`,
                  icon: <Layers size={14} />,
                },
                {
                  id: 'first_purchase',
                  label: `Sul Primo Acquisto (${
                    rules.filter((r) => r.expiryType === 'FIRST_PURCHASE').length
                  })`,
                  icon: <Sparkles size={14} />,
                },
                {
                  id: 'next_purchase',
                  label: `Sul Prossimo Acquisto (${
                    rules.filter((r) => r.expiryType === 'NEXT_PURCHASE').length
                  })`,
                  icon: <Clock size={14} />,
                },
              ]}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCcw size={14} />}
                onClick={fetchInit}
              >
                Aggiorna
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setForm({
                    id: '',
                    name: '',
                    clientScope: 'ALL_CLIENTS',
                    clientId: '',
                    clientName: '',
                    targetCategory: 'IST',
                    targetType: 'ALL_CATALOG',
                    selectedTargetValue: '',
                    calculationMode: 'EXTRA_CASCADE',
                    discountValue: 10,
                    expiryType: 'FIRST_PURCHASE',
                    expiresAt: '',
                  });
                  setIsModalOpen(true);
                }}
              >
                Nuova Regola Sconto B2B
              </Button>
            </div>
          </div>
        </StickyHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <StatCard
              title="Regole Sconto Attive"
              value={rules.filter((r) => r.isActive).length}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              title="Promo Sul Primo Acquisto"
              value={rules.filter((r) => r.expiryType === 'FIRST_PURCHASE').length}
              icon={<Sparkles size={18} />}
            />
            <StatCard
              title="Promo Sul Prossimo Acquisto"
              value={rules.filter((r) => r.expiryType === 'NEXT_PURCHASE').length}
              icon={<Clock size={18} />}
            />
            <StatCard
              title="Clienti & Lead Coperti"
              value={clients.length + promoProspects.length}
              icon={<Users size={18} />}
            />
          </div>

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
                  <th style={{ padding: '10px 8px' }}>Nome Regola</th>
                  <th style={{ padding: '10px 8px' }}>Destinatari (Scope)</th>
                  <th style={{ padding: '10px 8px' }}>Perimetro Catalogo</th>
                  <th style={{ padding: '10px 8px' }}>Valore & Calcolo</th>
                  <th style={{ padding: '10px 8px' }}>Scadenza (Mostrata su Card & PDF)</th>
                  <th style={{ padding: '10px 8px' }}>Stato</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }}>{r.name}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {r.clientScope === 'ALL_CLIENTS' && (
                        <Badge variant="primary" size="sm">
                          Tutti i Clienti B2B
                        </Badge>
                      )}
                      {r.clientScope === 'CATEGORY' && (
                        <Badge variant="success" size="sm">
                          Categoria {(r.clientCategories || []).join(', ')}
                        </Badge>
                      )}
                      {r.clientScope === 'SINGLE_CLIENT' && (
                        <Badge variant="warning" size="sm">
                          Cliente: {r.clientName || r.clientId}
                        </Badge>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge variant="success" size="sm">
                          {r.targetType === 'ALL_CATALOG'
                            ? '🟢 Tutti e solo i 2gg'
                            : r.targetType}
                        </Badge>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {(r.clientCategories || []).includes('RIV')
                          ? `50% + ${r.discountValue}%`
                          : (r.clientCategories || []).includes('IST')
                          ? `40% + ${r.discountValue}%`
                          : `X% + ${r.discountValue}%`}
                      </span>{' '}
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        (Cascata X% + Y%)
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <Badge
                        variant={
                          r.expiryType === 'FIRST_PURCHASE' || r.expiryType === 'NEXT_PURCHASE'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {formatExpiryLabel(r)}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <Badge variant={r.isActive ? 'success' : 'neutral'} size="sm">
                        {r.isActive ? 'Attiva' : 'Consumata / Disattiva'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleRule(r.id)}
                        >
                          {r.isActive ? 'Disattiva' : 'Attiva'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          onClick={() => handleDeleteRule(r.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Configura Regola Sconto B2B (Sincronizzata con Storefront & AI SDR)"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={handleSaveRule} disabled={loading}>
              Salva Regola Sconto
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TextInput
            fullWidth
            label="Nome Regola Commerciale"
            placeholder="Es. Primo Acquisto (40% + 10% Solo 2gg) — Azienda S.r.l."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Ambito Clienti
              </label>
              <Select
                value={form.clientScope}
                onChange={(e) => setForm({ ...form, clientScope: e.target.value })}
                options={[
                  { value: 'ALL_CLIENTS', label: 'Tutti i Clienti B2B' },
                  { value: 'CATEGORY', label: 'Per Categoria Commerciale (IST 40% / RIV 50%)' },
                  { value: 'SINGLE_CLIENT', label: 'Cliente Singolo (Attivo o In Attivazione)' },
                ]}
              />
            </div>

            {form.clientScope === 'CATEGORY' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Categoria Target
                </label>
                <Select
                  value={form.targetCategory}
                  onChange={(e) => setForm({ ...form, targetCategory: e.target.value })}
                  options={[
                    { value: 'IST', label: 'Installatori & Professionisti (IST — Base 40%)' },
                    { value: 'RIV', label: 'Rivenditori & Ferramenta (RIV — Base 50%)' },
                  ]}
                />
              </div>
            )}

            {form.clientScope === 'SINGLE_CLIENT' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Seleziona Cliente o Prospect in Attivazione
                </label>
                <Select
                  value={form.clientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found =
                      promoProspects.find((p) => p.id === id) ||
                      clients.find((c) => c.id === id);
                    setForm({
                      ...form,
                      clientId: id,
                      clientName: found?.companyName || id,
                    });
                  }}
                  options={[
                    { value: '', label: 'Seleziona azienda...' },
                    ...promoProspects.map((p) => ({
                      value: p.id,
                      label: `[IN ATTIVAZIONE] ${p.companyName} (${p.username})`,
                    })),
                    ...clients.map((c) => ({
                      value: c.id,
                      label: `[ATTIVO] ${c.companyName || c.username}`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Perimetro Catalogo
              </label>
              <Select
                value={form.targetType}
                onChange={(e) =>
                  setForm({ ...form, targetType: e.target.value, selectedTargetValue: '' })
                }
                options={[
                  { value: 'ALL_CATALOG', label: 'Tutto il Catalogo Zucchetti' },
                  { value: 'BRAND', label: 'Marchio Specifico' },
                  { value: 'PRODUCT_GROUP', label: 'Gruppo Merceologico' },
                  { value: 'FAMILY', label: 'Famiglia Prodotto' },
                  { value: 'CATEGORY', label: 'Categoria Prodotto' },
                ]}
              />
            </div>

            {form.targetType !== 'ALL_CATALOG' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Valore Target ({form.targetType})
                </label>
                <Select
                  value={form.selectedTargetValue}
                  onChange={(e) => setForm({ ...form, selectedTargetValue: e.target.value })}
                  options={[
                    { value: '', label: 'Seleziona...' },
                    ...(form.targetType === 'BRAND'
                      ? facets.brands
                      : form.targetType === 'PRODUCT_GROUP'
                      ? facets.productGroups
                      : form.targetType === 'FAMILY'
                      ? facets.families
                      : facets.categories
                    ).map((f: any) => ({
                      value: f.value,
                      label: `${f.value} (${f.count})`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Modalità di Calcolo
              </label>
              <Select
                value={form.calculationMode}
                onChange={(e) => setForm({ ...form, calculationMode: e.target.value })}
                options={[
                  { value: 'EXTRA_CASCADE', label: 'Extra Sconto in Cascata' },
                  { value: 'EXTRA_ADDITIVE', label: 'Somma Diretta Percentuale' },
                  { value: 'FIXED_TOTAL', label: 'Sconto Totale Fisso' },
                ]}
              />
            </div>

            <TextInput
              label="Percentuale Sconto (%)"
              type="number"
              value={String(form.discountValue)}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
            />

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Tipo Scadenza
              </label>
              <Select
                value={form.expiryType}
                onChange={(e) => setForm({ ...form, expiryType: e.target.value })}
                options={[
                  { value: 'FIRST_PURCHASE', label: '🎁 Sul Primo Acquisto' },
                  { value: 'NEXT_PURCHASE', label: '🛒 Sul Prossimo Acquisto' },
                  { value: 'DATE', label: '📅 Scadenza a Data' },
                  { value: 'NONE', label: '♾️ Nessuna Scadenza' },
                ]}
              />
            </div>
          </div>

          {form.expiryType === 'DATE' && (
            <TextInput
              label="Data Scadenza Promo"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
