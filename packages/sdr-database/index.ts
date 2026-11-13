import { PrismaClient } from '@prisma/client-sdr';
import * as crypto from 'crypto';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForSdrPrisma = globalThis as unknown as {
  sdrPrisma: PrismaClientSingleton | undefined;
};

export const sdrPrisma = globalForSdrPrisma.sdrPrisma ?? prismaClientSingleton();
export const prisma = sdrPrisma;

if (process.env.NODE_ENV !== 'production') globalForSdrPrisma.sdrPrisma = sdrPrisma;

export * from '@prisma/client-sdr';

// ============================================================================
// 1. DIZIONARIO UNIFICATO DEI 11 CLUSTER B2B REALI (+ ALIAS DI RICERCA)
// ============================================================================

export type CanonicalB2BCluster =
  | 'Installatore_Civile'
  | 'Impresa_Edile'
  | 'Rivendita_Edile'
  | 'Termoidraulica_Clima'
  | 'Fotovoltaico_Rinnovabili'
  | 'Sicurezza_Automazione'
  | 'Architetto_Ingegnere'
  | 'Serramentista'
  | 'Quadrista'
  | 'Ferramenta'
  | 'Illuminazione';

export interface B2BClusterConfig {
  cluster: CanonicalB2BCluster;
  label: string;
  shortLabel: string;
  commercialCategory: 'IST' | 'RIV';
  baseDiscount: 40 | 50;
  atecoDefault: string;
  recommendedFamily: string;
  catalogKeywords: string[];
  queries: string[];
}

export const CANONICAL_B2B_CLUSTERS: readonly CanonicalB2BCluster[] = [
  'Installatore_Civile',
  'Impresa_Edile',
  'Rivendita_Edile',
  'Termoidraulica_Clima',
  'Fotovoltaico_Rinnovabili',
  'Sicurezza_Automazione',
  'Architetto_Ingegnere',
  'Serramentista',
  'Quadrista',
  'Ferramenta',
  'Illuminazione',
] as const;

