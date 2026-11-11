import { prisma } from '@archelia/b2b-database';
import {
  OrderInstallment,
  GroupedDueDateItem,
  formatFidoPaymentType,
  computeOrderInstallments,
  buildGroupedDueDateSchedule,
} from './fidoSchedule';

export {
  formatFidoPaymentType,
  computeOrderInstallments,
  buildGroupedDueDateSchedule,
};
export type { OrderInstallment, GroupedDueDateItem };

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
  dueSchedule: GroupedDueDateItem[];
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

    if (!fidoEnabled || fidoConcesso <= 0) {
      return {
        hasFido: false,
        fidoConcesso: 0,
        fidoPaymentType: '',
        fidoPaymentLabel: '',
        fidoUtilizzato: 0,
        fidoDisponibile: 0,
        unpaidOrdersTotal: 0,
        manualPaymentsTotal: 0,
        isOverFido: false,
        overFidoAmount: 0,
        usagePct: 0,
        dueSchedule: [],
      };
    }

    const fidoPaymentType = user.fidoPaymentType || '30GG';
    const fidoPaymentLabel = formatFidoPaymentType(fidoPaymentType);

    const unpaidOrders = await prisma.b2BOrder.findMany({
      where: {
        userId: user.id,
        status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] },
        isPaid: false,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        zucchettiOrderRef: true,
        isPaid: true,
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
    const ordersForSchedule: Array<{
      id: string;
      createdAt: Date;
      zucchettiOrderRef?: string | null;
      isPaid: boolean;
      installments: OrderInstallment[];
    }> = [];

    for (const o of unpaidOrders) {
      const totalGross = Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
      const movSum = (o.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
      const paidAmount = Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
      const rem = Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);

      unpaidOrdersTotal += totalGross;
      partialPaymentsTotal += paidAmount;
      remainingTotal += rem;

      if (rem > 0) {
        ordersForSchedule.push({
          id: o.id,
          createdAt: o.createdAt,
          zucchettiOrderRef: o.zucchettiOrderRef,
          isPaid: Boolean(o.isPaid),
          installments: computeOrderInstallments(
            o.createdAt,
            totalGross,
            paidAmount,
            Boolean(o.isPaid),
            fidoPaymentType
          ),
        });
      }
    }

    const dueSchedule = buildGroupedDueDateSchedule(ordersForSchedule);

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
      dueSchedule,
    };
  } catch (err) {
    console.warn('[Fido] Errore calcolo riepilogo fido:', err);
    return null;
  }
}
