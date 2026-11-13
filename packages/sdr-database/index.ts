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
    recommendedFamily: 'Illuminazione LED, Materiale Elettrico, Quadristica, Fissaggio & Minuteria Professionale',
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
  return (
    /\{\{[^}]*\}\}/.test(text) ||
    /\{[A-Z0-9_]{4,}\}/.test(text) ||
    /\[[A-Z0-9_]{4,}\]/.test(text) ||
    text.includes('DEMO_USERNAME') ||
    text.includes('DEMO_PASS')
  );
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

import {
  generateCombinatorialOutreachEmailSync,
  type CombinatorialEmailResult,
} from './combinatorialEngine';

export * from './combinatorialDictionary';
export * from './combinatorialTemplates';
export * from './combinatorialEngine';

export function buildTailoredOutreachEmail(input: BuildOutreachEmailInput): CombinatorialEmailResult {
  return generateCombinatorialOutreachEmailSync(input);
}
