import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { generateOrderPdfOnServer } from '@/lib/orderPdfGenerator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
    }

    const orderId = String(params?.id || '').trim();
    if (!orderId) {
      return NextResponse.json({ error: 'ID ordine mancante.' }, { status: 400 });
    }

    const result = await generateOrderPdfOnServer({
      orderId,
      requesterId: session.userId,
      requesterRole: session.user.role,
    });

    if (result.status !== 'OK') {
      return NextResponse.json(
        { error: result.error },
        { status: result.status === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    const { buffer, fileName } = result.data;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Errore generazione PDF ordine:', err);
    return NextResponse.json(
      { error: err?.message || 'Errore durante la generazione del PDF.' },
      { status: 500 }
    );
  }
}
