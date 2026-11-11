import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import {
  formatFidoPaymentType,
  computeOrderInstallments,
  buildGroupedDueDateSchedule,
  getRomeYMD,
} from '@/lib/fidoSchedule';
import ScadenziarioClient, {
  type AgentClientScheduleData,
  type ClientOrderScheduleRow,
} from './ScadenziarioClient';

export default async function ScadenziarioPage({
  searchParams,
}: {
  searchParams?: { client?: string };
}) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  // =========================================================================
  // MODALITÀ AGENTE: Sempre attiva, mostra le scadenze dei propri clienti
  // =========================================================================
  if (session.user.role === 'AGENT') {
    const dbClients = await prisma.b2BUser.findMany({
      where: {
        agentId: session.userId,
        role: 'USER',
        fidoEnabled: true,
        fido: { gt: 0 },
      },
      include: {
        orders: {
          where: {
            status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] },
            isPaid: false,
          },
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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const mappedClients: AgentClientScheduleData[] = dbClients.map((u) => {
      const fidoConcesso = Number(u.fido || 0);
      const effectivePaymentType = u.fidoPaymentType || '30GG';
      const fidoPaymentLabel = formatFidoPaymentType(effectivePaymentType);

      let remainingTotal = 0;
      const ordersForSchedule = (u.orders || []).map((o) => {
        const totalGross =
          Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
        const movSum = (o.fidoMovements || []).reduce(
          (s, m) => s + (Number(m.amount) || 0),
          0
        );
        const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
        const paidAmount = Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
        const rem = Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);
        remainingTotal += rem;
        const isEffectivelyPaid = Boolean(o.isPaid) || rem <= 0.009;

        return {
          id: o.id,
          createdAt: o.createdAt,
          zucchettiOrderRef: o.zucchettiOrderRef,
          isPaid: isEffectivelyPaid,
          installments: computeOrderInstallments(
            o.createdAt,
            totalGross,
            paidAmount,
            isEffectivelyPaid,
            effectivePaymentType
          ),
        };
      });

      const dueSchedule = buildGroupedDueDateSchedule(ordersForSchedule);
      const fidoUtilizzato = Math.max(0, Number(remainingTotal.toFixed(2)));
      const fidoDisponibile = Number(Math.max(0, fidoConcesso - fidoUtilizzato).toFixed(2));
      const isOverFido = fidoUtilizzato > fidoConcesso;
      const overFidoAmount = isOverFido
        ? Number((fidoUtilizzato - fidoConcesso).toFixed(2))
        : 0;
      const usagePct = fidoConcesso > 0 ? Math.round((fidoUtilizzato / fidoConcesso) * 100) : 0;

      return {
        clientId: u.id,
        companyName:
          u.companyName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.username,
        zucchettiCode: u.zucchettiCode || '',
        vatNumber: u.vatNumber || '',
        fidoConcesso,
        fidoUtilizzato,
        fidoDisponibile,
        isOverFido,
        overFidoAmount,
        usagePct,
        fidoPaymentLabel,
        dueSchedule,
        unpaidOrdersCount: ordersForSchedule.filter((o) => !o.isPaid).length,
      };
    });

    return (
      <ScadenziarioClient
        mode="AGENT"
        clients={mappedClients}
        initialClientId={searchParams?.client || ''}
      />
    );
  }

  // =========================================================================
  // MODALITÀ CLIENTE: Accessibile SOLO se il Fido è attivo (altrimenti redirect)
  // =========================================================================
  const dbUser = await prisma.b2BUser.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      fidoEnabled: true,
      fido: true,
      fidoPaymentType: true,
    },
  });

  const fidoEnabled = Boolean(dbUser?.fidoEnabled);
  const fidoConcesso = fidoEnabled ? Number(dbUser?.fido || 0) : 0;

  if (!dbUser || dbUser.role !== 'USER' || !fidoEnabled || fidoConcesso <= 0) {
    redirect('/account');
  }

  const effectivePaymentType = dbUser.fidoPaymentType || '30GG';
  const fidoPaymentLabel = formatFidoPaymentType(effectivePaymentType);

  const dbOrders = await prisma.b2BOrder.findMany({
    where: {
      userId: dbUser.id,
      status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      storeMode: true,
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

  let remainingTotal = 0;
  const ordersRows: ClientOrderScheduleRow[] = dbOrders.map((o) => {
    const totalGross =
      Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
    const movSum = (o.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
    const paidAmount = o.isPaid
      ? totalGross
      : Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
    const remainingAmount = o.isPaid
      ? 0
      : Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);
    const isEffectivelyPaid = Boolean(o.isPaid) || remainingAmount <= 0.009;

    if (!isEffectivelyPaid) {
      remainingTotal += remainingAmount;
    }

    const installments = computeOrderInstallments(
      o.createdAt,
      totalGross,
      paidAmount,
      isEffectivelyPaid,
      effectivePaymentType
    );

    return {
      id: o.id,
      shortOrderId: o.id.slice(-6).toUpperCase(),
      createdAtFormatted: getRomeYMD(o.createdAt).formatted,
      storeMode: o.storeMode,
      zucchettiOrderRef: o.zucchettiOrderRef,
      totalGross,
      paidAmount,
      remainingAmount,
      isPaid: isEffectivelyPaid,
      installments,
    };
  });

  const dueSchedule = buildGroupedDueDateSchedule(
    ordersRows.map((r, i) => ({
      id: r.id,
      createdAt: dbOrders[i].createdAt,
      zucchettiOrderRef: r.zucchettiOrderRef,
      isPaid: r.isPaid,
      installments: r.installments,
    }))
  );

  const fidoUtilizzato = Math.max(0, Number(remainingTotal.toFixed(2)));
  const fidoDisponibile = Number(Math.max(0, fidoConcesso - fidoUtilizzato).toFixed(2));
  const isOverFido = fidoUtilizzato > fidoConcesso;
  const overFidoAmount = isOverFido
    ? Number((fidoUtilizzato - fidoConcesso).toFixed(2))
    : 0;

  return (
    <ScadenziarioClient
      mode="USER"
      fidoConcesso={fidoConcesso}
      fidoUtilizzato={fidoUtilizzato}
      fidoDisponibile={fidoDisponibile}
      isOverFido={isOverFido}
      overFidoAmount={overFidoAmount}
      fidoPaymentLabel={fidoPaymentLabel}
      dueSchedule={dueSchedule}
      orders={ordersRows}
    />
  );
}
