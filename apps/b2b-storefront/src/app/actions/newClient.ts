'use server';

import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { revalidatePath } from 'next/cache';
import * as bcrypt from 'bcryptjs';
import { Agent } from 'undici';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

export interface CommercialCategoryOption {
  code: string;
  label: string;
  discount: number;
}

export interface VatLookupResult {
  success: boolean;
  isFormalValid: boolean;
  isViesValid: boolean;
  viesChecked: boolean;
  error?: string;
  existingWarning?: string;
  parsed?: {
    ragioneSociale: string;
    formaGiuridica: string;
    indirizzo: string;
    numeroCivico: string;
    cap: string;
    localita: string;
    provincia: string;
  };
}

export interface NewClientFormInput {
  // Step 1 (Obbligatori + Telefono/Cellulare opzionali)
  partitaIva: string;
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
  telefono?: string;
  cellulare?: string;
  email: string;
  codiceDestinatario?: string;
  pec?: string;
  categoriaCommerciale: string;

  // Step 2 (Campi aggiuntivi non obbligatori)
  descrizioneAggiuntiva?: string;
  codiceFiscale?: string;
  nazione?: string;
  lingua?: string;
  codicePagamento?: string;
  gestioneFido?: 'S' | 'N';
  importoMaxFido?: string;
  importoMaxOrdine?: string;
  bloccoSuperamentoFido?: 'S' | 'N';
  bloccoContenzioso?: 'S' | 'N';
  sitoWeb?: string;
  noteAnagrafica?: string;
  isElmarkCustomer?: boolean;
  elmarkDiscounts?: Record<string, number>;

  // Sede diversa (Opzionale nello Step 2)
  hasSedeDiversa?: boolean;
  sedeDenominazione?: string;
  sedeIndirizzo?: string;
  sedeCap?: string;
  sedeLocalita?: string;
  sedeProvincia?: string;
  sedeTelefono?: string;
  sedeEmail?: string;
  sedePersonaRiferimento?: string;
  sedeNoteConsegna?: string;
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

async function zFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const fetchOptions = { ...options, dispatcher: zucchettiDispatcher } as unknown as RequestInit;
  return fetch(url, fetchOptions);
}

/**
 * Validazione formale Partita IVA Italiana (11 cifre + controllo Luhn/Modulo 10)
 */
function checkItalianVatLuhn(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  if (vat === '00000000000') return false;

  let sumEven = 0;
  let sumOdd = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat.charAt(i), 10);
    if (i % 2 === 0) {
      // Posizioni dispari (1-based: 1, 3, 5, 7, 9)
      sumOdd += digit;
    } else {
      // Posizioni pari (1-based: 2, 4, 6, 8, 10)
      const doubled = digit * 2;
      sumEven += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const total = sumOdd + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === parseInt(vat.charAt(10), 10);
}

/**
 * Deduzione automatica della Forma Giuridica Zucchetti (ANFORGIU) dalla Ragione Sociale
 */
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

/**
 * Parsing dell'indirizzo restituito da VIES (es. "VIA MEDA GIUSEPPE 14 \n20136 MILANO MI\n")
 */
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
    // Cerca numero civico in fondo alla riga (es. "VIA ROMA 14/A", "VIA TADDEINI N 6", "CORSO ITALIA SNC")
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
    // Formato tipico VIES Italia: "20136 MILANO MI"
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

/**
 * Calcola il prossimo codice cliente Zucchetti nella numerazione standard C + 6 cifre (es. C000165)
 */