export const B2B_CLUSTER_REGISTRY: Record<CanonicalB2BCluster, B2BClusterConfig> = {
  Installatore_Civile: {
    cluster: 'Installatore_Civile',
    label: '⚡ Installatori Elettrici Civili & Industriali',
    shortLabel: 'Installatori Elettrici',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '43.21.01',
    recommendedFamily: 'Interruttori Automatici, Differenziali, Quadri Elettrici & Moduli DIN',
    catalogKeywords: ['magnetotermico', 'differenziale', 'quadro', 'plafoniera', 'faretto', 'cavo'],
    queries: [
      'installatore impianti elettrici',
      'impianti elettrici civili e industriali',
      'elettricista',
      'manutenzione impianti elettrici',
    ],
  },
  Impresa_Edile: {
    cluster: 'Impresa_Edile',
    label: '🏗️ Imprese Edili, Costruttori & General Contractor',
    shortLabel: 'Imprese Edili',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '41.20.00',
    recommendedFamily: 'Quadri da Cantiere ASC, Proiettori LED Alta Potenza, Spine/Prese CEE & Illuminazione Civile',
    catalogKeywords: ['proiettore', 'cantiere', 'industriale', 'stagn', 'pannello led', 'emergenza'],
    queries: [
      'impresa edile',
      'costruzioni edili',
      'ristrutturazioni chiavi in mano',
      'general contractor',
    ],
  },
  Rivendita_Edile: {
    cluster: 'Rivendita_Edile',
    label: '🏪 Rivendite Edili, Grossisti & Distributori Materiale Elettrico',
    shortLabel: 'Rivendite & Grossisti',
    commercialCategory: 'RIV',
    baseDiscount: 50,
    atecoDefault: '46.69.20',
    recommendedFamily: 'Catalogo Completo Pronta Consegna 2gg (Illuminazione LED, Materiale Elettrico & Minuteria)',
    catalogKeywords: ['lampadina', 'proiettore', 'plafoniera', 'magnetotermico', 'multipresa', 'strip led'],
    queries: [
      'forniture materiale elettrico',
      'ingrosso materiale elettrico',
      'rivendita materiale edile',
      'elettroforniture',
    ],
  },
  Termoidraulica_Clima: {
    cluster: 'Termoidraulica_Clima',
    label: '❄️ Termoidraulica, Climatizzazione & Impianti HVAC',
    shortLabel: 'Termoidraulica & Clima',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '43.22.01',
    recommendedFamily: 'Magnetotermici, Contattori, Cronotermostati, Scatole Stagne & Quadri Comando HVAC',
    catalogKeywords: ['contattore', 'magnetotermico', 'termostato', 'scatola', 'aspiratore', 'ventil'],
    queries: [
      'termoidraulica',
      'impianti termoidraulici',
      'installatore climatizzazione',
      'impianti riscaldamento',
    ],
  },
  Fotovoltaico_Rinnovabili: {
    cluster: 'Fotovoltaico_Rinnovabili',
    label: '☀️ Installatori Fotovoltaico & Energie Rinnovabili',
    shortLabel: 'Fotovoltaico & Rinnovabili',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '43.21.01',
    recommendedFamily: 'Protezioni DC/AC, Scaricatori di Sovratensione SPD, Sezionatori & Quadri Stringa',
    catalogKeywords: ['scaricatore', 'fusibil', 'sezionatore', 'solare', 'fotovoltaic', 'quadro'],
    queries: [
      'impianti fotovoltaici',
      'installatore fotovoltaico',
      'energie rinnovabili',
      'pannelli solari',
    ],
  },
  Sicurezza_Automazione: {
    cluster: 'Sicurezza_Automazione',
    label: '🔒 Videosorveglianza, Antifurto, Domotica & Automazione Cancelli',
    shortLabel: 'Sicurezza & Automazione',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '43.21.02',
    recommendedFamily: 'Alimentatori Stabilizzati, UPS, Box Stagni IP65, Sensori & Proiettori LED con Sensore',
    catalogKeywords: ['alimentatore', 'sensore', 'crepuscolare', 'stagn', 'proiettore', 'emergenza'],
    queries: [
      'impianti videosorveglianza',
      'impianti antifurto',
      'sistemi di sicurezza',
      'automazione cancelli',
    ],
  },
  Architetto_Ingegnere: {
    cluster: 'Architetto_Ingegnere',
    label: '📐 Studi di Architettura, Ingegneria & Progettazione Illuminotecnica',
    shortLabel: 'Architetti & Ingegneri',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '71.11.00',
    recommendedFamily: 'Illuminazione Architetturale, Binari Magnetici, Faretti Design, Strip LED & Profili Alluminio',
    catalogKeywords: ['lampadario', 'sospensione', 'faretto', 'binario', 'strip led', 'applique'],
    queries: [
      'studio architettura',
      'studio ingegneria impiantistica',
      'progettazione illuminotecnica',
      'lighting design',
    ],
  },
  Serramentista: {
    cluster: 'Serramentista',
    label: '🪟 Serramentisti, Infissi, Carpenteria & Tende Tecniche',
    shortLabel: 'Serramentisti & Infissi',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '43.32.02',
    recommendedFamily: 'Automazioni Motorizzate, Alimentatori LED Slim, Strip LED, Utensileria & Fissaggio',
    catalogKeywords: ['strip led', 'alimentatore', 'profilo', 'pulsante', 'utensil', 'faretto'],
    queries: [
      'serramenti e infissi',
      'produzione serramenti',
      'carpenteria metallica',
      'automazione tapparelle e tende',
    ],
  },
  Quadrista: {
    cluster: 'Quadrista',
    label: '⚙️ Quadristi, Cablatori & Automazione Industriale',
    shortLabel: 'Quadristi & Industriale',
    commercialCategory: 'IST',
    baseDiscount: 40,
    atecoDefault: '27.12.00',
    recommendedFamily: 'Teleruttori, Relè Termici, Interruttori Scatolati, Pulsanteria Industriale & Carpenteria Quadri',
    catalogKeywords: ['contattore', 'rele', 'interruttore', 'pulsant', 'morsett', 'quadro'],
    queries: [
      'quadri elettrici industriali',
      'automazione industriale',
      'cablaggi elettrici industriali',
      'bordo macchina',
    ],
  },
  Ferramenta: {
    cluster: 'Ferramenta',
    label: '🧰 Ferramenta, Utensilerie Professionali & Bricolage',
    shortLabel: 'Ferramenta & Utensileria',
    commercialCategory: 'RIV',
    baseDiscount: 50,
    atecoDefault: '47.52.10',
    recommendedFamily: 'Sorgenti LED, Prolunghe, Multiprese, Torce, Materiale Elettrico da Banco & Minuteria',
    catalogKeywords: ['lampadina', 'multipresa', 'spina', 'presa', 'proiettore', 'nastro'],
    queries: [
      'ferramenta',
      'utensileria professionale',
      'forniture industriali',
      'bricolage',
    ],
  },
  Illuminazione: {
    cluster: 'Illuminazione',
    label: '💡 Showroom Illuminazione, Lampadari & Negozi Luce',
    shortLabel: 'Showroom Illuminazione',
    commercialCategory: 'RIV',
    baseDiscount: 50,
    atecoDefault: '47.59.20',
    recommendedFamily: 'Illuminazione Decorativa, Lampadari Design, Applique, Strip LED & Corpi Illuminanti Outdoor',
    catalogKeywords: ['lampadario', 'sospensione', 'plafoniera', 'applique', 'lampada', 'led'],
    queries: [
      'negozio illuminazione',
      'showroom illuminazione',
      'illuminazione led',
      'lampadari',
    ],
  },
};

