import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { prisma } from '@archelia/database';
import { zucchettiClient } from '@archelia/zucchetti';
import * as bcrypt from 'bcryptjs';

import { authenticate } from '../auth.js';
import { log } from '@archelia/core';

interface OrderInstallment {
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

interface GroupedDueDateItem {
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

function getRomeYMD(input: Date | string) {
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

function computeOrderInstallments(
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

function buildGroupedDueDateSchedule(
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
        installmentLabel: inst.totalInstallments > 1 ? `Rata ${inst.installmentNumber}/${inst.totalInstallments}` : 'Saldo ordine',
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

export async function adminB2BUsersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  async function computeUserFidoDetails(userId: string) {
    const user = await b2bPrisma.b2BUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fidoEnabled: true,
        fido: true,
        fidoPaymentType: true,
        orders: {
          where: { status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            storeMode: true,
            zucchettiOrderRef: true,
            totalAmount: true,
            totalIva: true,
            paidAmount: true,
            isPaid: true,
            paidAt: true,
            fidoMovements: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                orderId: true,
                amount: true,
                note: true,
                createdAt: true,
              },
            },
          },
        },
        fidoMovements: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderId: true,
            amount: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) return null;

    const fidoEnabled = Boolean(user.fidoEnabled);
    const fidoConcesso = Math.round((Number(user.fido) || 0) * 100) / 100;
    const fidoPaymentType = user.fidoPaymentType || (fidoEnabled ? '30GG' : '');

    const mappedOrders = user.orders.map((o) => {
      const totalGross = Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
      const movSum = (o.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
      const paidAmount = o.isPaid
        ? totalGross
        : Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
      const remainingGross = o.isPaid
        ? 0
        : Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);
      const installments = computeOrderInstallments(
        o.createdAt,
        totalGross,
        paidAmount,
        o.isPaid,
        fidoPaymentType || '30GG'
      );

      return {
        ...o,
        totalGross,
        paidAmount,
        remainingGross,
        installments,
        movements: o.fidoMovements || [],
      };
    });

    const dueSchedule = buildGroupedDueDateSchedule(mappedOrders);

    const unpaidOrdersGross = mappedOrders
      .filter((o) => !o.isPaid)
      .reduce((sum, o) => sum + o.totalGross, 0);
    const partialPaymentsTotal = mappedOrders
      .filter((o) => !o.isPaid)
      .reduce((sum, o) => sum + o.paidAmount, 0);
    const fidoUtilizzato = Math.max(
      0,
      Math.round(
        mappedOrders.filter((o) => !o.isPaid).reduce((sum, o) => sum + o.remainingGross, 0) * 100
      ) / 100
    );

    const effectiveFido = fidoEnabled ? fidoConcesso : 0;
    const rawAvailable = effectiveFido - fidoUtilizzato;
    const fidoDisponibile = fidoEnabled ? Math.max(0, Math.round(rawAvailable * 100) / 100) : 0;
    const isOverFido = fidoEnabled && effectiveFido > 0 && rawAvailable < 0;
    const overFidoAmount = isOverFido ? Math.round(Math.abs(rawAvailable) * 100) / 100 : 0;
    const usagePct =
      fidoEnabled && effectiveFido > 0
        ? Math.min(100, Math.round((fidoUtilizzato / effectiveFido) * 100))
        : 0;

    return {
      fidoSummary: {
        fidoEnabled,
        fidoConcesso,
        fidoPaymentType,
        fidoUtilizzato,
        fidoDisponibile,
        unpaidOrdersGross: Math.round(unpaidOrdersGross * 100) / 100,
        manualPaymentsTotal: Math.round(partialPaymentsTotal * 100) / 100,
        isOverFido,
        overFidoAmount,
        usagePct,
        nextDueDate: dueSchedule.length > 0 ? dueSchedule[0] : null,
      },
      dueSchedule,
      orders: mappedOrders,
      movements: user.fidoMovements,
    };
  }

