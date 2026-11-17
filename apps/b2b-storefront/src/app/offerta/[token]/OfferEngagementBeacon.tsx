'use client';

import { useEffect, useState } from 'react';

export default function OfferEngagementBeacon({ token }: { token: string }) {
  useEffect(() => {
    const cleanToken = (token || '').trim();
    if (!cleanToken) return;

    const storageKey = `izzo_sdr_engaged_${cleanToken}`;
    try {
      if (sessionStorage.getItem(storageKey) === '1') {
        return;
      }
    } catch {
      // sessionStorage disabled in strict privacy modes
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;

    const sendBeaconEngage = () => {
      if (sent) return;
      sent = true;
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch {
        // ignore
      }
      fetch(`/api/offerta/${encodeURIComponent(cleanToken)}/engage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'offer_page_human_1500ms',
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    const scheduleIfVisible = () => {
      if (sent) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
          sendBeaconEngage();
        }
      }, 1500);
    };

    scheduleIfVisible();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleIfVisible();
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [token]);

  return null;
}

export function OfferCredentialsCard({
  username,
  tempPassword,
  mustChangePassword,
  pdfDownloadUrl,
}: {
  username?: string | null;
  tempPassword?: string | null;
  mustChangePassword?: boolean;
  pdfDownloadUrl: string;
}) {
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | null>(null);

  const handleCopy = async (value: string, field: 'user' | 'pass') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField(prev => (prev === field ? null : prev));
      }, 2200);
    } catch {
      // fallback no-op
    }
  };

  if (!username) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-300 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border-b border-amber-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5">💡</span>
          <p className="text-xs md:text-sm font-bold text-amber-950 leading-relaxed">
            Promemoria importante: per salvare e conservare le tue credenziali riservate sul tuo
            computer o telefono, scarica il tuo Catalistino PDF — le trovi stampate all&apos;interno!
          </p>
        </div>
        <a
          href={pdfDownloadUrl}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shrink-0 transition shadow-sm"
        >
          📥 Scarica PDF con Credenziali
        </a>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Utente Riservato Portale B2B
            </span>
            <code className="text-base font-black text-gray-900 font-mono break-all">
              {username}
            </code>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(username, 'user')}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-800 shrink-0 transition"
          >
            {copiedField === 'user' ? '✓ Copiato!' : '📋 Copia Utente'}
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Password Provvisoria di Consultazione
            </span>
            {tempPassword ? (
              <code className="text-base font-black text-amber-900 font-mono break-all">
                {tempPassword}
              </code>
            ) : (
              <span className="text-sm font-semibold text-emerald-800">
                {mustChangePassword === false
                  ? '✓ Password personale già attivata'
                  : 'Usa l’ingresso rapido 1-Clic qui sopra'}
              </span>
            )}
          </div>
          {tempPassword && (
            <button
              type="button"
              onClick={() => handleCopy(tempPassword, 'pass')}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-950 shrink-0 transition"
            >
              {copiedField === 'pass' ? '✓ Copiata!' : '📋 Copia Password'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