const CLUSTER_ALIAS_MAP: Record<string, CanonicalB2BCluster> = {
  installatore_civile: 'Installatore_Civile',
  installatore: 'Installatore_Civile',
  ascensorista: 'Installatore_Civile',
  manutenzione: 'Installatore_Civile',
  impresa_edile: 'Impresa_Edile',
  edilizia: 'Impresa_Edile',
  rivendita_edile: 'Rivendita_Edile',
  rivenditore: 'Rivendita_Edile',
  grossista: 'Rivendita_Edile',
  termoidraulica_clima: 'Termoidraulica_Clima',
  termoidraulica: 'Termoidraulica_Clima',
  fotovoltaico_rinnovabili: 'Fotovoltaico_Rinnovabili',
  fotovoltaico: 'Fotovoltaico_Rinnovabili',
  sicurezza_automazione: 'Sicurezza_Automazione',
  sicurezza: 'Sicurezza_Automazione',
  architetto_ingegnere: 'Architetto_Ingegnere',
  architetto: 'Architetto_Ingegnere',
  ingegnere: 'Architetto_Ingegnere',
  serramentista: 'Serramentista',
  quadrista: 'Quadrista',
  automazione: 'Quadrista',
  ferramenta: 'Ferramenta',
  illuminazione: 'Illuminazione',
};

export const RIV_CLUSTERS = new Set<string>([
  'Ferramenta',
  'Rivendita_Edile',
  'Illuminazione',
  'Rivenditore',
]);

