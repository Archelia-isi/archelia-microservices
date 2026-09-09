'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { cookies } from 'next/headers';

export async function getAgentCustomers() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  try {
    const customers = await prisma.b2BUser.findMany({
      where: { agentId: session.userId },
      orderBy: { companyName: 'asc' }
    });

    const mapped = customers.map(c => ({
      zucchettiCode: c.zucchettiCode || '',
      companyName: c.companyName || '',
      vatNumber: c.vatNumber || '',
      discount: c.discount
    }));

    return { success: true, customers: mapped };
  } catch (error: any) {
    console.error('getAgentCustomers error:', error);
    return { success: false, error: 'Errore fetch clienti' };
  }
}

export async function setImpersonatedClient(zucchettiCode: string | null, companyName: string | null, discount: number | null) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false };
  }

  if (zucchettiCode) {
    cookies().set('impersonatedClientCode', zucchettiCode, { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientName', companyName || '', { path: '/', maxAge: 86400 });
    cookies().set('impersonatedClientDiscount', String(discount || 0), { path: '/', maxAge: 86400 });
  } else {
    cookies().delete('impersonatedClientCode');
    cookies().delete('impersonatedClientName');
    cookies().delete('impersonatedClientDiscount');
  }

  return { success: true };
}
