import { Search, KeyRound, Eye, FileText, Download, Link2 } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Select from '../../components/ui/Select';
import { CANONICAL_CLUSTER_PILLS, PIPELINE_STATUS_OPTIONS } from './constants';
import type { SdrB2BAgentOption } from './types';

interface SdrProspectsTableTabProps {
  canWrite: boolean;
  loading: boolean;
  prospects: any[];
  prospectsSummary: any;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filterSection: string;
  setFilterSection: (v: string) => void;
  filterVatOnly: boolean;
  setFilterVatOnly: (v: boolean) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterCluster: string;
  setFilterCluster: (v: string) => void;
  filterPipelineStatus: string;
  setFilterPipelineStatus: (v: string) => void;
  filterMaps: string;
  setFilterMaps: (v: string) => void;
  filterRegion: string;
  setFilterRegion: (v: string) => void;
  filterProvince: string;
  setFilterProvince: (v: string) => void;
  filterCity: string;
  setFilterCity: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  geoRegioni: any[];
  geoProvince: any[];
  selectedProspectIds: number[];
  setSelectedProspectIds: (ids: number[]) => void;
  b2bAgents: SdrB2BAgentOption[];
  selectedBatchAgentCode: string;
  setSelectedBatchAgentCode: (code: string) => void;
  onSearchSubmit: () => void;
  onPageChange: (page: number) => void;
  onPrepareOutreach: (ids?: number[]) => void;
  onDownloadExport: (format: 'csv' | 'json') => void;
  onOpenDossier: (id: number) => void;
  onDownloadCatalogPdf: (id: number, companyName: string) => void;
  onCopySmartLink: (id: number) => void;
  onCopyValue: (val: string, label: string) => void;
  onOpenCatalogBuilder: (companyName: string, category: 'IST' | 'RIV') => void;
}

