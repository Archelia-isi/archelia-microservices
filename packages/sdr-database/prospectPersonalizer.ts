import {
  resolveClusterConfig,
  type CanonicalB2BCluster,
  type BuildOutreachEmailInput,
} from './index';

export interface ProspectIntelligenceSummary {
  companyClean: string;
  companyShortSubject: string;
  companyBodyShort: string;
  compRefDi: string;
  locPhrase: string;
  locPhraseAfterCompany: string;
  decisionMakerClean: string | null;
  isDirectPerson: boolean;
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
  salutoModerno: string;
  salutoPersonalizzato: string;
  salutoUmano1a1: string;
  intestazioneOggetto: string;
  microPresentazioneIzzo: string;
  prodottiMiratiBrevi: string;
  fraseAggancioBreve: string;
  domandaFinaleBreve: string;
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
  /** true se la ragione sociale è puramente generica ("Elettroimpianti", "Forniture Elettriche"): companyShortSubject/companyBodyShort/compRefDi usano il fallback neutro di registro */
  isGenericCompanyName: boolean;
  /** "la vostra" / "il vostro" / "la sua" / "il suo" se isGenericCompanyName, altrimenti uguale a companyBodyShort (per frasi "imprese come ...") */
  companyPossessiveRef: string;
}

const NON_PERSON_TOKENS = new Set([
  'srl',
  'srls',
  'spa',
  'snc',
  'sas',
  'soc',
  'coop',
  'scarl',
  'societa',
  'società',
  'responsabilita',
  'responsabilità',
  'limitata',
  'semplificata',
  'unipersonale',
  'azioni',
  'accomandita',
  'semplice',
  'collettivo',
  'ditta',
  'impresa',
  'imprese',
  'azienda',
  'aziende',
  'flli',
  'fratelli',
  'sorelle',
  'eredi',
  'figli',
  'impianti',
  'impianto',
  'impiantistica',
  'impiantistiche',
  'applicata',
  'applicate',
  'applicati',
  'applicato',
  'elettrici',
  'elettrico',
  'elettrica',
  'elettriche',
  'elettronica',
  'elettrotecnica',
  'elettroforniture',
  'fibra',
  'ottica',
  'termoidraulica',
  'termoidraulici',
  'termoidraulico',
  'idraulica',
  'idraulici',
  'idraulico',
  'caldaie',
  'caldaia',
  'bruciatori',
  'clima',
  'climatizzazione',
  'condizionamento',
  'riscaldamento',
  'fotovoltaico',
  'fotovoltaici',
  'solare',
  'solari',
  'energia',
  'energie',
  'rinnovabili',
  'costruzioni',
  'costruzione',
  'edile',
  'edili',
  'edilizia',
  'ristrutturazioni',
  'ristrutturazione',
  'restauri',
  'scavi',
  'escavazioni',
  'demolizioni',
  'movimento',
  'terra',
  'stradale',
  'stradali',
  'ferramenta',
  'utensileria',
  'utensili',
  'chiavi',
  'cerniere',
  'serrature',
  'serratura',
  'fabbro',
  'carpenteria',
  'carpenterie',
  'metallica',
  'metalliche',
  'vetreria',
  'vetri',
  'falegnameria',
  'legnami',
  'ceramiche',
  'ceramica',
  'mobili',
  'arredi',
  'arredamenti',
  'forni',
  'antennistica',
  'illuminazione',
  'illuminotecnica',
  'luce',
  'luci',
  'lampadari',
  'sicurezza',
  'antifurto',
  'antifurti',
  'videosorveglianza',
  'automazione',
  'automazioni',
  'domotica',
  'quadri',
  'cablaggi',
  'cablaggio',
  'serramenti',
  'serramento',
  'infissi',
  'infisso',
  'porte',
  'finestre',
  'tende',
  'studio',
  'associato',
  'associati',
  'associata',
  'associate',
  'tecnico',
  'tecnici',
  'tecnica',
  'tecniche',
  'progettazione',
  'progettazioni',
  'ingegneria',
  'architettura',
  'servizi',
  'multiservizi',
  'trasporti',
  'autotrasporti',
  'pulizie',
  'manutenzione',
  'manutenzioni',
  'assistenza',
  'riparazioni',
  'srl',
  'srls',
  'spa',
  'snc',
  'sas',
  'scarl',
  'noleggio',
  'vendita',
  'forniture',
  'fornitura',
  'distribuzione',
  'ingrosso',
  'dettaglio',
  'immobiliare',
  'tecnologie',
  'tecnologia',
  'sistemi',
  'sistema',
  'soluzioni',
  'italia',
  'italiana',
  'europea',
  'sud',
  'nord',
  'est',
  'ovest',
  'centrale',
  'meridionale',
  'via',
  'viale',
  'piazza',
  'piazzale',
  'corso',
  'largo',
  'contrada',
  'monte',
  'santa',
  'santo',
  'san',
  'borgo',
  'centro',
  'punto',
  'casa',
  'mondo',
  'arte',
  'stile',
  'linea',
  'linee',
  'rete',
  'reti',
  'nuova',
  'nuovo',
  'nuove',
  'nuovi',
  'moderna',
  'moderno',
  'generale',
  'generali',
  'industriale',
  'industriali',
  'civile',
  'civili',
  'milano',
  'roma',
  'napoli',
  'torino',
  'bologna',
  'bari',
  'firenze',
  'venezia',
  'verona',
  'padova',
  'brescia',
  'bergamo',
  'aquila',
  'spezia',
  'commerciale',
  'commerciali',
  'amministrazione',
  'ufficio',
  'direzione',
  'segreteria',
  'vendite',
  'acquisti',
  'team',
  'staff',
  'info',
  'group',
  'holding',
  'service',
  'general',
  'contractor',
  'ecommerce',
  'sig',
  'sigra',
  'ra',
  'dott',
  'dr',
  'ssa',
  'ing',
  'geom',
  'arch',
  'rag',
  'avv',
  'per',
  'ind',
  'lavorazione',
  'lavorazioni',
  'metalli',
  'metallo',
  'metal',
  'legno',
  'ferro',
  'alluminio',
  'acciaio',
  'vetro',
  'plastica',
  'compositi',
  'materiali',
  'matriali',
  'lattoneria',
  'lattonerie',
  'condizionamento',
  'cooperativa',
  'coop',
  // Sedi, luoghi, urgenze e oggetti scambiati per persone (#179)
  'officina',
  'officine',
  'allarme',
  'allarmi',
  'urgenza',
  'urgenze',
  'pronto',
  'intervento',
  'interventi',
  'sede',
  'sedi',
  'filiale',
  'filiali',
  'magazzino',
  'magazzini',
  'stabilimento',
  'deposito',
  'showroom',
  'negozio',
  'scuola',
  'sci',
  'piscina',
  'caldaie',
  'caldaia',
  'condizionatori',
  'climatizzatori',
  'tapparelle',
  'zanzariere',
  'serrande',
  'finestrarredo',
  'alta',
  'bassa',
  'superiore',
  'inferiore',
  'elettricista',
  'elettricisti',
  'idraulico',
  'idraulici',
  'termoidraulico',
  'antennista',
  'antennisti',
  'falegname',
  'muratore',
  'muratori',
  'artigiano',
  'artigiani',
  'artigiana',
  'colori',
  'vernici',
  'green',
  'professionista',
  'professionisti',
  'libero',
  'figlio',
  'figlia',
  'responsabile',
  'direttore',
  'titolare',
  'amministratore',
  'proprietario',
  'socio',
  'soci',
  'presidente',
  'legale',
  'rappresentante',
  'geometra',
  'geomet',
  'ingegnere',
  'architetto',
  'dottore',
  'dottor',
  'dottoressa',
  'ragioniere',
  'ragionier',
  'avvocato',
  'perito',
  'ed',
  'liquidazione',
  'fallimento',
  'concordato',
  'archistudio',
  'tecnistudio',
  'edilstudio',
]);

/** Etichette di mestiere/ruolo rimovibili in testa/coda a un candidato titolare (es. "Officina Armenise Nicola", "Giuseppe Napolitano Responsabile", "Dalpadulo Arch. Alberto Archistudio"). */
const DM_EDGE_TRADE_TOKENS = new Set([
  'officina',
  'elettricista',
  'elettricisti',
  'idraulico',
  'termoidraulico',
  'termoidraulica',
  'antennista',
  'fabbro',
  'falegname',
  'muratore',
  'artigiano',
  'ditta',
  'impresa',
  'studio',
  'archistudio',
  'tecnistudio',
  'edilstudio',
  'liquidazione',
  'fallimento',
  'concordato',
  'geometra',
  'architetto',
  'ingegnere',
  'responsabile',
  'direttore',
  'titolare',
  'amministratore',
  'proprietario',
  'junior',
  'senior',
  'jr',
  'sr',
]);

/** Radici merceologiche/brand che non possono mai far parte di un nome di persona (es. "Tecnofer", "Finestrarredo", "Archistudio"). */
const NON_PERSON_STEM_RE =
  /^(?:tecno|elettro|idro|termo|edil(?!i[oa]$)|arred|finestr|serrament|infiss|impiant|ferrament|colorific|climat|caldai|condizion|allarm|antenn|domotic|automaz|ristruttur|costruz|lavoraz|serviz|sistem|soluz|fornitur|install|manutenz|illumin|sicurez|carpenter|lattoner|falegnam|vetrer|metal)|[a-zà-ÿ]{4,}studio$/i;

/** Parola immediatamente prima di " di " che indica una sede/luogo, mai un titolare (es. "Sede e Magazzino di Reggio Emilia"). */
const DM_LOCATION_PREFIX_WORDS = new Set([
  'sede',
  'sedi',
  'magazzino',
  'magazzini',
  'filiale',
  'filiali',
  'stabilimento',
  'deposito',
  'showroom',
  'negozio',
  'vendita',
  'eredi',
  'scuola',
  'piscina',
  'ufficio',
  'uffici',
  'zona',
  'area',
  'frazione',
  'località',
  'localita',
  'comune',
  'provincia',
  'città',
  'citta',
  'paese',
  'italiana',
  'italiano',
]);

function isNonPersonToken(token: string): boolean {
  const lower = token.toLowerCase().replace(/[^a-zà-ÿ’]/g, '');
  if (!lower) return true;
  if (NON_PERSON_TOKENS.has(lower.replace(/’/g, ''))) return true;
  if (NON_PERSON_STEM_RE.test(lower)) return true;
  return lower
    .split('’')
    .filter((p) => p.length >= 3)
    .some((p) => NON_PERSON_TOKENS.has(p) || NON_PERSON_STEM_RE.test(p));
}

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

const RECOGNIZED_TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/^(?:dottoressa|dott\.?\s*ssa\.?|dr\.?\s*ssa\.?)(?:\s+|$)/i, 'Dott.ssa'],
  [/^(?:signora|sig\.?\s*ra\.?)(?:\s+|$)/i, 'Sig.ra'],
  [/^(?:perito\s+(?:industriale|edile)|per\.?\s*(?:ind|ed)\.?)(?:\s+|$)/i, 'Per.'],
  [/^(?:ingegnere|ing\.?)(?:\s+|$)/i, 'Ing.'],
  [/^(?:architetto|arch\.?)(?:\s+|$)/i, 'Arch.'],
  [/^(?:geometra|geomet\.?|geom\.?)(?:\s+|$)/i, 'Geom.'],
  [/^(?:dottore|dottor|dott\.?|dr\.?)(?:\s+|$)/i, 'Dott.'],
  [/^(?:ragioniere|ragionier|rag\.?)(?:\s+|$)/i, 'Rag.'],
  [/^(?:perito|per\.?)(?:\s+|$)/i, 'Per.'],
  [/^(?:avvocato|avv\.?)(?:\s+|$)/i, 'Avv.'],
  [/^(?:signor|sig\.?)(?:\s+|$)/i, 'Sig.'],
];

const SURNAME_PARTICLES = new Set([
  'de',
  'di',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'dal',
  'dalla',
  'da',
  'la',
  'lo',
  'li',
  'le',
  'san',
]);

const COMMON_MALE_FIRST_NAMES = new Set([
  'marco',
  'mario',
  'luigi',
  'giuseppe',
  'giovanni',
  'francesco',
  'antonio',
  'roberto',
  'stefano',
  'paolo',
  'alessandro',
  'alex',
  'luca',
  'matteo',
  'mattia',
  'davide',
  'daniele',
  'salvatore',
  'vincenzo',
  'enzo',
  'giorgio',
  'massimo',
  'massimiliano',
  'claudio',
  'maurizio',
  'fabio',
  'simone',
  'enrico',
  'michele',
  'nicola',
  'sergio',
  'carlo',
  'pietro',
  'piero',
  'filippo',
  'riccardo',
  'emanuele',
  'emanuel',
  'manuel',
  'samuele',
  'federico',
  'lorenzo',
  'cristian',
  'christian',
  'gianluca',
  'giancarlo',
  'gianfranco',
  'gianpaolo',
  'giampaolo',
  'gianpiero',
  'pierluigi',
  'pierpaolo',
  'pierangelo',
  'piergiorgio',
  'gianmarco',
  'gianmaria',
  'bruno',
  'franco',
  'aldo',
  'gianni',
  'valerio',
  'fabrizio',
  'raffaele',
  'domenico',
  'pasquale',
  'gennaro',
  'ciro',
  'angelo',
  'marcello',
  'sandro',
  'alberto',
  'vittorio',
  'cesare',
  'renato',
  'renzo',
  'emilio',
  'silvano',
  'silvio',
  'tiziano',
  'ezio',
  'ivano',
  'ivan',
  'mauro',
  'dario',
  'tommaso',
  'thomas',
  'gabriele',
  'edoardo',
  'diego',
  'mirko',
  'walter',
  'valter',
  'andrea',
  'giacomo',
  'jacopo',
  'leonardo',
  'leo',
  'luciano',
  'giuliano',
  'giulio',
  'graziano',
  'guido',
  'umberto',
  'adriano',
  'adrian',
  'alfredo',
  'armando',
  'arturo',
  'corrado',
  'cosimo',
  'costel',
  'damiano',
  'danilo',
  'denis',
  'dino',
  'donato',
  'egidio',
  'elio',
  'ermanno',
  'ernesto',
  'ettore',
  'eugenio',
  'fausto',
  'flavio',
  'fulvio',
  'gaetano',
  'gerardo',
  'gheorghe',
  'gino',
  'igor',
  'kevin',
  'loris',
  'moreno',
  'nunzio',
  'omar',
  'orazio',
  'oscar',
  'ottavio',
  'rocco',
  'rodolfo',
  'rosario',
  'ruggero',
  'saverio',
  'sebastiano',
  'ugo',
  'vito',
  'yuri',
]);

const COMMON_FEMALE_FIRST_NAMES = new Set([
  'anna',
  'maria',
  'laura',
  'giulia',
  'sara',
  'chiara',
  'francesca',
  'elena',
  'paola',
  'roberta',
  'stefania',
  'silvia',
  'valentina',
  'martina',
  'federica',
  'elisa',
  'alessandra',
  'daniela',
  'monica',
  'barbara',
  'cristina',
  'simona',
  'patrizia',
  'antonella',
  'giovanna',
  'teresa',
  'rosa',
  'angela',
  'lucia',
  'caterina',
  'claudia',
  'manuela',
  'emanuela',
  'raffaella',
  'cinzia',
  'nadia',
  'sonia',
  'michela',
  'tiziana',
  'sabrina',
  'gabriella',
  'elisabetta',
  'veronica',
  'irene',
  'ilaria',
  'serena',
  'beatrice',
  'camilla',
  'arianna',
  'eleonora',
  'marta',
  'giorgia',
  'alice',
  'noemi',
  'valeria',
  'viviana',
  'rossella',
  'marina',
  'lorena',
  'luisa',
  'carla',
  'rita',
]);

// Dizionario esteso dei nomi di battesimo (italiani + comunità più presenti in Italia), usato dalla
// "regola aurea" anti-falso-titolare: senza titolo onorifico, un candidato è persona SOLO se contiene un nome noto.
// Esclusi di proposito nomi-parola ambigui nelle ragioni sociali (libero, primo, secondo, santo, stella, luce, gioia, fiore, pace, vera).
for (const n of [
  'adolfo', 'agostino', 'alberico', 'alessio', 'alfio', 'alfonso', 'alvaro', 'ambrogio', 'amedeo', 'amerigo',
  'aniello', 'anselmo', 'antimo', 'antonello', 'antonino', 'arcangelo', 'aristide', 'arnaldo', 'arrigo', 'attilio',
  'augusto', 'aurelio', 'basilio', 'benedetto', 'beniamino', 'benito', 'bernardo', 'biagio', 'calogero', 'camillo',
  'carmelo', 'carmine', 'celestino', 'cirillo', 'clemente', 'concetto', 'costantino', 'cosmo', 'crescenzo', 'cristiano',
  'cristoforo', 'dante', 'david', 'daniel', 'demetrio', 'donatello', 'edmondo', 'efisio', 'elia', 'eliseo',
  'elvio', 'emidio', 'emiliano', 'enea', 'ennio', 'erasmo', 'ercole', 'eric', 'erik', 'ermes',
  'eros', 'evaristo', 'fabiano', 'fedele', 'felice', 'ferdinando', 'fernando', 'ferruccio', 'filiberto', 'fiorenzo',
  'fortunato', 'gaspare', 'gastone', 'gavino', 'giacinto', 'giambattista', 'gianbattista', 'giovanbattista', 'gianantonio', 'giandomenico',
  'gianfilippo', 'gianlorenzo', 'gianluigi', 'gianmario', 'gianpietro', 'giampietro', 'giampiero', 'giancarlo', 'gilberto', 'gioacchino',
  'giordano', 'giosue', 'giosuè', 'girolamo', 'giustino', 'goffredo', 'gregorio', 'guglielmo', 'ignazio', 'ilario',
  'innocenzo', 'isidoro', 'italo', 'ivo', 'lamberto', 'lazzaro', 'leandro', 'lelio', 'leone', 'leopoldo',
  'lino', 'livio', 'lodovico', 'ludovico', 'lucio', 'luigino', 'manlio', 'marcantonio', 'mariano', 'marino',
  'martino', 'marzio', 'mattias', 'michelangelo', 'mirco', 'modesto', 'natale', 'nazzareno', 'nazareno', 'nello',
  'nevio', 'nicolò', 'niccolò', 'nicolo', 'niccolo', 'nicholas', 'nicolas', 'nino', 'norberto', 'odoardo',
  'olindo', 'onofrio', 'oreste', 'orlando', 'oronzo', 'osvaldo', 'ottorino', 'pacifico', 'palmiro', 'pantaleo',
  'paride', 'patrick', 'patrizio', 'pellegrino', 'pierfrancesco', 'piergiuseppe', 'pino', 'prospero', 'quirino', 'raffaello',
  'raimondo', 'rinaldo', 'rino', 'rolando', 'romano', 'romeo', 'romolo', 'rosalino', 'ruben', 'sabatino',
  'salvo', 'samuel', 'sante', 'santino', 'saturnino', 'serafino', 'settimio', 'severino', 'silverio', 'simeone',
  'siro', 'stanislao', 'teodoro', 'terenzio', 'tiberio', 'tito', 'tonino', 'tullio', 'ubaldo', 'ulisse',
  'valentino', 'venanzio', 'vinicio', 'virgilio', 'vitale', 'vittorino', 'zeno', 'jonathan', 'christopher', 'mario',
  // Comunità straniere più presenti tra i titolari di Partita IVA in Italia
  'ion', 'ionut', 'vasile', 'florin', 'dumitru', 'constantin', 'nicolae', 'alexandru', 'andrei', 'bogdan',
  'petru', 'sorin', 'viorel', 'marian', 'marin', 'mihai', 'marius', 'cristian', 'arben', 'artan',
  'ardit', 'besnik', 'ilir', 'gentian', 'fatmir', 'agron', 'alban', 'edmond', 'erion', 'klodian',
  'kristian', 'spartak', 'mohamed', 'mohammed', 'ahmed', 'youssef', 'hassan', 'karim', 'rachid', 'ivica',
  'vanni', 'battista', 'gasparino', 'eustachio', 'jgor', 'walter', 'valter', 'dietmar',
]) {
  COMMON_MALE_FIRST_NAMES.add(n);
}

