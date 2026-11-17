'use client';

import { Fragment, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PromoProspectDashboardItem,
  impersonatePromoProspectAction,
  regeneratePromoProspectPasswordAction,
  markPromoProspectContactedAction,
} from '@/app/actions/promoProspects';
import { startOrderReview } from '@/app/actions/agent';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

function normalizeItalianPhoneForWhatsApp(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  digits = digits.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (!digits.startsWith('39') && (digits.startsWith('3') || digits.startsWith('0'))) {
    digits = `39${digits}`;
  }
  return digits;
}

function buildWhatsAppOfferHref(item: PromoProspectDashboardItem): {
  href: string;
  hasPhone: boolean;
} {
  const cleanNum = normalizeItalianPhoneForWhatsApp(item.whatsappPhone || item.phone);
  const offerUrl = item.smartOfferToken
    ? `https://www.izzodistribuzione.it/offerta/${encodeURIComponent(item.smartOfferToken)}`
    : `https://www.izzodistribuzione.it/login?u=${encodeURIComponent(item.username)}`;
  const extraPct = item.firstPurchaseRule?.discountValue || 10;
  const msg = `Buongiorno ${item.companyName}, sono Daniele Savoia di Izzo Distribuzione S.r.l. Le lascio qui il collegamento diretto al Vostro prospetto riservato (sconto base ${item.discount}% + ${extraPct}% sul 1° ordine, senza minimo d'ordine) con Catalistino PDF e ingresso 1-clic al portale: ${offerUrl} — Resto a disposizione per qualsiasi quotazione!`;
  const encoded = encodeURIComponent(msg);
  return {
    href: cleanNum ? `https://wa.me/${cleanNum}?text=${encoded}` : `https://wa.me/?text=${encoded}`,
    hasPhone: Boolean(cleanNum),
  };
}

