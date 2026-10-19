'use client';

import React, { useState } from 'react';
import {
  CommercialCategoryOption,
  NewClientFormInput,
  validateAndLookupVat,
  createNewZucchettiClient,
} from '@/app/actions/newClient';
import { setImpersonatedClient } from '@/app/actions/agent';
import { downloadClientCredentialsPdf, CreatedClientPdfData } from './pdfGenerator';
import { useRouter } from 'next/navigation';

interface Props {
  agentCode: string;
  agentName: string;
  nextCodePreview: string;
  categories: CommercialCategoryOption[];
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

const CODICI_PAGAMENTO = [
  { code: '', label: 'Nessuno (Default Zucchetti)' },
  { code: 'RD', label: 'RD - Rimessa Diretta' },
  { code: 'BAO', label: 'BAO - Bonifico Anticipato Ordine' },
  { code: '001', label: '001 - Pagamento Cod. 001' },
  { code: '00002', label: '00002 - Pagamento Cod. 00002' },
  { code: '00005', label: '00005 - Pagamento Cod. 00005' },
  { code: '00006', label: '00006 - Pagamento Cod. 00006' },
  { code: '00007', label: '00007 - Pagamento Cod. 00007' },
  { code: '00008', label: '00008 - Pagamento Cod. 00008' },
  { code: '00020', label: '00020 - Pagamento Cod. 00020' },
  { code: '00021', label: '00021 - Pagamento Cod. 00021' },
  { code: '00022', label: '00022 - Pagamento Cod. 00022' },
];

export default function NewClientWizard({
  agentCode,
  agentName,
  nextCodePreview,
  categories,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState<NewClientFormInput>({
    partitaIva: '',
    ragioneSociale: '',
    formaGiuridica: 'SRL',
    cognome: '',
    nome: '',
    sesso: 'M',
    indirizzo: '',
    numeroCivico: '',
    cap: '',
    localita: '',
    provincia: '',
    telefono: '',
    cellulare: '',
    email: '',
    codiceDestinatario: '',
    pec: '',
    categoriaCommerciale: categories[0]?.code || 'riv',
    descrizioneAggiuntiva: '',
    codiceFiscale: '',
    nazione: 'ITA',
    lingua: 'ITA',
    codicePagamento: '',
    gestioneFido: 'N',
    importoMaxFido: '',
    importoMaxOrdine: '',
    bloccoSuperamentoFido: 'N',
    bloccoContenzioso: 'N',
    sitoWeb: '',
    noteAnagrafica: '',
    isElmarkCustomer: false,
    hasSedeDiversa: false,
    sedeDenominazione: '',
    sedeIndirizzo: '',
    sedeCap: '',
    sedeLocalita: '',
    sedeProvincia: '',
    sedeTelefono: '',
    sedeEmail: '',
    sedePersonaRiferimento: '',
    sedeNoteConsegna: '',
  });

  // Stato verifica Partita IVA / VIES
  const [vatLoading, setVatLoading] = useState(false);
  const [vatStatus, setVatStatus] = useState<{
    type: 'idle' | 'success' | 'info' | 'error';
    message: string;
    warning?: string;
  }>({ type: 'idle', message: '' });

  // Stato submit e modal finale
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdClient, setCreatedClient] = useState<CreatedClientPdfData | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const updateField = <K extends keyof NewClientFormInput>(key: K, value: NewClientFormInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const handleVatLookup = async (vatToVerify?: string) => {
    const targetVat = (vatToVerify !== undefined ? vatToVerify : form.partitaIva)
      .toUpperCase()
      .replace(/^IT/, '')
      .replace(/\s+/g, '')
      .trim();

    if (!targetVat) {
      setVatStatus({ type: 'error', message: 'Inserisci una Partita IVA da verificare.' });
      return;
    }

    setVatLoading(true);
    setVatStatus({ type: 'idle', message: '' });

    try {
      const res = await validateAndLookupVat(targetVat);
      if (!res.isFormalValid) {
        setVatStatus({
          type: 'error',
          message: res.error || 'Partita IVA formalmente non valida.',
          warning: res.existingWarning,
        });
      } else if (res.isViesValid && res.parsed) {
        setForm(prev => ({
          ...prev,
          partitaIva: targetVat,
          ragioneSociale: res.parsed?.ragioneSociale || prev.ragioneSociale,
          formaGiuridica: res.parsed?.formaGiuridica || prev.formaGiuridica,
          indirizzo: res.parsed?.indirizzo || prev.indirizzo,
          numeroCivico: res.parsed?.numeroCivico || prev.numeroCivico,
          cap: res.parsed?.cap || prev.cap,
          localita: res.parsed?.localita || prev.localita,
          provincia: res.parsed?.provincia || prev.provincia,
          codiceFiscale: prev.codiceFiscale || targetVat,
        }));
        setVatStatus({
          type: 'success',
          message: `Partita IVA verificata su archivio europeo VIES: dati societari di "${res.parsed.ragioneSociale}" compilati automaticamente.`,
          warning: res.existingWarning,
        });
      } else {
        setVatStatus({
          type: 'info',
          message:
            res.error ||
            'Partita IVA formalmente valida (11 cifre verificate). Compila manualmente la Ragione Sociale e la sede.',
          warning: res.existingWarning,
        });
      }
    } catch (e: any) {
      setVatStatus({
        type: 'error',
        message: 'Errore durante la verifica della Partita IVA: ' + (e.message || ''),
      });
    } finally {
      setVatLoading(false);
    }
  };

  const validateStep1 = (): string | null => {
    const cleanVat = form.partitaIva.toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
    if (!cleanVat || !/^\d{11}$/.test(cleanVat)) {
      return 'Inserisci una Partita IVA valida di 11 cifre.';
    }
    if (!form.ragioneSociale.trim()) {
      return 'La Ragione Sociale è obbligatoria.';
    }
    if (!form.formaGiuridica) {
      return 'Seleziona la Forma Giuridica.';
    }
    if ((form.formaGiuridica === 'IND' || form.formaGiuridica === 'PER') && (!form.cognome?.trim() || !form.nome?.trim())) {
      return 'Per Ditta Individuale (IND) o Persona Fisica (PER) sono obbligatori Cognome e Nome.';
    }
    if (!form.indirizzo.trim()) {
      return "L'Indirizzo è obbligatorio.";
    }
    if (!form.numeroCivico.trim()) {
      return 'Il Numero Civico è obbligatorio (scrivi SNC se senza civico).';
    }
    if (!/^\d{5}$/.test(form.cap.trim())) {
      return 'Il CAP è obbligatorio e deve essere di 5 cifre.';
    }
    if (!form.localita.trim()) {
      return 'La Località (Comune) è obbligatoria.';
    }
    if (form.provincia.trim().length !== 2) {
      return 'La Provincia è obbligatoria (sigla di 2 lettere, es. NA, BN, RM).';
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Inserisci un indirizzo E-mail valido.';
    }
    if (!form.codiceDestinatario?.trim() && !form.pec?.trim()) {
      return 'Inserisci almeno uno tra Codice Destinatario (SDI) e Indirizzo PEC.';
    }
    if (
      form.codiceDestinatario?.trim() &&
      !/^[A-Z0-9]{7}$/i.test(form.codiceDestinatario.trim())
    ) {
      return 'Il Codice Destinatario (SDI) deve avere esattamente 7 caratteri (es. 0000000).';
    }
    if (!form.categoriaCommerciale) {
      return 'Seleziona una Categoria Commerciale.';
    }
    return null;
  };

  const handleGoToStep2 = () => {
    const err = validateStep1();
    if (err) {
      setFormError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!form.codiceDestinatario?.trim() && form.pec?.trim()) {
      setForm(prev => ({ ...prev, codiceDestinatario: '0000000' }));
    }
    setFormError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) {
      setFormError(err);
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload: NewClientFormInput = {
        ...form,
        codiceDestinatario:
          !form.codiceDestinatario?.trim() && form.pec?.trim()
            ? '0000000'
            : form.codiceDestinatario?.trim().toUpperCase(),
      };

      const res = await createNewZucchettiClient(payload);
      if (!res.success || !res.client) {
        setFormError(res.error || 'Errore durante la creazione del cliente.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Mostra il pop-up a video e avvia il download automatico del PDF sul PC dell'agente
      setCreatedClient(res.client);
      setTimeout(() => {
        try {
          downloadClientCredentialsPdf(res.client!);
        } catch (pdfErr) {
          console.error('Errore generazione PDF:', pdfErr);
        }
      }, 250);
    } catch (error: any) {
      setFormError('Errore imprevisto: ' + (error.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdClient) return;
    const text = `Credenziali Portale B2B Izzo Distribuzione\nCliente: ${createdClient.ragioneSociale} (Cod. ${createdClient.zucchettiCode})\nUsername: ${createdClient.username}\nPassword Temporanea: ${createdClient.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleImpersonateNewClient = async () => {
    if (!createdClient) return;
    await setImpersonatedClient(
      createdClient.zucchettiCode,
      createdClient.ragioneSociale,
      createdClient.scontoBase
    );
    router.push('/');
    router.refresh();
  };

  const handleResetForAnotherClient = () => {
    setCreatedClient(null);
    setStep(1);
    setVatStatus({ type: 'idle', message: '' });
    setForm({
      partitaIva: '',
      ragioneSociale: '',
      formaGiuridica: 'SRL',
      cognome: '',
      nome: '',
      sesso: 'M',
      indirizzo: '',
      numeroCivico: '',
      cap: '',
      localita: '',
      provincia: '',
      telefono: '',
      cellulare: '',
      email: '',
      codiceDestinatario: '',
      pec: '',
      categoriaCommerciale: categories[0]?.code || 'riv',
      descrizioneAggiuntiva: '',
      codiceFiscale: '',
      nazione: 'ITA',
      lingua: 'ITA',
      codicePagamento: '',
      gestioneFido: 'N',
      importoMaxFido: '',
      importoMaxOrdine: '',
      bloccoSuperamentoFido: 'N',
      bloccoContenzioso: 'N',
      sitoWeb: '',
      noteAnagrafica: '',
      isElmarkCustomer: false,
      hasSedeDiversa: false,
      sedeDenominazione: '',
      sedeIndirizzo: '',
      sedeCap: '',
      sedeLocalita: '',
      sedeProvincia: '',
      sedeTelefono: '',
      sedeEmail: '',
      sedePersonaRiferimento: '',
      sedeNoteConsegna: '',
    });
    router.refresh();
  };

  const handleCancelInsertion = () => {
    setFormError('');
    setVatStatus({ type: 'idle', message: '' });
    router.push('/account');
  };

  const isPersonaOrDitta = form.formaGiuridica === 'IND' || form.formaGiuridica === 'PER';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Intestazione Pagina */}
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo Cliente Zucchetti (Izzo Distribuzione)</h1>
          <p className="text-sm text-gray-600 mt-1">
            Inserisci l&apos;anagrafica cliente in Zucchetti e genera in automatico le credenziali di accesso B2B.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
          <div className="text-xs text-gray-500">
            Prossimo Cod. Zucchetti:{' '}
            <span className="font-mono font-bold text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
              {nextCodePreview}
            </span>
          </div>
        </div>
      </div>

      {/* Navigazione a 2 Step (Schede) */}
      <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-100/70">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`py-4 px-6 text-left font-bold text-sm flex items-center gap-3 border-b-2 transition-all ${
            step === 1
              ? 'bg-white text-brand-main border-brand-main shadow-sm'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
              step === 1 ? 'bg-brand-main text-white' : 'bg-gray-300 text-gray-700'
            }`}
          >
            1
          </span>
          <div>
            <div className="text-sm font-bold">Step 1: Dati Obbligatori Principali</div>
            <div className="text-xs font-normal text-gray-500">
              P.IVA (con verifica VIES), Anagrafica, Contatti, SDI/PEC, Categoria
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleGoToStep2}
          className={`py-4 px-6 text-left font-bold text-sm flex items-center gap-3 border-b-2 transition-all ${
            step === 2
              ? 'bg-white text-brand-main border-brand-main shadow-sm'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
              step === 2 ? 'bg-brand-main text-white' : 'bg-gray-300 text-gray-700'
            }`}
          >
            2
          </span>
          <div>
            <div className="text-sm font-bold">Step 2: Campi Aggiuntivi (Non Obbligatori)</div>
            <div className="text-xs font-normal text-gray-500">
              Pagamenti, Fido, Sede Diversa e Parametri Contabili Zucchetti
            </div>
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {formError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {/* BOX PARTITA IVA CON AUTOCOMPILAZIONE VIES */}
            <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-900">
                    Partita IVA <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-gray-600">
                    Inserisci le 11 cifre e clicca su <strong>Verifica VIES e Autocompila</strong> per controllare la validità e compilare in automatico Ragione Sociale e Indirizzo.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-gray-500 pointer-events-none">
                    IT
                  </span>
                  <input
                    type="text"
                    maxLength={13}
                    value={form.partitaIva}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                      updateField('partitaIva', val);
                      if (val.length === 11) {
                        handleVatLookup(val);
                      }
                    }}
                    placeholder="Es. 10156150962"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleVatLookup()}
                  disabled={vatLoading}
                  className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {vatLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifica VIES in corso...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Verifica P.IVA e Autocompila
                    </>
                  )}
                </button>
              </div>

              {vatStatus.warning && (
                <div className="p-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{vatStatus.warning}</span>
                </div>
              )}

              {vatStatus.type !== 'idle' && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    vatStatus.type === 'success'
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                      : vatStatus.type === 'error'
                      ? 'bg-red-100 border border-red-300 text-red-900'
                      : 'bg-blue-100 border border-blue-300 text-blue-900'
                  }`}
                >
                  <span>{vatStatus.message}</span>
                </div>
              )}
            </div>

            {/* RAGIONE SOCIALE E FORMA GIURIDICA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Ragione Sociale <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.ragioneSociale}
                  onChange={e => updateField('ragioneSociale', e.target.value)}
                  placeholder="Es. FERRAMENTA ROSSI S.R.L."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Forma Giuridica <span className="text-red-600">*</span>
                </label>
                <select
                  value={form.formaGiuridica}
                  onChange={e => updateField('formaGiuridica', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                >
                  {FORME_GIURIDICHE.map(fg => (
                    <option key={fg.code} value={fg.code}>
                      {fg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CAMPI COGNOME / NOME / SESSO SE DITTA INDIVIDUALE O PERSONA FISICA */}
            {isPersonaOrDitta && (
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Cognome Titolare <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.cognome || ''}
                    onChange={e => updateField('cognome', e.target.value)}
                    placeholder="Es. ROSSI"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Nome Titolare <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.nome || ''}
                    onChange={e => updateField('nome', e.target.value)}
                    placeholder="Es. MARIO"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Sesso <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.sesso || 'M'}
                    onChange={e => updateField('sesso', e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="M">M - Maschile</option>
                    <option value="F">F - Femminile</option>
                  </select>
                </div>
              </div>
            )}

            {/* INDIRIZZO, NUMERO CIVICO, CAP, LOCALITA, PROVINCIA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Indirizzo (Via / Piazza / Corso) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={form.indirizzo}
                  onChange={e => updateField('indirizzo', e.target.value)}
                  placeholder="Es. VIA ROMA"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Numero Civico <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={form.numeroCivico}
                  onChange={e => updateField('numeroCivico', e.target.value)}
                  placeholder="Es. 14 o SNC"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  CAP <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={form.cap}
                  onChange={e => updateField('cap', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  placeholder="Es. 82100"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Località (Comune) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.localita}
                  onChange={e => updateField('localita', e.target.value)}
                  placeholder="Es. BENEVENTO"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Provincia (Sigla) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.provincia}
                  onChange={e =>
                    updateField('provincia', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))
                  }
                  placeholder="Es. BN"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>
            </div>

            {/* TELEFONO (NON OBBLIGATORIO), CELLULARE (NON OBBLIGATORIO), EMAIL (OBBLIGATORIA) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Telefono <span className="text-xs font-normal text-gray-400">(Opzionale)</span>
                </label>
                <input
                  type="tel"
                  maxLength={18}
                  value={form.telefono || ''}
                  onChange={e => updateField('telefono', e.target.value)}
                  placeholder="Es. 0824123456"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Cellulare <span className="text-xs font-normal text-gray-400">(Opzionale)</span>
                </label>
                <input
                  type="tel"
                  maxLength={18}
                  value={form.cellulare || ''}
                  onChange={e => updateField('cellulare', e.target.value)}
                  placeholder="Es. 3331234567"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  E-mail <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="cliente@azienda.it"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>
            </div>

            {/* FATTURAZIONE ELETTRONICA: CODICE DESTINATARIO SDI & PEC */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Fatturazione Elettronica (Compila almeno uno tra Codice SDI e PEC)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Codice Destinatario (SDI){' '}
                    <span className="text-red-600">{!form.pec?.trim() ? '*' : ''}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    value={form.codiceDestinatario || ''}
                    onChange={e =>
                      updateField(
                        'codiceDestinatario',
                        e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)
                      )
                    }
                    placeholder={form.pec?.trim() ? 'Autocompilato 0000000 se vuoto' : 'Es. M5UXCR1 o 0000000'}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase bg-white focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Indirizzo PEC{' '}
                    <span className="text-red-600">{!form.codiceDestinatario?.trim() ? '*' : ''}</span>
                  </label>
                  <input
                    type="email"
                    maxLength={254}
                    value={form.pec || ''}
                    onChange={e => updateField('pec', e.target.value)}
                    placeholder="azienda@pec.it"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                  />
                </div>
              </div>
            </div>

            {/* AGENTE (AUTOMATICO) E CATEGORIA COMMERCIALE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Agente Associato <span className="text-xs font-normal text-gray-500">(Assegnato in automatico)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={`${agentName}${agentCode ? ` (Cod. Zucchetti: ${agentCode})` : ''}`}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Categoria Commerciale Zucchetti <span className="text-red-600">*</span>
                </label>
                <select
                  value={form.categoriaCommerciale}
                  onChange={e => updateField('categoriaCommerciale', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                >
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CHECK ABILITA AL NEGOZIO ELMARK CON SCONTI STANDARD */}
            <div
              className={`p-4 rounded-xl border transition-colors ${
                form.isElmarkCustomer
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="flex items-start sm:items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isElmarkCustomer)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        isElmarkCustomer: checked,
                        elmarkDiscounts: checked
                          ? { E1: 20, L: 20, C: 5, E2: 5, F: 5 }
                          : undefined,
                      }));
                    }}
                    className="w-5 h-5 text-brand-main rounded border-gray-300 focus:ring-brand-main mt-0.5 sm:mt-0"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      Abilita al Negozio Elmark
                    </div>
                    <div className="text-xs text-gray-600">
                      Abilita il cliente ad acquistare nel Negozio Elmark applicando in automatico gli sconti standard del negozio.
                    </div>
                  </div>
                </label>

                {form.isElmarkCustomer && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold uppercase text-emerald-800 mr-1">
                      Sconti Standard Negozio Elmark:
                    </span>
                    {[
                      { group: 'E1', pct: 20 },
                      { group: 'L', pct: 20 },
                      { group: 'E2', pct: 5 },
                      { group: 'C', pct: 5 },
                      { group: 'F', pct: 5 },
                    ].map(item => (
                      <span
                        key={item.group}
                        className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 font-mono text-xs font-bold shadow-xs"
                      >
                        {item.group}: {item.pct}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PULSANTI FONDO STEP 1 */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelInsertion}
                  disabled={submitting}
                  className="px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Annulla Inserimento</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToStep2}
                  className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>Vai allo Step 2 (Campi Facoltativi / Fido / Sede Diversa)</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-brand-main hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creazione Cliente in Zucchetti...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salva e Crea Cliente in Zucchetti
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* CAMPI ANAGRAFICI E FISCALI FACOLTATIVI */}
            <div className="p-5 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
                Dati Anagrafici e Fiscali Aggiuntivi (Non Obbligatori)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Seconda Riga Descrizione / Insegna (`ANDESCR2`)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={form.descrizioneAggiuntiva || ''}
                    onChange={e => updateField('descrizioneAggiuntiva', e.target.value)}
                    placeholder="Eventuale insegna o prosecuzione ragione sociale"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Codice Fiscale (`ANCODFIS`)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={form.codiceFiscale || ''}
                    onChange={e => updateField('codiceFiscale', e.target.value.toUpperCase())}
                    placeholder={`Se vuoto viene usata la P.IVA (${form.partitaIva || '11 cifre'})`}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Nazione (`ANNAZION`)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.nazione || 'ITA'}
                    onChange={e => updateField('nazione', e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Lingua (`ANCODLIN`)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.lingua || 'ITA'}
                    onChange={e => updateField('lingua', e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* CONDIZIONI DI PAGAMENTO E FIDO FACOLTATIVE */}
            <div className="p-5 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
                Pagamenti e Gestione Fido (Non Obbligatori)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Codice Pagamento (`ANCODPAG`)
                  </label>
                  <select
                    value={form.codicePagamento || ''}
                    onChange={e => updateField('codicePagamento', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {CODICI_PAGAMENTO.map(cp => (
                      <option key={cp.code} value={cp.code}>
                        {cp.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Importo Max Fido Cliente (`ANVALFID`) €
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.importoMaxFido || ''}
                    onChange={e => updateField('importoMaxFido', e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Importo Max per Ordine (`ANMAXORD`) €
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.importoMaxOrdine || ''}
                    onChange={e => updateField('importoMaxOrdine', e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Controllo Fido (`ANFLFIDO`)
                  </label>
                  <select
                    value={form.gestioneFido || 'N'}
                    onChange={e => updateField('gestioneFido', e.target.value as 'S' | 'N')}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="N">No (Default Zucchetti)</option>
                    <option value="S">Sì</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Blocco Vendite Superamento Fido (`ANFLBLVE`)
                  </label>
                  <select
                    value={form.bloccoSuperamentoFido || 'N'}
                    onChange={e => updateField('bloccoSuperamentoFido', e.target.value as 'S' | 'N')}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="N">No (Default)</option>
                    <option value="S">Sì</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Blocco Contenzioso (`ANFLGCON`)
                  </label>
                  <select
                    value={form.bloccoContenzioso || 'N'}
                    onChange={e => updateField('bloccoContenzioso', e.target.value as 'S' | 'N')}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="N">No (Default)</option>
                    <option value="S">Sì</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEDE DIVERSA DI CONSEGNA (OPZIONALE) */}
            <div className="p-5 rounded-xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer text-base font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={Boolean(form.hasSedeDiversa)}
                    onChange={e => updateField('hasSedeDiversa', e.target.checked)}
                    className="w-4 h-4 text-brand-main rounded border-gray-300"
                  />
                  <span>Aggiungi Sede Diversa di Consegna Merce (`ADHOC_SEDI` / `DES_DIVE`)</span>
                </label>
              </div>

              {form.hasSedeDiversa && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Denominazione Sede (`OFDESCRI`)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.sedeDenominazione || ''}
                        onChange={e => updateField('sedeDenominazione', e.target.value)}
                        placeholder="Es. DEPOSITO / CANTIERE"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Indirizzo Sede (`OFADDRESS`)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.sedeIndirizzo || ''}
                        onChange={e => updateField('sedeIndirizzo', e.target.value)}
                        placeholder="Es. VIA NAZIONALE, 45"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">CAP Sede</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={form.sedeCap || ''}
                        onChange={e => updateField('sedeCap', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                        placeholder="82100"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Località Sede</label>
                      <input
                        type="text"
                        maxLength={50}
                        value={form.sedeLocalita || ''}
                        onChange={e => updateField('sedeLocalita', e.target.value)}
                        placeholder="BENEVENTO"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Provincia Sede</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.sedeProvincia || ''}
                        onChange={e =>
                          updateField('sedeProvincia', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))
                        }
                        placeholder="BN"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Persona di Riferimento (`DDPERSON`)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.sedePersonaRiferimento || ''}
                        onChange={e => updateField('sedePersonaRiferimento', e.target.value)}
                        placeholder="Nome referente scarico"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Note Consegna (`DD__NOTE`)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.sedeNoteConsegna || ''}
                        onChange={e => updateField('sedeNoteConsegna', e.target.value)}
                        placeholder="Es. SOLO MATTINA"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIEPILOGO CAMPI STANDARD ZUCCHETTI AUTOCOMPILATI (COME DA FOTO) */}
            <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Parametri Contabili Standard Zucchetti (Autocompilati in automatico)
                </h4>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Preconfigurati
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <div className="text-gray-500">Mastro contabile</div>
                  <div className="font-bold text-gray-900 mt-0.5">01030201 - CLIENTI</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <div className="text-gray-500">Categoria contabile</div>
                  <div className="font-bold text-gray-900 mt-0.5">CLIG - CLIENTI GENERICI</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <div className="text-gray-500">Gestione partite</div>
                  <div className="font-bold text-gray-900 mt-0.5">Sì (`ANPARTSN=S`)</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <div className="text-gray-500">Split Payment / INTRA / Ritenute</div>
                  <div className="font-bold text-gray-900 mt-0.5">No / Non soggetto</div>
                </div>
              </div>
            </div>

            {/* PULSANTI FONDO STEP 2 */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelInsertion}
                  disabled={submitting}
                  className="px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Annulla Inserimento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>&larr;</span>
                  <span>Torna allo Step 1 (Dati Obbligatori)</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-brand-main hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creazione Cliente in Zucchetti...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salva e Crea Cliente in Zucchetti
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* POP-UP MODAL CON RIEPILOGO CREDENZIALI E DOWNLOAD PDF */}
      {createdClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-black text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold">Cliente Creato con Successo!</h2>
                  <p className="text-xs text-gray-300">
                    Il PDF con le credenziali è stato scaricato automaticamente sul tuo PC.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Riepilogo Codice Zucchetti e Anagrafica */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-emerald-800">
                    Codice Cliente Zucchetti
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-950 mt-0.5">
                    {createdClient.zucchettiCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-800 font-semibold">
                    {createdClient.categoriaCommerciale}
                  </div>
                  <div className="text-sm font-bold text-emerald-950">
                    Sconto Base: {createdClient.scontoBase}%
                  </div>
                </div>
              </div>

              <div className="text-sm space-y-1.5 text-gray-700 border-b border-gray-100 pb-4">
                <div>
                  <span className="font-semibold text-gray-900">Ragione Sociale:</span>{' '}
                  {createdClient.ragioneSociale} ({createdClient.formaGiuridica})
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Partita IVA:</span>{' '}
                  <span className="font-mono">{createdClient.partitaIva}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Sede:</span>{' '}
                  {createdClient.indirizzo} — {createdClient.cap} {createdClient.localita} ({createdClient.provincia})
                </div>
                <div>
                  <span className="font-semibold text-gray-900">E-mail:</span> {createdClient.email}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Negozio Elmark:</span>{' '}
                  {createdClient.isElmarkCustomer ? (
                    <span className="text-emerald-700 font-semibold">
                      Abilitato (Sconti Standard: E1 20%, L 20%, E2 5%, C 5%, F 5%)
                    </span>
                  ) : (
                    <span className="text-gray-500">Non abilitato</span>
                  )}
                </div>
              </div>

              {/* Box Credenziali Portale B2B */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Credenziali Accesso Portale B2B
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="text-xs font-bold text-amber-900 hover:text-black underline"
                  >
                    {copiedCredentials ? 'Copiate negli appunti!' : 'Copia Credenziali'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-amber-200">
                  <div>
                    <div className="text-[11px] text-gray-500">Username</div>
                    <div className="font-mono font-bold text-sm text-gray-900 break-all">
                      {createdClient.username}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Password Temporanea</div>
                    <div className="font-mono font-bold text-sm text-brand-main">
                      {createdClient.tempPassword}
                    </div>
                  </div>
                </div>
              </div>

              {/* Azioni Modal */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => downloadClientCredentialsPdf(createdClient)}
                  className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Scarica PDF Credenziali
                </button>

                <button
                  type="button"
                  onClick={handleImpersonateNewClient}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Impersonifica Subito
                </button>

                <button
                  type="button"
                  onClick={handleResetForAnotherClient}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
