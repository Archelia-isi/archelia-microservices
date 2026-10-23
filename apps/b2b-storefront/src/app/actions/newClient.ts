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
  customUsername?: string;

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
 * Genera uno username breve, pulito e leggibile a partire dalla Ragione Sociale:
 * - rimuove forme giuridiche (SRL, SNC, SPA, SAS, ecc.)
 * - rimuove le lunghe diciture dei titolari dopo "DI ..." (es. "FERRAMENTA MILANO DI ANGELA..." -> "ferramenta.milano")
 * - mantiene al massimo le prime 2 parole significative (max 22 caratteri)
 */
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

  // Rimuove suffissi societari e forme giuridiche prima del controllo "DI ..."
  cleaned = cleaned
    .replace(
      /\b(SRLS|SRL|SPA|SNC|SAS|SAPA|SCARL|SS|SOC|COOP|COOPERATIVA|SOCIETA|RESPONSABILITA|LIMITATA|UNIPERSONALE|LIQUIDAZIONE|DITTA|INDIVIDUALE|IMPRESA)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  // Rimuove la coda " DI <titolari...>" se prima c'è già il nome dell'insegna/azienda (non un prefisso generico)
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
 * Calcola il prossimo codice cliente Zucchetti nella numerazione standard C + 6 cifre (es. C000167)
 * leggendo esclusivamente i codici realmente occupati su Zucchetti (A0002) e sul DB B2B (b2b_users).
 */
async function computeNextZucchettiCustomerCode(reserveInRedis: boolean = false): Promise<string> {
  const MIN_CODE_NUM = 165; // Prima numerazione portale B2B su A0002
  const occupied = new Set<number>();

  // 1. Controlla tutti i codici realmente presenti su Zucchetti (zzna_clienti A0002)
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
          if (!isNaN(n)) occupied.add(n);
        }
      }
    }
  } catch (e) {
    console.warn('Impossibile interrogare zzna_clienti per codici occupati, uso fallback DB:', e);
  }

  // 2. Controlla anche i codici realmente presenti sul DB B2B locale (b2b_users)
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

  // Trova il primo codice libero a partire da C000165
  let firstFreeNum = MIN_CODE_NUM;
  while (occupied.has(firstFreeNum)) {
    firstFreeNum++;
  }

  // 3. Usa Redis solo come lock istantaneo (15s) durante il salvataggio concorrente,
  // rimuovendo eventuale vecchia chiave permanente b2b_zucchetti_last_c_code
  try {
    const { redis } = await import('@/lib/redis');
    await redis.del('b2b_zucchetti_last_c_code');

    if (reserveInRedis) {
      let candidateNum = firstFreeNum;
      for (let attempt = 0; attempt < 20; attempt++) {
        while (occupied.has(candidateNum)) {
          candidateNum++;
        }
        const candidateCode = `C${String(candidateNum).padStart(6, '0')}`;
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
        candidateNum++;
      }
      return `C${String(candidateNum).padStart(6, '0')}`;
    }
  } catch (e) {}

  return `C${String(firstFreeNum).padStart(6, '0')}`;
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
  if (categoriaCommerciale) baseAttrs.ANCATSCM = categoriaCommerciale.substring(0, 5);
  if (agentZucchettiCode) baseAttrs.ANCODAG1 = agentZucchettiCode.substring(0, 5);

  // Attributi estesi opzionali del cliente (SDI, Fido, Nazione, Lingua)
  const extendedAttrs: Record<string, string> = {
    ...baseAttrs,
    ANNAZION: nazione,
    ANCODLIN: lingua,
    CCCODEST: codiceDestinatario,
    ANFLFIDO: gestioneFido,
    ANFLBLVE: bloccoSuperamentoFido,
    ANFLGCON: bloccoContenzioso,
  };
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
      // Fallback a schema XSD base (con ANCATSCM e ANCODAG1 attivi) per ADHOC_CONTI
      console.warn('Fallback a schema XSD base per ADHOC_CONTI:', extErr.message);
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

  // Generazione Username breve e pulito (es. "ferramenta.milano" o "tecnolight") e Password temporanea
  const rawCustomUsername = (input.customUsername || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 24);

  let baseUsername =
    rawCustomUsername.length >= 3
      ? rawCustomUsername
      : buildSmartBaseUsername(ragioneSociale, cognome, nome);

  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = zucchettiCode.toLowerCase();
  }

  let finalUsername = baseUsername;
  let uCounter = 0;
  while (uCounter < 50) {
    const existingU = await prisma.b2BUser.findUnique({ where: { username: finalUsername } });
    if (!existingU) break;
    uCounter++;
    finalUsername = `${baseUsername}${uCounter}`;
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

  // Non eseguiamo revalidatePath('/account') qui per non attivare la Suspense boundary (loading.tsx)
  // che smonterebbe il componente client NewClientWizard prima della visualizzazione del pop-up.

  const createdAt = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const clientData = {
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
    createdAt,
  };

  // Generazione PDF lato Server (così non dipende mai dalla cache JS del browser)
  const { pdfBase64, pdfFileName } = generateCustomerPdfOnServer(clientData);

  return {
    success: true,
    client: {
      ...clientData,
      pdfBase64,
      pdfFileName,
    },
  };
}

