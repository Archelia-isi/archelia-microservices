import { useState } from 'react';
import { Send, Eye, Download, Link2, Settings2, Percent, CheckCircle2 } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { sanitizeEmailHtml } from './constants';
import type { SdrB2BAgentOption, SdrOutreachConfigState } from './types';

interface SdrDraftsConfigTabProps {
  mode: 'drafts' | 'config';
  canWrite: boolean;
  loading: boolean;
  drafts: any[];
  config: SdrOutreachConfigState;
  setConfig: (cfg: SdrOutreachConfigState) => void;
  b2bAgents: SdrB2BAgentOption[];
  enableGlobalWrites: boolean;
  onDispatchOutreach: (draftIds?: number[]) => void;
  onSaveConfig: () => void;
  onOpenDiscountsApp: () => void;
  onOpenDossier: (prospectId: number) => void;
  onDownloadCatalogPdf: (prospectId: number, companyName: string) => void;
  onCopySmartLink: (prospectId: number) => void;
}

export default function SdrDraftsConfigTab({
  mode,
  canWrite,
  loading,
  drafts,
  config,
  setConfig,
  b2bAgents,
  enableGlobalWrites,
  onDispatchOutreach,
  onSaveConfig,
  onOpenDiscountsApp,
  onOpenDossier,
  onDownloadCatalogPdf,
  onCopySmartLink,
}: SdrDraftsConfigTabProps) {
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>('ALL');
  const [draftSearch, setDraftSearch] = useState<string>('');
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);

  if (mode === 'drafts') {
    const readyDrafts = drafts.filter((d) => d.status === 'Bozza_Pronta');
    const filteredDrafts = drafts.filter((d) => {
      if (draftStatusFilter !== 'ALL' && d.status !== draftStatusFilter) return false;
      if (draftSearch.trim()) {
        const q = draftSearch.toLowerCase();
        const hay = `${d.subject || ''} ${d.prospect?.companyName || ''} ${d.prospect?.ordinaryEmail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <GlassPanel padding="md" radius="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `Tutte (${drafts.length})` },
                { id: 'Bozza_Pronta', label: `✅ Pronte Invio (${readyDrafts.length})` },
                {
                  id: 'Inviata_Dry_Run',
                  label: `🧪 Dry-Run (${drafts.filter((d) => d.status === 'Inviata_Dry_Run').length})`,
                },
                {
                  id: 'Inviata',
                  label: `📨 Inviate Live (${drafts.filter((d) => d.status === 'Inviata').length})`,
                },
                {
                  id: 'Template_Da_Attivare',
                  label: `⏸️ Template Disarmati (${drafts.filter((d) => d.status === 'Template_Da_Attivare').length})`,
                },
              ].map((st) => (
                <Button
                  key={st.id}
                  variant={draftStatusFilter === st.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDraftStatusFilter(st.id)}
                >
                  {st.label}
                </Button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '230px' }}>
                <TextInput
                  placeholder="Filtra bozze..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Send size={14} />}
                onClick={() => onDispatchOutreach(readyDrafts.slice(0, 25).map((d) => d.id))}
                disabled={!canWrite || loading || readyDrafts.length === 0}
              >
                {enableGlobalWrites
                  ? `Invia Lotto Pronte (${Math.min(25, readyDrafts.length)}) con Jitter`
                  : `Testa Invio in Dry-Run (${Math.min(25, readyDrafts.length)})`}
              </Button>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel padding="none" radius="lg" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  textAlign: 'left',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                <th style={{ padding: '10px 12px' }}>Destinatario B2B</th>
                <th style={{ padding: '10px 12px' }}>Oggetto Email Anti-Spam</th>
                <th style={{ padding: '10px 12px' }}>Casella Mittente</th>
                <th style={{ padding: '10px 12px' }}>Stato</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Nessuna bozza trovata con questo filtro. Prepara nuove credenziali dal tab Lead B2B!
                  </td>
                </tr>
              ) : (
                filteredDrafts.map((d: any) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800 }}>{d.prospect?.companyName || `Lead #${d.prospectId}`}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        {d.prospect?.ordinaryEmail || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: '380px' }}>
                      <div style={{ fontWeight: 700 }}>{d.subject}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Step {d.sequenceStep || 1} • Smart Link Catalistino 2gg incluso
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '11.5px' }}>
                      {d.senderAccount?.email || 'Pool Rotazione 60 Caselle Aruba'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge
                        variant={
                          d.status === 'Inviata'
                            ? 'success'
                            : d.status === 'Bozza_Pronta'
                              ? 'primary'
                              : d.status === 'Inviata_Dry_Run'
                                ? 'warning'
                                : 'neutral'
                        }
                        size="sm"
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => setPreviewDraft(d)}
                        >
                          Anteprima
                        </Button>
                        {d.prospectId && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Download size={13} />}
                              title="Scarica Catalistino PDF Reale"
                              onClick={() =>
                                onDownloadCatalogPdf(d.prospectId, d.prospect?.companyName || 'Cliente')
                              }
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Link2 size={13} />}
                              title="Copia Smart Link Offerta"
                              onClick={() => onCopySmartLink(d.prospectId)}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onOpenDossier(d.prospectId)}
                            >
                              Dossier
                            </Button>
                          </>
                        )}
                        {d.status === 'Bozza_Pronta' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Send size={13} />}
                            disabled={!canWrite || loading}
                            onClick={() => onDispatchOutreach([d.id])}
                          >
                            Invia
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassPanel>

        {/* MODAL ANTEPRIMA BOZZA SANITIZZATA */}
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
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeEmailHtml(previewDraft.bodyHtml, previewDraft.bodyText),
                }}
              />
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // MODE === 'CONFIG': OFFERTA 1° ACQUISTO, REFERENTE B2B, CATALISTINO 2GG & TIME-FENCING
  // ============================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* REFERENTE COMMERCIALE B2B & ALERT BREVO ISTANTANEI */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              👤 Referente Commerciale B2B Predefinito &amp; Notifiche Calde Brevo (Track 2)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Firma le proposte commerciali e riceve via Brevo l&apos;alert istantaneo appena il prospect apre il Catalistino PDF o risponde all&apos;email.
            </div>
          </div>
          <Badge variant="success" size="sm">DUAL-TRACK ARUBA + BREVO</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
              SELEZIONA AGENTE B2B (ANAGRAFICA REALE)
            </label>
            <Select
              value={config.defaultAgentCode || '003'}
              onChange={(e) => {
                const found = b2bAgents.find((a) => a.code === e.target.value);
                setConfig({
                  ...config,
                  defaultAgentCode: e.target.value,
                  defaultAgentName: found?.name || config.defaultAgentName,
                  defaultAgentEmail: found?.email || config.defaultAgentEmail,
                });
              }}
              options={
                b2bAgents.length > 0
                  ? b2bAgents.map((a) => ({
                      value: a.code,
                      label: `${a.name} (Cod. ${a.code} — ${a.email})`,
                    }))
                  : [{ value: '003', label: 'Daniele Savoia (Cod. 003)' }]
              }
            />
          </div>

          <TextInput
            label="Nome Referente Visualizzato in Firma"
            value={config.defaultAgentName || 'Daniele Savoia'}
            onChange={(e) => setConfig({ ...config, defaultAgentName: e.target.value })}
          />

          <TextInput
            label="Email Agente per Alert Apertura PDF / Risposta"
            value={config.defaultAgentEmail || ''}
            placeholder="Email aziendale agente..."
            onChange={(e) => setConfig({ ...config, defaultAgentEmail: e.target.value })}
          />
        </div>
      </GlassPanel>

      {/* REGOLE SCONTO 1° ACQUISTO SOLO PRONTA CONSEGNA 2GG */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              ⚡ Regola Automatica Sconto 1° Acquisto (Target `ALL_2GG` — Solo Pronta Consegna 2gg)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Crea automaticamente una regola `FIRST_PURCHASE` legata al codice cliente che sconta esclusivamente i prodotti nel Deposito Principale (2gg).
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<Percent size={14} />} onClick={onOpenDiscountsApp}>
            Apri Gestione Sconti B2B
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <TextInput
            label="Extra Sconto 1° Acquisto IST (Base 40% + Extra %)"
            type="number"
            min={0}
            max={30}
            value={String(config.istExtraDiscountPct ?? 10)}
            onChange={(e) => setConfig({ ...config, istExtraDiscountPct: Number(e.target.value) })}
          />
          <TextInput
            label="Extra Sconto 1° Acquisto RIV (Base 50% + Extra %)"
            type="number"
            min={0}
            max={30}
            value={String(config.rivExtraDiscountPct ?? 10)}
            onChange={(e) => setConfig({ ...config, rivExtraDiscountPct: Number(e.target.value) })}
          />
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
              PERIMETRO PRODOTTI SCONTATI
            </label>
            <Select
              value={config.discountTargetType || 'ALL_2GG'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  discountTargetType: e.target.value as 'ALL_2GG' | 'ALL_CATALOG',
                })
              }
              options={[
                { value: 'ALL_2GG', label: '⚡ Solo Pronta Consegna 2gg (Deposito Principale)' },
                { value: 'ALL_CATALOG', label: '🌐 Tutto il Catalogo (2gg + 7gg)' },
              ]}
            />
          </div>
          <TextInput
            label="Max Articoli nel Catalistino PDF Riservato"
            type="number"
            min={40}
            max={500}
            value={String(config.catalogMaxProducts ?? 180)}
            onChange={(e) => setConfig({ ...config, catalogMaxProducts: Number(e.target.value) })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <TextInput
            label="Titolo Offerta Commerciale"
            value={config.offerTitle || ''}
            onChange={(e) => setConfig({ ...config, offerTitle: e.target.value })}
          />
          <TextInput
            label="Condizione Minimo d'Ordine"
            value={config.minOrderAmountText || ''}
            onChange={(e) => setConfig({ ...config, minOrderAmountText: e.target.value })}
          />
          <TextInput
            label="Condizione Spedizione 24/48h"
            value={config.freeShippingText || ''}
            onChange={(e) => setConfig({ ...config, freeShippingText: e.target.value })}
          />
          <TextInput
            label="Termini Commerciali & Referente"
            value={config.paymentTermsText || ''}
            onChange={(e) => setConfig({ ...config, paymentTermsText: e.target.value })}
          />
        </div>
      </GlassPanel>

      {/* TIME-FENCING & JITTER ANTI-SPAM */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>
          <Settings2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Time-Fencing Orario Ufficio (`Europe/Rome` Lun–Ven) &amp; Jitter Gaussiano
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, paddingBottom: '8px' }}>
            <input
              type="checkbox"
              checked={Boolean(config.timeFencingEnabled)}
              onChange={(e) => setConfig({ ...config, timeFencingEnabled: e.target.checked })}
            />
            Attiva Time-Fencing Lun–Ven (ora italiana)
          </label>
          <TextInput
            label="Finestra Mattutina"
            value={config.morningWindow || '08:30-12:30'}
            onChange={(e) => setConfig({ ...config, morningWindow: e.target.value })}
          />
          <TextInput
            label="Finestra Pomeridiana"
            value={config.afternoonWindow || '14:00-17:30'}
            onChange={(e) => setConfig({ ...config, afternoonWindow: e.target.value })}
          />
          <Button
            variant="primary"
            icon={<CheckCircle2 size={15} />}
            onClick={onSaveConfig}
            disabled={!canWrite || loading}
          >
            Salva Configurazione Globale SDR
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
