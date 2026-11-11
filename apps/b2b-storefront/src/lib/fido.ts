import { prisma } from '@archelia/b2b-database';

export interface ClientFidoSummary {
  hasFido: boolean;
  fidoConcesso: number;
  fidoPaymentType: string;
  fidoPaymentLabel: string;
  fidoUtilizzato: number;
  fidoDisponibile: number;
  unpaidOrdersTotal: number;
  manualPaymentsTotal: number;
  isOverFido: boolean;
  overFidoAmount: number;
  usagePct: number;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  '30GG': '30 gg',
  '60GG': '60 gg',
  '90GG': '90 gg',
  '30_60GG': '30 / 60 gg',
  '30_60_90GG': '30 / 60 / 90 gg',
  '30GG_FM': '30 gg Fine Mese',
  '60GG_FM': '60 gg Fine Mese',
  '90GG_FM': '90 gg Fine Mese',
  '30_60GG_FM': '30 / 60 gg Fine Mese',
  '30_60_90GG_FM': '30 / 60 / 90 gg Fine Mese',
};

export function formatFidoPaymentType(code?: string | null): string {
  if (!code) return '';
  return PAYMENT_TYPE_LABELS[code] || code;
}

export async function getClientFidoSummary(userId?: string | null): Promise<ClientFidoSummary | null> {
  if (!userId) return null;

  try {
    const user = await prisma.b2BUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fidoEnabled: true,
        fido: true,
        fidoPaymentType: true,
        role: true,
      },
    });

    if (!user || user.role !== 'USER') return null;

    const fidoEnabled = Boolean(user.fidoEnabled);
    const fidoConcesso = fidoEnabled ? Number(user.fido || 0) : 0;
    const fidoPaymentType = user.fidoPaymentType || '';
    const fidoPaymentLabel = formatFidoPaymentType(fidoPaymentType);

    if (!fidoEnabled || fidoConcesso <= 0) {
      return {
        hasFido: false,
        fidoConcesso: 0,
        fidoPaymentType,
        fidoPaymentLabel,
        fidoUtilizzato: 0,
        fidoDisponibile: 0,
        unpaidOrdersTotal: 0,
        manualPaymentsTotal: 0,
        isOverFido: false,
        overFidoAmount: 0,
        usagePct: 0,
      };
    }

    const unpaidOrders = await prisma.b2BOrder.findMany({
      where: {
        userId: user.id,
        status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] },
        isPaid: false,
      },
      select: {
        totalAmount: true,
        totalIva: true,
        paidAmount: true,
        fidoMovements: {
          select: { amount: true },
        },
      },
    });

    let unpaidOrdersTotal = 0;
    let partialPaymentsTotal = 0;
    let remainingTotal = 0;

    for (const o of unpaidOrders) {
      const totalGross = Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
      const movSum = (o.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
      const paidAmount = Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
      const rem = Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);

      unpaidOrdersTotal += totalGross;
      partialPaymentsTotal += paidAmount;
      remainingTotal += rem;
    }

    const fidoUtilizzato = Math.max(0, Number(remainingTotal.toFixed(2)));
    const fidoDisponibile = Number(Math.max(0, fidoConcesso - fidoUtilizzato).toFixed(2));
    const isOverFido = fidoUtilizzato > fidoConcesso;
    const overFidoAmount = isOverFido ? Number((fidoUtilizzato - fidoConcesso).toFixed(2)) : 0;
    const usagePct = Math.round((fidoUtilizzato / fidoConcesso) * 100);

    return {
      hasFido: true,
      fidoConcesso,
      fidoPaymentType,
      fidoPaymentLabel,
      fidoUtilizzato,
      fidoDisponibile,
      unpaidOrdersTotal: Number(unpaidOrdersTotal.toFixed(2)),
      manualPaymentsTotal: Number(partialPaymentsTotal.toFixed(2)),
      isOverFido,
      overFidoAmount,
      usagePct,
    };
  } catch (err) {
    console.warn('[Fido] Errore calcolo riepilogo fido:', err);
    return null;
  }
}
