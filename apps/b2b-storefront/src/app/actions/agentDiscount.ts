'use server';

import { verifySession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function setAgentExtraDiscount(discount: number) {
  const session = await verifySession();
  if (!session || session.role !== 'AGENT') return { success: false };

  if (discount > 0) {
    cookies().set('agentExtraDiscount', discount.toString(), { maxAge: 86400, path: '/' });
  } else {
    cookies().delete('agentExtraDiscount');
  }

  return { success: true };
}
