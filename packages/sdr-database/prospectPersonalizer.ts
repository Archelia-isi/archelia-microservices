import {
  resolveClusterConfig,
  type CanonicalB2BCluster,
  type BuildOutreachEmailInput,
} from './index';

export interface ProspectIntelligenceSummary {
  companyClean: string;
  decisionMakerClean: string | null;
  domainClean: string | null;
  cityClean: string;
  provinceClean: string;
  areaLabel: string;
  cluster: CanonicalB2BCluster;
  isReseller: boolean;
  sectorPlural: string;
  sectorNoun: string;
  specializations: string[];
  specializationsLabel: string | null;
  detectedBrands: string[];
  civilBrandMatched: string | null;
  foundationYear: string | null;
  certificationsLabel: string | null;
  salutoPersonalizzato: string;
  salutoUmano1a1: string;
  intestazioneOggetto: string;
  fraseContestoDb: string;
  incisoContestoDb: string;
  contestoTerritorioFallback: string;
  scenarioMestiereSettore: string;
  scopoFornituraSettore: string;
  lineeProdottiIzzo: string;
  prodottiProsa: string;
  prodottiCompatti: string;
  prodottiMatriceReparti: string;
  chiusuraSettore: string;
}

const NON_PERSON_TOKENS = new Set([
  'srl',
  'srls',
  'spa',
  'snc',
  'sas',
  'soc',
  'coop',
  'ditta',
  'impresa',
  'impianti',
  'impianto',
  'elettrici',
  'elettrico',
  'elettrica',
  'elettronica',
  'fibra',
  'ottica',
  'termoidraulica',
  'idraulica',
  'clima',
  'climatizzazione',
  'fotovoltaico',
  'solare',
  'energia',
  'costruzioni',
  'edile',
  'edilizia',
  'ferramenta',
  'utensileria',
  'illuminazione',
  'luce',
  'sicurezza',
  'automazione',
  'domotica',
  'quadri',
  'cablaggi',
  'serramenti',
  'infissi',
  'studio',
  'tecnico',
  'progettazione',
  'ingegneria',
  'architettura',
  'servizi',
  'tecnologie',
  'sistemi',
  'italia',
  'milano',
  'roma',
  'napoli',
  'torino',
  'bologna',
  'bari',
  'commerciale',
  'amministrazione',
  'ufficio',
  'direzione',
  'segreteria',
  'vendite',
  'acquisti',
  'team',
  'info',
  'group',
  'holding',
  'service',
  'general',
  'contractor',
  'ecommerce',
]);

const DIRECTORY_DOMAINS = [
  'paginegialle.',
  'paginebianche.',
  'tuttocitta.',
  'facebook.',
  'instagram.',
  'linkedin.',
  'youtube.',
  'tiktok.',
  'google.',
  'goo.gl',
  'maps.app',
  'registroimprese.',
  'ufficiocamerale.',
  'fatturatoitalia.',
  'informazione-aziende.',
  'aziendeitalia.',
  'kompass.',
  'prontoimprese.',
  'virgilio.',
  'subito.it',
  'amazon.',
  'ebay.',
];

