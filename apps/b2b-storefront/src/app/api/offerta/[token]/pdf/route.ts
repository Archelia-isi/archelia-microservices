import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = String(params?.token || '').trim();
  if (!token || token.length < 6) {
    return NextResponse.json({ error: 'Token offerta non valido' }, { status: 400 });
  }

  const download = request.nextUrl.searchParams.get('download') === '1';
  const explicitNoTrack = request.nextUrl.searchParams.get('track') === '0';
  const querySuffix =
    download && !explicitNoTrack ? 'download=1' : 'track=0';

  const urls = getCandidateApiGatewayUrls();
  let lastStatus = 502;

  for (const base of urls) {
    const upstreamUrl = `${base}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?${querySuffix}`;
    try {
      const res = await fetch(upstreamUrl, {
        cache: 'no-store',
        headers: {
          'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
          'user-agent': request.headers.get('user-agent') || '',
        },
      });

      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const contentDisposition = download
        ? `attachment; filename="Catalistino_Riservato_Izzo_Distribuzione.pdf"`
        : `inline; filename="Catalistino_Riservato_Izzo_Distribuzione.pdf"`;

      return new NextResponse(arrayBuf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'private, max-age=600',
        },
      });
    } catch (err) {
      console.error('Errore proxy Catalistino PDF:', err);
    }
  }

  return NextResponse.json(
    { error: 'Catalistino PDF non disponibile o link scaduto' },
    { status: lastStatus }
  );
}
