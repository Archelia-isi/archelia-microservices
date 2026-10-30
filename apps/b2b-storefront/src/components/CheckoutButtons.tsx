'use client';

import { useState, useTransition } from 'react';
import { checkoutCart } from '../app/actions/checkout';
import {
  lookupVatForPromoCheckout,
  PromoProspectBillingInput,
} from '../app/actions/promoProspects';
import { useRouter } from 'next/navigation';

export interface PromoCheckoutDataProp {
  isPromoProspect: boolean;
  hasCompletedBillingData: boolean;
  prospect: {
    id: string;
    companyName: string;
    vatNumber: string;
    fiscalCode: string;
    formaGiuridica: string;
    firstName: string;
    lastName: string;
    sesso: string;
    address: string;
    streetNumber: string;
    zipCode: string;
    city: string;
    province: string;
    sdiCode: string;
    pec: string;
    phone: string;
    email: string;
    commercialCategory: string;
    discount: number;
  } | null;
}

const FORME_GIURIDICHE = [
  { code: 'SRL', label: 'SRL - Società a Responsabilità Limitata (anche SRLS)' },
  { code: 'IND', label: 'IND - Ditta Individuale' },
  { code: 'SNC', label: 'SNC - Società in Nome Collettivo' },
  { code: 'SAS', label: 'SAS - Società in Accomandita Semplice' },
  { code: 'SPA', label: 'SPA - Società per Azioni' },
  { code: 'COO', label: 'COO - Società Cooperativa / Consorzio' },
  { code: 'SSE', label: 'SSE - Società Semplice' },
  { code: 'PER', label: 'PER - Persona Fisica / Libero Professionista' },
  { code: 'ALT', label: 'ALT - Altro Ente / Associazione' },
];