export function normalizeClusterKey(rawCluster?: string | null): CanonicalB2BCluster {
  const raw = (rawCluster || '').trim();
  if (!raw) return 'Installatore_Civile';
  if ((B2B_CLUSTER_REGISTRY as Record<string, B2BClusterConfig>)[raw]) {
    return raw as CanonicalB2BCluster;
  }
  const lower = raw.toLowerCase();
  if (CLUSTER_ALIAS_MAP[lower]) {
    return CLUSTER_ALIAS_MAP[lower];
  }
  if (lower.includes('ferramenta') || lower.includes('utensil')) return 'Ferramenta';
  if (lower.includes('rivendit') || lower.includes('grossist') || lower.includes('ingrosso')) return 'Rivendita_Edile';
  if (lower.includes('illuminaz') || lower.includes('lampadar') || lower.includes('luce')) return 'Illuminazione';
  if (lower.includes('fotovolt') || lower.includes('rinnovabil') || lower.includes('solar')) return 'Fotovoltaico_Rinnovabili';
  if (lower.includes('termoidraul') || lower.includes('clima') || lower.includes('idraulic')) return 'Termoidraulica_Clima';
  if (lower.includes('sicurezz') || lower.includes('antifurt') || lower.includes('videosorv')) return 'Sicurezza_Automazione';
  if (lower.includes('quadrist') || lower.includes('automazion') || lower.includes('cablag')) return 'Quadrista';
  if (lower.includes('architett') || lower.includes('ingegner') || lower.includes('progett')) return 'Architetto_Ingegnere';
  if (lower.includes('serrament') || lower.includes('infiss')) return 'Serramentista';
  if (lower.includes('edil') || lower.includes('costruzion')) return 'Impresa_Edile';
  return 'Installatore_Civile';
}

export function resolveClusterConfig(
  rawCluster?: string | null,
  _fallbackCommercialCategory?: string | null
): B2BClusterConfig {
  const canonical = normalizeClusterKey(rawCluster);
  return B2B_CLUSTER_REGISTRY[canonical];
}

export function resolveCommercialCategoryFromCluster(cluster?: string | null): {
  canonicalCluster: CanonicalB2BCluster;
  commercialCategory: 'IST' | 'RIV';
  baseDiscount: number;
  categoryLabel: string;
} {
  const cfg = resolveClusterConfig(cluster);
  if (cfg.commercialCategory === 'RIV') {
    return {
      canonicalCluster: cfg.cluster,
      commercialCategory: 'RIV',
      baseDiscount: 50,
      categoryLabel: 'RIV - Rivenditore / Grossista / Ferramenta (Sconto base 50%)',
    };
  }
  return {
    canonicalCluster: cfg.cluster,
    commercialCategory: 'IST',
    baseDiscount: 40,
    categoryLabel: 'IST - Installatore / Impresa / Professionista (Sconto base 40%)',
  };
}

// ============================================================================
// 2. VALIDAZIONE REALE PARTITA IVA ITALIANA (11 CIFRE + MODULO 10 LUHN ITALIA)
// ============================================================================

export function sanitizeItalianVat(rawVat?: string | null): string | null {
  if (!rawVat) return null;
  const cleaned = String(rawVat).replace(/^IT/i, '').replace(/\D/g, '');
  return cleaned.length === 11 ? cleaned : null;
}

export function validateItalianVatChecksum(rawVat?: string | null): boolean {
  const vat = sanitizeItalianVat(rawVat);
  if (!vat || vat === '00000000000') return false;
  // Codice ufficio provinciale (cifre 8-10): 001..100 oppure 120, 121, 888, 999
  const officeCode = parseInt(vat.slice(7, 10), 10);
  if (officeCode === 0) return false;

  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat.charAt(i), 10);
    if (i % 2 === 0) {
      sumOdd += digit;
    } else {
      const doubled = digit * 2;
      sumEven += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const expectedCheck = (10 - ((sumOdd + sumEven) % 10)) % 10;
  return expectedCheck === parseInt(vat.charAt(10), 10);
}

// ============================================================================
// 3. CIFRATURA SIMMETRICA AES-256-GCM CREDENZIALI SMTP / IMAP
// ============================================================================

const ENC_PREFIX = 'enc:v1:';

function getEncryptionKey32(): Buffer {
  const rawSecret =
    process.env.SDR_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'archelia_sdr_aes256_gcm_master_fallback_key_2026';
  return crypto.createHash('sha256').update(rawSecret, 'utf8').digest();
}

export function isEncryptedSdrSecret(val?: string | null): boolean {
  return typeof val === 'string' && val.startsWith(ENC_PREFIX);
}