  // --- Recupera le categorie di sconto Elmark dalla tabella dei prodotti processati ---
  app.get('/b2b-users/elmark-groups', async (request, reply) => {
    try {
      const groups = await prisma.$queryRaw`SELECT DISTINCT discgroup as id FROM elmark_processed_products WHERE discgroup IS NOT NULL AND discgroup != '' ORDER BY id`;
      return reply.send({ success: true, groups });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ success: false, error: 'Database error' });
    }
  });

  // Helper hook if auth is required
  app.addHook('onRequest', authenticate);

  // GET /api/admin/b2b-users/check-username
  app.get('/b2b-users/check-username', async (request) => {
    const query = request.query as any;
    const u = query.u;
    if (!u) return { available: false };
    
    try {
      const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: u } });
      return { available: !exists };
    } catch (e) {
      log.error('Errore check-username', e);
      return { available: true }; // fallback on error to not block
    }
  });

  // GET /api/admin/b2b-users/check-zucchetti
  app.get('/b2b-users/check-zucchetti', async (request) => {
    const query = request.query as any;
    const code = query.code;
    if (!code) return { exists: false };
    
    try {
      const exists = await b2bPrisma.b2BUser.findFirst({ where: { zucchettiCode: code } });
      return { exists: !!exists, userId: exists?.id };
    } catch(e) {
      log.error('Errore check-zucchetti', e);
      return { exists: false };
    }
  });

  // POST /api/admin/b2b-users/:id/reset-password
  app.post('/b2b-users/:id/reset-password', {
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    // Genera password casuale da 8 caratteri
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    try {
       const user = await b2bPrisma.b2BUser.update({
         where: { id },
         data: {
            passwordHash,
            tempPassword,
            mustChangePassword: true
         }
       });
       return { success: true, tempPassword };
    } catch(e) {
       return reply.code(400).send({ error: 'Utente non trovato' });
    }
  });

  // GET /api/admin/b2b-users
  app.get('/b2b-users', {
    schema: {
      querystring: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
        search: z.string().optional(),
        role: z.string().optional(),
      })
    }
  }, async (request) => {
    const { page, limit, search, role } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let where: any = {};
    if (search) {
      where = {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { vatNumber: { contains: search, mode: 'insensitive' } },
          { zucchettiCode: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    if (role && role !== 'ALL') {
      where.role = role;
    }

    const [rawUsers, total] = await Promise.all([
      b2bPrisma.b2BUser.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          agent: true,
          orders: {
            where: { status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] }, isPaid: false },
            select: {
              id: true,
              createdAt: true,
              zucchettiOrderRef: true,
              isPaid: true,
              totalAmount: true,
              totalIva: true,
              paidAmount: true,
              fidoMovements: { select: { amount: true } }
            }
          },
          fidoMovements: {
            select: { amount: true, orderId: true }
          }
        }
      }),
      b2bPrisma.b2BUser.count({ where })
    ]);

    const users = rawUsers.map((u: any) => {
      const fidoEnabled = Boolean(u.fidoEnabled);
      const fidoConcesso = Math.round((Number(u.fido) || 0) * 100) / 100;
      const fidoPaymentType = u.fidoPaymentType || (fidoEnabled ? '30GG' : '');

      let unpaidOrdersGross = 0;
      let partialPaymentsTotal = 0;
      let remainingOrdersTotal = 0;
      const ordersForSchedule: Array<{
        id: string;
        createdAt: Date | string;
        zucchettiOrderRef?: string | null;
        isPaid: boolean;
        installments: OrderInstallment[];
      }> = [];

      for (const o of u.orders || []) {
        const totalGross = Math.round(((Number(o.totalAmount) || 0) + (Number(o.totalIva) || 0)) * 100) / 100;
        const movSum = (o.fidoMovements || []).reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
        const rawPaid = Math.max(Number(o.paidAmount) || 0, movSum);
        const paidAmount = Math.min(totalGross, Math.max(0, Math.round(rawPaid * 100) / 100));
        const rem = Math.max(0, Math.round((totalGross - paidAmount) * 100) / 100);

        unpaidOrdersGross += totalGross;
        partialPaymentsTotal += paidAmount;
        remainingOrdersTotal += rem;

        if (fidoEnabled && rem > 0) {
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
              fidoPaymentType || '30GG'
            ),
          });
        }
      }

      const schedule = fidoEnabled ? buildGroupedDueDateSchedule(ordersForSchedule) : [];
      const nextDueDate = schedule.length > 0 ? schedule[0] : null;

      const fidoUtilizzato = Math.max(0, Math.round(remainingOrdersTotal * 100) / 100);
      const effectiveFido = fidoEnabled ? fidoConcesso : 0;
      const rawAvailable = effectiveFido - fidoUtilizzato;
      const fidoDisponibile = fidoEnabled ? Math.max(0, Math.round(rawAvailable * 100) / 100) : 0;
      const isOverFido = fidoEnabled && effectiveFido > 0 && rawAvailable < 0;
      const overFidoAmount = isOverFido ? Math.round(Math.abs(rawAvailable) * 100) / 100 : 0;
      const usagePct =
        fidoEnabled && effectiveFido > 0
          ? Math.min(100, Math.round((fidoUtilizzato / effectiveFido) * 100))
          : 0;

      const { orders, fidoMovements, ...rest } = u;
      return {
        ...rest,
        fidoSummary: {
          fidoEnabled,
          fidoConcesso,
          fidoPaymentType,
          fidoUtilizzato,
          fidoDisponibile,
          unpaidOrdersGross: Math.round(unpaidOrdersGross * 100) / 100,
          manualPaymentsTotal: Math.round(partialPaymentsTotal * 100) / 100,
          isOverFido,
          overFidoAmount,
          usagePct,
          nextDueDate,
        },
      };
    });

    return { users, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // GET /api/admin/b2b-users/:id/fido-details
  app.get('/b2b-users/:id/fido-details', {
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const details = await computeUserFidoDetails(id);
    if (!details) return reply.code(404).send({ error: 'Utente non trovato' });
    return details;
  });

  // POST /api/admin/b2b-users/:id/fido-settings
  app.post('/b2b-users/:id/fido-settings', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        fidoEnabled: z.boolean(),
        fido: z.number(),
        fidoPaymentType: z.string().nullable().optional(),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { fidoEnabled, fido, fidoPaymentType } = request.body;

    try {
      const user = await b2bPrisma.b2BUser.update({
        where: { id },
        data: {
          fidoEnabled,
          fido: Math.max(0, Math.round((Number(fido) || 0) * 100) / 100),
          fidoPaymentType: fidoPaymentType || null,
        }
      });
      const details = await computeUserFidoDetails(id);
      return { success: true, user, ...details };
    } catch (e) {
      return reply.code(400).send({ error: 'Errore salvataggio configurazione fido' });
    }
  });

  // POST /api/admin/b2b-users/:id/pay-due-date
  // Registra in un solo click il saldo di tutti gli ordini/rate che scadono nella data indicata (es. Fine Mese)
  app.post('/b2b-users/:id/pay-due-date', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        dueDateIso: z.string(),
        note: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { dueDateIso, note } = request.body;

    const user = await b2bPrisma.b2BUser.findUnique({
      where: { id },
      select: {
        id: true,
        fidoPaymentType: true,
        orders: {
          where: { status: { in: ['APPROVED', 'SENT_TO_ZUCCHETTI'] }, isPaid: false },
          include: { fidoMovements: true },
        },
      },
    });

    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });

    const effectivePaymentType = user.fidoPaymentType || '30GG';
    let settledCount = 0;

    for (const order of user.orders) {
      const totalGross = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
      const prevMovSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      const basePaid = Math.min(totalGross, Math.max(0, Math.round(Math.max(Number(order.paidAmount) || 0, prevMovSum) * 100) / 100));

      const installments = computeOrderInstallments(
        order.createdAt,
        totalGross,
        basePaid,
        order.isPaid,
        effectivePaymentType
      );

      const matchingAmount = installments
        .filter((inst) => inst.dueDateIso === dueDateIso && !inst.isPaid && inst.remainingAmount > 0)
        .reduce((sum, inst) => sum + inst.remainingAmount, 0);

      const cleanAdd = Math.round(matchingAmount * 100) / 100;
      if (cleanAdd <= 0) continue;

      const dueFormatted =
        installments.find((inst) => inst.dueDateIso === dueDateIso)?.dueDateFormatted || dueDateIso;

      await b2bPrisma.b2BFidoMovement.create({
        data: {
          userId: id,
          orderId: order.id,
          amount: cleanAdd,
          note: note?.trim() || `Saldo scadenza ${dueFormatted}`,
        },
      });

      const newPaid = Math.min(totalGross, Math.round((basePaid + cleanAdd) * 100) / 100);
      const nowFullyPaid = totalGross > 0 && newPaid >= totalGross - 0.009;

      await b2bPrisma.b2BOrder.update({
        where: { id: order.id },
        data: {
          paidAmount: nowFullyPaid ? totalGross : newPaid,
          isPaid: nowFullyPaid,
          paidAt: nowFullyPaid ? new Date() : null,
        },
      });

      settledCount++;
    }

    if (settledCount === 0) {
      return reply.code(400).send({ error: 'Nessun importo residuo trovato per questa scadenza' });
    }

    const details = await computeUserFidoDetails(id);
    return { success: true, settledCount, ...details };
  });

  // POST /api/admin/b2b-users/:id/orders/:orderId/toggle-paid
  app.post('/b2b-users/:id/orders/:orderId/toggle-paid', {
    schema: {
      params: z.object({ id: z.string(), orderId: z.string() })
    }
  }, async (request, reply) => {
    const { id, orderId } = request.params;
    const order = await b2bPrisma.b2BOrder.findFirst({
      where: { id: orderId, userId: id },
      include: { fidoMovements: true }
    });
    if (!order) return reply.code(404).send({ error: 'Ordine non trovato' });

    const totalGross = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
    const nextPaid = !order.isPaid;

    let nextPaidAmount = 0;
    if (nextPaid) {
      nextPaidAmount = totalGross;
    } else {
      const movSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      nextPaidAmount = movSum < totalGross ? Math.round(movSum * 100) / 100 : 0;
    }

    await b2bPrisma.b2BOrder.update({
      where: { id: orderId },
      data: {
        isPaid: nextPaid,
        paidAt: nextPaid ? new Date() : null,
        paidAmount: nextPaidAmount,
      }
    });

    const details = await computeUserFidoDetails(id);
    return { success: true, ...details };
  });

  // POST /api/admin/b2b-users/:id/orders/:orderId/partial-payment
  app.post('/b2b-users/:id/orders/:orderId/partial-payment', {
    schema: {
      params: z.object({ id: z.string(), orderId: z.string() }),
      body: z.object({
        amount: z.number(),
        note: z.string().optional(),
      })
    }
  }, async (request, reply) => {
    const { id, orderId } = request.params;
    const { amount, note } = request.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return reply.code(400).send({ error: 'Inserisci un importo parziale maggiore di 0 €' });
    }

    const order = await b2bPrisma.b2BOrder.findFirst({
      where: { id: orderId, userId: id },
      include: { fidoMovements: true }
    });
    if (!order) return reply.code(404).send({ error: 'Ordine non trovato' });

    const totalGross = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
    const cleanAmount = Math.round(amount * 100) / 100;

    await b2bPrisma.b2BFidoMovement.create({
      data: {
        userId: id,
        orderId,
        amount: cleanAmount,
        note: note?.trim() || null,
      }
    });

    const prevMovSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const basePaid = Math.max(Number(order.paidAmount) || 0, prevMovSum);
    const newPaid = Math.min(totalGross, Math.round((basePaid + cleanAmount) * 100) / 100);
    const nowFullyPaid = totalGross > 0 && newPaid >= totalGross - 0.009;

    await b2bPrisma.b2BOrder.update({
      where: { id: orderId },
      data: {
        paidAmount: nowFullyPaid ? totalGross : newPaid,
        isPaid: nowFullyPaid,
        paidAt: nowFullyPaid ? new Date() : null,
      }
    });

    const details = await computeUserFidoDetails(id);
    return { success: true, ...details };
  });

  // POST /api/admin/b2b-users/:id/fido-movements
  app.post('/b2b-users/:id/fido-movements', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        orderId: z.string().optional(),
        amount: z.number(),
        note: z.string().optional(),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { orderId, amount, note } = request.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return reply.code(400).send({ error: 'Importo non valido' });
    }

    const cleanAmount = Math.round(amount * 100) / 100;

    await b2bPrisma.b2BFidoMovement.create({
      data: {
        userId: id,
        orderId: orderId || null,
        amount: cleanAmount,
        note: note?.trim() || null,
      }
    });

    if (orderId) {
      const order = await b2bPrisma.b2BOrder.findFirst({
        where: { id: orderId, userId: id },
        include: { fidoMovements: true }
      });
      if (order) {
        const totalGross = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
        const movSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
        const newPaid = Math.min(totalGross, Math.round(movSum * 100) / 100);
        const nowFullyPaid = totalGross > 0 && newPaid >= totalGross - 0.009;
        await b2bPrisma.b2BOrder.update({
          where: { id: orderId },
          data: {
            paidAmount: nowFullyPaid ? totalGross : newPaid,
            isPaid: nowFullyPaid,
            paidAt: nowFullyPaid ? new Date() : null,
          }
        });
      }
    }

    const details = await computeUserFidoDetails(id);
    return { success: true, ...details };
  });

  // DELETE /api/admin/b2b-users/:id/fido-movements/:movementId
  app.delete('/b2b-users/:id/fido-movements/:movementId', {
    schema: {
      params: z.object({ id: z.string(), movementId: z.string() })
    }
  }, async (request) => {
    const { id, movementId } = request.params;
    const mov = await b2bPrisma.b2BFidoMovement.findFirst({
      where: { id: movementId, userId: id }
    });

    await b2bPrisma.b2BFidoMovement.deleteMany({
      where: { id: movementId, userId: id }
    });

    if (mov?.orderId) {
      const order = await b2bPrisma.b2BOrder.findFirst({
        where: { id: mov.orderId, userId: id },
        include: { fidoMovements: true }
      });
      if (order) {
        const totalGross = Math.round(((Number(order.totalAmount) || 0) + (Number(order.totalIva) || 0)) * 100) / 100;
        const movSum = (order.fidoMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
        const newPaid = Math.min(totalGross, Math.max(0, Math.round(movSum * 100) / 100));
        const nowFullyPaid = totalGross > 0 && newPaid >= totalGross - 0.009;
        await b2bPrisma.b2BOrder.update({
          where: { id: order.id },
          data: {
            paidAmount: nowFullyPaid ? totalGross : newPaid,
            isPaid: nowFullyPaid,
            paidAt: nowFullyPaid ? order.paidAt || new Date() : null,
          }
        });
      }
    }

    const details = await computeUserFidoDetails(id);
    return { success: true, ...details };
  });

  // POST /api/admin/b2b-users
  app.post('/b2b-users', {
    schema: {
      body: z.object({
        username: z.string().min(3),
        email: z.string().email().optional().or(z.literal('')),
        password: z.string().min(6),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        vatNumber: z.string().optional(),
        zucchettiCode: z.string().optional(),
        role: z.enum(['USER', 'AGENT', 'ADMIN']),
        agentId: z.string().optional(),
        zucchettiPriceList: z.string().optional(),
        customerType: z.string().optional(),
        fidoEnabled: z.boolean().optional().default(false),
        fido: z.number().optional(),
        fidoPaymentType: z.string().nullable().optional(),
        discount: z.number().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        zip: z.string().optional(),
        province: z.string().optional(),
        phone: z.string().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Controlla se esiste
    const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: data.username } });
    if (exists) {
      return reply.code(400).send({ error: 'Username già in uso' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...userData } = data;
    
    if (!userData.email) delete userData.email;

    const user = await b2bPrisma.b2BUser.create({
      data: {
        ...userData,
        passwordHash,
        tempPassword: data.password,
        mustChangePassword: true
      }
    });
    
    return { success: true, user };
  });

  // PUT /api/admin/b2b-users/:id
  app.put('/b2b-users/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        username: z.string().min(3),
        email: z.string().email().optional().or(z.literal('')),
        password: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        vatNumber: z.string().optional(),
        zucchettiCode: z.string().optional(),
        role: z.enum(['USER', 'AGENT', 'ADMIN']),
        agentId: z.string().optional(),
        zucchettiPriceList: z.string().optional(),
        customerType: z.string().optional(),
        fidoEnabled: z.boolean().optional(),
        fido: z.number().optional(),
        fidoPaymentType: z.string().nullable().optional(),
        discount: z.number().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        zip: z.string().optional(),
        province: z.string().optional(),
        phone: z.string().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    
    if (data.username) {
      const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: data.username } });
      if (exists && exists.id !== id) {
        return reply.code(400).send({ error: 'Username già in uso' });
      }
    }

    const updateData: any = { ...data };
    if (!updateData.email) updateData.email = null;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      updateData.tempPassword = data.password;
      updateData.mustChangePassword = true;
    }
    delete updateData.password;
    try {
      const user = await b2bPrisma.b2BUser.update({
        where: { id },
        data: updateData
      });
      return { success: true, user };
    } catch (e) {
      return reply.code(400).send({ error: 'Utente non trovato o errore database' });
    }
  });

  // DELETE /api/admin/b2b-users/:id
  app.delete('/b2b-users/:id', async (request) => {
    const { id } = request.params as { id: string };
    await b2bPrisma.b2BUser.delete({ where: { id } });
    return { success: true };
  });

  // GET /api/admin/zucchetti/customers/search
  app.get('/zucchetti/customers/search', {
    schema: {
      querystring: z.object({ q: z.string(), type: z.string().optional() })
    }
  }, async (request, reply) => {
    const { q, type } = request.query;
    if (!q || q.length < 3) return { results: [] };
    
    try {
      if (type === 'AGENT') {
        const rawRes: any = await zucchettiClient.query('zzna_agenti', { limit: '1000', offset: '0' }, 'A0002');
        let agents = [];
        if (rawRes && rawRes.data) agents = rawRes.data;
        else if (rawRes && rawRes.dataset) agents = rawRes.dataset;
        else if (rawRes && Array.isArray(rawRes)) agents = rawRes;
        else if (rawRes && rawRes.zzna_agenti) agents = Array.isArray(rawRes.zzna_agenti) ? rawRes.zzna_agenti : [rawRes.zzna_agenti];

        const lowerQ = q.toLowerCase();
        const filtered = agents.filter((a: any) => {
           const name = (a.agdesage || '').toLowerCase();
           const code = (a.agcodage || '').toLowerCase();
           return name.includes(lowerQ) || code.includes(lowerQ);
        });

        const mapped = filtered.map((a: any) => ({
           zucchettiCode: a.agcodage || '',
           companyName: a.agdesage || '',
           vatNumber: '',
           fido: 0,
           zucchettiPriceList: '',
           customerType: 'AGENTE',
           discount: 0,
           address: a.agindage || '',
           city: a.agcitage || '',
           zip: a.agagecap || '',
           province: a.agproage || '',
           phone: a.agtelefo || '',
           email: a.ag_email || ''
        }));
        
        return { results: mapped };
      }

      if (type === 'ADMIN') {
        const rawRes: any = await zucchettiClient.query('zzna_persone', { limit: '1000', offset: '0' }, 'A0002');
        let persons = [];
        if (rawRes && rawRes.data) persons = rawRes.data;
        else if (rawRes && rawRes.dataset) persons = rawRes.dataset;
        else if (rawRes && Array.isArray(rawRes)) persons = rawRes;
        else if (rawRes && rawRes.zzna_persone) persons = Array.isArray(rawRes.zzna_persone) ? rawRes.zzna_persone : [rawRes.zzna_persone];

        const lowerQ = q.toLowerCase();
        const filtered = persons.filter((p: any) => {
           const name = (p.cotitle || '').toLowerCase();
           const code = (p.cocompanyid || '').toLowerCase();
           return name.includes(lowerQ) || code.includes(lowerQ);
        });

        const mapped = filtered.map((p: any) => ({
           zucchettiCode: p.cocompanyid || '',
           companyName: p.cotitle || '',
           vatNumber: p.coiva || p.cofiscalcode || '',
           fido: 0,
           zucchettiPriceList: '',
           customerType: 'PERSONA',
           discount: 0,
           address: '',
           city: '',
           zip: '',
           province: '',
           phone: '',
           email: ''
        }));
        
        return { results: mapped };
      }

      // Fetch discounts from Zucchetti
      let discountsMap: Record<string, string> = {};
      try {
        const scontiRes: any = await zucchettiClient.query('zzna_cat_scont', { limit: '1000', offset: '0' }, 'A0002');
        if (scontiRes && scontiRes.data) {
           scontiRes.data.forEach((d: any) => {
              const cat = (d.tscatcli || '').toLowerCase();
              if (cat) discountsMap[cat] = d.tsscont1 || '0.00';
           });
        }
      } catch (e) {
        log.error('Errore nel fetch degli sconti da Zucchetti', e);
      }

      // Fetch customers
      const rawRes: any = await zucchettiClient.query('zzna_clienti', { limit: '100000', offset: '0' }, 'A0002');
      
      let customers = [];
      if (rawRes && rawRes.data) {
        customers = rawRes.data;
      } else if (rawRes && rawRes.dataset) {
        customers = rawRes.dataset;
      } else if (rawRes && Array.isArray(rawRes)) {
        customers = rawRes;
      } else if (rawRes && rawRes.zzna_clienti) {
        customers = Array.isArray(rawRes.zzna_clienti) ? rawRes.zzna_clienti : [rawRes.zzna_clienti];
      }

      const lowerQ = q.toLowerCase();
      const filtered = customers.filter((c: any) => {
         const name = (c.andescri || c.Andescri || '').toLowerCase();
         const code = (c.ancodice || c.Ancodice || '').toLowerCase();
         const vat = (c.anpariva || c.Anpariva || '').toLowerCase();
         return name.includes(lowerQ) || code.includes(lowerQ) || vat.includes(lowerQ);
      });

      const mapped = filtered.map((c: any) => {
         const typeCode = (c.ancatscm || c.Ancatscm || '').toLowerCase();
         let typeDesc = typeCode.toUpperCase();
         if (typeCode === 'riv') typeDesc = 'Rivenditore';
         else if (typeCode === 'ist') typeDesc = 'Installatore';
         else if (typeCode === 'gen') typeDesc = 'Generale';
         
         const baseDiscount = discountsMap[typeCode] ? Math.abs(parseFloat(discountsMap[typeCode])) : 0;

         return {
           zucchettiCode: c.ancodice || c.Ancodice || '',
           companyName: c.andescri || c.Andescri || '',
           vatNumber: c.anpariva || c.Anpariva || '',
           fido: 0, // Il Fido è gestito internamente da Archelia OS e non viene importato da Zucchetti
           zucchettiPriceList: '',
           customerType: typeDesc,
           discount: baseDiscount,
           address: c.anindiri || c.Anindiri || '',
           city: c.anlocali || c.Anlocali || '',
           zip: c.an___cap || c.An___cap || '',
           province: c.anprovin || c.Anprovin || '',
           phone: c.antelefo || c.Antelefo || '',
           email: c.an_email || c.An_email || '',
           zucchettiAgentCode: c.ancodag1 || c.Ancodag1 || ''
         };
      });

      // Se non trova niente nella cache di Zucchetti (es. per il limite dei 100), diamo un piccolo mock per far provare la UI all'utente se la query corrisponde
      if (mapped.length === 0) {
        const mockResults = [
          { zucchettiCode: 'C0001', companyName: 'Mock Ferramenta Srl', vatNumber: '01234567890', fido: 5000, zucchettiPriceList: 'L01', customerType: 'RIV' },
          { zucchettiCode: 'C0002', companyName: 'Mock Installatore Mario', vatNumber: '09876543210', fido: 1000, zucchettiPriceList: 'L02', customerType: 'INS' }
        ].filter(c => c.companyName.toLowerCase().includes(lowerQ) || c.vatNumber.includes(q));
        if (mockResults.length > 0) return { results: mockResults };
      }

      return { results: mapped.slice(0, 20) };
    } catch (error: any) {
      if (error.message.includes('404')) {
         return {
           results: [
             { zucchettiCode: 'C0001', companyName: 'Mock Ferramenta Srl', vatNumber: '01234567890', fido: 5000, zucchettiPriceList: 'L01', customerType: 'RIV' },
             { zucchettiCode: 'C0002', companyName: 'Mock Installatore Mario', vatNumber: '09876543210', fido: 1000, zucchettiPriceList: 'L02', customerType: 'INS' }
           ].filter(c => c.companyName.toLowerCase().includes(q.toLowerCase()) || c.vatNumber.includes(q))
         };
      }
      return reply.code(500).send({ error: 'Errore Zucchetti SDK: ' + error.message });
    }
  });
}