async function computeNextZucchettiCustomerCode(reserveInRedis: boolean = false): Promise<string> {
  let maxNum = 164; // Baseline nota su A0002

  // 1. Controlla su Zucchetti (zzna_clienti A0002)
  try {
    const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002&limit=100000&offset=0`;
    const res = await zFetch(url, { headers: getZucchettiHeaders(), cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      const clients: any[] = json.data || json.dataset || json.zzna_clienti || [];
      for (const c of clients) {
        const code = String(c.ancodice || c.Ancodice || '').trim();
        const m = code.match(/^C(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }
  } catch (e) {
    console.warn('Impossibile interrogare zzna_clienti per max code, uso fallback DB/Redis:', e);
  }

  // 2. Controlla anche sul DB B2B locale (b2b_users)
  try {
    const dbUsers = await prisma.b2BUser.findMany({
      where: { zucchettiCode: { startsWith: 'C' } },
      select: { zucchettiCode: true }
    });
    for (const u of dbUsers) {
      const m = (u.zucchettiCode || '').trim().match(/^C(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
  } catch (e) {}

  // 3. Controlla e opzionalmente prenota su Redis per evitare collisioni concorrenti
  try {
    const { redis } = await import('@/lib/redis');
    const redisVal = await redis.get('b2b_zucchetti_last_c_code');
    if (redisVal) {
      const rNum = parseInt(redisVal, 10);
      if (!isNaN(rNum) && rNum > maxNum) maxNum = rNum;
    }

    if (reserveInRedis) {
      let candidateNum = maxNum + 1;
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidateCode = `C${String(candidateNum).padStart(6, '0')}`;
        const locked = await redis.set(`b2b_zucchetti_code_lock:${candidateCode}`, '1', 'EX', 3600, 'NX');
        if (locked === 'OK') {
          await redis.set('b2b_zucchetti_last_c_code', String(candidateNum));
          return candidateCode;
        }
        candidateNum++;
      }
      await redis.set('b2b_zucchetti_last_c_code', String(candidateNum));
      return `C${String(candidateNum).padStart(6, '0')}`;
    }
  } catch (e) {}

  return `C${String(maxNum + 1).padStart(6, '0')}`;
}

export async function getAgentNewClientInitData() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const defaultCategories: CommercialCategoryOption[] = [
    { code: 'riv', label: 'RIV - Rivenditore', discount: 50 },
    { code: 'ist', label: 'IST - Installatore', discount: 40 },
    { code: 'gen', label: 'GEN - Generale', discount: 25 },
  ];

  let categories: CommercialCategoryOption[] = [...defaultCategories];

  try {
    const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_cat_scont?sp_company=A0002&limit=1000&offset=0`;
    const res = await zFetch(url, { headers: getZucchettiHeaders(), cache: 'no-store' });
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
          categories = Array.from(map.values());
        }
      }
    }
  } catch (e) {
    console.warn('Fallback categorie commerciali Zucchetti:', e);
  }

  const nextCodePreview = await computeNextZucchettiCustomerCode(false);
  const agentName =
    session.user.companyName ||
    `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
    session.user.username;

  return {
    success: true,
    agentCode: session.user.zucchettiCode || '',
    agentName,
    nextCodePreview,
    categories,
  };
}

/**
 * Verifica la Partita IVA tramite algoritmo formale Luhn + Portale Europeo Gratuito VIES
 * e controlla eventuali duplicati già registrati in Zucchetti o B2B
 */
export async function validateAndLookupVat(rawVat: string): Promise<VatLookupResult> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return {
      success: false,
      isFormalValid: false,
      isViesValid: false,
      viesChecked: false,
      error: 'Non autorizzato',
    };
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
      viesChecked: false,
      error: 'La Partita IVA italiana deve essere composta da esattamente 11 cifre numeriche.',
    };
  }

  const isFormalValid = checkItalianVatLuhn(cleanVat);
  if (!isFormalValid) {
    return {
      success: false,
      isFormalValid: false,
      isViesValid: false,
      viesChecked: false,
      error: 'Partita IVA formalmente non valida (codice di controllo errato). Verifica le cifre inserite.',
    };
  }

  // Controllo se la P.IVA è già registrata nel portale B2B o su Zucchetti A0002
  let existingWarning: string | undefined;
  try {
    const existingB2B = await prisma.b2BUser.findFirst({
      where: { vatNumber: cleanVat },
      select: { zucchettiCode: true, companyName: true },
    });
    if (existingB2B) {
      existingWarning = `Attenzione: questa Partita IVA risulta già registrata sul portale B2B per "${existingB2B.companyName}" (Cod. ${existingB2B.zucchettiCode || 'N/A'}).`;
    } else {
      const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002&limit=100000&offset=0`;
      const zRes = await zFetch(url, { headers: getZucchettiHeaders(), cache: 'no-store' });
      if (zRes.ok) {
        const zJson: any = await zRes.json();
        const foundZ = (zJson.data || []).find(
          (c: any) => String(c.anpariva || c.Anpariva || '').trim() === cleanVat
        );
        if (foundZ) {
          existingWarning = `Attenzione: questa Partita IVA è già presente in Zucchetti sotto il codice ${foundZ.ancodice} ("${foundZ.andescri}").`;
        }
      }
    }
  } catch (e) {}

  // Interrogazione gratuita API Ufficiale VIES Commissione Europea
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
          viesChecked: true,
          existingWarning,
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
      } else {
        return {
          success: true,
          isFormalValid: true,
          isViesValid: false,
          viesChecked: true,
          existingWarning,
          error:
            'La Partita IVA è formalmente corretta ma non risulta attiva nell\'archivio europeo VIES (o non è abilitata alle operazioni intracomunitarie). Puoi comunque compilare i campi manualmente.',
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
    viesChecked: false,
    existingWarning,
    error: 'Servizio VIES momentaneamente non raggiungibile. Formato P.IVA valido (11 cifre verificate).',
  };
}

