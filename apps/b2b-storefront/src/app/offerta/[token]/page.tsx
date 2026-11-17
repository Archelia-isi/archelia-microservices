import Link from 'next/link';
import { headers } from 'next/headers';
import { prisma } from '@archelia/b2b-database';
import OfferEngagementBeacon, { OfferCredentialsCard } from './OfferEngagementBeacon';

export const dynamic = 'force-dynamic';

function getCandidateApiGatewayUrls(): string[] {
  const configured = (process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (configured) {
    return [configured.replace(/\/$/, '')];
  }
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://api-gateway-production-2ec6.up.railway.app',
      'https://api-gateway-v2-development.up.railway.app',
    ];
  }
  return ['http://localhost:3000'];
}

interface OfferMetaPayload {
  companyName: string;
  city?: string | null;
  province?: string | null;
  commercialCategory: 'IST' | 'RIV' | string;
  categoryCluster?: string;
  clusterLabel?: string;
  promoProspectId?: string | null;
  username?: string | null;
  tempPassword?: string | null;
  mustChangePassword?: boolean;
  baseDiscount: number;
  extraDiscount?: number;
  extraFirstPurchasePct?: number;
  discountFormula: string;
  effectiveNetPct?: number;
  offerTitle?: string;
  minOrderText?: string;
  minOrderAmountText?: string;
  shippingText?: string;
  freeShippingText?: string;
  assignedAgentName?: string;
  agentName?: string;
  assignedAgentEmail?: string;
  agentEmail?: string;
  assignedAgentPhone?: string;
  agentPhone?: string;
  openCount?: number;
}

interface OfferMetaResponse {
  success: boolean;
  error?: string;
  offer?: OfferMetaPayload;
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
  const candidateUrls = getCandidateApiGatewayUrls();
  for (const base of candidateUrls) {
    try {
      const res = await fetch(
        `${base}/api/public/sdr/offerta/${encodeURIComponent(token)}/meta?skipTrack=1`,
        {
          cache: 'no-store',
          headers: {
            'x-nextjs-ssr': '1',
            'x-forwarded-for': visitorIp,
            'user-agent': userAgent,
          },
        }
      );
      if (!res.ok) continue;
      const parsed: OfferMetaResponse = await res.json();
      if (parsed?.success && parsed?.offer) {
        meta = parsed;
        break;
      }
    } catch {
      // try next candidate URL
    }
  }

  let offer = meta?.offer || null;

  // Reidrata/sincronizza credenziali e smartOfferToken anche direttamente da b2b_promo_prospects
  let dbPromo: any = null;
  try {
    if (offer?.promoProspectId) {
      dbPromo = await prisma.b2BPromoProspect.findUnique({
        where: { id: offer.promoProspectId },
      });
    }
    if (!dbPromo && offer?.username) {
      dbPromo = await prisma.b2BPromoProspect.findFirst({
        where: { username: { equals: offer.username.trim(), mode: 'insensitive' } },
      });
    }
    if (!dbPromo && token.length >= 6) {
      dbPromo = await prisma.b2BPromoProspect.findFirst({
        where: { smartOfferToken: token },
      });
    }
    if (dbPromo && token && !dbPromo.smartOfferToken) {
      await prisma.b2BPromoProspect
        .update({
          where: { id: dbPromo.id },
          data: { smartOfferToken: token },
        })
        .catch(() => {});
    }
  } catch {
    // ignore if optional column not yet pushed
  }

  // Fallback completo da b2b_promo_prospects se l'API Gateway non fosse raggiungibile
  if (!offer && dbPromo) {
    const baseDisc = Number(dbPromo.discount || (dbPromo.commercialCategory === 'RIV' ? 50 : 40));
    const extraDisc = 10;
    offer = {
      companyName: dbPromo.companyName,
      city: dbPromo.city,
      province: dbPromo.province,
      commercialCategory: dbPromo.commercialCategory || 'IST',
      categoryCluster: dbPromo.categoryCluster,
      promoProspectId: dbPromo.id,
      username: dbPromo.username,
      tempPassword: dbPromo.tempPassword,
      mustChangePassword: dbPromo.mustChangePassword,
      baseDiscount: baseDisc,
      extraDiscount: extraDisc,
      discountFormula: `${baseDisc}% + ${extraDisc}%`,
      offerTitle: 'Invito conoscitivo e sconto di benvenuto sul primo ordine',
      minOrderText: "Nessun minimo d'ordine",
      shippingText: 'Spedizione curata e tracciata in tutta Italia',
      assignedAgentName: 'Daniele Savoia',
      assignedAgentEmail: 'daniele.savoia@izzodistribuzione.com',
      assignedAgentPhone: '+39 389 0129832',
    };
  }