export default function SdrProspectsTableTab({
  canWrite,
  loading,
  prospects,
  prospectsSummary,
  pagination,
  filterSection,
  setFilterSection,
  filterVatOnly,
  setFilterVatOnly,
  filterCategory,
  setFilterCategory,
  filterCluster,
  setFilterCluster,
  filterPipelineStatus,
  setFilterPipelineStatus,
  filterMaps,
  setFilterMaps,
  filterRegion,
  setFilterRegion,
  filterProvince,
  setFilterProvince,
  filterCity,
  setFilterCity,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  geoRegioni,
  geoProvince,
  selectedProspectIds,
  setSelectedProspectIds,
  b2bAgents,
  selectedBatchAgentCode,
  setSelectedBatchAgentCode,
  onSearchSubmit,
  onPageChange,
  onPrepareOutreach,
  onDownloadExport,
  onOpenDossier,
  onDownloadCatalogPdf,
  onCopySmartLink,
  onCopyValue,
  onOpenCatalogBuilder,
}: SdrProspectsTableTabProps) {
  const clusterCounts: Record<string, number> = prospectsSummary?.clusterCounts || {};

  const toggleSelectAllPage = () => {
    const pageIds = prospects.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedProspectIds.includes(id));
    if (allSelected) {
      setSelectedProspectIds(selectedProspectIds.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedProspectIds(Array.from(new Set([...selectedProspectIds, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    if (selectedProspectIds.includes(id)) {
      setSelectedProspectIds(selectedProspectIds.filter((x) => x !== id));
    } else {
      setSelectedProspectIds([...selectedProspectIds, id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* 4 CARD KPI CLICCABILI PER SEZIONE CONTATTI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {[
          {
            id: 'ALL',
            title: '🏢 Tutti i Lead B2B',
            count: Number(prospectsSummary.total || 0),
            sub: `${Number(prospectsSummary.vatCount || 0).toLocaleString('it-IT')} con P.IVA Mod-10`,
            color: '#2563eb',
          },
          {
            id: 'EMAIL_PRONTA',
            title: '✉️ Email Ordinaria Pronta',
            count: Number(prospectsSummary.ready || 0),
            sub: 'Verificate Anti-PEC • Pronte per Outreach',
            color: '#16a34a',
          },
          {
            id: 'SOLO_TELEFONO',
            title: '📞 Solo Telefono / WhatsApp',
            count: Number(prospectsSummary.phoneOnly || 0),
            sub: 'Ideali per telemarketing o Sentinella Web',
            color: '#d97706',
          },
          {
            id: 'PEC_SCARTATA',
            title: '🛡️ PEC Scartate dal Firewall',
            count: Number(prospectsSummary.pecOnly || 0),
            sub: 'Bloccate categoricamente da invio cold',
            color: '#dc2626',
          },
        ].map((sec) => {
          const active = filterSection === sec.id;
          return (
            <div
              key={sec.id}
              onClick={() => setFilterSection(sec.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: active ? `2px solid ${sec.color}` : '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: sec.color }}>{sec.title}</div>
              <div style={{ fontSize: '21px', fontWeight: 900, margin: '3px 0' }}>
                {sec.count.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sec.sub}</div>
            </div>
          );
        })}
      </div>

      {/* PILLS DEGLI 11 CLUSTER CANONICI DB CON CONTEGGIO REALE */}
      <GlassPanel padding="sm" radius="lg">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {CANONICAL_CLUSTER_PILLS.map((pill) => {
            const active = filterCluster === pill.value;
            const cnt =
              pill.value === 'ALL'
                ? Number(prospectsSummary.total || 0)
                : Number(clusterCounts[pill.value] || 0);
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setFilterCluster(pill.value)}
                style={{
                  border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: active ? '#ffffff' : 'var(--color-text-main)',
                  borderRadius: '999px',
                  padding: '5px 11px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {pill.label} ({cnt.toLocaleString('it-IT')})
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {/* BARRA FILTRI AVANZATI + EXPORT CSV/JSON */}
      <GlassPanel padding="md" radius="lg">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <TextInput
            fullWidth
            leftIcon={<Search size={14} />}
            placeholder="Cerca ragione sociale, email, P.IVA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
          />

          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: 'ALL', label: 'Listino: IST + RIV' },
              { value: 'IST', label: '⚡ IST — Installatori (40%)' },
              { value: 'RIV', label: '🏪 RIV — Rivenditori (50%)' },
            ]}
          />

          <Select
            value={filterPipelineStatus}
            onChange={(e) => setFilterPipelineStatus(e.target.value)}
            options={PIPELINE_STATUS_OPTIONS}
          />

          <Select
            value={filterMaps}
            onChange={(e) => setFilterMaps(e.target.value)}
            options={[
              { value: 'ALL', label: 'Bollatura: Tutte' },
              { value: 'VERIFIED_MAPS', label: '📍 Verificati Google Maps' },
              { value: 'CERTIFIED_FREE', label: '🏅 Certificati Multi-Fonte' },
              { value: 'UNVERIFIED_MAPS', label: '📋 Da Arricchire' },
            ]}
          />

          <Select
            value={filterRegion}
            onChange={(e) => {
              setFilterRegion(e.target.value);
              setFilterProvince('ALL');
            }}
            options={[
              { value: 'ALL', label: 'Tutte le Regioni' },
              ...geoRegioni.map((r: any) => ({
                value: r.regione || r.name,
                label: r.regione || r.name,
              })),
            ]}
          />

          <Select
            value={filterProvince}
            onChange={(e) => setFilterProvince(e.target.value)}
            options={[
              { value: 'ALL', label: 'Tutte le Province' },
              ...geoProvince.map((p: any) => ({
                value: p.sigla,
                label: `${p.provincia || p.nome} (${p.sigla})`,
              })),
            ]}
          />

          <TextInput
            fullWidth
            placeholder="Filtra Comune..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'email_first', label: 'Ordina: Email Pronte prima' },
              { value: 'score_desc', label: 'Ordina: Lead Score ↓' },
              { value: 'newest', label: 'Ordina: Più recenti' },
              { value: 'company_asc', label: 'Ordina: Ragione Sociale A-Z' },
            ]}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterVatOnly}
                onChange={(e) => setFilterVatOnly(e.target.checked)}
              />
              Solo con P.IVA validata Mod-10
            </label>
            <Button variant="primary" size="sm" icon={<Search size={13} />} onClick={onSearchSubmit}>
              Cerca
            </Button>
            {(filterCluster !== 'ALL' ||
              filterSection !== 'ALL' ||
              filterCategory !== 'ALL' ||
              filterPipelineStatus !== 'ALL' ||
              filterMaps !== 'ALL' ||
              filterRegion !== 'ALL' ||
              filterProvince !== 'ALL' ||
              filterCity ||
              filterVatOnly ||
              searchQuery) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilterSection('ALL');
                  setFilterCluster('ALL');
                  setFilterCategory('ALL');
                  setFilterPipelineStatus('ALL');
                  setFilterMaps('ALL');
                  setFilterRegion('ALL');
                  setFilterProvince('ALL');
                  setFilterCity('');
                  setFilterVatOnly(false);
                  setSearchQuery('');
                }}
              >
                Reset Filtri
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => onDownloadExport('csv')}>
              Esporta CSV
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => onDownloadExport('json')}>
              Esporta JSON
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* BARRA AZIONE BATCH PREPARAZIONE CREDENZIALI + AGENTE B2B DINAMICO */}
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
          <div style={{ fontSize: '12.5px' }}>
            <strong>{pagination.total.toLocaleString('it-IT')}</strong> aziende trovate •{' '}
            <strong>{selectedProspectIds.length}</strong> selezionate per preparazione Offerta 1° Acquisto (Solo 2gg) + Smart Catalistino PDF
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {b2bAgents.length > 0 && (
              <div style={{ minWidth: '240px' }}>
                <Select
                  value={selectedBatchAgentCode}
                  onChange={(e) => setSelectedBatchAgentCode(e.target.value)}
                  options={b2bAgents.map((a) => ({
                    value: a.code,
                    label: `👤 Agente: ${a.name} (Cod. ${a.code})`,
                  }))}
                />
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={<KeyRound size={14} />}
              onClick={() => onPrepareOutreach(selectedProspectIds.length > 0 ? selectedProspectIds : undefined)}
              disabled={!canWrite || loading}
            >
              {selectedProspectIds.length > 0
                ? `Prepara Credenziali + Bozza (${selectedProspectIds.length} selezionati)`
                : 'Prepara Lotto Automatico (Top 10 Email Pronte)'}
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* TABELLA LEAD B2B */}
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
              <th style={{ padding: '10px 12px', width: '36px' }}>
                <input
                  type="checkbox"
                  checked={
                    prospects.length > 0 &&
                    prospects.every((p) => selectedProspectIds.includes(p.id))
                  }
                  onChange={toggleSelectAllPage}
                />
              </th>
              <th style={{ padding: '10px 12px' }}>Azienda &amp; P.IVA</th>
              <th style={{ padding: '10px 12px' }}>Cluster &amp; Listino</th>
              <th style={{ padding: '10px 12px' }}>Territorio</th>
              <th style={{ padding: '10px 12px' }}>Email Ordinaria &amp; Telefono</th>
              <th style={{ padding: '10px 12px' }}>Stato Pipeline</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading && prospects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Caricamento anagrafiche B2B in corso...
                </td>
              </tr>
            ) : prospects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Nessun lead corrisponde ai filtri selezionati.
                </td>
              </tr>
            ) : (
              prospects.map((p) => {
                const isSelected = selectedProspectIds.includes(p.id);
                const isRiv = p.commercialCategory === 'RIV';
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(p.id)}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div
                        onClick={() => onOpenDossier(p.id)}
                        style={{ fontWeight: 800, cursor: 'pointer', color: 'var(--color-primary)' }}
                      >
                        {p.companyName}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                        {p.vatNumber && (
                          <span
                            onClick={() => onCopyValue(`IT${p.vatNumber}`, 'P.IVA')}
                            style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                          >
                            P.IVA IT{p.vatNumber} 📋
                          </span>
                        )}
                        {p.website && (
                          <a
                            href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '11px', color: 'var(--color-primary)' }}
                          >
                            Sito ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>{p.categoryCluster}</div>
                      <Badge variant={isRiv ? 'primary' : 'neutral'} size="sm">
                        {isRiv ? 'RIV 50% + 10% (2gg)' : 'IST 40% + 10% (2gg)'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>
                        {p.city || '—'} {p.province ? `(${p.province})` : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.region || ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {p.ordinaryEmail ? (
                        <div
                          onClick={() => onCopyValue(p.ordinaryEmail, 'Email')}
                          style={{ fontWeight: 700, color: '#16a34a', cursor: 'pointer' }}
                        >
                          ✉️ {p.ordinaryEmail}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                          Nessuna email ordinaria
                        </div>
                      )}
                      {p.phone && (
                        <div
                          onClick={() => onCopyValue(p.phone, 'Telefono')}
                          style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '2px' }}
                        >
                          📞 {p.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge
                        variant={
                          p.pipelineStatus === 'Convertito' || p.pipelineStatus === 'Catalogo_Aperto'
                            ? 'success'
                            : p.pipelineStatus === 'Loggato_Senza_Ordine' || p.pipelineStatus === 'Risposta_Ricevuta'
                              ? 'warning'
                              : p.pipelineStatus === 'Contattato' || p.pipelineStatus === 'Pronto_Invio'
                                ? 'primary'
                                : 'neutral'
                        }
                        size="sm"
                      >
                        {p.pipelineStatus || 'Nuovo'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', flexWrap: 'wrap' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => onOpenDossier(p.id)}
                        >
                          Dossier
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download size={13} />}
                          title="Scarica Catalistino PDF 2gg Reale"
                          onClick={() => onDownloadCatalogPdf(p.id, p.companyName)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Link2 size={13} />}
                          title="Copia Smart Link Tracciato (/offerta/[token])"
                          onClick={() => onCopySmartLink(p.id)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FileText size={13} />}
                          title="Apri in Catalog Builder"
                          onClick={() => onOpenCatalogBuilder(p.companyName, isRiv ? 'RIV' : 'IST')}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* PAGINAZIONE */}
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px',
          }}
        >
          <span>
            Pagina <strong>{pagination.page}</strong> di <strong>{Math.max(1, pagination.totalPages)}</strong> (
            {pagination.total.toLocaleString('it-IT')} lead totali)
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ← Precedente
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Successiva →
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
