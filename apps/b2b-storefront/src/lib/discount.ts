import { verifySession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function getEffectiveDiscount() {
  const session = await verifySession();
  if (!session) return 0;

  let baseDiscount = session.user.discount || 0;

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedDiscountStr = cookieStore.get('impersonatedClientDiscount')?.value;
    if (impersonatedDiscountStr) {
      baseDiscount = parseFloat(impersonatedDiscountStr) || 0;
    }
  }

  return baseDiscount;
}

export async function getExtraAgentDiscount() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') return 0;

  const cookieStore = cookies();
  const extraStr = cookieStore.get('agentExtraDiscount')?.value;
  return extraStr ? parseFloat(extraStr) || 0 : 0;
}

import { prisma } from '@archelia/b2b-database';

export async function getEffectiveElmarkDiscounts(): Promise<Record<string, number>> {
  const session = await verifySession();
  if (!session) return {};

  let discounts = (session.user.elmarkDiscounts as Record<string, number>) || {};

  if (session.user.role === 'AGENT') {
    const cookieStore = cookies();
    const impersonatedClientId = cookieStore.get('impersonatedClientId')?.value;
    if (impersonatedClientId) {
      const impUser = await prisma.b2BUser.findUnique({
        where: { id: impersonatedClientId },
        select: { elmarkDiscounts: true }
      });
      if (impUser) {
        discounts = (impUser.elmarkDiscounts as Record<string, number>) || {};
      }
    }
  }

  return discounts;
}