export function encryptSdrSecret(plainText: string): string {
  if (!plainText) return '';
  if (isEncryptedSdrSecret(plainText)) return plainText;
  const key = getEncryptionKey32();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSdrSecret(storedValue?: string | null): string {
  if (!storedValue) return '';
  if (!isEncryptedSdrSecret(storedValue)) {
    return storedValue;
  }
  const payload = storedValue.slice(ENC_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato credenziale cifrata non valido');
  }
  const [ivHex, tagHex, cipherHex] = parts;
  const key = getEncryptionKey32();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ============================================================================
// 4. RAMP-UP AUTOMATICO 3 SETTIMANE PER POOL CASELLE ARUBA (5 -> 10 -> 15/g)
// ============================================================================

export function computeEffectiveInboxDailyLimit(account: {
  warmupEnabled?: boolean | null;
  warmupStartedAt?: Date | string | null;
  dailyLimit?: number | null;
  targetDailyLimit?: number | null;
}): {
  effectiveDailyLimit: number;
  warmupWeek: 1 | 2 | 3;
  daysActive: number;
} {
  const target = Math.max(1, Number(account.targetDailyLimit || account.dailyLimit || 15));
  if (account.warmupEnabled === false) {
    const fixed = Math.max(1, Number(account.dailyLimit || target));
    return { effectiveDailyLimit: fixed, warmupWeek: 3, daysActive: 21 };
  }

  const startedMs = account.warmupStartedAt
    ? new Date(account.warmupStartedAt).getTime()
    : Date.now();
  const daysActive = Math.max(0, Math.floor((Date.now() - startedMs) / 86_400_000));

  if (daysActive < 7) {
    return {
      effectiveDailyLimit: Math.min(target, 5),
      warmupWeek: 1,
      daysActive,
    };
  }
  if (daysActive < 14) {
    return {
      effectiveDailyLimit: Math.min(target, 10),
      warmupWeek: 2,
      daysActive,
    };
  }
  return {
    effectiveDailyLimit: target,
    warmupWeek: 3,
    daysActive,
  };
}

// ============================================================================
// 5. COPYWRITER SARTORIALE ANTI-FILTRO ARUBA & GUARDIA PLACEHOLDER
// ============================================================================

export function containsUnresolvedPlaceholders(text?: string | null): boolean {
  if (!text) return false;
  return /\{\{[^}]*\}\}/.test(text) || text.includes('DEMO_USERNAME') || text.includes('DEMO_PASS');
}

function escapeEmailHtml(val?: string | null): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface BuildOutreachEmailInput {
  prospectId: number;
  companyName: string;
  city?: string | null;
  province?: string | null;
  categoryCluster?: string | null;
  brandsDetected?: string | null;
  decisionMaker?: string | null;
  username: string;
  tempPasswordPlain: string;
  baseDiscount: number;
  extraFirstPurchasePct: number;
  offerTitle: string;
  minOrderAmountText: string;
  freeShippingText: string;
  paymentTermsText: string;
  customCommercialNotes?: string | null;
  smartCatalogUrl?: string | null;
  agentName: string;
  agentCode: string;
  agentEmail?: string | null;
  agentPhone?: string | null;
}

export function buildTailoredOutreachEmail(input: BuildOutreachEmailInput): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  discountFormulaLabel: string;
} {
  const catCfg = resolveClusterConfig(input.categoryCluster);
  const discountFormulaLabel = `${input.baseDiscount}% + ${input.extraFirstPurchasePct}%`;
  const effectiveNetPct = Number(
    (100 - (100 - input.baseDiscount) * (1 - input.extraFirstPurchasePct / 100)).toFixed(1)
  );
  const seed = Math.abs(Number(input.prospectId || 1));

  const cleanDm = input.decisionMaker
    ? input.decisionMaker.replace(/\s*\(.*?\)\s*/g, '').trim()
    : '';

  const greetings = cleanDm
    ? [
        `Gentile ${cleanDm},`,
        `Buongiorno ${cleanDm},`,
        `Cortese attenzione di ${cleanDm} (${input.companyName}),`,
      ]
    : [
        `Gentile Ufficio Acquisti di ${input.companyName},`,
        `Buongiorno al Team di ${input.companyName},`,
        `Cortese Direzione Commerciale di ${input.companyName},`,
        `Gentili Referenti di ${input.companyName},`,
      ];

  const locationPhrase = input.city
    ? `operativa su ${input.city}${input.province ? ` (${input.province})` : ''}`
    : 'attiva sul territorio';

  const intros = [
    `Vi scrivo da Izzo Distribuzione (I.S.I. S.r.l.), polo logistico B2B per forniture di materiale elettrico, illuminazione tecnica e ferramenta professionale: seguendo le realtà del comparto ${catCfg.shortLabel} ${locationPhrase}, abbiamo predisposto per la Vostra azienda un listino dedicato.`,
    `Sono ${input.agentName} della divisione B2B di Izzo Distribuzione (I.S.I. S.r.l.). Per supportare le commesse e i rifornimenti della Vostra struttura ${locationPhrase} nel settore ${catCfg.shortLabel}, abbiamo attivato una quotazione riservata in pronta consegna.`,
    `Come distributore B2B diretto di materiale elettrico e illuminazione professionale (I.S.I. S.r.l.), abbiamo riservato a ${input.companyName} un accesso diretto al nostro deposito centrale 24/48h pensato per chi opera in ambito ${catCfg.shortLabel}.`,
    `Da Izzo Distribuzione (I.S.I. S.r.l.) seguiamo con forniture rapide 24/48h installatori e rivenditori ${locationPhrase}: abbiamo preparato per ${input.companyName} il Catalistino Pronta Consegna 2gg su ${catCfg.recommendedFamily}.`,
  ];

  const subjects = [
    `Catalistino 2gg riservato a ${input.companyName} — Sconto ${discountFormulaLabel} primo acquisto`,
    `Listino B2B Pronta Consegna per ${input.companyName}${input.city ? ` (${input.city})` : ''} [${discountFormulaLabel}]`,
    `Forniture 24/48h ${catCfg.shortLabel}: condizioni riservate a ${input.companyName}`,
    `Accesso B2B e Catalistino Riservato (${discountFormulaLabel}) — ${input.companyName}`,
  ];

  const closings = [
    `Resto a completa disposizione per qualsiasi verifica tecnica o quotazione su commessa.`,
    `Per qualunque esigenza su disponibilità immediate o forniture programmate può rispondermi direttamente a questa email.`,
    `Sarà un piacere sentirci anche solo per un confronto rapido sulle linee che trattate più spesso.`,
  ];

  const greeting = greetings[seed % greetings.length];
  const intro = intros[(seed * 3) % intros.length];
  const subject = subjects[(seed * 7) % subjects.length];
  const closing = closings[(seed * 5) % closings.length];

  const brandsLine = input.brandsDetected
    ? `Abbiamo inoltre tenuto conto della Vostra operatività su linee tecniche (${input.brandsDetected.split(',').slice(0, 4).join(', ')}) selezionando gli equivalenti ad alta rotazione disponibili subito a magazzino.`
    : `All'interno trova subito le famiglie ad alta rotazione (${catCfg.recommendedFamily}) con giacenza reale verificata nel nostro Deposito Principale 2gg.`;

  const loginUrl = `https://www.izzodistribuzione.it/login?u=${encodeURIComponent(input.username)}`;

  const bodyTextLines = [
    greeting,
    '',
    intro,
    brandsLine,
    '',
    `--- CONDIZIONI RISERVATE A ${input.companyName.toUpperCase()} ---`,
    `• Offerta attiva: ${input.offerTitle}`,
    `• Sconto 1° Acquisto (Solo Pronta Consegna 2gg): ${discountFormulaLabel} in cascata (pari al ${effectiveNetPct}% netto da listino)`,
    `• Portale B2B: ${loginUrl}`,
    `• Username riservata: ${input.username}`,
    `• Password provvisoria (da personalizzare al 1° accesso): ${input.tempPasswordPlain}`,
    `• Minimo d'ordine: ${input.minOrderAmountText}`,
    `• Spedizione: ${input.freeShippingText}`,
    input.smartCatalogUrl ? `• Sfogli o scarichi il Catalistino PDF Riservato 2gg: ${input.smartCatalogUrl}` : '',
    input.customCommercialNotes ? `• Nota dedicata: ${input.customCommercialNotes}` : '',
    '',
    closing,
    '',
    `Cordiali saluti,`,
    `${input.agentName} — Divisione Commerciale B2B (Cod. ${input.agentCode})`,
    `Izzo Distribuzione — I.S.I. S.r.l.${input.agentPhone ? ` | Tel. ${input.agentPhone}` : ''}`,
    `Informativa B2B: se non desidera ricevere ulteriori aggiornamenti commerciali è sufficiente rispondere "STOP" a questo messaggio.`,
  ].filter((l) => l !== '');

  const bodyText = bodyTextLines.join('\n');

  const catalogCtaHtml = input.smartCatalogUrl
    ? `<div style="margin: 18px 0; text-align: left;">
        <a href="${escapeEmailHtml(input.smartCatalogUrl)}" target="_blank" rel="noopener" style="display: inline-block; background: #0f172a; color: #ffffff; font-weight: 700; text-decoration: none; padding: 11px 18px; border-radius: 8px; font-size: 14px;">
          📄 Apri e Scarica il Catalistino PDF Riservato (Pronta Consegna 2gg)
        </a>
      </div>`
    : '';

  const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px; font-size: 14.5px;">
  <p>${escapeEmailHtml(greeting)}</p>
  <p>${escapeEmailHtml(intro)}</p>
  <p>${escapeEmailHtml(brandsLine)}</p>
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 18px 0;">
    <div style="font-weight: 800; color: #15803d; font-size: 15px; margin-bottom: 4px;">Catalistino Riservato a ${escapeEmailHtml(input.companyName)}</div>
    <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 10px;">${escapeEmailHtml(input.offerTitle)} — Sconto ${escapeEmailHtml(discountFormulaLabel)} (${effectiveNetPct}% netto)</div>
    <div><strong>Portale B2B:</strong> <a href="${escapeEmailHtml(loginUrl)}" style="color: #15803d; font-weight: 700;">www.izzodistribuzione.it/login</a></div>
    <div><strong>Username riservata:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeEmailHtml(input.username)}</code></div>
    <div><strong>Password provvisoria (1° accesso):</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeEmailHtml(input.tempPasswordPlain)}</code></div>
    <div style="margin-top: 10px; font-size: 13px; color: #334155;">
      • <strong>Sconto Attivo 1° Acquisto:</strong> <strong>${escapeEmailHtml(discountFormulaLabel)}</strong> automatico a carrello sui prodotti in <strong>Pronta Consegna 2gg</strong><br/>
      • <strong>Condizione Ordine:</strong> ${escapeEmailHtml(input.minOrderAmountText)}<br/>
      • <strong>Consegna:</strong> ${escapeEmailHtml(input.freeShippingText)}<br/>
      • <strong>Referente:</strong> ${escapeEmailHtml(input.agentName)} (Cod. ${escapeEmailHtml(input.agentCode)})
      ${input.customCommercialNotes ? `<br/>• <strong>Nota:</strong> ${escapeEmailHtml(input.customCommercialNotes)}` : ''}
    </div>
  </div>
  ${catalogCtaHtml}
  <p>${escapeEmailHtml(closing)}</p>
  <p style="margin-top: 16px;">Cordiali saluti,<br/><strong>${escapeEmailHtml(input.agentName)}</strong><br/><span style="color:#475569;font-size:13px;">Divisione B2B — Izzo Distribuzione (I.S.I. S.r.l.)${input.agentPhone ? ` • ${escapeEmailHtml(input.agentPhone)}` : ''}</span></p>
  <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b;">
    Comunicazione commerciale B2B destinata a operatori professionali del settore impiantistico, edile e rivendita tecnica. Per non ricevere ulteriori comunicazioni è sufficiente rispondere indicando "STOP".
  </p>
</div>`;

  return {
    subject,
    bodyText,
    bodyHtml,
    discountFormulaLabel,
  };
}
