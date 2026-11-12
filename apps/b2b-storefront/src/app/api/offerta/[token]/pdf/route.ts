import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL =
  process.env.API_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = String(params?.token || '').trim();
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Token offerta non valido' }, { status: 400 });
  }

  const download = request.nextUrl.searchParams.get('download') === '1';
  const upstreamUrl = `${API_GATEWAY_URL}/api/public/sdr/offerta/${encodeURIComponent(token)}/pdf?track=0`;

  try {
    const res = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'user-agent': request.headers.get('user-agent') || '',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Catalistino PDF non disponibile o link scaduto' },
        { status: res.status }
      );
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
    return NextResponse.json(
      { error: 'Servizio Catalistino temporaneamente non raggiungibile' },
      { status: 502 }
    );
  }
}