function escapeServerPdfText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function generateCustomerPdfOnServer(client: {
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  localita: string;
  provincia: string;
  telefono: string;
  cellulare: string;
  email: string;
  pec: string;
  codiceDestinatario: string;
  username: string;
  tempPassword: string;
  createdAt: string;
}): { pdfBase64: string; pdfFileName: string } {
  const lines: string[] = [];

  // Sfondo Header Nero
  lines.push('0.08 0.08 0.08 rg');
  lines.push('40 745 515 65 re f');

  // Titolo Header Bianco
  lines.push('1 1 1 RG 1 1 1 rg');
  lines.push('BT /F2 18 Tf 58 782 Td (IZZO DISTRIBUZIONE B2B) Tj ET');
  lines.push('0.85 0.85 0.85 rg');
  lines.push(
    `BT /F1 10 Tf 58 762 Td (RIEPILOGO DATI CLIENTE E CREDENZIALI DI ACCESSO PORTALE B2B - ${escapeServerPdfText(
      client.createdAt
    )}) Tj ET`
  );

  // Box di Benvenuto per il Cliente in alto
  lines.push('0.96 0.98 0.96 rg');
  lines.push('0.13 0.55 0.25 RG 1.2 w');
  lines.push('40 676 515 54 re B');

  lines.push('0.10 0.45 0.20 rg');
  lines.push('BT /F2 11 Tf 58 708 Td (BENVENUTO NEL PORTALE B2B IZZO DISTRIBUZIONE) Tj ET');
  lines.push('0.20 0.20 0.20 rg');
  lines.push(
    'BT /F1 9.5 Tf 58 690 Td (Di seguito trovi il riepilogo dei tuoi dati aziendali registrati e le credenziali personali di accesso.) Tj ET'
  );

  // Sezione 1: Dati Anagrafici e di Fatturazione del Cliente
  lines.push('0.08 0.08 0.08 rg');
  lines.push('BT /F2 13 Tf 40 648 Td (1. I TUOI DATI ANAGRAFICI E DI FATTURAZIONE) Tj ET');
  lines.push('0.80 0.80 0.80 RG 0.8 w');
  lines.push('40 640 m 555 640 l S');

  const contacts = [
    client.telefono ? `Tel: ${client.telefono}` : '',
    client.cellulare ? `Cell: ${client.cellulare}` : '',
  ]
    .filter(Boolean)
    .join('   -   ');

  const rows: Array<[string, string]> = [
    ['Ragione Sociale:', client.ragioneSociale],
    ['Partita IVA:', client.partitaIva],
    ['Codice Fiscale:', client.codiceFiscale || client.partitaIva],
    ['Indirizzo Sede Legale:', `${client.indirizzo} - ${client.cap} ${client.localita} (${client.provincia})`],
    ['Recapiti Telefonici:', contacts || '-'],
    ['E-mail di Riferimento:', client.email],
    ['Codice Destinatario SDI:', client.codiceDestinatario || '0000000'],
    ['Indirizzo PEC:', client.pec || '-'],
  ];

  let y = 616;
  for (const [label, value] of rows) {
    lines.push('0.35 0.35 0.35 rg');
    lines.push(`BT /F2 10 Tf 48 ${y} Td (${escapeServerPdfText(label)}) Tj ET`);
    lines.push('0.05 0.05 0.05 rg');
    lines.push(`BT /F1 10 Tf 200 ${y} Td (${escapeServerPdfText(value.substring(0, 72))}) Tj ET`);
    lines.push('0.92 0.92 0.92 RG 0.5 w');
    lines.push(`40 ${y - 8} m 555 ${y - 8} l S`);
    y -= 26;
  }

  // Sezione 2: Box Credenziali Portale B2B per il Cliente
  const boxTop = y - 14;
  const boxHeight = 165;
  const boxBottom = boxTop - boxHeight;

  lines.push('0.99 0.97 0.92 rg');
  lines.push('0.85 0.55 0.10 RG 1.5 w');
  lines.push(`40 ${boxBottom} 515 ${boxHeight} re B`);

  lines.push('0.65 0.35 0.02 rg');
  lines.push(`BT /F2 13 Tf 58 ${boxTop - 26} Td (2. LE TUE CREDENZIALI DI ACCESSO AL PORTALE B2B) Tj ET`);

  const hasTempPassword = Boolean(client.tempPassword && client.tempPassword.trim());

  lines.push('0.20 0.20 0.20 rg');
  lines.push(
    `BT /F1 10 Tf 58 ${boxTop - 46} Td (${
      hasTempPassword
        ? 'Utilizza queste credenziali per effettuare il primo accesso alla tua area riservata B2B:'
        : 'Riepilogo delle tue credenziali di accesso alla tua area riservata B2B:'
    }) Tj ET`
  );

  lines.push('0.05 0.05 0.05 rg');
  lines.push(`BT /F2 11 Tf 58 ${boxTop - 72} Td (Portale Web B2B:) Tj ET`);
  lines.push(`BT /F2 11 Tf 200 ${boxTop - 72} Td (www.izzodistribuzione.it) Tj ET`);

  lines.push(`BT /F2 11 Tf 58 ${boxTop - 98} Td (Username:) Tj ET`);
  lines.push(`BT /F2 14 Tf 200 ${boxTop - 98} Td (${escapeServerPdfText(client.username)}) Tj ET`);

  if (hasTempPassword) {
    lines.push(`BT /F2 11 Tf 58 ${boxTop - 124} Td (Password Temporanea:) Tj ET`);
    lines.push(`BT /F2 14 Tf 200 ${boxTop - 124} Td (${escapeServerPdfText(client.tempPassword)}) Tj ET`);

    lines.push('0.40 0.40 0.40 rg');
    lines.push(
      `BT /F1 9 Tf 58 ${boxTop - 148} Td (Nota: Al primo accesso il sistema ti chiedera' automaticamente di impostare una password personale.) Tj ET`
    );
  } else {
    lines.push(`BT /F2 11 Tf 58 ${boxTop - 124} Td (Password:) Tj ET`);
    lines.push('0.10 0.45 0.20 rg');
    lines.push(`BT /F2 12 Tf 200 ${boxTop - 124} Td (Password impostata dal cliente) Tj ET`);

    lines.push('0.40 0.40 0.40 rg');
    lines.push(
      `BT /F1 9 Tf 58 ${boxTop - 148} Td (Nota: Accedi con la password personale che hai scelto al primo accesso.) Tj ET`
    );
  }

  // Footer
  lines.push('0.55 0.55 0.55 rg');
  lines.push(
    'BT /F1 8 Tf 40 45 Td (Izzo Distribuzione S.r.l. - Portale B2B \\(www.izzodistribuzione.it\\) - Documento riservato al cliente.) Tj ET'
  );

  const contentStream = lines.join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n'
  );
  objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const safeName = client.ragioneSociale.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const pdfFileName = `Credenziali_B2B_${safeName}.pdf`;
  const pdfBase64 = Buffer.from(pdf, 'latin1').toString('base64');

  return { pdfBase64, pdfFileName };
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
}