/**
 * Ottiene un Token Zucchetti per A0002 ed esegue una richiesta di import BO
 */
async function sendZucchettiBoImport(businessObject: string, xmlPayload: string): Promise<{
  executed: boolean;
  dryRun: boolean;
  log: string;
}> {
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
    throw new Error('Token Zucchetti non ricevuto da /api/getToken');
  }

  try {
    const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
    const importUrl = `${baseUrl}/api/${appId}/${businessObject}`;
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
      throw new Error(`Import ${businessObject} HTTP ${impRes.status}: ${errTxt}`);
    }

    const impJson: any = await impRes.json();
    const message = impJson?.responseStatus?.message || impJson?.message;
    let decodedLog = '';
    if (impJson?.responseData?.result) {
      try {
        decodedLog = Buffer.from(impJson.responseData.result, 'base64').toString('utf-8');
      } catch {
        decodedLog = String(impJson.responseData.result);
      }
    }

    if (message !== 'ok' || decodedLog.includes('GenericResult="ko"') || /Errors\s*:\s*[1-9]/i.test(decodedLog)) {
      const errMatch = decodedLog.match(/ErrorMessage="([^"]+)"/);
      throw new Error(errMatch ? errMatch[1] : decodedLog || `Import ${businessObject} non riuscito`);
    }

    return { executed: true, dryRun: false, log: decodedLog };
  } finally {
    try {
      await zFetch(`${baseUrl}/api/releaseToken`, {
        method: 'POST',
        headers: { authorization: token },
      });
    } catch {}
  }
}