export default function CheckoutButtons({
  isAgent,
  isImpersonating,
  promoCheckoutData,
}: {
  isAgent: boolean;
  isImpersonating: boolean;
  promoCheckoutData?: PromoCheckoutDataProp;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [viesLoading, setViesLoading] = useState(false);
  const [viesMessage, setViesMessage] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

  const p = promoCheckoutData?.prospect;
  const [billingForm, setBillingForm] = useState<PromoProspectBillingInput>({
    partitaIva: p?.vatNumber || '',
    codiceFiscale: p?.fiscalCode || p?.vatNumber || '',
    ragioneSociale: p?.companyName || '',
    formaGiuridica: p?.formaGiuridica || 'SRL',
    cognome: p?.lastName || '',
    nome: p?.firstName || '',
    sesso: p?.sesso || 'M',
    indirizzo: p?.address || '',
    numeroCivico: p?.streetNumber || 'SNC',
    cap: p?.zipCode || '',
    localita: p?.city || '',
    provincia: p?.province || '',
    codiceDestinatario: p?.sdiCode || '',
    pec: p?.pec || '',
    telefono: p?.phone || '',
    email: p?.email || '',
  });

  const isPromo = Boolean(promoCheckoutData?.isPromoProspect);
  const isPersonaOrDitta =
    billingForm.formaGiuridica === 'IND' || billingForm.formaGiuridica === 'PER';

  const handleViesLookup = async () => {
    if (!billingForm.partitaIva.trim()) return;
    setViesLoading(true);
    setViesMessage(null);
    try {
      const res = await lookupVatForPromoCheckout(billingForm.partitaIva);
      if (res.success && res.parsed) {
        setBillingForm(prev => ({
          ...prev,
          ragioneSociale: res.parsed?.ragioneSociale || prev.ragioneSociale,
          formaGiuridica: res.parsed?.formaGiuridica || prev.formaGiuridica,
          indirizzo: res.parsed?.indirizzo || prev.indirizzo,
          numeroCivico: res.parsed?.numeroCivico || prev.numeroCivico || 'SNC',
          cap: res.parsed?.cap || prev.cap,
          localita: res.parsed?.localita || prev.localita,
          provincia: res.parsed?.provincia || prev.provincia,
          codiceFiscale: prev.codiceFiscale || billingForm.partitaIva.replace(/\D/g, ''),
        }));
        setViesMessage({
          type: 'ok',
          text: 'Partita IVA verificata su archivio europeo VIES: dati anagrafici e indirizzo compilati automaticamente!',
        });
      } else {
        setViesMessage({
          type: 'warn',
          text: res.error || 'Verifica e completa manualmente i campi sottostanti.',
        });
      }
    } catch {
      setViesMessage({
        type: 'warn',
        text: 'Servizio VIES non raggiungibile al momento. Compila i campi manualmente.',
      });
    } finally {
      setViesLoading(false);
    }
  };

  const executeCheckout = (
    action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART' | 'SAVE_ORDER',
    billingPayload?: PromoProspectBillingInput
  ) => {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await checkoutCart(action, billingPayload);
      if (res.success) {
        setShowBillingModal(false);
        const type =
          action === 'SAVE_ORDER' ? 'saved' : action === 'PAUSE_CART' ? 'paused' : 'sent';
        const tabParam = res.storeMode === 'ELMARK' ? '&tab=elmark' : '';
        router.push(`/cart/success?type=${type}&orderId=${res.orderId || ''}${tabParam}`);
        router.refresh();
      } else {
        if (res.requiresBillingData) {
          setShowBillingModal(true);
        }
        setErrorMessage(res.error || "Si è verificato un errore durante l'operazione.");
      }
    });
  };

  const handleCheckoutClick = (action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART' | 'SAVE_ORDER') => {
    // Se è un prospect al 1° acquisto (o l'agente sta approvando il 1° ordine di un prospect senza dati completi),
    // apriamo il modal precompilato per completare/confermare i dati obbligatori Zucchetti
    if (action === 'SEND_TO_ZUCCHETTI' && isPromo) {
      if (!isAgent || !promoCheckoutData?.hasCompletedBillingData) {
        setErrorMessage(null);
        setShowBillingModal(true);
        return;
      }
    }
    executeCheckout(action);
  };

  return (
    <>
      {isAgent ? (
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          {isPromo && (
            <div className="w-full sm:w-auto mb-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-black uppercase tracking-wide block text-amber-950">
                  🆕 1° Ordine Cliente in Attivazione ({p?.companyName})
                </span>
                <span>
                  Approvando l&apos;ordine il sistema creerà automaticamente il cliente definitivo in{' '}
                  <strong>Zucchetti (serie C000xxx)</strong> e lo sposterà nei <strong>Clienti Attivi</strong> mantenendo le stesse credenziali.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setShowBillingModal(true);
                }}
                className="shrink-0 px-3 py-1.5 rounded bg-white border border-amber-400 text-amber-900 font-bold hover:bg-amber-100 transition-colors"
              >
                {promoCheckoutData?.hasCompletedBillingData
                  ? '✓ Verifica Dati Fiscali'
                  : '⚠️ Completa Dati Fiscali'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              disabled={isPending || !isImpersonating}
              onClick={() => handleCheckoutClick('PAUSE_CART')}
              className="bg-gray-200 text-black px-6 py-3 rounded font-bold hover:bg-gray-300 transition-colors w-full sm:w-auto disabled:opacity-50"
              title={!isImpersonating ? 'Devi impersonare un cliente per mettere in pausa' : ''}
            >
              {isPending ? 'Attendere...' : 'Metti in Pausa (Preventivo)'}
            </button>

            <button
              disabled={isPending || !isImpersonating}
              onClick={() => handleCheckoutClick('SEND_TO_ZUCCHETTI')}
              className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-brand-main hover:text-black transition-colors w-full sm:w-auto disabled:opacity-50"
              title={!isImpersonating ? "Devi impersonare un cliente per inviare l'ordine" : ''}
            >
              {isPending
                ? 'Attendere...'
                : isPromo
                ? 'Approva 1° Ordine & Attiva Cliente'
                : 'Invia Ordine'}
            </button>
          </div>
          {errorMessage && !showBillingModal && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded">
              {errorMessage}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              disabled={isPending}
              onClick={() => handleCheckoutClick('SAVE_ORDER')}
              className="bg-gray-100 text-gray-800 border border-gray-300 px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              {isPending ? 'Attendere...' : 'Salva Ordine'}
            </button>

            <button
              disabled={isPending}
              onClick={() => handleCheckoutClick('SEND_TO_ZUCCHETTI')}
              className="bg-black text-white px-8 py-3 rounded font-bold hover:bg-brand-main hover:text-black transition-colors w-full sm:w-auto disabled:opacity-50"
            >
              {isPending ? 'Elaborazione...' : 'Invia Ordine (Revisione Agente)'}
            </button>
          </div>
          {errorMessage && !showBillingModal && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* MODAL COMPLETAMENTO DATI OBBLIGATORI DI FATTURAZIONE (1° ACQUISTO) */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full overflow-hidden my-8">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">
                  {isAgent
                    ? 'Verifica Dati Fiscali per Attivazione Cliente Zucchetti'
                    : 'Completa i Dati di Fatturazione per il Tuo 1° Ordine'}
                </h2>
                <p className="text-xs text-gray-300 mt-0.5">
                  {isAgent
                    ? 'Controlla o completa i campi obbligatori prima di generare il codice cliente Zucchetti C000xxx.'
                    : 'I campi già noti sono pre-compilati. Inserisci i dati fiscali mancanti per inviare il tuo primo ordine.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBillingModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Partita IVA + VIES Lookup */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Partita IVA Italiana (11 cifre) *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    maxLength={13}
                    value={billingForm.partitaIva}
                    onChange={e =>
                      setBillingForm(prev => ({
                        ...prev,
                        partitaIva: e.target.value.replace(/\s+/g, ''),
                      }))
                    }
                    placeholder="Es. 01234567890"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-main focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={viesLoading}
                    onClick={handleViesLookup}
                    className="px-4 py-2 rounded-lg bg-brand-main hover:bg-amber-400 text-black font-bold text-xs transition-colors shrink-0"
                  >
                    {viesLoading ? 'Verifica VIES...' : '🔍 Auto-compila da P.IVA (VIES)'}
                  </button>
                </div>
                {viesMessage && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      viesMessage.type === 'ok' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {viesMessage.text}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Ragione Sociale Completa *
                  </label>
                  <input
                    type="text"
                    value={billingForm.ragioneSociale}
                    onChange={e =>
                      setBillingForm(prev => ({ ...prev, ragioneSociale: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Forma Giuridica *
                  </label>
                  <select
                    value={billingForm.formaGiuridica}
                    onChange={e =>
                      setBillingForm(prev => ({ ...prev, formaGiuridica: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {FORME_GIURIDICHE.map(fg => (
                      <option key={fg.code} value={fg.code}>
                        {fg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Codice Fiscale (se diverso da P.IVA)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={billingForm.codiceFiscale || ''}
                    onChange={e =>
                      setBillingForm(prev => ({
                        ...prev,
                        codiceFiscale: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder={billingForm.partitaIva || 'Codice Fiscale'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>

                {isPersonaOrDitta && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Cognome Titolare *
                      </label>
                      <input
                        type="text"
                        value={billingForm.cognome || ''}
                        onChange={e =>
                          setBillingForm(prev => ({ ...prev, cognome: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Nome Titolare *
                      </label>
                      <input
                        type="text"
                        value={billingForm.nome || ''}
                        onChange={e =>
                          setBillingForm(prev => ({ ...prev, nome: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Indirizzo Sede Legale / Consegna *
                    </label>
                    <input
                      type="text"
                      value={billingForm.indirizzo}
                      onChange={e =>
                        setBillingForm(prev => ({ ...prev, indirizzo: e.target.value }))
                      }
                      placeholder="Es. Via Roma"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      N. Civico *
                    </label>
                    <input
                      type="text"
                      value={billingForm.numeroCivico}
                      onChange={e =>
                        setBillingForm(prev => ({ ...prev, numeroCivico: e.target.value }))
                      }
                      placeholder="Es. 14 o SNC"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      CAP (5 cifre) *
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={billingForm.cap}
                      onChange={e =>
                        setBillingForm(prev => ({
                          ...prev,
                          cap: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="80100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Comune / Località *
                    </label>
                    <input
                      type="text"
                      value={billingForm.localita}
                      onChange={e =>
                        setBillingForm(prev => ({ ...prev, localita: e.target.value }))
                      }
                      placeholder="Es. Napoli"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Provincia (2 lett.) *
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={billingForm.provincia}
                      onChange={e =>
                        setBillingForm(prev => ({
                          ...prev,
                          provincia: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="NA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Codice Destinatario SDI (7 car.) *
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    value={billingForm.codiceDestinatario || ''}
                    onChange={e =>
                      setBillingForm(prev => ({
                        ...prev,
                        codiceDestinatario: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Es. M5UXCR1 o 0000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Indirizzo PEC (alternativo a SDI)
                  </label>
                  <input
                    type="email"
                    value={billingForm.pec || ''}
                    onChange={e =>
                      setBillingForm(prev => ({ ...prev, pec: e.target.value.toLowerCase() }))
                    }
                    placeholder="azienda@pec.it"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Recapito Telefonico *
                  </label>
                  <input
                    type="tel"
                    value={billingForm.telefono}
                    onChange={e =>
                      setBillingForm(prev => ({ ...prev, telefono: e.target.value }))
                    }
                    placeholder="Es. 3331234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Email Aziendale *
                  </label>
                  <input
                    type="email"
                    value={billingForm.email}
                    onChange={e =>
                      setBillingForm(prev => ({ ...prev, email: e.target.value.toLowerCase() }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBillingModal(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-bold hover:bg-gray-100 w-full sm:w-auto"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => executeCheckout('SEND_TO_ZUCCHETTI', billingForm)}
                className="px-6 py-2.5 rounded-lg bg-black hover:bg-brand-main hover:text-black text-white text-sm font-black transition-colors w-full sm:w-auto disabled:opacity-50"
              >
                {isPending
                  ? 'Salvataggio e Invio in corso...'
                  : isAgent
                  ? 'Conferma Dati, Approva 1° Ordine & Attiva Cliente'
                  : 'Conferma Dati e Invia 1° Ordine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
