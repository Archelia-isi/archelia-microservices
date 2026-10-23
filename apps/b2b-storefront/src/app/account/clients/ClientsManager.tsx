'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AgentManagedClient,
  CommercialCategoryOption,
  UpdateAgentClientInput,
  updateAgentClient,
  generateClientCredentialsPdfAction,
} from '@/app/actions/newClient';
import { setImpersonatedClient } from '@/app/actions/agent';

interface Props {
  initialClients: AgentManagedClient[];
  categories: CommercialCategoryOption[];
  agentName: string;
  agentCode: string;
}

const FORME_GIURIDICHE = [
  { code: 'SRL', label: 'SRL - Società a Responsabilità Limitata' },
  { code: 'IND', label: 'IND - Ditta Individuale' },
  { code: 'SPA', label: 'SPA - Società per Azioni' },
  { code: 'SNC', label: 'SNC - Società in Nome Collettivo' },
  { code: 'SAS', label: 'SAS - Società in Accomandita Semplice' },
  { code: 'COO', label: 'COO - Società Cooperativa' },
  { code: 'SSE', label: 'SSE - Società Semplice' },
  { code: 'PER', label: 'PER - Persona Fisica' },
  { code: 'ALT', label: 'ALT - Altro Ente / Associazione' },
];

export default function ClientsManager({
  initialClients,
  categories,
  agentName,
  agentCode,
}: Props) {
  const router = useRouter();
  const [clients, setClients] = useState<AgentManagedClient[]>(initialClients);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ELMARK' | 'IZZO_ONLY'>('ALL');
  const [selectedClient, setSelectedClient] = useState<AgentManagedClient | null>(null);
  const [editForm, setEditForm] = useState<UpdateAgentClientInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const filteredClients = clients.filter(c => {
    if (filterMode === 'ELMARK' && !c.isElmarkCustomer) return false;
    if (filterMode === 'IZZO_ONLY' && c.isElmarkCustomer) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.zucchettiCode.toLowerCase().includes(q) ||
      c.vatNumber.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q)
    );
  });

  const openEditModal = (c: AgentManagedClient) => {
    setSelectedClient(c);
    setSaveMessage(null);
    setEditForm({
      id: c.id,
      companyName: c.companyName,
      vatNumber: c.vatNumber,
      codiceFiscale: c.codiceFiscale || c.vatNumber,
      formaGiuridica: c.formaGiuridica || 'SRL',
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      address: c.address || '',
      zip: c.zip || '',
      city: c.city || '',
      province: c.province || '',
      phone: c.phone || '',
      telefonoFisso: c.telefonoFisso || '',
      email: c.email || '',
      pec: c.pec || '',
      codiceDestinatario: c.codiceDestinatario || '0000000',
      username: c.username,
      categoriaCommerciale: c.categoriaCode || categories[0]?.code || 'riv',
      discount: c.discount,
      fido: c.fido || 0,
      codicePagamento: c.codicePagamento || '',
      isElmarkCustomer: c.isElmarkCustomer,
      elmarkDiscounts:
        c.isElmarkCustomer && Object.keys(c.elmarkDiscounts || {}).length > 0
          ? { ...c.elmarkDiscounts }
          : { E1: 20, L: 20, C: 5, E2: 5, F: 5 },
      isActive: c.isActive,
    });
  };

  const closeEditModal = () => {
    setSelectedClient(null);
    setEditForm(null);
    setSaveMessage(null);
  };

  const triggerBase64PdfDownload = (base64: string, fileName: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleDownloadPdf = async (c: AgentManagedClient, regeneratePassword: boolean = false) => {
    setPdfLoadingId(c.id);
    try {
      const res = await generateClientCredentialsPdfAction(c.id, regeneratePassword);
      if (!res.success || !res.pdfBase64) {
        alert(res.error || 'Impossibile generare il PDF delle credenziali.');
        return;
      }
      if (res.tempPassword) {
        setClients(prev =>
          prev.map(item =>
            item.id === c.id
              ? { ...item, tempPassword: res.tempPassword!, mustChangePassword: true }
              : item
          )
        );
        if (selectedClient?.id === c.id) {
          setSelectedClient(prev =>
            prev ? { ...prev, tempPassword: res.tempPassword!, mustChangePassword: true } : null
          );
        }
      }
      triggerBase64PdfDownload(res.pdfBase64, res.pdfFileName || `Credenziali_B2B_${c.zucchettiCode}.pdf`);
      if (regeneratePassword) {
        setSaveMessage({
          type: 'success',
          text: `Nuova password temporanea generata (${res.tempPassword}) e PDF scaricato.`,
        });
      }
    } catch (e: any) {
      alert('Errore durante il download del PDF: ' + (e.message || ''));
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleImpersonate = async (c: AgentManagedClient) => {
    setImpersonatingId(c.id);
    await setImpersonatedClient(c.zucchettiCode, c.companyName, c.discount);
    router.push('/');
    router.refresh();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !selectedClient) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await updateAgentClient(editForm);
      if (!res.success) {
        setSaveMessage({
          type: 'error',
          text: res.error || 'Errore durante il salvataggio delle modifiche.',
        });
        return;
      }

      const selectedCat = categories.find(
        cat => cat.code.toLowerCase() === editForm.categoriaCommerciale.toLowerCase()
      );
      const updatedCustomerType = selectedCat
        ? selectedCat.label.replace(/\s*\(Sconto.*\)$/i, '')
        : editForm.categoriaCommerciale.toUpperCase();

      const updatedClient: AgentManagedClient = {
        ...selectedClient,
        companyName: editForm.companyName.trim(),
        vatNumber: editForm.vatNumber.trim(),
        codiceFiscale: (editForm.codiceFiscale || editForm.vatNumber).trim(),
        formaGiuridica: editForm.formaGiuridica || 'SRL',
        firstName: editForm.firstName?.trim() || '',
        lastName: editForm.lastName?.trim() || '',
        address: editForm.address.trim(),
        zip: editForm.zip.trim(),
        city: editForm.city.trim(),
        province: editForm.province.trim().toUpperCase(),
        phone: editForm.phone?.trim() || '',
        telefonoFisso: editForm.telefonoFisso?.trim() || '',
        email: editForm.email.trim().toLowerCase(),
        pec: editForm.pec?.trim().toLowerCase() || '',
        codiceDestinatario: (editForm.codiceDestinatario || '0000000').trim().toUpperCase(),
        username: editForm.username.trim().toLowerCase(),
        categoriaCode: editForm.categoriaCommerciale,
        customerType: updatedCustomerType,
        discount: editForm.discount,
        fido: editForm.fido || 0,
        codicePagamento: editForm.codicePagamento || '',
        isElmarkCustomer: editForm.isElmarkCustomer,
        elmarkDiscounts: editForm.isElmarkCustomer
          ? editForm.elmarkDiscounts || { E1: 20, L: 20, C: 5, E2: 5, F: 5 }
          : {},
        isActive: editForm.isActive,
      };

      setClients(prev => prev.map(item => (item.id === updatedClient.id ? updatedClient : item)));
      setSelectedClient(updatedClient);
      setSaveMessage({
        type: 'success',
        text: res.zucchettiUpdated
          ? 'Anagrafica cliente aggiornata con successo sul Portale B2B e su Zucchetti.'
          : 'Anagrafica cliente aggiornata con successo sul Portale B2B.',
      });
      router.refresh();
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: 'Errore imprevisto: ' + (err.message || ''),
      });
    } finally {
      setSaving(false);
    }
  };

  const totalElmark = clients.filter(c => c.isElmarkCustomer).length;

  return (
    <div className="space-y-6">
      {/* Header Gestione Clienti con pulsante "+ Nuovo Cliente" */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-full border border-gray-200">
              {clients.length} Totali
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
              {totalElmark} Abilitati Elmark
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Visualizza, cerca e modifica i dati anagrafici, commerciali e di accesso dei tuoi clienti ({agentName}
            {agentCode ? ` - Cod. Agente ${agentCode}` : ''}).
          </p>
        </div>

        <Link
          href="/account/new-client"
          className="px-5 py-3 bg-black hover:bg-brand-main hover:text-black text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Cliente
        </Link>
      </div>

      {/* Barra di Ricerca e Filtri */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per Ragione Sociale, Codice Zucchetti (es. C000165), P.IVA, Email, Città o Username..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              filterMode === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tutti ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ELMARK')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              filterMode === 'ELMARK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Abilitati Elmark ({totalElmark})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('IZZO_ONLY')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              filterMode === 'IZZO_ONLY'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Solo Izzo ({clients.length - totalElmark})
          </button>
        </div>
      </div>

      {/* Lista Clienti */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
            <div className="text-gray-500 text-sm">
              Nessun cliente trovato con i criteri selezionati.
            </div>
            <Link
              href="/account/new-client"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800"
            >
              + Inserisci Nuovo Cliente
            </Link>
          </div>
        ) : (
          filteredClients.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 hover:border-gray-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Colonna Info Principali */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-gray-900 text-white font-mono text-xs font-bold">
                    {c.zucchettiCode || 'N/D'}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 truncate">{c.companyName}</h3>
                  {c.isElmarkCustomer && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
                      Negozio Elmark Attivo
                    </span>
                  )}
                  {!c.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-[11px] font-bold">
                      Sospeso
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400 font-medium">P.IVA:</span>{' '}
                    <span className="font-mono font-semibold text-gray-800">{c.vatNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Sede:</span>{' '}
                    <span className="text-gray-800">
                      {[c.address, c.city, c.province ? `(${c.province})` : ''].filter(Boolean).join(' ') || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Email:</span>{' '}
                    <span className="text-gray-800 font-medium">{c.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Username B2B:</span>{' '}
                    <span className="font-mono font-bold text-gray-900">{c.username}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                    Listino Izzo: {c.customerType} (Sconto Base {c.discount}%)
                  </span>
                  {c.phone && (
                    <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                      Tel: {c.phone}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">
                    Ordini: {c.ordersCount}
                  </span>
                </div>
              </div>

              {/* Pulsanti Azione */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                <button
                  type="button"
                  onClick={() => openEditModal(c)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Visualizza / Modifica
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(c, false)}
                  disabled={pdfLoadingId === c.id}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Scarica PDF Riepilogo e Credenziali per il cliente"
                >
                  <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {pdfLoadingId === c.id ? 'PDF...' : 'PDF Credenziali'}
                </button>

                <button
                  type="button"
                  onClick={() => handleImpersonate(c)}
                  disabled={impersonatingId === c.id}
                  className="px-3.5 py-2 bg-black hover:bg-brand-main hover:text-black text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {impersonatingId === c.id ? 'Accesso...' : 'Impersonifica'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALE VISUALIZZA / MODIFICA CLIENTE */}
      {mounted &&
        selectedClient &&
        editForm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full overflow-hidden my-8 max-h-[92vh] flex flex-col">
              {/* Header Modale */}
              <div className="p-5 bg-gray-900 text-white flex items-center justify-between gap-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-brand-main text-black font-mono text-xs font-extrabold">
                      {selectedClient.zucchettiCode || 'CLIENTE B2B'}
                    </span>
                    <h2 className="text-lg font-extrabold truncate">{selectedClient.companyName}</h2>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Visualizza e modifica l&apos;anagrafica cliente, le condizioni commerciali e le credenziali B2B.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Corpo Form Modale */}
              <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto flex-1">
                {saveMessage && (
                  <div
                    className={`p-3.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                      saveMessage.type === 'success'
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                        : 'bg-red-100 border border-red-300 text-red-900'
                    }`}
                  >
                    <span>{saveMessage.text}</span>
                  </div>
                )}

                {/* Sezione 1: Dati Societari */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1.5">
                    1. Anagrafica e Dati Fiscali
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Ragione Sociale *</label>
                      <input
                        type="text"
                        maxLength={60}
                        value={editForm.companyName}
                        onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Forma Giuridica</label>
                      <select
                        value={editForm.formaGiuridica || 'SRL'}
                        onChange={e => setEditForm({ ...editForm, formaGiuridica: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        {FORME_GIURIDICHE.map(fg => (
                          <option key={fg.code} value={fg.code}>
                            {fg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Partita IVA *</label>
                      <input
                        type="text"
                        maxLength={11}
                        value={editForm.vatNumber}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            vatNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 11),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Codice Fiscale</label>
                      <input
                        type="text"
                        maxLength={16}
                        value={editForm.codiceFiscale || ''}
                        onChange={e =>
                          setEditForm({ ...editForm, codiceFiscale: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Cognome Referente</label>
                      <input
                        type="text"
                        value={editForm.lastName || ''}
                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nome Referente</label>
                      <input
                        type="text"
                        value={editForm.firstName || ''}
                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Sezione 2: Sede Legale e Contatti */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1.5">
                    2. Sede Legale, Contatti e Fatturazione Elettronica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Indirizzo Completo *</label>
                      <input
                        type="text"
                        maxLength={32}
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CAP *</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={editForm.zip}
                        onChange={e =>
                          setEditForm({ ...editForm, zip: e.target.value.replace(/[^0-9]/g, '').slice(0, 5) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Località *</label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Prov. *</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={editForm.province}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            province: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">E-mail *</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Cellulare / Tel.</label>
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Codice SDI</label>
                      <input
                        type="text"
                        maxLength={7}
                        value={editForm.codiceDestinatario || ''}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            codiceDestinatario: e.target.value.toUpperCase().slice(0, 7),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Indirizzo PEC</label>
                    <input
                      type="email"
                      value={editForm.pec || ''}
                      onChange={e => setEditForm({ ...editForm, pec: e.target.value })}
                      placeholder="azienda@pec.it"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Sezione 3: Condizioni Commerciali Izzo & Negozio Elmark */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1.5">
                    3. Condizioni Commerciali e Negozio Elmark
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Categoria Commerciale Zucchetti
                      </label>
                      <select
                        value={editForm.categoriaCommerciale}
                        onChange={e => {
                          const code = e.target.value;
                          const found = categories.find(c => c.code === code);
                          setEditForm({
                            ...editForm,
                            categoriaCommerciale: code,
                            discount: found ? found.discount : editForm.discount,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat.code} value={cat.code}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Sconto Base Izzo (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={90}
                        value={editForm.discount}
                        onChange={e =>
                          setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Toggle Negozio Elmark */}
                  <div
                    className={`p-3.5 rounded-xl border ${
                      editForm.isElmarkCustomer
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={editForm.isElmarkCustomer}
                          onChange={e => {
                            const checked = e.target.checked;
                            setEditForm({
                              ...editForm,
                              isElmarkCustomer: checked,
                              elmarkDiscounts: checked
                                ? editForm.elmarkDiscounts || { E1: 20, L: 20, C: 5, E2: 5, F: 5 }
                                : {},
                            });
                          }}
                          className="w-4 h-4 text-brand-main rounded border-gray-300"
                        />
                        <span className="text-sm font-bold text-gray-900">
                          Abilita al Negozio Elmark
                        </span>
                      </div>
                      {editForm.isElmarkCustomer && (
                        <span className="text-xs font-mono font-bold text-emerald-900">
                          E1: 20% | L: 20% | E2: 5% | C: 5% | F: 5%
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* Sezione 4: Credenziali Portale B2B */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      4. Credenziali Accesso Portale B2B
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(selectedClient, false)}
                        disabled={pdfLoadingId === selectedClient.id}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                      >
                        Scarica PDF Credenziali
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(selectedClient, true)}
                        disabled={pdfLoadingId === selectedClient.id}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Rigenera Password e Scarica PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Username B2B *
                      </label>
                      <input
                        type="text"
                        maxLength={30}
                        value={editForm.username}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            username: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9._-]/g, '')
                              .slice(0, 30),
                          })
                        }
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Password Temporanea Attuale
                      </label>
                      <input
                        type="text"
                        disabled
                        value={
                          selectedClient.tempPassword
                            ? selectedClient.tempPassword
                            : 'Impostata dal cliente (usa Rigenera per resettarla)'
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-100 text-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Stato Account B2B
                      </label>
                      <select
                        value={editForm.isActive ? 'ACTIVE' : 'SUSPENDED'}
                        onChange={e =>
                          setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                      >
                        <option value="ACTIVE">Attivo (Accesso Consentito)</option>
                        <option value="SUSPENDED">Sospeso (Accesso Bloccato)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer Modale */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors"
                  >
                    Chiudi
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-black hover:bg-brand-main hover:text-black text-white text-sm font-extrabold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvataggio in corso...' : 'Salva Modifiche'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
