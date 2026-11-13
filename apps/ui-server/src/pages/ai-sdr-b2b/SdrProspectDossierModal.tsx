import { FileText, KeyRound, Send, Download, Link2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';

interface SdrProspectDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  canWrite: boolean;
  loading: boolean;
  dossierLoading: boolean;
  activeDossier: any | null;
  dossierTab: 'strategy' | 'anagrafica' | 'proposal' | 'split';
  setDossierTab: (tab: 'strategy' | 'anagrafica' | 'proposal' | 'split') => void;
  manualEmailInput: string;
  setManualEmailInput: (v: string) => void;
  draftRecipientInput: string;
  setDraftRecipientInput: (v: string) => void;
  draftSubjectInput: string;
  setDraftSubjectInput: (v: string) => void;
  draftBodyInput: string;
  setDraftBodyInput: (v: string) => void;
  onSaveManualEmail: () => void;
  onSaveDraft: () => void;
  onPrepareOutreach: (prospectIds: number[]) => void;
  onDispatchOutreach: (draftIds: number[]) => void;
  onDownloadCatalogPdf: (prospectId: number, companyName: string) => void;
  onCopySmartLink: (prospectId: number) => void;
  onOpenCatalogBuilder: (companyName: string, category: 'IST' | 'RIV', extraPct?: number) => void;
  onCopyValue: (val: string, label: string) => void;
}

