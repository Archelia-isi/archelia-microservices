export interface OrderInstallment {
  installmentNumber: number;
  totalInstallments: number;
  label: string;
  dueDateIso: string;
  dueDateFormatted: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface GroupedDueDateItem {
  dueDateIso: string;
  dueDateFormatted: string;
  totalAmount: number;
  ordersCount: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  orders: Array<{
    orderId: string;
    shortOrderId: string;
    orderDateFormatted: string;
    zucchettiOrderRef?: string | null;
    installmentLabel: string;
    amount: number;
  }>;
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

const PAYMENT_STEPS: Record<string, Array<{ mode: 'DAYS' | 'FM'; offset: number; shortLabel: string }>> = {
  '30GG': [{ mode: 'DAYS', offset: 30, shortLabel: '30 gg' }],
  '60GG': [{ mode: 'DAYS', offset: 60, shortLabel: '60 gg' }],
  '90GG': [{ mode: 'DAYS', offset: 90, shortLabel: '90 gg' }],
  '30_60GG': [
    { mode: 'DAYS', offset: 30, shortLabel: '30 gg' },
    { mode: 'DAYS', offset: 60, shortLabel: '60 gg' },
  ],
  '30_60_90GG': [
    { mode: 'DAYS', offset: 30, shortLabel: '30 gg' },
    { mode: 'DAYS', offset: 60, shortLabel: '60 gg' },
    { mode: 'DAYS', offset: 90, shortLabel: '90 gg' },
  ],
  '30GG_FM': [{ mode: 'FM', offset: 1, shortLabel: '30 gg FM' }],
  '60GG_FM': [{ mode: 'FM', offset: 2, shortLabel: '60 gg FM' }],
  '90GG_FM': [{ mode: 'FM', offset: 3, shortLabel: '90 gg FM' }],
  '30_60GG_FM': [
    { mode: 'FM', offset: 1, shortLabel: '30 gg FM' },
    { mode: 'FM', offset: 2, shortLabel: '60 gg FM' },
  ],
  '30_60_90GG_FM': [
    { mode: 'FM', offset: 1, shortLabel: '30 gg FM' },
    { mode: 'FM', offset: 2, shortLabel: '60 gg FM' },
    { mode: 'FM', offset: 3, shortLabel: '90 gg FM' },
  ],
};

export function formatFidoPaymentType(code?: string | null): string {
  if (!code) return '';
  return PAYMENT_TYPE_LABELS[code] || code;
}

export function getRomeYMD(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value || d.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value || d.getUTCMonth() + 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value || d.getUTCDate());
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    year,
    month,
    day,
    iso: `${year}-${mm}-${dd}`,
    formatted: `${dd}/${mm}/${year}`,
  };
}

export function computeOrderInstallments(
  createdAt: Date | string,
  totalGross: number,
  paidAmount: number,
  isPaid: boolean,
  paymentType?: string | null
): OrderInstallment[] {
  const steps = PAYMENT_STEPS[paymentType || '30GG'] || PAYMENT_STEPS['30GG'];
  const n = steps.length;
  const { year, month, day } = getRomeYMD(createdAt);
  const today = getRomeYMD(new Date());
  const todayUtcMs = Date.UTC(today.year, today.month - 1, today.day);

  const totalCents = Math.max(0, Math.round((Number(totalGross) || 0) * 100));
  const paidCents = isPaid
    ? totalCents
    : Math.min(totalCents, Math.max(0, Math.round((Number(paidAmount) || 0) * 100)));

  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;
  let remainingPaidCents = paidCents;

  return steps.map((step, idx) => {
    const target =
      step.mode === 'FM'
        ? new Date(Date.UTC(year, month + step.offset, 0))
        : new Date(Date.UTC(year, month - 1, day + step.offset));
    const ty = target.getUTCFullYear();
    const tm = String(target.getUTCMonth() + 1).padStart(2, '0');
    const td = String(target.getUTCDate()).padStart(2, '0');
    const dueDateIso = `${ty}-${tm}-${td}`;
    const dueDateFormatted = `${td}/${tm}/${ty}`;

    const origCents = idx === n - 1 ? baseCents + remainderCents : baseCents;
    const coveredCents = Math.min(origCents, remainingPaidCents);
    remainingPaidCents -= coveredCents;
    const remCents = Math.max(0, origCents - coveredCents);
    const instPaid = remCents === 0;

    const targetUtcMs = Date.UTC(ty, target.getUTCMonth(), target.getUTCDate());
    const diffDays = Math.round((targetUtcMs - todayUtcMs) / 86400000);

    return {
      installmentNumber: idx + 1,
      totalInstallments: n,
      label: n > 1 ? `Rata ${idx + 1}/${n} (${step.shortLabel})` : step.shortLabel,
      dueDateIso,
      dueDateFormatted,
      originalAmount: origCents / 100,
      paidAmount: coveredCents / 100,
      remainingAmount: remCents / 100,
      isPaid: instPaid,
      isOverdue: !instPaid && diffDays < 0,
      isDueSoon: !instPaid && diffDays >= 0 && diffDays <= 7,
    };
  });
}

export function buildGroupedDueDateSchedule(
  orders: Array<{
    id: string;
    createdAt: Date | string;
    zucchettiOrderRef?: string | null;
    isPaid: boolean;
    installments: OrderInstallment[];
  }>
): GroupedDueDateItem[] {
  const map = new Map<
    string,
    {
      dueDateIso: string;
      dueDateFormatted: string;
      totalCents: number;
      orderIds: Set<string>;
      isOverdue: boolean;
      isDueSoon: boolean;
      orders: GroupedDueDateItem['orders'];
    }
  >();

  for (const ord of orders) {
    if (ord.isPaid) continue;
    const ordDateFormatted = getRomeYMD(ord.createdAt).formatted;
    const shortOrderId = ord.id.slice(-6).toUpperCase();

    for (const inst of ord.installments || []) {
      const remCents = Math.round((inst.remainingAmount || 0) * 100);
      if (inst.isPaid || remCents <= 0) continue;

      let group = map.get(inst.dueDateIso);
      if (!group) {
        group = {
          dueDateIso: inst.dueDateIso,
          dueDateFormatted: inst.dueDateFormatted,
          totalCents: 0,
          orderIds: new Set<string>(),
          isOverdue: inst.isOverdue,
          isDueSoon: inst.isDueSoon,
          orders: [],
        };
        map.set(inst.dueDateIso, group);
      }

      group.totalCents += remCents;
      group.orderIds.add(ord.id);
      if (inst.isOverdue) group.isOverdue = true;
      if (inst.isDueSoon) group.isDueSoon = true;
      group.orders.push({
        orderId: ord.id,
        shortOrderId,
        orderDateFormatted: ordDateFormatted,
        zucchettiOrderRef: ord.zucchettiOrderRef || null,
        installmentLabel:
          inst.totalInstallments > 1
            ? `Rata ${inst.installmentNumber}/${inst.totalInstallments}`
            : 'Saldo ordine',
        amount: remCents / 100,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso))
    .map((g) => ({
      dueDateIso: g.dueDateIso,
      dueDateFormatted: g.dueDateFormatted,
      totalAmount: g.totalCents / 100,
      ordersCount: g.orderIds.size,
      isOverdue: g.isOverdue,
      isDueSoon: g.isDueSoon,
      orders: g.orders,
    }));
}
