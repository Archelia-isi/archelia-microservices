import { prisma } from '@archelia/b2b-database';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export interface CommercialCategoryOption {
  code: string;
  label: string;
  discount: number;
}

export interface AgentManagedClient {
  id: string;
  hasB2BAccount: boolean;
  zucchettiCode: string;
  companyName: string;
  vatNumber: string;
  codiceFiscale: string;
  formaGiuridica: string;
  firstName: string;
  lastName: string;
  address: string;
  zip: string;
  city: string;
  province: string;
  phone: string;
  telefonoFisso: string;
  email: string;
  pec: string;
  codiceDestinatario: string;
  username: string;
  tempPassword: string;
  mustChangePassword: boolean;
  customerType: string;
  categoriaCode: string;
  discount: number;
  fido: number;
  codicePagamento: string;
  isElmarkCustomer: boolean;
  elmarkDiscounts: Record<string, number>;
  isActive: boolean;
  ordersCount: number;
  createdAt: string;
  agentId?: string;
  agentCode?: string;
  agentName?: string;
}

export const DEFAULT_AGENT_ID = 'cmtu64h1c0000jk0sb1ho1o49';
export const DEFAULT_AGENT_CODE = '003';
export const DEFAULT_AGENT_NAME = 'Daniele Savoia';

function getZucchettiHeaders(): Record<string, string> {
  const user = process.env.ZUCCHETTI_USERNAME || 'Soapserv';
  const pass = process.env.ZUCCHETTI_PASSWORD || 'SspSrvZ2025%%';
  return {
    Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
  };
}

function getZucchettiBaseUrl(): string {
  return (process.env.ZUCCHETTI_BASE_URL || 'https://infinity.immobiliareizzo.com/ahrweb').replace(
    /\/$/,
    ''
  );
}