for (const n of [
  'adele', 'agata', 'agnese', 'alba', 'alda', 'alessia', 'alina', 'amalia', 'ana', 'andreea',
  'angelica', 'anita', 'annalisa', 'annamaria', 'annarita', 'annunziata', 'antonia', 'antonietta', 'antonina', 'assunta',
  'aurora', 'benedetta', 'bianca', 'bruna', 'brunella', 'carmela', 'carmen', 'carolina', 'cecilia', 'celeste',
  'clara', 'concetta', 'costanza', 'cristiana', 'daria', 'debora', 'deborah', 'delia', 'denise', 'diana',
  'donatella', 'dora', 'edda', 'elda', 'elsa', 'elvira', 'emilia', 'emma', 'enrica', 'erica',
  'erika', 'erminia', 'ester', 'eugenia', 'eva', 'fabiana', 'fabrizia', 'fernanda', 'filomena', 'fiorella',
  'flavia', 'flora', 'florentina', 'franca', 'gaia', 'gemma', 'giada', 'gianna', 'gilda', 'gina',
  'ginevra', 'gloria', 'giuliana', 'giuseppa', 'giuseppina', 'giusy', 'grazia', 'graziella', 'ida', 'ilenia',
  'immacolata', 'ines', 'iolanda', 'ioana', 'ivana', 'jessica', 'jolanda', 'katia', 'lara', 'letizia',
  'lia', 'licia', 'lidia', 'liliana', 'lina', 'lisa', 'livia', 'loredana', 'lorella', 'lorenza',
  'loretta', 'luana', 'luciana', 'lucrezia', 'ludovica', 'maddalena', 'mafalda', 'mara', 'marcella', 'margherita',
  'mariana', 'mariangela', 'marianna', 'mariella', 'marilena', 'marisa', 'maristella', 'marzia', 'matilde', 'maura',
  'melania', 'mihaela', 'mila', 'milena', 'mirella', 'miriam', 'morena', 'natalia', 'nella', 'nicole',
  'nicoletta', 'nives', 'norma', 'nunzia', 'olga', 'ombretta', 'orietta', 'ornella', 'palma', 'pamela',
  'piera', 'pierina', 'pina', 'priscilla', 'rachele', 'raffaela', 'rebecca', 'regina', 'renata', 'rina',
  'romina', 'rosalia', 'rosanna', 'rosaria', 'rosella', 'rosetta', 'rosita', 'rossana', 'sabina', 'samanta',
  'samantha', 'sandra', 'santina', 'selene', 'silvana', 'simonetta', 'sofia', 'susanna', 'sveva', 'tamara',
  'tatiana', 'tecla', 'tina', 'vanessa', 'vanna', 'vincenza', 'viola', 'virginia', 'virna', 'vittoria',
  'vittorina', 'wanda', 'ylenia', 'zaira', 'angela', 'gabriella', 'gabbriella',
]) {
  COMMON_FEMALE_FIRST_NAMES.add(n);
}

function normalizeTypographicApostrophe(val: string): string {
  return val.replace(/['`‘´]/g, '’');
}

function isKnownItalianFirstName(token: string): boolean {
  if (/[’'`‘´]/.test(token)) return false;
  const clean = token.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
  return COMMON_MALE_FIRST_NAMES.has(clean) || COMMON_FEMALE_FIRST_NAMES.has(clean);
}

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

function capitalizePersonToken(word: string): string {
  return normalizeTypographicApostrophe(word)
    .split(/(’)/)
    .map((seg) => {
      if (seg === '’') return '’';
      if (!seg) return '';
      return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
    })
    .join('');
}

function toSmartTitleCase(raw: string): string {
  const smallWords = new Set([
    'di',
    'de',
    'del',
    'della',
    'dello',
    'dei',
    'degli',
    'delle',
    'da',
    'dal',
    'dalla',
    'dallo',
    'dai',
    'dagli',
    'dalle',
    'e',
    'ed',
    'in',
    'nel',
    'nello',
    'nella',
    'nei',
    'negli',
    'nelle',
    'su',
    'sul',
    'sullo',
    'sulla',
    'sui',
    'sugli',
    'sulle',
    'per',
    'con',
    'col',
    'coi',
    'a',
    'ad',
    'al',
    'allo',
    'alla',
    'ai',
    'agli',
    'alle',
    'tra',
    'fra',
  ]);
  return normalizeTypographicApostrophe(raw)
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
      if (/^f\.?lli\.?$/i.test(word)) return 'F.lli';
      // Preserva acronimi puntati con >= 2 punti tipo I.E.M.M.E., N.T.NET, C.M.E.
      if (/^(?:[A-Za-z0-9]{1,3}\.){2,}[A-Za-z0-9]{0,4}\.?$/.test(word)) {
        return word.toUpperCase();
      }
      if (/^(led|ip\d+|hvac|b2b|ev|tvcc|poe|ce|iso|soa)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (idx > 0 && smallWords.has(lower)) {
        return lower;
      }
      if (/^[A-Z0-9&]{2,4}$/.test(word) && !/^(SRL|SRLS|SPA|SNC|SAS)$/.test(word)) {
        return word;
      }
      return capitalizePersonToken(word);
    })
    .join(' ');
}

const GENERIC_CATEGORY_WORDS = new Set([
  'ferramenta',
  'utensileria',
  'impresa',
  'imprese',
  'edile',
  'edili',
  'edilizia',
  'costruzioni',
  'costruzione',
  'ristrutturazioni',
  'ristrutturazione',
  'studio',
  'tecnico',
  'tecnica',
  'tecnici',
  'associato',
  'associati',
  'architettura',
  'architettonica',
  'architettonico',
  'architettoniche',
  'architettonici',
  'strutturale',
  'strutturali',
  'energetica',
  'energetico',
  'ambientale',
  'tecnologica',
  'tecnologico',
  'generale',
  'generali',
  'commerciale',
  'commerciali',
  'ingegneria',
  'progettazione',
  'integrata',
  'integrati',
  'integrato',
  'integrate',
  'termoidraulica',
  'termoidrauliche',
  'termoidraulici',
  'termoidraulico',
  'idraulica',
  'idrauliche',
  'idraulici',
  'idraulico',
  'fotovoltaico',
  'fotovoltaica',
  'fotovoltaici',
  'fotovoltaiche',
  'clima',
  'climatizzazione',
  'condizionamento',
  'riscaldamento',
  'impianti',
  'impianto',
  'impiantistica',
  'installazioni',
  'installazione',
  'elettrici',
  'elettrico',
  'elettrica',
  'elettriche',
  'quadri',
  'industriali',
  'industriale',
  'civile',
  'civili',
  'carpenteria',
  'carpenterie',
  'lattoneria',
  'lattonerie',
  'falegnameria',
  'legno',
  'ferro',
  'alluminio',
  'metallica',
  'metalliche',
  'specializzata',
  'specializzate',
  'specializzato',
  'specializzati',
  'speciale',
  'speciali',
  'officina',
  'meccanica',
  'serramenti',
  'infissi',
  'centro',
  'punto',
  'servizi',
  'service',
  'assistenza',
  'manutenzione',
  'manutenzioni',
  'lavorazione',
  'lavorazioni',
  'forniture',
  'ingrosso',
  'rivendita',
  'ditta',
  'azienda',
  'societa',
  'società',
  'cooperativa',
  'coop',
  'fratelli',
  'flli',
  'lli',
  // Mestieri e merceologie generiche (#179 punto 2b + #202 titoli SEO Google Maps)
  'fabbrica',
  'showroom',
  'pergole',
  'verande',
  'zanzariere',
  'tapparelle',
  'pavimenti',
  'rivestimenti',
  'facciate',
  'continue',
  'lamiere',
  'colori',
  'vernici',
  'caldaie',
  'caldaia',
  'climatizzatori',
  'condizionatori',
  'allarme',
  'allarmi',
  'antennista',
  'antennisti',
  'antenne',
  'sicurezza',
  'domotica',
  'automazione',
  'automazioni',
  'illuminazione',
  'elettroimpianti',
  'elettroforniture',
  'idraulico',
  'idraulici',
  'elettricista',
  'elettricisti',
  'tecnologici',
  'tecnologiche',
  'sistemi',
  'soluzioni',
  'materiali',
  'distribuzione',
  'commercio',
  'vendita',
  'riparazioni',
  'provincia',
  'pronto',
  'intervento',
  'interventi',
  'urgente',
  'urgenza',
  'urgenze',
  'h24',
  'sos',
  'preventivi',
  'gratuiti',
  'rapido',
  'rapidi',
  'colorificio',
  'serramento',
  'infisso',
  'cablaggio',
  'manutentore',
  'parchettista',
  'serraturiere',
  'colorista',
  'termosanitaria',
  'refrigerazione',
  'restauro',
  'piscina',
  'piscine',
  'scuola',
  'tutto',
  'pratiche',
  'accessori',
  'applicazioni',
  'macchine',
  'utensili',
  'cancelli',
  'energie',
  'efficienza',
  'consorzio',
  'associazione',
  'multiservice',
  'multiservizi',
  'lavoro',
  'sociale',
  'mutua',
  'srl',
  'srls',
  'spa',
  'snc',
  'sas',
  'scarl',
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dalla',
  'e',
  'ed',
  'o',
  'od',
  'in',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'per',
  'con',
  'su',
  'sul',
  'sulla',
  'sui',
  'a',
  'al',
  'alla',
  'ai',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
]);

const NON_DISTINCTIVE_UPPER_SIGLE = new Set([
  'SRL',
  'SRLS',
  'SPA',
  'SNC',
  'SAS',
  'SS',
  'LED',
  'IVA',
  'PVC',
  'TV',
  'EV',
  'CE',
  'ISO',
  'SOA',
  'HVAC',
  'TVCC',
  'B2B',
  'IT',
]);

const LEGAL_DOTTED_RE = /^(?:s\.?r\.?l\.?s?\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?|f\.?lli\.?|a\.?r\.?l\.?|s\.?c\.?a\.?r\.?l\.?)$/i;

export function hasDistinctiveCompanyWord(segment: string): boolean {
  const raw = String(segment || '');
  if (/^di\s+tutto\b/i.test(raw.trim())) return true;
  const hasLowercase = /[a-zà-ÿ]/.test(raw);
  // Acronimi puntati (I.M.A., A.G.K., S.E.I.) e sigle maiuscole brevi (GM, MC, RM, A&G) sono sempre distintivi
  for (const rawTok of raw.split(/\s+/)) {
    const tok = rawTok.replace(/^[(\[]+|[,;:)\]]+$/g, '');
    if (!tok || LEGAL_DOTTED_RE.test(tok)) continue;
    if (/^(?:[A-Za-z0-9]\.){2,}[A-Za-z0-9]{0,4}\.?$/.test(tok)) return true;
    if (
      /^[A-Z0-9&]{2,4}$/.test(tok) &&
      /[A-Z]/.test(tok) &&
      !NON_DISTINCTIVE_UPPER_SIGLE.has(tok) &&
      (hasLowercase || tok.length <= 3)
    ) {
      return true;
    }
  }
  const tokens = raw
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9&]+/)
    .filter((t) => t.length >= 2);
  return tokens.some((t) => !GENERIC_CATEGORY_WORDS.has(t));
}

const MAJOR_CITY_TOKENS = new Set([
  'milano',
  'roma',
  'napoli',
  'torino',
  'bologna',
  'bari',
  'firenze',
  'venezia',
  'verona',
  'padova',
  'brescia',
  'bergamo',
  'genova',
  'palermo',
  'catania',
  'messina',
  'salerno',
  'caserta',
  'benevento',
  'avellino',
  'pescara',
  'perugia',
  'ancona',
  'trieste',
  'trento',
  'bolzano',
  'cagliari',
  'lecce',
  'taranto',
  'foggia',
  'modena',
  'parma',
  'monza',
  'como',
  'varese',
  'vicenza',
  'treviso',
  'udine',
  'rimini',
  'latina',
  'frosinone',
]);

/**
 * Variante di hasDistinctiveCompanyWord che ignora i token della città del prospect e delle grandi città:
 * usata SOLO per decidere se preferire la ragione sociale camerale (vat_official_name) a un nome Google Maps generico
 * (es. "Elettricista - Antennista Milano" -> "Micale Antonino").
 */
function hasDistinctiveIgnoringCity(segment: string, cityHint?: string | null): boolean {
  const cityTokens = new Set(
    normalizeTypographicApostrophe(String(cityHint || ''))
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/)
      .filter((t) => t.length >= 2)
  );
  const filtered = normalizeTypographicApostrophe(String(segment || ''))
    .split(/\s+/)
    .filter((w) => {
      const low = w.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
      return low && !cityTokens.has(low) && !MAJOR_CITY_TOKENS.has(low);
    })
    .join(' ');
  return hasDistinctiveCompanyWord(stripLegalSuffixesIterative(filtered));
}

/** Vero se la ragione sociale (già pulita) è composta solo da parole generiche di categoria (es. "Elettroimpianti", "Forniture Elettriche", "Ferramenta di Torvaianica" su Torvaianica Alta). */
export function isGenericOnlyCompanyName(
  companyShort: string,
  cityHint?: string | null
): boolean {
  const s = String(companyShort || '').trim();
  if (!s || /^azienda\s+partner$/i.test(s)) return true;
  if (!hasDistinctiveCompanyWord(s)) return true;
  // Quando il nome corto ha la forma descrittiva "<Categoria> di <Città>" (es. #15644 "Ferramenta di Torvaianica" su Torvaianica Alta),
  // scarta i token città per non scambiarla per un brand (preservando invece "Prato Infissi", "Ferramenta L’Aquila", "Anguillara Veneta")
  if (cityHint && /\bdi\s+/i.test(s) && !/^di\s+tutto\b/i.test(s)) {
    const cityToks = new Set(
      normalizeTypographicApostrophe(String(cityHint))
        .toLowerCase()
        .split(/[^a-zà-ÿ0-9]+/)
        .filter((t) => t.length >= 2)
    );
    if (cityToks.size > 0) {
      const withoutCity = normalizeTypographicApostrophe(s)
        .split(/\s+/)
        .filter((w) => {
          const low = w.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
          return low && !cityToks.has(low);
        })
        .join(' ');
      if (!hasDistinctiveCompanyWord(withoutCity)) return true;
    }
  }
  return false;
}

/**
 * Fallback neutro coerente col registro quando la ragione sociale è puramente generica (#179 punto 2d):
 * voi -> "la vostra azienda" / "della vostra azienda" (studi: "il vostro studio" / "del vostro studio");
 * Lei -> "la sua azienda" / "della sua azienda" (studi: "il suo studio" / "del suo studio").
 * companyPossessiveRef ("la vostra", "il suo"...) serve nelle frasi "imprese come la vostra".
 */
export function buildGenericCompanyFallbackForms(
  isDirectPerson: boolean,
  cluster: CanonicalB2BCluster
): {
  companyShortSubject: string;
  companyBodyShort: string;
  compRefDi: string;
  companyPossessiveRef: string;
} {
  const isStudio = cluster === 'Architetto_Ingegnere';
  if (isStudio) {
    return isDirectPerson
      ? {
          companyShortSubject: 'il suo studio',
          companyBodyShort: 'il suo studio',
          compRefDi: 'del suo studio',
          companyPossessiveRef: 'il suo',
        }
      : {
          companyShortSubject: 'il vostro studio',
          companyBodyShort: 'il vostro studio',
          compRefDi: 'del vostro studio',
          companyPossessiveRef: 'il vostro',
        };
  }
  return isDirectPerson
    ? {
        companyShortSubject: 'la sua azienda',
        companyBodyShort: 'la sua azienda',
        compRefDi: 'della sua azienda',
        companyPossessiveRef: 'la sua',
      }
    : {
        companyShortSubject: 'la vostra azienda',
        companyBodyShort: 'la vostra azienda',
        compRefDi: 'della vostra azienda',
        companyPossessiveRef: 'la vostra',
      };
}

/**
 * Azzera i valori sporchi del campo city (zone industriali, vie, frazioni, sigle A.S.I./P.I.P./Z.A.I./C.E.P.)
 * così locPhrase ricade pulito su "sul territorio" (#179 punto 4). Preserva i comuni veri
 * (Appiano sulla Strada del Vino, San Nicola la Strada, Piazza Armerina, Vico Equense, Contrada (AV), Ne).
 */
