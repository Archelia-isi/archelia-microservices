'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { GroupedDueDateItem, OrderInstallment } from '@/lib/fidoSchedule';
import DownloadOrderPdfButton from '@/components/DownloadOrderPdfButton';

export interface ClientOrderScheduleRow {
  id: string;
  shortOrderId: string;
  createdAtFormatted: string;
  storeMode: string;
  zucchettiOrderRef: string | null;
  totalGross: number;
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  installments: OrderInstallment[];
}

export interface AgentClientScheduleData {
  clientId: string;
  companyName: string;
  zucchettiCode: string;
  vatNumber: string;
  fidoConcesso: number;
  fidoUtilizzato: number;
  fidoDisponibile: number;
  isOverFido: boolean;
  overFidoAmount: number;
  usagePct: number;
  fidoPaymentLabel: string;
  dueSchedule: GroupedDueDateItem[];
  unpaidOrdersCount: number;
}

interface UserModeProps {
  mode: 'USER';
  fidoConcesso: number;
  fidoUtilizzato: number;
  fidoDisponibile: number;
  isOverFido: boolean;
  overFidoAmount: number;
  fidoPaymentLabel: string;
  dueSchedule: GroupedDueDateItem[];
  orders: ClientOrderScheduleRow[];
}

interface AgentModeProps {
  mode: 'AGENT';
  clients: AgentClientScheduleData[];
  initialClientId?: string;
}

type ScadenziarioProps = UserModeProps | AgentModeProps;

