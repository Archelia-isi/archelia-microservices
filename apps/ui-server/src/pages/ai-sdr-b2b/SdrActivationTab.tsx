import { Search, Percent, Eye, Download, Link2 } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';

export type PromoActivationSubTab = 'logged_in' | 'opened_catalog' | 'contacted' | 'converted';

interface SdrActivationTabProps {
  loading: boolean;
  promoLoggedIn: any[];
  promoOpenedCatalog: any[];
  promoContacted: any[];
  promoConverted: any[];
  promoSubTab: PromoActivationSubTab;
  setPromoSubTab: (t: PromoActivationSubTab) => void;
  promoSearch: string;
  setPromoSearch: (v: string) => void;
  onRefreshPromo: () => void;
  onOpenDiscountsApp: () => void;
  onOpenDossier: (prospectId: number) => void;
  onDownloadCatalogPdf: (prospectId: number, companyName: string) => void;
  onCopySmartLink: (prospectId: number) => void;
  onCopyValue: (val: string, label: string) => void;
}

export default function SdrActivationTab({
  loading,
  promoLoggedIn,
  promoOpenedCatalog,
  promoContacted,
  promoConverted,
  promoSubTab,
  setPromoSubTab,
  promoSearch,
  setPromoSearch,
  onRefreshPromo,
  onOpenDiscountsApp,
  onOpenDossier,
  onDownloadCatalogPdf,
  onCopySmartLink,
  onCopyValue,
}: SdrActivationTabProps) {
  const activeRows =
    promoSubTab === 'logged_in'
      ? promoLoggedIn
      : promoSubTab === 'opened_catalog'
        ? promoOpenedCatalog
        : promoSubTab === 'contacted'
          ? promoContacted
          : promoConverted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* BARRA 4 SUB-TAB FUNNEL DI ATTIVAZIONE B2B */}
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant={promoSubTab === 'logged_in' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPromoSubTab('logged_in')}
            >
              🔥 Loggati Senza Ordine ({promoLoggedIn.length})
            </Button>
            <Button
              variant={promoSubTab === 'opened_catalog' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPromoSubTab('opened_catalog')}
            >
              👀 Hanno Aperto il Catalistino PDF ({promoOpenedCatalog.length})
            </Button>
            <Button
              variant={promoSubTab === 'contacted' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPromoSubTab('contacted')}
            >
              📨 Credenziali Pronte / Inviate ({promoContacted.length})
            </Button>
            <Button
              variant={promoSubTab === 'converted' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPromoSubTab('converted')}
            >
              🏆 Convertiti 1° Ordine ({promoConverted.length})
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '240px' }}>
              <TextInput
                leftIcon={<Search size={14} />}
                placeholder="Cerca cliente o username..."
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRefreshPromo()}
              />
            </div>
            <Button variant="secondary" size="sm" icon={<Percent size={14} />} onClick={onOpenDiscountsApp}>
              Regole Sconto B2B
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* TABELLA CLIENTI IN ATTIVAZIONE */}
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
              <th style={{ padding: '10px 12px' }}>Ragione Sociale &amp; Contatti</th>
              <th style={{ padding: '10px 12px' }}>Credenziali Portale B2B</th>
              <th style={{ padding: '10px 12px' }}>Sconto 1° Acquisto (Solo 2gg)</th>
              <th style={{ padding: '10px 12px' }}>Aperture Catalistino &amp; Login</th>
              <th style={{ padding: '10px 12px' }}>Agente Assegnato</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading && activeRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Caricamento pipeline di attivazione...
                </td>
              </tr>
            ) : activeRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Nessun cliente presente in questa fase del funnel.
                </td>
              </tr>
            ) : (
              activeRows.map((item: any) => {
                const pId = item.prospectId || item.prospect?.id;
                const openCount = Number(item.catalogOpenCount || 0);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800 }}>{item.companyName}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        {item.email} {item.phone ? `• 📞 ${item.phone}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div>
                        User: <code style={{ fontWeight: 800 }}>{item.username}</code>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        Pass: <code>{item.tempPassword || 'Personalizzata dal cliente'}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onCopyValue(
                            `Username: ${item.username} | Password: ${item.tempPassword || '(già personalizzata)'}`,
                            'Credenziali B2B'
                          )
                        }
                        style={{
                          marginTop: '3px',
                          border: 'none',
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: 'var(--color-primary)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Copia Credenziali
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant="success" size="sm">
                        ⚡ {item.baseDiscount || 40}% + {item.extraFirstPurchasePct || 10}% (2gg)
                      </Badge>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        {item.commercialCategory === 'RIV' ? 'Listino RIV Rivenditore' : 'Listino IST Installatore'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {openCount > 0 ? (
                        <div>
                          <Badge variant="warning" size="sm">
                            👀 PDF Aperto {openCount}x
                          </Badge>
                          {item.catalogOpenedAt && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Ultima: {new Date(item.catalogOpenedAt).toLocaleString('it-IT')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Non ancora aperto</span>
                      )}
                      {item.firstLoginAt && (
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '3px' }}>
                          🔑 1° Login: {new Date(item.firstLoginAt).toLocaleString('it-IT')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>
                        {item.assignedAgentName || 'Daniele Savoia'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Cod. {item.assignedAgentCode || '003'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {pId && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Link2 size={13} />}
                              title="Copia Smart Link Offerta"
                              onClick={() => onCopySmartLink(pId)}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Download size={13} />}
                              title="Scarica Catalistino PDF Reale"
                              onClick={() => onDownloadCatalogPdf(pId, item.companyName)}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye size={13} />}
                              onClick={() => onOpenDossier(pId)}
                            >
                              Dossier
                            </Button>
                          </>
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
    </div>
  );
}
