import { Bot, ShieldCheck, Play, Square, Sparkles, RefreshCcw } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import { SEARCH_CATEGORIES, MASTER_AUDIT_SPECS_15 } from './constants';

interface SdrAgentsAuditTabProps {
  canWrite: boolean;
  loading: boolean;
  searchStatus: any;
  geoProvince: any[];
  autopilotProvince: string;
  setAutopilotProvince: (v: string) => void;
  autopilotCategory: string;
  setAutopilotCategory: (v: string) => void;
  mockReplyProspectId: string;
  setMockReplyProspectId: (v: string) => void;
  inboxEvents: any[];
  onRunProfilerAgent: () => void;
  onRunMasterAuditBatch: () => void;
  onStartAutopilot: () => void;
  onStopAutopilot: () => void;
  onSimulateKillSwitchReply: (sentiment: 'Interessato' | 'Non_Interessato') => void;
  onRefreshInboxEvents: () => void;
}

export default function SdrAgentsAuditTab({
  canWrite,
  loading,
  searchStatus,
  geoProvince,
  autopilotProvince,
  setAutopilotProvince,
  autopilotCategory,
  setAutopilotCategory,
  mockReplyProspectId,
  setMockReplyProspectId,
  inboxEvents,
  onRunProfilerAgent,
  onRunMasterAuditBatch,
  onStartAutopilot,
  onStopAutopilot,
  onSimulateKillSwitchReply,
  onRefreshInboxEvents,
}: SdrAgentsAuditTabProps) {
  const autopilotActive = Boolean(searchStatus?.autopilot?.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* I 4 AGENTI AUTONOMI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Badge variant="primary" size="sm">AGENTE 1 • SCRAPER</Badge>
            <Badge variant="success" size="sm">ATTIVO</Badge>
          </div>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
            🔍 Scraper Multi-Fonte ISTAT
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Scansiona PagineGialle, PagineBianche e Google Places protetto sui 7.904 comuni italiani con deduplicazione su P.IVA, Email e Telefono.
          </div>
        </GlassPanel>

        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Badge variant="primary" size="sm">AGENTE 2 • PROFILER</Badge>
            <Badge variant="success" size="sm">ANTI-PEC 4 LIVELLI</Badge>
          </div>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
            🌐 Deep-Web Crawler &amp; VIES
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
            Esplora homepage, `/contatti`, `/chi-siamo` e `/privacy` estraendo email ordinarie verificate DNS MX, P.IVA Modulo-10, marchi e 4 quadranti.
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={13} />}
            onClick={onRunProfilerAgent}
            disabled={!canWrite || loading}
          >
            Esegui Lotto Profiler (30 Siti)
          </Button>
        </GlassPanel>

        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Badge variant="primary" size="sm">AGENTE 3 • AUDITOR</Badge>
            <Badge variant="success" size="sm">15/15 CHECK</Badge>
          </div>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
            🛡️ Master Auditor V01–V15
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
            Valida 15 controlli qualità (checksum P.IVA, zero PEC, record MX, assenza placeholder, coerenza sconto `ALL_2GG`) prima dell&apos;invio.
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ShieldCheck size={13} />}
            onClick={onRunMasterAuditBatch}
            disabled={!canWrite || loading}
          >
            Certifica Lotto 200 Lead
          </Button>
        </GlassPanel>

        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Badge variant="primary" size="sm">AGENTE 4 • SENTINELLA IMAP</Badge>
            <Badge variant="success" size="sm">60 CASELLE SSL</Badge>
          </div>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
            📬 Kill-Switch IMAP + Alert Brevo
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Monitora ogni 3 minuti tutte le 60 caselle `imaps.aruba.it:993`: blocca istantaneamente i follow-up in caso di risposta o bounce e invia Alert Brevo all&apos;Agente B2B.
          </div>
        </GlassPanel>
      </div>

      {/* AUTOPILOT CONTINUO + KILL-SWITCH ATOMICO & FEED EVENTI IMAP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>
              <Bot size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Modalità Autopilot Continua (Ricerca + Arricchimento + Audit)
            </div>
            <Badge variant={autopilotActive ? 'success' : 'neutral'} size="sm">
              {autopilotActive ? 'AUTOPILOT ATTIVO' : 'IN STANDBY'}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <Select
              value={autopilotProvince}
              onChange={(e) => setAutopilotProvince(e.target.value)}
              options={[
                { value: 'ALL', label: '🇮🇹 Tutte le Province Italiane' },
                ...geoProvince.map((p: any) => ({
                  value: p.sigla,
                  label: `${p.provincia || p.nome} (${p.sigla})`,
                })),
              ]}
            />
            <Select
              value={autopilotCategory}
              onChange={(e) => setAutopilotCategory(e.target.value)}
              options={SEARCH_CATEGORIES}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={14} />}
              onClick={onStartAutopilot}
              disabled={!canWrite || loading || autopilotActive}
            >
              Avvia Autopilot Continuo
            </Button>
            {autopilotActive && (
              <Button variant="danger" size="sm" icon={<Square size={14} />} onClick={onStopAutopilot} disabled={!canWrite}>
                Ferma Autopilot
              </Button>
            )}
          </div>
        </GlassPanel>

        <GlassPanel padding="lg" radius="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>
              ⚡ Feed Risposte IMAP Reali &amp; Test Kill-Switch Atomico
            </div>
            <Button variant="secondary" size="sm" icon={<RefreshCcw size={13} />} onClick={onRefreshInboxEvents}>
              Aggiorna Eventi
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div style={{ width: '110px' }}>
              <TextInput
                placeholder="ID Lead"
                value={mockReplyProspectId}
                onChange={(e) => setMockReplyProspectId(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSimulateKillSwitchReply('Interessato')}
              disabled={!canWrite || loading}
            >
              Simula Risposta &ldquo;Interessato&rdquo;
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSimulateKillSwitchReply('Non_Interessato')}
              disabled={!canWrite || loading}
            >
              Simula Opt-Out / Stop
            </Button>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {inboxEvents.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Nessun evento IMAP o Kill-Switch registrato di recente. Il poller SSL Aruba controlla le 60 caselle ogni 3 minuti.
              </div>
            ) : (
              inboxEvents.map((ev: any, idx: number) => (
                <div
                  key={ev.id || idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{ev.fromEmail || ev.companyName || `Lead #${ev.prospectId}`}</span>
                    <Badge variant={ev.sentiment === 'Interessato' ? 'success' : 'warning'} size="sm">
                      {ev.sentiment || ev.eventType || 'Kill-Switch'}
                    </Badge>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {ev.subject || ev.snippet || 'Sequenza automatica arrestata istantaneamente'}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>

      {/* SPECIFICA COMPLETA 15 VERIFICHE V01 - V15 */}
      <GlassPanel padding="lg" radius="lg">
        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px' }}>
          🛡️ Protocollo Master Audit 15/15 (Controlli Automatici V01–V15 pre-Outreach)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '8px',
          }}
        >
          {MASTER_AUDIT_SPECS_15.map((spec) => (
            <div
              key={spec.code}
              style={{
                padding: '9px 11px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12px' }}>
                  [{spec.code}] {spec.name}
                </strong>
                <Badge variant="success" size="sm">ATTIVO</Badge>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                {spec.desc}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
