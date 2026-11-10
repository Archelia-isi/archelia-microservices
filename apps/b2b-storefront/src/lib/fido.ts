import { prisma } from '@archelia/b2b-database';

export interface ClientFidoSummary {
  hasFido: boolean;
  fidoConcesso: number;
  fidoUtilizzato: number;
  fidoDisponibile: number;
  unpaidOrdersTotal: number;
  manualPaymentsTotal: number;
  isOverFido: boolean;
  overFidoAmount: number;
  usagePct: number;
}

export async function getClientFidoSummary(userId?: string | null): Promise<ClientFidoSummary | null> {
  if (!userId) return null;

  try {
    const user = await prisma.b2BUser.findUnique({
      where: { id: userId },
      select: { id: true, fido: true, role: true },
    });

    if (!user || user.role !== 'USER') return null;

    const fidoConcesso = Number(user.fido || 0);
    if (fidoConcesso <= 0) {
      return {
        hasFido: false,
        fidoConcesso: 0,
        fidoUtilizzato: 0,
        fidoDisponibile: 0,
        unpaidOrdersTotal: 0,
        manualPaymentsTotal: 0,
        isOverFido: false,
        overFidoAmount: 0,
        usagePct: 0,
      };
    }

    const [unpaidOrders, movements] = await Promise.all([
      prisma.b2BOrder.findMany({
        where: {
          userId: user.id,
          status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] },
          isPaid: false,
        },
        select: {
          totalAmount: true,
          totalIva: true,
        },
      }),
      prisma.b2BFidoMovement.findMany({
        where: { userId: user.id },
        select: { amount: true },
      }),
    ]);

    const unpaidOrdersTotal = Number(
      unpaidOrders
        .reduce((acc, o) => acc + Number(o.totalAmount || 0) + Number(o.totalIva || 0), 0)
        .toFixed(2)
    );
    const manualPaymentsTotal = Number(
      movements.reduce((acc, m) => acc + Number(m.amount || 0), 0).toFixed(2)
    );

    const fidoUtilizzato = Math.max(0, Number((unpaidOrdersTotal - manualPaymentsTotal).toFixed(2)));
    const fidoDisponibile = Number((fidoConcesso - fidoUtilizzato).toFixed(2));
    const isOverFido = fidoUtilizzato > fidoConcesso;
    const overFidoAmount = isOverFido ? Number((fidoUtilizzato - fidoConcesso).toFixed(2)) : 0;
    const usagePct = Math.round((fidoUtilizzato / fidoConcesso) * 100);

    return {
      hasFido: true,
      fidoConcesso,
      fidoUtilizzato,
      fidoDisponibile,
      unpaidOrdersTotal,
      manualPaymentsTotal,
      isOverFido,
      overFidoAmount,
      usagePct,
    };
  } catch (err) {
    console.warn('[Fido] Errore calcolo riepilogo fido:', err);
    return null;
  }
}
