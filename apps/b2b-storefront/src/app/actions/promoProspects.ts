'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcryptjs';
import { Agent } from 'undici';
import { redis } from '@/lib/redis';
import { getProductById } from '@archelia/typesense/dist/search.js';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

export interface PromoProspectBillingInput {
  partitaIva: string;
  codiceFiscale?: string;
  ragioneSociale: string;
  formaGiuridica: string;
  cognome?: string;
  nome?: string;
  sesso?: string;
  indirizzo: string;
  numeroCivico: string;
  cap: string;
  localita: string;
  provincia: string;
  codiceDestinatario?: string;
  pec?: string;
  telefono: string;
  email: string;
}

export interface PromoProspectDashboardItem {
  id: string;
  sdrProspectId: number | null;
  companyName: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  formaGiuridica: string | null;
  firstName: string | null;
  lastName: string | null;
  sesso: string | null;
  email: string;
  pec: string | null;
  sdiCode: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  streetNumber: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  clusterSdr: string;
  commercialCategory: string;
  discount: number;
  username: string;
  tempPassword: string | null;
  mustChangePassword: boolean;
  status: 'CONTACTED' | 'LOGGED_IN' | 'ORDER_PENDING_APPROVAL' | 'CONVERTED' | 'EXPIRED';
  emailSentAt: string;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  hasCompletedBillingData: boolean;
  activeCartItemsCount: number;
  activeCartTotal: number;
  activeCartPreview: Array<{
    sku: string;
    title: string;
    quantity: number;
  }>;
  pendingOrders: Array<{
    id: string;
    status: string;
    storeMode: string;
    totalAmount: number;
    totalIva: number;
    itemsCount: number;
    createdAt: string;
  }>;
  firstPurchaseRule: {
    id: string;
    name: string;
    discountValue: number;
    calculationMode: string;
    consumedAt: string | null;
  } | null;
}

function checkItalianVatLuhn(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  if (vat === '00000000000') return false;

  let sumEven = 0;
  let sumOdd = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat.charAt(i), 10);
    if (i % 2 === 0) {
      sumOdd += digit;
    } else {
      const doubled = digit * 2;
      sumEven += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const total = sumOdd + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === parseInt(vat.charAt(10), 10);
}

function inferFormaGiuridica(name: string): string {
  const upper = ` ${name.toUpperCase().replace(/\./g, '')} `;
  if (/\b(SRLS|SRL|SOC\s*RESP\s*LIM|SOCIETA\s*A\s*RESPONSABILITA\s*LIMITATA)\b/.test(upper)) return 'SRL';
  if (/\b(SPA|SOCIETA\s*PER\s*AZIONI)\b/.test(upper)) return 'SPA';
  if (/\b(SNC|SOCIETA\s*IN\s*NOME\s*COLLETTIVO)\b/.test(upper)) return 'SNC';
  if (/\b(SAS|SOCIETA\s*IN\s*ACCOMANDITA)\b/.test(upper)) return 'SAS';
  if (/\b(COOP|COOPERATIVA|SCARL|SOC\s*COOP)\b/.test(upper)) return 'COO';
  if (/\b(SS|SOCIETA\s*SEMPLICE)\b/.test(upper)) return 'SSE';
  if (/\b(DI\s+[A-Z]+|DITTA\s*INDIVIDUALE)\b/.test(upper)) return 'IND';
  return 'SRL';
}