export default function PromoProspectsClient({
  initialContacted,
  initialLoggedIn,
  convertedCount,
}: {
  initialContacted: PromoProspectDashboardItem[];
  initialLoggedIn: PromoProspectDashboardItem[];
  convertedCount: number;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'LOGGED_IN' | 'CONTACTED'>(
    initialLoggedIn.length > 0 ? 'LOGGED_IN' : 'CONTACTED'
  );
  const [warmSubFilter, setWarmSubFilter] = useState<
    'ALL' | 'TO_CALL' | 'REPLIED' | 'PDF_OPENED' | 'CART_OR_ORDER'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'IST' | 'RIV'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [regeneratedPasswords, setRegeneratedPasswords] = useState<Record<string, string>>({});

  // Stato locale per il box inline "Segna Chiamato / Nota"
  const [openCallBoxId, setOpenCallBoxId] = useState<string | null>(null);
  const [callNoteDrafts, setCallNoteDrafts] = useState<Record<string, string>>({});
  const [pauseFollowupDrafts, setPauseFollowupDrafts] = useState<Record<string, boolean>>({});
  const [localCallOverrides, setLocalCallOverrides] = useState<
    Record<
      string,
      {
        agentContactedAt: string;
        agentCallNote: string;
        autoFollowupPaused: boolean;
      }
    >
  >({});

  const applyLocalOverrides = (item: PromoProspectDashboardItem): PromoProspectDashboardItem => {
    const ov = localCallOverrides[item.id];
    if (!ov) return item;
    return {
      ...item,
      agentContactedAt: ov.agentContactedAt,
      agentCallNote: ov.agentCallNote,
      autoFollowupPaused: ov.autoFollowupPaused,
    };
  };

  const warmItems = initialLoggedIn.map(applyLocalOverrides);
  const contactedItems = initialContacted.map(applyLocalOverrides);

  const filterList = (items: PromoProspectDashboardItem[], applyWarmSub = false) => {
    return items.filter(item => {
      if (categoryFilter !== 'ALL' && item.commercialCategory.toUpperCase() !== categoryFilter) {
        return false;
      }
      if (applyWarmSub) {
        if (warmSubFilter === 'TO_CALL' && item.agentContactedAt) return false;
        if (warmSubFilter === 'REPLIED' && !item.lastReplyAt) return false;
        if (warmSubFilter === 'PDF_OPENED' && item.catalogOpenCount <= 0 && !item.catalogOpenedAt) {
          return false;
        }
        if (
          warmSubFilter === 'CART_OR_ORDER' &&
          item.activeCartItemsCount <= 0 &&
          item.pendingOrders.length === 0
        ) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.companyName.toLowerCase().includes(q) ||
        (item.vatNumber || '').toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.province || '').toLowerCase().includes(q) ||
        (item.lastReplySnippet || '').toLowerCase().includes(q) ||
        (item.agentCallNote || '').toLowerCase().includes(q)
      );
    });
  };

  const filteredLoggedIn = filterList(warmItems, true);
  const filteredContacted = filterList(contactedItems, false);

  const pendingOrdersTotal = warmItems.reduce((acc, p) => acc + p.pendingOrders.length, 0);
  const repliedTotal = warmItems.filter(p => Boolean(p.lastReplyAt)).length;
  const pdfOpenedTotal = warmItems.filter(p => p.catalogOpenCount > 0 || Boolean(p.catalogOpenedAt)).length;
  const uncontactedWarmTotal = warmItems.filter(p => !p.agentContactedAt).length;

  const handleImpersonate = (prospectId: string, goToUrl = '/catalog') => {
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await impersonatePromoProspectAction(prospectId);
      if (res.success) {
        router.push(goToUrl);
        router.refresh();
      } else {
        setFeedbackMsg(res.error || 'Impossibile impersonare il cliente.');
      }
    });
  };

  const handleReviewFirstOrder = (orderId: string) => {
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await startOrderReview(orderId, '/account/prospects');
      if (res.success) {
        router.push('/cart');
        router.refresh();
      } else {
        setFeedbackMsg(res.error || 'Impossibile aprire la revisione del 1° ordine.');
      }
    });
  };

  const handleRegeneratePassword = (prospectId: string) => {
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await regeneratePromoProspectPasswordAction(prospectId);
      if (res.success && res.tempPassword) {
        setRegeneratedPasswords(prev => ({ ...prev, [prospectId]: res.tempPassword! }));
        setFeedbackMsg(`Nuova password temporanea generata per ${res.username}: ${res.tempPassword}`);
        router.refresh();
      } else {
        setFeedbackMsg(res.error || 'Errore durante la rigenerazione della password.');
      }
    });
  };

  const toggleCallBox = (item: PromoProspectDashboardItem) => {
    if (openCallBoxId === item.id) {
      setOpenCallBoxId(null);
      return;
    }
    setOpenCallBoxId(item.id);
    if (callNoteDrafts[item.id] === undefined) {
      setCallNoteDrafts(prev => ({
        ...prev,
        [item.id]: item.agentCallNote || '',
      }));
    }
    if (pauseFollowupDrafts[item.id] === undefined) {
      setPauseFollowupDrafts(prev => ({
        ...prev,
        [item.id]: true,
      }));
    }
  };

  const handleSaveContactNote = (item: PromoProspectDashboardItem) => {
    const note =
      (callNoteDrafts[item.id] ?? item.agentCallNote ?? '').trim() ||
      'Contattato telefonicamente da Daniele Savoia';
    const pauseAuto = pauseFollowupDrafts[item.id] ?? true;

    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await markPromoProspectContactedAction(item.id, note, pauseAuto);
      if (res.success && res.agentContactedAt) {
        setLocalCallOverrides(prev => ({
          ...prev,
          [item.id]: {
            agentContactedAt: res.agentContactedAt!,
            agentCallNote: res.agentCallNote || note,
            autoFollowupPaused: Boolean(res.autoFollowupPaused),
          },
        }));
        setOpenCallBoxId(null);
        setFeedbackMsg(
          `📞 Telefonata registrata per ${item.companyName}${
            pauseAuto ? ' — Follow-up automatici fermati.' : '.'
          }`
        );
        router.refresh();
      } else {
        setFeedbackMsg(res.error || 'Errore durante il salvataggio della nota telefonata.');
      }
    });
  };

  const renderInlineCallEditor = (item: PromoProspectDashboardItem) => {
    if (openCallBoxId !== item.id) return null;
    const currentNote = callNoteDrafts[item.id] ?? item.agentCallNote ?? '';
    const currentPause = pauseFollowupDrafts[item.id] ?? true;

    return (
      <div className="p-4 bg-emerald-50/80 border-t border-emerald-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">
            📞 Registra Telefonata / Nota Commerciale — {item.companyName}
          </div>
          <button
            type="button"
            onClick={() => setOpenCallBoxId(null)}
            className="text-xs font-bold text-gray-500 hover:text-black"
          >
            ✕ Chiudi
          </button>
        </div>

        <textarea
          rows={2}
          value={currentNote}
          onChange={e =>
            setCallNoteDrafts(prev => ({
              ...prev,
              [item.id]: e.target.value,
            }))
          }
          placeholder="Es. Parlato col titolare, interessato a magnetotermici e cavi, prepara distinta per giovedì..."
          className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 cursor-pointer">
            <input
              type="checkbox"
              checked={currentPause}
              onChange={e =>
                setPauseFollowupDrafts(prev => ({
                  ...prev,
                  [item.id]: e.target.checked,
                }))
              }
              className="rounded border-emerald-400 text-emerald-700 focus:ring-emerald-600"
            />
            <span>Ferma automaticamente le email di follow-up (incluso promemoria +5 giorni)</span>
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSaveContactNote(item)}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition shadow-sm shrink-0"
          >
            💾 Salva Chiamata &amp; Nota (1 Clic)
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Riepilogo Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 font-black text-xs uppercase tracking-wider">
                Funnel AI SDR B2B
              </span>
              <h1 className="text-2xl font-black text-gray-900">Clienti in Attivazione</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Qui trovi in tempo reale i potenziali clienti B2B che hanno risposto alla mail,
              aperto il Catalistino PDF o effettuato l&apos;accesso al portale coi prezzi riservati.
              Solo dopo l&apos;approvazione del 1° ordine entrano in{' '}
              <Link href="/account/clients" className="font-bold text-black underline">
                Clienti Attivi
              </Link>{' '}
              e in Zucchetti.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-xs font-bold text-gray-500 uppercase">Contattati</div>
              <div className="text-2xl font-black text-gray-900">{contactedItems.length}</div>
              <div className="text-[11px] text-gray-400">In attesa risposta/apertura</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-center">
              <div className="text-xs font-bold text-amber-900 uppercase">Lead Caldi</div>
              <div className="text-2xl font-black text-amber-900">{warmItems.length}</div>
              <div className="text-[11px] text-amber-700 font-semibold">
                {pendingOrdersTotal > 0
                  ? `${pendingOrdersTotal} ordini da approvare`
                  : `${uncontactedWarmTotal} da chiamare`}
              </div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-xs font-bold text-emerald-800 uppercase">Convertiti</div>
              <div className="text-2xl font-black text-emerald-900">{convertedCount}</div>
              <div className="text-[11px] text-emerald-700">1° ordine approvato</div>
            </div>
          </div>
        </div>

        {/* Selettore delle 2 Sezioni + Filtri */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('LOGGED_IN')}
              className={`px-4 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
                activeTab === 'LOGGED_IN'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🔥 Lead Caldi da Gestire</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'LOGGED_IN'
                    ? 'bg-brand-main text-black'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {warmItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONTACTED')}
              className={`px-4 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
                activeTab === 'CONTACTED'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>📩 Clienti Contattati (In attesa risposta/apertura)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'CONTACTED' ? 'bg-white text-black' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {contactedItems.length}
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as 'ALL' | 'IST' | 'RIV')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
            >
              <option value="ALL">Tutte le categorie (IST + RIV)</option>
              <option value="IST">IST - Installatori (40%)</option>
              <option value="RIV">RIV - Rivenditori / Ferramenta (50%)</option>
            </select>

            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca azienda, P.IVA, città, risposta, nota..."
              className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm min-w-[240px]"
            />
          </div>
        </div>

        {/* Sotto-filtri rapidi per Lead Caldi */}
        {activeTab === 'LOGGED_IN' && warmItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-gray-500 mr-1">Filtra priorità:</span>
            <button
              type="button"
              onClick={() => setWarmSubFilter('ALL')}
              className={`px-3 py-1 rounded-full font-bold border transition ${
                warmSubFilter === 'ALL'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tutti ({warmItems.length})
            </button>
            <button
              type="button"
              onClick={() => setWarmSubFilter('TO_CALL')}
              className={`px-3 py-1 rounded-full font-bold border transition ${
                warmSubFilter === 'TO_CALL'
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              📞 Da chiamare ({uncontactedWarmTotal})
            </button>
            <button
              type="button"
              onClick={() => setWarmSubFilter('REPLIED')}
              className={`px-3 py-1 rounded-full font-bold border transition ${
                warmSubFilter === 'REPLIED'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              💬 Hanno risposto ({repliedTotal})
            </button>
            <button
              type="button"
              onClick={() => setWarmSubFilter('PDF_OPENED')}
              className={`px-3 py-1 rounded-full font-bold border transition ${
                warmSubFilter === 'PDF_OPENED'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
              }`}
            >
              👀 PDF Aperto ({pdfOpenedTotal})
            </button>
            <button
              type="button"
              onClick={() => setWarmSubFilter('CART_OR_ORDER')}
              className={`px-3 py-1 rounded-full font-bold border transition ${
                warmSubFilter === 'CART_OR_ORDER'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              🛒 Carrello / 1° Ordine
            </button>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-950 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs text-indigo-700 underline ml-4"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* SEZIONE PRINCIPALE: 🔥 LEAD CALDI DA GESTIRE */}
      {activeTab === 'LOGGED_IN' && (
        <div className="space-y-4">
          {filteredLoggedIn.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <h3 className="text-lg font-bold text-gray-900">
                Nessun Lead Caldo trovato per i filtri selezionati
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Non appena un potenziale cliente risponde all&apos;email, apre il Catalistino PDF o
                accede al portale coi suoi sconti, comparirà automaticamente qui ordinato per priorità.
              </p>
            </div>
          ) : (
            filteredLoggedIn.map(item => {
              const hasPendingOrder = item.pendingOrders.length > 0;
              const hasActiveCart = item.activeCartItemsCount > 0;
              const hasReplied = Boolean(item.lastReplyAt);
              const hasOpenedPdf = item.catalogOpenCount > 0 || Boolean(item.catalogOpenedAt);
              const wa = buildWhatsAppOfferHref(item);
              const pdfHref = item.smartOfferToken
                ? `/api/offerta/${encodeURIComponent(item.smartOfferToken)}/pdf?track=0`
                : '/account/catalog-builder';
              const callPhone = item.phone || item.whatsappPhone;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    hasPendingOrder
                      ? 'border-2 border-indigo-500 ring-2 ring-indigo-100'
                      : hasActiveCart
                      ? 'border-amber-400 ring-1 ring-amber-100'
                      : hasReplied
                      ? 'border-emerald-400 ring-1 ring-emerald-100'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-5 flex flex-col xl:flex-row xl:items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/60">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-gray-900">{item.companyName}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                            item.commercialCategory.toUpperCase() === 'RIV'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}
                        >
                          {item.commercialCategory.toUpperCase()} (-{item.discount}%)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-800">
                          {item.clusterSdr}
                        </span>
                        {item.firstPurchaseRule && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            🎁 Sconto 1° Acquisto: -{item.firstPurchaseRule.discountValue}%
                          </span>
                        )}
                      </div>

                      {/* BADGE COMMERCIALI REAL-TIME */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasPendingOrder && (
                          <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white animate-pulse">
                            🆕 1° ORDINE IN ATTESA DI APPROVAZIONE
                          </span>
                        )}
                        {hasActiveCart && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300">
                            🛒 Carrello Attivo ({item.activeCartItemsCount} pz)
                          </span>
                        )}
                        {hasReplied && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                            💬 Ha Risposto
                            {item.lastReplyAt
                              ? ` · ${new Date(item.lastReplyAt).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : ''}
                          </span>
                        )}
                        {hasOpenedPdf && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-900 border border-sky-300">
                            👀 PDF Aperto {Math.max(1, item.catalogOpenCount)}x
                            {item.catalogOpenedAt
                              ? ` · ${new Date(item.catalogOpenedAt).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : ''}
                          </span>
                        )}
                        {item.loginCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            🔑 Portale {item.loginCount}x
                          </span>
                        )}
                        {item.agentContactedAt && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-950 border border-teal-300">
                            📞 Già chiamato da te (
                            {new Date(item.agentContactedAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                            )
                          </span>
                        )}
                        {item.autoFollowupPaused && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white">
                            ⏸️ Follow-up automatici fermati
                          </span>
                        )}
                      </div>

                      <div className="pt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>
                          <strong>Username:</strong>{' '}
                          <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono font-bold text-black">
                            {item.username}
                          </code>
                        </span>
                        {item.tempPassword && (
                          <span>
                            <strong>Pass temp:</strong>{' '}
                            <code className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-950">
                              {regeneratedPasswords[item.id] || item.tempPassword}
                            </code>
                          </span>
                        )}
                        <span>
                          <strong>P.IVA:</strong> {item.vatNumber || 'Da completare'}
                        </span>
                        <span>
                          <strong>Località:</strong>{' '}
                          {[item.city, item.province ? `(${item.province})` : '']
                            .filter(Boolean)
                            .join(' ') || 'N/D'}
                        </span>
                        <span>
                          <strong>Email:</strong> {item.email}
                        </span>
                        {callPhone && (
                          <span>
                            <strong>Tel:</strong>{' '}
                            <a href={`tel:${callPhone}`} className="text-indigo-700 font-bold underline">
                              {callPhone}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PULSANTI AZIONE RAPIDA DANIELE */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {callPhone && (
                        <a
                          href={`tel:${callPhone}`}
                          className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                        >
                          📲 Chiama
                        </a>
                      )}
                      <a
                        href={wa.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          wa.hasPhone
                            ? `Invia offerta riservata su WhatsApp a ${callPhone}`
                            : 'Numero WhatsApp non registrato: scegli il contatto su WhatsApp'
                        }
                        className="px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-black text-xs font-black transition-colors shadow-sm"
                      >
                        💬 WhatsApp Offerta
                      </a>
                      <a
                        href={pdfHref}
                        target={item.smartOfferToken ? '_blank' : undefined}
                        rel={item.smartOfferToken ? 'noopener noreferrer' : undefined}
                        className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-black transition-colors"
                      >
                        📖 Vedi il suo PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleCallBox(item)}
                        className={`px-3 py-2 rounded-lg border text-xs font-black transition-colors ${
                          item.agentContactedAt
                            ? 'border-teal-400 bg-teal-50 text-teal-950 hover:bg-teal-100'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        📞 Segna Chiamato / Nota
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleImpersonate(item.id, '/catalog')}
                        className="px-3.5 py-2 rounded-lg bg-black hover:bg-brand-main hover:text-black text-white text-xs font-bold transition-colors"
                      >
                        🛒 Impersona
                      </button>
                    </div>
                  </div>

                  {/* RIQUADRO VERDE RISPOSTA EMAIL DEL CLIENTE (SE PRESENTE) */}
                  {hasReplied && (
                    <div className="mx-5 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-black uppercase tracking-wide text-emerald-900">
                          💬 Risposta Email del Cliente
                          {item.lastReplySentiment ? ` (${item.lastReplySentiment})` : ''}
                        </span>
                        {item.lastReplyAt && (
                          <span className="text-[11px] font-semibold text-emerald-800">
                            Ricevuta il {new Date(item.lastReplyAt).toLocaleString('it-IT')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 whitespace-pre-line">
                        {item.lastReplySnippet || 'Il cliente ha risposto all’email commerciale.'}
                      </p>
                    </div>
                  )}

                  {/* RIQUADRO NOTA CHIAMATA AGENTE SALVATA (SE PRESENTE) */}
                  {item.agentContactedAt && (
                    <div className="mx-5 mt-3 p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-black">
                          📞 Chiamato il {new Date(item.agentContactedAt).toLocaleString('it-IT')}:
                        </span>{' '}
                        <span className="font-medium text-gray-800">
                          {item.agentCallNote || 'Contatto telefonico registrato'}
                        </span>
                      </div>
                      {item.autoFollowupPaused && (
                        <span className="px-2 py-0.5 rounded bg-teal-900 text-white text-[10px] font-black uppercase shrink-0">
                          Follow-up automatici fermati
                        </span>
                      )}
                    </div>
                  )}

                  {/* EDITOR INLINE CHIAMATA / NOTA */}
                  {renderInlineCallEditor(item)}

                  {/* Telemetria Accessi & PDF, Carrello in Tempo Reale e 1° Ordine */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="font-bold text-gray-800 uppercase tracking-wide">
                        Statistiche PDF &amp; Portale
                      </div>
                      <div>
                        <span className="text-gray-500">Catalistino PDF:</span>{' '}
                        {hasOpenedPdf ? (
                          <strong className="text-sky-900">
                            Aperto {Math.max(1, item.catalogOpenCount)}x (
                            {item.catalogOpenedAt
                              ? new Date(item.catalogOpenedAt).toLocaleString('it-IT')
                              : 'recente'}
                            )
                          </strong>
                        ) : (
                          <span className="text-gray-500">Non ancora aperto</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">1° Accesso Portale:</span>{' '}
                        <strong className="text-gray-900">
                          {item.firstLoginAt
                            ? new Date(item.firstLoginAt).toLocaleString('it-IT')
                            : 'Non ancora effettuato'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Ultimo Accesso:</span>{' '}
                        <strong className="text-gray-900">
                          {item.lastLoginAt
                            ? new Date(item.lastLoginAt).toLocaleString('it-IT')
                            : 'N/D'}
                        </strong>{' '}
                        {item.loginCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                            {item.loginCount} {item.loginCount === 1 ? 'visita' : 'visite'}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Dati Fiscali Zucchetti:</span>{' '}
                        {item.hasCompletedBillingData ? (
                          <span className="text-emerald-700 font-bold">✓ Completi</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            Richiesti al 1° ordine
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Carrello Attivo */}
                    <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 uppercase tracking-wide">
                          🛒 Carrello Attivo in Tempo Reale
                        </span>
                        <span className="font-black text-amber-900">
                          {item.activeCartItemsCount} pz · €{' '}
                          {item.activeCartTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {item.activeCartPreview.length > 0 ? (
                        <ul className="space-y-1 pt-1">
                          {item.activeCartPreview.map(ci => (
                            <li key={ci.sku} className="flex justify-between gap-2 text-gray-700">
                              <span className="truncate">
                                <strong className="font-mono">{ci.sku}</strong> — {ci.title}
                              </span>
                              <span className="font-bold shrink-0">{ci.quantity} pz</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 pt-1">
                          Nessun articolo attualmente nel carrello attivo.
                        </p>
                      )}
                    </div>

                    {/* 1° Ordine in attesa di approvazione */}
                    <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs flex flex-col justify-between gap-2">
                      <div>
                        <div className="font-bold text-indigo-950 uppercase tracking-wide mb-1">
                          📦 Stato 1° Ordine &amp; Attivazione
                        </div>
                        {item.pendingOrders.length > 0 ? (
                          <div className="space-y-2">
                            {item.pendingOrders.map(ord => (
                              <div
                                key={ord.id}
                                className="p-2.5 rounded bg-white border border-indigo-200 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-black text-indigo-950">
                                    Ordine #{ord.id.slice(-6).toUpperCase()} ({ord.itemsCount} pz)
                                  </div>
                                  <div className="text-gray-600">
                                    Tot. IVA incl.:{' '}
                                    <strong>
                                      € {(ord.totalAmount + ord.totalIva).toFixed(2).replace('.', ',')}
                                    </strong>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  <DownloadOrderPdfButton orderId={ord.id} variant="compact" label="PDF" />
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleReviewFirstOrder(ord.id)}
                                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shrink-0"
                                  >
                                    Revisiona &amp; Approva 1° Ordine
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            Nessun ordine ancora inviato. Puoi inviare l&apos;offerta su WhatsApp,
                            impersonare il cliente per preparargli un preventivo o chiamarlo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEZIONE SECONDARIA: CLIENTI CONTATTATI (IN ATTESA DI APERTURA / RISPOSTA) */}
      {activeTab === 'CONTACTED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredContacted.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">📩</div>
              <h3 className="text-lg font-bold text-gray-900">
                Nessun cliente contattato in attesa di riscontro
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Tutti i clienti contattati tramite AI SDR B2B appariranno qui finché non aprono il
                PDF, rispondono alla mail o accedono al portale.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3.5 px-4">Azienda &amp; Cluster</th>
                    <th className="py-3.5 px-4">Cat. / Sconto</th>
                    <th className="py-3.5 px-4">Credenziali Riservate</th>
                    <th className="py-3.5 px-4">Contatti &amp; Stato Chiamata</th>
                    <th className="py-3.5 px-4">Email Inviata</th>
                    <th className="py-3.5 px-4 text-right">Azioni Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacted.map(item => {
                    const displayTempPwd =
                      regeneratedPasswords[item.id] || item.tempPassword || 'Impostata/Hash';
                    const wa = buildWhatsAppOfferHref(item);
                    const pdfHref = item.smartOfferToken
                      ? `/api/offerta/${encodeURIComponent(item.smartOfferToken)}/pdf?track=0`
                      : '/account/catalog-builder';
                    return (
                      <Fragment key={item.id}>
                        <tr className="hover:bg-gray-50/80">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{item.companyName}</div>
                            <div className="text-xs text-gray-500">
                              P.IVA: {item.vatNumber || 'N/D'} · {item.clusterSdr}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                  item.commercialCategory.toUpperCase() === 'RIV'
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : 'bg-blue-100 text-blue-900 border-blue-300'
                                }`}
                              >
                                {item.commercialCategory.toUpperCase()} (-{item.discount}%)
                              </span>
                              {item.firstPurchaseRule && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900">
                                  🎁 +{item.firstPurchaseRule.discountValue}% 1° Ordine
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              <span className="text-gray-500">User:</span>{' '}
                              <code className="font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                                {item.username}
                              </code>
                            </div>
                            <div className="text-xs mt-0.5">
                              <span className="text-gray-500">Pass temp:</span>{' '}
                              <code className="font-mono font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {displayTempPwd}
                              </code>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600 space-y-1">
                            <div>{item.email}</div>
                            <div>
                              {[
                                item.city,
                                item.province ? `(${item.province})` : '',
                                item.phone || item.whatsappPhone,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {item.agentContactedAt && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-100 text-teal-950 font-bold">
                                📞 Già chiamato ·{' '}
                                {item.autoFollowupPaused ? 'Follow-up fermati' : 'Nota salvata'}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {new Date(item.emailSentAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <a
                                href={wa.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded bg-[#25D366] hover:bg-[#1ebe5d] text-black text-xs font-black"
                                title="Invia Offerta su WhatsApp"
                              >
                                💬 WhatsApp
                              </a>
                              <a
                                href={pdfHref}
                                target={item.smartOfferToken ? '_blank' : undefined}
                                rel={item.smartOfferToken ? 'noopener noreferrer' : undefined}
                                className="px-2.5 py-1.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold"
                                title="Vedi il suo PDF"
                              >
                                📖 PDF
                              </a>
                              <button
                                type="button"
                                onClick={() => toggleCallBox(item)}
                                className="px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-800"
                                title="Segna Chiamato / Nota"
                              >
                                📞 Nota
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleRegeneratePassword(item.id)}
                                className="px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700"
                                title="Rigenera password temporanea"
                              >
                                🔑 Pass
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleImpersonate(item.id, '/catalog')}
                                className="px-3 py-1.5 rounded bg-black hover:bg-brand-main hover:text-black text-white text-xs font-bold transition-colors"
                              >
                                Impersona
                              </button>
                            </div>
                          </td>
                        </tr>
                        {openCallBoxId === item.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              {renderInlineCallEditor(item)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
