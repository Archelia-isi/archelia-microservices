import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@archelia/b2b-database';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';

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

function isAutomatedBotOrPrefetch(request: NextRequest): boolean {
  if (request.method === 'HEAD') return true;
  const purpose = (
    request.headers.get('purpose') ||
    request.headers.get('sec-purpose') ||
    request.headers.get('next-router-prefetch') ||
    ''
  ).toLowerCase();
  if (purpose.includes('prefetch') || purpose === '1') return true;

  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (!ua) return true;
  const scannerPatterns = [
    'safelinks',
    'microsoft office',
    'ms-office',
    'mimecast',
    'barracuda',
    'proofpoint',
    'defender',
    'googleimageproxy',
    'slackbot',
    'whatsapp',
    'telegrambot',
    'curl/',
    'python-requests',
    'python-urllib',
    'headlesschrome',
    'crawler',
    'spider',
    'bot/',
    'bot;',
  ];
  return scannerPatterns.some(pat => ua.includes(pat));
}

function resolvePublicBaseUrl(request: NextRequest): { baseUrl: string; host: string } {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    (process.env.NODE_ENV === 'production' ? 'www.izzodistribuzione.it' : 'localhost:3000');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return { baseUrl: `${proto}://${host}`, host };
}

async function resolveOfferMetaFromGateway(
  token: string,
  request: NextRequest
): Promise<{
  promoProspectId?: string | null;
  username?: string | null;
  companyName?: string | null;
} | null> {
  const urls = getCandidateApiGatewayUrls();
  for (const base of urls) {
    try {
      const res = await fetch(
        `${base}/api/public/sdr/offerta/${encodeURIComponent(token)}/meta?skipTrack=1`,
        {
          cache: 'no-store',
          headers: {
            'x-nextjs-ssr': '1',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || '',
          },
        }
      );
      if (!res.ok) continue;
      const data: any = await res.json();
      if (data?.success && data?.offer) {
        return {
          promoProspectId: data.offer.promoProspectId || null,
          username: data.offer.username || null,
          companyName: data.offer.companyName || null,
        };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function notifyGatewayEngagement(token: string, request: NextRequest): Promise<void> {
  const urls = getCandidateApiGatewayUrls();
  for (const base of urls) {
    try {
      const res = await fetch(
        `${base}/api/public/sdr/offerta/${encodeURIComponent(token)}/engage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || '',
          },
          body: JSON.stringify({ source: 'auto_login_1click', humanVerified: true }),
          cache: 'no-store',
        }
      );
      if (res.ok) return;
    } catch {
      // ignore non-blocking telemetry error
    }
  }
}

async function handleAutoLogin(request: NextRequest, token: string): Promise<NextResponse> {
  const cleanToken = String(token || '').trim();
  const { baseUrl, host } = resolvePublicBaseUrl(request);

  if (!cleanToken || cleanToken.length < 6) {
    return NextResponse.redirect(new URL('/login', baseUrl), 302);
  }

  // Protezione anti-scanner antivirus / prefetch: non consumare né contare login automatici dei bot email
  if (isAutomatedBotOrPrefetch(request)) {
    const safeUrl = `${baseUrl}/offerta/${encodeURIComponent(cleanToken)}`;
    return new NextResponse(
      `<!doctype html><html lang="it"><head><meta charset="utf-8"/><title>Accesso Riservato B2B — Izzo Distribuzione</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Accesso Riservato Portale B2B</h2><p><a href="${safeUrl}">Clicca qui per aprire la tua offerta riservata</a></p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }

  let promoProspect: any = null;

  // 1. Ricerca diretta su b2b_promo_prospects tramite smartOfferToken
  try {
    promoProspect = await prisma.b2BPromoProspect.findFirst({
      where: { smartOfferToken: cleanToken },
    });
  } catch {
    promoProspect = null;
  }

  // 2. Fallback tramite metadati dell'API Gateway (/api/public/sdr/offerta/:token/meta)
  if (!promoProspect) {
    const meta = await resolveOfferMetaFromGateway(cleanToken, request);
    if (meta?.promoProspectId) {
      promoProspect = await prisma.b2BPromoProspect.findUnique({
        where: { id: meta.promoProspectId },
      });
    }
    if (!promoProspect && meta?.username) {
      promoProspect = await prisma.b2BPromoProspect.findFirst({
        where: {
          username: { equals: meta.username.trim(), mode: 'insensitive' },
        },
      });
    }
  }

  if (!promoProspect || !promoProspect.isActive || promoProspect.status === 'EXPIRED') {
    return NextResponse.redirect(new URL('/login?error=invalid', baseUrl), 302);
  }

  const useIzzoDomain =
    process.env.NODE_ENV === 'production' && host.toLowerCase().includes('izzodistribuzione.it');

  // Se il prospect è già stato convertito in B2BUser definitivo, autenticalo direttamente come utente attivo
  if (promoProspect.convertedToUserId) {
    const convertedUser = await prisma.b2BUser.findUnique({
      where: { id: promoProspect.convertedToUserId },
    });
    if (convertedUser && convertedUser.isActive) {
      const { token: sessionToken, expiresAt } = await createSession(convertedUser.id, false);
      const response = NextResponse.redirect(new URL('/catalog', baseUrl), 302);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
        ...(useIzzoDomain ? { domain: '.izzodistribuzione.it' } : {}),
      });
      response.cookies.set('b2b_store_mode', 'ZUCCHETTI', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        ...(useIzzoDomain ? { domain: '.izzodistribuzione.it' } : {}),
      });
      return response;
    }
  }

  // Aggiorna immediatamente telemetria 1° accesso e salva smartOfferToken su b2b_promo_prospects
  const now = new Date();
  const nextStatus = promoProspect.status === 'CONTACTED' ? 'LOGGED_IN' : promoProspect.status;
  try {
    await prisma.b2BPromoProspect.update({
      where: { id: promoProspect.id },
      data: {
        firstLoginAt: promoProspect.firstLoginAt ?? now,
        lastLoginAt: now,
        loginCount: { increment: 1 },
        status: nextStatus,
        smartOfferToken: promoProspect.smartOfferToken || cleanToken,
      },
    });
  } catch {
    await prisma.b2BPromoProspect.update({
      where: { id: promoProspect.id },
      data: {
        firstLoginAt: promoProspect.firstLoginAt ?? now,
        lastLoginAt: now,
        loginCount: { increment: 1 },
        status: nextStatus,
      },
    });
  }

  // Notifica engagement reale anche all'API Gateway (in background senza bloccare il redirect)
  void notifyGatewayEngagement(cleanToken, request);

  // Crea sessione B2BPromoProspect e imposta cookie b2b_store_mode = 'ZUCCHETTI' -> redirect diretto a /catalog
  const { token: sessionToken, expiresAt } = await createSession(promoProspect.id, true);
  const response = NextResponse.redirect(new URL('/catalog', baseUrl), 302);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
    ...(useIzzoDomain ? { domain: '.izzodistribuzione.it' } : {}),
  });

  response.cookies.set('b2b_store_mode', 'ZUCCHETTI', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...(useIzzoDomain ? { domain: '.izzodistribuzione.it' } : {}),
  });

  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  return handleAutoLogin(request, params?.token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  return handleAutoLogin(request, params?.token);
}