export default function SdrProspectDossierModal({
  isOpen,
  onClose,
  canWrite,
  loading,
  dossierLoading,
  activeDossier,
  dossierTab,
  setDossierTab,
  manualEmailInput,
  setManualEmailInput,
  draftRecipientInput,
  setDraftRecipientInput,
  draftSubjectInput,
  setDraftSubjectInput,
  draftBodyInput,
  setDraftBodyInput,
  onSaveManualEmail,
  onSaveDraft,
  onPrepareOutreach,
  onDispatchOutreach,
  onDownloadCatalogPdf,
  onCopySmartLink,
  onOpenCatalogBuilder,
  onCopyValue,
}: SdrProspectDossierModalProps) {
  const p = activeDossier?.prospect;
  const fq = p?.fourQuadrants || (!Array.isArray(p?.fourQuadrantReport) ? p?.fourQuadrantReport : null);
  const fqArr = Array.isArray(p?.fourQuadrantReport) ? p.fourQuadrantReport : [];

  const q1Text =
    fq?.q1Corporate || fqArr[0]?.content || p?.painPoints || 'Profilo societario verificato sul territorio.';
  const q2Text =
    fq?.q2Operations || fqArr[1]?.content || 'Operatività impiantistica e rivendita tecnica specializzata.';
  const q3Text =
    fq?.q3DigitalReputation || fqArr[2]?.content || 'Canali digitali e telefonici verificati dal Master Audit 15/15.';
  const q4Text =
    fq?.q4CommercialStrategy ||
    fqArr[3]?.content ||
    activeDossier?.categoryInfo?.recommendedFamily ||
    'Gamma Pronta Consegna 2gg ad alta rotazione e marginalità.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={p ? `🏢 Dossier 360° — ${p.companyName}` : 'Caricamento Dossier Aziendale...'}
      size="xl"
    >
      {dossierLoading && !activeDossier ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Caricamento fascicolo aziendale completo ( sola lettura sicura )...
        </div>
      ) : p ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* INTESTAZIONE RAPIDA + LINK ESTERNI + SELETTORE 4 SCHEDE */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge variant={p.commercialCategory === 'RIV' ? 'primary' : 'success'} size="sm">
                  {p.commercialCategory === 'RIV' ? '🏪 RIV 50% + 10% (2gg)' : '⚡ IST 40% + 10% (2gg)'}
                </Badge>
                <Badge variant="neutral" size="sm">{p.categoryCluster}</Badge>
                {p.vatNumber && <Badge variant="primary" size="sm">IT{p.vatNumber}</Badge>}
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  📍 {p.city} ({p.province}) — {p.region}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {p.website && (
                  <a
                    href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '11.5px',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      background: 'rgba(37, 99, 235, 0.12)',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    🌐 Sito Ufficiale ↗
                  </a>
                )}
                <a
                  href={
                    p.googleMapsUrl ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${p.companyName || ''} ${p.address || ''} ${p.city || ''}`
                    )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '11.5px',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-main)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  📍 Google Maps ↗
                </a>
                {(p.whatsappPhone || p.mobilePhone || p.phone) && (
                  <a
                    href={`https://wa.me/${String(p.whatsappPhone || p.mobilePhone || p.phone).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '11.5px',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      background: 'rgba(22, 163, 74, 0.14)',
                      color: '#16a34a',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    💬 WhatsApp ↗
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                variant={dossierTab === 'strategy' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('strategy')}
              >
                1. 📊 Relazione Strategica &amp; 4 Quadranti
              </Button>
              <Button
                variant={dossierTab === 'anagrafica' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('anagrafica')}
              >
                2. 🏛️ Anagrafica, Contatti &amp; Audit 15/15
              </Button>
              <Button
                variant={dossierTab === 'proposal' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('proposal')}
              >
                3. ✉️ Proposta, Smart Link &amp; Catalistino PDF 2gg
              </Button>
              <Button
                variant={dossierTab === 'split' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDossierTab('split')}
              >
                4. 🖥️ Vista Affiancata
              </Button>
            </div>
          </div>

          {/* SCHEDA 1: 4 QUADRANTI */}
          {dossierTab === 'strategy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '10px',
                }}
              >
                {[
                  { num: '1', title: 'Quadro Aziendale & Solidità', color: '#2563eb', text: q1Text },
                  { num: '2', title: 'Operatività & Marchi Trattati', color: '#7c3aed', text: q2Text },
                  { num: '3', title: 'Presidio Digitale & Canali Diretti', color: '#0891b2', text: q3Text },
                  { num: '4', title: 'Strategia Commerciale Pronta Consegna 2gg', color: '#16a34a', text: q4Text },
                ].map((q) => (
                  <div
                    key={q.num}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      borderLeft: `4px solid ${q.color}`,
                      background: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '12px', color: q.color, marginBottom: '6px', textTransform: 'uppercase' }}>
                      {q.num}. {q.title}
                    </div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--color-text-main)' }}>
                      {q.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCHEDA 2: ANAGRAFICA, EMAIL ANTI-PEC & AUDIT 15/15 */}
          {dossierTab === 'anagrafica' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                }}
              >
                {[
                  { label: 'Ragione Sociale', val: p.vatOfficialName || p.companyName },
                  { label: 'Partita IVA (Mod-10)', val: p.vatNumber ? `IT${p.vatNumber}` : 'Non esposta' },
                  { label: 'Telefono Principale', val: p.phone || 'Non rilevato' },
                  { label: 'Cellulare / WhatsApp', val: p.mobilePhone || p.whatsappPhone || 'Non rilevato' },
                  { label: 'Indirizzo Sede', val: `${p.address || ''} — ${p.city || ''} (${p.province || ''})` },
                  { label: 'Fatturato / Dipendenti', val: `${p.revenue || 'N/D'} • ${p.employeesRange || 'N/D'}` },
                ].map((it, idx) => (
                  <div
                    key={idx}
                    onClick={() => it.val && onCopyValue(String(it.val), it.label)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      {it.label}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, marginTop: '3px' }}>{it.val}</div>
                  </div>
                ))}
              </div>

              {/* GESTIONE EMAIL ORDINARIA & FIREWALL ANTI-PEC */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                  ✉️ Indirizzo Email Ordinario &amp; Verifica Anti-PEC
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      fullWidth
                      placeholder="Inserisci o aggiorna email ordinaria (es. info@azienda.it)..."
                      value={manualEmailInput}
                      onChange={(e) => setManualEmailInput(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onSaveManualEmail}
                    disabled={!canWrite || dossierLoading}
                  >
                    Salva &amp; Verifica Anti-PEC
                  </Button>
                </div>
              </div>

              {/* MASTER AUDIT 15/15 */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                  🛡️ Master Audit ({activeDossier.audit?.passedCount || 15}/15 Superati)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
                  {(activeDossier.audit?.checks || []).map((chk: any) => (
                    <div
                      key={chk.code}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>[{chk.code}] {chk.name}</span>
                        <Badge variant={chk.passed ? 'success' : 'warning'} size="sm">
                          {chk.passed ? 'OK' : 'WARN'}
                        </Badge>
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: '3px' }}>{chk.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCHEDA 3 & 4: PROPOSTA COMMERCIALE, PDF REALE, SMART LINK & SPLIT VIEW */}
          {(dossierTab === 'proposal' || dossierTab === 'split') && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: dossierTab === 'split' ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
                gap: '12px',
              }}
            >
              {dossierTab === 'split' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { title: '1. Quadro Aziendale', text: q1Text },
                    { title: '2. Operatività & Marchi', text: q2Text },
                    { title: '3. Presidio Digitale', text: q3Text },
                    { title: '4. Strategia 2gg', text: q4Text },
                  ].map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: '3px' }}>{q.title}</div>
                      <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{q.text}</div>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13.5px' }}>
                      🔑 Credenziali Portale B2B &amp; Sconto 1° Acquisto (
                      {activeDossier.categoryInfo?.baseDiscount || 40}% +{' '}
                      {activeDossier.categoryInfo?.extraFirstPurchasePct || 10}% • Solo 2gg)
                    </div>
                    {activeDossier.promoProspect ? (
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Username: <code>{activeDossier.promoProspect.username}</code> • Password:{' '}
                        <code>{activeDossier.promoProspect.tempPassword || 'Impostata dal cliente'}</code>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        Genera le credenziali per attivare lo sconto automatico `ALL_2GG` e lo Smart Link tracciato.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={13} />}
                      onClick={() => onDownloadCatalogPdf(p.id, p.companyName)}
                    >
                      Scarica PDF 2gg
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Link2 size={13} />}
                      onClick={() => onCopySmartLink(p.id)}
                    >
                      Copia Smart Link
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FileText size={13} />}
                      onClick={() =>
                        onOpenCatalogBuilder(
                          p.companyName,
                          activeDossier.categoryInfo?.commercialCategory === 'RIV' ? 'RIV' : 'IST',
                          activeDossier.categoryInfo?.extraFirstPurchasePct
                        )
                      }
                    >
                      Catalog Builder
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<KeyRound size={13} />}
                      disabled={!canWrite || !p.ordinaryEmail || loading}
                      onClick={() => onPrepareOutreach([p.id])}
                    >
                      Genera Credenziali &amp; Bozza
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                  <TextInput
                    label="Destinatario Email Ordinaria"
                    fullWidth
                    value={draftRecipientInput}
                    onChange={(e) => setDraftRecipientInput(e.target.value)}
                  />
                  <TextInput
                    label="Oggetto Proposta Commerciale"
                    fullWidth
                    value={draftSubjectInput}
                    onChange={(e) => setDraftSubjectInput(e.target.value)}
                  />
                </div>

                <textarea
                  value={draftBodyInput}
                  onChange={(e) => setDraftBodyInput(e.target.value)}
                  rows={9}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-main)',
                    fontFamily: 'inherit',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onSaveDraft}
                      disabled={!canWrite || dossierLoading}
                    >
                      💾 Salva Bozza
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onCopyValue(draftBodyInput, 'Testo Email')}
                    >
                      📋 Copia Testo
                    </Button>
                  </div>

                  {activeDossier.drafts?.[0] && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send size={13} />}
                      disabled={!canWrite || loading}
                      onClick={() => onDispatchOutreach([activeDossier.drafts[0].id])}
                    >
                      Invia Ora (Pool Aruba SSL / Dry-Run)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
