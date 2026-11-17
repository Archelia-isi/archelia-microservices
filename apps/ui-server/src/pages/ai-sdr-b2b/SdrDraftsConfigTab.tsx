import { useState } from 'react';
import {
  Send,
  Eye,
  Download,
  Link2,
  Settings2,
  Percent,
  CheckCircle2,
  Shuffle,
  FileText,
  BookOpen,
  Inbox,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { sanitizeEmailHtml } from './constants';
import SdrCombinatorialStudioPanel, {
  type CombinatorialSubMode,
} from './SdrCombinatorialStudioPanel';
import type { SdrB2BAgentOption, SdrOutreachConfigState } from './types';

interface SdrDraftsConfigTabProps {
  mode: 'drafts' | 'config';
  apiUrl: string;
  authHeaders: () => Record<string, string>;
  canWrite: boolean;
  loading: boolean;
  drafts: any[];
  config: SdrOutreachConfigState;
  setConfig: (cfg: SdrOutreachConfigState) => void;
  b2bAgents: SdrB2BAgentOption[];
  statsKpis?: any;
  enableGlobalWrites: boolean;
  onDispatchOutreach: (draftIds?: number[]) => void;
  onRerollSingleDraft: (prospectId: number) => void;
  onRerollReadyDrafts: () => void;
  onSaveConfig: () => void;
  onOpenDiscountsApp: () => void;
  onOpenDossier: (prospectId: number) => void;
  onDownloadCatalogPdf: (prospectId: number, companyName: string) => void;
  onCopySmartLink: (prospectId: number) => void;
}

function resolveDraftStepMeta(
  d: any,
  step2Days = 10,
  step3Days = 5
): {
  code: '1' | '1B' | '2' | '3';
  label: string;
  variant: 'neutral' | 'success' | 'primary' | 'warning';
  detail: string;
} {
  const rawStep = Number(d?.sequenceStep || 1);
  const tpl = String(d?.templateCode || '').toUpperCase();
  const subj = String(d?.subject || '').trim();

  if (
    rawStep === 10 ||
    tpl.includes('1B') ||
    tpl.includes('CONSENT') ||
    tpl.includes('CONSENSO') ||
    (rawStep === 1 && /^re:/i.test(subj))
  ) {
    return {
      code: '1B',
      label: 'Step 1B • Risposta Sì',
      variant: 'success',
      detail: 'Invio dopo 15–25 min • 1 solo link offerta, zero password',
    };
  }
  if (rawStep === 2 || tpl.includes('STEP2') || tpl.includes('STEP_2')) {
    return {
      code: '2',
      label: `Step 2 • +${step2Days}gg Link`,
      variant: 'primary',
      detail: 'Follow-up sobrio senza risposta • 1 solo link offerta',
    };
  }
  if (rawStep === 3 || tpl.includes('STEP3') || tpl.includes('STEP_3')) {
    return {
      code: '3',
      label: `Step 3 • +${step3Days}gg Caldi`,
      variant: 'warning',
      detail: 'Nota 1-a-1 solo per chi ha aperto PDF/Portale senza ordinare',
    };
  }
  return {
    code: '1',
    label: 'Step 1 • Conversazione Pura',
    variant: 'neutral',
    detail: 'Zero link • Zero password • Contatto umano 1-a-1',
  };
}

export default function SdrDraftsConfigTab({
  mode,
  apiUrl,
  authHeaders,
  canWrite,
  loading,
  drafts,
  config,
  setConfig,
  b2bAgents,
  statsKpis,
  enableGlobalWrites,
  onDispatchOutreach,
  onRerollSingleDraft,
  onRerollReadyDrafts,
  onSaveConfig,
  onOpenDiscountsApp,
  onOpenDossier,
  onDownloadCatalogPdf,
  onCopySmartLink,
}: SdrDraftsConfigTabProps) {
  const [draftsSection, setDraftsSection] = useState<'queue' | CombinatorialSubMode>('queue');
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>('ALL');
  const [draftStepFilter, setDraftStepFilter] = useState<'ALL' | '1' | '1B' | '2' | '3'>('ALL');
  const [draftSearch, setDraftSearch] = useState<string>('');
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);
  const [liveCredits, setLiveCredits] = useState<{
    provider?: string;
    balance?: number | null;
    checking?: boolean;
  }>({});

  const step2Days = Number(config.step2DelayDays ?? 10);
  const step3Days = Number(config.step3WarmDelayDays ?? 5);

  if (mode === 'drafts') {
    const readyDrafts = drafts.filter((d) => d.status === 'Bozza_Pronta');
    const stepCounts = { '1': 0, '1B': 0, '2': 0, '3': 0 };
    drafts.forEach((d) => {
      const m = resolveDraftStepMeta(d, step2Days, step3Days);
      stepCounts[m.code] += 1;
    });

    const filteredDrafts = drafts.filter((d) => {
      if (draftStatusFilter !== 'ALL' && d.status !== draftStatusFilter) return false;
      if (draftStepFilter !== 'ALL') {
        const m = resolveDraftStepMeta(d, step2Days, step3Days);
        if (m.code !== draftStepFilter) return false;
      }
      if (draftSearch.trim()) {
        const q = draftSearch.toLowerCase();
        const hay = `${d.subject || ''} ${d.templateCode || ''} ${d.prospect?.companyName || ''} ${d.prospect?.ordinaryEmail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {/* BARRA DI SCELTA SEZIONE: CODA BOZZE vs MOTORE 100 EMAIL × 108 PAROLE */}
        <GlassPanel padding="sm" radius="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                variant={draftsSection === 'queue' ? 'primary' : 'secondary'}
                size="sm"
                icon={<Inbox size={14} />}
                onClick={() => setDraftsSection('queue')}
              >
                Coda Bozze &amp; Invio ({drafts.length})
              </Button>
              <Button
                variant={draftsSection === 'simulator' ? 'primary' : 'secondary'}
                size="sm"
                icon={<Shuffle size={14} />}
                onClick={() => setDraftsSection('simulator')}
              >
                Simulatore Combinazioni
              </Button>
              <Button
                variant={draftsSection === 'templates' ? 'primary' : 'secondary'}
                size="sm"
                icon={<FileText size={14} />}
                onClick={() => setDraftsSection('templates')}
              >
                100 Email Madri
              </Button>
              <Button
                variant={draftsSection === 'tokens' ? 'primary' : 'secondary'}
                size="sm"
                icon={<BookOpen size={14} />}
                onClick={() => setDraftsSection('tokens')}
              >
                108 Parole Dinamiche
              </Button>
            </div>

            <Badge variant="success" size="sm">
              MOTORE ANTI-SPAM 100×108 ATTIVO (&gt; 10^17 COMBINAZIONI)
            </Badge>
          </div>
        </GlassPanel>

        {draftsSection !== 'queue' ? (
          <SdrCombinatorialStudioPanel
            apiUrl={apiUrl}
            authHeaders={authHeaders}
            canWrite={canWrite}
            subMode={draftsSection}
            onChangeSubMode={(m) => setDraftsSection(m)}
          />
        ) : (
          <>
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
                  <div style={{ width: '210px' }}>
                    <TextInput
                      placeholder="Filtra bozze o T001..."
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Shuffle size={14} />}
                    onClick={onRerollReadyDrafts}
                    disabled={!canWrite || loading || drafts.length === 0}
                    title="Rigenera impostazioni strutturali e sinonimi tutti diversi per le bozze in coda"
                  >
                    Rigenera Tutte Uniche ({readyDrafts.length > 0 ? readyDrafts.length : drafts.length})
                  </Button>
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

              {/* FILTRO PER STEP DELLA SEQUENZA ANTI-SPAM A 3 TEMPI */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', marginRight: '4px' }}>
                  SEQUENZA 3 TEMPI:
                </span>
                {(
                  [
                    { id: 'ALL', label: `Tutti gli Step (${drafts.length})` },
                    { id: '1', label: `Step 1 • Conversazione Pura (${stepCounts['1']})` },
                    { id: '1B', label: `Step 1B • Risposta Sì (${stepCounts['1B']})` },
                    { id: '2', label: `Step 2 • +${step2Days}gg Link (${stepCounts['2']})` },
                    { id: '3', label: `Step 3 • +${step3Days}gg Caldi (${stepCounts['3']})` },
                  ] as const
                ).map((sBtn) => (
                  <Button
                    key={sBtn.id}
                    variant={draftStepFilter === sBtn.id ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setDraftStepFilter(sBtn.id)}
                  >
                    {sBtn.label}
                  </Button>
                ))}
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
                    <th style={{ padding: '10px 12px' }}>Oggetto Email Anti-Spam (Unico)</th>
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
                    filteredDrafts.map((d: any) => {
                      const stepMeta = resolveDraftStepMeta(d, step2Days, step3Days);
                      return (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800 }}>{d.prospect?.companyName || `Lead #${d.prospectId}`}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                            {d.prospect?.ordinaryEmail || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', maxWidth: '410px' }}>
                          <div style={{ fontWeight: 700 }}>{d.subject}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                            <Badge variant={stepMeta.variant} size="sm">
                              {stepMeta.label}
                            </Badge>
                            {d.templateCode && (
                              <Badge variant="neutral" size="sm">
                                Madre {d.templateCode}
                              </Badge>
                            )}
                            <span>{stepMeta.detail}</span>
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
                                  icon={<Shuffle size={13} />}
                                  disabled={!canWrite || loading}
                                  title="Rigenera nuova combinazione (100 Email × 108 Parole)"
                                  onClick={() => onRerollSingleDraft(d.prospectId)}
                                />
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </GlassPanel>
          </>
        )}

        {/* MODAL ANTEPRIMA BOZZA SANITIZZATA */}
        <Modal
          isOpen={Boolean(previewDraft)}
          onClose={() => setPreviewDraft(null)}
          title={previewDraft?.subject || 'Anteprima Email B2B'}
          size="lg"
        >
          {previewDraft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Destinatario: <strong>{previewDraft.prospect?.companyName}</strong> (
                  {previewDraft.prospect?.ordinaryEmail})
                </span>
                {previewDraft.templateCode && (
                  <Badge variant="primary" size="sm">
                    Email Madre {previewDraft.templateCode}
                  </Badge>
                )}
              </div>
              <div
                style={{
                  padding: '16px',
                  background: '#ffffff',
                  color: '#0f172a',
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

      {/* PULIZIA AUTOMATICA PRE-INVIO EMAIL ("MAN MANO CHE INVII" — EMAIL-VALIDATION.ORG EU / MILLIONVERIFIER) */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Pulizia Automatica Pre-Invio Email (&quot;Man Mano che Invii&quot;)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Supporta nativamente <strong>email-validation.org (EU GDPR `ev_live_...`)</strong> e <strong>MillionVerifier</strong>: verifica ogni email una sola volta prima del 1° invio su Aruba e sposta le inesistenti in &quot;Solo Telefono / WhatsApp&quot;.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge
              variant={
                config.hasMillionVerifierKey || (config.millionVerifierApiKey || '').trim().length > 0
                  ? 'success'
                  : 'warning'
              }
              size="sm"
            >
              {config.hasMillionVerifierKey || (config.millionVerifierApiKey || '').trim().length > 0
                ? `ATTIVO • ${liveCredits.provider || config.emailVerifierProvider || statsKpis?.emailVerifierProvider || 'Provider API'}`
                : 'IN ATTESA API KEY (FALLBACK DNS MX ATTIVO)'}
            </Badge>
            {(liveCredits.balance ?? statsKpis?.emailVerifierCredits) != null && (
              <Badge variant="primary" size="sm">
                💳 Crediti residui:{' '}
                {Number(liveCredits.balance ?? statsKpis?.emailVerifierCredits ?? 0).toLocaleString(
                  'it-IT'
                )}
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={Boolean(liveCredits.checking)}
              onClick={async () => {
                try {
                  setLiveCredits((prev) => ({ ...prev, checking: true }));
                  const res = await fetch(`${apiUrl}/api/admin/sdr/email-verifier/credits`, {
                    headers: authHeaders(),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setLiveCredits({
                      provider: data.provider,
                      balance: data.balance,
                      checking: false,
                    });
                    toast.success(data.message || 'Connessione API verifica email attiva!');
                  } else {
                    setLiveCredits((prev) => ({ ...prev, checking: false }));
                    toast.error(data.error || data.message || 'Verifica crediti non riuscita');
                  }
                } catch {
                  setLiveCredits((prev) => ({ ...prev, checking: false }));
                  toast.error('Errore di connessione durante la verifica crediti');
                }
              }}
            >
              {liveCredits.checking ? 'Verifica...' : 'Verifica Crediti API'}
            </Button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '14px',
          }}
        >
          <Badge variant="success" size="sm">
            🟢 Valide: {Number(statsKpis?.emailValidCount || 0).toLocaleString('it-IT')}
          </Badge>
          <Badge variant="danger" size="sm">
            🔴 Invalide spostate in Telefono:{' '}
            {Number(
              statsKpis?.emailInvalidMovedToPhoneCount ?? statsKpis?.emailInvalidCount ?? 0
            ).toLocaleString('it-IT')}
          </Badge>
          <Badge variant="warning" size="sm">
            🟡 Catch-All (max 1/g per casella):{' '}
            {Number(statsKpis?.emailCatchAllCount || 0).toLocaleString('it-IT')}
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, paddingBottom: '8px' }}>
            <input
              type="checkbox"
              checked={config.enableMillionVerifier !== false}
              onChange={(e) => setConfig({ ...config, enableMillionVerifier: e.target.checked })}
            />
            Attiva verifica automatica pre-invio MillionVerifier
          </label>
          <TextInput
            label="Chiave API Verifica Email (ev_live_... email-validation.org EU oppure MillionVerifier)"
            type="password"
            placeholder="ev_live_... oppure API Key MillionVerifier"
            value={config.millionVerifierApiKey || ''}
            onChange={(e) => setConfig({ ...config, millionVerifierApiKey: e.target.value })}
          />
        </div>
      </GlassPanel>

      {/* SEQUENZA ANTI-SPAM A 3 TEMPI (STEP 1 -> STEP 1B / STEP 2 +10GG -> STEP 3 +5GG CALDI) */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Sequenza Email Anti-Spam a 3 Tempi (Conversazione Pura → Link → Solo Caldi)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Step 1 senza link né password • Step 1B automatico dopo 15–25 min se il cliente risponde &quot;Sì&quot; • Step 2 con 1 link offerta • Step 3 solo per chi apre il PDF/Portale senza ordinare (si ferma subito se Daniele segna il cliente chiamato).
            </div>
          </div>
          <Badge variant="primary" size="sm">STESSA CASELLA ARUBA PER INTERA CONVERSAZIONE</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '10px' }}>
          <TextInput
            label="Giorni Attesa Step 2 (chi non ha risposto allo Step 1)"
            type="number"
            min={1}
            max={60}
            value={String(config.step2DelayDays ?? 10)}
            onChange={(e) =>
              setConfig({ ...config, step2DelayDays: Math.max(1, Number(e.target.value) || 10) })
            }
          />
          <TextInput
            label="Giorni Attesa Step 3 Solo Caldi (dopo apertura PDF / Login senza ordine)"
            type="number"
            min={1}
            max={30}
            value={String(config.step3WarmDelayDays ?? 5)}
            onChange={(e) =>
              setConfig({ ...config, step3WarmDelayDays: Math.max(1, Number(e.target.value) || 5) })
            }
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="neutral" size="sm">Step 1 • Conversazione Pura (Giorno 1)</Badge>
          <Badge variant="success" size="sm">Step 1B • Risposta Sì (15–25 min)</Badge>
          <Badge variant="primary" size="sm">Step 2 • +{config.step2DelayDays ?? 10}gg Link</Badge>
          <Badge variant="warning" size="sm">Step 3 • +{config.step3WarmDelayDays ?? 5}gg Caldi</Badge>
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