export function sanitizeProspectCity(rawCity?: string | null, province?: string | null): string {
  let c = normalizeTypographicApostrophe(String(rawCity || ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!c) return '';
  // Normalizza "S. ferdinando" -> "San Ferdinando" (#184 punto 4)
  c = c.replace(/^s\.\s+/i, 'San ');
  if (/\d/.test(c)) return '';
  if (/^contrada$/i.test(c)) {
    return String(province || '').trim().toUpperCase() === 'AV' ? 'Contrada' : '';
  }
  if (/\s+-\s+/.test(c)) return '';
  if (/\s+(?:II|III|IV|VI|VII|VIII|IX)$/i.test(c)) return '';
  if (
    /(?:^|[\s(])(?:industriale|industriali|artigianale|artigianali|produttiva|produttive|commerciale|aeroporto|scalo|interporto|zona|area|a\.?\s?s\.?\s?i\.?|z\.?\s?a\.?\s?i\.?|p\.?\s?i\.?\s?p\.?|c\.?\s?e\.?\s?p\.?|s\.?\s?p\.?\s?i\.?\s?p\.?)(?=[\s,;.)]|$)/i.test(
      c
    )
  ) {
    return '';
  }
  if (
    /^(?:l\.?\s?p\.?(?:\s|$)|c\.\s+|c\.se$|prol\.?(?:\s|$)|prolungamento(?:\s|$)|villaggio(?:\s|$)|stazione(?:\s|$)|bivio(?:\s|$)|centro\s+(?!valle\s+intelvi\b)|via|viale|corso|piazzale|largo|vicolo|traversa|contrada|c\.?\s?da|loc\.?|localit[àa]|frazione|fraz\.?|zona|area|agglomerato|quartiere|strada|nucleo|polo|parco)(?:\s|$)?/i.test(
      c
    ) &&
    !/^(?:viadana|viareggio|vico\b|viterbo|vicenza|vigorovea|villanova|villafranca|villadossola|villaricca|villaputzu|villacidro|villabate|villanterio|villasanta|villastellone|villaverla|villorba)/i.test(
      c
    )
  ) {
    // Verifica parola intera per prefissi tipo "via", "corso", ecc.
    if (
      /^(?:l\.?\s?p\.?(?:\s|$)|c\.\s+|c\.se$|prol\.?(?:\s|$)|prolungamento(?:\s|$)|villaggio(?:\s|$)|stazione(?:\s|$)|bivio(?:\s|$)|centro\s+(?!valle\s+intelvi\b)|(?:via|viale|corso|piazzale|largo|vicolo|traversa|contrada|c\.?\s?da|loc\.?|localit[àa]|frazione|fraz\.?|zona|area|agglomerato|quartiere|strada|nucleo|polo|parco)(?:\s|$))/i.test(
        c
      )
    ) {
      return '';
    }
  }
  if (/^piazza\s+(?!armerina\b|al\s+serchio\b|brembana\b|santo\s+stefano\b)/i.test(c)) {
    return '';
  }
  c = c.replace(/[.,;:\s]+$/g, '').trim();
  if (/^San\s+[a-zà-ÿ]/.test(c)) {
    c = c.replace(/^San\s+([a-zà-ÿ])/, (_m, ch: string) => `San ${ch.toUpperCase()}`);
  }
  return c.length >= 2 ? c : '';
}

const LOWERCASE_CONNECTIVE_WORDS = new Set([
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dalla',
  'dallo',
  'dai',
  'dagli',
  'dalle',
  'in',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'su',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'per',
  'con',
  'col',
  'coi',
  'e',
  'ed',
  'o',
  'a',
  'ad',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'tra',
  'fra',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
]);

const ABBREVIATED_LEGAL_CLAUSE_RE =
  /,?\s+(?:o,?\s+in\s+forma\s+abbreviata|in\s+forma\s+abbreviata|abbreviabile\s+anche\s+in|anche\s+denominata|in\s+sigla)\b.*$/i;

export function cleanCompanyDisplayName(
  rawCompanyName: string,
  vatOfficialName?: string | null,
  cityHint?: string | null
): string {
  const preCleanRaw = (val: string) => {
    let cleaned = normalizeTypographicApostrophe(val.trim())
      // Rimuove URL e c/o da Google Maps (#199 punti 3–4)
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\s+c\/o\b.*$/i, '')
      // Ripara encoding Latin-1 rotto con "?" prima di rimuovere i "?" residui (#202 punto 2 + #45763 + #80602)
      .replace(/\bsociet\?(?=\s|$)/gi, 'Società')
      .replace(/\bresponsabilit\?(?=\s|$)/gi, 'Responsabilità')
      .replace(/\bqualit\?(?=\s|$)/gi, 'Qualità')
      .replace(/\battivit\?(?=\s|$)/gi, 'Attività')
      .replace(/(?<=pi)\?(?=\s|$)/gi, 'ù')
      .replace(/\b([LlDd]|Ca)\?(?=[A-Za-zÀ-ÿ\s])/g, '$1’')
      .replace(/\s+\?+\s+/g, ' - ')
      .replace(/(?:^|(?<=\s))\?+([a-zà-ÿ])/g, (_m, ch: string) => ch.toUpperCase())
      .replace(/\?+/g, ' ')
      // Ripara refusi e umlaut con ":" prima di trattare ":" come separatore slogan (#202 punto 1 + #34883)
      .replace(/\b(s\.?\s*r)[:.](l\.?\s*s?)\b/gi, '$1.$2')
      .replace(/:\.:/g, ' ')
      .replace(/\b([A-Za-z]):([AEIOUaeiou])(?=[a-zà-ÿ])/g, (_m, c1: string, c2: string) => c1 + c2.toLowerCase())
      .replace(/\b([A-Z]\.[A-Z]):(?=\s|$)/g, '$1.')
      .replace(/\b([A-Z]):([A-Z])(?=\s|$)/g, '$1.$2.')
      .replace(/(?<=\b[A-Za-z]{2,3}):(?=[A-Za-z]{2,3}\b)/g, ' ')
      // Rimuove virgolette, underscore, asterischi, cancelletti, "%" e "!" (#199/#202)
      .replace(/["“”«»]/g, ' ')
      .replace(/[_*#]+/g, ' ')
      .replace(/\b100%\s*/g, '')
      .replace(/%+/g, '')
      .replace(/(?<=[A-Za-zÀ-ÿ0-9])!+(?=[A-Za-zÀ-ÿ0-9])/g, ' ')
      .replace(/!+/g, ' ')
      .replace(/,(?=[A-Za-zÀ-ÿ])/g, ', ')
      // Normalizza doppi/tripli punti ".." / "..." senza rompere gli acronimi puntati (#199 punto 2)
      .replace(/\b(s\.?\s*r)\.{2,}(l\.?\s*s?)\b/gi, '$1.$2')
      .replace(/((?:\b[A-Za-z]{1,3}\.)+[A-Za-z]{1,3})\.{2,}\s*/g, '$1. ')
      .replace(/([A-Z])\s*\.\s*\.+\s*/g, '$1. ')
      .replace(/\.{2,}/g, ' ')
      // Separa suffissi societari attaccati dopo punto: "I.Te.Co.Srl" -> "I.Te.Co. Srl" (#199 punto 5)
      .replace(/\.(?=(?:s\.?r\.?l\.?s?|s\.?p\.?a|s\.?n\.?c|s\.?a\.?s)\b)/gi, '. ')
      // Ripara OCR [ćčĆČ] interno a parole italiane di categoria ("Termoidraulića" -> "Termoidraulica", preservando cognomi balcanici) (#206 #19497)
      .replace(
        /\b([A-Za-zÀ-ÿ]*?(?:idrauli|elettri|meccani|tecnologi|domoti|automati|ottic|chimic|ceramic|plast|fabbri|tecnic|pubbli|logisti))([ćčĆČ])([aeioAEIO][A-Za-zÀ-ÿ]*)\b/gi,
        (_m, pre: string, ch: string, post: string) =>
          `${pre}${ch === 'Ć' || ch === 'Č' ? 'C' : 'c'}${post}`
      )
      // Rimuove congiunzione "O" / "od" rimasta tronca a fine stringa dopo forma giuridica ("... Limitata Semplificata O") (#206 #60876)
      .replace(
        /(?<=\b(?:limitata|semplificata|unipersonale|azioni|collettivo|semplice|s\.?r\.?l\.?s?\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?)),?\s+(?:o|od)\s*$/i,
        ''
      )
      .replace(ABBREVIATED_LEGAL_CLAUSE_RE, '')
      .replace(/^Gi\s+di(?=\s+di\s+[A-Za-zÀ-Ÿ])/i, 'Gi.Di.')
      // Solo coppie 2+2 lettere non adiacenti a punti né prefissi tecnici inglesi (#199 punto 2: "Vi-Da" -> "Vi.Da.", mai "Di-Ba.sud" o "Hi-Tek" o "AC-DC")
      .replace(
        /(?<![A-Za-z0-9.])([A-Za-z]{2})-([A-Za-z]{2})(?![A-Za-z0-9.])/g,
        (full, a: string, b: string) =>
          /^(?:wi-fi|hi-fi|hi-lo|ac-dc|co-op|on-off|no-gas|in-out|up-to|ex-novo)$/i.test(full)
            ? full
            : `${capitalizePersonToken(a)}.${capitalizePersonToken(b)}.`
      )
      .replace(/\b([LlDd])’\s+([A-Za-zÀ-ÿ])/g, '$1’$2')
      .replace(/((?:[A-Za-z]\.){2,})((?:di|de|del|della|da|dal)\s)/gi, '$1 $2')
      .replace(/((?:[A-Za-z]\.){2,})([A-Za-zÀ-ÿ]{4,})/g, '$1 $2')
      .replace(/^Di\s+(?=(?:De|Di|Del|Della|Dello|Dal|Dalla)\s+)/i, '')
      .replace(/^(\d[a-z])\.(?=\s)/i, (_m, p1: string) => `${p1.toUpperCase()}.`)
      // Strip punteggiatura iniziale/finale spazzatura (":: Ferramenta Maffi" -> "Ferramenta Maffi")
      .replace(/^[\s:;,.?!*#+~’'"“”«»\-–—|/\\]+/, '')
      .replace(/[\s:;?!*#+~’'"“”«»\-–—|/\\]+$/, '')
      // Converte i ":" interni dei titoli Google Maps ("<Brand>: <slogan/servizi>") in separatore standard " - " (#202 punto 1)
      .replace(/:\s+/g, ' - ')
      .replace(/:(?=[A-Za-zÀ-ÿ0-9]{2,})/g, ' - ')
      .replace(/:+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned;
  };

  let base = preCleanRaw(String(rawCompanyName || ''));
  if (!base && vatOfficialName) {
    base = preCleanRaw(String(vatOfficialName));
  }
  if (!base) return 'Azienda Partner';

  // Nome Google Maps puramente generico o keyword-stuffed ("Ristrutturazioni", "Elettricista - Antennista Milano ... Pronto Intervento | URGENTE di Romano Michele"):
  // preferisce la ragione sociale camerale se questa contiene una parola distintiva (#179/#184)
  if (vatOfficialName) {
    const vatNorm = preCleanRaw(String(vatOfficialName));
    const baseWithoutDiPerson = base
      .replace(/\s+di\s+[A-Za-zÀ-ÿ.’'\s]+$/i, '')
      .replace(/\s*[-–—|]+\s*/g, ' ');
    const hasMapsSpamMarkers = /\b(?:pronto\s+intervento|urgenz[ae]|urgente|h24|sos|preventivi\s+gratuiti)\b/i.test(
      base
    );
    if (
      vatNorm &&
      (hasMapsSpamMarkers || !hasDistinctiveIgnoringCity(baseWithoutDiPerson, cityHint)) &&
      hasDistinctiveIgnoringCity(vatNorm, cityHint)
    ) {
      base = vatNorm;
    }
  }

  const isSeoKeywordListSeg = (seg: string) =>
    (seg.match(/,/g) || []).length >= 2 || seg.split(/\s+/).length > 6;
  const splitMatch = base.split(/\s+(?:[-–—|])\s+/).map((s) => s.trim()).filter(Boolean);
  if (splitMatch.length > 1) {
    const firstSeg = splitMatch[0];
    const secondSeg = splitMatch[1];
    const isShortSigla = /^(?:[A-Z0-9&]{2,3}|(?:[A-Za-z0-9]\.){2,}[A-Za-z0-9]{0,4}\.?)$/.test(firstSeg);
    if (
      isShortSigla &&
      !hasDistinctiveIgnoringCity(secondSeg, cityHint) &&
      secondSeg.split(/\s+/).length <= 2
    ) {
      // "GM - Termoidraulica" -> "GM Termoidraulica" (mai perdere la sigla, mai "il team GM")
      base = `${firstSeg} ${secondSeg}`;
    } else if (
      (firstSeg.length >= 3 || isShortSigla) &&
      (hasDistinctiveIgnoringCity(firstSeg, cityHint) ||
        !splitMatch
          .slice(1)
          .some((seg) => seg.length >= 3 && !isSeoKeywordListSeg(seg) && hasDistinctiveIgnoringCity(seg, cityHint)))
    ) {
      base = firstSeg;
    } else {
      const bestDistinctiveSeg = splitMatch
        .slice(1)
        .find((seg) => seg.length >= 3 && !isSeoKeywordListSeg(seg) && hasDistinctiveIgnoringCity(seg, cityHint));
      if (bestDistinctiveSeg) {
        base = bestDistinctiveSeg;
      } else if (secondSeg.length >= 3 && !isSeoKeywordListSeg(secondSeg)) {
        base = secondSeg;
      } else {
        base = firstSeg;
      }
    }
  }

  // Normalizza forme giuridiche estese e sigle societarie prima di compattare le iniziali puntate
  base = base
    .replace(
      /\b(?:societ[àa]’?\s+a\s+responsabilit[àa]’?\s+limitata(?:\s+unipersonale)?\s+semplificata(?:\s+unipersonale)?)\b/gi,
      'S.r.l.s.'
    )
    .replace(
      /\b(?:societ[àa]’?\s+a\s+responsabilit[àa]’?\s+limitata(?:\s+unipersonale)?)\b/gi,
      'S.r.l.'
    )
    .replace(/\b(?:societ[àa]’?\s+per\s+azioni)\b/gi, 'S.p.A.')
    .replace(/\b(?:societ[àa]’?\s+in\s+nome\s+collettivo)\b/gi, 'S.n.c.')
    .replace(/\b(?:societ[àa]’?\s+in\s+accomandita\s+semplice)\b/gi, 'S.a.s.')
    .replace(/(^|\s)(s\.?\s*r\.?\s*l\.?\s*s\.?)(?=\s|$|[,;)\]])/gi, '$1S.r.l.s.')
    .replace(/(^|\s)(s\.?\s*r\.?\s*l\.?)(?=\s|$|[,;)\]])/gi, '$1S.r.l.')
    .replace(/(^|\s)(s\.?\s*p\.?\s*a\.?)(?=\s|$|[,;)\]])/gi, '$1S.p.A.')
    .replace(/(^|\s)(s\.?\s*n\.?\s*c\.?)(?=\s|$|[,;)\]])/gi, '$1S.n.c.')
    .replace(/(^|\s)(s\.?\s*a\.?\s*s\.?)(?=\s|$|[,;)\]])/gi, '$1S.a.s.');

  // Compatta iniziali maiuscole puntate separate da spazio (es. "S.E I." o "S. E. I." -> "S.E.I."),
  // richiedendo fine parola dopo l'iniziale per non fondere mai "I.E.M.M.E. S.r.l."
  let prevInitials = '';
  while (prevInitials !== base) {
    prevInitials = base;
    base = base.replace(
      /\b([A-Z]\.(?:[A-Z]\.?)*)\s+([A-Z]\.)(?=\s|$|[,;)\]])/g,
      (_m, p1: string, p2: string) => {
        const p1WithDot = p1.endsWith('.') ? p1 : `${p1}.`;
        return `${p1WithDot}${p2}`;
      }
    );
  }

  // Normalizza coppie iniziali incomplete in testa: "M.G Costruzioni" -> "M.G. Costruzioni", "R C Impianti" -> "R.C. Impianti" (#189 punto 3)
  base = base
    .replace(/^([A-Z])\.([A-Z])(?=\s)/, '$1.$2.')
    .replace(/^([A-Z])\s+([A-Z])(?=\s+[A-Za-zÀ-ÿ]{4,})/, '$1.$2.');

  // Compatta coppie di singole iniziali unite da "&" (es. "A & G Lattonerie" -> "A&G Lattonerie", "Elettromeccanica M. & G." -> "Elettromeccanica M.&G.")
  base = base
    .replace(
      /\b([A-Za-z])\.\s*&\s*([A-Za-z])\.(?=\s|$|[,;)\]])/g,
      (_m, a: string, b: string) => `${a.toUpperCase()}.&${b.toUpperCase()}.`
    )
    .replace(
      /\b([A-Za-z])(?!\.)\s*&\s*([A-Za-z])(?=\s|$|[,;)\]])/g,
      (_m, a: string, b: string) => `${a.toUpperCase()}&${b.toUpperCase()}`
    );

  if (
    vatOfficialName &&
    base.split(/\s+/).length === 1 &&
    !/\b(srl|s\.r\.l|srls|spa|s\.p\.a|snc|sas)\b/i.test(base)
  ) {
    const official = normalizeTypographicApostrophe(String(vatOfficialName).trim());
    if (official.toLowerCase().startsWith(base.toLowerCase() + ' ')) {
      const suffix = official.slice(base.length).trim();
      if (/^(srl|s\.r\.l\.?|srls|s\.r\.l\.s\.?|spa|s\.p\.a\.?|snc|sas)$/i.test(suffix)) {
        base = `${base} ${suffix}`;
      }
    }
  }

  // Preserva acronimi puntati a singola lettera (tipo I.E.M.M.E. / N.T.NET) senza forzare in ALL-CAPS sillabe tipo Lu.Pi. o Edil.Pav.
  base = base
    .split(/\s+/)
    .map((tok) =>
      /^(?:[A-Za-z0-9]\.){2,}[A-Za-z0-9]{0,4}\.?$/.test(tok) &&
      !/^s\.?r\.?l\.?s?\.?$|^s\.?p\.?a\.?$|^s\.?n\.?c\.?$|^s\.?a\.?s\.?$|^f\.?lli\.?$/i.test(tok)
        ? tok.toUpperCase()
        : tok
    )
    .join(' ');

  const letters = base
    .replace(/\b(S\.r\.l\.s\.|S\.r\.l\.|S\.p\.A\.|S\.n\.c\.|S\.a\.s\.)/g, '')
    .replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length > 4 && letters === letters.toUpperCase()) {
    base = toSmartTitleCase(base);
  } else {
    // Capitalizza parole interamente minuscole non connettive e segmenti minuscoli dopo trattino ("Fabrizio cammo" -> "Fabrizio Cammo", "In-lux" -> "In-Lux")
    base = base
      .split(/\s+/)
      .map((w, idx) => {
        if (w.includes('-')) {
          return w
            .split('-')
            .map((part, pIdx) =>
              /^[a-zà-ÿ]{2,}$/.test(part) && (idx === 0 || pIdx > 0 || !LOWERCASE_CONNECTIVE_WORDS.has(part))
                ? part.charAt(0).toUpperCase() + part.slice(1)
                : part
            )
            .join('-');
        }
        if (/^[a-z]\d+$/i.test(w)) {
          return w.toUpperCase();
        }
        if (
          /^[a-zà-ÿ]{2,}$/.test(w) &&
          (idx === 0 || !LOWERCASE_CONNECTIVE_WORDS.has(w))
        ) {
          return w.charAt(0).toUpperCase() + w.slice(1);
        }
        return w;
      })
      .join(' ');
  }

  base = base
    .replace(/(^|\s)(s\.?\s*r\.?\s*l\.?\s*s\.?)(?=\s|$|[,;)\]])/gi, '$1S.r.l.s.')
    .replace(/(^|\s)(s\.?\s*r\.?\s*l\.?)(?=\s|$|[,;)\]])/gi, '$1S.r.l.')
    .replace(/(^|\s)(s\.?\s*p\.?\s*a\.?)(?=\s|$|[,;)\]])/gi, '$1S.p.A.')
    .replace(/(^|\s)(s\.?\s*n\.?\s*c\.?)(?=\s|$|[,;)\]])/gi, '$1S.n.c.')
    .replace(/(^|\s)(s\.?\s*a\.?\s*s\.?)(?=\s|$|[,;)\]])/gi, '$1S.a.s.')
    .replace(/\b(Due)\s+o\b/g, '$1 O')
    .replace(/^(\d[a-z])\.(?=\s)/i, (_m, p1: string) => `${p1.toUpperCase()}.`);

  // Strip code camerali multi-socio separate da virgola o con iniziale puntata quando il prefisso è distintivo (#195 punto 2: #84331, #47829)
  const partnerListMatch = base.match(
    /^(.{3,}?)\s+di\s+(?:[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s*,\s*[A-ZÀ-Ÿ].*|(?:(?:De|Di|Del|Della|Dello|Dal|Dalla|Lo|La)\s+)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-Z]\.(?:\s*(?:&|e|,)\s*.*)?)$/
  );
  if (partnerListMatch && partnerListMatch[1] && hasDistinctiveCompanyWord(partnerListMatch[1])) {
    base = stripLegalSuffixesIterative(partnerListMatch[1].trim());
  }

  return base.replace(/\s{2,}/g, ' ').trim();
}

const TRAILING_COMPANY_STOPWORDS = new Set([
  'di',
  'de',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'da',
  'dal',
  'dalla',
  'dallo',
  'dai',
  'dagli',
  'dalle',
  'e',
  'ed',
  'o',
  'od',
  'in',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'su',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'per',
  'con',
  'col',
  'coi',
  'a',
  'ad',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'tra',
  'fra',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'l',
  'un',
  'una',
  '&',
  'f.lli',
  'flli',
  'fratelli',
  'sorelle',
  'eredi',
  'dott',
  'ing',
  'arch',
  'geom',
  'geomet',
  'rag',
  'avv',
  'per',
  'perito',
  'ind',
  'sig',
  'mr',
  'san',
  'santo',
  'santa',
  'sant',
  'monte',
  'borgo',
  'ponte',
  'societa',
  'società',
]);