export async function createNewZucchettiClient(input: NewClientFormInput) {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Operazione consentita solo agli agenti.' };
  }

  // Pulizia e validazione campi obbligatori Step 1
  const cleanVat = (input.partitaIva || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  const ragioneSociale = (input.ragioneSociale || '').trim();
  const formaGiuridica = (input.formaGiuridica || '').trim().toUpperCase();
  const indirizzo = (input.indirizzo || '').trim();
  const numeroCivico = (input.numeroCivico || '').trim();
  const cap = (input.cap || '').trim();
  const localita = (input.localita || '').trim();
  const provincia = (input.provincia || '').trim().toUpperCase();
  const email = (input.email || '').trim().toLowerCase();
  const categoriaCommerciale = (input.categoriaCommerciale || '').trim().toLowerCase();
  const pec = (input.pec || '').trim().toLowerCase();
  let codiceDestinatario = (input.codiceDestinatario || '').trim().toUpperCase();

  if (!ragioneSociale) return { success: false, error: 'La Ragione Sociale è obbligatoria.' };
  if (!formaGiuridica) return { success: false, error: 'La Forma Giuridica è obbligatoria.' };
  if (!indirizzo) return { success: false, error: "L'Indirizzo è obbligatorio." };
  if (!numeroCivico) return { success: false, error: 'Il Numero Civico è obbligatorio (inserisci SNC se privo di numero).' };
  if (!cap || !/^\d{5}$/.test(cap)) return { success: false, error: 'Il CAP è obbligatorio e deve contenere 5 cifre.' };
  if (!localita) return { success: false, error: 'La Località è obbligatoria.' };
  if (!provincia || provincia.length !== 2) return { success: false, error: 'La Provincia deve essere la sigla di 2 lettere (es. NA, BN, RM).' };
  if (!cleanVat || !checkItalianVatLuhn(cleanVat)) {
    return { success: false, error: 'La Partita IVA inserita non è formalmente valida (11 cifre).' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Inserisci un indirizzo E-mail valido.' };
  }
  if (!categoriaCommerciale) {
    return { success: false, error: 'Seleziona una Categoria Commerciale.' };
  }

  // Regola Punto 3: Almeno uno tra Codice Destinatario SDI e PEC
  if (!codiceDestinatario && !pec) {
    return {
      success: false,
      error: 'Inserisci almeno uno tra Codice Destinatario (SDI) e Indirizzo PEC.',
    };
  }
  if (!codiceDestinatario && pec) {
    codiceDestinatario = '0000000';
  }
  if (codiceDestinatario && !/^[A-Z0-9]{7}$/.test(codiceDestinatario)) {
    return {
      success: false,
      error: 'Il Codice Destinatario (SDI) deve essere composto da esattamente 7 caratteri alfanumerici (oppure 0000000 se usi solo la PEC).',
    };
  }

  // Se Persona Fisica (PER) o Ditta Individuale (IND), verifica Nome e Cognome
  const isPersonaOrDitta = formaGiuridica === 'PER' || formaGiuridica === 'IND';
  const cognome = (input.cognome || '').trim();
  const nome = (input.nome || '').trim();
  const sesso = (input.sesso || 'M').trim().toUpperCase();
  if (isPersonaOrDitta && (!cognome || !nome)) {
    return {
      success: false,
      error: 'Per Ditta Individuale (IND) o Persona Fisica (PER) sono obbligatori anche Cognome e Nome.',
    };
  }

  // Verifica duplicati su DB B2B
  const existingUserByEmail = await prisma.b2BUser.findUnique({ where: { email } });
  if (existingUserByEmail) {
    return {
      success: false,
      error: `Esiste già un cliente sul portale B2B con l'indirizzo email ${email}.`,
    };
  }

  const existingUserByVat = await prisma.b2BUser.findFirst({ where: { vatNumber: cleanVat } });
  if (existingUserByVat) {
    return {
      success: false,
      error: `Esiste già un cliente sul portale B2B con la Partita IVA ${cleanVat} (${existingUserByVat.companyName}, Cod. ${existingUserByVat.zucchettiCode}).`,
    };
  }

  // Recupero sconto associato alla categoria commerciale scelta
  const initData = await getAgentNewClientInitData();
  const selectedCat = (initData.categories || []).find(c => c.code === categoriaCommerciale);
  const baseDiscount = selectedCat ? selectedCat.discount : categoriaCommerciale === 'riv' ? 50 : categoriaCommerciale === 'ist' ? 40 : 25;
  const customerTypeLabel =
    categoriaCommerciale === 'riv'
      ? 'Rivenditore'
      : categoriaCommerciale === 'ist'
      ? 'Installatore'
      : categoriaCommerciale === 'gen'
      ? 'Generale'
      : categoriaCommerciale.toUpperCase();

  // Prenotazione automatica del Codice Cliente Zucchetti (serie C000xxx)
  const zucchettiCode = await computeNextZucchettiCustomerCode(true);
  const agentZucchettiCode = session.user.zucchettiCode || '';

  // Indirizzo completo per Zucchetti (max 40 char come da specifica ADHOC_CONTI)
  const fullAddress = `${indirizzo}, ${numeroCivico}`.substring(0, 40);
  const descriMax60 = ragioneSociale.substring(0, 60);
  const descri2Max60 = (input.descrizioneAggiuntiva || ragioneSociale.substring(60) || '').substring(0, 60);
  const codiceFiscale = ((input.codiceFiscale || '').trim().toUpperCase() || cleanVat).substring(0, 16);
  const nazione = ((input.nazione || 'ITA').trim().toUpperCase() || 'ITA').substring(0, 3);
  const lingua = ((input.lingua || 'ITA').trim().toUpperCase() || 'ITA').substring(0, 3);
  const codicePagamento = (input.codicePagamento || '').trim().toUpperCase().substring(0, 5);
  const gestioneFido = input.gestioneFido === 'S' ? 'S' : 'N';
  const bloccoSuperamentoFido = input.bloccoSuperamentoFido === 'S' ? 'S' : 'N';
  const bloccoContenzioso = input.bloccoContenzioso === 'S' ? 'S' : 'N';
  const fidoNum = parseFloat(input.importoMaxFido || '0') || 0;
  const maxOrdNum = parseFloat(input.importoMaxOrdine || '0') || 0;

  const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';

  // Costruzione attributi XML per ADHOC_CONTI (Izzo Distribuzione A0002)
  // Campi standard autocompilati come da schermata Zucchetti e XSD ADHOC_CONTI:
  // - ANCONSUP="01030201" (Mastro contabile CLIENTI)
  // - ANCATCON="CLIG" (Categoria contabile CLIENTI GENERICI)
  // - ANPARTSN="S" (Gestione partite: Sì)
  // - ANTIPCON_K="C" (Tipo conto: Cliente)
  // - AddNew="S"
  // - ANCOGNOM, AN__NOME, ANNUMCEL, ANCODPAG (obbligatori nello schema XSD anche se vuoti)
  const baseAttrs: Record<string, string> = {
    AddNew: 'S',
    ANTIPCON_K: 'C',
    ANCODICE_K: zucchettiCode,
    ANCATCON: 'CLIG',
    ANCONSUP: '01030201',
    ANPARTSN: 'S',
    ANCODPAG: codicePagamento,
    AN__NOME: nome.substring(0, 50),
    ANCOGNOM: cognome.substring(0, 50),
    AN_EMAIL: email,
    ANNUMCEL: (input.cellulare?.trim() || '').substring(0, 18),
    ANINDIRI: fullAddress,
    ANLOCALI: localita.substring(0, 50),
    ANPROVIN: provincia.substring(0, 5),
    AN___CAP: cap,
    ANCODFIS: codiceFiscale,
    ANPARIVA: cleanVat,
    ANFORGIU: formaGiuridica,
    DescriNoZoom: descriMax60,
  };

  if (descri2Max60) baseAttrs.ANDESCR2 = descri2Max60;
  if (isPersonaOrDitta) baseAttrs.AN_SESSO = sesso;
  if (input.telefono?.trim()) baseAttrs.ANTELEFO = input.telefono.trim().substring(0, 18);
  if (pec) baseAttrs.AN_EMPEC = pec.substring(0, 254);

  // Attributi estesi del cliente (Agente, Categoria Commerciale, SDI, Fido, Nazione, Lingua)
  const extendedAttrs: Record<string, string> = {
    ...baseAttrs,
    ANNAZION: nazione,
    ANCODLIN: lingua,
    ANCATSCM: categoriaCommerciale,
    CCCODEST: codiceDestinatario,
    ANFLFIDO: gestioneFido,
    ANFLBLVE: bloccoSuperamentoFido,
    ANFLGCON: bloccoContenzioso,
  };
  if (agentZucchettiCode) extendedAttrs.ANCODAG1 = agentZucchettiCode;
  if (fidoNum > 0) extendedAttrs.ANVALFID = fidoNum.toFixed(4);
  if (maxOrdNum > 0) extendedAttrs.ANMAXORD = maxOrdNum.toFixed(4);

  const buildContiXml = (attrs: Record<string, string>) => {
    const attrString = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
      .join(' ');
    return `<ADHOC_CONTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Add_ADHOC_CONTI ${attrString}/></ADHOC_CONTI>`;
  };

  const xmlContiExtended = buildContiXml(extendedAttrs);
  const xmlContiStrict = buildContiXml(baseAttrs);

  let zucchettiSyncStatus: 'SYNCED' | 'DRY_RUN' = 'SYNCED';
  try {
    try {
      const resZ = await sendZucchettiBoImport('ADHOC_CONTI', xmlContiExtended);
      zucchettiSyncStatus = resZ.dryRun ? 'DRY_RUN' : 'SYNCED';
    } catch (extErr: any) {
      // Fallback a schema XSD strict per ADHOC_CONTI
      console.warn('Fallback a schema XSD strict per ADHOC_CONTI:', extErr.message);
      const resZStrict = await sendZucchettiBoImport('ADHOC_CONTI', xmlContiStrict);
      zucchettiSyncStatus = resZStrict.dryRun ? 'DRY_RUN' : 'SYNCED';
    }

    // Se l'agente ha compilato anche una Sede Diversa nello Step 2, inviamo ADHOC_SEDI e DES_DIVE
    if (input.hasSedeDiversa && input.sedeIndirizzo?.trim() && input.sedeLocalita?.trim()) {
      const sedeOfficeId = 'W0001';
      const sedeAttrs: Record<string, string> = {
        OFOFFICEID_K: sedeOfficeId,
        OFDESCRI: (input.sedeDenominazione?.trim() || 'SEDE CONSEGNA').substring(0, 40),
        OFTIPOFF: 'CO',
        OFADDRESS: input.sedeIndirizzo.trim().substring(0, 40),
        OFLOCAL: input.sedeLocalita.trim().substring(0, 50),
        OFPROV: (input.sedeProvincia?.trim().toUpperCase() || provincia).substring(0, 5),
        OFCAP: (input.sedeCap?.trim() || cap).substring(0, 10),
      };
      if (input.sedeTelefono?.trim()) sedeAttrs.OFPHONE = input.sedeTelefono.trim().substring(0, 20);
      if (input.sedeEmail?.trim()) sedeAttrs.OFMAIL = input.sedeEmail.trim().substring(0, 60);

      const sedeAttrStr = Object.entries(sedeAttrs)
        .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
        .join(' ');
      const xmlSede = `<ADHOC_SEDI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Add_ADHOC_SEDI ${sedeAttrStr}/></ADHOC_SEDI>`;

      const desDiveAttrs: Record<string, string> = {
        DDCODDES_K: sedeOfficeId,
        DDCODICE_K: zucchettiCode,
        DDOFFICEID: sedeOfficeId,
        DDTIPCON_K: 'C',
      };
      if (input.sedePersonaRiferimento?.trim()) {
        desDiveAttrs.DDPERSON = input.sedePersonaRiferimento.trim().substring(0, 40);
      }
      if (input.sedeNoteConsegna?.trim()) {
        desDiveAttrs.DD__NOTE = input.sedeNoteConsegna.trim().substring(0, 40);
      }
      const desDiveAttrStr = Object.entries(desDiveAttrs)
        .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
        .join(' ');
      const xmlDesDive = `<DES_DIVE xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Add_DES_DIVE ${desDiveAttrStr}/></DES_DIVE>`;

      try {
        await sendZucchettiBoImport('ADHOC_SEDI', xmlSede);
        await sendZucchettiBoImport('DES_DIVE', xmlDesDive);
      } catch (sedeErr: any) {
        console.warn('Avviso invio Sede Diversa Zucchetti (non bloccante):', sedeErr.message);
      }
    }
  } catch (zErr: any) {
    return {
      success: false,
      error: `Errore durante l'invio dell'anagrafica a Zucchetti (A0002): ${zErr.message}`,
    };
  }

  // Generazione Username univoco e Password temporanea per l'account B2B
  let baseUsername = ragioneSociale
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = `cliente.${zucchettiCode.toLowerCase()}`;
  }

  let finalUsername = baseUsername;
  let uCounter = 0;
  while (uCounter < 50) {
    const existingU = await prisma.b2BUser.findUnique({ where: { username: finalUsername } });
    if (!existingU) break;
    uCounter++;
    finalUsername = `${baseUsername}.${uCounter}`;
  }

  // Genera password temporanea leggibile da 8 caratteri
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const standardElmarkDiscounts: Record<string, number> = {
    E1: 20,
    L: 20,
    C: 5,
    E2: 5,
    F: 5,
  };
  const finalElmarkDiscounts = input.isElmarkCustomer
    ? { ...standardElmarkDiscounts, ...(input.elmarkDiscounts || {}) }
    : {};

  const createdUser = await prisma.b2BUser.create({
    data: {
      username: finalUsername,
      email,
      passwordHash,
      tempPassword,
      mustChangePassword: true,
      firstName: nome || null,
      lastName: cognome || null,
      companyName: ragioneSociale,
      vatNumber: cleanVat,
      zucchettiCode,
      role: 'USER',
      agentId: session.userId,
      customerType: customerTypeLabel,
      fido: fidoNum,
      discount: baseDiscount,
      address: fullAddress,
      city: localita,
      zip: cap,
      province: provincia,
      phone: input.cellulare?.trim() || input.telefono?.trim() || null,
      isElmarkCustomer: Boolean(input.isElmarkCustomer),
      elmarkDiscounts: finalElmarkDiscounts,
      isActive: true,
    },
  });

  revalidatePath('/account');
  revalidatePath('/account/impersonate');

  return {
    success: true,
    client: {
      id: createdUser.id,
      zucchettiCode,
      ragioneSociale,
      formaGiuridica,
      partitaIva: cleanVat,
      codiceFiscale,
      indirizzo: fullAddress,
      cap,
      localita,
      provincia,
      telefono: input.telefono?.trim() || '',
      cellulare: input.cellulare?.trim() || '',
      email,
      pec,
      codiceDestinatario,
      categoriaCommerciale: customerTypeLabel,
      scontoBase: baseDiscount,
      isElmarkCustomer: Boolean(input.isElmarkCustomer),
      elmarkDiscounts: finalElmarkDiscounts,
      agente: `${initData.agentName} (${agentZucchettiCode || 'N/A'})`,
      username: finalUsername,
      tempPassword,
      zucchettiSyncStatus,
      createdAt: new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  };
}