function parseStringArrayFlexible(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => String(x || '').trim()).filter(Boolean);
  }
  const s = String(val).trim();
  if (!s || s === '[]' || s === 'null' || s === 'undefined') return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean);
      }
    } catch {
      // fallback CSV
    }
  }
  return s
    .split(/[,;|]+/)
    .map((x) => x.replace(/^["'\[\]\s]+|["'\[\]\s]+$/g, '').trim())
    .filter(Boolean);
}

function toSmartTitleCase(raw: string): string {
  const smallWords = new Set(['di', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'e', 'ed', 'in', 'su', 'per', 'con', 'a']);
  return raw
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (/^s\.?r\.?l\.?s?\.?$/i.test(word)) {
        return lower.includes('srls') || lower.endsWith('s.') ? 'S.r.l.s.' : 'S.r.l.';
      }
      if (/^s\.?p\.?a\.?$/i.test(word)) return 'S.p.A.';
      if (/^s\.?n\.?c\.?$/i.test(word)) return 'S.n.c.';
      if (/^s\.?a\.?s\.?$/i.test(word)) return 'S.a.s.';
      if (/^(led|ip\d+|hvac|b2b|ev|tvcc|poe|ce|iso|soa)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (idx > 0 && smallWords.has(lower)) {
        return lower;
      }
      // Mantiene acronimi corti di 2-3 lettere già tutti maiuscoli (es. ML, RT, MC)
      if (/^[A-Z0-9&]{2,4}$/.test(word) && !/^(SRL|SPA|SNC|SAS)$/.test(word)) {
        return word;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function cleanCompanyDisplayName(
  rawCompanyName: string,
  vatOfficialName?: string | null
): string {
  let base = String(rawCompanyName || '').trim();
  if (!base && vatOfficialName) {
    base = String(vatOfficialName).trim();
  }
  if (!base) return 'Vostra Azienda';

  // Rimuove slogan SEO lunghi dopo " - ", " | ", " – ", " — "
  const splitMatch = base.split(/\s+(?:[-–—|])\s+/);
  if (splitMatch.length > 1 && splitMatch[0].trim().length >= 3) {
    base = splitMatch[0].trim();
  }

  // Se il nome è una sola parola corta (es. "Elfes") e abbiamo la ragione sociale camerale ("ELFES SRL"), recupera la forma giuridica
  if (
    vatOfficialName &&
    base.split(/\s+/).length === 1 &&
    !/\b(srl|s\.r\.l|spa|s\.p\.a|snc|sas)\b/i.test(base)
  ) {
    const official = String(vatOfficialName).trim();
    if (official.toLowerCase().startsWith(base.toLowerCase() + ' ')) {
      const suffix = official.slice(base.length).trim();
      if (/^(srl|s\.r\.l\.?|srls|spa|s\.p\.a\.?|snc|sas)$/i.test(suffix)) {
        base = `${base} ${suffix}`;
      }
    }
  }

  // Normalizza suffissi societari finali
  base = base
    .replace(/\b(s\.?\s*r\.?\s*l\.?\s*s\.?)\b/gi, 'S.r.l.s.')
    .replace(/\b(s\.?\s*r\.?\s*l\.?)\b/gi, 'S.r.l.')
    .replace(/\b(s\.?\s*p\.?\s*a\.?)\b/gi, 'S.p.A.')
    .replace(/\b(s\.?\s*n\.?\s*c\.?)\b/gi, 'S.n.c.')
    .replace(/\b(s\.?\s*a\.?\s*s\.?)\b/gi, 'S.a.s.');

  // Se tutta maiuscola (es. "TERRA COSTRUZIONI S.R.L."), converte elegantemente
  const letters = base.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length > 4 && letters === letters.toUpperCase()) {
    return toSmartTitleCase(base);
  }

  return base.replace(/\s{2,}/g, ' ').trim();
}

export function extractVerifiedDecisionMaker(
  rawDecisionMaker?: string | null,
  rawCompanyName?: string | null,
  vatOfficialName?: string | null
): string | null {
  const candidates: string[] = [];
  if (rawDecisionMaker) candidates.push(String(rawDecisionMaker));

  for (const src of [vatOfficialName, rawCompanyName]) {
    if (!src) continue;
    const m = String(src).match(/\bdi\s+([A-Za-zÀ-ÿ'’]+(?:\s+[A-Za-zÀ-ÿ'’]+){1,2})$/i);
    if (m && m[1]) candidates.push(m[1]);
  }

  for (const cand of candidates) {
    const cleaned = cand
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/[^A-Za-zÀ-ÿ'’\s]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!cleaned) continue;

    const words = cleaned.split(/\s+/);
    if (words.length < 2 || words.length > 3) continue;
    if (words.some((w) => w.length < 2)) continue;

    const hasForbidden = words.some((w) =>
      NON_PERSON_TOKENS.has(w.toLowerCase().replace(/[^a-zà-ÿ]/g, ''))
    );
    if (hasForbidden) continue;

    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return null;
}

export function extractCleanDomain(rawWebsite?: string | null): string | null {
  if (!rawWebsite) return null;
  let w = String(rawWebsite).trim().toLowerCase();
  if (!w) return null;
  if (!/^https?:\/\//.test(w)) {
    w = `https://${w}`;
  }
  try {
    const u = new URL(w);
    const host = u.hostname.replace(/^www\./i, '').trim();
    if (!host || !host.includes('.')) return null;
    if (DIRECTORY_DOMAINS.some((d) => host.includes(d))) return null;
    return host;
  } catch {
    return null;
  }
}

function formatItalianList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function extractCleanSpecializations(
  rawCompanyFeatures: unknown,
  atecoDescription?: string | null
): string[] {
  const rawList = parseStringArrayFlexible(rawCompanyFeatures);
  const mapped: string[] = [];

  const featureMap: Array<[RegExp, string]> = [
    [/colonnine|ricarica\s+auto|ev\b/i, 'sistemi di ricarica EV'],
    [/domotica|building\s+automation/i, 'domotica e building automation'],
    [/videosorveglianza|tvcc|telecamere/i, 'videosorveglianza'],
    [/controllo\s+accessi|antifurto|antintrusione|sicurezza/i, 'sistemi di sicurezza e controllo accessi'],
    [/cablaggi?\s+quadri|quadri\s+elettrici/i, 'cablaggio quadri elettrici'],
    [/fotovoltaic|rinnovabil|solare/i, 'impianti fotovoltaici'],
    [/climatizzazion|termoidraulic|riscaldamento|hvac/i, 'climatizzazione e termoidraulica'],
    [/illuminazion|illuminotecnic|led\s*&\s*design/i, 'illuminotecnica LED'],
    [/progettazion/i, 'progettazione impiantistica'],
    [/manutenzion/i, 'manutenzione impianti'],
    [/appalti\s+pubblici|gare\s+pa/i, 'commesse pubbliche e capitolati'],
    [/chiavi\s+in\s+mano/i, 'realizzazioni chiavi in mano'],
    [/fibra\s+ottica|reti\s+dati|cablaggio\s+strutturato/i, 'reti dati e cablaggio strutturato'],
    [/automazione\s+cancelli|automazioni/i, 'automazioni elettriche'],
    [/assistenza\s+tecnica|pronto\s+intervento/i, 'assistenza tecnica'],
  ];

  for (const item of rawList) {
    if (/^target:/i.test(item) || /portfolio\s+fotografico/i.test(item) || /e-commerce\s+attivo/i.test(item)) {
      continue;
    }
    for (const [re, cleanLabel] of featureMap) {
      if (re.test(item) && !mapped.includes(cleanLabel)) {
        mapped.push(cleanLabel);
      }
    }
  }

  if (mapped.length === 0 && atecoDescription) {
    for (const [re, cleanLabel] of featureMap) {
      if (re.test(atecoDescription) && !mapped.includes(cleanLabel)) {
        mapped.push(cleanLabel);
      }
    }
  }

  return mapped.slice(0, 3);
}

function extractFoundationYear(rawFoundation?: unknown): string | null {
  if (!rawFoundation) return null;
  const m = String(rawFoundation).match(/\b(19\d{2}|200\d|201[0-8])\b/);
  return m ? m[1] : null;
}

function extractCertificationsLabel(rawCerts?: unknown): string | null {
  const list = parseStringArrayFlexible(rawCerts).filter((c) =>
    /^(ISO\s*\d+|SOA|FGAS|F-GAS|FER|CEI|IMQ)/i.test(c)
  );
  if (list.length === 0) return null;
  return list.slice(0, 3).join(' / ');
}

function resolveSectorLabels(cluster: CanonicalB2BCluster): {
  sectorPlural: string;
  sectorNoun: string;
  scopoVariants: string[];
  chiusuraVariants: string[];
} {
  switch (cluster) {
    case 'Ferramenta':
      return {
        sectorPlural: 'le ferramenta e le rivendite di utensileria',
        sectorNoun: 'ferramenta e utensileria tecnica',
        scopoVariants: [
          'per il riassortimento ad alta marginalità dei reparti elettrico, fissaggio e utensileria da banco, anche per colli frazionati',
          'per la fornitura all’ingrosso di articoli ad alta rotazione per banco vendita e libero servizio',
          'per l’approvvigionamento diretto di elettroutensili, minuteria di fissaggio e materiale elettrico confezionato',
        ],
        chiusuraVariants: [
          'per listini dedicati alle rivendite, campionature mirate o riassortimenti anche a colli frazionati',
          'per qualsiasi approfondimento commerciale sulle linee da banco o richieste su specifici articoli',
          'per quotazioni riservate su forniture programmate o assortimenti espositivi da punto vendita',
        ],
      };
    case 'Rivendita_Edile':
      return {
        sectorPlural: 'le rivendite tecniche e i distributori di settore',
        sectorNoun: 'rivendita edile ed elettroforniture',
        scopoVariants: [
          'per il riassortimento all’ingrosso ad alta rotazione dei reparti elettrico, illuminazione, cantiere e fissaggio',
          'per la fornitura B2B riservata alle rivendite su materiale da banco, cantiere ed elettroutensili',
          'per integrare l’assortimento del punto vendita con linee ad elevata marginalità e pronta disponibilità',
        ],
        chiusuraVariants: [
          'per quotazioni su forniture da banco, pedane miste o riassortimenti frazionati',
          'per un confronto diretto sulle condizioni riservate ai rivenditori e sulle linee a maggiore rotazione',
          'per offerte dedicate su specifici fabbisogni di magazzino o richieste dei Vostri clienti professionali',
        ],
      };
    case 'Illuminazione':
      return {
        sectorPlural: 'gli showroom d’illuminazione e i punti vendita specializzati',
        sectorNoun: 'illuminotecnica e showroom luce',
        scopoVariants: [
          'per la fornitura a listino rivenditori di corpi illuminanti decorativi, architetturali e LED tecnici',
          'per affiancare lo showroom e le forniture contract con collezioni luce e componentistica LED ad alta marginalità',
          'per l’approvvigionamento B2B di soluzioni illuminotecniche interne, outdoor e sistemi lineari 24V',
        ],
        chiusuraVariants: [
          'per quotazioni riservate a showroom, forniture contract o progetti illuminotecnici su distinta',
          'per approfondire le condizioni dedicate ai punti vendita luce o richiedere documentazione tecnica',
          'per offerte mirate su commesse residenziali, commerciali o ricettive',
        ],
      };
    case 'Quadrista':
      return {
        sectorPlural: 'i quadristi e gli specialisti di automazione industriale',
        sectorNoun: 'quadristica e cablaggio industriale',
        scopoVariants: [
          'per l’approvvigionamento a listino B2B di apparecchiature modulari, comando, carpenteria e accessori di cablaggio',
          'per la fornitura diretta di componentistica elettrotecnica certificata per quadri di distribuzione e automazione',
          'per la fornitura rapida di protezioni, contattori, contenitori IP65 e minuteria da quadro',
        ],
        chiusuraVariants: [
          'per offerte dedicate su distinta base quadro o forniture programmate di reparto',
          'per quotazioni mirate su specifiche commesse di cablaggio e carpenteria elettrotecnica',
          'per qualsiasi verifica tecnica sulle schede prodotto o condizioni su volumi ricorrenti',
        ],
      };
    case 'Impresa_Edile':
      return {
        sectorPlural: 'le imprese di costruzioni e ristrutturazioni',
        sectorNoun: 'costruzioni e cantieristica',
        scopoVariants: [
          'per la fornitura diretta a listino B2B di materiale elettrico da cantiere, illuminazione, serie civile e fissaggio',
          'per supportare cantieri di nuova costruzione e ristrutturazione su dotazioni elettriche, posa e illuminazione LED',
          'per l’approvvigionamento accentrato di quadri cantiere, scatole d’incasso, sigillanti ed elettroutensili',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su capitolato d’opera, computo metrico o fabbisogno di singolo cantiere',
          'per preventivi mirati sulle forniture di cantiere con recapito diretto anche presso l’area lavori',
          'per qualsiasi confronto tecnico o commerciale sulle commesse in partenza',
        ],
      };
    case 'Termoidraulica_Clima':
      return {
        sectorPlural: 'le imprese termoidrauliche e di climatizzazione',
        sectorNoun: 'impiantistica termoidraulica e HVAC',
        scopoVariants: [
          'per le forniture elettriche di comando/protezione HVAC, staffaggio, sigillatura ed elettroutensili da cantiere',
          'per affiancare l’installazione termoidraulica sui materiali elettrici complementari, fissaggio e utensileria',
          'per l’approvvigionamento diretto a listino B2B di quadri IP65, contattori, protezioni e consumabili di posa',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su commessa impiantistica, capitolato o scorte di magazzino',
          'per offerte su distinta materiali o forniture ricorrenti a supporto delle squadre operative',
          'per qualsiasi approfondimento tecnico sui materiali a corredo degli impianti termici e clima',
        ],
      };
    case 'Fotovoltaico_Rinnovabili':
      return {
        sectorPlural: 'gli installatori di impianti fotovoltaici ed energie rinnovabili',
        sectorNoun: 'impiantistica fotovoltaica ed efficienza energetica',
        scopoVariants: [
          'per la fornitura a listino B2B di protezioni AC/DC, scaricatori SPD, quadri stagni, canalizzazione e fissaggio esterno',
          'per supportare le commesse fotovoltaiche ed elettriche su quadristica di protezione, cablaggio IP68 e relamping LED',
          'per l’approvvigionamento B2B di componentistica di protezione impianti, carpenteria IP65 e utensileria',
        ],
        chiusuraVariants: [
          'per quotazioni su distinta impianto, forniture ricorrenti o commesse di efficientamento energetico',
          'per offerte mirate su lotti di protezione modulare, quadristica e materiale di installazione',
          'per qualsiasi confronto tecnico o preventivo dedicato alle Vostre prossime installazioni',
        ],
      };
    case 'Sicurezza_Automazione':
      return {
        sectorPlural: 'gli installatori di sistemi di sicurezza, TVCC e automazione',
        sectorNoun: 'sicurezza, videosorveglianza e building automation',
        scopoVariants: [
          'per la fornitura B2B di telecamere IP PoE, alimentazione, contenitori stagni IP65, smart control e protezione linea',
          'per affiancare le installazioni di sicurezza e domotica su componentistica elettrica, canalizzazione e illuminazione perimetrale',
          'per l’approvvigionamento diretto di apparati TVCC, moduli smart, scatole stagne e materiale di posa',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su singola commessa, impianto centralizzato o distinta materiali',
          'per approfondimenti tecnici o preventivi riservati sulle forniture ricorrenti',
          'per qualsiasi confronto commerciale sui prodotti a supporto delle Vostre installazioni',
        ],
      };
    case 'Architetto_Ingegnere':
      return {
        sectorPlural: 'gli studi di progettazione architettonica e impiantistica',
        sectorNoun: 'progettazione tecnica e illuminotecnica',
        scopoVariants: [
          'per le forniture illuminotecniche architetturali, serie civili coordinate e quadristica a supporto dei progetti seguiti',
          'per la selezione e fornitura di corpi illuminanti LED, sistemi lineari, serie civile e capitolati impianti',
          'per affiancare lo studio e le imprese esecutrici con schede tecniche complete e quotazioni B2B dirette',
        ],
        chiusuraVariants: [
          'per supporto alla stesura di capitolati, schede tecniche o quotazioni dedicate su progetto',
          'per valutazioni illuminotecniche, campionature finiture o preventivi su computo metrico',
          'per qualsiasi approfondimento tecnico a servizio delle commesse seguite dallo studio',
        ],
      };
    case 'Serramentista':
      return {
        sectorPlural: 'i serramentisti e le aziende di carpenteria e infissi',
        sectorNoun: 'serramenti, carpenteria e posa qualificata',
        scopoVariants: [
          'per la fornitura diretta a listino B2B di sigillanti e schiume da posa, fissaggio, elettroutensili e LED integrati',
          'per l’approvvigionamento all’ingrosso di consumabili certificati per il montaggio infissi, automazioni e officina',
          'per la fornitura coordinata di chimico da posa, viteria/ancoranti, utensileria brushless e componenti elettrici per oscuranti',
        ],
        chiusuraVariants: [
          'per quotazioni su consumabili ricorrenti di posa, dotazioni officina o commesse specifiche',
          'per offerte dedicate su forniture programmate di sigillanti, fissaggio ed elettroutensili',
          'per qualsiasi riscontro commerciale sui materiali impiegati in produzione e montaggio',
        ],
      };
    case 'Installatore_Civile':
    default:
      return {
        sectorPlural: 'gli installatori elettrici e le imprese impiantistiche',
        sectorNoun: 'impiantistica elettrica civile e industriale',
        scopoVariants: [
          'per i materiali ad alta rotazione destinati a cantieri, rifacimenti impianto e manutenzioni',
          'per l’approvvigionamento diretto a listino B2B di serie civile, protezione quadro, canalizzazione e illuminazione LED',
          'per la fornitura continuativa del materiale elettrico quotidiano e delle commesse impiantistiche',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su specifica commessa, capitolato o distinta materiali',
          'per preventivi su cantiere o approfondimenti sulle linee di maggiore impiego quotidiano',
          'per qualsiasi confronto tecnico-commerciale sulle forniture di Vostro interesse',
        ],
      };
  }
}

function buildTailoredProductBullets(
  cluster: CanonicalB2BCluster,
  civilBrandMatched: string | null,
  specializations: string[],
  pickIdx: number
): string {
  const civilCompatNote = civilBrandMatched
    ? `(pienamente compatibili con i principali standard installativi sul mercato, affiancabili alle linee ${civilBrandMatched} già in uso)`
    : '(compatibili con i principali standard installativi presenti sul mercato)';

  const hasEvOrPv = specializations.some((s) => /ricarica EV|fotovoltaic/i.test(s));

  switch (cluster) {
    case 'Ferramenta':
      return pickIdx % 2 === 0
        ? [
            `- **Utensileria ed elettroutensili:** linea **Kombo** e **Kombo Pro 20V Brushless** (avvitatori, tassellatori, smerigliatrici, utensileria manuale ed espositori da banco), dischi diamantati e punte SDS-Plus **Elmark**;`,
            `- **Fissaggio e chimico professionale:** fascette in nylon UV e acciaio **Surelock**, tasselli, bulloneria, staffaggio e sigillanti tecnici **Penosil**;`,
            `- **Elettrico e luce per libero servizio:** spine, prese mobili, adattatori e multiprese **Omega**, serie civile compatibile **Mapam**, torce/batterie **Proxe** e sorgenti LED **Stellar**.`,
          ].join('\n')
        : [
            `- **Banco utensileria e taglio:** elettroutensili **Kombo Pro 20V Brushless**, utensili manuali, valigette organizer, corone e dischi abrasivi/diamantati **Elmark**;`,
            `- **Sistemi di fissaggio e sigillatura:** ancoranti, fascettatura professionale **Surelock**, nastri isolanti, schiume poliuretaniche e siliconi **Penosil**;`,
            `- **Reparto elettrico e illuminazione:** multiprese e adattatori **Omega**, comandi e placche **Mapam** ${civilCompatNote}, lampadine e proiettori LED **Stellar**.`,
          ].join('\n');

    case 'Rivendita_Edile':
      return [
        `- **Elettrico e distribuzione da cantiere:** quadri e centralini stagni IP65 **Marlanvil / Elmark**, prese e spine industriali CEE, avvolgicavo e multiprese **Omega**, serie civile **Mapam** e contenitori **Idrobox IP55**;`,
        `- **Utensileria, taglio e posa:** linea **Kombo Pro 20V Brushless**, dischi diamantati per edilizia e punte SDS-Plus **Elmark**, sistemi di fissaggio **Surelock** e chimico/sigillanti **Penosil**;`,
        `- **Illuminazione LED tecnica e da banco:** proiettori LED ad alta potenza, plafoniere stagne IP65, tubi e sorgenti LED **Stellar**.`,
      ].join('\n');

    case 'Illuminazione':
      return [
        `- **Illuminazione decorativa e architetturale:** lampadari, sospensioni, applique, faretti orientabili e sistemi a binario per showroom e contract **Elmark** e **Stellar**;`,
        `- **Sistemi lineari LED e outdoor:** strip LED 24V ad alta resa cromatica, profili in alluminio, alimentatori slim, segnapasso e corpi illuminanti da esterno IP65 **Stellar**;`,
        `- **Comandi coordinati e smart lighting:** serie civile estetica **Mapam** (finiture tecnopolimero, vetro e metallo), moduli dimmer/smart Wi-Fi e Zigbee **Proxe / Sonoff**.`,
      ].join('\n');

    case 'Quadrista':
      return [
        `- **Apparecchiature modulari e comando:** interruttori magnetotermici, differenziali, scatolati, contattori, relè termici, sezionatori e pulsanteria industriale **Elmark**;`,
        `- **Carpenteria, contenitori e cablaggio:** quadri e casse stagne IP65 **Marlanvil / Elmark**, pressacavi IP68, morsettiere, capicorda e fascettatura industriale **Surelock**;`,
        `- **Illuminazione tecnica industriale:** armature stagne, proiettori high-bay e corpi illuminanti LED ad alta efficienza **Stellar**.`,
      ].join('\n');

    case 'Impresa_Edile':
      return [
        `- **Dotazioni elettriche di cantiere e incasso:** quadri e centralini stagni IP65 **Marlanvil / Elmark**, scatole da incasso per muratura e cartongesso, tubazione RK e prese industriali **Omega**;`,
        `- **Serie civile per capitolati residenziali e terziario:** frutti, supporti e placche **Mapam** e cassette stagne **Idrobox IP55** ${civilCompatNote};`,
        `- **Posa, fissaggio e illuminazione:** proiettori LED da cantiere e corpi illuminanti **Stellar**, ancoranti e fascette **Surelock**, schiume e sigillanti **Penosil**, elettroutensili **Kombo Pro 20V**.`,
      ].join('\n');

    case 'Termoidraulica_Clima':
      return [
        `- **Comando elettrico e protezione impianti:** magnetotermici, differenziali, contattori HVAC, sezionatori, scaricatori SPD e quadri stagni IP65 **Elmark** e **Marlanvil**;`,
        `- **Posa in opera, fissaggio e sigillatura:** ancoranti, staffaggio, stringitubo in acciaio, fascette UV **Surelock**, schiume e sigillanti tecnici **Penosil** ed elettroutensili **Kombo Pro 20V**;`,
        `- **Componentistica civile e illuminazione:** contenitori stagni **Idrobox IP55**, serie civile **Mapam** ${civilCompatNote}, spine/multiprese **Omega** e illuminazione LED **Stellar**.`,
      ].join('\n');

    case 'Fotovoltaico_Rinnovabili':
      return [
        `- **Protezione impianti e solare:** scaricatori di sovratensione SPD AC/DC, sezionatori, portafusibili, interruttori modulari e quadri di stringa IP65 **Elmark** e **Marlanvil**;`,
        `- **Canalizzazione stagna e fissaggio esterno:** tubazione rigida RK, cassette IP65, pressacavi IP68 **Elmark**, fascette resistenti UV/acciaio **Surelock** e sigillanti **Penosil**;`,
        `- **Efficienza LED e smart building:** corpi illuminanti professionali e strip LED 24V **Stellar**, dispositivi smart **Proxe / Sonoff** e serie civile **Mapam** ${civilCompatNote}.`,
      ].join('\n');

    case 'Sicurezza_Automazione':
      return [
        `- **Videosorveglianza, alimentazione e smart control:** telecamere IP PoE, alimentatori stabilizzati DIN, moduli smart Wi-Fi/Zigbee **Proxe / Sonoff** e sensori di movimento;`,
        `- **Contenitori stagni e protezione linea:** cassette di derivazione IP65, quadri e centralini **Marlanvil / Elmark**, pressacavi IP68, protezioni modulari/SPD e **Idrobox IP55**;`,
        `- **Illuminazione perimetrale e installazione:** proiettori LED e corpi outdoor **Stellar**, serie civile **Mapam** ${civilCompatNote}, fissaggio **Surelock** ed elettroutensili **Kombo Pro 20V**.`,
      ].join('\n');

    case 'Architetto_Ingegnere':
      return [
        `- **Illuminotecnica architetturale e terziario:** faretti da incasso, sistemi a binario, sospensioni, pannelli UGR per uffici e strip LED 24V con profili in alluminio **Stellar** ed **Elmark**;`,
        `- **Estetica punto luce e smart home:** serie civile **Mapam** con placche in tecnopolimero, vetro e metallo ${civilCompatNote} e comandi smart **Proxe / Sonoff**;`,
        `- **Quadristica e distribuzione certificata CE:** centralini rasomuro e da incasso **Marlanvil**, protezioni modulari **Elmark** e corpi illuminanti da esterno IP65.`,
      ].join('\n');

    case 'Serramentista':
      return [
        `- **Posa qualificata e sigillatura infissi:** schiume poliuretaniche professionali, siliconi neutri e sigillanti **Penosil**, ancoranti, viteria e sistemi di fissaggio **Surelock**;`,
        `- **Automazione, comando e LED integrato:** alimentatori LED slim, strip LED 24V con profili in alluminio **Stellar**, pulsanti comando **Mapam** e moduli smart **Proxe / Sonoff**;`,
        `- **Elettroutensili da officina e montaggio:** avvitatori a impulsi, trapani e smerigliatrici **Kombo Pro 20V Brushless**, dischi da taglio e punte **Elmark**, prolunghe e prese **Omega**.`,
      ].join('\n');

    case 'Installatore_Civile':
    default:
      return pickIdx % 2 === 0
        ? [
            `- **Serie civile e incasso:** linee **Mapam** e cassette stagne **Idrobox IP55** ${civilCompatNote}, oltre a scatole da incasso per muratura/cartongesso e centralini rasomuro/IP65 **Marlanvil**;`,
            `- **Protezione${hasEvOrPv ? ', solare/EV' : ''} e canalizzazione:** interruttori magnetotermici, differenziali${hasEvOrPv ? ' e scaricatori SPD' : ''}, tubazione rigida RK, cassette IP65 e pressacavi IP68 **Elmark**, multiprese **Omega** e fissaggio **Surelock**;`,
            `- **Illuminazione LED, Smart e TVCC:** corpi illuminanti, pannelli e strip LED 24V **Stellar**, moduli smart Wi-Fi/Zigbee **Proxe / Sonoff** e telecamere IP PoE.`,
          ].join('\n')
        : [
            `- **Incasso, centralini e serie civile:** scatole da incasso e centralini stagni/rasomuro **Marlanvil**, serie civile **Mapam** e contenitori **Idrobox IP55** ${civilCompatNote};`,
            `- **Quadristica modulare e posa:** magnetotermici, differenziali${hasEvOrPv ? ', protezioni SPD' : ''}, tubi/raccordi RK e pressacavi IP68 **Elmark**, spine/multiprese **Omega** e fascette **Surelock**;`,
            `- **Illuminotecnica LED e automazione smart:** plafoniere, faretti, proiettori e strip LED 24V **Stellar**, comandi smart Wi-Fi/Zigbee **Proxe / Sonoff** e sistemi TVCC IP PoE.`,
          ].join('\n');
  }
}

function buildStructuralSectorVariants(
  cluster: CanonicalB2BCluster,
  companyClean: string,
  domainClean: string | null,
  areaLabel: string,
  civilBrandMatched: string | null,
  specializations: string[]
): {
  prodottiProsa: string;
  prodottiCompatti: string;
  prodottiMatriceReparti: string;
  scenarioMestiereSettore: string;
} {
  const compatProse = civilBrandMatched
    ? `compatibili con gli standard installativi ${civilBrandMatched} già impiegati nelle Vostre commesse`
    : 'compatibili con i principali standard installativi presenti sul mercato';
  const webRef = domainClean ? ` (${domainClean})` : '';
  const hasEvOrPv = specializations.some((s) => /ricarica EV|fotovoltaic/i.test(s));

  switch (cluster) {
    case 'Ferramenta':
      return {
        prodottiProsa:
          'elettroutensili Kombo e Kombo Pro 20V Brushless con soluzioni espositive da banco, abrasivi e punte SDS-Plus Elmark, fascettatura e fissaggio Surelock, schiume e sigillanti tecnici Penosil, multiprese e adattatori Omega, serie civile Mapam e sorgenti LED Stellar',
        prodottiCompatti:
          'elettroutensili Kombo Pro 20V Brushless, abrasivi Elmark, fascette e fissaggio Surelock, chimico Penosil, elettrico Omega/Mapam e LED Stellar',
        prodottiMatriceReparti: [
          '• **Elettroutensili & Taglio** → *Kombo / Kombo Pro 20V Brushless*, dischi e punte *Elmark*',
          '• **Fissaggio & Chimico** → Fascettatura e ancoranti *Surelock*, schiume e sigillanti *Penosil*',
          '• **Elettrico & Luce da Banco** → Multiprese/spine *Omega*, serie civile *Mapam*, sorgenti LED *Stellar*',
        ].join('\n'),
        scenarioMestiereSettore: `Al banco di una ferramenta professionale come ${companyClean} su ${areaLabel}${webRef}, lavorare con linee certificate riservate alle Partite IVA e non inflazionate sul web al dettaglio permette di servire artigiani e manutentori mantenendo un ricarico sano e ripetibile.`,
      };

    case 'Rivendita_Edile':
      return {
        prodottiProsa:
          'quadri cantiere stagni IP65 e scatole d’incasso Marlanvil ed Elmark, prese industriali CEE e avvolgicavo Omega, elettroutensili Kombo Pro 20V Brushless, dischi diamantati e foratura Elmark, sistemi di fissaggio Surelock, schiume e sigillanti Penosil e proiettori LED ad alta potenza Stellar',
        prodottiCompatti:
          'elettroutensili Kombo Pro 20V, dischi diamantati Elmark, schiume e siliconi Penosil, fissaggio Surelock, quadri cantiere e prese CEE Omega/Marlanvil e LED Stellar',
        prodottiMatriceReparti: [
          '• **Elettrico & Cantiere** → Quadri IP65 *Marlanvil / Elmark*, prese CEE *Omega*, serie civile *Mapam*',
          '• **Utensileria & Taglio** → Linea *Kombo Pro 20V Brushless*, dischi diamantati e SDS-Plus *Elmark*',
          '• **Chimico, Fissaggio & LED** → Schiume/sigillanti *Penosil*, fissaggio *Surelock*, proiettori LED *Stellar*',
        ].join('\n'),
        scenarioMestiereSettore: `Per una rivendita edile e tecnica come ${companyClean} su ${areaLabel}${webRef}, affiancare al materiale pesante reparti ad alta rotazione di utensileria, chimico, fissaggio ed elettrico da cantiere consente di alzare la marginalità media per scontrino e commessa.`,
      };

    case 'Illuminazione':
      return {
        prodottiProsa: `lampadari, sospensioni, faretti architetturali e sistemi a binario Stellar ed Elmark, strip LED professionali 24V con profili in alluminio, corpi illuminanti da esterno IP65, moduli dimmer smart Proxe / Sonoff e serie civile estetica Mapam (${compatProse})`,
        prodottiCompatti:
          'sospensioni, faretti, binari, strip LED 24V con profili in alluminio e outdoor IP65 Stellar/Elmark, serie civile Mapam e dimmer smart Proxe / Sonoff',
        prodottiMatriceReparti: [
          '• **Decorativo & Architetturale** → Sospensioni, applique, faretti e sistemi a binario *Stellar / Elmark*',
          '• **Sistemi Lineari & Outdoor** → Strip LED 24V, profili in alluminio, alimentatori slim e IP65 *Stellar*',
          '• **Punto Luce & Smart Control** → Serie civile estetica *Mapam* e moduli dimmer Wi-Fi/Zigbee *Proxe / Sonoff*',
        ].join('\n'),
        scenarioMestiereSettore: `Nelle forniture illuminotecniche per showroom, retail e strutture ricettive seguite da realtà come ${companyClean} su ${areaLabel}${webRef}, abbinare collezioni decorative a linee tecniche LED ad alto margine consente di chiudere il pacchetto completo con forte competitività.`,
      };

    case 'Quadrista':
      return {
        prodottiProsa:
          'interruttori magnetotermici, differenziali, scatolati, contattori, relè termici, sezionatori e pulsanteria industriale Elmark, carpenteria e casse stagne IP65 Marlanvil ed Elmark, pressacavi IP68, morsettiere, fascettatura industriale Surelock e armature LED ad alta efficienza Stellar',
        prodottiCompatti:
          'modulari DIN, scatolati, contattori, sezionatori e pressacavi IP68 Elmark, casse e quadri IP65 Marlanvil, cablaggio Surelock e armature LED Stellar',
        prodottiMatriceReparti: [
          '• **Protezione & Manovra** → Magnetotermici, differenziali, scatolati, contattori e sezionatori *Elmark*',
          '• **Carpenteria & Cablaggio** → Casse e quadri IP65 *Marlanvil / Elmark*, pressacavi IP68, fascette *Surelock*',
          '• **Illuminazione Industriale** → Armature stagne IP65 e proiettori high-bay LED *Stellar*',
        ].join('\n'),
        scenarioMestiereSettore: `Chi assembla quadri di distribuzione e automazione come ${companyClean} su ${areaLabel}${webRef} conosce bene quanto incidano sul margine di commessa la tenuta dei listini e la pronta reperibilità su carpenteria stagna, organi di manovra e accessori di cablaggio.`,
      };

    case 'Impresa_Edile':
      return {
        prodottiProsa: `quadri elettrici da cantiere e scatole da incasso Marlanvil, prese industriali CEE e avvolgicavo Omega, serie civile per capitolati Mapam e contenitori Idrobox IP55 (${compatProse}), proiettori e corpi illuminanti LED Stellar, schiume e sigillanti Penosil, fissaggio Surelock ed elettroutensili Kombo Pro 20V`,
        prodottiCompatti:
          'quadri cantiere e incasso Marlanvil, prese CEE Omega, serie civile Mapam e Idrobox IP55, illuminazione LED Stellar, chimico Penosil, fissaggio Surelock e utensili Kombo Pro 20V',
        prodottiMatriceReparti: [
          '• **Cantiere & Incasso** → Quadri stagni IP65 e scatole *Marlanvil*, prese CEE e avvolgicavo *Omega*',
          '• **Capitolati Civili** → Serie civile *Mapam* e contenitori stagni *Idrobox IP55* compatibili',
          '• **Posa, Chimico & Luce** → Proiettori LED *Stellar*, sigillanti *Penosil*, fissaggio *Surelock*, utensili *Kombo Pro 20V*',
        ].join('\n'),
        scenarioMestiereSettore: `Nella gestione cantieri di nuova costruzione e ristrutturazione come quelli curati da ${companyClean} su ${areaLabel}${webRef}, accentrare su un unico canale B2B diretto dotazioni elettriche, serie civile, illuminazione, fissaggio e sigillanti riduce sensibilmente i costi di approvvigionamento.`,
      };

    case 'Termoidraulica_Clima':
      return {
        prodottiProsa:
          'quadri stagni IP65, magnetotermici, differenziali, contattori HVAC e scaricatori SPD Elmark e Marlanvil, staffaggio, ancoranti e fascette UV/acciaio Surelock, schiume e sigillanti tecnici Penosil, spine e multiprese Omega, contenitori Idrobox IP55 ed elettroutensili Kombo Pro 20V Brushless',
        prodottiCompatti:
          'quadri IP65, protezioni e contattori HVAC Elmark/Marlanvil, staffaggio e fascette Surelock, sigillanti Penosil, prese Omega ed elettroutensili Kombo Pro 20V',
        prodottiMatriceReparti: [
          '• **Comando & Protezione HVAC** → Quadri IP65, magnetotermici, differenziali e contattori *Elmark / Marlanvil*',
          '• **Staffaggio & Sigillatura** → Ancoranti e fascette UV/acciaio *Surelock*, schiume e siliconi *Penosil*',
          '• **Utensileria & Cantiere** → Linea brushless *Kombo Pro 20V*, prese/multiprese *Omega*, LED *Stellar*',
        ].join('\n'),
        scenarioMestiereSettore: `Spesso nelle imprese termoidrauliche e HVAC come ${companyClean} su ${areaLabel}${webRef} i materiali elettrici di comando/protezione, le scatole stagne, il fissaggio e i sigillanti vengono acquistati in modo frammentato a condizioni meno favorevoli rispetto al materiale idraulico principale.`,
      };

    case 'Fotovoltaico_Rinnovabili':
      return {
        prodottiProsa: `scaricatori di sovratensione SPD AC/DC, sezionatori, portafusibili, interruttori modulari e quadri stagni IP65 Elmark e Marlanvil, tubazione rigida RK, pressacavi IP68, fascettatura resistente UV e in acciaio Surelock, sigillanti Penosil, corpi illuminanti LED Stellar e serie civile Mapam (${compatProse})`,
        prodottiCompatti:
          'scaricatori SPD AC/DC, sezionatori, quadri stagni IP65 e pressacavi IP68 Elmark/Marlanvil, fascette UV/acciaio Surelock, sigillanti Penosil e LED Stellar',
        prodottiMatriceReparti: [
          '• **Protezione Impianti & Solare** → Scaricatori SPD, sezionatori, modulari e quadri IP65 *Elmark / Marlanvil*',
          '• **Canalizzazione & Fissaggio UV** → Tubazione RK, pressacavi IP68 *Elmark*, fascette UV/acciaio *Surelock*, chimico *Penosil*',
          '• **Relamping LED & Smart** → Illuminazione professionale *Stellar* e moduli smart *Proxe / Sonoff*',
        ].join('\n'),
        scenarioMestiereSettore: `Nelle installazioni fotovoltaiche e di efficienza energetica seguite da realtà come ${companyClean} su ${areaLabel}${webRef}, la disponibilità immediata a listino diretto di protezioni SPD, quadri stagni, pressacavi e fissaggio per esterno incide in modo netto sui tempi e sui costi di cantiere.`,
      };

    case 'Sicurezza_Automazione':
      return {
        prodottiProsa: `telecamere IP PoE, alimentatori stabilizzati DIN, moduli smart Wi-Fi/Zigbee Proxe / Sonoff, cassette di derivazione IP65, quadri e pressacavi IP68 Marlanvil ed Elmark, proiettori perimetrali LED Stellar, serie civile Mapam (${compatProse}), fissaggio Surelock ed elettroutensili Kombo Pro 20V`,
        prodottiCompatti:
          'telecamere IP PoE, alimentatori DIN, cassette IP65 e pressacavi IP68 Marlanvil/Elmark, moduli smart Proxe / Sonoff, proiettori LED Stellar e fissaggio Surelock',
        prodottiMatriceReparti: [
          '• **TVCC & Smart Building** → Telecamere IP PoE, alimentatori DIN e moduli Wi-Fi/Zigbee *Proxe / Sonoff*',
          '• **Contenitori & Protezione Linea** → Cassette IP65 e quadri *Marlanvil / Elmark*, pressacavi IP68, *Idrobox IP55*',
          '• **Perimetrale & Installazione** → Proiettori LED *Stellar*, fissaggio *Surelock*, utensili *Kombo Pro 20V*',
        ].join('\n'),
        scenarioMestiereSettore: `Per chi realizza impianti di sicurezza, TVCC e automazione come ${companyClean} su ${areaLabel}${webRef}, approvvigionare a listino B2B diretto contenitori stagni, alimentazione, apparati PoE, smart control e minuteria di posa permette di ottimizzare il costo complessivo di ogni installazione.`,
      };

    case 'Architetto_Ingegnere':
      return {
        prodottiProsa: `corpi illuminanti architetturali, pannelli UGR per uffici, sistemi a binario e strip LED 24V con profili in alluminio Stellar ed Elmark, serie civile Mapam con placche in vetro, metallo e tecnopolimero (${compatProse}), comandi smart Proxe / Sonoff e quadristica certificata CE Marlanvil ed Elmark`,
        prodottiCompatti:
          'corpi illuminanti LED UGR, binari e strip LED 24V con profili in alluminio Stellar/Elmark, serie civile Mapam, smart control Proxe / Sonoff e quadristica CE Marlanvil',
        prodottiMatriceReparti: [
          '• **Illuminotecnica & Terziario** → Faretti, binari, pannelli UGR e strip LED 24V con profili *Stellar / Elmark*',
          '• **Estetica Punto Luce** → Serie civile *Mapam* (vetro, metallo, tecnopolimero) e comandi smart *Proxe / Sonoff*',
          '• **Quadristica Certificata CE** → Centralini rasomuro/incasso *Marlanvil* e protezioni modulari *Elmark*',
        ].join('\n'),
        scenarioMestiereSettore: `Nei progetti residenziali, direzionali e commerciali seguiti da studi come ${companyClean} su ${areaLabel}${webRef}, coniugare resa illuminotecnica, coordinamento estetico dei punti comando e sostenibilità del computo metrico richiede linee certificate con quotazioni B2B trasparenti.`,
      };

    case 'Serramentista':
      return {
        prodottiProsa:
          'schiume poliuretaniche ad alta resa e siliconi neutri certificati Penosil, tasselli, ancoranti e fascettatura Surelock, elettroutensili brushless Kombo Pro 20V con dischi e punte Elmark, oltre ad alimentatori slim, profili in alluminio, strip LED 24V Stellar e comandi elettrici Mapam / Proxe',
        prodottiCompatti:
          'schiume poliuretaniche e siliconi neutri Penosil, viteria e fissaggio Surelock, elettroutensili brushless Kombo Pro 20V e profili strip LED 24V Stellar',
        prodottiMatriceReparti: [
          '• **Sigillatura & Posa Infissi** → Schiume poliuretaniche e siliconi neutri *Penosil*, fissaggio *Surelock*',
          '• **Officina & Montaggio** → Avvitatori, trapani e smerigliatrici *Kombo Pro 20V*, taglio/punte *Elmark*',
          '• **LED Integrato & Comando** → Strip LED 24V e profili alluminio *Stellar*, pulsanti comando *Mapam / Proxe*',
        ].join('\n'),
        scenarioMestiereSettore: `Nella produzione e posa qualificata di serramenti e carpenteria svolta da aziende come ${companyClean} su ${areaLabel}${webRef}, la continuità qualitativa di schiume, sigillanti neutri, ancoraggi ed elettroutensili incide ogni giorno sui tempi di montaggio e sulla tenuta dell’opera.`,
      };

    case 'Installatore_Civile':
    default:
      return {
        prodottiProsa: `serie civile Mapam e contenitori Idrobox IP55 (${compatProse}), oltre a scatole e centralini stagni Marlanvil, protezioni modulari${hasEvOrPv ? ' e scaricatori SPD' : ''} e pressacavi IP68 Elmark, illuminazione LED Stellar, dispositivi smart Proxe / Sonoff e fissaggio Surelock`,
        prodottiCompatti: `serie civile Mapam e Idrobox IP55, incasso e centralini IP65 Marlanvil, modulari DIN${hasEvOrPv ? '/SPD' : ''} Elmark, illuminazione LED Stellar e moduli smart Proxe / Sonoff`,
        prodottiMatriceReparti: [
          `• **Civile & Incasso** → *Mapam* e *Idrobox IP55* (${civilBrandMatched ? `compatibili standard ${civilBrandMatched}` : 'compatibili standard mercato'}), scatole e centralini *Marlanvil*`,
          `• **Quadro & Posa** → Modulari DIN${hasEvOrPv ? ', SPD' : ''}, tubazione RK e pressacavi IP68 *Elmark*, fissaggio *Surelock*`,
          '• **Luce & Smart** → Corpi illuminanti e strip LED 24V *Stellar*, moduli smart *Proxe / Sonoff*, TVCC IP PoE',
        ].join('\n'),
        scenarioMestiereSettore: `Quando si quota o si realizza un impianto elettrico civile o terziario — come nell’attività di ${companyClean} su ${areaLabel}${webRef} — disporre di un canale B2B diretto e compatibile su serie civile, quadristica e illuminazione LED consente di difendere il margine operativo senza compromessi tecnici.`,
      };
  }
}

export function composeProspectIntelligence(
  input: BuildOutreachEmailInput,
  pickIndexFn: (len: number) => number
): ProspectIntelligenceSummary {
  const meta =
    input.richMetadata && typeof input.richMetadata === 'object'
      ? (input.richMetadata as Record<string, any>)
      : {};

  const catCfg = resolveClusterConfig(input.categoryCluster);
  const cluster = catCfg.cluster;
  const isReseller = catCfg.commercialCategory === 'RIV';

  const vatOfficialName = meta.vat_official_name ? String(meta.vat_official_name) : null;
  const companyClean = cleanCompanyDisplayName(input.companyName, vatOfficialName);

  const decisionMakerClean = extractVerifiedDecisionMaker(
    input.decisionMaker || meta.decision_maker || null,
    input.companyName,
    vatOfficialName
  );

  const domainClean = extractCleanDomain(input.website || meta.website || null);

  const cityClean = String(input.city || '').trim();
  const provinceClean = String(input.province || '').trim().toUpperCase();
  const areaLabel = cityClean
    ? provinceClean && provinceClean.length === 2 && provinceClean !== 'IT'
      ? `${cityClean} e provincia (${provinceClean})`
      : `l’area di ${cityClean}`
    : 'il territorio nazionale';

  const specializations = extractCleanSpecializations(
    meta.company_features,
    meta.ateco_description
  );
  const specializationsLabel =
    specializations.length > 0 ? formatItalianList(specializations) : null;

  const detectedBrands = parseStringArrayFlexible(input.brandsDetected);
  const civilBrandOrder = ['BTicino', 'Vimar', 'Gewiss', 'Ave'];
  const civilBrandMatched =
    civilBrandOrder.find((cb) =>
      detectedBrands.some((db) => db.toLowerCase().includes(cb.toLowerCase()))
    ) || null;

  const foundationYear = extractFoundationYear(meta.foundation_date);
  const certificationsLabel = extractCertificationsLabel(meta.certifications);

  const sectorInfo = resolveSectorLabels(cluster);

  // Saluto personalizzato (usa il nome verificato del Titolare se presente, con varietà professionale)
  let salutoPersonalizzato: string;
  if (decisionMakerClean) {
    const dmGreetings = [
      `Gentile ${decisionMakerClean},`,
      `Alla cortese attenzione di ${decisionMakerClean} — ${companyClean},`,
      `Gentile ${decisionMakerClean} (${companyClean}),`,
      `Spettabile ${companyClean}, alla c.a. di ${decisionMakerClean},`,
    ];
    salutoPersonalizzato = dmGreetings[pickIndexFn(dmGreetings.length)];
  } else {
    const corpGreetings = [
      `Spettabile ${companyClean},`,
      `Gentile Ufficio Acquisti di ${companyClean},`,
      `Alla cortese attenzione dell’Ufficio Acquisti di ${companyClean},`,
      `Spettabile Direzione di ${companyClean},`,
      `Gentili Referenti di ${companyClean},`,
    ];
    salutoPersonalizzato = corpGreetings[pickIndexFn(corpGreetings.length)];
  }

  // Intestazione sintetica per oggetto email (senza "Alla c.a. di" per evitare raddoppi con il template)
  let intestazioneOggetto: string;
  if (decisionMakerClean && pickIndexFn(2) === 0) {
    intestazioneOggetto = `${companyClean} (c.a. ${decisionMakerClean})`;
  } else if (cityClean) {
    intestazioneOggetto = `${companyClean} (${cityClean})`;
  } else {
    intestazioneOggetto = companyClean;
  }

  // Clausole opzionali storicità e certificazioni
  const historyBit = foundationYear ? `, attiva dal ${foundationYear}` : '';
  const certBit = certificationsLabel
    ? ` e qualificata (${certificationsLabel})`
    : '';

  // Costruzione {FRASE_CONTESTO_DB} (frase autonoma completa) e {INCISO_CONTESTO_DB} (subordinata minuscola)
  let fraseContestoDb: string;
  let incisoContestoDb: string;

  if (domainClean && specializationsLabel) {
    const fullSentences = [
      `Operando nella fornitura all’ingrosso per ${sectorInfo.sectorPlural} attivi su ${areaLabel}, abbiamo visionato la Vostra realtà tramite il sito ${domainClean}${historyBit}${certBit}, con particolare riferimento alle attività di ${specializationsLabel}.`,
      `Seguendo ${sectorInfo.sectorPlural} su ${areaLabel}, abbiamo approfondito tramite il sito ${domainClean} il profilo operativo di ${companyClean}${historyBit}${certBit} nei comparti ${specializationsLabel}.`,
      `Nell’ambito della distribuzione B2B per ${sectorInfo.sectorPlural} su ${areaLabel}, conosciamo il profilo di ${companyClean} (${domainClean})${historyBit}${certBit} e la Vostra operatività su ${specializationsLabel}.`,
      `Avendo esaminato il profilo strutturato di ${companyClean} (${domainClean})${historyBit}${certBit}, attiva su ${areaLabel} nell’ambito di ${specializationsLabel}, sottoponiamo alla Vostra attenzione la nostra struttura distributiva B2B.`,
    ];

    const incisi = [
      `avendo visionato tramite il sito ${domainClean} l’attività svolta da ${companyClean}${historyBit}${certBit} su ${areaLabel} nell’ambito di ${specializationsLabel}`,
      `in relazione all’operatività di ${companyClean} su ${areaLabel} (${domainClean})${historyBit}${certBit} nei comparti ${specializationsLabel}`,
      `avendo approfondito sul sito ${domainClean} il profilo di ${companyClean}${historyBit}${certBit}, attiva su ${areaLabel} su ${specializationsLabel}`,
    ];
    fraseContestoDb = fullSentences[pickIndexFn(fullSentences.length)];
    incisoContestoDb = incisi[pickIndexFn(incisi.length)];
  } else if (domainClean) {
    const webSentences = [
      `Operando nella distribuzione B2B per ${sectorInfo.sectorPlural} su ${areaLabel}, abbiamo visionato il profilo di ${companyClean}${historyBit}${certBit} tramite il sito ${domainClean}.`,
      `Seguendo ${sectorInfo.sectorPlural} attivi su ${areaLabel}, conosciamo l’attività svolta da ${companyClean} (${domainClean})${historyBit}${certBit} nel comparto ${sectorInfo.sectorNoun}.`,
      `Avendo approfondito tramite il sito ${domainClean} l’operatività di ${companyClean}${historyBit}${certBit} su ${areaLabel}, sottoponiamo alla Vostra valutazione il nostro servizio di fornitura all’ingrosso.`,
    ];
    const webIncisi = [
      `avendo visionato sul sito ${domainClean} l’attività di ${companyClean}${historyBit}${certBit} su ${areaLabel} nel settore ${sectorInfo.sectorNoun}`,
      `in relazione all’attività svolta da ${companyClean} (${domainClean})${historyBit}${certBit} su ${areaLabel}`,
    ];
    fraseContestoDb = webSentences[pickIndexFn(webSentences.length)];
    incisoContestoDb = webIncisi[pickIndexFn(webIncisi.length)];
  } else if (specializationsLabel) {
    const specSentences = [
      `Operando nella fornitura all’ingrosso per ${sectorInfo.sectorPlural} su ${areaLabel}, seguiamo da vicino le realtà attive${historyBit}${certBit} nell’ambito di ${specializationsLabel}.`,
      `Seguendo ${sectorInfo.sectorPlural} operativi su ${areaLabel}, conosciamo le esigenze tecniche di ${companyClean}${historyBit}${certBit} nei comparti ${specializationsLabel}.`,
    ];
    const specIncisi = [
      `in relazione all’attività svolta da ${companyClean}${historyBit}${certBit} su ${areaLabel} nell’ambito di ${specializationsLabel}`,
      `operando nella fornitura B2B per ${sectorInfo.sectorPlural} attivi su ${areaLabel} su ${specializationsLabel}`,
    ];
    fraseContestoDb = specSentences[pickIndexFn(specSentences.length)];
    incisoContestoDb = specIncisi[pickIndexFn(specIncisi.length)];
  } else {
    const baseSentences = [
      `Operando nella fornitura all’ingrosso per ${sectorInfo.sectorPlural} attivi su ${areaLabel}, seguiamo con continuità gli operatori professionali di ${sectorInfo.sectorNoun}${historyBit}${certBit}.`,
      `Seguendo ${sectorInfo.sectorPlural} operativi su ${areaLabel}, affianchiamo quotidianamente le strutture impegnate nel comparto ${sectorInfo.sectorNoun}${historyBit}${certBit}.`,
    ];
    const baseIncisi = [
      `in relazione all’attività di ${companyClean}${historyBit}${certBit} su ${areaLabel} nel comparto ${sectorInfo.sectorNoun}`,
      `collaborando con ${sectorInfo.sectorPlural} operativi su ${areaLabel}`,
    ];
    fraseContestoDb = baseSentences[pickIndexFn(baseSentences.length)];
    incisoContestoDb = baseIncisi[pickIndexFn(baseIncisi.length)];
  }

  let salutoUmano1a1: string;
  if (decisionMakerClean) {
    const dmHuman = [
      `Buongiorno ${decisionMakerClean},`,
      `Gentile ${decisionMakerClean},`,
    ];
    salutoUmano1a1 = dmHuman[pickIndexFn(dmHuman.length)];
  } else {
    const corpHuman = [
      `Buongiorno ai Referenti Acquisti di ${companyClean},`,
      `Buongiorno,`,
      `Gentili Referenti di ${companyClean},`,
    ];
    salutoUmano1a1 = corpHuman[pickIndexFn(corpHuman.length)];
  }

  const fallbackTerritoryOptions = [
    `Seguendo ${sectorInfo.sectorPlural} operativi su ${areaLabel}, contattiamo la Vostra struttura per presentare Izzo Distribuzione S.r.l.`,
    `Operando a supporto di ${sectorInfo.sectorPlural} attivi su ${areaLabel}, sottoponiamo alla Vostra valutazione il canale all’ingrosso di Izzo Distribuzione S.r.l.`,
    `Collaborando con ${sectorInfo.sectorPlural} attivi su ${areaLabel}, sintetizziamo i riferimenti B2B di Izzo Distribuzione S.r.l.`,
  ];
  const contestoTerritorioFallback =
    fallbackTerritoryOptions[pickIndexFn(fallbackTerritoryOptions.length)];

  const scopoFornituraSettore =
    sectorInfo.scopoVariants[pickIndexFn(sectorInfo.scopoVariants.length)];
  const chiusuraSettore =
    sectorInfo.chiusuraVariants[pickIndexFn(sectorInfo.chiusuraVariants.length)];
  const lineeProdottiIzzo = buildTailoredProductBullets(
    cluster,
    civilBrandMatched,
    specializations,
    pickIndexFn(4)
  );
  const structuralVariants = buildStructuralSectorVariants(
    cluster,
    companyClean,
    domainClean,
    areaLabel,
    civilBrandMatched,
    specializations
  );

  return {
    companyClean,
    decisionMakerClean,
    domainClean,
    cityClean,
    provinceClean,
    areaLabel,
    cluster,
    isReseller,
    sectorPlural: sectorInfo.sectorPlural,
    sectorNoun: sectorInfo.sectorNoun,
    specializations,
    specializationsLabel,
    detectedBrands,
    civilBrandMatched,
    foundationYear,
    certificationsLabel,
    salutoPersonalizzato,
    salutoUmano1a1,
    intestazioneOggetto,
    fraseContestoDb,
    incisoContestoDb,
    contestoTerritorioFallback,
    scenarioMestiereSettore: structuralVariants.scenarioMestiereSettore,
    scopoFornituraSettore,
    lineeProdottiIzzo,
    prodottiProsa: structuralVariants.prodottiProsa,
    prodottiCompatti: structuralVariants.prodottiCompatti,
    prodottiMatriceReparti: structuralVariants.prodottiMatriceReparti,
    chiusuraSettore,
  };
}
