import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL =
  process.env.API_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

interface OfferMetaResponse {
  success: boolean;
  error?: string;
  offer?: {
    companyName: string;
    city?: string | null;
    province?: string | null;
    commercialCategory: 'IST' | 'RIV';
    categoryCluster?: string;
    username?: string | null;
    baseDiscount: number;
    extraFirstPurchasePct: number;
    discountFormula: string;
    offerTitle: string;
    minOrderText: string;
    shippingText: string;
    assignedAgentName: string;
    assignedAgentEmail?: string;
  };
}

export default async function PublicSdrOfferPage({
  params,
}: {
  params: { token: string };
}) {
  const token = String(params?.token || '').trim();
  const reqHeaders = headers();
  const visitorIp = reqHeaders.get('x-forwarded-for') || '';
  const userAgent = reqHeaders.get('user-agent') || '';

  let meta: OfferMetaResponse | null = null;
  try {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/public/sdr/offerta/${encodeURIComponent(token)}/meta`,
      {
        cache: 'no-store',
        headers: {
          'x-forwarded-for': visitorIp,
          'user-agent': userAgent,
        },
      }
    );
    meta = await res.json();
  } catch {
    meta = null;
  }

  const offer = meta?.offer;

  if (!meta?.success || !offer) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Offerta Riservata non trovata o scaduta
          </h1>
          <p className="text-gray-600 mb-6">
            Il collegamento al Catalistino B2B potrebbe non essere valido. Accedi direttamente al
            Portale B2B Izzo Distribuzione con le credenziali ricevute via email.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition"
          >
            Accedi al Portale B2B →
          </Link>
        </div>
      </main>
    );
  }

  const pdfInlineUrl = `/api/offerta/${encodeURIComponent(token)}/pdf`;
  const pdfDownloadUrl = `/api/offerta/${encodeURIComponent(token)}/pdf?download=1`;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* BANNER OFFERTA RISERVATA PERSONALIZZATA */}
      <section className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
              Presentazione Fornitore B2B • Estratto Catalistino Riservato
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Prospetto Commerciale riservato a {offer.companyName}
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-3xl">
              {offer.offerTitle} — Sconto riservato{' '}
              <strong className="text-amber-400">{offer.discountFormula}</strong> a cascata
              associato all&apos;eventuale primo ordine sugli articoli in pronta disponibilità a
              magazzino. Consultazione gratuita e priva di qualsiasi vincolo commerciale.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-300">
              <span className="px-3 py-1.5 rounded-lg bg-white/10">
                ✅ {offer.minOrderText}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10">
                🚚 {offer.shippingText}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10">
                👤 Referente dedicato: <strong>{offer.assignedAgentName}</strong>
              </span>
            </div>
          </div>

          {/* CARD AZIONI RAPIDE + ACCESSO PORTALE B2B */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 min-w-[290px] space-y-3">
            {offer.username && (
              <div className="text-xs text-gray-200 bg-black/40 rounded-lg px-3 py-2 border border-white/10">
                <span className="block text-gray-400 uppercase text-[10px] font-bold">
                  Utente Provvisorio di Consultazione (Gratuito)
                </span>
                <code className="text-sm font-bold text-amber-300">{offer.username}</code>
              </div>
            )}

            <a
              href={pdfDownloadUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition shadow"
            >
              📥 Scarica Estratto Catalistino PDF
            </a>

            <Link
              href={offer.username ? `/login?u=${encodeURIComponent(offer.username)}` : '/login'}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition"
            >
              🔑 Accedi al Portale B2B →
            </Link>
          </div>
        </div>
      </section>

      {/* VISUALIZZATORE INTERATTIVO CATALISTINO PDF */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-gray-800">
            📄 Anteprima Estratto Catalistino Riservato — {offer.companyName} (Condizione 1° ordine{' '}
            {offer.discountFormula})
          </div>
          <a
            href={pdfDownloadUrl}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Non vedi l&apos;anteprima? Scarica il PDF completo ↗
          </a>
        </div>
        <div className="w-full h-[78vh] min-h-[620px] bg-gray-100">
          <iframe
            src={pdfInlineUrl}
            title={`Catalistino Riservato ${offer.companyName}`}
            className="w-full h-full border-0"
          />
        </div>
      </section>

      {/* FOOTER SOCIETARIO IZZO DISTRIBUZIONE S.R.L. */}
      <footer className="text-center text-xs text-gray-500 py-4 border-t border-gray-200">
        <strong>Izzo Distribuzione S.r.l.</strong> — Sede legale: Contrada Piano Cappelle 8, 82100
        Benevento (BN) — P.IVA 01868260629 — REA BN-309049 — Portale B2B:{' '}
        <a href="https://www.izzodistribuzione.it" className="underline hover:text-gray-800">
          www.izzodistribuzione.it
        </a>
      </footer>
    </main>
  );
}
