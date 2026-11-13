import { Play, Square, Globe, Terminal, Sparkles, RefreshCcw } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import { SEARCH_CATEGORIES } from './constants';
import type { SdrMapsBudgetState, SdrMapsBollaturaState } from './types';

interface SdrSearchMiningTabProps {
  canWrite: boolean;
  loading: boolean;
  geoRegioni: any[];
  geoProvince: any[];
  geoComuni: any[];
  searchRegione: string;
  setSearchRegione: (v: string) => void;
  searchProvincia: string;
  setSearchProvincia: (v: string) => void;
  searchComune: string;
  setSearchComune: (v: string) => void;
  searchCategoria: string;
  setSearchCategoria: (v: string) => void;
  searchMaxResults: string;
  setSearchMaxResults: (v: string) => void;
  zonaSummary: any;
  searchStatus: any;
  mapsBudget: SdrMapsBudgetState;
  dailyBudgetInput: string;
  setDailyBudgetInput: (v: string) => void;
  mapsBollatura: SdrMapsBollaturaState;
  consoleLogs: any[];
  onStartSearch: () => void;
  onStartItalyScan: () => void;
  onStopSearch: () => void;
  onSaveMapsBudget: (mode: 'free_tier' | 'daily_budget', eur: number) => void;
  onFilterByMapsBollatura: (tier: string) => void;
  onToggleSentinel: () => void;
  onTriggerSentinel: () => void;
  onRefreshLogs: () => void;
}

