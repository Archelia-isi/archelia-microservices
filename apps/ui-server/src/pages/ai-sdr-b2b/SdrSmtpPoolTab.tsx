import { useState } from 'react';
import { Plus, ShieldCheck, Play, Pause, Trash2, Edit3, Gauge, Mail, Eye, Award } from 'lucide-react';
import GlassPanel from '../../components/ui/GlassPanel';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Modal from '../../components/ui/Modal';
import { ARUBA_B2B_DOMAINS, SPEED_GEAR_OPTIONS } from './constants';
import type { SdrInboxAccountItem } from './types';

interface SdrSmtpPoolTabProps {
  canWrite: boolean;
  loading: boolean;
  statsData: any;
  onSetSpeedGear: (gear: 'prudente' | 'intermedia' | 'rampup_auto' | 'regime_pieno') => void;
  onTestInboxSsl: (id: number) => void;
  onToggleInboxActive: (inbox: SdrInboxAccountItem) => void;
  onDeleteInbox: (id: number, email: string) => void;
  onSaveInbox: (payload: any, editId?: number) => Promise<boolean>;
}

export default function SdrSmtpPoolTab({
  canWrite,
  loading,
  statsData,
  onSetSpeedGear,
  onTestInboxSsl,
  onToggleInboxActive,
  onDeleteInbox,
  onSaveInbox,
}: SdrSmtpPoolTabProps) {
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [searchInbox, setSearchInbox] = useState<string>('');
  const [testingId, setTestingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInbox, setEditingInbox] = useState<SdrInboxAccountItem | null>(null);
  const [form, setForm] = useState({
    email: '',
    displayName: 'Daniele Savoia — Izzo Distribuzione',
    smtpHost: 'smtps.aruba.it',
    smtpPort: 465,
    imapHost: 'imaps.aruba.it',
    imapPort: 993,
    password: '',
    dailyLimit: 15,
    warmupEnabled: true,
  });

  const inboxes: SdrInboxAccountItem[] = statsData?.inboxAccounts || [];
  const kpis = statsData?.kpis || {};
  const activeInboxesCount = inboxes.filter((i) => i.isActive).length;
  const totalDailyCapacity =
    Number(kpis.totalDailyPoolCapacity) ||
    inboxes
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + Number(i.effectiveDailyLimit ?? i.dailyLimit ?? 5), 0);
  const totalSentToday =
    Number(kpis.totalSentToday) || inboxes.reduce((sum, i) => sum + Number(i.sentToday || 0), 0);

  const filteredInboxes = inboxes.filter((inb) => {
    if (domainFilter !== 'ALL' && !inb.email.toLowerCase().endsWith(`@${domainFilter}`)) {
      return false;
    }
    if (searchInbox.trim()) {
      const q = searchInbox.toLowerCase();
      if (!inb.email.toLowerCase().includes(q) && !inb.displayName.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingInbox(null);
    setForm({
      email: '',
      displayName: 'Daniele Savoia — Izzo Distribuzione',
      smtpHost: 'smtps.aruba.it',
      smtpPort: 465,
      imapHost: 'imaps.aruba.it',
      imapPort: 993,
      password: '',
      dailyLimit: 15,
      warmupEnabled: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (inb: SdrInboxAccountItem) => {
    setEditingInbox(inb);
    setForm({
      email: inb.email,
      displayName: inb.displayName,
      smtpHost: inb.smtpHost || 'smtps.aruba.it',
      smtpPort: Number(inb.smtpPort || 465),
      imapHost: inb.imapHost || 'imaps.aruba.it',
      imapPort: Number(inb.imapPort || 993),
      password: '',
      dailyLimit: Number(inb.dailyLimit || 15),
      warmupEnabled: inb.warmupEnabled !== false,
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async () => {
    const ok = await onSaveInbox(form, editingInbox?.id);
    if (ok) setModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* KPI PANORAMICA POOL 60 CASELLE ARUBA SSL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        <StatCard
          title="Caselle Aruba SSL Attive"
          value={`${activeInboxesCount} / ${inboxes.length || 60}`}
          icon={<ShieldCheck size={18} />}
        />
        <StatCard
          title="Capacità Giornaliera Pool"
          value={`${totalDailyCapacity.toLocaleString('it-IT')} / giorno`}
          icon={<Gauge size={18} />}
        />
        <StatCard
          title="Email Inviate Oggi"
          value={`${totalSentToday.toLocaleString('it-IT')} / ${totalDailyCapacity.toLocaleString('it-IT')}`}
          icon={<Mail size={18} />}
        />
        <StatCard
          title="Catalistini PDF Aperti"
          value={Number(kpis.promoOpenedCatalog || 0).toLocaleString('it-IT')}
          icon={<Eye size={18} />}
        />
        <StatCard
          title="Clienti Convertiti B2B"
          value={Number(kpis.promoConverted || 0).toLocaleString('it-IT')}
          icon={<Award size={18} />}
        />
      </div>

      {/* SELETTORE MARCIA VELOCITÀ INVIO (SPEED GEAR) */}
      <GlassPanel padding="lg" radius="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              <Gauge size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Selettore Marcia Velocità Pool (Controllo Istantaneo Capacità Giornaliera)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Regola con un clic la potenza di fuoco di tutte le 60 caselle Aruba SSL mantenendo la rotazione Round-Robin omogenea.
            </div>
          </div>
          <Badge variant="primary" size="sm">
            CAPACITÀ ATTUALE: {totalDailyCapacity} EMAIL / GIORNO
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {SPEED_GEAR_OPTIONS.map((gear) => (
            <div
              key={gear.id}
              onClick={() => canWrite && !loading && onSetSpeedGear(gear.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: canWrite ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '13px' }}>{gear.title}</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-primary)', margin: '3px 0' }}>
                {gear.subtitle}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{gear.detail}</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* FILTRO PER I 6 DOMINI ARUBA + AGGIUNGI CASELLA */}
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
            <Button
              variant={domainFilter === 'ALL' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDomainFilter('ALL')}
            >
              🌐 Tutti i 6 Domini ({inboxes.length})
            </Button>
            {ARUBA_B2B_DOMAINS.map((dom) => {
              const cnt = inboxes.filter((i) => i.email.toLowerCase().endsWith(`@${dom}`)).length;
              return (
                <Button
                  key={dom}
                  variant={domainFilter === dom ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDomainFilter(dom)}
                >
                  {dom} ({cnt})
                </Button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '210px' }}>
              <TextInput
                placeholder="Cerca casella..."
                value={searchInbox}
                onChange={(e) => setSearchInbox(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={openCreateModal}
              disabled={!canWrite}
            >
              Nuova Casella SSL
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* TABELLA 60 CASELLE ARUBA SSL */}
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
              <th style={{ padding: '10px 12px' }}>Casella Email &amp; Mittente</th>
              <th style={{ padding: '10px 12px' }}>Server SSL Aruba</th>
              <th style={{ padding: '10px 12px' }}>Fase Ramp-Up</th>
              <th style={{ padding: '10px 12px' }}>Quota Oggi</th>
              <th style={{ padding: '10px 12px' }}>Salute SSL &amp; Stato</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredInboxes.map((inb) => {
              const effLimit = Number(inb.effectiveDailyLimit ?? inb.dailyLimit ?? 5);
              const sent = Number(inb.sentToday || 0);
              const pct = effLimit > 0 ? Math.min(100, Math.round((sent / effLimit) * 100)) : 0;
              return (
                <tr key={inb.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 800 }}>{inb.email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{inb.displayName}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '11.5px' }}>
                    <div>SMTP: {inb.smtpHost}:{inb.smtpPort}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      IMAP: {inb.imapHost || 'imaps.aruba.it'}:{inb.imapPort || 993}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge variant={inb.warmupEnabled ? 'primary' : 'neutral'} size="sm">
                      {inb.warmupEnabled
                        ? `Settimana ${inb.warmupWeek || 1} (${effLimit}/g)`
                        : `Fisso (${effLimit}/g)`}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 12px', minWidth: '130px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700 }}>
                      <span>
                        {sent} / {effLimit}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '999px',
                        background: 'var(--color-border)',
                        overflow: 'hidden',
                        marginTop: '3px',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: pct >= 100 ? '#f59e0b' : '#16a34a',
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge variant={inb.isActive ? 'success' : 'warning'} size="sm">
                        {inb.isActive ? 'ATTIVA' : 'IN PAUSA'}
                      </Badge>
                      <Badge
                        variant={inb.healthStatus === 'ERROR' ? 'danger' : 'success'}
                        size="sm"
                      >
                        {inb.hasPassword ? '🔐 AES-256 SSL' : 'NO PASS'}
                      </Badge>
                    </div>
                    {inb.lastError && (
                      <div style={{ fontSize: '10.5px', color: '#dc2626', marginTop: '2px' }}>
                        {inb.lastError.slice(0, 60)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ShieldCheck size={13} />}
                        title="Test Live Connessione SSL SMTP 465 + IMAP 993"
                        disabled={!canWrite || testingId === inb.id}
                        onClick={async () => {
                          setTestingId(inb.id);
                          await onTestInboxSsl(inb.id);
                          setTestingId(null);
                        }}
                      >
                        {testingId === inb.id ? 'Test...' : 'Test SSL'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={inb.isActive ? <Pause size={13} /> : <Play size={13} />}
                        title={inb.isActive ? 'Metti in Pausa' : 'Riattiva'}
                        disabled={!canWrite}
                        onClick={() => onToggleInboxActive(inb)}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit3 size={13} />}
                        title="Modifica Casella"
                        disabled={!canWrite}
                        onClick={() => openEditModal(inb)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        title="Rimuovi Casella"
                        disabled={!canWrite}
                        onClick={() => onDeleteInbox(inb.id, inb.email)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassPanel>

      {/* MODAL AGGIUNGI / MODIFICA CASELLA ARUBA SSL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingInbox ? `Modifica Casella ${editingInbox.email}` : 'Aggiungi Casella SSL Aruba al Pool B2B'}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={handleSubmitForm} disabled={!canWrite}>
              Salva Casella SSL
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TextInput
            label="Indirizzo Email"
            placeholder="d.savoia@izzodistribuzioneb2b.it"
            value={form.email}
            disabled={Boolean(editingInbox)}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextInput
            label="Nome Mittente Visualizzato"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <TextInput
            label={
              editingInbox
                ? 'Nuova Password SMTP/IMAP (lascia vuoto per mantenere quella cifrata attuale)'
                : 'Password Casella Aruba (verrà cifrata AES-256-GCM)'
            }
            type="password"
            placeholder="••••••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <TextInput
              label="Host SMTP SSL"
              value={form.smtpHost}
              onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
            />
            <TextInput
              label="Porta SMTP"
              type="number"
              value={String(form.smtpPort)}
              onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <TextInput
              label="Host IMAP SSL"
              value={form.imapHost}
              onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
            />
            <TextInput
              label="Porta IMAP"
              type="number"
              value={String(form.imapPort)}
              onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'end' }}>
            <TextInput
              label="Tetto Massimo Giornaliero"
              type="number"
              min={1}
              max={50}
              value={String(form.dailyLimit)}
              onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 700, paddingBottom: '8px' }}>
              <input
                type="checkbox"
                checked={form.warmupEnabled}
                onChange={(e) => setForm({ ...form, warmupEnabled: e.target.checked })}
              />
              Ramp-Up 3 Settimane (5→10→15)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