async function zFetch(url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      // @ts-ignore
      agent: httpsAgent,
      signal: options.signal || controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

let cachedZucchettiCategories: { data: CommercialCategoryOption[]; expiresAt: number } | null =
  null;
let inflightZucchettiCategories: Promise<CommercialCategoryOption[]> | null = null;

let cachedZucchettiClients: {
  rows: any[];
  map: Map<string, any>;
  expiresAt: number;
} | null = null;
let inflightZucchettiClients: Promise<{ rows: any[]; map: Map<string, any> }> | null = null;

let cachedZucchettiAgents: {
  map: Map<string, { code: string; name: string }>;
  expiresAt: number;
} | null = null;
let inflightZucchettiAgents: Promise<Map<string, { code: string; name: string }>> | null = null;

async function fetchZucchettiAgentsCached(): Promise<Map<string, { code: string; name: string }>> {
  if (cachedZucchettiAgents && Date.now() < cachedZucchettiAgents.expiresAt) {
    return cachedZucchettiAgents.map;
  }
  if (inflightZucchettiAgents) {
    return inflightZucchettiAgents;
  }

  inflightZucchettiAgents = (async () => {
    const map = new Map<string, { code: string; name: string }>();
    try {
      const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_agenti?sp_company=A0002&limit=1000&offset=0`;
      const res = await zFetch(url, { headers: getZucchettiHeaders() }, 3000);
      if (res.ok) {
        const json: any = await res.json();
        const rows: any[] = json.data || json.dataset || json.zzna_agenti || [];
        for (const r of rows) {
          const rawCode = String(r.agcodage || r.Agcodage || '').trim();
          const name = String(r.agdesage || r.Agdesage || '').trim();
          if (!rawCode) continue;
          const norm = normalizeAgentCode(rawCode);
          if (norm) {
            map.set(norm, { code: rawCode, name: name || `Agente ${rawCode}` });
          }
        }
      }
    } catch (_e) {
      if (cachedZucchettiAgents) {
        return cachedZucchettiAgents.map;
      }
    }

    cachedZucchettiAgents = {
      map,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    return map;
  })().finally(() => {
    inflightZucchettiAgents = null;
  });

  return inflightZucchettiAgents;
}

const cachedAgentClientsByAgentId = new Map<
  string,
  {
    data: {
      success: boolean;
      agentName: string;
      agentCode: string;
      categories: CommercialCategoryOption[];
      clients: AgentManagedClient[];
    };
    expiresAt: number;
  }
>();

async function fetchZucchettiCategoriesCached(): Promise<CommercialCategoryOption[]> {
  if (cachedZucchettiCategories && Date.now() < cachedZucchettiCategories.expiresAt) {
    return cachedZucchettiCategories.data;
  }
  if (inflightZucchettiCategories) {
    return inflightZucchettiCategories;
  }

  inflightZucchettiCategories = (async () => {
    const noneCategoryOption: CommercialCategoryOption = {
      code: '',
      label: 'Nessuna Categoria (Sconto base 0%)',
      discount: 0,
    };
    const defaultCategories: CommercialCategoryOption[] = [
      noneCategoryOption,
      { code: 'riv', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
      { code: 'ist', label: 'IST - Installatore (Sconto base 40%)', discount: 40 },
      { code: 'gen', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
    ];

    let categories: CommercialCategoryOption[] = [...defaultCategories];
    try {
      const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_cat_scont?sp_company=A0002&limit=1000&offset=0`;
      const res = await zFetch(url, { headers: getZucchettiHeaders() }, 3000);
      if (res.ok) {
        const json: any = await res.json();
        const rows: any[] = json.data || [];
        if (rows.length > 0) {
          const map = new Map<string, CommercialCategoryOption>();
          for (const r of rows) {
            const code = String(r.tscatcli || '').trim().toLowerCase();
            if (!code) continue;
            const discount = Math.abs(parseFloat(r.tsscont1 || '0')) || 0;
            let name = code.toUpperCase();
            if (code === 'riv') name = 'RIV - Rivenditore';
            else if (code === 'ist') name = 'IST - Installatore';
            else if (code === 'gen') name = 'GEN - Generale';
            else name = `${code.toUpperCase()} - Categoria ${code.toUpperCase()}`;
            map.set(code, { code, label: `${name} (Sconto base ${discount}%)`, discount });
          }
          if (map.size > 0) {
            categories = [noneCategoryOption, ...Array.from(map.values())];
          }
        }
      }
    } catch (_e) {
      // fallback defaultCategories
    }

    cachedZucchettiCategories = {
      data: categories,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    return categories;
  })().finally(() => {
    inflightZucchettiCategories = null;
  });

  return inflightZucchettiCategories;
}

async function fetchZucchettiClientsCached(
  forceRefresh = false
): Promise<{ rows: any[]; map: Map<string, any> }> {
  if (!forceRefresh && cachedZucchettiClients && Date.now() < cachedZucchettiClients.expiresAt) {
    return cachedZucchettiClients;
  }
  if (!forceRefresh && inflightZucchettiClients) {
    return inflightZucchettiClients;
  }

  inflightZucchettiClients = (async () => {
    const map = new Map<string, any>();
    let rows: any[] = [];
    try {
      const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002&limit=100000&offset=0`;
      const res = await zFetch(url, { headers: getZucchettiHeaders() }, 4500);
      if (res.ok) {
        const json: any = await res.json();
        rows = json.data || json.dataset || json.zzna_clienti || [];
        for (const r of rows) {
          const code = String(r.ancodice || r.Ancodice || '').trim().toUpperCase();
          if (!code) continue;
          const prev = map.get(code);
          if (!prev) {
            map.set(code, r);
          } else {
            const prevAg = String(prev.ancodag1 || prev.Ancodag1 || '').trim();
            const currAg = String(r.ancodag1 || r.Ancodag1 || '').trim();
            map.set(code, {
              ...prev,
              ...r,
              ancodag1: currAg || prevAg,
            });
          }
        }
      }
    } catch (_e) {
      if (cachedZucchettiClients) {
        return cachedZucchettiClients;
      }
    }

    const entry = {
      rows,
      map,
      expiresAt: Date.now() + 3 * 60 * 1000,
    };
    cachedZucchettiClients = entry;
    return entry;
  })().finally(() => {
    inflightZucchettiClients = null;
  });

  return inflightZucchettiClients;
}

function buildSmartBaseUsername(ragioneSociale: string, cognome?: string, nome?: string): string {
  let cleaned = (ragioneSociale || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/F\.?\s*LLI\b/g, 'FRATELLI')
    .replace(/\./g, ' ')
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned
    .replace(
      /\b(SRLS|SRL|SPA|SNC|SAS|SAPA|SCARL|SS|SOC|COOP|COOPERATIVA|SOCIETA|RESPONSABILITA|LIMITATA|UNIPERSONALE|LIQUIDAZIONE|DITTA|INDIVIDUALE|IMPRESA)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  const genericPrefixes = new Set(['FRATELLI', 'EREDI', 'STUDIO']);
  const diSplit = cleaned.split(/\s+DI\s+/);
  if (
    diSplit.length > 1 &&
    diSplit[0] &&
    diSplit[0].trim().length >= 3 &&
    !genericPrefixes.has(diSplit[0].trim())
  ) {
    cleaned = diSplit[0].trim();
  }

  const stopWords = new Set([
    'del', 'della', 'dei', 'degli', 'delle', 'dal', 'dalla',
    'nel', 'nella', 'con', 'per', 'tra', 'fra', 'ed', 'da', 'in', 'su',
  ]);
  const words = cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  let result = '';
  if (words.length >= 2) {
    const twoWords = `${words[0]}.${words[1]}`;
    result = twoWords.length <= 22 ? twoWords : words[0].slice(0, 18);
  } else if (words.length === 1) {
    result = words[0].slice(0, 20);
  }

  if (!result || result.length < 3) {
    const fallback = [cognome, nome]
      .map(s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    result = fallback.join('.').slice(0, 20);
  }

  return result;
}

function inferFormaGiuridica(name: string): string {
  const upper = ` ${name.toUpperCase().replace(/\./g, '')} `;
  if (/\b(SRLS|SRL|SOC\s*RESP\s*LIM|SOCIETA\s*A\s*RESPONSABILITA\s*LIMITATA)\b/.test(upper))
    return 'SRL';
  if (/\b(SPA|SOCIETA\s*PER\s*AZIONI)\b/.test(upper)) return 'SPA';
  if (/\b(SNC|SOCIETA\s*IN\s*NOME\s*COLLETTIVO)\b/.test(upper)) return 'SNC';
  if (/\b(SAS|SOCIETA\s*IN\s*ACCOMANDITA)\b/.test(upper)) return 'SAS';
  if (/\b(COOP|COOPERATIVA|SCARL|SOC\s*COOP)\b/.test(upper)) return 'COO';
  if (/\b(SS|SOCIETA\s*SEMPLICE)\b/.test(upper)) return 'SSE';
  return 'DIT';
}

function normalizeAgentCode(raw?: string | null): string {
  const trimmed = String(raw || '').trim().toUpperCase();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) {
    return trimmed.replace(/^0+(?=\d)/, '');
  }
  return trimmed;
}

export async function getAgentClientsList(
  agentId = DEFAULT_AGENT_ID,
  agentCode = DEFAULT_AGENT_CODE,
  agentName = DEFAULT_AGENT_NAME
): Promise<{
  success: boolean;
  error?: string;
  agentName?: string;
  agentCode?: string;
  categories?: CommercialCategoryOption[];
  clients?: AgentManagedClient[];
}> {
  const cachedForAgent = cachedAgentClientsByAgentId.get(agentId);
  if (cachedForAgent && Date.now() < cachedForAgent.expiresAt) {
    return cachedForAgent.data;
  }

  const [categories, zucchettiClientsData, zucchettiAgentsMap, allExistingB2B, dbClients, dbAgents] =
    await Promise.all([
      fetchZucchettiCategoriesCached(),
      fetchZucchettiClientsCached(),
      fetchZucchettiAgentsCached(),
      prisma.b2BUser.findMany({
        where: { role: 'USER' },
        select: { zucchettiCode: true, vatNumber: true },
      }),
      prisma.b2BUser.findMany({
        where: {
          role: 'USER',
        },
        include: {
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.b2BUser.findMany({
        where: {
          role: 'AGENT',
        },
        select: {
          id: true,
          zucchettiCode: true,
          companyName: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      }),
    ]);

  const agentById = new Map<string, { id: string; code: string; name: string }>();
  const agentByNormCode = new Map<string, { id: string; code: string; name: string }>();
  const b2bAgentNormCodes = new Set<string>();

  for (const [normCode, zAg] of Array.from(zucchettiAgentsMap.entries())) {
    agentByNormCode.set(normCode, {
      id: `ZAG:${normCode}`,
      code: zAg.code,
      name: zAg.name,
    });
  }

  agentById.set(DEFAULT_AGENT_ID, {
    id: DEFAULT_AGENT_ID,
    code: DEFAULT_AGENT_CODE,
    name: DEFAULT_AGENT_NAME,
  });
  agentByNormCode.set(normalizeAgentCode(DEFAULT_AGENT_CODE), {
    id: DEFAULT_AGENT_ID,
    code: DEFAULT_AGENT_CODE,
    name: DEFAULT_AGENT_NAME,
  });
  b2bAgentNormCodes.add(normalizeAgentCode(DEFAULT_AGENT_CODE));

  for (const ag of dbAgents) {
    const agName =
      ag.companyName ||
      `${ag.firstName || ''} ${ag.lastName || ''}`.trim() ||
      ag.username ||
      'Agente';
    const agCode = (ag.zucchettiCode || '').trim();
    const info = { id: ag.id, code: agCode, name: agName };
    agentById.set(ag.id, info);
    if (agCode) {
      const norm = normalizeAgentCode(agCode);
      agentByNormCode.set(norm, info);
      b2bAgentNormCodes.add(norm);
    }
  }

  const resolveClientAgentInfo = (
    uAgentId?: string | null,
    zRow?: any
  ): { agentId: string; agentCode: string; agentName: string } => {
    if (uAgentId && agentById.has(uAgentId)) {
      const ag = agentById.get(uAgentId)!;
      return { agentId: ag.id, agentCode: ag.code, agentName: ag.name };
    }
    const rawZAg = String(zRow?.ancodag1 || zRow?.Ancodag1 || '').trim();
    const normZAg = normalizeAgentCode(rawZAg);
    if (normZAg && agentByNormCode.has(normZAg)) {
      const ag = agentByNormCode.get(normZAg)!;
      return { agentId: ag.id, agentCode: ag.code || rawZAg, agentName: ag.name };
    }
    if (rawZAg) {
      return {
        agentId: uAgentId || `ZAG:${normZAg}`,
        agentCode: rawZAg,
        agentName: `Agente ${rawZAg}`,
      };
    }
    return {
      agentId: 'DIREZIONALE',
      agentCode: '',
      agentName: 'Direzionale / Sede',
    };
  };

  const zucchettiMap = zucchettiClientsData.map;

  const existingB2BCodes = new Set<string>();
  const existingB2BVats = new Set<string>();
  for (const row of allExistingB2B) {
    if (row.zucchettiCode) existingB2BCodes.add(row.zucchettiCode.trim().toUpperCase());
    if (row.vatNumber) existingB2BVats.add(row.vatNumber.trim().toUpperCase());
  }

  const standardElmarkDiscounts: Record<string, number> = {
    E1: 20,
    L: 20,
    C: 5,
    E2: 5,
    F: 5,
  };

  const normAgentCode = normalizeAgentCode(agentCode);

  const filteredDbClients = dbClients;

  const mappedB2B: AgentManagedClient[] = filteredDbClients.map(u => {
    const zCode = (u.zucchettiCode || '').trim().toUpperCase();
    const zRow = zCode ? zucchettiMap.get(zCode) : null;
    const resolvedAg = resolveClientAgentInfo(u.agentId, zRow);

    const rawCatFromType = (u.customerType || '').split('-')[0]?.trim().toLowerCase();
    const zCat = String(zRow?.ancatscm || zRow?.Ancatscm || '').trim().toLowerCase();
    const isNoneType =
      !u.customerType ||
      u.customerType.toLowerCase().includes('nessuna') ||
      (!zCat && u.discount === 0);

    const matchedCat = isNoneType
      ? categories.find(c => c.code === '')
      : categories.find(c => c.code && c.code.toLowerCase() === rawCatFromType) ||
        categories.find(c => c.code && c.code.toLowerCase() === zCat) ||
        categories.find(c => c.code && c.discount === u.discount);

    const rawElmark =
      u.elmarkDiscounts && typeof u.elmarkDiscounts === 'object'
        ? (u.elmarkDiscounts as Record<string, number>)
        : {};

    return {
      id: u.id,
      hasB2BAccount: true,
      zucchettiCode: u.zucchettiCode || '',
      companyName:
        u.companyName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.username,
      vatNumber: u.vatNumber || String(zRow?.anpariva || zRow?.Anpariva || '').trim(),
      codiceFiscale: String(zRow?.ancodfis || zRow?.Ancodfis || u.vatNumber || '').trim(),
      formaGiuridica:
        String(zRow?.anforgiu || zRow?.Anforgiu || '').trim().toUpperCase() ||
        inferFormaGiuridica(u.companyName || ''),
      firstName: u.firstName || String(zRow?.an__nome || zRow?.An__nome || '').trim(),
      lastName: u.lastName || String(zRow?.ancognom || zRow?.Ancognom || '').trim(),
      address: u.address || String(zRow?.anindiri || zRow?.Anindiri || '').trim(),
      zip: u.zip || String(zRow?.an___cap || zRow?.An___cap || '').trim(),
      city: u.city || String(zRow?.anlocali || zRow?.Anlocali || '').trim(),
      province: u.province || String(zRow?.anprovin || zRow?.Anprovin || '').trim(),
      phone: u.phone || String(zRow?.annumcel || zRow?.Annumcel || '').trim(),
      telefonoFisso: String(zRow?.antelefo || zRow?.Antelefo || '').trim(),
      email: u.email || String(zRow?.an_email || zRow?.An_email || '').trim(),
      pec: String(zRow?.an_empec || zRow?.An_empec || '').trim(),
      codiceDestinatario: String(zRow?.cccodest || zRow?.Cccodest || '0000000').trim() || '0000000',
      username: u.username,
      tempPassword: u.tempPassword || '',
      mustChangePassword: u.mustChangePassword,
      customerType:
        u.customerType ||
        (matchedCat && matchedCat.code
          ? matchedCat.label.replace(/\s*\(Sconto.*\)$/i, '')
          : 'Nessuna Categoria'),
      categoriaCode: matchedCat?.code ?? '',
      discount: u.discount ?? 0,
      fido: u.fido ?? 0,
      codicePagamento: String(zRow?.ancodpag || zRow?.Ancodpag || '').trim(),
      isElmarkCustomer: Boolean(u.isElmarkCustomer),
      elmarkDiscounts: u.isElmarkCustomer
        ? { ...standardElmarkDiscounts, ...rawElmark }
        : rawElmark,
      isActive: u.isActive,
      ordersCount: u._count.orders,
      createdAt: u.createdAt.toISOString(),
      agentId: resolvedAg.agentId,
      agentCode: resolvedAg.agentCode,
      agentName: resolvedAg.agentName,
    };
  });

  const zucchettiOnlyClients: AgentManagedClient[] = [];

  for (const [zCode, zRow] of Array.from(zucchettiMap.entries())) {
    if (existingB2BCodes.has(zCode)) continue;
    const zVat = String(zRow?.anpariva || zRow?.Anpariva || '').trim().toUpperCase();
    if (zVat && existingB2BVats.has(zVat)) continue;

    const rowAgent = normalizeAgentCode(zRow?.ancodag1 || zRow?.Ancodag1);
    if (!rowAgent || !b2bAgentNormCodes.has(rowAgent)) {
      continue;
    }

    const resolvedAg = resolveClientAgentInfo(null, zRow);

    const companyName = String(zRow?.andescri || zRow?.Andescri || '').trim();
    if (!companyName) continue;

    const firstName = String(zRow?.an__nome || zRow?.An__nome || '').trim();
    const lastName = String(zRow?.ancognom || zRow?.Ancognom || '').trim();
    const zCat = String(zRow?.ancatscm || zRow?.Ancatscm || '').trim().toLowerCase();
    const matchedCat = zCat
      ? categories.find(c => c.code && c.code.toLowerCase() === zCat)
      : undefined;

    const suggestedUsername =
      buildSmartBaseUsername(companyName, lastName, firstName) || zCode.toLowerCase();

    zucchettiOnlyClients.push({
      id: `zucchetti:${zCode}`,
      hasB2BAccount: false,
      zucchettiCode: zCode,
      companyName,
      vatNumber: zVat,
      codiceFiscale: String(zRow?.ancodfis || zRow?.Ancodfis || zVat || '').trim(),
      formaGiuridica:
        String(zRow?.anforgiu || zRow?.Anforgiu || '').trim().toUpperCase() ||
        inferFormaGiuridica(companyName),
      firstName,
      lastName,
      address: String(zRow?.anindiri || zRow?.Anindiri || '').trim(),
      zip: String(zRow?.an___cap || zRow?.An___cap || '').trim(),
      city: String(zRow?.anlocali || zRow?.Anlocali || '').trim(),
      province: String(zRow?.anprovin || zRow?.Anprovin || '').trim(),
      phone: String(
        zRow?.annumcel || zRow?.Annumcel || zRow?.antelefo || zRow?.Antelefo || ''
      ).trim(),
      telefonoFisso: String(zRow?.antelefo || zRow?.Antelefo || '').trim(),
      email: String(zRow?.an_email || zRow?.An_email || '').trim().toLowerCase(),
      pec: String(zRow?.an_empec || zRow?.An_empec || '').trim().toLowerCase(),
      codiceDestinatario: String(zRow?.cccodest || zRow?.Cccodest || '0000000').trim() || '0000000',
      username: suggestedUsername,
      tempPassword: '',
      mustChangePassword: true,
      customerType: matchedCat
        ? matchedCat.label.replace(/\s*\(Sconto.*\)$/i, '')
        : 'Nessuna Categoria',
      categoriaCode: matchedCat?.code || '',
      discount: matchedCat?.discount ?? 0,
      fido: parseFloat(String(zRow?.anvalfid || zRow?.Anvalfid || '0')) || 0,
      codicePagamento: String(zRow?.ancodpag || zRow?.Ancodpag || '').trim(),
      isElmarkCustomer: false,
      elmarkDiscounts: {},
      isActive: false,
      ordersCount: 0,
      createdAt: new Date(0).toISOString(),
      agentId: resolvedAg.agentId,
      agentCode: resolvedAg.agentCode,
      agentName: resolvedAg.agentName,
    });
  }

  zucchettiOnlyClients.sort((a, b) => b.zucchettiCode.localeCompare(a.zucchettiCode));

  const resultData = {
    success: true,
    agentName,
    agentCode,
    categories,
    clients: [...mappedB2B, ...zucchettiOnlyClients],
  };

  cachedAgentClientsByAgentId.set(agentId, {
    data: resultData,
    expiresAt: Date.now() + 60 * 1000,
  });

  return resultData;
}
