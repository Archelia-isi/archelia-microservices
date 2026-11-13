import { RefreshCcw, ChevronRight, Building2, Eye, MapPin, Mail, Globe } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { ITALY_SVG_REGIONS } from './constants';

interface SdrItalyMapTabProps {
  territoryMapData: any;
  mapMacroFilter: 'ALL' | 'ACTIVE' | 'NORD' | 'CENTRO' | 'SUD';
  setMapMacroFilter: (f: 'ALL' | 'ACTIVE' | 'NORD' | 'CENTRO' | 'SUD') => void;
  selectedMapRegion: string | null;
  setSelectedMapRegion: (r: string | null) => void;
  selectedMapProvince: string | null;
  setSelectedMapProvince: (p: string | null) => void;
  selectedMapComune: string | null;
  setSelectedMapComune: (c: string | null) => void;
  provinceComuniStats: any[];
  comuneCompanies: any[];
  loadingMapComuni: boolean;
  onRefreshMap: () => void;
  onSelectProvince: (sigla: string) => void;
  onSelectComune: (sigla: string, comuneName: string) => void;
  onOpenDossier: (prospectId: number) => void;
  onJumpToProspectsWithGeo: (region: string, province?: string, city?: string) => void;
}

export default function SdrItalyMapTab({
  territoryMapData,
  mapMacroFilter,
  setMapMacroFilter,
  selectedMapRegion,
  setSelectedMapRegion,
  selectedMapProvince,
  setSelectedMapProvince,
  selectedMapComune,
  setSelectedMapComune,
  provinceComuniStats,
  comuneCompanies,
  loadingMapComuni,
  onRefreshMap,
  onSelectProvince,
  onSelectComune,
  onOpenDossier,
  onJumpToProspectsWithGeo,
}: SdrItalyMapTabProps) {
  const regionsList: any[] = territoryMapData?.regions || [];
  const national = territoryMapData?.national || {
    totalLeads: 0,
    readyEmails: 0,
    activeRegions: 0,
    totalIstatComuni: 7904,
    exploredMunicipalitiesCount: 0,
  };

  const regionByName = new Map<string, any>();
  regionsList.forEach((r) => {
    regionByName.set(String(r.regione || r.name), r);
  });

  const filteredRegions = regionsList.filter((r) => {
    if (mapMacroFilter === 'ACTIVE') return Number(r.totalLeads || 0) > 0;
    if (mapMacroFilter === 'NORD' || mapMacroFilter === 'CENTRO' || mapMacroFilter === 'SUD') {
      return String(r.macroArea || '').toUpperCase().includes(mapMacroFilter);
    }
    return true;
  });

  const activeRegionObj = selectedMapRegion ? regionByName.get(selectedMapRegion) : null;
  const provincesOfRegion: any[] = activeRegionObj?.provinces || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* KPI NAZIONALI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        <StatCard
          title="Lead B2B Mappati in Italia"
          value={Number(national.totalLeads || 0).toLocaleString('it-IT')}
          icon={<Building2 size={18} />}
        />
        <StatCard
          title="Email Ordinarie Pronte"
          value={Number(national.readyEmails || 0).toLocaleString('it-IT')}
          icon={<Mail size={18} />}
        />
        <StatCard
          title="Regioni Presidiate"
          value={`${national.activeRegions || regionsList.filter((r) => r.totalLeads > 0).length} / 20`}
          icon={<Globe size={18} />}
        />
        <StatCard
          title="Comuni ISTAT Esplorati"
          value={`${Number(national.exploredMunicipalitiesCount || national.activeMunicipalities || 0).toLocaleString('it-IT')} / 7.904`}
          icon={<MapPin size={18} />}
        />
      </div>

      {/* BARRA FILTRI MACRO-AREA & BREADCRUMB 4 LIVELLI */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'ALL', label: '🇮🇹 Tutte le 20 Regioni' },
                { id: 'ACTIVE', label: '⚡ Con Lead Attivi' },
                { id: 'NORD', label: '🏔️ Nord' },
                { id: 'CENTRO', label: '🏛️ Centro' },
                { id: 'SUD', label: '☀️ Sud & Isole' },
              ] as const
            ).map((f) => (
              <Button
                key={f.id}
                variant={mapMacroFilter === f.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMapMacroFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(selectedMapRegion || selectedMapProvince || selectedMapComune) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedMapRegion(null);
                  setSelectedMapProvince(null);
                  setSelectedMapComune(null);
                }}
              >
                ← Torna a Italia Intera
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<RefreshCcw size={13} />} onClick={onRefreshMap}>
              Ricalcola Mappa
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* LAYOUT A 2 COLONNE: SVG ITALIA + DRILL-DOWN 4 LIVELLI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 380px) 1fr',
          gap: 'var(--spacing-lg)',
          alignItems: 'start',
        }}
      >
        {/* MAPPA SVG INTERATTIVA */}
        <GlassPanel padding="lg" radius="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '13.5px', marginBottom: '8px' }}>
            🗺️ Cartografia Interattiva B2B Italia
          </div>
          <svg viewBox="50 30 540 670" style={{ width: '100%', maxHeight: '490px' }}>
            {ITALY_SVG_REGIONS.map((reg) => {
              const stat = regionByName.get(reg.name);
              const count = Number(stat?.totalLeads || 0);
              const isSelected = selectedMapRegion === reg.name;
              const fill = isSelected
                ? '#2563eb'
                : count > 5000
                  ? '#1d4ed8'
                  : count > 1000
                    ? '#3b82f6'
                    : count > 100
                      ? '#60a5fa'
                      : count > 0
                        ? '#93c5fd'
                        : 'rgba(148, 163, 184, 0.28)';
              return (
                <g
                  key={reg.name}
                  onClick={() => {
                    setSelectedMapRegion(reg.name);
                    setSelectedMapProvince(null);
                    setSelectedMapComune(null);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={reg.d}
                    fill={fill}
                    stroke={isSelected ? '#f59e0b' : '#ffffff'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  >
                    <title>
                      {reg.name}: {count.toLocaleString('it-IT')} lead ({Number(stat?.readyEmails || 0).toLocaleString('it-IT')} email pronte)
                    </title>
                  </path>
                </g>
              );
            })}
          </svg>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
            Clicca una regione sulla mappa per esplorare Province → Comuni → Singole Aziende
          </div>
        </GlassPanel>

        {/* PANNELLO DRILL-DOWN: LIVELLO 1 REGIONI -> LIVELLO 2 PROVINCE -> LIVELLO 3 COMUNI -> LIVELLO 4 AZIENDE */}
        <GlassPanel padding="lg" radius="lg">
          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
              onClick={() => {
                setSelectedMapRegion(null);
                setSelectedMapProvince(null);
                setSelectedMapComune(null);
              }}
            >
              🇮🇹 Italia
            </span>
            {selectedMapRegion && (
              <>
                <ChevronRight size={14} />
                <span
                  style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                  onClick={() => {
                    setSelectedMapProvince(null);
                    setSelectedMapComune(null);
                  }}
                >
                  {selectedMapRegion}
                </span>
              </>
            )}
            {selectedMapProvince && (
              <>
                <ChevronRight size={14} />
                <span
                  style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                  onClick={() => setSelectedMapComune(null)}
                >
                  Provincia ({selectedMapProvince})
                </span>
              </>
            )}
            {selectedMapComune && (
              <>
                <ChevronRight size={14} />
                <span>Comune di {selectedMapComune}</span>
              </>
            )}
          </div>

          {/* LIVELLO 1: ELENCO REGIONI */}
          {!selectedMapRegion && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '10px',
              }}
            >
              {filteredRegions.map((reg: any) => {
                const name = reg.regione || reg.name;
                return (
                  <div
                    key={name}
                    onClick={() => setSelectedMapRegion(name)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13.5px' }}>{name}</strong>
                      <Badge variant="primary" size="sm">
                        {Number(reg.totalLeads || 0).toLocaleString('it-IT')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      ✉️ {Number(reg.readyEmails || 0).toLocaleString('it-IT')} email • 🏛️{' '}
                      {(reg.provinces || []).length} province
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIVELLO 2: PROVINCE DELLA REGIONE */}
          {selectedMapRegion && !selectedMapProvince && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>
                  Province di {selectedMapRegion} ({provincesOfRegion.length})
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onJumpToProspectsWithGeo(selectedMapRegion)}
                >
                  Apri tutti i Lead di {selectedMapRegion} →
                </Button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '10px',
                }}
              >
                {provincesOfRegion.map((prov: any) => (
                  <div
                    key={prov.sigla}
                    onClick={() => {
                      setSelectedMapProvince(prov.sigla);
                      onSelectProvince(prov.sigla);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>
                        {prov.provincia || prov.name} ({prov.sigla})
                      </strong>
                      <Badge variant="primary" size="sm">
                        {Number(prov.totalLeads || 0).toLocaleString('it-IT')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      ✉️ {Number(prov.readyEmails || 0).toLocaleString('it-IT')} email pronte
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVELLO 3: COMUNI DELLA PROVINCIA */}
          {selectedMapRegion && selectedMapProvince && !selectedMapComune && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>
                  Comuni di {selectedMapProvince} ({provinceComuniStats.length})
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onJumpToProspectsWithGeo(selectedMapRegion, selectedMapProvince)}
                >
                  Filtra Provincia {selectedMapProvince} in Tabella →
                </Button>
              </div>
              {loadingMapComuni ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Caricamento comuni ISTAT della provincia...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '8px',
                    maxHeight: '460px',
                    overflowY: 'auto',
                  }}
                >
                  {provinceComuniStats.map((com: any, i: number) => {
                    const cName = com.comune || com.city || com.denominazione;
                    return (
                      <div
                        key={`${cName}-${i}`}
                        onClick={() => onSelectComune(selectedMapProvince, cName)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '12.5px' }}>{cName}</strong>
                          <Badge variant={com.totalLeads > 0 ? 'success' : 'neutral'} size="sm">
                            {Number(com.totalLeads || com.count || 0)}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          ✉️ {Number(com.readyEmails || 0)} email
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LIVELLO 4: AZIENDE DEL SINGOLO COMUNE */}
          {selectedMapRegion && selectedMapProvince && selectedMapComune && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>
                  <Building2 size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Aziende B2B nel Comune di {selectedMapComune} ({comuneCompanies.length})
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    onJumpToProspectsWithGeo(selectedMapRegion, selectedMapProvince, selectedMapComune)
                  }
                >
                  Apri in Lead B2B →
                </Button>
              </div>
              {loadingMapComuni ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Caricamento aziende di {selectedMapComune}...
                </div>
              ) : comuneCompanies.length === 0 ? (
                <div style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '12.5px' }}>
                  Nessuna azienda ancora censita in questo comune. Avvia una scansione mirata dal tab Ricerca &amp; Mining!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '460px', overflowY: 'auto' }}>
                  {comuneCompanies.map((comp: any) => (
                    <div
                      key={comp.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px' }}>{comp.companyName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                          {comp.categoryCluster} • {comp.ordinaryEmail || comp.phone || 'Solo anagrafica'}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={13} />}
                        onClick={() => onOpenDossier(comp.id)}
                      >
                        Dossier 360°
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