function formatEuro(val: number): string {
  return (Number(val) || 0).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ScadenziarioClient(props: ScadenziarioProps) {
  if (props.mode === 'USER') {
    return <UserScadenziarioView {...props} />;
  }
  return <AgentScadenziarioView {...props} />;
}

function UserScadenziarioView({
  fidoConcesso,
  fidoUtilizzato,
  fidoDisponibile,
  isOverFido,
  overFidoAmount,
  fidoPaymentLabel,
  dueSchedule,
  orders,
}: UserModeProps) {
  const [activeTab, setActiveTab] = useState<'BY_DATE' | 'BY_ORDER'>('BY_DATE');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'OVERDUE' | 'SOON'>('ALL');
  const [orderFilter, setOrderFilter] = useState<'UNPAID' | 'PAID' | 'ALL'>('UNPAID');

  const overdueCount = dueSchedule.filter((d) => d.isOverdue).length;
  const dueSoonCount = dueSchedule.filter((d) => !d.isOverdue && d.isDueSoon).length;
  const nextDue = dueSchedule[0] || null;

  const filteredDates = useMemo(() => {
    if (dateFilter === 'OVERDUE') return dueSchedule.filter((d) => d.isOverdue);
    if (dateFilter === 'SOON') return dueSchedule.filter((d) => !d.isOverdue && d.isDueSoon);
    return dueSchedule;
  }, [dueSchedule, dateFilter]);

  const unpaidOrdersCount = orders.filter((o) => !o.isPaid && o.remainingAmount > 0.009).length;
  const paidOrdersCount = orders.filter((o) => o.isPaid || o.remainingAmount <= 0.009).length;

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'UNPAID') {
      return orders.filter((o) => !o.isPaid && o.remainingAmount > 0.009);
    }
    if (orderFilter === 'PAID') {
      return orders.filter((o) => o.isPaid || o.remainingAmount <= 0.009);
    }
    return orders;
  }, [orders, orderFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scadenziario Pagamenti</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tutti gli importi sono IVA inclusa. Gli ordini che scadono nello stesso giorno vengono sommati automaticamente.
          </p>
        </div>
        {fidoPaymentLabel && (
          <div className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-bold text-gray-900">
            Condizione: <span className="text-brand-hover">{fidoPaymentLabel}</span>
          </div>
        )}
      </div>

      {/* 4 KPI Riepilogo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Fido Concesso
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">€ {formatEuro(fidoConcesso)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Da Saldare (Impegnato)
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">
            € {formatEuro(fidoUtilizzato)}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-sm ${
            isOverFido ? 'bg-red-50 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div
            className={`text-xs font-bold uppercase tracking-wider ${
              isOverFido ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {isOverFido ? 'Oltre Fido' : 'Fido Disponibile'}
          </div>
          <div
            className={`text-xl font-black mt-1 ${
              isOverFido ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {isOverFido ? `-€ ${formatEuro(overFidoAmount)}` : `€ ${formatEuro(fidoDisponibile)}`}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-sm ${
            nextDue?.isOverdue
              ? 'bg-red-50 border-red-200'
              : nextDue?.isDueSoon
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {nextDue?.isOverdue ? 'Scadenza Scaduta' : 'Prossima Scadenza'}
          </div>
          {nextDue ? (
            <div className="mt-1">
              <div
                className={`text-lg font-black leading-tight ${
                  nextDue.isOverdue ? 'text-red-700' : 'text-gray-900'
                }`}
              >
                € {formatEuro(nextDue.totalAmount)}
              </div>
              <div className="text-xs font-semibold text-gray-600 mt-0.5">
                entro il {nextDue.dueDateFormatted}
              </div>
            </div>
          ) : (
            <div className="text-base font-bold text-emerald-700 mt-1.5">Tutto saldato</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('BY_DATE')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'BY_DATE'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Scadenze Sommate per Data ({dueSchedule.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BY_ORDER')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'BY_ORDER'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Dettaglio Singoli Ordini ({orders.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SCADENZE SOMMATE PER DATA */}
      {activeTab === 'BY_DATE' && (
        <div className="space-y-4">
          {dueSchedule.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  dateFilter === 'ALL'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Tutte ({dueSchedule.length})
              </button>
              {overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDateFilter('OVERDUE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    dateFilter === 'OVERDUE'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                >
                  Scadute ({overdueCount})
                </button>
              )}
              {dueSoonCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDateFilter('SOON')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    dateFilter === 'SOON'
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  In scadenza entro 7 gg ({dueSoonCount})
                </button>
              )}
            </div>
          )}

          {filteredDates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-base font-bold text-gray-900">Nessuna scadenza aperta</div>
              <p className="text-sm text-gray-500 mt-1">
                Non ci sono importi da saldare per il filtro selezionato.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDates.map((grp) => (
                <div
                  key={grp.dueDateIso}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                    grp.isOverdue
                      ? 'border-red-300'
                      : grp.isDueSoon
                      ? 'border-amber-300'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Intestazione Data */}
                  <div
                    className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      grp.isOverdue
                        ? 'bg-red-50/80 border-red-200'
                        : grp.isDueSoon
                        ? 'bg-amber-50/80 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-black text-gray-900">
                        Scadenza {grp.dueDateFormatted}
                      </span>
                      {grp.isOverdue ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase">
                          Scaduta
                        </span>
                      ) : grp.isDueSoon ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-xs font-extrabold uppercase">
                          In scadenza
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold">
                          Programmata
                        </span>
                      )}
                      {grp.ordersCount > 1 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold">
                          Somma di {grp.ordersCount} ordini
                        </span>
                      )}
                    </div>

                    <div className="sm:text-right">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Totale da pagare il {grp.dueDateFormatted}
                      </div>
                      <div
                        className={`text-2xl font-black ${
                          grp.isOverdue ? 'text-red-700' : 'text-gray-900'
                        }`}
                      >
                        € {formatEuro(grp.totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Elenco Ordini che compongono la data */}
                  <div className="divide-y divide-gray-100">
                    {grp.orders.map((ord, idx) => (
                      <div
                        key={`${ord.orderId}-${idx}`}
                        className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Link
                            href={`/account/orders/${ord.orderId}`}
                            className="font-bold text-gray-900 hover:text-brand-hover underline decoration-gray-300"
                          >
                            Ordine #{ord.shortOrderId}
                          </Link>
                          <span className="text-gray-500">del {ord.orderDateFormatted}</span>
                          {ord.zucchettiOrderRef && (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                              Doc: {ord.zucchettiOrderRef}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100 text-xs font-semibold">
                            {ord.installmentLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 sm:text-right">
                          <span className="text-sm font-extrabold text-gray-900">
                            € {formatEuro(ord.amount)}
                          </span>
                          <DownloadOrderPdfButton orderId={ord.orderId} variant="compact" label="PDF" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DETTAGLIO SINGOLI ORDINI */}
      {activeTab === 'BY_ORDER' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOrderFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                orderFilter === 'UNPAID'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Da saldare ({unpaidOrdersCount})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                orderFilter === 'PAID'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Saldati ({paidOrdersCount})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                orderFilter === 'ALL'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tutti ({orders.length})
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
              Nessun ordine presente in questa vista.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => {
                const isSettled = ord.isPaid || ord.remainingAmount <= 0.009;
                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/account/orders/${ord.id}`}
                          className="text-base font-bold text-gray-900 hover:text-brand-hover underline decoration-gray-300"
                        >
                          Ordine #{ord.shortOrderId}
                        </Link>
                        <span className="text-xs text-gray-500">del {ord.createdAtFormatted}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-semibold">
                          {ord.storeMode === 'ELMARK' ? 'Elmark' : 'Izzo Distribuzione'}
                        </span>
                        {ord.zucchettiOrderRef && (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                            Doc: {ord.zucchettiOrderRef}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ord.paidAmount > 0
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isSettled
                            ? 'Saldato'
                            : ord.paidAmount > 0
                            ? `Acconto € ${formatEuro(ord.paidAmount)}`
                            : 'Da saldare'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm sm:text-right">
                        <DownloadOrderPdfButton orderId={ord.id} variant="compact" />
                        <div>
                          <span className="text-xs text-gray-400 block">Totale IVA incl.</span>
                          <span className="font-bold text-gray-900">€ {formatEuro(ord.totalGross)}</span>
                        </div>
                        {!isSettled && (
                          <div>
                            <span className="text-xs text-gray-400 block">Residuo</span>
                            <span className="font-black text-gray-900">
                              € {formatEuro(ord.remainingAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {ord.installments.length > 0 && (
                      <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-gray-500">
                          {ord.installments.length > 1 ? 'Rate previste:' : 'Scadenza:'}
                        </span>
                        {ord.installments.map((inst) => (
                          <span
                            key={inst.installmentNumber}
                            className={`px-2.5 py-1 rounded-md border font-semibold ${
                              inst.isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through'
                                : inst.isOverdue
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-gray-50 text-gray-800 border-gray-200'
                            }`}
                          >
                            {inst.totalInstallments > 1
                              ? `Rata ${inst.installmentNumber}/${inst.totalInstallments}: `
                              : ''}
                            {inst.dueDateFormatted} — €{' '}
                            {formatEuro(inst.isPaid ? inst.originalAmount : inst.remainingAmount)}
                            {inst.isPaid ? ' (Saldata)' : inst.isOverdue ? ' (Scaduta)' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentScadenziarioView({ clients, initialClientId = '' }: AgentModeProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients.some((c) => c.clientId === initialClientId) ? initialClientId : 'ALL'
  );
  const [viewMode, setViewMode] = useState<'CHRONOLOGICAL' | 'BY_CLIENT'>('CHRONOLOGICAL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'SOON'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calcolo KPI sui propri clienti con Fido attivo
  const kpis = useMemo(() => {
    let totalExposure = 0;
    let totalOverdue = 0;
    let overdueSchedulesCount = 0;
    let totalDueSoon = 0;

    for (const c of clients) {
      totalExposure += c.fidoUtilizzato;
      for (const d of c.dueSchedule) {
        if (d.isOverdue) {
          totalOverdue += d.totalAmount;
          overdueSchedulesCount += 1;
        } else if (d.isDueSoon) {
          totalDueSoon += d.totalAmount;
        }
      }
    }

    return {
      activeClientsCount: clients.length,
      totalExposure,
      totalOverdue,
      overdueSchedulesCount,
      totalDueSoon,
    };
  }, [clients]);

  const matchingClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((c) => {
      if (selectedClientId !== 'ALL' && c.clientId !== selectedClientId) return false;
      if (!q) return true;
      const matchClient =
        c.companyName.toLowerCase().includes(q) ||
        c.zucchettiCode.toLowerCase().includes(q) ||
        c.vatNumber.toLowerCase().includes(q);
      if (matchClient) return true;
      return c.dueSchedule.some((d) =>
        d.orders.some(
          (o) =>
            o.shortOrderId.toLowerCase().includes(q) ||
            (o.zucchettiOrderRef || '').toLowerCase().includes(q)
        )
      );
    });
  }, [clients, selectedClientId, searchQuery]);

  // Lista cronologica unificata (1 card = 1 cliente in 1 specifica data di scadenza, con ordini dello stesso giorno sommati)
  const chronologicalItems = useMemo(() => {
    const list: Array<{
      client: AgentClientScheduleData;
      due: GroupedDueDateItem;
    }> = [];

    for (const c of matchingClients) {
      for (const due of c.dueSchedule) {
        if (statusFilter === 'OVERDUE' && !due.isOverdue) continue;
        if (statusFilter === 'SOON' && (due.isOverdue || !due.isDueSoon)) continue;
        list.push({ client: c, due });
      }
    }

    return list.sort((a, b) => {
      const cmp = a.due.dueDateIso.localeCompare(b.due.dueDateIso);
      if (cmp !== 0) return cmp;
      return a.client.companyName.localeCompare(b.client.companyName);
    });
  }, [matchingClients, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scadenziario Clienti</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scadenze pagamenti e stato del fido dei tuoi clienti (IVA inclusa). Gli ordini dello stesso cliente che scadono lo stesso giorno (es. Fine Mese) sono sommati automaticamente.
        </p>
      </div>

      {/* 4 KPI Globali Agente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Clienti con Fido Attivo
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1">{kpis.activeClientsCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Totale Da Saldare Clienti
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1">
            € {formatEuro(kpis.totalExposure)}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-sm ${
            kpis.totalOverdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`text-xs font-bold uppercase tracking-wider ${
              kpis.totalOverdue > 0 ? 'text-red-700' : 'text-gray-400'
            }`}
          >
            Scaduto ({kpis.overdueSchedulesCount})
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpis.totalOverdue > 0 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            € {formatEuro(kpis.totalOverdue)}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-sm ${
            kpis.totalDueSoon > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
            In Scadenza (7 gg)
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1">
            € {formatEuro(kpis.totalDueSoon)}
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <h3 className="text-lg font-bold text-gray-900">
            Nessun cliente con Fido attivo al momento
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Non appena l&apos;Amministrazione attiverà il Fido sui tuoi clienti, vedrai qui tutte le loro scadenze e i riepiloghi di pagamento.
          </p>
        </div>
      ) : (
        <>
          {/* Barra Filtri & Switch Vista */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Filtra per Cliente
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="ALL">Tutti i miei clienti con Fido ({clients.length})</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.companyName} {c.zucchettiCode ? `(${c.zucchettiCode})` : ''} — Da saldare: €{' '}
                      {formatEuro(c.fidoUtilizzato)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Ricerca Rapida
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ragione sociale, Cod. cliente, #Ordine..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Modalità di Visualizzazione
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('CHRONOLOGICAL')}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold transition-colors ${
                      viewMode === 'CHRONOLOGICAL'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Per Data Scadenza
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('BY_CLIENT')}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold transition-colors ${
                      viewMode === 'BY_CLIENT'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Per Scheda Cliente
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'CHRONOLOGICAL' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Tutte le scadenze aperte
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('OVERDUE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    statusFilter === 'OVERDUE'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                >
                  Solo Scadute
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('SOON')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    statusFilter === 'SOON'
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  In scadenza entro 7 gg
                </button>
              </div>
            )}
          </div>

          {/* VISTA 1: CRONOLOGICA PER DATA SCADENZA */}
          {viewMode === 'CHRONOLOGICAL' && (
            <div className="space-y-4">
              {chronologicalItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <div className="text-base font-bold text-gray-900">
                    Nessuna scadenza da saldare trovata
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Non ci sono ordini aperti corrispondenti ai filtri selezionati.
                  </p>
                </div>
              ) : (
                chronologicalItems.map(({ client, due }) => (
                  <div
                    key={`${client.clientId}-${due.dueDateIso}`}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                      due.isOverdue
                        ? 'border-red-300'
                        : due.isDueSoon
                        ? 'border-amber-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        due.isOverdue
                          ? 'bg-red-50/80 border-red-200'
                          : due.isDueSoon
                          ? 'bg-amber-50/80 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-gray-900 text-white text-xs font-extrabold">
                            Scadenza {due.dueDateFormatted}
                          </span>
                          {due.isOverdue ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase">
                              Scaduta
                            </span>
                          ) : due.isDueSoon ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-xs font-extrabold uppercase">
                              In scadenza
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold">
                              Programmata
                            </span>
                          )}
                          {due.ordersCount > 1 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold">
                              Somma di {due.ordersCount} ordini
                            </span>
                          )}
                          {client.isOverFido && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 text-[11px] font-extrabold">
                              OLTRE FIDO
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-base font-extrabold text-gray-900">
                            {client.companyName}
                          </span>
                          {client.zucchettiCode && (
                            <span className="text-xs text-gray-500 font-mono">
                              ({client.zucchettiCode})
                            </span>
                          )}
                          {client.fidoPaymentLabel && (
                            <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-xs font-semibold text-gray-700">
                              Pagamento: {client.fidoPaymentLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Totale del giorno
                        </div>
                        <div
                          className={`text-2xl font-black ${
                            due.isOverdue ? 'text-red-700' : 'text-gray-900'
                          }`}
                        >
                          € {formatEuro(due.totalAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {due.orders.map((ord, idx) => (
                        <div
                          key={`${ord.orderId}-${idx}`}
                          className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50/70 transition-colors"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Link
                              href={`/account/orders/${ord.orderId}`}
                              className="font-bold text-gray-900 hover:text-brand-hover underline decoration-gray-300"
                            >
                              Ordine #{ord.shortOrderId}
                            </Link>
                            <span className="text-gray-500">del {ord.orderDateFormatted}</span>
                            {ord.zucchettiOrderRef && (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                                Doc: {ord.zucchettiOrderRef}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100 text-xs font-semibold">
                              {ord.installmentLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 sm:text-right">
                            <span className="text-sm font-extrabold text-gray-900">
                              € {formatEuro(ord.amount)}
                            </span>
                            <DownloadOrderPdfButton orderId={ord.orderId} variant="compact" label="PDF" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VISTA 2: PER SCHEDA CLIENTE */}
          {viewMode === 'BY_CLIENT' && (
            <div className="space-y-4">
              {matchingClients.map((client) => (
                <div
                  key={client.clientId}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="p-5 border-b border-gray-200 bg-gray-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-gray-900">
                          {client.companyName}
                        </h3>
                        {client.zucchettiCode && (
                          <span className="text-xs font-mono text-gray-500">
                            ({client.zucchettiCode})
                          </span>
                        )}
                        {client.fidoPaymentLabel && (
                          <span className="px-2.5 py-0.5 rounded-md bg-white border border-gray-200 text-xs font-bold text-gray-800">
                            Pagamento: {client.fidoPaymentLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="px-3 py-1.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-400 uppercase font-bold block text-[10px]">
                          Fido Concesso
                        </span>
                        <span className="font-black text-gray-900 text-sm">
                          € {formatEuro(client.fidoConcesso)}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-400 uppercase font-bold block text-[10px]">
                          Impegnato
                        </span>
                        <span className="font-black text-gray-900 text-sm">
                          € {formatEuro(client.fidoUtilizzato)}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-lg border ${
                          client.isOverFido
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                      >
                        <span className="uppercase font-bold block text-[10px]">
                          {client.isOverFido ? 'Oltre Fido' : 'Disponibile'}
                        </span>
                        <span className="font-black text-sm">
                          {client.isOverFido
                            ? `-€ ${formatEuro(client.overFidoAmount)}`
                            : `€ ${formatEuro(client.fidoDisponibile)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {client.dueSchedule.length === 0 ? (
                      <div className="text-sm text-emerald-700 font-semibold">
                        Nessun ordine aperto da saldare per questo cliente.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {client.dueSchedule.map((due) => (
                          <div
                            key={due.dueDateIso}
                            className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                              due.isOverdue
                                ? 'bg-red-50/60 border-red-200'
                                : due.isDueSoon
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-gray-50/70 border-gray-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-gray-900">
                                  Scadenza {due.dueDateFormatted}
                                </span>
                                {due.isOverdue && (
                                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase">
                                    Scaduta
                                  </span>
                                )}
                                {!due.isOverdue && due.isDueSoon && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold uppercase">
                                    In scadenza
                                  </span>
                                )}
                                {due.ordersCount > 1 && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
                                    Somma di {due.ordersCount} ordini
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {due.orders.map((o, idx) => (
                                  <div
                                    key={`${o.orderId}-${idx}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-gray-200 text-xs font-medium text-gray-800"
                                  >
                                    <Link
                                      href={`/account/orders/${o.orderId}`}
                                      className="hover:text-brand-hover hover:underline"
                                    >
                                      <strong>#{o.shortOrderId}</strong> ({o.orderDateFormatted} •{' '}
                                      {o.installmentLabel}): <strong>€ {formatEuro(o.amount)}</strong>
                                    </Link>
                                    <DownloadOrderPdfButton
                                      orderId={o.orderId}
                                      variant="compact"
                                      label="PDF"
                                      className="!px-1.5 !py-0.5 !text-[10px]"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="sm:text-right shrink-0">
                              <span className="text-[10px] font-bold uppercase text-gray-400 block">
                                Totale giorno
                              </span>
                              <span
                                className={`text-lg font-black ${
                                  due.isOverdue ? 'text-red-700' : 'text-gray-900'
                                }`}
                              >
                                € {formatEuro(due.totalAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