function stripTrailingStopwordsFromTokens(tokens: string[]): string[] {
  const out = [...tokens];
  while (out.length > 1) {
    const rawLast = out[out.length - 1].trim();
    // Non eliminare mai un token iniziale maiuscolo puntato tipo "I." o "O."
    if (/^[A-Z]\.$/.test(rawLast)) {
      break;
    }
    const lastNorm = rawLast
      .toLowerCase()
      .replace(/[.’',;:()]/g, '')
      .trim();
    const prevNorm = out[out.length - 2]
      .toLowerCase()
      .replace(/[.’',;:()]/g, '')
      .trim();
    // "Dal Col" è cognome veneto (#189 B.1); "Art Arch" è nome studio (#202 #33728); "H Due O" è formula chimica H2O (#189/#206)
    if (
      (lastNorm === 'col' && prevNorm === 'dal') ||
      (lastNorm === 'arch' && !rawLast.endsWith('.') && prevNorm === 'art') ||
      (lastNorm === 'o' && /^(?:due|tre|zero)$/.test(prevNorm))
    ) {
      break;
    }
    if (TRAILING_COMPANY_STOPWORDS.has(lastNorm)) {
      out.pop();
    } else {
      break;
    }
  }
  return out;
}

function stripLegalSuffixesIterative(input: string): string {
  let stripped = input.trim();
  for (let pass = 0; pass < 8; pass++) {
    const next = stripped
      .replace(
        /[,\s]+(?:societ[àa]’?\s+a\s+responsabilit[àa]’?\s+limitata(?:\s+unipersonale)?(?:\s+semplificata)?(?:\s+unipersonale)?|limitata(?:\s+unipersonale)?(?:\s+semplificata)?(?:\s+unipersonale)?|(?:societ[àa]’?\s+)?per\s+azioni|societ[àa]’?\s+in\s+(?:nome\s+collettivo|accomandita\s+semplice)|(?:societ[àa]’?\s+(?:mutua\s+)?)?cooperativa(?:\s+sociale|\s+agricola|\s+di\s+produzione\s+e\s+lavoro|\s+di\s+lavoro)?|soc\.?\s*cooperativa(?:\s+sociale)?|soc\.?\s*coop\.?(?:\s*a\.?\s*r\.?\s*l\.?)?|coop\.{0,2}|a\.?\s*r\.?\s*l\.{0,2}|s\.?\s*c\.?\s*a\.?\s*r\.?\s*l\.{0,2}|s\.?r\.?l\.?\s*semplificata|s\.?r\.?l\.?s\.{0,2}|s\.?r\.?l\.{0,2}|s\.?p\.?a\.{0,2}|s\.?n\.?c\.{0,2}|s\.?a\.?s\.{0,2}|s\.?s\.{0,2}|impresa\s+individuale|ditta(?:\s+individuale)?|unipersonale|a\s+socio\s+unico|in\s+liquidazione)\s*$/i,
        ''
      )
      .replace(/(?<=\S{3,})[,\s]+s\.?\s*c\.?\s*a\.?\s*$/i, '')
      .replace(/(?<=\S{3,})[,\s]+s\.?\s*c\.?\s*$/i, '')
      .replace(/[,\s]+(?:&|e)\s*c\.?\s*$/i, '')
      .trim();
    if (next === stripped) break;
    stripped = next;
  }
  return stripped;
}

const GENERIC_COMPANY_PREFIX_RE =
  /^(?:ditta(?:\s+individuale)?|impresa(?:\s+edile|\s+costruzioni|\s+impianti)?|studio(?:\s+tecnico|\s+associato)?|officina(?:\s+meccanica)?|laboratorio(?:\s+artigiano)?|negozio|azienda|societ[àa])$/i;

/**
 * Versione snella e naturale della ragione sociale per l'oggetto email (4-6 parole, zero "S.r.l.", zero trattini).
 */
export function cleanCompanyShortSubject(
  rawCompanyName: string,
  vatOfficialName?: string | null,
  cityHint?: string | null
): string {
  const fullClean = cleanCompanyDisplayName(rawCompanyName, vatOfficialName, cityHint)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*[-–—|]+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  let compactLegalFallback = 'Srl';
  if (/(?:^|\s)s\.?p\.?a\.?(?=\s|$)/i.test(fullClean)) compactLegalFallback = 'Spa';
  else if (/(?:^|\s)s\.?n\.?c\.?(?=\s|$)/i.test(fullClean)) compactLegalFallback = 'Snc';
  else if (/(?:^|\s)s\.?a\.?s\.?(?=\s|$)/i.test(fullClean)) compactLegalFallback = 'Sas';
  else if (/(?:^|\s)s\.?r\.?l\.?s\.?(?=\s|$)/i.test(fullClean)) compactLegalFallback = 'Srls';
  const hadLegalForm =
    /(?:^|\s)(?:s\.?r\.?l\.?s?\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|societ[àa]’?\s+cooperativa|soc\.?\s*coop\.?|coop\.?|s\.?c\.?a\.?r\.?l\.?)(?=\s|$)/i.test(
      fullClean
    );

  let stripped = stripLegalSuffixesIterative(fullClean);

  // Rimuove prefissi/infissi "Società [Mutua] Cooperativa [Sociale/Edilizia/...] [di Lavoro] [di]" (#184/#189)
  const coopPrefixRe =
    /^(?:(?:Societ[àa]’?\s+(?:Mutua\s+)?|Consorzio\s+|Associazione\s+|Soc\.?\s*)?Cooperativa(?:\s+(?:Sociale|Edilizia|Edile|Agricola))?(?:\s+di\s+(?:lavoro|produzione(?:\s+e\s+lavoro)?|comunit[àa]|consumo|abitazione))?(?:\s+di)?|Soc\.?\s*Coop\.?)\s+/i;
  if (coopPrefixRe.test(stripped)) {
    const withoutSocCoop = stripped.replace(coopPrefixRe, '').trim();
    if (withoutSocCoop.length >= 2) {
      stripped = withoutSocCoop;
    }
  }
  if (/\b(?:soc\.?\s*)?(?:cooperativa|coop\.?)(?:\s|$)/i.test(stripped)) {
    const withoutInfixCoop = stripped
      .replace(/\b(?:soc\.?\s*)?(?:cooperativa|coop\.?)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (withoutInfixCoop.length >= 3 && hasDistinctiveCompanyWord(withoutInfixCoop)) {
      stripped = withoutInfixCoop;
    }
  }

  // Rimuove "Ditta [Edile]" davanti a "F.lli / Fratelli" (#18394 "DITTA F.lli Iacovino" -> "F.lli Iacovino")
  stripped = stripped.replace(/^Ditta\s+(?:Edile\s+)?(?=F\.?lli\b|Fratelli\b)/i, '').trim();

  // Compatta "Studio [Tecnico|di Ingegneria|...] [Dott.] <Titolo> <Persona>" in "Studio <Titolo> <Cognome>" (#179/#184)
  // (es. "Studio Tecnico Ing. Sani Luca" -> "Studio Ing. Sani", "Studio di Ingegneria Ing. Umberto SERGIO" -> "Studio Ing. Sergio")
  const studioTitleMatch = stripped.match(
    /^Studio\s+(?:(?:Tecnico|Tecnici|Associato|Associati|Professionale|Progettazione|Ingegneria|Architettura|di\s+Ingegneria|di\s+Architettura|di\s+Progettazione|d’\s*Ingegneria|d’\s*Architettura)\s+)*(?:Dott\.?\s*)?(Perito\s+Industriale|Perito\s+Edile|Per\.?\s*Ind\.?|Per\.?\s*Ed\.?|Perito|Per|Ing|Ingegnere|Arch|Architetto|Geom|Geometra|Geomet|Dott\.?\s*ssa|Dottoressa|Dott|Dottore|Dottor|Dr|Rag|Ragioniere|Avv|Avvocato)\.?\s+(.+)$/i
  );
  if (studioTitleMatch && studioTitleMatch[1] && studioTitleMatch[2]) {
    const titleKey = studioTitleMatch[1].toLowerCase().replace(/[^a-z]/g, '');
    const titleCanonMap: Record<string, string> = {
      ing: 'Ing.',
      ingegnere: 'Ing.',
      arch: 'Arch.',
      architetto: 'Arch.',
      geom: 'Geom.',
      geometra: 'Geom.',
      geomet: 'Geom.',
      peritoindustriale: 'Per.',
      peritoedile: 'Per.',
      perind: 'Per.',
      pered: 'Per.',
      perito: 'Per.',
      per: 'Per.',
      dott: 'Dott.',
      dottore: 'Dott.',
      dottor: 'Dott.',
      dr: 'Dott.',
      dottssa: 'Dott.ssa',
      dottoressa: 'Dott.ssa',
      rag: 'Rag.',
      ragioniere: 'Rag.',
      avv: 'Avv.',
      avvocato: 'Avv.',
    };
    const titleCanon = titleCanonMap[titleKey] || '';
    const surname = extractCompanySurname(studioTitleMatch[2], true);
    if (surname) {
      const withTitle = titleCanon ? `Studio ${titleCanon} ${surname}` : `Studio ${surname}`;
      stripped =
        !surname.includes(' ') && withTitle.length <= 30 ? withTitle : `Studio ${surname}`;
    }
  }

  // Compatta "Studio Tecnico Associato Cognome1 Cognome2..." in "Studio Associato Cognome1" (3 parole nitide)
  stripped = stripped.replace(
    /^Studio\s+(?:Tecnico\s+)?Associato\s+(\S+)(?:\s+\S+)+$/i,
    'Studio Associato $1'
  );

  // Professionista con titolo in testa ("Ingegnere Giósue Di Liello" -> "Ing. Di Liello", "Per. Ind. Antonio Nappi" -> "Per. Nappi")
  const proTitleMatch = stripped.match(
    /^(Perito\s+Industriale|Perito\s+Edile|Per\.?\s*Ind\.?|Per\.?\s*Ed\.?|Perito|Per\.?|Ingegnere|Ing\.?|Architetto|Arch\.?|Geometra|Geomet\.?|Geom\.?|Avvocato|Avv\.?|Dottoressa|Dott\.?\s*ssa|Dottore|Dottor|Dott\.?|Dr\.?|Ragioniere|Rag\.?)\s+(.+)$/i
  );
  if (proTitleMatch && proTitleMatch[1] && proTitleMatch[2]) {
    const key = proTitleMatch[1].toLowerCase().replace(/[^a-z]/g, '');
    const canon =
      key === 'ingegnere' || key === 'ing'
        ? 'Ing.'
        : key === 'architetto' || key === 'arch'
          ? 'Arch.'
          : key === 'geometra' || key === 'geomet' || key === 'geom'
            ? 'Geom.'
            : key === 'avvocato' || key === 'avv'
              ? 'Avv.'
              : key === 'dottoressa' || key === 'dottssa'
                ? 'Dott.ssa'
                : key === 'ragioniere' || key === 'rag'
                  ? 'Rag.'
                  : key.startsWith('per')
                    ? 'Per.'
                    : 'Dott.';
    const proSurname = extractCompanySurname(proTitleMatch[2], true);
    if (proSurname) {
      const withTitle = `${canon} ${proSurname}`;
      stripped = withTitle.split(/\s+/).length <= 3 && withTitle.length <= 30 ? withTitle : proSurname;
    }
  }

  // Rimuove eventuali titoli professionali interposti tra cognome e nome ("Faldi Geometra Federico" -> "Faldi Federico", "Villani per. Ind" -> "Villani")
  stripped = stripped
    .replace(
      /\s+(?:Perito\s+Industriale|Perito\s+Edile|Per\.?\s*Ind\.?|Per\.?\s*Ed\.?|Geometra|Geomet\.?|Ingegnere|Architetto|Ragioniere|Avvocato)(?=\s|$)/gi,
      ' '
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Rimuove eventuali forme giuridiche interposte prima di "dei F.lli / di ..." ("Centro Ferramenta S.n.c. dei F.lli Viggiani")
  stripped = stripped
    .replace(/\s+(?:S\.r\.l\.s?\.|S\.p\.A\.|S\.n\.c\.|S\.a\.s\.)(?=\s)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Compatta "[Articolo] <Categoria> [Gen?] [dei] (?:Fratelli|F.lli) <Cognome con eventuale particella>" preservando sempre il cognome
  // ("Termoidraulica Fratelli dal Molin" -> "Termoidraulica Dal Molin", "Termosanitaria F.lli dal Bosco..." -> "Termosanitaria Dal Bosco")
  const compactFlliCategory = (val: string): string => {
    const bareFlliParticle = val.match(
      /^(?:Fratelli|F\.?lli\.?)\s+((?:di|de|del|della|dello|dal|dalla|lo|la)\s+[A-Za-zÀ-ÿ’']{2,})\s+[A-Za-zÀ-ÿ’']+\s+(?:e|ed|&)\b.*$/i
    );
    if (bareFlliParticle && bareFlliParticle[1]) {
      const pSur = bareFlliParticle[1].trim().split(/\s+/).map(capitalizePersonToken).join(' ');
      return `F.lli ${pSur}`;
    }
    const m = val.match(
      /^((?:(?:Il|Lo|La|I|Gli|Le)\s+|L’\s*)?(?:Lattoneria|Lattonerie|Carpenteria|Carpenterie|Falegnameria|Officina|Termoidraulica|Termosanitaria|Idrotermosanitaria|Idraulica|Idraulico|Elettricista|Impiantistica|Impianti|Installazioni|Quadri|Serramenti|Impresa|Costruzioni|Edilizia|Elettrica|Studio|Ferramenta|Centro|Colorificio|Colori|Materiali|Assistenza|Forniture|Ditta))\s+(?:(?:(?:di\s+)?(?:Costruzioni|Carpenteria|Architettura|Ingegneria)|d’\s*(?:Architettura|Ingegneria)|e\s+(?:Impianti|Vernici|Colori|Infissi))\s+)*(?:(?:Edile|Edili|Elettrici|Elettrica|Industriali|Meccanica|Idraulici|Termoidraulici|Termoidrauliche|Tecnico|Ferramenta|Caldaie)\s+)?(?:(?:dei|di|de)\s+)?(?:Fratelli|F\.?lli\.?)\s+((?:(?:dal|dalla|de|di|del|della|dello|dei|degli|delle|da|lo|la)\s+)?[A-Za-zÀ-ÿ’']{2,})(?:\s+.*)?$/i
    );
    if (!m || !m[1] || !m[2]) return val;
    const catHead = m[1].replace(/\s{2,}/g, ' ').trim();
    const hasLeadingArticle = /^(?:il|lo|la|i|gli|le)\s+|^l’/i.test(catHead);
    const surnameFormatted = m[2]
      .trim()
      .split(/\s+/)
      .map(capitalizePersonToken)
      .join(' ');
    if (surnameFormatted.includes(' ') || hasLeadingArticle) {
      return `${catHead} ${surnameFormatted}`;
    }
    const withFlli = `${catHead} F.lli ${surnameFormatted}`;
    return withFlli.length <= 25 ? withFlli : `${catHead} ${surnameFormatted}`;
  };

  stripped = compactFlliCategory(stripped);

  // Rimuove code camerali "di Nome Cognome [e Socio2] [Impresa/Ditta...]" SOLO SE la coda pulita è una persona/soci veri
  let isExtractedTwoLetterSigla = false;
  const diMatch = stripped.match(/^([A-Za-z0-9]{2}|.{3,}?)\s+di\s+(.{3,})$/i);
  if (diMatch && diMatch[1] && diMatch[2]) {
    const rawPrefix = stripLegalSuffixesIterative(diMatch[1].trim());
    const rawTail = stripLegalSuffixesIterative(diMatch[2].trim());
    let personCandidateTail = rawTail
      .replace(/^(?:f\.?lli\.?|fratelli)\s+/i, '')
      .replace(
        /\s*(?:&|e)\s*(?:figli[oa]?|fratelli|f\.?lli\.?|sorelle|eredi|soci|c\.?)\b.*$/i,
        ''
      )
      .replace(
        /\s+(?:impresa|imprese|ditta|studio|carpenteria|lattoneria|termoidraulica|idraulica|officina|assistenza|manutenzione|impianti|costruzioni|ristrutturazioni|serramenti|infissi|lavorazioni|servizi|elettricista|idraulico|antennista)\b.*$/i,
        ''
      )
      .trim();
    if (cityHint) {
      const cToks = normalizeTypographicApostrophe(String(cityHint))
        .toLowerCase()
        .split(/[^a-zà-ÿ’]+/)
        .filter((t) => t.length >= 2);
      if (cToks.length > 0) {
        let pWords = personCandidateTail.split(/\s+/);
        const pLow = pWords.map((w) => w.toLowerCase());
        const cn = cToks.length;
        if (
          pWords.length - cn >= 2 &&
          cToks.every((ct, idx) => pLow[pWords.length - cn + idx] === ct)
        ) {
          pWords = pWords.slice(0, pWords.length - cn);
          personCandidateTail = pWords.join(' ');
        } else if (
          pWords.length - cn >= 2 &&
          cToks.every((ct, idx) => pLow[idx] === ct)
        ) {
          pWords = pWords.slice(cn);
          personCandidateTail = pWords.join(' ');
        }
      }
    }
    const tailIsInitialSurname =
      (/^(?:[A-Z]\.\s+)+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']{2,}$/.test(personCandidateTail) &&
        !isNonPersonToken(personCandidateTail.split(/\s+/).slice(-1)[0])) ||
      /^(?:(?:De|Di|Del|Della|Dello|Dal|Dalla|Lo|La)\s+)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-Z]\.(?:\s*(?:&|e|,)\s*.*)?$/i.test(
        rawTail
      ) ||
      /^[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']+\s*,\s*[A-ZÀ-Ÿ]/.test(rawTail) ||
      (/^(?:de|del|della|dello|dal|dalla|lo)\s+[A-Za-zÀ-ÿ’']{2,}$/i.test(personCandidateTail) &&
        !isNonPersonToken(personCandidateTail.split(/\s+/).slice(-1)[0]));
    // Due nomi propri uniti da e/ed/& seguiti da cognome (#13180 "Angelo e Ivan Iannizzi" -> cognome "Iannizzi")
    const twoFirstsAndSurnameMatch = personCandidateTail.match(
      /^([A-Za-zÀ-ÿ’']{2,})\s+(?:e|ed|&)\s+([A-Za-zÀ-ÿ’']{2,})\s+((?:(?:De|Di|Del|Della|Dello|Dal|Dalla|Da|Lo|La)\s+)?[A-Za-zÀ-ÿ’']{2,})$/i
    );
    const pairSharedSurname =
      twoFirstsAndSurnameMatch &&
      isFirstNameLike(twoFirstsAndSurnameMatch[1]) &&
      isFirstNameLike(twoFirstsAndSurnameMatch[2]) &&
      !isNonPersonToken(twoFirstsAndSurnameMatch[3].split(/\s+/).slice(-1)[0])
        ? twoFirstsAndSurnameMatch[3].split(/\s+/).map(capitalizePersonToken).join(' ')
        : null;

    // Coda multi-socio "Bartolozzi Paolo e Ceccarelli Fabio" / "dal Bosco Raffaele e Nicola" (#3438 / #10143)
    const multiPartnerFirstChunk =
      !pairSharedSurname && /\s+(?:e|ed|&)\s+/i.test(personCandidateTail)
        ? personCandidateTail.split(/\s+(?:e|ed|&)\s+/i)[0].trim()
        : null;
    const hasVerifiedFirstPartner =
      Boolean(multiPartnerFirstChunk) &&
      multiPartnerFirstChunk!.split(/\s+/).length >= 2 &&
      Boolean(extractVerifiedDecisionMaker(multiPartnerFirstChunk, null, null, cityHint));

    const isTwoLetterSiglaPrefix =
      /^[A-Za-z0-9]{2}$/.test(rawPrefix) &&
      !/^(?:il|lo|la|le|li|un|di|de|da|in|su|al|ai|per|ed|io)$/i.test(rawPrefix);

    const tailIsPerson =
      tailIsInitialSurname ||
      Boolean(pairSharedSurname) ||
      hasVerifiedFirstPartner ||
      Boolean(extractVerifiedDecisionMaker(personCandidateTail, null, null, cityHint));

    if (tailIsPerson && isTwoLetterSiglaPrefix) {
      // "Dm di De Marchi Mario" -> "DM", "Mb di Bigazzi Massimiliano" -> "MB" (#189 punto 3)
      stripped = rawPrefix.toUpperCase();
      isExtractedTwoLetterSigla = true;
    } else if (tailIsPerson && rawPrefix.length >= 3 && hasDistinctiveCompanyWord(rawPrefix)) {
      stripped = rawPrefix;
    } else if (tailIsPerson && rawPrefix.length >= 3 && !tailIsInitialSurname) {
      const surname =
        pairSharedSurname ||
        extractCompanySurname(hasVerifiedFirstPartner ? multiPartnerFirstChunk! : personCandidateTail, false);
      if (surname) {
        const tuttoPerMatch = rawPrefix.match(/^Tutto\s+per\s+(?:(?:il|lo|la|i|gli|le)\s+|l’\s*)?(\S+)$/i);
        const headWords =
          tuttoPerMatch && tuttoPerMatch[1] ? [tuttoPerMatch[1]] : rawPrefix.split(/\s+/);
        stripped = composeCategoryHeadWithSurname(headWords, surname);
      }
    }
  }

  // Riesegue lo strip delle forme giuridiche e compattazione F.lli anche DOPO diMatch
  stripped = compactFlliCategory(stripLegalSuffixesIterative(stripped));

  // Evita di troncare il punto finale di un acronimo/abbreviazione puntata tipo I.E.M.M.E., S.C., Edil.Pav., Aus. Edil. o Corti O.
  const hasDottedAbbrevTail = (s: string) =>
    (/(?:^|\s)(?:[A-Za-zÀ-ÿ0-9]{1,5}\.){2,}$/.test(s) ||
      /(?:^|\s)[A-Za-zÀ-ÿ]{2,5}\.\s+[A-Za-zÀ-ÿ]{2,5}\.$/.test(s) ||
      /(?:^|\s)[A-Z]\.&[A-Z]\.$/.test(s) ||
      /\s[A-Z]\.$/.test(s)) &&
    !/(?:^|\s)f\.?lli\.$/i.test(s);

  if (!hasDottedAbbrevTail(stripped)) {
    stripped = stripped.replace(/[.,;:\-–—|/\\]+$/g, '');
  }
  stripped = stripped.replace(/\s{2,}/g, ' ').trim();

  if (stripped.length < 3) {
    if (stripped.length >= 1 && hadLegalForm) {
      const siglaLabel = /^[A-Za-z0-9]{2}$/.test(stripped) ? stripped.toUpperCase() : stripped;
      return `${siglaLabel} ${compactLegalFallback}`;
    }
    if (isExtractedTwoLetterSigla) {
      return stripped;
    }
    return stripped.length >= 1 ? `il team ${stripped}` : 'Azienda Partner';
  }

  let words = stripTrailingStopwordsFromTokens(stripped.split(/\s+/));

  // Articolo iniziale su ragioni sociali oltre 3 parole: si elide per restare in 3 parole senza mutilare il nome
  // (es. "I Colori di Firenze" -> "Colori di Firenze", "Lo Studio Architettura Design Ingegneria" -> "Studio Architettura Design")
  if (words.length > 3 && /^(?:il|lo|la|i|gli|le)$/i.test(words[0])) {
    words = words.slice(1);
  }
  // Articolo interno dopo "e" su nomi brevi a 4 parole (#26233 "Io e il Legno" -> "Io e Legno", mai "Io e")
  if (
    words.length === 4 &&
    words[1].toLowerCase() === 'e' &&
    /^(?:il|lo|la|i|gli|le)$/i.test(words[2])
  ) {
    words = [words[0], words[1], words[3]];
  }

  // Compressione prefissi generici composti quando supera 3 parole o 30 caratteri
  if (words.length > 3 || words.join(' ').length > 30) {
    // 1. Caso [Gen1, Gen2, Gen3, Cognome] (es. "Quadri Elettrici Industriali Rossi" -> "Quadri Rossi", "Serramenti e Infissi Neri" -> "Serramenti Neri")
    // Vietato se words.slice(0, 3) contiene "&" o iniziali singole maiuscole (es. "A & G Lattonerie")
    if (
      words.length === 4 &&
      !words.slice(0, 3).some((w) => w.includes('&') || /^[A-Z]\.?$/.test(w) || /^di$/i.test(w)) &&
      !hasDistinctiveCompanyWord(words.slice(0, 3).join(' ')) &&
      hasDistinctiveCompanyWord(words[3])
    ) {
      words = [words[0], words[3]];
    }
    // 2. Caso [Gen, Agg, Cognome] > 30c (es. "Installazioni Termoidrauliche Rossi" -> "Installazioni Rossi")
    else if (
      words.length === 3 &&
      words.join(' ').length > 30 &&
      !hasDistinctiveCompanyWord(words[0]) &&
      !hasDistinctiveCompanyWord(words[1]) &&
      hasDistinctiveCompanyWord(words[2])
    ) {
      words = [words[0], words[2]];
    } else {
      let compStr = words.join(' ');
      const craftMatch = compStr.match(
        /^(Lattoneria|Lattonerie|Carpenteria|Carpenterie|Falegnameria|Officina|Termoidraulica|Idraulica|Impianti|Installazioni|Quadri|Serramenti)\s+(?:(?:e\s+\S+\s+)(?:in\s+\S+\s+|metallica\s+|edile\s+|elettrici\s+|industriali\s+|termoidrauliche\s+|civili\s+)*|(?:in\s+\S+\s+|metallica\s+|edile\s+|elettrici\s+|industriali\s+|termoidrauliche\s+|civili\s+)+)(.+)$/i
      );
      if (craftMatch && craftMatch[1] && craftMatch[2] && hasDistinctiveCompanyWord(craftMatch[2])) {
        compStr = `${craftMatch[1]} ${craftMatch[2]}`;
      } else if (/^Impresa\s+Edile\s+(.+)$/i.test(compStr)) {
        const rest = compStr.replace(/^Impresa\s+Edile\s+/i, '').trim();
        if (hasDistinctiveCompanyWord(rest)) {
          compStr = `Impresa ${rest}`;
        }
      } else if (/^(?:Ristrutturazioni|Costruzioni|Lavorazioni\s+Edili)\s+(.+)$/i.test(compStr)) {
        const rest = compStr
          .replace(/^(?:Ristrutturazioni|Costruzioni|Lavorazioni\s+Edili)\s+/i, '')
          .trim();
        if (rest.split(/\s+/).length >= 2 && hasDistinctiveCompanyWord(rest)) {
          compStr = rest;
        }
      }
      words = stripTrailingStopwordsFromTokens(compStr.split(/\s+/));
    }
  }

  const DANGLING_GENERIC_DESCRIPTORS = new Set([
    'impresa',
    'imprese',
    'ditta',
    'edile',
    'edili',
    'carpenteria',
    'carpenterie',
    'lattoneria',
    'lattonerie',
    'officina',
    'officine',
    'metalmeccanica',
    'elettromeccanica',
    'termoidraulica',
    'idraulica',
    'condizionamento',
    'assistenza',
    'autorizzata',
    'autorizzato',
    'specializzata',
    'specializzato',
    'servizi',
    'service',
    'manutenzione',
    'manutenzioni',
    'installazione',
    'installazioni',
    'lavorazione',
    'lavorazioni',
    'tecnologia',
    'tecnologie',
    'materiali',
    'matriali',
    'coperture',
    'tetti',
    'forniture',
    'commerciale',
    'commerciali',
    'generale',
    'generali',
  ]);

  // Caso 3 parole non troncate "<Persona 2 parole> <Mestiere isolato>" (es. #8641 "Armenise Nicola Officina" -> "Armenise Nicola")
  if (
    words.length === 3 &&
    /^(?:officina|officine|ditta|elettricista|idraulico|termoidraulico|antennista)$/i.test(words[2]) &&
    Boolean(extractVerifiedDecisionMaker(`${words[0]} ${words[1]}`, null, null, cityHint))
  ) {
    words.pop();
  }

  let wasTruncated = false;
  while (words.length > 1 && (words.length > 3 || words.join(' ').length > 30)) {
    words.pop();
    wasTruncated = true;
    words = stripTrailingStopwordsFromTokens(words);
  }

  if (wasTruncated) {
    // Rimuove eventuale moncone "... di <NomeProprio>" rimasto dopo troncatura (es. "Mr4 di Ivan" -> "Mr4"),
    // senza mai toccare "Tecnologie di Impiantistica" o "Studio di Progettazione"
    if (
      words.length >= 3 &&
      words[words.length - 2].toLowerCase() === 'di' &&
      isKnownItalianFirstName(words[words.length - 1]) &&
      hasDistinctiveCompanyWord(words.slice(0, -2).join(' '))
    ) {
      words.pop();
      words.pop();
      words = stripTrailingStopwordsFromTokens(words);
    }

    while (words.length > 1) {
      const lastWordClean = words[words.length - 1]
        .toLowerCase()
        .replace(/[.’',;:()]/g, '');
      const prevWordClean = words[words.length - 2]
        .toLowerCase()
        .replace(/[.’',;:()]/g, '');
      const prefixStr = words.slice(0, -1).join(' ');
      if (
        DANGLING_GENERIC_DESCRIPTORS.has(lastWordClean) &&
        !TRAILING_COMPANY_STOPWORDS.has(prevWordClean) &&
        hasDistinctiveCompanyWord(prefixStr)
      ) {
        words.pop();
        words = stripTrailingStopwordsFromTokens(words);
      } else {
        break;
      }
    }
  }

  let finalShort = words.join(' ').trim();
  if (!hasDottedAbbrevTail(finalShort)) {
    finalShort = finalShort.replace(/[.,;:\-–—|]+$/g, '').trim();
  }

  // Guardrail finale: se la ragione sociale pulita aveva una parola distintiva/cognome,
  // non ridurre mai il risultato alla sola categoria generica (es. mai solo "Termoidraulica")
  if (
    hasDistinctiveCompanyWord(stripped) &&
    !hasDistinctiveCompanyWord(finalShort) &&
    !LOWERCASE_CONNECTIVE_WORDS.has(stripped.split(/\s+/)[0].toLowerCase())
  ) {
    const origWords = stripped.split(/\s+/).filter(Boolean);
    const distIdx = origWords.findIndex((w) => hasDistinctiveCompanyWord(w));
    if (distIdx > 0) {
      const prevLower = origWords[distIdx - 1].toLowerCase().replace(/[^a-zà-ÿ]/g, '');
      const distChunk =
        distIdx >= 2 && SURNAME_PARTICLES.has(prevLower)
          ? `${capitalizePersonToken(origWords[distIdx - 1])} ${origWords[distIdx]}`
          : origWords[distIdx];
      finalShort = /^(?:il|lo|la|i|gli|le)$/i.test(origWords[0]) && distIdx >= 2
        ? composeCategoryHeadWithSurname(origWords.slice(0, 2), distChunk)
        : `${origWords[0]} ${distChunk}`.trim();
      if (finalShort.length > 30) finalShort = distChunk;
    }
  }

  return finalShort.length >= 3 ? finalShort : `${stripped} ${compactLegalFallback}`.trim();
}

/**
 * Costruisce le forme del nome azienda usate nel corpo email:
 * - companyBodyShort: mai "MC Srl" né "MC" nudo ("l’azienda MC"), mai "S.N.C" residuo;
 * - compRefDi: "dello Studio di ..." per "Studio di ...", "dell’azienda <Nome>" se inizia con articolo o contiene/inizia con "Di/De ", altrimenti "di <Azienda>".
 */
export function buildCompanyBodyForms(
  rawCompanyName: string,
  vatOfficialName?: string | null,
  cityHint?: string | null
): { companyShortSubject: string; companyBodyShort: string; compRefDi: string } {
  const companyShortSubject = cleanCompanyShortSubject(rawCompanyName, vatOfficialName, cityHint);
  const bareNoLegal = stripLegalSuffixesIterative(companyShortSubject)
    .replace(/\s+(?:s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?)\.?$/i, '')
    .replace(/^(?:Ditta|il\s+team)\s+/i, '')
    .trim();

  if (bareNoLegal.length < 3) {
    const label = bareNoLegal || companyShortSubject;
    return {
      companyShortSubject,
      companyBodyShort: `l’azienda ${label}`,
      compRefDi: `dell’azienda ${label}`,
    };
  }

  if (/^(?:il|lo|i|gli|le)\s+|^l’/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: `l’azienda ${bareNoLegal}`,
      compRefDi: `dell’azienda ${bareNoLegal}`,
    };
  }

  // "Studio di Progettazione" -> "lo/dello Studio di Progettazione"; "Studio Ing. Sani" / "Studio Per. Nappi" -> "lo/dello Studio ..."
  if (/^studio\s+(?:di\s+|(?:ing|arch|geom|per|dott|rag|avv)\.(?:ssa)?\s)/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: `lo ${bareNoLegal}`,
      compRefDi: `dello ${bareNoLegal}`,
    };
  }

  // Professionista con titolo: "l’Ing. Di Liello" / "dell’Ing. Di Liello", "il Geom./Per. Rossi" / "del Geom./Per. Rossi"
  if (/^(?:ing|arch|avv)\.\s/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: `l’${bareNoLegal}`,
      compRefDi: `dell’${bareNoLegal}`,
    };
  }
  if (/^dott\.ssa\s/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: `la ${bareNoLegal}`,
      compRefDi: `della ${bareNoLegal}`,
    };
  }
  if (/^(?:geom|per|dott|rag)\.\s/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: `il ${bareNoLegal}`,
      compRefDi: `del ${bareNoLegal}`,
    };
  }

  // Particelle/preposizioni iniziali ("Della Valle", "Del Sole", "Di Metal", "Di.Ma.") -> "l’azienda ..." / "dell’azienda ..."
  // per evitare cacofonie "Per Di ..." o "di Della ..." (#184 punto 3)
  if (
    /^(?:di|de|del|della|dello|dei|degli|delle|da|dal|dalla)\s+|^d’|^(?:di|de|del)\.[a-zà-ÿ]/i.test(
      bareNoLegal
    )
  ) {
    return {
      companyShortSubject,
      companyBodyShort: `l’azienda ${bareNoLegal}`,
      compRefDi: `dell’azienda ${bareNoLegal}`,
    };
  }

  if (/^la\s+|\s+di\s+/i.test(bareNoLegal)) {
    return {
      companyShortSubject,
      companyBodyShort: bareNoLegal,
      compRefDi: `dell’azienda ${bareNoLegal}`,
    };
  }

  return {
    companyShortSubject,
    companyBodyShort: bareNoLegal,
    compRefDi: `di ${bareNoLegal}`,
  };
}

function isFirstNameLike(token: string): boolean {
  return isKnownItalianFirstName(token) || /^(?:gian|pier)$/i.test(token);
}

/** Aggettivi di testa sacrificabili nella compressione "<Categoria> <Cognome>" ("Impresa Edile" -> "Impresa", "Impianti Tecnologici" -> "Impianti"). */
const DROPPABLE_HEAD_MODIFIERS = new Set([
  'edile',
  'edili',
  'elettrici',
  'elettrico',
  'elettrica',
  'elettriche',
  'industriali',
  'industriale',
  'tecnologici',
  'tecnologiche',
  'tecnico',
  'tecnica',
  'tecnici',
  'termoidrauliche',
  'termoidraulici',
  'idraulici',
  'idrauliche',
  'civili',
  'civile',
  'generale',
  'generali',
  'specializzata',
  'specializzate',
  'integrata',
  'integrati',
  'meccanica',
  'metallica',
  'associato',
  'associati',
]);

/**
 * Compone "<Testa categoria> <Cognome>" senza mai mutilare l'articolo iniziale né sostantivi di testa significativi:
 * "La Termoidraulica" + Bonanno -> "La Termoidraulica Bonanno"; "Il Ferro" + Cifuni -> "Il Ferro Cifuni";
 * "Centro Servizi" + Tirillo’ -> "Centro Servizi Tirillo’"; "Impresa Edile" + "Michele Luigi" -> "Impresa Michele Luigi";
 * "Impianti Tecnologici" + Farroni -> "Impianti Farroni". Sempre <= 3 parole e <= 30 caratteri quando possibile.
 */
function composeCategoryHeadWithSurname(prefixWords: string[], surname: string): string {
  const w = prefixWords.map((x) => x.trim()).filter(Boolean);
  const fits = (s: string) => s.split(/\s+/).length <= 3 && s.length <= 30;
  const candidates: string[] = [];
  if (w.length >= 2 && /^(?:il|lo|la|i|gli|le)$/i.test(w[0]) && !LOWERCASE_CONNECTIVE_WORDS.has(w[1].toLowerCase())) {
    candidates.push(`${capitalizePersonToken(w[0])} ${w[1]} ${surname}`);
    candidates.push(`${w[1]} ${surname}`);
  } else if (w.length >= 1) {
    if (
      w.length === 2 &&
      !DROPPABLE_HEAD_MODIFIERS.has(w[1].toLowerCase()) &&
      !LOWERCASE_CONNECTIVE_WORDS.has(w[1].toLowerCase())
    ) {
      candidates.push(`${w[0]} ${w[1]} ${surname}`);
    }
    candidates.push(`${capitalizePersonToken(w[0])} ${surname}`);
  } else {
    candidates.push(surname);
  }
  return candidates.find(fits) || candidates[candidates.length - 1];
}

interface PersonNameUnit {
  text: string;
  isFirstName: boolean;
  isMale: boolean;
  isFemale: boolean;
  isParticleSurname: boolean;
}

function escapeRegExpLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Raggruppa i token di un nome persona fondendo ogni particella nobiliare/cognominale
 * (`De, Di, Del, Della, Dello, Dei, Degli, Delle, Dal, Dalla, Da, Lo, La, Li, Le, San`)
 * col token successivo in un unico cognome composto indivisibile con `isFirstName = false` (#184 punto 1).
 * Ritorna `null` se una particella rimane tronca a fine stringa (es. "Carlo Della", "Claudio Di").
 */
function groupPersonUnits(rawWords: string[]): PersonNameUnit[] | null {
  if (rawWords.length === 0) return null;
  const capWords = rawWords.map(capitalizePersonToken);
  const lastClean = capWords[capWords.length - 1].toLowerCase().replace(/[^a-zà-ÿ]/g, '');
  if (!/’/.test(capWords[capWords.length - 1]) && SURNAME_PARTICLES.has(lastClean)) {
    return null;
  }

  const units: PersonNameUnit[] = [];
  let i = 0;
  while (i < capWords.length) {
    const w = capWords[i];
    const low = w.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
    const hasApos = /’/.test(w);
    if (!hasApos && SURNAME_PARTICLES.has(low)) {
      if (i + 1 >= capWords.length) return null;
      const nextW = capWords[i + 1];
      const nextLow = nextW.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
      if (!/’/.test(nextW) && SURNAME_PARTICLES.has(nextLow)) return null;
      units.push({
        text: `${w} ${nextW}`,
        isFirstName: false,
        isMale: false,
        isFemale: false,
        isParticleSurname: true,
      });
      i += 2;
    } else {
      const isMale = !hasApos && (COMMON_MALE_FIRST_NAMES.has(low) || /^(?:gian|pier)$/i.test(low));
      const isFemale = !hasApos && COMMON_FEMALE_FIRST_NAMES.has(low);
      units.push({
        text: w,
        isFirstName: isMale || isFemale,
        isMale,
        isFemale,
        isParticleSurname: hasApos,
      });
      i += 1;
    }
  }
  return units;
}

/**
 * Estrae il cognome da una coda persona per comporre ragioni sociali compatte
 * ("Caparrini Claudio" -> "Caparrini", "Alessandro Ronge" -> "Ronge", "Farroni David Patrizio" -> "Farroni",
 *  "Maria De Rossi" -> "De Rossi", "De Luca Paolo" -> "De Luca", "Umberto SERGIO" con titolo -> "Sergio",
 *  doppio nome ambiguo senza titolo "Michele Luigi" -> "Michele Luigi").
 */
function extractCompanySurname(personRaw: string, hasTitleContext: boolean): string | null {
  let rawWork = normalizeTypographicApostrophe(String(personRaw || ''))
    .replace(/\b([A-Za-z]):([AEIOUaeiou])(?=[a-zà-ÿ])/g, (_m, c1: string, c2: string) => c1 + c2.toLowerCase())
    .replace(/\b([LlDd])\?(?=[A-Za-zÀ-ÿ])/g, '$1’')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/(?<=\s)[’'"“«][^’'"”»]{2,}[’'"”»](?=\s|$)/g, ' ')
    .split(/\s+(?:e|ed|and|&|-|–)\s+|\s*,\s*/i)[0]
    .trim();

  let effectiveTitleContext = hasTitleContext;
  for (const [titleRe] of RECOGNIZED_TITLE_PATTERNS) {
    const m = rawWork.match(titleRe);
    if (m) {
      effectiveTitleContext = true;
      rawWork = rawWork.slice(m[0].length).trim();
      break;
    }
  }
  for (const [embRe] of EMBEDDED_DM_TITLE_PATTERNS) {
    if (embRe.test(rawWork)) {
      effectiveTitleContext = true;
      rawWork = rawWork.replace(embRe, ' ').trim();
      break;
    }
  }

  let toks = rawWork
    .replace(/[^A-Za-zÀ-ÿ’'\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.replace(/[’']/g, '').length >= 2);

  while (
    toks.length > 1 &&
    (DM_EDGE_TRADE_TOKENS.has(toks[toks.length - 1].toLowerCase()) ||
      isNonPersonToken(toks[toks.length - 1]) ||
      /^associat/i.test(toks[toks.length - 1]))
  ) {
    toks = toks.slice(0, -1);
  }
  while (
    toks.length > 1 &&
    (DM_EDGE_TRADE_TOKENS.has(toks[0].toLowerCase()) || NON_PERSON_STEM_RE.test(toks[0]))
  ) {
    toks = toks.slice(1);
  }
  if (toks.length === 0) return null;
  if (toks.some((t) => isNonPersonToken(t))) return null;

  const units = groupPersonUnits(toks);
  if (!units || units.length === 0) return null;
  const capped = units.length > 3 ? units.slice(0, 3) : units;
  const n = capped.length;
  if (n === 1) {
    if (!effectiveTitleContext) return null;
    // Mai restituire un solo nome di battesimo comune dopo titolo ("Per. Ind. Antonio" -> null)
    return capped[0].isFirstName ? null : capped[0].text;
  }

  if (!effectiveTitleContext && !capped.some((u) => u.isFirstName)) return null;

  const particleUnit = capped.find((u) => u.isParticleSurname);
  if (particleUnit) return particleUnit.text;

  if (capped.every((u) => u.isFirstName)) {
    // Dopo un titolo onorifico ("Studio di Ingegneria Ing. Umberto SERGIO") il 2° token è il cognome (#184 #11688)
    return effectiveTitleContext ? capped[n - 1].text : capped.map((u) => u.text).join(' ');
  }
  if (n === 2) {
    if (capped[0].isFirstName && !capped[1].isFirstName) return capped[1].text;
    if (!capped[0].isFirstName && capped[1].isFirstName) return capped[0].text;
    return capped[1].text;
  }
  if (!capped[0].isFirstName && capped[1].isFirstName && capped[2].isFirstName) return capped[0].text;
  if (capped[0].isFirstName && capped[1].isFirstName && !capped[2].isFirstName) return capped[2].text;
  return capped[n - 1].text;
}

const EMBEDDED_DM_TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/(?:^|\s)(?:dottoressa|dott\.?\s*ssa\.?|dr\.?\s*ssa\.?)(?=\s|$)/i, 'Dott.ssa'],
  [/(?:^|\s)(?:perito\s+industriale|perito\s+edile|per\.?\s*(?:ind|ed)\.?|perito)(?=\s|$)/i, 'Per.'],
  [/(?:^|\s)(?:geometra|geomet\.?|geom\.)(?=\s|$)/i, 'Geom.'],
  [/(?:^|\s)(?:architetto|arch\.)(?=\s|$)/i, 'Arch.'],
  [/(?:^|\s)(?:ingegnere|ing\.)(?=\s|$)/i, 'Ing.'],
  [/(?:^|\s)(?:dottore|dottor|dott\.|dr\.)(?=\s|$)/i, 'Dott.'],
  [/(?:^|\s)(?:ragioniere|ragionier|rag\.)(?=\s|$)/i, 'Rag.'],
  [/(?:^|\s)(?:avvocato|avv\.)(?=\s|$)/i, 'Avv.'],
];

export function extractVerifiedDecisionMaker(
  rawDecisionMaker?: string | null,
  rawCompanyName?: string | null,
  vatOfficialName?: string | null,
  cityHint?: string | null
): string | null {
  const candidates: string[] = [];

  const normalizePersonUmlautsAndApostrophes = (s: string) =>
    normalizeTypographicApostrophe(s)
      .replace(/\b([A-Za-z]):([AEIOUaeiou])(?=[a-zà-ÿ])/g, (_m, c1: string, c2: string) => c1 + c2.toLowerCase())
      .replace(/\b([LlDd])\?(?=[A-Za-zÀ-ÿ])/g, '$1’');

  if (rawDecisionMaker) {
    let dmInit = normalizePersonUmlautsAndApostrophes(String(rawDecisionMaker)).trim();
    // Ripristina eventuale particella iniziale mangiata nel DB (#5339 "Di Pietro Giuseppe" con dm="Pietro Giuseppe", vat="DI MAIO COLORI SRL" con dm="Maio Antonio")
    const dmTwoWords = dmInit.match(/^([A-Za-zÀ-ÿ]{2,})\s+([A-Za-zÀ-ÿ]{2,})$/);
    if (dmTwoWords && !SURNAME_PARTICLES.has(dmTwoWords[1].toLowerCase())) {
      const w0Esc = escapeRegExpLiteral(dmTwoWords[1]);
      const w1Esc = escapeRegExpLiteral(dmTwoWords[2]);
      const fullRestoreRe = new RegExp(
        `(?:^|\\sdi\\s+)(De|Di|Del|Della|Dello|Dei|Degli|Delle|Dal|Dalla|Da|Lo|La|Li)\\s+${w0Esc}\\s+${w1Esc}\\b`,
        'i'
      );
      const prefixRestoreRe = new RegExp(
        `^(De|Di|Del|Della|Dello|Dei|Degli|Delle|Dal|Dalla|Da|Lo|La|Li)\\s+${w0Esc}\\b`,
        'i'
      );
      for (const src of [rawCompanyName, vatOfficialName]) {
        if (!src) continue;
        const srcNorm = normalizePersonUmlautsAndApostrophes(String(src)).trim();
        const mFull = srcNorm.match(fullRestoreRe) || srcNorm.match(prefixRestoreRe);
        if (mFull && mFull[1]) {
          dmInit = `${capitalizePersonToken(mFull[1])} ${dmInit}`;
          break;
        }
      }
    }
    candidates.push(dmInit);
  }

  for (const src of [vatOfficialName, rawCompanyName]) {
    if (!src) continue;
    // Strip delle forme giuridiche ("... S.R.L. IN LIQUIDAZIONE") PRIMA di estrarre i candidati (#199 punto 1: mai "Ing. Liquidazione")
    const srcNorm = stripLegalSuffixesIterative(normalizePersonUmlautsAndApostrophes(String(src)));
    const m = srcNorm.match(
      /([A-Za-zÀ-ÿ]{3,})\s+di\s+([A-Za-zÀ-ÿ.’']+(?:\s+[A-Za-zÀ-ÿ.’']+){1,3})$/i
    );
    if (m && m[1] && m[2]) {
      if (!DM_LOCATION_PREFIX_WORDS.has(m[1].toLowerCase())) {
        candidates.push(m[2]);
      }
    }
    const invertedTitledCand = srcNorm.match(
      /^([A-ZÀ-Ÿ][A-Za-zÀ-ÿ’']{2,}\s+(?:Ing|Arch|Geom|Dott\.?\s*ssa|Dott|Per\.?\s*Ind|Rag|Avv)\.\s+[A-Za-zÀ-ÿ.’'\s]{2,})$/i
    );
    if (
      invertedTitledCand &&
      invertedTitledCand[1] &&
      !isNonPersonToken(invertedTitledCand[1].split(/\s+/)[0])
    ) {
      candidates.push(invertedTitledCand[1]);
    } else {
      const studioCand = srcNorm.match(
        /\b((?:Ing|Arch|Geom|Dott\.?\s*ssa|Dott|Per\.?\s*Ind|Rag|Avv)\.\s+[A-Za-zÀ-ÿ.’'\s]{3,})$/i
      );
      if (studioCand && studioCand[1]) {
        candidates.push(studioCand[1]);
      }
    }
  }

  const cityTokens = normalizeTypographicApostrophe(String(cityHint || ''))
    .toLowerCase()
    .split(/[^a-zà-ÿ’]+/)
    .filter((t) => t.length >= 2);

  for (const cand of candidates) {
    let working = normalizeTypographicApostrophe(cand)
      .replace(/\s*\(.*?\)\s*/g, ' ')
      // Rimuove soprannomi tra apici singoli/doppi ("De Angelis Alessandro 'Teclux'" -> "De Angelis Alessandro", preservando "D’Api’") (#189 punto 5)
      .replace(/(?<=\s)[’'"“«][^’'"”»]{2,}[’'"”»](?=\s|$)/g, ' ')
      .replace(/\s*(?:&|e)\s*(?:figli[oa]?|fratelli|f\.?lli\.?|sorelle|eredi|soci|c\.?)\b.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!working) continue;

    // Scarta doppi nomi con congiunzione ("Fabio Ed Andrea", "Mario e Luigi") (#184 punto 2)
    if (/\s+(?:e|ed|and|&)\s+/i.test(working)) continue;

    // Se contiene "*" o "<Brand non-persona> di <Persona>" ("Prato*Infissi Di Paolo Degl’Innocenti"), estrai solo dopo "di"
    if (working.includes('*')) {
      const afterDi = working.match(/\bdi\s+(.+)$/i);
      if (afterDi && afterDi[1]) {
        working = afterDi[1].trim();
      } else {
        continue;
      }
    } else {
      const brandDiMatch = working.match(/^(\S+(?:\s+\S+)*?)\s+di\s+(.+)$/i);
      if (brandDiMatch && brandDiMatch[1] && brandDiMatch[2]) {
        const leftToks = brandDiMatch[1].trim().split(/\s+/);
        const leftIsTitle = RECOGNIZED_TITLE_PATTERNS.some(([re]) => re.test(brandDiMatch[1].trim()));
        const leftSingleFirst = leftToks.length === 1 && isFirstNameLike(leftToks[0]);
        if (!leftIsTitle && !leftSingleFirst && (leftToks.length >= 2 || isNonPersonToken(leftToks[0]))) {
          working = brandDiMatch[2].trim();
        }
      }
    }

    let detectedTitle: string | null = null;
    for (const [titleRe, canonicalTitle] of RECOGNIZED_TITLE_PATTERNS) {
      const m = working.match(titleRe);
      if (m) {
        detectedTitle = canonicalTitle;
        working = working.slice(m[0].length).trim();
        break;
      }
    }

    for (const [embRe, canonicalTitle] of EMBEDDED_DM_TITLE_PATTERNS) {
      if (embRe.test(working)) {
        if (!detectedTitle) detectedTitle = canonicalTitle;
        working = working.replace(embRe, ' ').replace(/\s{2,}/g, ' ').trim();
        break;
      }
    }

    const cleaned = working
      .replace(/[^A-Za-zÀ-ÿ’\s]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!cleaned) continue;

    let words = cleaned.split(/\s+/).filter((w) => w.replace(/’/g, '').length >= 2);
    if (words.length === 0) continue;
    const minWords = detectedTitle ? 1 : 2;

    if (cityTokens.length > 0) {
      const lowerWords = words.map((w) => w.toLowerCase());
      const n = cityTokens.length;
      const matchesAt = (start: number) =>
        start >= 0 &&
        start + n <= lowerWords.length &&
        cityTokens.every((ct, i) => lowerWords[start + i] === ct);
      if (lowerWords.length === n && matchesAt(0)) continue;
      if (lowerWords.length - n >= minWords && matchesAt(lowerWords.length - n)) {
        words = words.slice(0, words.length - n);
      } else if (lowerWords.length - n >= minWords && matchesAt(0)) {
        words = words.slice(n);
      }
    }

    // Rimuove dai bordi SOLO etichette di mestiere/ruolo e radici merceologiche, MAI cognomi come "Villa" (#184 punto 2)
    let changed = true;
    while (changed && words.length > minWords) {
      changed = false;
      const lastLow = words[words.length - 1].toLowerCase().replace(/[^a-zà-ÿ’]/g, '');
      if (DM_EDGE_TRADE_TOKENS.has(lastLow) || NON_PERSON_STEM_RE.test(lastLow)) {
        words = words.slice(0, -1);
        changed = true;
        continue;
      }
      const firstLow = words[0].toLowerCase().replace(/[^a-zà-ÿ’]/g, '');
      if (DM_EDGE_TRADE_TOKENS.has(firstLow) || NON_PERSON_STEM_RE.test(firstLow)) {
        words = words.slice(1);
        changed = true;
      }
    }

    const hasParticleWord = words.some((w) =>
      SURNAME_PARTICLES.has(w.toLowerCase().replace(/[^a-zà-ÿ]/g, ''))
    );
    const maxRawWords = hasParticleWord ? 4 : 3;
    if (words.length < minWords || words.length > maxRawWords) continue;
    if (words.some((w) => isNonPersonToken(w))) continue;

    const hasVillaPlacePattern = words.some(
      (w, idx) =>
        w.toLowerCase() === 'villa' &&
        idx + 1 < words.length &&
        /^(?:san|santa|santo|di|del|della|dello|dei|degli|delle)$|^d’/i.test(words[idx + 1])
    );
    if (hasVillaPlacePattern) continue;

    const units = groupPersonUnits(words);
    if (!units || units.length < (detectedTitle ? 1 : 2) || units.length > 3) continue;

    if (detectedTitle && units.length === 1 && units[0].isFirstName) continue;
    if (!detectedTitle && !units.some((u) => u.isFirstName)) continue;

    let orderedUnits = [...units];
    if (orderedUnits.length === 2) {
      if (!orderedUnits[0].isFirstName && orderedUnits[1].isFirstName) {
        orderedUnits = [orderedUnits[1], orderedUnits[0]];
      } else if (
        !detectedTitle &&
        orderedUnits[0].isFirstName &&
        orderedUnits[1].isFirstName &&
        !orderedUnits[0].isParticleSurname &&
        !orderedUnits[1].isParticleSurname
      ) {
        const u0Esc = escapeRegExpLiteral(orderedUnits[0].text);
        const u1Esc = escapeRegExpLiteral(orderedUnits[1].text);
        const vatHasUpperCamerale =
          Boolean(vatOfficialName) &&
          new RegExp(
            `(?:^|\\bDI\\s+)${u0Esc.toUpperCase()}\\s+${u1Esc.toUpperCase()}\\b`
          ).test(normalizeTypographicApostrophe(String(vatOfficialName)).trim());
        const compStartsWithSurname =
          Boolean(rawCompanyName) &&
          new RegExp(`^${u0Esc}\\s+(?!di\\b|${u1Esc}$)`, 'i').test(
            normalizeTypographicApostrophe(String(rawCompanyName)).trim()
          );
        if (vatHasUpperCamerale || compStartsWithSurname) {
          orderedUnits = [orderedUnits[1], orderedUnits[0]];
        }
      }
    } else if (orderedUnits.length === 3) {
      if (!orderedUnits[0].isFirstName && orderedUnits[1].isFirstName && orderedUnits[2].isFirstName) {
        orderedUnits = [orderedUnits[1], orderedUnits[2], orderedUnits[0]];
      } else if (
        !orderedUnits[0].isFirstName &&
        !orderedUnits[1].isFirstName &&
        orderedUnits[2].isFirstName
      ) {
        // Doppio cognome + nome finale ("D’Api’ Notardonato Fabio", "De Martin D’Orsola Enea") -> [Nome, Cognome1, Cognome2] (#189 punto 5)
        orderedUnits = [orderedUnits[2], orderedUnits[0], orderedUnits[1]];
      } else if (
        orderedUnits[0].isParticleSurname &&
        orderedUnits[1].isFirstName &&
        !orderedUnits[2].isFirstName
      ) {
        // Cognome con particella + Nome1 + Nome2 raro ("Lo Giudice Sergio Fabiany") -> [Nome1, Nome2, Cognome] (#189 punto 5)
        orderedUnits = [orderedUnits[1], orderedUnits[2], orderedUnits[0]];
      }
    }

    const formattedName = orderedUnits.map((u) => u.text).join(' ');
    return detectedTitle ? `${detectedTitle} ${formattedName}` : formattedName;
  }

  return null;
}

/**
 * Costruisce il saluto moderno B2B:
 * - Titolare con titolo ("Ing. Coseano", "Dott.ssa Maria De Rossi") -> "Buongiorno Ing. Coseano," / "Buongiorno Dott.ssa De Rossi,"
 * - Titolare Nome + Cognome univoco ("Marco Cibien", "Paolo De Luca", "Rocco De Filippis") -> "Buongiorno Sig. De Luca," / "Buongiorno Paolo De Luca,"
 * - Doppio nome proprio ambiguo ("Michele Luigi") -> "Buongiorno Michele Luigi," (mai "Sig. Luigi")
 * - Azienda senza nome titolare -> "Buongiorno,"
 */
export function buildSalutoModerno(
  decisionMakerClean?: string | null,
  pickIndexFn: (len: number) => number = () => 0
): string {
  if (!decisionMakerClean) {
    return 'Buongiorno,';
  }

  const normalizedDm = normalizeTypographicApostrophe(decisionMakerClean.trim());
  const titleMatch = normalizedDm.match(
    /^(Ing\.|Arch\.|Geom\.|Dott\.ssa|Dott\.|Rag\.|Per\.|Avv\.|Sig\.ra|Sig\.)\s+(.+)$/i
  );
  if (titleMatch) {
    const title = titleMatch[1];
    const restUnits = groupPersonUnits(titleMatch[2].trim().split(/\s+/));
    if (!restUnits || restUnits.length === 0) return 'Buongiorno,';
    let ordered = [...restUnits];
    if (ordered.length === 2 && !ordered[0].isFirstName && ordered[1].isFirstName) {
      ordered = [ordered[1], ordered[0]];
    } else if (
      ordered.length === 3 &&
      !ordered[0].isFirstName &&
      ordered[1].isFirstName &&
      ordered[2].isFirstName
    ) {
      ordered = [ordered[1], ordered[2], ordered[0]];
    }
    if (ordered.length >= 3) {
      return `Buongiorno ${title} ${ordered[ordered.length - 1].text},`;
    }
    if (ordered.length === 2 && ordered[1].isParticleSurname) {
      return `Buongiorno ${title} ${ordered[1].text},`;
    }
    return `Buongiorno ${title} ${ordered.map((u) => u.text).join(' ')},`;
  }

  const rawWords = normalizedDm.split(/\s+/).filter(Boolean);
  const units = groupPersonUnits(rawWords);
  if (!units || units.length === 0) {
    return 'Buongiorno,';
  }

  let ordered = [...units];
  if (ordered.length === 2) {
    if (ordered[0].isFirstName && ordered[1].isFirstName) {
      return `Buongiorno ${ordered[0].text} ${ordered[1].text},`;
    }
    if (!ordered[0].isFirstName && ordered[1].isFirstName) {
      ordered = [ordered[1], ordered[0]];
    }
    const surname = ordered[1].text;
    if (ordered[0].isMale) {
      const opts = [`Buongiorno Sig. ${surname},`, `Buongiorno ${ordered[0].text} ${surname},`];
      return opts[pickIndexFn(opts.length)];
    }
    if (ordered[0].isFemale) {
      const opts = [`Buongiorno Sig.ra ${surname},`, `Buongiorno ${ordered[0].text} ${surname},`];
      return opts[pickIndexFn(opts.length)];
    }
    return `Buongiorno ${ordered[0].text} ${surname},`;
  }

  if (ordered.length === 3) {
    if (!ordered[0].isFirstName && ordered[1].isFirstName && ordered[2].isFirstName) {
      ordered = [ordered[1], ordered[2], ordered[0]];
    } else if (!ordered[0].isFirstName && !ordered[1].isFirstName && ordered[2].isFirstName) {
      ordered = [ordered[2], ordered[0], ordered[1]];
    } else if (ordered[0].isParticleSurname && ordered[1].isFirstName && !ordered[2].isFirstName) {
      ordered = [ordered[1], ordered[2], ordered[0]];
    }
    const fullStr = ordered.map((u) => u.text).join(' ');
    if (
      ordered[0].isFirstName &&
      !ordered[1].isFirstName &&
      !ordered[2].isFirstName &&
      (!ordered[2].isParticleSurname || ordered[1].isParticleSurname)
    ) {
      const doubleSurname = `${ordered[1].text} ${ordered[2].text}`;
      if (ordered[0].isMale) {
        const opts = [`Buongiorno Sig. ${doubleSurname},`, `Buongiorno ${fullStr},`];
        return opts[pickIndexFn(opts.length)];
      }
      if (ordered[0].isFemale) {
        const opts = [`Buongiorno Sig.ra ${doubleSurname},`, `Buongiorno ${fullStr},`];
        return opts[pickIndexFn(opts.length)];
      }
    }
    const surname = ordered[2].text;
    if (
      (ordered[0].isMale && ordered[1].isMale && !ordered[2].isFirstName) ||
      (ordered[0].isMale && ordered[2].isParticleSurname)
    ) {
      const opts = [`Buongiorno Sig. ${surname},`, `Buongiorno ${fullStr},`];
      return opts[pickIndexFn(opts.length)];
    }
    if (
      (ordered[0].isFemale && ordered[1].isFemale && !ordered[2].isFirstName) ||
      (ordered[0].isFemale && ordered[2].isParticleSurname)
    ) {
      const opts = [`Buongiorno Sig.ra ${surname},`, `Buongiorno ${fullStr},`];
      return opts[pickIndexFn(opts.length)];
    }
    return `Buongiorno ${fullStr},`;
  }

  return `Buongiorno ${ordered.map((u) => u.text).join(' ')},`;
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
  sectorShortPlural: string;
  sectorNoun: string;
  scopoVariants: string[];
  chiusuraVariants: string[];
} {
  switch (cluster) {
    case 'Ferramenta':
      return {
        sectorPlural: 'le ferramenta e le rivendite di utensileria',
        sectorShortPlural: 'le ferramenta',
        sectorNoun: 'ferramenta e utensileria',
        scopoVariants: [
          'per il riassortimento dei reparti elettrico, fissaggio e utensileria da banco anche a colli piccoli',
          'per la fornitura all’ingrosso di articoli ad alta rotazione per banco vendita e libero servizio',
          'per l’approvvigionamento diretto di elettroutensili, fissaggio e materiale elettrico confezionato',
        ],
        chiusuraVariants: [
          'per listini dedicati alle rivendite, campionature mirate o riassortimenti anche a colli piccoli',
          'per qualsiasi approfondimento sulle linee da banco o richieste su singoli articoli',
          'per quotazioni riservate su forniture programmate o assortimenti da banco',
        ],
      };
    case 'Rivendita_Edile':
      return {
        sectorPlural: 'le rivendite edili e i distributori di settore',
        sectorShortPlural: 'le rivendite edili',
        sectorNoun: 'rivendita edile ed elettroforniture',
        scopoVariants: [
          'per il riassortimento all’ingrosso dei reparti elettrico, illuminazione, cantiere e fissaggio',
          'per la fornitura B2B riservata alle rivendite su materiale da banco, cantiere ed elettroutensili',
          'per affiancare il magazzino vendita con linee ad alta marginalità e pronta disponibilità',
        ],
        chiusuraVariants: [
          'per quotazioni su forniture da banco, pedane miste o riassortimenti frazionati',
          'per un confronto diretto sulle condizioni riservate ai rivenditori e sulle linee più richieste',
          'per offerte dedicate su specifici fabbisogni di magazzino o commesse dei clienti professionali',
        ],
      };
    case 'Illuminazione':
      return {
        sectorPlural: 'gli showroom e i negozi specializzati luce',
        sectorShortPlural: 'gli showroom e i negozi luce',
        sectorNoun: 'illuminotecnica e showroom luce',
        scopoVariants: [
          'per la fornitura a listino rivenditori di corpi illuminanti decorativi, architetturali e LED',
          'per affiancare lo showroom e le forniture contract con collezioni luce e sistemi LED ad alto margine',
          'per l’approvvigionamento B2B di soluzioni illuminotecniche interne, outdoor e profili lineari 24V',
        ],
        chiusuraVariants: [
          'per quotazioni riservate a showroom, forniture contract o progetti illuminotecnici su distinta',
          'per approfondire le condizioni dedicate ai negozi luce o ricevere le schede prodotto',
          'per offerte mirate su commesse residenziali, commerciali o ricettive',
        ],
      };
    case 'Quadrista':
      return {
        sectorPlural: 'i quadristi e gli specialisti di automazione industriale',
        sectorShortPlural: 'i quadristi e gli installatori industriali',
        sectorNoun: 'quadristica e automazione industriale',
        scopoVariants: [
          'per la fornitura diretta di modulari, organi di manovra, carpenteria e morsetteria da quadro',
          'per l’approvvigionamento all’ingrosso di componentistica certificata per quadri di distribuzione e automazione',
          'per la consegna rapida di protezioni, contattori, casse IP65 e minuteria da quadro',
        ],
        chiusuraVariants: [
          'per offerte dedicate su distinta base quadro o forniture ricorrenti di reparto',
          'per quotazioni mirate su specifiche commesse di assemblaggio e carpenteria elettrica',
          'per qualsiasi verifica sulle schede prodotto o condizioni dedicate sui consumi abituali',
        ],
      };
    case 'Impresa_Edile':
      return {
        sectorPlural: 'le imprese di costruzioni e ristrutturazioni',
        sectorShortPlural: 'le imprese di costruzioni',
        sectorNoun: 'costruzioni e cantieristica',
        scopoVariants: [
          'per la fornitura diretta di materiale elettrico da cantiere, illuminazione, serie civile e fissaggio',
          'per seguire nuovi cantieri e ristrutturazioni su dotazioni elettriche, posa e illuminazione LED',
          'per raggruppare su un unico fornitore quadri cantiere, incasso, sigillanti ed elettroutensili',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su capitolato d’opera, computo metrico o fabbisogno di singolo cantiere',
          'per preventivi mirati sulle forniture con consegna diretta anche presso l’area cantiere',
          'per qualsiasi confronto tecnico o economico sulle commesse in partenza',
        ],
      };
    case 'Termoidraulica_Clima':
      return {
        sectorPlural: 'le imprese termoidrauliche e di climatizzazione',
        sectorShortPlural: 'gli installatori termoidraulici e clima',
        sectorNoun: 'impiantistica termoidraulica e HVAC',
        scopoVariants: [
          'per le forniture elettriche di comando HVAC, staffaggio, sigillanti ed elettroutensili da cantiere',
          'per affiancare gli interventi termoidraulici sui materiali elettrici complementari, fissaggio e utensileria',
          'per l’acquisto diretto a prezzi netti di quadri IP65, contattori, protezioni e consumabili di posa',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su commessa impiantistica, capitolato o scorte di magazzino',
          'per offerte su distinta materiali o forniture ricorrenti per le squadre operative',
          'per qualsiasi confronto sui materiali elettrici e di posa a corredo degli impianti clima',
        ],
      };
    case 'Fotovoltaico_Rinnovabili':
      return {
        sectorPlural: 'gli installatori di impianti fotovoltaici ed energie rinnovabili',
        sectorShortPlural: 'gli installatori fotovoltaici',
        sectorNoun: 'impiantistica fotovoltaica ed efficienza energetica',
        scopoVariants: [
          'per la fornitura diretta di protezioni AC/DC, scaricatori SPD, quadri stagni e fissaggio esterno',
          'per affiancare i cantieri fotovoltaici su quadristica di protezione, pressacavi IP68 e relamping LED',
          'per l’approvvigionamento all’ingrosso di protezioni d’impianto, carpenteria IP65 e utensileria',
        ],
        chiusuraVariants: [
          'per quotazioni su distinta impianto, forniture ricorrenti o commesse di efficienza energetica',
          'per offerte mirate su lotti di protezione modulare, quadristica e materiale di posa',
          'per qualsiasi preventivo dedicato sulle prossime installazioni in programma',
        ],
      };
    case 'Sicurezza_Automazione':
      return {
        sectorPlural: 'gli installatori di sistemi di sicurezza, TVCC e automazione',
        sectorShortPlural: 'gli installatori di sicurezza e automazione',
        sectorNoun: 'sicurezza, videosorveglianza e building automation',
        scopoVariants: [
          'per la fornitura diretta di telecamere IP PoE, alimentatori, scatole stagne IP65 e moduli smart',
          'per affiancare gli impianti di sicurezza e domotica su materiale elettrico, posa e LED perimetrale',
          'per l’acquisto all’ingrosso di apparati TVCC, moduli smart, cassette stagne e fissaggio',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su singola commessa, impianto centralizzato o distinta materiali',
          'per approfondimenti tecnici o preventivi riservati sulle forniture abituali',
          'per qualsiasi confronto sui prodotti a supporto delle installazioni',
        ],
      };
    case 'Architetto_Ingegnere':
      return {
        sectorPlural: 'gli studi di progettazione architettonica e impiantistica',
        sectorShortPlural: 'gli studi di progettazione',
        sectorNoun: 'progettazione e illuminotecnica',
        scopoVariants: [
          'per le forniture di illuminazione architetturale, serie civili coordinate e quadristica di progetto',
          'per la selezione e fornitura di corpi illuminanti LED, profili lineari, serie civile e capitolati',
          'per affiancare studio e imprese esecutrici con schede prodotto complete e prezzi netti diretti',
        ],
        chiusuraVariants: [
          'per supporto su capitolati, schede prodotto o quotazioni dedicate a progetto',
          'per valutazioni illuminotecniche, campionature finiture o preventivi su computo metrico',
          'per qualsiasi approfondimento legato alle commesse seguite dallo studio',
        ],
      };
    case 'Serramentista':
      return {
        sectorPlural: 'i serramentisti e le aziende di carpenteria e infissi',
        sectorShortPlural: 'i serramentisti',
        sectorNoun: 'serramenti, carpenteria e infissi',
        scopoVariants: [
          'per la fornitura diretta di sigillanti e schiume da posa, fissaggio, elettroutensili e LED integrati',
          'per l’acquisto all’ingrosso di consumabili certificati per montaggio infissi, automazioni e officina',
          'per rifornire in modo diretto chimico da posa, ancoranti, utensili brushless e comandi elettrici',
        ],
        chiusuraVariants: [
          'per quotazioni sui consumabili ricorrenti di posa, dotazioni officina o singole commesse',
          'per offerte dedicate su forniture programmate di sigillanti, fissaggio ed elettroutensili',
          'per qualsiasi confronto prezzi sui materiali impiegati in produzione e montaggio',
        ],
      };
    case 'Installatore_Civile':
    default:
      return {
        sectorPlural: 'gli installatori elettrici e le imprese impiantistiche',
        sectorShortPlural: 'gli installatori elettrici',
        sectorNoun: 'impiantistica elettrica civile e industriale',
        scopoVariants: [
          'per i materiali ad alta rotazione destinati a cantieri, rifacimenti impianto e manutenzioni',
          'per la fornitura diretta di serie civile, protezione quadro, canalizzazione e illuminazione LED',
          'per l’approvvigionamento quotidiano del materiale elettrico di cantiere e magazzino',
        ],
        chiusuraVariants: [
          'per quotazioni dedicate su singola commessa, capitolato o distinta materiali',
          'per preventivi rapidi di cantiere o confronti sulle linee di uso quotidiano',
          'per qualsiasi verifica tecnica ed economica sugli articoli più utilizzati',
        ],
      };
  }
}

/**
 * Restituisce i 2-3 prodotti/marchi chiave mirati per ciascuno degli 11 cluster B2B (10-13 parole, zero '%').
 */
export function buildProdottiMiratiBrevi(
  cluster: CanonicalB2BCluster,
  civilBrandMatched: string | null
): string {
  const civilCompat = civilBrandMatched || 'BTicino/Vimar';

  switch (cluster) {
    case 'Ferramenta':
      return 'elettroutensili Kombo Pro 20V, schiume, sigillanti Penosil e fissaggio Surelock';
    case 'Rivendita_Edile':
      return 'elettroutensili Kombo Pro 20V, dischi diamantati Elmark, chimico Penosil e quadri cantiere Marlanvil';
    case 'Illuminazione':
      return 'corpi illuminanti, sistemi a binario, strip LED 24V Stellar/Elmark e serie civile Mapam';
    case 'Quadrista':
      return 'modulari, scatolati, contattori Elmark, carpenteria stagna IP65 Marlanvil e morsetteria Surelock';
    case 'Impresa_Edile':
      return 'quadri cantiere Marlanvil, prese industriali Omega, proiettori LED Stellar e sigillanti Penosil';
    case 'Termoidraulica_Clima':
      return 'quadri IP65, contattori HVAC Elmark/Marlanvil, staffaggio Surelock e sigillanti Penosil';
    case 'Fotovoltaico_Rinnovabili':
      return 'scaricatori SPD AC/DC, quadri stagni IP65 Elmark/Marlanvil e fissaggio UV Surelock';
    case 'Sicurezza_Automazione':
      return 'telecamere IP PoE, cassette stagne IP65 Marlanvil/Elmark e moduli smart Proxe/Sonoff';
    case 'Architetto_Ingegnere':
      return 'illuminazione architetturale, strip LED 24V Stellar, serie civile Mapam e quadristica CE';
    case 'Serramentista':
      return 'schiume poliuretaniche, siliconi neutri Penosil, fissaggio Surelock ed elettroutensili Kombo Pro 20V';
    case 'Installatore_Civile':
    default:
      return `serie civile Mapam compatibile ${civilCompat}, quadri stagni Marlanvil e protezioni modulari Elmark`;
  }
}

/**
 * Micro-presentazione ombrello (19-20 parole), sempre con "all’ingrosso" e "Partita IVA",
 * zero "vendita...vendita", zero "iscritti", zero doppi "per...per", zero collisioni con companyName o con P2/P3/Oggetti.
 */
function buildMicroPresentazioneIzzo(
  cluster: CanonicalB2BCluster,
  companyContext: string,
  compRefDi: string,
  pickIndexFn: (len: number) => number
): string {
  const hasImpiant = /impiant/i.test(companyContext);
  const hasDitta = /\bditta\b/i.test(companyContext) || cluster === 'Installatore_Civile';
  const hasAziendaWord =
    /\baziend/i.test(companyContext) ||
    /\baziend/i.test(compRefDi) ||
    cluster === 'Impresa_Edile';

  const ambitoA = hasImpiant ? 'montaggio e manutenzione' : 'impiantistica e manutenzione';
  const ambitoB = hasImpiant ? 'montaggio, manutenzione e finitura' : 'impianti, posa e finitura';

  const targetAziende = hasAziendaWord
    ? 'ai soli titolari di Partita IVA'
    : 'alle sole aziende con Partita IVA';
  const targetDitte = hasDitta
    ? 'ai soli titolari di Partita IVA'
    : 'alle sole ditte con Partita IVA';

  const umbrellaVariants = [
    `società italiana specializzata nella vendita all’ingrosso per ${ambitoA}, rivolta ai soli titolari di Partita IVA`,
    `società italiana specializzata nella vendita all’ingrosso per ${ambitoB}, destinata ${targetAziende}`,
    `società italiana impegnata nella vendita all’ingrosso di dotazioni per ${ambitoA}, rivolta ai titolari di Partita IVA`,
    `società italiana impegnata nella vendita all’ingrosso per ${ambitoB}, pensata per i soli titolari di Partita IVA`,
    `società italiana specializzata nella vendita all’ingrosso per ${ambitoA}, destinata ${targetDitte}`,
    `società italiana impegnata nella vendita all’ingrosso per ${ambitoB}, rivolta ${targetAziende}`,
  ];
  return umbrellaVariants[pickIndexFn(umbrellaVariants.length)];
}

function resolveAntiEchoSectorShort(
  cluster: CanonicalB2BCluster,
  defaultShort: string,
  companyContext: string
): string {
  const lower = companyContext.toLowerCase();
  switch (cluster) {
    case 'Ferramenta':
      return /ferramenta/i.test(lower) ? 'le rivendite di settore' : defaultShort;
    case 'Architetto_Ingegnere':
      if (/progett/i.test(lower)) return 'i professionisti del settore';
      return /\bstudio\b/i.test(lower) ? 'i progettisti' : defaultShort;
    case 'Installatore_Civile':
      if (/installa/i.test(lower)) return 'i professionisti del settore';
      if (/elettric/i.test(lower)) return 'gli installatori del settore';
      return defaultShort;
    case 'Illuminazione':
      if (/\bluce\b|showroom|illumin/i.test(lower)) {
        return /negozi/i.test(lower) ? 'i rivenditori del settore' : 'i negozi del settore';
      }
      return defaultShort;
    case 'Impresa_Edile':
      if (/costruzion/i.test(lower)) {
        return /edil/i.test(lower)
          ? 'i professionisti del settore'
          : 'i professionisti dell’edilizia';
      }
      if (/impres/i.test(lower)) {
        return /edil/i.test(lower) ? 'i costruttori del settore' : 'i costruttori edili';
      }
      return defaultShort;
    case 'Rivendita_Edile':
      if (/rivendit/i.test(lower)) return 'i commercianti di settore';
      if (/edil/i.test(lower)) return 'le rivendite di settore';
      return defaultShort;
    case 'Quadrista':
      if (/installa|industria/i.test(lower)) return 'i cablatori del settore';
      return /quadr/i.test(lower) ? 'gli installatori industriali' : defaultShort;
    case 'Serramentista':
      if (/serrament/i.test(lower)) {
        return /infiss/i.test(lower)
          ? 'i professionisti del settore'
          : 'i professionisti degli infissi';
      }
      return defaultShort;
    case 'Termoidraulica_Clima':
      if (/installa/i.test(lower)) return 'i professionisti del settore';
      return /termoidraulic|idraulic|clima|caldai|termic/i.test(lower)
        ? 'gli installatori del settore'
        : defaultShort;
    case 'Fotovoltaico_Rinnovabili':
      if (/installa/i.test(lower)) return 'i professionisti del settore';
      return /fotovoltaic|rinnovabil|solar|energi/i.test(lower)
        ? 'gli installatori del settore'
        : defaultShort;
    case 'Sicurezza_Automazione':
      if (/installa/i.test(lower)) return 'i professionisti del settore';
      return /sicurezz|automazion|allarm|antifurt/i.test(lower)
        ? 'gli installatori del settore'
        : defaultShort;
    default:
      return defaultShort;
  }
}

export function startsWithItalianArticle(text: string): boolean {
  return /^(?:il|lo|la|i|gli|le)\s+|^l[’']/i.test(text.trim());
}

export function doesCompanyIncludeCity(companyName: string, cityClean: string): boolean {
  if (!cityClean) return false;
  const compNorm = normalizeTypographicApostrophe(companyName).toLowerCase();
  const cityNorm = normalizeTypographicApostrophe(cityClean).toLowerCase();
  if (compNorm.includes(cityNorm)) return true;
  const cityCore = cityNorm.replace(/^(?:il|lo|la|i|gli|le)\s+|^l’/i, '').trim();
  return cityCore.length >= 4 && compNorm.includes(cityCore);
}

function buildTailoredProductBullets(
  cluster: CanonicalB2BCluster,
  civilBrandMatched: string | null,
  specializations: string[],
  pickIdx: number
): string {
  const civilCompatNote = civilBrandMatched
    ? `(pienamente compatibile con gli standard installativi ${civilBrandMatched} sul mercato)`
    : '(compatibile con i principali standard installativi presenti sul mercato)';

  const hasEvOrPv = specializations.some((s) => /ricarica EV|fotovoltaic/i.test(s));

  switch (cluster) {
    case 'Ferramenta':
      return pickIdx % 2 === 0
        ? [
            `- Utensileria ed elettroutensili: linea Kombo e Kombo Pro 20V Brushless, dischi diamantati e punte SDS-Plus Elmark;`,
            `- Fissaggio e chimico professionale: fascette UV e acciaio Surelock, tasselli, ancoranti e sigillanti Penosil;`,
            `- Elettrico e luce per libero servizio: spine, prese e multiprese Omega, serie civile Mapam e sorgenti LED Stellar.`,
          ].join('\n')
        : [
            `- Banco utensileria e taglio: elettroutensili Kombo Pro 20V Brushless, utensili manuali e dischi diamantati Elmark;`,
            `- Sistemi di fissaggio e sigillatura: ancoranti, fascette Surelock, schiume poliuretaniche e siliconi Penosil;`,
            `- Reparto elettrico e illuminazione: multiprese Omega, serie civile Mapam ${civilCompatNote} e LED Stellar.`,
          ].join('\n');

    case 'Rivendita_Edile':
      return [
        `- Elettrico da cantiere: quadri stagni IP65 Marlanvil ed Elmark, prese industriali CEE Omega e serie civile Mapam;`,
        `- Utensileria, taglio e posa: linea Kombo Pro 20V Brushless, dischi diamantati Elmark, fissaggio Surelock e chimico Penosil;`,
        `- Illuminazione LED: proiettori LED ad alta potenza, plafoniere stagne IP65 e sorgenti LED Stellar.`,
      ].join('\n');

    case 'Illuminazione':
      return [
        `- Illuminazione decorativa e architetturale: lampadari, sospensioni, faretti e sistemi a binario Elmark e Stellar;`,
        `- Sistemi lineari LED e outdoor: strip LED 24V con profili in alluminio, alimentatori slim e outdoor IP65 Stellar;`,
        `- Comandi coordinati e smart lighting: serie civile Mapam e moduli dimmer smart Proxe e Sonoff.`,
      ].join('\n');

    case 'Quadrista':
      return [
        `- Apparecchiature modulari e comando: magnetotermici, differenziali, scatolati, contattori e pulsanteria Elmark;`,
        `- Carpenteria e morsetteria: quadri e casse stagne IP65 Marlanvil ed Elmark, pressacavi IP68 e morsetteria Surelock;`,
        `- Illuminazione industriale: armature stagne, proiettori high-bay e corpi illuminanti LED Stellar.`,
      ].join('\n');

    case 'Impresa_Edile':
      return [
        `- Dotazioni elettriche di cantiere: quadri stagni IP65 e incasso Marlanvil, tubazione RK e prese CEE Omega;`,
        `- Serie civile per capitolati: serie civile Mapam ${civilCompatNote} e contenitori Idrobox IP55;`,
        `- Posa, fissaggio e luce: proiettori LED Stellar, fissaggio Surelock, sigillanti Penosil e utensili Kombo Pro 20V.`,
      ].join('\n');

    case 'Termoidraulica_Clima':
      return [
        `- Comando e protezione impianti: magnetotermici, differenziali, contattori HVAC e quadri IP65 Elmark e Marlanvil;`,
        `- Posa, fissaggio e sigillatura: staffaggio e fascette Surelock, schiume e sigillanti Penosil e utensili Kombo Pro 20V;`,
        `- Componentistica civile e LED: contenitori Idrobox IP55, serie civile Mapam ${civilCompatNote} e illuminazione Stellar.`,
      ].join('\n');

    case 'Fotovoltaico_Rinnovabili':
      return [
        `- Protezione impianti e solare: scaricatori SPD AC/DC, sezionatori, modulari e quadri IP65 Elmark e Marlanvil;`,
        `- Canalizzazione e fissaggio UV: tubazione RK, pressacavi IP68 Elmark, fascette UV Surelock e sigillanti Penosil;`,
        `- Efficienza LED e smart: corpi illuminanti e strip LED 24V Stellar, moduli Proxe/Sonoff e serie civile Mapam.`,
      ].join('\n');

    case 'Sicurezza_Automazione':
      return [
        `- Videosorveglianza e smart control: telecamere IP PoE, alimentatori DIN e moduli Wi-Fi/Zigbee Proxe e Sonoff;`,
        `- Contenitori stagni e protezione: cassette IP65, quadri Marlanvil ed Elmark, pressacavi IP68 e Idrobox IP55;`,
        `- Illuminazione perimetrale e posa: proiettori LED Stellar, serie civile Mapam, fissaggio Surelock e Kombo Pro 20V.`,
      ].join('\n');

    case 'Architetto_Ingegnere':
      return [
        `- Illuminotecnica architetturale: faretti da incasso, binari, pannelli UGR e strip LED 24V con profili Stellar ed Elmark;`,
        `- Punto luce coordinato: serie civile Mapam ${civilCompatNote} in vetro, metallo e tecnopolimero e comandi Proxe/Sonoff;`,
        `- Quadristica certificata CE: centralini rasomuro Marlanvil, protezioni modulari Elmark e outdoor IP65.`,
      ].join('\n');

    case 'Serramentista':
      return [
        `- Posa qualificata infissi: schiume poliuretaniche e siliconi neutri Penosil, ancoranti e fissaggio Surelock;`,
        `- Automazione e LED integrato: alimentatori slim, strip LED 24V Stellar, comandi Mapam e moduli Proxe/Sonoff;`,
        `- Elettroutensili da montaggio: avvitatori e trapani brushless Kombo Pro 20V, punte Elmark e prese Omega.`,
      ].join('\n');

    case 'Installatore_Civile':
    default:
      return [
        `- Serie civile e incasso: serie civile Mapam ${civilCompatNote}, Idrobox IP55, scatole e centralini IP65 Marlanvil;`,
        `- Protezione e posa: magnetotermici, differenziali${hasEvOrPv ? ', scaricatori SPD' : ''} e pressacavi IP68 Elmark, fissaggio Surelock;`,
        `- Illuminazione LED e smart: corpi illuminanti e strip LED 24V Stellar, moduli Proxe/Sonoff e telecamere IP PoE.`,
      ].join('\n');
  }
}

function buildStructuralSectorVariants(
  cluster: CanonicalB2BCluster,
  companyBodyShort: string,
  locAfterComp: string,
  civilBrandMatched: string | null,
  specializations: string[]
): {
  prodottiProsa: string;
  prodottiCompatti: string;
  prodottiMatriceReparti: string;
  scenarioMestiereSettore: string;
} {
  const compatProse = civilBrandMatched
    ? `compatibile con gli standard installativi ${civilBrandMatched}`
    : 'compatibile con i principali standard installativi del mercato';
  const hasEvOrPv = specializations.some((s) => /ricarica EV|fotovoltaic/i.test(s));

  switch (cluster) {
    case 'Ferramenta':
      return {
        prodottiProsa:
          'elettroutensili Kombo Pro 20V Brushless, abrasivi Elmark, fissaggio Surelock, schiume e sigillanti Penosil, multiprese Omega e sorgenti LED Stellar',
        prodottiCompatti:
          'elettroutensili Kombo Pro 20V, schiume e sigillanti Penosil, fissaggio Surelock e materiale elettrico da banco',
        prodottiMatriceReparti: [
          '- Elettroutensili e taglio: Kombo Pro 20V Brushless, dischi e punte Elmark',
          '- Fissaggio e chimico: fascette e ancoranti Surelock, schiume e sigillanti Penosil',
          '- Elettrico e LED da banco: multiprese Omega, serie civile Mapam e LED Stellar',
        ].join('\n'),
        scenarioMestiereSettore: `Al banco di una ferramenta come ${companyBodyShort}${locAfterComp}, trattare linee riservate alle Partite IVA e non inflazionate online permette di difendere un ricarico sano e continuativo.`,
      };

    case 'Rivendita_Edile':
      return {
        prodottiProsa:
          'quadri cantiere IP65 Marlanvil ed Elmark, prese CEE Omega, elettroutensili Kombo Pro 20V, dischi diamantati Elmark, fissaggio Surelock, sigillanti Penosil e proiettori LED Stellar',
        prodottiCompatti:
          'elettroutensili Kombo Pro 20V, dischi diamantati Elmark, chimico Penosil e quadri cantiere Marlanvil',
        prodottiMatriceReparti: [
          '- Elettrico da cantiere: quadri IP65 Marlanvil ed Elmark, prese CEE Omega',
          '- Utensileria e taglio: linea Kombo Pro 20V Brushless e dischi diamantati Elmark',
          '- Chimico, fissaggio e LED: sigillanti Penosil, fissaggio Surelock e proiettori Stellar',
        ].join('\n'),
        scenarioMestiereSettore: `Per una rivendita come ${companyBodyShort}${locAfterComp}, affiancare reparti ad alta rotazione di utensileria, chimico, fissaggio ed elettrico da cantiere alza subito il margine medio.`,
      };

    case 'Illuminazione':
      return {
        prodottiProsa: `sospensioni, faretti, sistemi a binario Stellar ed Elmark, strip LED 24V con profili in alluminio, outdoor IP65, dimmer smart Proxe/Sonoff e serie civile Mapam (${compatProse})`,
        prodottiCompatti:
          'corpi illuminanti, binari e strip LED 24V Stellar/Elmark e serie civile Mapam',
        prodottiMatriceReparti: [
          '- Decorativo e architetturale: sospensioni, faretti e sistemi a binario Stellar ed Elmark',
          '- Sistemi lineari e outdoor: strip LED 24V, profili in alluminio e IP65 Stellar',
          '- Punto luce e smart: serie civile Mapam e dimmer Wi-Fi/Zigbee Proxe e Sonoff',
        ].join('\n'),
        scenarioMestiereSettore: `Nelle forniture luce seguite da realtà come ${companyBodyShort}${locAfterComp}, abbinare collezioni decorative a linee LED ad alto margine rende ogni preventivo molto più competitivo.`,
      };

    case 'Quadrista':
      return {
        prodottiProsa:
          'magnetotermici, differenziali, scatolati, contattori e pulsanteria Elmark, carpenteria stagna IP65 Marlanvil, pressacavi IP68, morsetteria Surelock e armature LED Stellar',
        prodottiCompatti:
          'modulari DIN, scatolati e contattori Elmark, casse IP65 Marlanvil e morsetteria Surelock',
        prodottiMatriceReparti: [
          '- Protezione e manovra: modulari, scatolati, contattori e sezionatori Elmark',
          '- Carpenteria e morsetteria: casse e quadri IP65 Marlanvil, pressacavi IP68 e Surelock',
          '- Illuminazione industriale: armature stagne IP65 e proiettori LED Stellar',
        ].join('\n'),
        scenarioMestiereSettore: `Nell’assemblaggio quadri svolto da realtà come ${companyBodyShort}${locAfterComp}, prezzi netti diretti e pronta disponibilità su modulari, carpenteria IP65 e morsetteria incidono subito sul margine.`,
      };

    case 'Impresa_Edile':
      return {
        prodottiProsa: `quadri cantiere e incasso Marlanvil, prese CEE Omega, serie civile Mapam (${compatProse}), proiettori LED Stellar, sigillanti Penosil, fissaggio Surelock e utensili Kombo Pro 20V`,
        prodottiCompatti:
          'quadri cantiere Marlanvil, prese industriali Omega, proiettori LED Stellar e sigillanti Penosil',
        prodottiMatriceReparti: [
          '- Cantiere e incasso: quadri stagni IP65 e scatole Marlanvil, prese CEE Omega',
          '- Capitolati civili: serie civile Mapam e contenitori stagni Idrobox IP55',
          '- Posa, chimico e luce: proiettori LED Stellar, sigillanti Penosil e Kombo Pro 20V',
        ].join('\n'),
        scenarioMestiereSettore: `Nei cantieri seguiti da imprese come ${companyBodyShort}${locAfterComp}, accentrare su un unico fornitore dotazioni elettriche, LED, fissaggio e sigillanti taglia i costi di acquisto.`,
      };

    case 'Termoidraulica_Clima':
      return {
        prodottiProsa:
          'quadri IP65, magnetotermici, differenziali e contattori HVAC Elmark e Marlanvil, staffaggio e fascette Surelock, sigillanti Penosil ed elettroutensili Kombo Pro 20V',
        prodottiCompatti:
          'quadri IP65, contattori HVAC Elmark/Marlanvil, staffaggio Surelock e sigillanti Penosil',
        prodottiMatriceReparti: [
          '- Comando e protezione HVAC: quadri IP65, modulari e contattori Elmark e Marlanvil',
          '- Staffaggio e sigillatura: ancoranti e fascette Surelock, schiume e siliconi Penosil',
          '- Utensileria da cantiere: linea brushless Kombo Pro 20V, prese Omega e LED Stellar',
        ].join('\n'),
        scenarioMestiereSettore: `Nelle installazioni termoidrauliche curate da imprese come ${companyBodyShort}${locAfterComp}, acquistare a listino diretto quadri IP65, contattori, staffaggio e sigillanti riduce la spesa accessoria.`,
      };

    case 'Fotovoltaico_Rinnovabili':
      return {
        prodottiProsa:
          'scaricatori SPD AC/DC, sezionatori, modulari e quadri stagni IP65 Elmark e Marlanvil, tubazione RK, pressacavi IP68, fascette UV Surelock e sigillanti Penosil',
        prodottiCompatti:
          'scaricatori SPD AC/DC, quadri stagni IP65 Elmark/Marlanvil e fissaggio UV Surelock',
        prodottiMatriceReparti: [
          '- Protezione solare: scaricatori SPD AC/DC, sezionatori e quadri IP65 Elmark e Marlanvil',
          '- Posa esterna UV: tubazione RK, pressacavi IP68, fascette UV Surelock e chimico Penosil',
          '- Relamping LED e smart: corpi illuminanti Stellar e moduli smart Proxe e Sonoff',
        ].join('\n'),
        scenarioMestiereSettore: `Nei cantieri fotovoltaici seguiti da aziende come ${companyBodyShort}${locAfterComp}, avere subito pronti a magazzino scaricatori SPD, quadri IP65 e fissaggio UV tutela tempi e margini.`,
      };

    case 'Sicurezza_Automazione':
      return {
        prodottiProsa: `telecamere IP PoE, alimentatori DIN, moduli smart Proxe/Sonoff, cassette IP65 Marlanvil ed Elmark, proiettori LED Stellar, serie civile Mapam (${compatProse}) e fissaggio Surelock`,
        prodottiCompatti:
          'telecamere IP PoE, cassette stagne IP65 Marlanvil/Elmark e moduli smart Proxe/Sonoff',
        prodottiMatriceReparti: [
          '- TVCC e smart control: telecamere IP PoE, alimentatori DIN e moduli Proxe e Sonoff',
          '- Contenitori stagni: cassette IP65 e quadri Marlanvil ed Elmark, pressacavi IP68',
          '- Perimetrale e posa: proiettori LED Stellar, fissaggio Surelock e Kombo Pro 20V',
        ].join('\n'),
        scenarioMestiereSettore: `Negli impianti di sicurezza realizzati da ${/^(?:la|il)\s+(?:vostra|vostro|sua|suo)$/.test(companyBodyShort) ? 'realtà' : 'specialisti'} come ${companyBodyShort}${locAfterComp}, comprare a listino diretto apparati PoE, scatole IP65 e moduli smart abbassa il costo di commessa.`,
      };

    case 'Architetto_Ingegnere':
      return {
        prodottiProsa: `corpi illuminanti architetturali, pannelli UGR, binari e strip LED 24V con profili Stellar ed Elmark, serie civile Mapam (${compatProse}) e quadristica CE Marlanvil`,
        prodottiCompatti:
          'illuminazione architetturale, strip LED 24V Stellar, serie civile Mapam e quadristica CE',
        prodottiMatriceReparti: [
          '- Illuminotecnica: faretti, binari, pannelli UGR e strip LED 24V Stellar ed Elmark',
          '- Punto luce coordinato: serie civile Mapam e comandi smart Proxe e Sonoff',
          '- Quadristica CE: centralini rasomuro Marlanvil e protezioni modulari Elmark',
        ].join('\n'),
        scenarioMestiereSettore: `Nei progetti seguiti da studi come ${companyBodyShort}${locAfterComp}, unire resa illuminotecnica, coordinamento dei punti luce e tenuta del computo metrico è più semplice con listini trasparenti.`,
      };

    case 'Serramentista':
      return {
        prodottiProsa:
          'schiume poliuretaniche e siliconi neutri Penosil, ancoranti e fissaggio Surelock, elettroutensili brushless Kombo Pro 20V, punte Elmark e profili strip LED 24V Stellar',
        prodottiCompatti:
          'schiume e siliconi neutri Penosil, fissaggio Surelock ed elettroutensili Kombo Pro 20V',
        prodottiMatriceReparti: [
          '- Sigillatura e posa: schiume poliuretaniche e siliconi neutri Penosil, fissaggio Surelock',
          '- Officina e montaggio: avvitatori e trapani Kombo Pro 20V, dischi e punte Elmark',
          '- LED integrato: strip LED 24V e profili in alluminio Stellar, comandi Mapam',
        ].join('\n'),
        scenarioMestiereSettore: `Nella posa serramenti curata da aziende come ${companyBodyShort}${locAfterComp}, avere prezzi all’ingrosso su schiume, siliconi neutri, fissaggio e utensili 20V riduce subito i costi di montaggio.`,
      };

    case 'Installatore_Civile':
    default:
      return {
        prodottiProsa: `serie civile Mapam (${compatProse}), contenitori Idrobox IP55, scatole e centralini stagni Marlanvil, protezioni modulari${hasEvOrPv ? ' e SPD' : ''} Elmark, illuminazione LED Stellar e fissaggio Surelock`,
        prodottiCompatti: `serie civile Mapam compatibile ${civilBrandMatched || 'BTicino/Vimar'}, quadri stagni Marlanvil e modulari Elmark`,
        prodottiMatriceReparti: [
          `- Civile e incasso: Mapam (${compatProse}), Idrobox IP55 e centralini Marlanvil`,
          `- Quadro e posa: modulari DIN${hasEvOrPv ? ', SPD' : ''} e pressacavi IP68 Elmark, fissaggio Surelock`,
          '- Luce e smart: corpi illuminanti e strip LED 24V Stellar, moduli smart Proxe e Sonoff',
        ].join('\n'),
        scenarioMestiereSettore: `Negli impianti elettrici curati da ditte come ${companyBodyShort}${locAfterComp}, affiancare una filiera corta su serie civile compatibile, quadristica e LED difende bene il margine operativo.`,
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
  const provinceClean = String(input.province || '').trim().toUpperCase();
  // Città sanificata: zone industriali, vie, frazioni e sigle A.S.I./P.I.P. ricadono su "sul territorio" (#179 punto 4)
  const cityClean = sanitizeProspectCity(input.city, provinceClean);

  const companyClean = cleanCompanyDisplayName(input.companyName, vatOfficialName, cityClean);

  const decisionMakerClean = extractVerifiedDecisionMaker(
    input.decisionMaker || meta.decision_maker || null,
    input.companyName,
    vatOfficialName,
    cityClean
  );
  const isDirectPerson = Boolean(decisionMakerClean);

  const specificForms = buildCompanyBodyForms(input.companyName, vatOfficialName, cityClean);
  const rawHasRegisteredLegalForm =
    /(?:^|\s)(?:s\.?\s*r\.?\s*l\.?\s*s?\.?|s\.?\s*p\.?\s*a\.?|s\.?\s*n\.?\s*c\.?|s\.?\s*a\.?\s*s\.?)(?=\s|$)/i.test(
      String(input.companyName || '')
    );
  const isGenericCompanyName = isGenericOnlyCompanyName(
    specificForms.companyShortSubject,
    rawHasRegisteredLegalForm ? null : cityClean
  );
  const genericForms = isGenericCompanyName
    ? buildGenericCompanyFallbackForms(isDirectPerson, cluster)
    : null;
  const companyShortSubject = genericForms
    ? genericForms.companyShortSubject
    : specificForms.companyShortSubject;
  const companyBodyShort = genericForms ? genericForms.companyBodyShort : specificForms.companyBodyShort;
  const compRefDi = genericForms ? genericForms.compRefDi : specificForms.compRefDi;
  const companyPossessiveRef = genericForms ? genericForms.companyPossessiveRef : companyBodyShort;

  const domainClean = extractCleanDomain(input.website || meta.website || null);

  const areaLabel = cityClean
    ? provinceClean && provinceClean.length === 2 && provinceClean !== 'IT'
      ? `${cityClean} (${provinceClean})`
      : startsWithItalianArticle(cityClean)
        ? `in zona ${cityClean}`
        : `l’area di ${cityClean}`
    : 'il territorio nazionale';

  const locPhrase = cityClean
    ? startsWithItalianArticle(cityClean)
      ? `in zona ${cityClean}`
      : `su ${cityClean}`
    : 'sul territorio';

  const companyIncludesCity = doesCompanyIncludeCity(companyBodyShort, cityClean);
  const locPhraseAfterCompany = companyIncludesCity ? '' : locPhrase;
  const locAfterCompSpace = locPhraseAfterCompany ? ` ${locPhraseAfterCompany}` : '';
  const locSpace = ` ${locPhrase}`;

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

  const salutoModerno = buildSalutoModerno(decisionMakerClean, pickIndexFn);
  const salutoPersonalizzato = salutoModerno;
  const salutoUmano1a1 = salutoModerno;
  const intestazioneOggetto = companyShortSubject;

  const microPresentazioneIzzo = buildMicroPresentazioneIzzo(
    cluster,
    `${companyClean} ${companyBodyShort}`,
    compRefDi,
    pickIndexFn
  );
  const prodottiMiratiBrevi = buildProdottiMiratiBrevi(cluster, civilBrandMatched);

  const historicalAdj = foundationYear ? ' storica' : '';
  const targetSectorComp = resolveAntiEchoSectorShort(
    cluster,
    sectorInfo.sectorShortPlural,
    `${companyShortSubject} ${companyBodyShort}`
  );

  // Frase di aggancio breve e domanda finale breve: zero doppi determinanti, zero "lavoro", zero collisioni P1/P2/P3
  let fraseAggancioBreve: string;
  let domandaFinaleBreve: string;

  if (isDirectPerson) {
    const hookOptionsLei = domainClean
      ? [
          `Visitando il sito ${compRefDi} ho visto l’attività svolta${locAfterCompSpace} e le scrivo perché serviamo ${targetSectorComp}`,
          `Ho visto online l’attività${historicalAdj} ${compRefDi}${locAfterCompSpace} e le scrivo perché affianchiamo ${targetSectorComp}`,
          `Consultando online il profilo ${compRefDi}${locAfterCompSpace}, le scrivo perché supportiamo ${targetSectorComp}`,
          `Guardando il sito ${compRefDi} ho visto l’attività svolta${locAfterCompSpace} e le scrivo perché seguiamo ${targetSectorComp}`,
        ]
      : [
          `Ho visto l’attività${historicalAdj} ${compRefDi}${locAfterCompSpace} e le scrivo perché serviamo ${targetSectorComp}`,
          `Conoscendo l’attività${historicalAdj} ${compRefDi}${locAfterCompSpace}, le scrivo perché affianchiamo ${targetSectorComp}`,
          `Seguendo da vicino l’attività ${compRefDi}${locAfterCompSpace}, le scrivo perché supportiamo ${targetSectorComp}`,
          `Avendo presente il profilo ${compRefDi}${locAfterCompSpace}, le scrivo perché seguiamo ${targetSectorComp}`,
        ];
    fraseAggancioBreve = hookOptionsLei[pickIndexFn(hookOptionsLei.length)];

    const ctaOptionsLei = [
      'Le fa comodo se le giro qui un estratto illustrativo delle referenze per un confronto?',
      'Le fa piacere se le invio qui un riepilogo illustrativo delle referenze per uno sguardo?',
      'Le può far comodo ricevere qui una scheda sintetica delle referenze per farsi un’idea?',
      'Se le fa piacere, posso girarle qui un riepilogo sintetico delle referenze per una valutazione?',
      'Vuole che le invii qui in risposta un riepilogo delle referenze per un riscontro?',
      'Le torna utile se le mando qui una scheda riepilogativa delle referenze per un’occhiata?',
    ];
    domandaFinaleBreve = ctaOptionsLei[pickIndexFn(ctaOptionsLei.length)];
  } else {
    const hookOptionsVoi = domainClean
      ? [
          `Consultando il vostro sito ho visto le attività che seguite${locSpace} e vi scrivo perché serviamo ${targetSectorComp}`,
          `Ho visto online la vostra attività${historicalAdj}${locSpace} e vi scrivo perché affianchiamo ${targetSectorComp}`,
          `Guardando online il profilo ${compRefDi}${locAfterCompSpace}, vi scrivo perché supportiamo ${targetSectorComp}`,
          `Visitando il sito ${compRefDi} ho visto l’attività svolta${locAfterCompSpace} e vi scrivo perché seguiamo ${targetSectorComp}`,
        ]
      : [
          `Ho visto la vostra attività${historicalAdj}${locSpace} e vi scrivo perché serviamo ${targetSectorComp}`,
          `Conoscendo l’attività${historicalAdj} ${compRefDi}${locAfterCompSpace}, vi scrivo perché affianchiamo ${targetSectorComp}`,
          `Seguendo da vicino la vostra attività${locSpace}, vi scrivo perché supportiamo ${targetSectorComp}`,
          `Avendo presente il profilo ${compRefDi}${locAfterCompSpace}, vi scrivo perché seguiamo ${targetSectorComp}`,
        ];
    fraseAggancioBreve = hookOptionsVoi[pickIndexFn(hookOptionsVoi.length)];

    const ctaOptionsVoi = [
      'Vi fa comodo se vi giro qui un estratto illustrativo delle referenze per un confronto?',
      'Vi fa piacere se vi invio qui un riepilogo illustrativo delle referenze per uno sguardo?',
      'Vi può far comodo ricevere qui una scheda sintetica delle referenze per farvi un’idea?',
      'Se vi fa piacere, posso girarvi qui un riepilogo sintetico delle referenze per una valutazione?',
      'Volete che vi invii qui in risposta un riepilogo delle referenze per un riscontro?',
      'Vi torna utile se vi mando qui una scheda riepilogativa delle referenze per un’occhiata?',
    ];
    domandaFinaleBreve = ctaOptionsVoi[pickIndexFn(ctaOptionsVoi.length)];
  }

  if (/\bserviz/i.test(`${companyShortSubject} ${companyBodyShort}`)) {
    fraseAggancioBreve = fraseAggancioBreve.replace(/\bserviamo\b/g, 'affianchiamo');
  }

  const fraseContestoDb = `${fraseAggancioBreve}.`;
  const incisoContestoDb = isDirectPerson
    ? `avendo visto l’attività ${compRefDi}${locAfterCompSpace} nel comparto ${sectorInfo.sectorNoun}`
    : `avendo visto la vostra attività${locSpace} nel comparto ${sectorInfo.sectorNoun}`;

  const contestoTerritorioFallback = isDirectPerson
    ? `Seguendo ${sectorInfo.sectorShortPlural}${locSpace}, le scrivo per farle conoscere Izzo Distribuzione S.r.l.`
    : `Seguendo ${sectorInfo.sectorShortPlural}${locSpace}, vi scrivo per farvi conoscere Izzo Distribuzione S.r.l.`;

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
    companyPossessiveRef,
    locAfterCompSpace,
    civilBrandMatched,
    specializations
  );

  return {
    companyClean,
    companyShortSubject,
    companyBodyShort,
    compRefDi,
    locPhrase,
    locPhraseAfterCompany,
    decisionMakerClean,
    isDirectPerson,
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
    salutoModerno,
    salutoPersonalizzato,
    salutoUmano1a1,
    intestazioneOggetto,
    microPresentazioneIzzo,
    prodottiMiratiBrevi,
    fraseAggancioBreve,
    domandaFinaleBreve,
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
    isGenericCompanyName,
    companyPossessiveRef,
  };
}
