'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PromoProspectDashboardItem,
  impersonatePromoProspectAction,
  regeneratePromoProspectPasswordAction,
} from '@/app/actions/promoProspects';
import { startOrderReview } from '@/app/actions/agent';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'IST' | 'RIV'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [regeneratedPasswords, setRegeneratedPasswords] = useState<Record<string, string>>({});

  const filterList = (items: PromoProspectDashboardItem[]) => {
    return items.filter(item => {
      if (categoryFilter !== 'ALL' && item.commercialCategory.toUpperCase() !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.companyName.toLowerCase().includes(q) ||
        (item.vatNumber || '').toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.province || '').toLowerCase().includes(q)
      );
    });
  };

  const filteredLoggedIn = filterList(initialLoggedIn);
  const filteredContacted = filterList(initialContacted);
  const pendingOrdersTotal = initialLoggedIn.reduce((acc, p) => acc + p.pendingOrders.length, 0);

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
              Qui trovi i potenziali clienti B2B a cui è stata inviata l&apos;email con credenziali di accesso, sconto 1° acquisto e catalogo PDF allegato. Solo dopo l&apos;approvazione del 1° ordine entrano automaticamente nella sezione{' '}
              <Link href="/account/clients" className="font-bold text-black underline">
                Clienti Attivi
              </Link>{' '}
              e in Zucchetti.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-xs font-bold text-gray-500 uppercase">Contattati</div>
              <div className="text-2xl font-black text-gray-900">{initialContacted.length}</div>
              <div className="text-[11px] text-gray-400">In attesa 1° accesso</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-center">
              <div className="text-xs font-bold text-amber-900 uppercase">1° Accesso Fatto</div>
              <div className="text-2xl font-black text-amber-900">{initialLoggedIn.length}</div>
              <div className="text-[11px] text-amber-700 font-semibold">
                {pendingOrdersTotal > 0 ? `${pendingOrdersTotal} ordini da approvare` : 'Lead caldi attivi'}
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
              <span>🔥 Hanno Effettuato l&apos;Accesso (Lead Caldi)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'LOGGED_IN'
                    ? 'bg-brand-main text-black'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {initialLoggedIn.length}
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
              <span>📩 Clienti Contattati (In attesa di 1° accesso)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'CONTACTED' ? 'bg-white text-black' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {initialContacted.length}
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
              placeholder="Cerca azienda, P.IVA, città, username..."
              className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm min-w-[240px]"
            />
          </div>
        </div>
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

      {/* SEZIONE 2: HANNO EFFETTUATO ALMENO IL PRIMO ACCESSO */}
      {activeTab === 'LOGGED_IN' && (
        <div className="space-y-4">
          {filteredLoggedIn.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <h3 className="text-lg font-bold text-gray-900">
                Nessun cliente in attivazione con accesso effettuato per i filtri selezionati
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Non appena un cliente contattato effettua il login con le credenziali ricevute via email, comparirà automaticamente in questa sezione in tempo reale.
              </p>
            </div>
          ) : (
            filteredLoggedIn.map(item => {
              const hasPendingOrder = item.pendingOrders.length > 0;
              const hasActiveCart = item.activeCartItemsCount > 0;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    hasPendingOrder
                      ? 'border-2 border-indigo-500 ring-2 ring-indigo-100'
                      : hasActiveCart
                      ? 'border-amber-400 ring-1 ring-amber-100'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/60">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
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
                        {hasPendingOrder && (
                          <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white animate-pulse">
                            🆕 1° ORDINE IN ATTESA DI APPROVAZIONE
                          </span>
                        )}
                        {item.firstPurchaseRule && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            🎁 Sconto 1° Acquisto: -{item.firstPurchaseRule.discountValue}%
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>
                          <strong>Username definitivo:</strong>{' '}
                          <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono font-bold text-black">
                            {item.username}
                          </code>
                        </span>
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
                        {item.phone && (
                          <span>
                            <strong>Tel:</strong>{' '}
                            <a href={`tel:${item.phone}`} className="text-indigo-700 font-bold underline">
                              {item.phone}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                        >
                          📞 Chiama Ora
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleImpersonate(item.id, '/catalog')}
                        className="px-3.5 py-2 rounded-lg bg-black hover:bg-brand-main hover:text-black text-white text-xs font-bold transition-colors"
                      >
                        🛒 Impersona nel Negozio
                      </button>
                      <Link
                        href="/account/discounts"
                        className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors"
                      >
                        🏷️ Sconto
                      </Link>
                      <Link
                        href="/account/catalog-builder"
                        className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-colors"
                      >
                        📖 Catalogo PDF
                      </Link>
                    </div>
                  </div>

                  {/* Telemetria Accessi, Stato Password GDPR, Carrello in Tempo Reale e 1° Ordine */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="font-bold text-gray-800 uppercase tracking-wide">
                         Statistiche Accesso & Sicurezza
                      </div>
                      <div>
                        <span className="text-gray-500">1° Accesso:</span>{' '}
                        <strong className="text-gray-900">
                          {item.firstLoginAt
                            ? new Date(item.firstLoginAt).toLocaleString('it-IT')
                            : 'N/D'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Ultimo Accesso:</span>{' '}
                        <strong className="text-gray-900">
                          {item.lastLoginAt
                            ? new Date(item.lastLoginAt).toLocaleString('it-IT')
                            : 'N/D'}
                        </strong>{' '}
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                          {item.loginCount} {item.loginCount === 1 ? 'visita' : 'visite'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Password GDPR:</span>{' '}
                        {item.mustChangePassword ? (
                          <span className="text-amber-700 font-semibold">
                            In attesa cambio password personale
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">
                            ✓ Password personale impostata
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
                          Il cliente ha visitato il catalogo ma non ha ancora articoli nel carrello attivo.
                        </p>
                      )}
                    </div>

                    {/* 1° Ordine in attesa di approvazione */}
                    <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs flex flex-col justify-between gap-2">
                      <div>
                        <div className="font-bold text-indigo-950 uppercase tracking-wide mb-1">
                          📦 Stato 1° Ordine & Attivazione
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
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleReviewFirstOrder(ord.id)}
                                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shrink-0"
                                >
                                  Revisiona & Approva 1° Ordine
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            Nessun ordine ancora inviato. Puoi impersonare il cliente per preparargli un preventivo o contattarlo telefonicamente.
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

      {/* SEZIONE 1: CLIENTI CONTATTATI (0 ACCESSI) */}
      {activeTab === 'CONTACTED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredContacted.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">📩</div>
              <h3 className="text-lg font-bold text-gray-900">
                Nessun cliente contattato in attesa di primo accesso
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Tutti i clienti contattati tramite le campagne AI SDR B2B appariranno qui finché non effettuano il primo accesso.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3.5 px-4">Azienda & Cluster</th>
                    <th className="py-3.5 px-4">Cat. / Sconto Base</th>
                    <th className="py-3.5 px-4">Credenziali Generate</th>
                    <th className="py-3.5 px-4">Sconto 1° Acquisto</th>
                    <th className="py-3.5 px-4">Contatti & Località</th>
                    <th className="py-3.5 px-4">Email Inviata</th>
                    <th className="py-3.5 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacted.map(item => {
                    const displayTempPwd =
                      regeneratedPasswords[item.id] || item.tempPassword || 'Impostata/Hash';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.companyName}</div>
                          <div className="text-xs text-gray-500">
                            P.IVA: {item.vatNumber || 'N/D'} · {item.clusterSdr}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              item.commercialCategory.toUpperCase() === 'RIV'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}
                          >
                            {item.commercialCategory.toUpperCase()} (-{item.discount}%)
                          </span>
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
                        <td className="py-3.5 px-4">
                          {item.firstPurchaseRule ? (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              🎁 -{item.firstPurchaseRule.discountValue}% (1° Acquisto)
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Standard categoria</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          <div>{item.email}</div>
                          <div>
                            {[item.city, item.province ? `(${item.province})` : '', item.phone]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleRegeneratePassword(item.id)}
                              className="px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700"
                              title="Rigenera password temporanea"
                            >
                              🔑 Nuova Pass
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