export interface ActivateZucchettiClientB2BInput {
  zucchettiCode: string;
  companyName: string;
  vatNumber?: string;
  codiceFiscale?: string;
  formaGiuridica?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  zip?: string;
  city?: string;
  province?: string;
  phone?: string;
  telefonoFisso?: string;
  email: string;
  pec?: string;
  codiceDestinatario?: string;
  username: string;
  categoriaCommerciale: string;
  discount: number;
  isElmarkCustomer: boolean;
  elmarkDiscounts?: Record<string, number>;
}

export interface UpdateAgentClientInput {
  id: string;
  companyName: string;
  vatNumber: string;
  codiceFiscale?: string;
  formaGiuridica?: string;
  firstName?: string;
  lastName?: string;
  address: string;
  zip: string;
  city: string;
  province: string;
  phone?: string;
  telefonoFisso?: string;
  email: string;
  pec?: string;
  codiceDestinatario?: string;
  username: string;
  categoriaCommerciale: string;
  discount: number;
  fido?: number;
  codicePagamento?: string;
  isElmarkCustomer: boolean;
  elmarkDiscounts?: Record<string, number>;
  isActive: boolean;
}

export async function getAgentClientsList(): Promise<{
  success: boolean;
  error?: string;
  agentName?: string;
  agentCode?: string;
  categories?: CommercialCategoryOption[];
  clients?: AgentManagedClient[];
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const initData = await getAgentNewClientInitData();
  const categories = initData.categories || [
    { code: 'riv', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
    { code: 'ist', label: 'IST - Installatore (Sconto base 40%)', discount: 40 },
    { code: 'gen', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
  ];

  // Carica anagrafica live Zucchetti (A0002) per arricchire PEC, SDI, Forma Giuridica, Cod. Fiscale
  const zucchettiMap = new Map<string, any>();
  try {
    const url = `${getZucchettiBaseUrl()}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002&limit=100000&offset=0`;
    const res = await zFetch(url, { headers: getZucchettiHeaders(), cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      const rows: any[] = json.data || json.dataset || json.zzna_clienti || [];
      for (const r of rows) {
        const code = String(r.ancodice || r.Ancodice || '').trim().toUpperCase();
        if (code) zucchettiMap.set(code, r);
      }
    }
  } catch (e) {
    console.warn('Avviso lettura zzna_clienti in getAgentClientsList:', e);
  }

  // Tutti i codici Zucchetti e P.IVA già registrati sul DB B2B (anche di altri agenti)
  const allExistingB2B = await prisma.b2BUser.findMany({
    where: { role: 'USER' },
    select: { zucchettiCode: true, vatNumber: true },
  });
  const existingB2BCodes = new Set<string>();
  const existingB2BVats = new Set<string>();
  for (const row of allExistingB2B) {
    if (row.zucchettiCode) existingB2BCodes.add(row.zucchettiCode.trim().toUpperCase());
    if (row.vatNumber) existingB2BVats.add(row.vatNumber.trim().toUpperCase());
  }

  const dbClients = await prisma.b2BUser.findMany({
    where: {
      agentId: session.userId,
      role: 'USER',
    },
    include: {
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const standardElmarkDiscounts: Record<string, number> = {
    E1: 20,
    L: 20,
    C: 5,
    E2: 5,
    F: 5,
  };

  const mappedB2B: AgentManagedClient[] = dbClients.map(u => {
    const zCode = (u.zucchettiCode || '').trim().toUpperCase();
    const zRow = zCode ? zucchettiMap.get(zCode) : null;

    const rawCatFromType = (u.customerType || '').split('-')[0]?.trim().toLowerCase();
    const zCat = String(zRow?.ancatscm || zRow?.Ancatscm || '').trim().toLowerCase();
    const matchedCat =
      categories.find(c => c.code.toLowerCase() === rawCatFromType) ||
      categories.find(c => c.code.toLowerCase() === zCat) ||
      categories.find(c => c.discount === u.discount) ||
      categories[0];

    const rawElmark =
      u.elmarkDiscounts && typeof u.elmarkDiscounts === 'object'
        ? (u.elmarkDiscounts as Record<string, number>)
        : {};

    return {
      id: u.id,
      hasB2BAccount: true,
      zucchettiCode: u.zucchettiCode || '',
      companyName: u.companyName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.username,
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
      customerType: u.customerType || matchedCat?.label || 'RIV - Rivenditore',
      categoriaCode: matchedCat?.code || 'riv',
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
    };
  });

  // Aggiunge i clienti già presenti in Zucchetti (A0002) che non hanno ancora credenziali B2B
  const normAgentCode = (initData.agentCode || '').replace(/^0+/, '').toUpperCase();
  const zucchettiOnlyClients: AgentManagedClient[] = [];

  for (const [zCode, zRow] of Array.from(zucchettiMap.entries())) {
    if (existingB2BCodes.has(zCode)) continue;
    const zVat = String(zRow?.anpariva || zRow?.Anpariva || '').trim().toUpperCase();
    if (zVat && existingB2BVats.has(zVat)) continue;

    // Se su Zucchetti il cliente è assegnato a un altro agente specifico, mostra solo quelli dell'agente corrente o senza agente
    const rowAgent = String(zRow?.ancodag1 || zRow?.Ancodag1 || '').trim().replace(/^0+/, '').toUpperCase();
    if (normAgentCode && rowAgent && rowAgent !== normAgentCode) {
      continue;
    }

    const companyName = String(zRow?.andescri || zRow?.Andescri || '').trim();
    if (!companyName) continue;

    const firstName = String(zRow?.an__nome || zRow?.An__nome || '').trim();
    const lastName = String(zRow?.ancognom || zRow?.Ancognom || '').trim();
    const zCat = String(zRow?.ancatscm || zRow?.Ancatscm || '').trim().toLowerCase();
    const matchedCat =
      categories.find(c => c.code.toLowerCase() === zCat) || categories[0];

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
      phone: String(zRow?.annumcel || zRow?.Annumcel || zRow?.antelefo || zRow?.Antelefo || '').trim(),
      telefonoFisso: String(zRow?.antelefo || zRow?.Antelefo || '').trim(),
      email: String(zRow?.an_email || zRow?.An_email || '').trim().toLowerCase(),
      pec: String(zRow?.an_empec || zRow?.An_empec || '').trim().toLowerCase(),
      codiceDestinatario: String(zRow?.cccodest || zRow?.Cccodest || '0000000').trim() || '0000000',
      username: suggestedUsername,
      tempPassword: '',
      mustChangePassword: true,
      customerType: matchedCat ? matchedCat.label.replace(/\s*\(Sconto.*\)$/i, '') : 'RIV - Rivenditore',
      categoriaCode: matchedCat?.code || 'riv',
      discount: matchedCat?.discount ?? 50,
      fido: parseFloat(String(zRow?.anvalfid || zRow?.Anvalfid || '0')) || 0,
      codicePagamento: String(zRow?.ancodpag || zRow?.Ancodpag || '').trim(),
      isElmarkCustomer: false,
      elmarkDiscounts: {},
      isActive: false,
      ordersCount: 0,
      createdAt: new Date(0).toISOString(),
    });
  }

  // Ordina i clienti solo-Zucchetti per codice decrescente (i più recenti in alto)
  zucchettiOnlyClients.sort((a, b) => b.zucchettiCode.localeCompare(a.zucchettiCode));

  return {
    success: true,
    agentName: initData.agentName || session.user.username,
    agentCode: initData.agentCode || '',
    categories,
    clients: [...mappedB2B, ...zucchettiOnlyClients],
  };
}

export async function updateAgentClient(input: UpdateAgentClientInput): Promise<{
  success: boolean;
  error?: string;
  zucchettiUpdated?: boolean;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Operazione consentita solo agli agenti.' };
  }

  const existing = await prisma.b2BUser.findUnique({
    where: { id: input.id },
  });

  if (!existing || existing.agentId !== session.userId) {
    return { success: false, error: 'Cliente non trovato o non associato al tuo profilo agente.' };
  }

  const companyName = (input.companyName || '').trim();
  const cleanVat = (input.vatNumber || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  const address = (input.address || '').trim();
  const zip = (input.zip || '').trim();
  const city = (input.city || '').trim();
  const province = (input.province || '').trim().toUpperCase();
  const email = (input.email || '').trim().toLowerCase();
  const cleanUsername = (input.username || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 30);

  if (!companyName) {
    return { success: false, error: 'La Ragione Sociale è obbligatoria.' };
  }
  if (!cleanVat || !/^\d{11}$/.test(cleanVat)) {
    return { success: false, error: 'La Partita IVA deve essere di 11 cifre valide.' };
  }
  if (!address || !city || province.length !== 2 || !/^\d{5}$/.test(zip)) {
    return { success: false, error: 'Verifica Indirizzo, CAP (5 cifre), Località e Provincia (2 lettere).' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Inserisci un indirizzo E-mail valido.' };
  }
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Lo Username B2B deve avere almeno 3 caratteri.' };
  }

  // Verifica unicità username ed email se modificati
  if (cleanUsername !== existing.username) {
    const dupUser = await prisma.b2BUser.findUnique({ where: { username: cleanUsername } });
    if (dupUser && dupUser.id !== existing.id) {
      return { success: false, error: `Lo username "${cleanUsername}" è già in uso da un altro cliente.` };
    }
  }
  if (email !== existing.email) {
    const dupEmail = await prisma.b2BUser.findUnique({ where: { email } });
    if (dupEmail && dupEmail.id !== existing.id) {
      return { success: false, error: `L'indirizzo email "${email}" è già registrato su un altro cliente.` };
    }
  }

  const initData = await getAgentNewClientInitData();
  const selectedCat = initData.categories?.find(
    c => c.code.toLowerCase() === (input.categoriaCommerciale || '').toLowerCase()
  );
  const customerTypeLabel = selectedCat
    ? selectedCat.label.replace(/\s*\(Sconto.*\)$/i, '')
    : (input.categoriaCommerciale || 'RIV').toUpperCase();
  const discountVal =
    typeof input.discount === 'number' && !isNaN(input.discount)
      ? input.discount
      : selectedCat?.discount ?? existing.discount;

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

  await prisma.b2BUser.update({
    where: { id: existing.id },
    data: {
      companyName,
      vatNumber: cleanVat,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      address,
      zip,
      city,
      province,
      phone: input.phone?.trim() || input.telefonoFisso?.trim() || null,
      email,
      username: cleanUsername,
      customerType: customerTypeLabel,
      discount: discountVal,
      fido: typeof input.fido === 'number' && !isNaN(input.fido) ? input.fido : existing.fido,
      isElmarkCustomer: Boolean(input.isElmarkCustomer),
      elmarkDiscounts: finalElmarkDiscounts,
      isActive: Boolean(input.isActive),
    },
  });

  // Sincronizza l'aggiornamento anche su Zucchetti (ADHOC_CONTI) se il cliente ha un codice Zucchetti
  let zucchettiUpdated = false;
  if (existing.zucchettiCode) {
    try {
      const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
      const formaGiuridica = (input.formaGiuridica || inferFormaGiuridica(companyName)).toUpperCase();
      const isPersonaOrDitta = formaGiuridica === 'IND' || formaGiuridica === 'PER';
      const codiceFiscale = (input.codiceFiscale || cleanVat).toUpperCase().trim().substring(0, 16);
      const pec = (input.pec || '').trim().toLowerCase();
      const codiceDestinatario = (input.codiceDestinatario || '0000000').trim().toUpperCase();

      const attrs: Record<string, string> = {
        ANTIPCON_K: 'C',
        ANCODICE_K: existing.zucchettiCode,
        ANTIPCON: 'C',
        ANCODICE: existing.zucchettiCode,
        ANDESCRI: companyName.substring(0, 60),
        ANPERSON: isPersonaOrDitta ? 'F' : 'G',
        ANCODMAS: '01.03',
        ANTIPCLF: 'CLIG',
        ANPARTSN: 'S',
        ANCODPAG: (input.codicePagamento || '').trim().substring(0, 5),
        AN__NOME: (input.firstName || '').trim().substring(0, 50),
        ANCOGNOM: (input.lastName || '').trim().substring(0, 50),
        AN_EMAIL: email,
        ANNUMCEL: (input.phone || '').trim().substring(0, 18),
        ANINDIRI: address.substring(0, 32),
        ANLOCALI: city.substring(0, 50),
        ANPROVIN: province.substring(0, 5),
        AN___CAP: zip,
        ANCODFIS: codiceFiscale,
        ANPARIVA: cleanVat,
        ANFORGIU: formaGiuridica,
        DescriNoZoom: companyName.substring(0, 60),
      };
      if (input.telefonoFisso?.trim()) attrs.ANTELEFO = input.telefonoFisso.trim().substring(0, 18);
      if (pec) attrs.AN_EMPEC = pec.substring(0, 254);
      if (input.categoriaCommerciale) attrs.ANCATSCM = input.categoriaCommerciale.trim().substring(0, 5);
      if (initData.agentCode) attrs.ANCODAG1 = initData.agentCode.substring(0, 5);
      if (codiceDestinatario) attrs.CCCODEST = codiceDestinatario;

      const attrString = Object.entries(attrs)
        .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
        .join(' ');

      try {
        const xmlUpd = `<ADHOC_CONTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Update_ADHOC_CONTI ${attrString}/></ADHOC_CONTI>`;
        await sendZucchettiBoImport('ADHOC_CONTI', xmlUpd);
        zucchettiUpdated = true;
      } catch {
        const xmlAdd = `<ADHOC_CONTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Add_ADHOC_CONTI ${attrString}/></ADHOC_CONTI>`;
        await sendZucchettiBoImport('ADHOC_CONTI', xmlAdd);
        zucchettiUpdated = true;
      }
    } catch (zErr: any) {
      console.warn('Avviso aggiornamento ADHOC_CONTI Zucchetti (DB B2B già aggiornato):', zErr.message);
    }
  }

  return { success: true, zucchettiUpdated };
}

export async function generateClientCredentialsPdfAction(
  clientId: string,
  regeneratePassword: boolean = false
): Promise<{
  success: boolean;
  error?: string;
  tempPassword?: string;
  pdfBase64?: string;
  pdfFileName?: string;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Non autorizzato' };
  }

  const user = await prisma.b2BUser.findUnique({ where: { id: clientId } });
  if (!user || user.agentId !== session.userId) {
    return { success: false, error: 'Cliente non trovato.' };
  }

  let tempPassword = user.mustChangePassword && user.tempPassword ? user.tempPassword : '';
  if (regeneratePassword) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.b2BUser.update({
      where: { id: user.id },
      data: {
        tempPassword,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  const createdAt = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { pdfBase64, pdfFileName } = generateCustomerPdfOnServer({
    ragioneSociale: user.companyName || user.username,
    partitaIva: user.vatNumber || '',
    codiceFiscale: user.vatNumber || '',
    indirizzo: user.address || '',
    cap: user.zip || '',
    localita: user.city || '',
    provincia: user.province || '',
    telefono: '',
    cellulare: user.phone || '',
    email: user.email || '',
    pec: '',
    codiceDestinatario: '0000000',
    username: user.username,
    tempPassword,
    createdAt,
  });

  return {
    success: true,
    tempPassword,
    pdfBase64,
    pdfFileName,
  };
}

/**
 * Crea un utente B2B (con username breve, password temporanea e PDF credenziali)
 * per un cliente già esistente su Zucchetti (A0002) ma ancora sprovvisto di credenziali B2B.
 */
export async function createB2BUserFromZucchettiClient(
  input: ActivateZucchettiClientB2BInput
): Promise<{
  success: boolean;
  error?: string;
  managedClient?: AgentManagedClient;
  pdfBase64?: string;
  pdfFileName?: string;
}> {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    return { success: false, error: 'Operazione consentita solo agli agenti.' };
  }

  const zucchettiCode = (input.zucchettiCode || '').trim().toUpperCase();
  const companyName = (input.companyName || '').trim();
  const cleanVat = (input.vatNumber || '').toUpperCase().replace(/^IT/, '').replace(/\s+/g, '').trim();
  const email = (input.email || '').trim().toLowerCase();

  if (!zucchettiCode) {
    return { success: false, error: 'Codice cliente Zucchetti mancante.' };
  }
  if (!companyName) {
    return { success: false, error: 'Ragione Sociale mancante.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      error: 'Inserisci un indirizzo E-mail valido per attivare le credenziali B2B.',
    };
  }

  // Verifica che questo codice Zucchetti non abbia già un account B2B
  const existingCode = await prisma.b2BUser.findUnique({ where: { zucchettiCode } });
  if (existingCode) {
    return {
      success: false,
      error: `Il cliente ${zucchettiCode} possiede già un account B2B attivo (${existingCode.username}).`,
    };
  }

  const existingEmail = await prisma.b2BUser.findUnique({ where: { email } });
  if (existingEmail) {
    return {
      success: false,
      error: `L'indirizzo email "${email}" è già utilizzato da un altro utente B2B (${existingEmail.companyName || existingEmail.username}).`,
    };
  }

  const rawCustomUsername = (input.username || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 24);

  let baseUsername =
    rawCustomUsername.length >= 3
      ? rawCustomUsername
      : buildSmartBaseUsername(companyName, input.lastName, input.firstName);

  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = zucchettiCode.toLowerCase();
  }

  let finalUsername = baseUsername;
  let uCounter = 0;
  while (uCounter < 50) {
    const dupU = await prisma.b2BUser.findUnique({ where: { username: finalUsername } });
    if (!dupU) break;
    uCounter++;
    finalUsername = `${baseUsername}${uCounter}`;
  }

  // Genera password temporanea da 8 caratteri
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const initData = await getAgentNewClientInitData();
  const selectedCat = initData.categories?.find(
    c => c.code.toLowerCase() === (input.categoriaCommerciale || '').toLowerCase()
  );
  const customerTypeLabel = selectedCat
    ? selectedCat.label.replace(/\s*\(Sconto.*\)$/i, '')
    : (input.categoriaCommerciale || 'RIV').toUpperCase();
  const discountVal =
    typeof input.discount === 'number' && !isNaN(input.discount)
      ? input.discount
      : selectedCat?.discount ?? 50;

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
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      companyName,
      vatNumber: cleanVat || null,
      zucchettiCode,
      role: 'USER',
      agentId: session.userId,
      customerType: customerTypeLabel,
      discount: discountVal,
      address: input.address?.trim() || null,
      zip: input.zip?.trim() || null,
      city: input.city?.trim() || null,
      province: input.province?.trim().toUpperCase() || null,
      phone: input.phone?.trim() || input.telefonoFisso?.trim() || null,
      isElmarkCustomer: Boolean(input.isElmarkCustomer),
      elmarkDiscounts: finalElmarkDiscounts,
      isActive: true,
    },
  });

  // Aggiorna in background anche Zucchetti (es. se l'agente ha aggiunto l'email mancante)
  try {
    const appId = process.env.ZUCCHETTI_APPLICATION_ID || '00004';
    const formaGiuridica = (input.formaGiuridica || inferFormaGiuridica(companyName)).toUpperCase();
    const isPersonaOrDitta = formaGiuridica === 'IND' || formaGiuridica === 'PER';
    const attrs: Record<string, string> = {
      ANTIPCON_K: 'C',
      ANCODICE_K: zucchettiCode,
      ANTIPCON: 'C',
      ANCODICE: zucchettiCode,
      ANDESCRI: companyName.substring(0, 60),
      ANPERSON: isPersonaOrDitta ? 'F' : 'G',
      ANCODMAS: '01.03',
      ANTIPCLF: 'CLIG',
      ANPARTSN: 'S',
      AN_EMAIL: email,
      ANFORGIU: formaGiuridica,
      DescriNoZoom: companyName.substring(0, 60),
    };
    if (cleanVat) attrs.ANPARIVA = cleanVat;
    if (input.codiceFiscale || cleanVat) attrs.ANCODFIS = (input.codiceFiscale || cleanVat).substring(0, 16);
    if (input.address?.trim()) attrs.ANINDIRI = input.address.trim().substring(0, 32);
    if (input.city?.trim()) attrs.ANLOCALI = input.city.trim().substring(0, 50);
    if (input.province?.trim()) attrs.ANPROVIN = input.province.trim().toUpperCase().substring(0, 5);
    if (input.zip?.trim()) attrs.AN___CAP = input.zip.trim().substring(0, 10);
    if (input.phone?.trim()) attrs.ANNUMCEL = input.phone.trim().substring(0, 18);
    if (input.categoriaCommerciale) attrs.ANCATSCM = input.categoriaCommerciale.trim().substring(0, 5);
    if (initData.agentCode) attrs.ANCODAG1 = initData.agentCode.substring(0, 5);

    const attrString = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
      .join(' ');
    const xmlUpd = `<ADHOC_CONTI xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ConsolidationDate="01-01-1900" applicationId="${appId}"><Update_ADHOC_CONTI ${attrString}/></ADHOC_CONTI>`;
    await sendZucchettiBoImport('ADHOC_CONTI', xmlUpd);
  } catch (e) {}

  const createdAt = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { pdfBase64, pdfFileName } = generateCustomerPdfOnServer({
    ragioneSociale: companyName,
    partitaIva: cleanVat,
    codiceFiscale: input.codiceFiscale || cleanVat,
    indirizzo: input.address || '',
    cap: input.zip || '',
    localita: input.city || '',
    provincia: input.province || '',
    telefono: input.telefonoFisso || '',
    cellulare: input.phone || '',
    email,
    pec: input.pec || '',
    codiceDestinatario: input.codiceDestinatario || '0000000',
    username: finalUsername,
    tempPassword,
    createdAt,
  });

  const managedClient: AgentManagedClient = {
    id: createdUser.id,
    hasB2BAccount: true,
    zucchettiCode,
    companyName,
    vatNumber: cleanVat,
    codiceFiscale: input.codiceFiscale || cleanVat,
    formaGiuridica: (input.formaGiuridica || inferFormaGiuridica(companyName)).toUpperCase(),
    firstName: input.firstName || '',
    lastName: input.lastName || '',
    address: input.address || '',
    zip: input.zip || '',
    city: input.city || '',
    province: input.province || '',
    phone: input.phone || '',
    telefonoFisso: input.telefonoFisso || '',
    email,
    pec: input.pec || '',
    codiceDestinatario: input.codiceDestinatario || '0000000',
    username: finalUsername,
    tempPassword,
    mustChangePassword: true,
    customerType: customerTypeLabel,
    categoriaCode: input.categoriaCommerciale || 'riv',
    discount: discountVal,
    fido: 0,
    codicePagamento: '',
    isElmarkCustomer: Boolean(input.isElmarkCustomer),
    elmarkDiscounts: finalElmarkDiscounts,
    isActive: true,
    ordersCount: 0,
    createdAt: createdUser.createdAt.toISOString(),
  };

  return {
    success: true,
    managedClient,
    pdfBase64,
    pdfFileName,
  };
}