export default function SdrSearchMiningTab({
  canWrite,
  loading,
  geoRegioni,
  geoProvince,
  geoComuni,
  searchRegione,
  setSearchRegione,
  searchProvincia,
  setSearchProvincia,
  searchComune,
  setSearchComune,
  searchCategoria,
  setSearchCategoria,
  searchMaxResults,
  setSearchMaxResults,
  zonaSummary,
  searchStatus,
  mapsBudget,
  dailyBudgetInput,
  setDailyBudgetInput,
  mapsBollatura,
  consoleLogs,
  onStartSearch,
  onStartItalyScan,
  onStopSearch,
  onSaveMapsBudget,
  onFilterByMapsBollatura,
  onToggleSentinel,
  onTriggerSentinel,
  onRefreshLogs,
}: SdrSearchMiningTabProps) {
  const isRunning = Boolean(searchStatus?.running);
  const sentinelActive = Boolean(searchStatus?.sentinel?.active ?? true);
  const exploredComuni = Number(searchStatus?.phase1?.explored_istat_municipalities || 0);
  const totalIstatComuni = 7904;
  const phase1Pct = Math.min(
    100,
    Number(searchStatus?.phase1?.progress_pct || ((exploredComuni / totalIstatComuni) * 100).toFixed(1))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* SELETTORE GEOGRAFICO ISTAT A 3 LIVELLI + CARD TURBO ITALIA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 'var(--spacing-lg)',
          alignItems: 'stretch',
        }}
      >
        <GlassPanel padding="lg" radius="lg" style={{ flex: 2 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '14px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-main)' }}>
                🔍 Ricerca Clienti B2B in Tutta Italia (Catalogo ISTAT: 20 Regioni • 107 Province • 7.904 Comuni)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Motore multi-fonte (PagineGialle + PagineBianche + Deep-Web Crawler + Google Places protetto + Firewall Anti-PEC).
              </div>
            </div>
            <Badge variant={isRunning ? 'success' : 'neutral'} size="sm">
              {isRunning ? '⚡ SCANSIONE ATTIVA' : 'MOTORE PRONTO'}
            </Badge>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                1. REGIONE ISTAT
              </label>
              <Select
                value={searchRegione}
                onChange={(e) => setSearchRegione(e.target.value)}
                options={[
                  { value: 'TUTTA_ITALIA', label: '🇮🇹 Tutta Italia (20 Regioni)' },
                  ...geoRegioni.map((r: any) => ({
                    value: r.regione || r.name,
                    label: `${r.regione || r.name} (${r.num_province || ''} prov.)`,
                  })),
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                2. PROVINCIA
              </label>
              <Select
                value={searchProvincia}
                onChange={(e) => setSearchProvincia(e.target.value)}
                options={[
                  { value: '', label: 'Tutte le Province' },
                  ...geoProvince.map((p: any) => ({
                    value: p.sigla,
                    label: `${p.provincia || p.nome} (${p.sigla})`,
                  })),
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                3. COMUNE SPECIFICO
              </label>
              <Select
                value={searchComune}
                onChange={(e) => setSearchComune(e.target.value)}
                disabled={!searchProvincia}
                options={[
                  { value: '', label: searchProvincia ? 'Tutti i Comuni della Provincia' : 'Seleziona prima Provincia' },
                  ...geoComuni.map((c: any) => ({
                    value: c.denominazione || c.comune || c.nome,
                    label: c.denominazione || c.comune || c.nome,
                  })),
                ]}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                4. CLUSTER MERCEOLOGICO B2B (11 CLUSTER CANONICI)
              </label>
              <Select
                value={searchCategoria}
                onChange={(e) => setSearchCategoria(e.target.value)}
                options={SEARCH_CATEGORIES}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                MAX LEAD / LOTTO
              </label>
              <TextInput
                fullWidth
                type="number"
                min={10}
                max={500}
                value={searchMaxResults}
                onChange={(e) => setSearchMaxResults(e.target.value)}
              />
            </div>
          </div>

          {zonaSummary && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                📍 <strong>Perimetro selezionato:</strong> {zonaSummary.scope_label || searchRegione} •{' '}
                <strong>{Number(zonaSummary.comuni_count || 0).toLocaleString('it-IT')}</strong> comuni ISTAT
              </span>
              <span>
                Già a DB in zona:{' '}
                <strong style={{ color: 'var(--color-primary)' }}>
                  {Number(zonaSummary.existing_leads || 0).toLocaleString('it-IT')}
                </strong>{' '}
                aziende ({Number(zonaSummary.ready_emails || 0).toLocaleString('it-IT')} email pronte)
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Play size={14} />}
              onClick={onStartSearch}
              disabled={!canWrite || loading || isRunning}
            >
              Avvia Ricerca nel Perimetro Selezionato
            </Button>
            {isRunning && (
              <Button variant="danger" icon={<Square size={14} />} onClick={onStopSearch} disabled={!canWrite}>
                Arresta Ricerca
              </Button>
            )}
          </div>
        </GlassPanel>

        <GlassPanel
          padding="lg"
          radius="lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--color-primary)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Badge variant="primary" size="sm">
                🇮🇹 SCANSIONE NAZIONALE CONTINUA
              </Badge>
              <Badge variant={sentinelActive ? 'success' : 'warning'} size="sm">
                {sentinelActive ? 'SENTINELLA 24/7 ON' : 'SENTINELLA PAUSA'}
              </Badge>
            </div>
            <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
              Scansione Integrale 7.904 Comuni + Sentinella Web
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Esplora progressivamente tutti i comuni italiani non ancora mappati, arricchisce siti web, email ordinarie (zero PEC), P.IVA Modulo-10 e aggiorna la mappa territoriale.
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                <span>Comuni ISTAT Esplorati</span>
                <span>
                  {exploredComuni.toLocaleString('it-IT')} / {totalIstatComuni.toLocaleString('it-IT')} ({phase1Pct}%)
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  borderRadius: '999px',
                  background: 'var(--color-border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, phase1Pct)}%`,
                    height: '100%',
                    background: 'var(--color-primary)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              {searchStatus?.phase1?.current_region && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Regione corrente: <strong>{searchStatus.phase1.current_region}</strong> • Trovati ultimo ciclo:{' '}
                  <strong>{searchStatus.phase1.cycle_found_count || 0}</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            <Button
              variant="primary"
              size="sm"
              icon={<Globe size={14} />}
              onClick={onStartItalyScan}
              disabled={!canWrite || loading || isRunning}
            >
              Avvia Scansione Italia
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={onTriggerSentinel}
              disabled={!canWrite || loading}
            >
              Ciclo Sentinella Ora
            </Button>
            <Button variant="secondary" size="sm" onClick={onToggleSentinel} disabled={!canWrite}>
              {sentinelActive ? 'Pausa Sentinella' : 'Attiva Sentinella'}
            </Button>
          </div>
        </GlassPanel>
      </div>

      {/* CONTROLLO COSTI GOOGLE MAPS & 3 CARD BOLLATURA CLICCABILI */}
      <GlassPanel padding="lg" radius="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>
              🛡️ Scudo Costi Google Maps API &amp; Bollatura Certificazione Lead
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Scegli se operare a costo zero assoluto (Franchigia Gratuita) o con budget giornaliero controllato. Clicca una bollatura per filtrare i lead.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant={mapsBudget.mode === 'free_tier' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onSaveMapsBudget('free_tier', 0)}
              disabled={!canWrite}
            >
              🟢 Strada Gratuita (€ 0,00/giorno)
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '95px' }}>
                <TextInput
                  type="number"
                  min={0}
                  step="0.5"
                  value={dailyBudgetInput}
                  onChange={(e) => setDailyBudgetInput(e.target.value)}
                  placeholder="€ / giorno"
                />
              </div>
              <Button
                variant={mapsBudget.mode === 'daily_budget' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onSaveMapsBudget('daily_budget', Number(dailyBudgetInput || 0))}
                disabled={!canWrite}
              >
                Imposta Budget €/g
              </Button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {[
            {
              tier: 'VERIFIED_MAPS',
              title: '📍 Verificati Google Maps',
              count: Number(mapsBollatura.verifiedMapsCount || 0),
              desc: 'Scheda Google Places verificata con rating/coordinate',
              accent: '#16a34a',
            },
            {
              tier: 'CERTIFIED_FREE',
              title: '🏅 Certificati Multi-Fonte (€ 0)',
              count: Number(mapsBollatura.certifiedFreeCount || 0),
              desc: 'Sito ufficiale + Email ordinaria o P.IVA validata Mod-10',
              accent: '#2563eb',
            },
            {
              tier: 'UNVERIFIED_MAPS',
              title: '📋 Da Arricchire / Directory',
              count: Number(mapsBollatura.unverifiedMapsCount || 0),
              desc: 'Anagrafica base in coda alla Sentinella Deep-Web',
              accent: '#d97706',
            },
          ].map((card) => (
            <div
              key={card.tier}
              onClick={() => onFilterByMapsBollatura(card.tier)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                borderLeft: `4px solid ${card.accent}`,
                background: 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: card.accent }}>{card.title}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, margin: '4px 0', color: 'var(--color-text-main)' }}>
                {card.count.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{card.desc} → Filtra</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* TERMINALE LIVE CONDIVISO REDIS */}
      <GlassPanel padding="lg" radius="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
            <Terminal size={16} />
            <span>Console Live Multi-Worker (Scraper • Deep-Web Profiler • Aruba SSL Outreach • Kill-Switch IMAP)</span>
          </div>
          <Button variant="secondary" size="sm" icon={<RefreshCcw size={13} />} onClick={onRefreshLogs}>
            Aggiorna Log
          </Button>
        </div>

        <div
          style={{
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '11.5px',
            maxHeight: '260px',
            overflowY: 'auto',
            lineHeight: 1.55,
          }}
        >
          {consoleLogs.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>
              [SISTEMA PRONTO] In attesa di eventi dai worker SDR su Redis (`sdr:console:logs`)...
            </div>
          ) : (
            consoleLogs.map((entry: any, i: number) => {
              const lvl = String(entry.level || 'INFO').toUpperCase();
              const color =
                lvl === 'ERROR'
                  ? '#f87171'
                  : lvl === 'WARN'
                    ? '#fbbf24'
                    : lvl === 'SUCCESS'
                      ? '#4ade80'
                      : '#38bdf8';
              return (
                <div key={i} style={{ marginBottom: '3px', wordBreak: 'break-word' }}>
                  <span style={{ color: '#64748b' }}>[{entry.ts || entry.timestamp || '--:--:--'}]</span>{' '}
                  <span style={{ color, fontWeight: 700 }}>[{lvl}]</span>{' '}
                  <span>{entry.msg || entry.message || JSON.stringify(entry)}</span>
                </div>
              );
            })
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
