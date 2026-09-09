'use server';

import { verifySession } from '@/lib/session';
import { zucchettiClient } from '@archelia/zucchetti/dist/index.js';
import { cookies } from 'next/headers';

export async function getAgentCustomers() {
  const session = await verifySession();
  if (!session || session.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const agentCode = session.user.zucchettiCode;
  if (!agentCode) {
    return { success: false, error: 'Codice agente mancante' };
  }

  try {
    // 1. Prendi gli sconti
    let discountsMap: Record<string, string> = {};
    const scontiRes: any = await zucchettiClient.query('zzna_cat_scont', { limit: '1000', offset: '0' }, 'A0002');
    if (scontiRes && scontiRes.data) {
       scontiRes.data.forEach((d: any) => {
          const cat = (d.tscatcli || '').toLowerCase();
          if (cat) discountsMap[cat] = d.tsscont1 || '0.00';
       });
    }

    // 2. Prendi i clienti (filtrando per ancodag1 == agentCode)
    // Zucchetti Infinity API filters: filter_by is not standard, we must fetch and filter in memory, or use Zucchetti's ?filter=.
    // For safety, we fetch a large batch and filter locally, or since agents might have many, we can try to use a filter.
    // Zucchetti REST API allows `&ancodag1=...` ? Let's just fetch all customers and filter to be safe, or just query if possible.
    const rawRes: any = await zucchettiClient.query('zzna_clienti', { limit: '10000', offset: '0' }, 'A0002');
    let customers = [];
    if (rawRes && rawRes.data) customers = rawRes.data;
    else if (rawRes && rawRes.dataset) customers = rawRes.dataset;
    else if (rawRes && Array.isArray(rawRes)) customers = rawRes;
    
    // Filtro locale per codice agente
    const agentCustomers = customers.filter((c: any) => {
       const codAg1 = (c.ancodag1 || c.Ancodag1 || '').toLowerCase();
       return codAg1 === agentCode.toLowerCase();
    });

    const mapped = agentCustomers.map((c: any) => {
       const typeCode = (c.ancatscm || c.Ancatscm || '').toLowerCase();
       const baseDiscount = discountsMap[typeCode] ? Math.abs(parseFloat(discountsMap[typeCode])) : 0;
       return {
         zucchettiCode: c.ancodice || c.Ancodice || '',
         companyName: c.andescri || c.Andescri || '',
         vatNumber: c.anpariva || c.Anpariva || '',
         discount: baseDiscount
       };
    });

    return { success: true, customers: mapped };
  } catch (error: any) {
    console.error('getAgentCustomers error:', error);
    return { success: false, error: 'Errore fetch clienti' };
  }
}

export async function setImpersonatedClient(zucchettiCode: string | null, companyName: string | null, discount: number | null) {
  const session = await verifySession();
  if (!session || session.role !== 'AGENT') {
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