function parseViesAddress(rawAddress: string): {
  indirizzo: string;
  numeroCivico: string;
  cap: string;
  localita: string;
  provincia: string;
} {
  const lines = (rawAddress || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let indirizzo = '';
  let numeroCivico = '';
  let cap = '';
  let localita = '';
  let provincia = '';

  if (lines.length >= 1) {
    const streetLine = lines[0];
    const streetMatch = streetLine.match(/^(.*?)(?:\s+(?:N\.?\s*|NR\.?\s*)?(\d+[A-Za-z0-9\/\-]*|SNC))$/i);
    if (streetMatch) {
      indirizzo = streetMatch[1].replace(/,\s*$/, '').trim();
      numeroCivico = streetMatch[2].trim();
    } else {
      indirizzo = streetLine;
      numeroCivico = 'SNC';
    }
  }

  if (lines.length >= 2) {
    const cityLine = lines[lines.length - 1];
    const cityMatch = cityLine.match(/^(\d{5})\s+(.+?)\s+([A-Z]{2})$/i);
    if (cityMatch) {
      cap = cityMatch[1];
      localita = cityMatch[2].trim();
      provincia = cityMatch[3].toUpperCase();
    } else {
      const capOnlyMatch = cityLine.match(/^(\d{5})\s+(.+)$/);
      if (capOnlyMatch) {
        cap = capOnlyMatch[1];
        localita = capOnlyMatch[2].trim();
      } else {
        localita = cityLine;
      }
    }
  }

  return { indirizzo, numeroCivico, cap, localita, provincia };
}

function escapeXmlAttr(val: string): string {
  return (val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

function getZucchettiHeaders(): Record<string, string> {
  const user = process.env.ZUCCHETTI_USERNAME || 'Soapserv';
  const pass = process.env.ZUCCHETTI_PASSWORD || 'SspSrvZ2025%%';
  return {
    Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
  };
}

function getZucchettiBaseUrl(): string {
  return (process.env.ZUCCHETTI_BASE_URL || 'https://infinity.immobiliareizzo.com/ahrweb').replace(/\/$/, '');
}

async function zFetch(url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fetchOptions = {
      ...options,
      dispatcher: zucchettiDispatcher,
      signal: options.signal || controller.signal,
    } as unknown as RequestInit;
    return await fetch(url, fetchOptions);
  } finally {
    clearTimeout(timer);
  }
}

async function reserveNextZucchettiCode(): Promise<string> {
  const MIN_CODE_NUM = 165;
  const occupied = new Set<number>();

  try {
    const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002&limit=100000&offset=0`;
    const res = await zFetch(url, { headers: getZucchettiHeaders(), cache: 'no-store' }, 4000);
    if (res.ok) {
      const json: any = await res.json();
      const rows = json.data || json.dataset || json.zzna_clienti || [];
      for (const r of rows) {
        const code = String(r.ancodice || r.Ancodice || '').trim();
        const m = code.match(/^C(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) occupied.add(n);
        }
      }
    }
  } catch (e) {}

  try {
    const dbUsers = await prisma.b2BUser.findMany({
      where: { zucchettiCode: { startsWith: 'C' } },
      select: { zucchettiCode: true },
    });
    for (const u of dbUsers) {
      const m = (u.zucchettiCode || '').trim().match(/^C(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) occupied.add(n);
      }
    }
  } catch (e) {}

  let candidateNum = MIN_CODE_NUM;
  for (let attempt = 0; attempt < 25; attempt++) {
    while (occupied.has(candidateNum)) {
      candidateNum++;
    }
    const candidateCode = `C${String(candidateNum).padStart(6, '0')}`;
    try {
      const locked = await redis.set(
        `b2b_zucchetti_creating_lock:${candidateCode}`,
        '1',
        'EX',
        15,
        'NX'
      );
      if (locked === 'OK') {
        return candidateCode;
      }
    } catch {
      return candidateCode;
    }
    candidateNum++;
  }
  return `C${String(candidateNum).padStart(6, '0')}`;
}

async function sendZucchettiAdhocContiRespectingDryRun(xmlPayload: string): Promise<{
  executed: boolean;
  dryRun: boolean;
}> {
  const enableWrites = process.env.ENABLE_GLOBAL_WRITES === 'true';
  if (!enableWrites) {
    console.log('[DRY-RUN][ENABLE_GLOBAL_WRITES=false] Simulazione invio ADHOC_CONTI a Zucchetti:', xmlPayload);
    return { executed: false, dryRun: true };
  }

  const baseUrl = getZucchettiBaseUrl();
  const tokenParams = new URLSearchParams();
  tokenParams.set('username', process.env.ZUCCHETTI_USERNAME || 'Soapserv');
  tokenParams.set('password', process.env.ZUCCHETTI_PASSWORD || 'SspSrvZ2025%%');
  tokenParams.set('company', 'A0002');
  tokenParams.set('instance', 'SERVLET');

  const tokenRes = await zFetch(`${baseUrl}/api/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    throw new Error(`Autenticazione Zucchetti fallita (HTTP ${tokenRes.status})`);
  }

  const tokenJson: any = await tokenRes.json();
  const token = tokenJson?.responseData?.result;
  if (!token) {
    throw new Error('Token Zucchetti non ricevuto');
  }

  try {
    const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
    const importUrl = `${baseUrl}/api/${appId}/ADHOC_CONTI`;
    const bodyParams = new URLSearchParams();
    bodyParams.set('data', xmlPayload);

    const impRes = await zFetch(importUrl, {
      method: 'POST',
      headers: {
        authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body: bodyParams.toString(),
    });

    if (!impRes.ok) {
      const errTxt = await impRes.text();
      throw new Error(`Import ADHOC_CONTI HTTP ${impRes.status}: ${errTxt}`);
    }

    return { executed: true, dryRun: false };
  } finally {
    try {
      await zFetch(`${baseUrl}/api/releaseToken`, {
        method: 'POST',
        headers: { authorization: token },
      });
    } catch {}
  }
}

function checkPromoProspectBillingComplete(promo: {
  vatNumber?: string | null;
  companyName?: string | null;
  formaGiuridica?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  streetNumber?: string | null;
  zip?: string | null;
  city?: string | null;
  province?: string | null;
  codiceDestinatario?: string | null;
  pecEmail?: string | null;
  phone?: string | null;
  email?: string | null;
}): boolean {
  const cleanVat = (promo.vatNumber || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  if (!cleanVat || !checkItalianVatLuhn(cleanVat)) return false;
  if (!(promo.companyName || '').trim()) return false;
  const fg = (promo.formaGiuridica || '').trim().toUpperCase();
  if (!fg) return false;
  if ((fg === 'IND' || fg === 'PER') && (!(promo.firstName || '').trim() || !(promo.lastName || '').trim())) {
    return false;
  }
  if (!(promo.address || '').trim()) return false;
  if (!(promo.zip || '').trim() || !/^\d{5}$/.test((promo.zip || '').trim())) return false;
  if (!(promo.city || '').trim()) return false;
  if (!(promo.province || '').trim() || (promo.province || '').trim().length !== 2) return false;
  const sdi = (promo.codiceDestinatario || '').trim();
  const pec = (promo.pecEmail || '').trim();
  if (!sdi && !pec) return false;
  if (!(promo.phone || '').trim()) return false;
  if (!(promo.email || '').trim()) return false;
  return true;
}

export async function isPromoProspectBillingComplete(promo: {
  vatNumber?: string | null;
  companyName?: string | null;
  formaGiuridica?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  streetNumber?: string | null;
  zip?: string | null;
  city?: string | null;
  province?: string | null;
  codiceDestinatario?: string | null;
  pecEmail?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<boolean> {
  return checkPromoProspectBillingComplete(promo);
}

/**
 * Interrogazione VIES accessibile sia al cliente in attivazione (al momento del 1° ordine) sia all'agente
 */
export async function lookupVatForPromoCheckout(rawVat: string): Promise<{
  success: boolean;
  isFormalValid: boolean;
  isViesValid: boolean;
  error?: string;
  parsed?: {
    ragioneSociale: string;
    formaGiuridica: string;
    indirizzo: string;
    numeroCivico: string;
    cap: string;
    localita: string;
    provincia: string;
  };
}> {
  const session = await verifySession();
  if (!session) {
    return { success: false, isFormalValid: false, isViesValid: false, error: 'Non autorizzato' };
  }

  const cleanVat = (rawVat || '')
    .toUpperCase()
    .replace(/^IT/, '')
    .replace(/\s+/g, '')
    .trim();

  if (!/^\d{11}$/.test(cleanVat)) {
    return {
      success: false,
      isFormalValid: false,
      isViesValid: false,
      error: 'La Partita IVA italiana deve contenere esattamente 11 cifre numeriche.',
    };
  }

  if (!checkItalianVatLuhn(cleanVat)) {
    return {
      success: false,
      isFormalValid: false,
      isViesValid: false,
      error: 'Partita IVA formalmente non valida (codice di controllo errato).',
    };
  }

  try {
    const viesRes = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${cleanVat}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (viesRes.ok) {
      const viesData: any = await viesRes.json();
      if (viesData.isValid) {
        const rawName = (viesData.name || '').trim();
        const ragioneSociale = rawName !== '---' ? rawName : '';
        const formaGiuridica = ragioneSociale ? inferFormaGiuridica(ragioneSociale) : 'SRL';
        const addr = parseViesAddress(viesData.address !== '---' ? viesData.address || '' : '');

        return {
          success: true,
          isFormalValid: true,
          isViesValid: true,
          parsed: {
            ragioneSociale,
            formaGiuridica,
            indirizzo: addr.indirizzo,
            numeroCivico: addr.numeroCivico,
            cap: addr.cap,
            localita: addr.localita,
            provincia: addr.provincia,
          },
        };
      }
    }
  } catch (e) {
    console.warn('Errore interrogazione VIES:', e);
  }

  return {
    success: true,
    isFormalValid: true,
    isViesValid: false,
    error: 'Partita IVA formalmente valida. Compila o verifica manualmente i campi sottostanti.',
  };
}

/**
 * Valida e salva tutti i campi obbligatori Zucchetti sul record b2b_promo_prospects
 */
export async function validateAndSavePromoProspectBillingData(
  promoProspectId: string,
  input: PromoProspectBillingInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  const cleanVat = (input.partitaIva || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  const ragioneSociale = (input.ragioneSociale || '').trim();
  const formaGiuridica = (input.formaGiuridica || inferFormaGiuridica(ragioneSociale)).trim().toUpperCase();
  const indirizzo = (input.indirizzo || '').trim();
  const numeroCivico = (input.numeroCivico || 'SNC').trim() || 'SNC';
  const cap = (input.cap || '').trim();
  const localita = (input.localita || '').trim();
  const provincia = (input.provincia || '').trim().toUpperCase();
  const email = (input.email || '').trim().toLowerCase();
  const telefono = (input.telefono || '').trim();
  const pec = (input.pec || '').trim().toLowerCase();
  let codiceDestinatario = (input.codiceDestinatario || '').trim().toUpperCase();
  const codiceFiscale = ((input.codiceFiscale || '').trim().toUpperCase() || cleanVat).substring(0, 16);

  if (!cleanVat || !checkItalianVatLuhn(cleanVat)) {
    return { success: false, error: 'Inserisci una Partita IVA italiana valida (11 cifre).' };
  }
  if (!ragioneSociale) {
    return { success: false, error: 'La Ragione Sociale è obbligatoria.' };
  }
  if (!formaGiuridica) {
    return { success: false, error: 'Seleziona la Forma Giuridica.' };
  }

  const isPersonaOrDitta = formaGiuridica === 'IND' || formaGiuridica === 'PER';
  const cognome = (input.cognome || '').trim();
  const nome = (input.nome || '').trim();
  const sesso = (input.sesso || 'M').trim().toUpperCase();
  if (isPersonaOrDitta && (!cognome || !nome)) {
    return {
      success: false,
      error: 'Per Ditta Individuale (IND) o Persona Fisica (PER) sono obbligatori Cognome e Nome del titolare.',
    };
  }

  if (!indirizzo) {
    return { success: false, error: "L'Indirizzo della sede legale è obbligatorio." };
  }
  if (!numeroCivico) {
    return { success: false, error: 'Il Numero Civico è obbligatorio (inserisci SNC se privo di numero).' };
  }
  if (!cap || !/^\d{5}$/.test(cap)) {
    return { success: false, error: 'Il CAP è obbligatorio e deve essere di 5 cifre.' };
  }
  if (!localita) {
    return { success: false, error: 'Il Comune / Località è obbligatorio.' };
  }
  if (!provincia || provincia.length !== 2) {
    return { success: false, error: 'La Provincia deve essere la sigla di 2 lettere (es. NA, RM, MI).' };
  }
  if (!codiceDestinatario && !pec) {
    return {
      success: false,
      error: 'Inserisci almeno uno tra Codice Destinatario SDI (7 caratteri) e Indirizzo PEC per la fatturazione elettronica.',
    };
  }
  if (!codiceDestinatario && pec) {
    codiceDestinatario = '0000000';
  }
  if (codiceDestinatario && !/^[A-Z0-9]{7}$/.test(codiceDestinatario)) {
    return {
      success: false,
      error: 'Il Codice Destinatario SDI deve essere composto da esattamente 7 caratteri alfanumerici.',
    };
  }
  if (!telefono) {
    return { success: false, error: 'Il Recapito Telefonico è obbligatorio per la gestione della consegna.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Inserisci un indirizzo Email valido.' };
  }

  // Controlla che la P.IVA non appartenga già a un altro utente attivo
  const dupVatUser = await prisma.b2BUser.findFirst({
    where: { vatNumber: cleanVat },
    select: { id: true, companyName: true, zucchettiCode: true },
  });
  if (dupVatUser) {
    return {
      success: false,
      error: `La Partita IVA ${cleanVat} risulta già registrata sul portale B2B (${dupVatUser.companyName}). Contatta il tuo agente Daniele Savoia per assistenza.`,
    };
  }

  await prisma.b2BPromoProspect.update({
    where: { id: promoProspectId },
    data: {
      vatNumber: cleanVat,
      fiscalCode: codiceFiscale,
      companyName: ragioneSociale,
      formaGiuridica,
      firstName: nome || null,
      lastName: cognome || null,
      sesso: isPersonaOrDitta ? sesso : null,
      address: indirizzo,
      streetNumber: numeroCivico,
      zip: cap,
      city: localita,
      province: provincia,
      codiceDestinatario,
      pecEmail: pec || null,
      phone: telefono,
      email,
      status: 'ORDER_PENDING_APPROVAL',
    },
  });

  return { success: true };
}

/**
 * Promuove atomicamente un B2BPromoProspect in B2BUser (e invia ADHOC_CONTI a Zucchetti)
 * ESCLUSIVAMENTE quando l'agente Daniele Savoia approva il 1° ordine.
 * Mantiene identico per tutta la vita lo username e la password già impostata dal cliente!
 */
export async function promotePromoProspectToActiveUserOnOrderApproval(
  promoProspectId: string,
  approvedOrderId?: string
): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
  zucchettiCode?: string;
}> {
  const promo = await prisma.b2BPromoProspect.findUnique({
    where: { id: promoProspectId },
  });

  if (!promo) {
    return { success: false, error: 'Cliente in attivazione non trovato.' };
  }

  if (promo.convertedToUserId) {
    const existing = await prisma.b2BUser.findUnique({ where: { id: promo.convertedToUserId } });
    if (existing) {
      return {
        success: true,
        userId: existing.id,
        zucchettiCode: existing.zucchettiCode || undefined,
      };
    }
  }

  const cleanVat = (promo.vatNumber || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  const ragioneSociale = (promo.companyName || '').trim();
  const formaGiuridica = (promo.formaGiuridica || inferFormaGiuridica(ragioneSociale)).trim().toUpperCase();
  const isPersonaOrDitta = formaGiuridica === 'IND' || formaGiuridica === 'PER';
  const indirizzo = (promo.address || '').trim();
  const numeroCivico = (promo.streetNumber || 'SNC').trim() || 'SNC';
  const cap = (promo.zip || '').trim();
  const localita = (promo.city || '').trim();
  const provincia = (promo.province || '').trim().toUpperCase();
  const email = (promo.email || '').trim().toLowerCase();
  const telefono = (promo.phone || '').trim();
  const pec = (promo.pecEmail || '').trim().toLowerCase();
  const codiceDestinatario = (promo.codiceDestinatario || '0000000').trim().toUpperCase() || '0000000';
  const codiceFiscale = ((promo.fiscalCode || '').trim().toUpperCase() || cleanVat).substring(0, 16);

  if (!cleanVat || !ragioneSociale || !indirizzo || !cap || !localita || !provincia) {
    return {
      success: false,
      error:
        'Impossibile approvare il 1° ordine: i dati fiscali obbligatori del cliente (P.IVA, Indirizzo, CAP, Città, Provincia) sono incompleti.',
    };
  }

  // 1. Prenota codice cliente Zucchetti C000xxx
  const zucchettiCode = await reserveNextZucchettiCode();
  const agentZucchettiCode = promo.agentCode || '003';
  const categoriaCommerciale = (promo.commercialCategory || 'IST').toLowerCase();
  const customerTypeLabel =
    categoriaCommerciale === 'riv' ? 'Rivenditore' : 'Installatore';

  // 2. Costruisci XML ADHOC_CONTI e invia a Zucchetti (rispettando ENABLE_GLOBAL_WRITES)
  const fullAddress = `${indirizzo}, ${numeroCivico}`.substring(0, 40);
  const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
  const baseAttrs: Record<string, string> = {
    AddNew: 'S',
    ANTIPCON_K: 'C',
    ANCODICE_K: zucchettiCode,
    ANCATCON: 'CLIG',
    ANCONSUP: '01030201',
    ANPARTSN: 'S',
    ANCODPAG: '',
    AN__NOME: (promo.firstName || '').trim().substring(0, 50),
    ANCOGNOM: (promo.lastName || '').trim().substring(0, 50),
    AN_EMAIL: email,
    ANNUMCEL: telefono.substring(0, 18),
    ANINDIRI: fullAddress,
    ANLOCALI: localita.substring(0, 50),
    ANPROVIN: provincia.substring(0, 5),
    AN___CAP: cap,
    ANCODFIS: codiceFiscale,
    ANPARIVA: cleanVat,
    ANFORGIU: formaGiuridica,
    DescriNoZoom: ragioneSociale.substring(0, 60),
    ANCATSCM: categoriaCommerciale.substring(0, 5),
    ANCODAG1: agentZucchettiCode.substring(0, 5),
    CCCODEST: codiceDestinatario,
  };
  if (isPersonaOrDitta && promo.sesso) baseAttrs.AN_SESSO = promo.sesso;
  if (pec) baseAttrs.AN_EMPEC = pec.substring(0, 254);

  const attrString = Object.entries(baseAttrs)
    .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
    .join(' ');
  const xmlConti = `<ADHOC_CONTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Add_ADHOC_CONTI ${attrString}/></ADHOC_CONTI>`;

  try {
    await sendZucchettiAdhocContiRespectingDryRun(xmlConti);
  } catch (zErr: any) {
    console.warn('Avviso invio ADHOC_CONTI Zucchetti durante promozione prospect (proseguo su DB B2B):', zErr.message);
  }

  // 3. Verifica che username sia libero su b2b_users (mantenendo lo stesso username definitivo)
  let permanentUsername = promo.username;
  const dupUsername = await prisma.b2BUser.findUnique({ where: { username: permanentUsername } });
  if (dupUsername) {
    permanentUsername = `${promo.username}.${zucchettiCode.toLowerCase()}`;
  }

  // Verifica email unica su b2b_users
  let permanentEmail = email;
  const dupEmail = await prisma.b2BUser.findUnique({ where: { email: permanentEmail } });
  if (dupEmail) {
    return {
      success: false,
      error: `Esiste già un cliente attivo con l'email ${permanentEmail} (${dupEmail.companyName}).`,
    };
  }

  // 4. Crea il record definitivo in b2b_users e migra sessioni, carrelli e ordini
  const createdUser = await prisma.b2BUser.create({
    data: {
      username: permanentUsername,
      email: permanentEmail,
      passwordHash: promo.passwordHash,
      tempPassword: promo.tempPassword,
      mustChangePassword: promo.mustChangePassword,
      firstName: promo.firstName,
      lastName: promo.lastName,
      companyName: ragioneSociale,
      vatNumber: cleanVat,
      zucchettiCode,
      role: 'USER',
      agentId: promo.agentId,
      customerType: customerTypeLabel,
      discount: promo.discount,
      address: fullAddress,
      city: localita,
      zip: cap,
      province: provincia,
      phone: telefono || null,
      isElmarkCustomer: false,
      elmarkDiscounts: {},
      isActive: true,
    },
  });

  // Migra sessioni attive del prospect sul nuovo userId definitivo (così non viene disconnesso!)
  await prisma.b2BSession.updateMany({
    where: { promoProspectId: promo.id },
    data: { userId: createdUser.id },
  });

  // Migra carrelli e ordini del prospect sul nuovo userId definitivo
  await prisma.b2BCart.updateMany({
    where: { promoProspectId: promo.id },
    data: { userId: createdUser.id },
  });

  await prisma.b2BOrder.updateMany({
    where: { promoProspectId: promo.id },
    data: { userId: createdUser.id },
  });

  // 5. Aggiorna e consuma eventuali regole di sconto "Sul primo acquisto" (FIRST_PURCHASE) associate al prospect
  try {
    const rawRules: Array<{ id: string; payload: any }> = await prisma.$queryRawUnsafe(
      `SELECT id, payload FROM b2b_agent_discount_rules WHERE agent_id = $1 OR agent_id = 'GLOBAL'`,
      promo.agentId
    );
    const nowIso = new Date().toISOString();
    for (const row of rawRules) {
      const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload || {};
      const clientIds: string[] = Array.isArray(p.clientIds) ? p.clientIds : p.clientId ? [p.clientId] : [];
      const clientCodes: string[] = Array.isArray(p.clientCodes)
        ? p.clientCodes
        : p.clientCode
        ? [p.clientCode]
        : [];

      const matchesPromo =
        clientIds.includes(promo.id) ||
        clientCodes.some(c => String(c).toUpperCase() === promo.username.toUpperCase()) ||
        clientCodes.some(c => String(c).toUpperCase() === promo.id.toUpperCase());

      if (matchesPromo) {
        const nextClientIds = Array.from(new Set([...clientIds, createdUser.id]));
        const nextClientCodes = Array.from(new Set([...clientCodes, zucchettiCode]));
        const expType = String(p.expiryType || p.validUntilType || '').toUpperCase();
        const isFirstOrNext = expType === 'FIRST_PURCHASE' || expType === 'NEXT_PURCHASE';

        const updatedPayload = {
          ...p,
          clientId: createdUser.id,
          clientCode: zucchettiCode,
          clientIds: nextClientIds,
          clientCodes: nextClientCodes,
          ...(isFirstOrNext && !p.consumedAt
            ? {
                consumedAt: nowIso,
                consumedOrderId: approvedOrderId || null,
              }
            : {}),
        };

        await prisma.$executeRawUnsafe(
          `UPDATE b2b_agent_discount_rules
           SET payload = $2::jsonb,
               consumed_at = CASE WHEN $3::boolean THEN NOW() ELSE consumed_at END,
               updated_at = NOW()
           WHERE id = $1`,
          row.id,
          JSON.stringify(updatedPayload),
          isFirstOrNext
        );
      }
    }
  } catch (e) {
    console.warn('Avviso aggiornamento regole sconto durante promozione prospect:', e);
  }

  // 6. Marca il record b2b_promo_prospects come CONVERTED
  await prisma.b2BPromoProspect.update({
    where: { id: promo.id },
    data: {
      status: 'CONVERTED',
      convertedToUserId: createdUser.id,
      convertedAt: new Date(),
      firstOrderId: approvedOrderId || promo.firstOrderId,
    },
  });

  return {
    success: true,
    userId: createdUser.id,
    zucchettiCode,
  };
}

/**
 * Restituisce i dati di fatturazione attuali del B2BPromoProspect per pre-compilare il modal nel Carrello
 */
export async function getPromoProspectCheckoutData(targetId: string): Promise<{
  isPromoProspect: boolean;
  hasCompletedBillingData: boolean;
  prospect: {
    id: string;
    companyName: string;
    vatNumber: string;
    fiscalCode: string;
    formaGiuridica: string;
    firstName: string;
    lastName: string;
    sesso: string;
    address: string;
    streetNumber: string;
    zipCode: string;
    city: string;
    province: string;
    sdiCode: string;
    pec: string;
    phone: string;
    email: string;
    commercialCategory: string;
    discount: number;
  } | null;
}> {
  if (!targetId) {
    return { isPromoProspect: false, hasCompletedBillingData: true, prospect: null };
  }

  // Se esiste già in b2b_users, NON è un promo prospect
  const existingUser = await prisma.b2BUser.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (existingUser) {
    return { isPromoProspect: false, hasCompletedBillingData: true, prospect: null };
  }

  const promo = await prisma.b2BPromoProspect.findUnique({
    where: { id: targetId },
  });

  if (!promo || promo.status === 'CONVERTED') {
    return { isPromoProspect: false, hasCompletedBillingData: true, prospect: null };
  }

  return {
    isPromoProspect: true,
    hasCompletedBillingData: checkPromoProspectBillingComplete(promo),
    prospect: {
      id: promo.id,
      companyName: promo.companyName || '',
      vatNumber: promo.vatNumber || '',
      fiscalCode: promo.fiscalCode || promo.vatNumber || '',
      formaGiuridica: promo.formaGiuridica || inferFormaGiuridica(promo.companyName || ''),
      firstName: promo.firstName || '',
      lastName: promo.lastName || '',
      sesso: promo.sesso || 'M',
      address: promo.address || '',
      streetNumber: promo.streetNumber || '',
      zipCode: promo.zip || '',
      city: promo.city || '',
      province: promo.province || '',
      sdiCode: promo.codiceDestinatario || '',
      pec: promo.pecEmail || '',
      phone: promo.phone || '',
      email: promo.email || '',
      commercialCategory: promo.commercialCategory || 'IST',
      discount: promo.discount ?? 40,
    },
  };
}

/**
 * Dashboard "Clienti in Attivazione" per Daniele Savoia (divisa in Parte 1: Contattati e Parte 2: Hanno Effettuato l'Accesso)
 */
export async function getAgentPromoProspectsDashboard(): Promise<{
  success: boolean;
  error?: string;
  contacted: PromoProspectDashboardItem[];
  loggedIn: PromoProspectDashboardItem[];
  convertedCount: number;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return {
      success: false,
      error: 'Accesso riservato agli agenti.',
      contacted: [],
      loggedIn: [],
      convertedCount: 0,
    };
  }

  const [prospects, convertedCount] = await Promise.all([
    prisma.b2BPromoProspect.findMany({
      where: {
        agentId: session.userId,
        status: { in: ['CONTACTED', 'LOGGED_IN', 'ORDER_PENDING_APPROVAL'] },
      },
      include: {
        carts: {
          where: { status: 'ACTIVE' },
          include: { items: true },
        },
        orders: {
          where: { status: { in: ['PENDING_AGENT_REVIEW', 'DRAFT'] } },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ lastLoginAt: 'desc' }, { emailSentAt: 'desc' }],
    }),
    prisma.b2BPromoProspect.count({
      where: {
        agentId: session.userId,
        status: 'CONVERTED',
      },
    }),
  ]);

  // Carica eventuali regole sconto "Sul primo acquisto" per mostrare il badge sulla card del prospect
  let discountRulesRows: Array<{ id: string; payload: any }> = [];
  try {
    discountRulesRows = await prisma.$queryRawUnsafe(
      `SELECT id, payload FROM b2b_agent_discount_rules WHERE agent_id = $1 OR agent_id = 'GLOBAL'`,
      session.userId
    );
  } catch {}

  const contacted: PromoProspectDashboardItem[] = [];
  const loggedIn: PromoProspectDashboardItem[] = [];

  for (const p of prospects) {
    // Calcola anteprima carrello attivo
    let activeCartItemsCount = 0;
    let activeCartTotal = 0;
    const activeCartPreview: Array<{ sku: string; title: string; quantity: number }> = [];

    for (const c of p.carts) {
      for (const item of c.items) {
        activeCartItemsCount += item.quantity;
        if (activeCartPreview.length < 5) {
          let prodTitle = item.sku;
          try {
            const prod = (await getProductById(item.sku)) as any;
            if (prod) {
              prodTitle = prod.original_name || prod.title || item.sku;
              const priceB2b = Number(prod.price_b2b) > 0 ? Number(prod.price_b2b) : Number(prod.price || 0);
              const net = priceB2b * (1 - (p.discount || 0) / 100);
              activeCartTotal += net * item.quantity;
            }
          } catch {}
          activeCartPreview.push({
            sku: item.sku,
            title: prodTitle,
            quantity: item.quantity,
          });
        }
      }
    }

    // Trova eventuale regola sconto primo acquisto associata
    let firstPurchaseRule: PromoProspectDashboardItem['firstPurchaseRule'] = null;
    for (const r of discountRulesRows) {
      const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload || {};
      const clientIds: string[] = Array.isArray(payload.clientIds)
        ? payload.clientIds
        : payload.clientId
        ? [payload.clientId]
        : [];
      const clientCodes: string[] = Array.isArray(payload.clientCodes)
        ? payload.clientCodes
        : payload.clientCode
        ? [payload.clientCode]
        : [];

      const matches =
        clientIds.includes(p.id) ||
        clientCodes.some(c => String(c).toUpperCase() === p.username.toUpperCase()) ||
        clientCodes.some(c => String(c).toUpperCase() === p.id.toUpperCase());

      if (matches) {
        firstPurchaseRule = {
          id: r.id,
          name: payload.name || 'Sconto Benvenuto 1° Acquisto',
          discountValue: Number(payload.discountValue || 0),
          calculationMode: payload.calculationMode || 'EXTRA_COMPOUND',
          consumedAt: payload.consumedAt || null,
        };
        break;
      }
    }

    const mapped: PromoProspectDashboardItem = {
      id: p.id,
      sdrProspectId: p.sdrProspectId,
      companyName: p.companyName,
      vatNumber: p.vatNumber,
      fiscalCode: p.fiscalCode,
      formaGiuridica: p.formaGiuridica,
      firstName: p.firstName,
      lastName: p.lastName,
      sesso: p.sesso,
      email: p.email,
      pec: p.pecEmail,
      sdiCode: p.codiceDestinatario,
      phone: p.phone,
      website: p.website,
      address: p.address,
      streetNumber: p.streetNumber,
      city: p.city,
      province: p.province,
      zipCode: p.zip,
      clusterSdr: p.categoryCluster,
      commercialCategory: p.commercialCategory,
      discount: p.discount,
      username: p.username,
      tempPassword: p.tempPassword,
      mustChangePassword: p.mustChangePassword,
      status: p.status,
      emailSentAt: p.emailSentAt.toISOString(),
      firstLoginAt: p.firstLoginAt ? p.firstLoginAt.toISOString() : null,
      lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null,
      loginCount: p.loginCount,
      hasCompletedBillingData: checkPromoProspectBillingComplete(p),
      activeCartItemsCount,
      activeCartTotal,
      activeCartPreview,
      pendingOrders: p.orders.map(o => ({
        id: o.id,
        status: o.status,
        storeMode: o.storeMode,
        totalAmount: o.totalAmount,
        totalIva: o.totalIva,
        itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      })),
      firstPurchaseRule,
    };

    if (p.status === 'CONTACTED' && p.loginCount === 0 && !p.firstLoginAt) {
      contacted.push(mapped);
    } else {
      loggedIn.push(mapped);
    }
  }

  return {
    success: true,
    contacted,
    loggedIn,
    convertedCount,
  };
}

/**
 * Permette a Daniele Savoia di impersonare un prospect in attivazione (per preparargli un carrello o un preventivo)
 */
export async function impersonatePromoProspectAction(promoProspectId: string) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const promo = await prisma.b2BPromoProspect.findUnique({
    where: { id: promoProspectId },
  });

  if (!promo || promo.agentId !== session.userId) {
    return { success: false, error: 'Cliente in attivazione non trovato' };
  }

  const cookieOpts: any = { path: '/', maxAge: 86400 };
  if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';

  cookies().set('impersonatedClientCode', promo.id, cookieOpts);
  cookies().set('impersonatedClientName', `[IN ATTIVAZIONE] ${promo.companyName}`, cookieOpts);
  cookies().set('impersonatedClientDiscount', String(promo.discount || 0), cookieOpts);

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Rigenera una password temporanea per un prospect che non ha ancora effettuato il 1° accesso (o l'ha smarrita)
 */
export async function regeneratePromoProspectPasswordAction(promoProspectId: string): Promise<{
  success: boolean;
  error?: string;
  username?: string;
  tempPassword?: string;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const promo = await prisma.b2BPromoProspect.findUnique({
    where: { id: promoProspectId },
  });

  if (!promo || promo.agentId !== session.userId) {
    return { success: false, error: 'Lead non trovato' };
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.b2BPromoProspect.update({
    where: { id: promo.id },
    data: {
      tempPassword,
      passwordHash,
      mustChangePassword: true,
    },
  });

  revalidatePath('/account/prospects');
  return {
    success: true,
    username: promo.username,
    tempPassword,
  };
}