  if (!offer) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Offerta Riservata non trovata o scaduta
          </h1>
          <p className="text-gray-600 mb-6">
            Il collegamento al Catalistino B2B potrebbe non essere valido. Accedi direttamente al
            Portale B2B Izzo Distribuzione con le credenziali ricevute.
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

  const resolvedUsername = offer.username || dbPromo?.username || null;
  const resolvedTempPassword = offer.tempPassword ?? dbPromo?.tempPassword ?? null;
  const resolvedMustChangePassword =
    offer.mustChangePassword ?? dbPromo?.mustChangePassword ?? true;
  const minOrderLabel =
    offer.minOrderText || offer.minOrderAmountText || "Nessun minimo d'ordine";
  const shippingLabel =
    offer.shippingText ||
    offer.freeShippingText ||
    'Spedizione curata e tracciata in tutta Italia';
  const agentNameLabel = offer.assignedAgentName || offer.agentName || 'Daniele Savoia';
  const agentPhoneLabel = offer.assignedAgentPhone || offer.agentPhone || '+39 389 0129832';
  const offerTitleLabel =
    offer.offerTitle || 'Invito conoscitivo e sconto di benvenuto sul primo ordine';

  const autoLoginUrl = `/api/offerta/${encodeURIComponent(token)}/auto-login`;
  const pdfInlineUrl = `/api/offerta/${encodeURIComponent(token)}/pdf?track=0`;
  const pdfDownloadUrl = `/api/offerta/${encodeURIComponent(token)}/pdf?download=1`;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Beacon umano anti-scanner (scatta solo dopo 1.5s di apertura reale nel browser) */}
      <OfferEngagementBeacon token={token} />

      {/* BANNER OFFERTA RISERVATA PERSONALIZZATA + 2 CTA PRINCIPALI */}
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
              {offerTitleLabel} — Sconto riservato{' '}
              <strong className="text-amber-400">{offer.discountFormula}</strong> a cascata
              associato all&apos;eventuale primo ordine sugli articoli in pronta disponibilità a
              magazzino. Consultazione gratuita e priva di qualsiasi vincolo commerciale.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-300">
              <span className="px-3 py-1.5 rounded-lg bg-white/10">✅ {minOrderLabel}</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10">🚚 {shippingLabel}</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10">
                👤 Referente dedicato: <strong>{agentNameLabel}</strong> ({agentPhoneLabel})
              </span>
            </div>
          </div>

          {/* CARD AZIONI PRINCIPALI (1 CLIC PORTALE + SCARICA PDF CON CREDENZIALI) */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 min-w-[310px] lg:max-w-[380px] w-full space-y-3">
            <a
              href={autoLoginUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm md:text-base transition shadow-lg text-center"
            >
              🚀 Entra Subito nel Portale coi Tuoi Prezzi (1 Clic)
            </a>

            <a
              href={pdfDownloadUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm transition shadow text-center"
            >
              📥 Scarica Catalistino PDF (con Credenziali)
            </a>

            <div className="text-[11px] text-gray-300 text-center pt-0.5">
              Accesso diretto senza obbligo di cambio password • +15.000 articoli scontati
            </div>
          </div>
        </div>
      </section>

      {/* RIQUADRO CREDENZIALI COPIABILI + AVVISO SALVATAGGIO PDF */}
      <OfferCredentialsCard
        username={resolvedUsername}
        tempPassword={resolvedTempPassword}
        mustChangePassword={resolvedMustChangePassword}
        pdfDownloadUrl={pdfDownloadUrl}
      />

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
            Non vedi l&apos;anteprima? Scarica il Catalistino PDF completo (con credenziali) ↗
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
