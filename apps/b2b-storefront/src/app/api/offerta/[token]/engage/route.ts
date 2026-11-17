import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@archelia/b2b-database';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = String(params?.token || '').trim();
  if (!token || token.length < 6) {
    return NextResponse.json({ success: false, error: 'Token offerta non valido' }, { status: 400 });
  }

  let bodyPayload: Record<string, unknown> = {};
  try {
    bodyPayload = await request.json();
  } catch {
    bodyPayload = {};
  }

  const urls = getCandidateApiGatewayUrls();
  let upstreamOk = false;
  let upstreamData: any = null;

  for (const base of urls) {
    try {
      const res = await fetch(
        `${base}/api/public/sdr/offerta/${encodeURIComponent(token)}/engage`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || '',
          },
          body: JSON.stringify({
            ...bodyPayload,
            humanVerified: true,
          }),
        }
      );
      if (res.ok) {
        upstreamOk = true;
        upstreamData = await res.json().catch(() => ({ success: true }));
        break;
      }
    } catch {
      // try next gateway candidate
    }
  }

  // Fallback locale su b2b_promo_prospects solo se l'endpoint /engage sull'API Gateway non ha risposto
  if (!upstreamOk) {
    try {
      const promo = await prisma.b2BPromoProspect.findFirst({
        where: { smartOfferToken: token },
      });
      if (promo) {
        await prisma.b2BPromoProspect.update({
          where: { id: promo.id },
          data: {
            catalogOpenedAt: promo.catalogOpenedAt ?? new Date(),
            catalogOpenCount: { increment: 1 },
          },
        });
      }
    } catch {
      // ignore if column not yet pushed
    }
  }

  return NextResponse.json(
    upstreamData || { success: true, trackedLocally: !upstreamOk },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
