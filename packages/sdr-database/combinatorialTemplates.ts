export type HtmlLayoutVariant =
  | 'executive_card'
  | 'plain_personal'
  | 'compact_memo'
  | 'accent_stripe'
  | 'clean_table';

export interface SeedEmailTemplate {
  code: string;
  name: string;
  angleGroup: string;
  targetCategory: 'ALL' | 'IST' | 'RIV';
  htmlLayoutVariant: HtmlLayoutVariant;
  subjectTemplate: string;
  bodyTemplate: string;
}

/**
 * 100 Email Madri Universali Izzo Distribuzione S.r.l. (T001 - T100) — STEP 1: Contatto Umano Puro.
 * Regola Anti-Spam Tassativa Step 1:
 * - ZERO link cliccabili (http://, https://, <a href>) nel corpo e nella firma
 * - ZERO parola "Password" o "Username" e zero credenziali in chiaro
 * - ZERO tabelle, riquadri o bottoni HTML (stile mail scritta a mano da Outlook)
 * - Chiusura naturale che invita a rispondere con un cenno per ricevere l'estratto listino netto riservato
 *   e l'accesso gratuito di consultazione (sconto di benvenuto 40%+10% / 50%+10% sul 1° ordine eventuale).
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  // ==========================================================================
  // FAMIGLIA 01 (T001-T005) — PROSA PURA DISCORSIVA
  // ==========================================================================
  {
    code: 'T001',
    name: 'F01.1 Prosa Pura — Presentazione Diretta & Marchi nel Testo',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} [VERBO_CONTATTARE] Izzo Distribuzione S.r.l. quale fornitore B2B alternativo {SCOPO_FORNITURA_SETTORE}, con disponibilità continuativa su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[FRASE_DISPONIBILITA] [COME_RISPONDERE] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T002',
    name: 'F01.2 Prosa Pura — Taglio Istituzionale & Filiera Diretta',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture all’ingrosso B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n[VERBO_CONTATTARE] Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}. Operiamo su tutto il territorio nazionale distribuendo agli operatori con Partita IVA {PRODOTTI_PROSA}, tutti [CONFORMITA_QUALITA].\n\n{INVITO_RISPOSTA_PROSA}\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T003',
    name: 'F01.3 Prosa Pura — Ufficio Acquisti & Documentazione CE',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo la struttura B2B di Izzo Distribuzione S.r.l. quale canale complementare di approvvigionamento su {PRODOTTI_PROSA}, [COPERTURA_ITALIA].\n\n{INVITO_RISPOSTA_PROSA}\n\nPer distinte materiali o forniture programmate elaboriamo inoltre quotazioni dedicate su richiesta diretta.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T004',
    name: 'F01.4 Prosa Pura — Accentramento Acquisti & Zero Formalità',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Canale di fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nin qualità di [QUALIFICA_DISTRIBUTORE], contattiamo la Vostra struttura {INCISO_CONTESTO_DB} per proporre un unico riferimento all’ingrosso su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T005',
    name: 'F01.5 Prosa Pura — Confronto Libero Prezzi Netti',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino riservato Partite IVA per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Il catalogo riservato agli operatori B2B di Izzo Distribuzione S.r.l. affianca condizioni all’ingrosso trasparenti e pronta disponibilità su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 02 (T006-T010) — NOTA FLASH ESECUTIVA BREVE
  // ==========================================================================
  {
    code: 'T006',
    name: 'F02.1 Nota Flash — Riferimenti Diretti in 6 Righe',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo il canale B2B diretto di Izzo Distribuzione S.r.l. su {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] anche su singola commessa. [SALUTO_CHIUSURA]',
  },
  {
    code: 'T007',
    name: 'F02.2 Nota Flash — Sintesi Ufficio Acquisti',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\noperando {INCISO_CONTESTO_DB}, presentiamo Izzo Distribuzione S.r.l. {SCOPO_FORNITURA_SETTORE} ({PRODOTTI_COMPATTI}).\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T008',
    name: 'F02.3 Nota Flash — Ingrosso & Colli Frazionati',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Izzo Distribuzione S.r.l. distribuisce direttamente a listino B2B {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T009',
    name: 'F02.4 Nota Flash — Essenziale Direzione Aziendale',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nota conoscitiva B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nsegnaliamo il canale B2B diretto di Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}, con pronta disponibilità su {PRODOTTI_COMPATTI}.\n\nSe desiderate verificare senza vincoli i nostri prezzi netti ({DISCOUNT_FORMULA} a cascata sul primo ordine eventuale, zero minimo), rispondete pure con un cenno a questa mail e Vi inviamo subito l’estratto listino riservato e l’accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T010',
    name: 'F02.5 Nota Flash — Verifica Rapida Prezzi & Stock',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto listini B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Attraverso la divisione all’ingrosso di Izzo Distribuzione S.r.l. trattiamo {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] per preventivi su distinta. [SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 03 (T011-T015) — PRIMA PERSONA DANIELE SAVOIA (1-A-1)
  // ==========================================================================
  {
    code: 'T011',
    name: 'F03.1 Prima Persona — Daniele Savoia Diretto + Distinta WhatsApp',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Contatto diretto B2B per {COMPANY_NAME} — {AGENT_NAME} (Izzo Distribuzione)',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME} e seguo lo sviluppo commerciale B2B di Izzo Distribuzione S.r.l. Vi scrivo direttamente {INCISO_CONTESTO_DB}, per metterVi a disposizione un canale di fornitura alternativo, snello e senza filtri intermedi su {PRODOTTI_PROSA}.\n\nSe può esserVi utile per un confronto prezzi rispetto agli attuali fornitori, rispondete pure con un cenno a questa mail e Vi trasmetto qui l’estratto del nostro listino netto riservato insieme a un accesso gratuito di consultazione, con sconto di benvenuto {DISCOUNT_FORMULA} a cascata sul primo ordine eventuale ([ZERO_MINIMO_ORDINE]).\n\nSe invece preferite mettermi alla prova su una lista materiali in corso, potete girarmela direttamente in risposta o su WhatsApp al numero in firma.\n\nBuon lavoro e cordiali saluti,',
  },
  {
    code: 'T012',
    name: 'F03.2 Prima Persona — Filo Diretto Referente B2B in Prosa',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Referente diretto B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nmi chiamo {AGENT_NAME} e sono il referente B2B di Izzo Distribuzione S.r.l. {FRASE_CONTESTO_DB} Vi contatto personalmente per presentarVi la nostra distribuzione diretta su {PRODOTTI_COMPATTI}, tutti [CONFORMITA_QUALITA].\n\nQualora vogliate dare uno sguardo senza alcun impegno ai nostri netti ({CONDIZIONE_BREVE}), basta rispondere anche con un breve «Sì» a questa mail e Vi invio subito il prospetto PDF riservato con l’abilitazione gratuita di sola lettura.\n\nResto raggiungibile direttamente per telefono o WhatsApp al {AGENT_PHONE} {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T013',
    name: 'F03.3 Prima Persona — Presentazione Personale Senza Call Center',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Filo diretto forniture B2B per {COMPANY_NAME} — {AGENT_NAME}',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nVi scrivo da Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}. Seguo personalmente i clienti professionali B2B e vorrei sottoporre la nostra realtà alla Vostra valutazione come fornitore integrativo su {PRODOTTI_PROSA}.\n\nSe Vi fa piacere ricevere l’estratto del nostro listino netto riservato e un accesso conoscitivo gratuito al portale (già allineato allo sconto {DISCOUNT_FORMULA} sul primo eventuale ordine e zero minimo d’acquisto), rispondete pure con un cenno a questa mail. Se avete anche una distinta articoli da confrontare, inviatemela qui e Vi rispondo personalmente con quotazione dedicata.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T014',
    name: 'F03.4 Prima Persona — Taglio Pratico per Risparmio Acquisti',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture B2B e riferimento diretto per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME}, referente commerciale di Izzo Distribuzione S.r.l. {FRASE_CONTESTO_DB} Vi scrivo per presentarVi una soluzione pratica con cui molte aziende del settore riducono i costi d’acquisto su {PRODOTTI_COMPATTI}.\n\nSe può interessarVi controllare liberamente i prezzi netti riservati alla Vostra categoria ({DISCOUNT_FORMULA} a cascata sul primo eventuale acquisto, [ZERO_MINIMO_ORDINE]), rispondete pure con un cenno a questa mail e Vi giro subito l’estratto PDF del catalistino insieme a un profilo gratuito di sola consultazione.\n\nPer qualsiasi esigenza resto a Vostra diretta disposizione ai contatti sotto indicati.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T015',
    name: 'F03.5 Prima Persona — Riferimento Tecnico-Commerciale Dedicato',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione commerciale B2B — {AGENT_NAME} per {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nmi presento brevemente: sono {AGENT_NAME} dell’ufficio commerciale B2B di Izzo Distribuzione S.r.l. Conoscendo il Vostro ambito operativo {INCISO_CONTESTO_DB}, desidero lasciarVi il mio riferimento diretto per le forniture di {PRODOTTI_COMPATTI}.\n\nA titolo puramente conoscitivo, se rispondete con un cenno a questa comunicazione Vi trasmetto qui il prospetto PDF riservato a {COMPANY_NAME} e l’accesso gratuito di consultazione già valorizzati con {CONDIZIONE_BREVE}.\n\nPer preventivi fuori standard, campionature o verifiche di disponibilità potete chiamarmi o scrivermi direttamente.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 04 (T016-T020) — STRUTTURA CON P.S. FINALE
  // ==========================================================================
  {
    code: 'T016',
    name: 'F04.1 Struttura P.S. — Corpo Tecnico Pulito + Invito nel Post-Scriptum',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione Izzo Distribuzione S.r.l. — Forniture B2B per {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB}\n\nSottoponiamo alla Vostra valutazione Izzo Distribuzione S.r.l. quale fornitore strutturato {SCOPO_FORNITURA_SETTORE}: distribuiamo su scala nazionale {PRODOTTI_PROSA}.\n\nOperiamo [COPERTURA_ITALIA], con gestione flessibile senza minimi d’ordine e ufficio commerciale diretto per quotazioni su specifica distinta di commessa.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },
  {
    code: 'T017',
    name: 'F04.2 Struttura P.S. — Taglio Marginalità & Assortimento + P.S.',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Distribuzione B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n[VERBO_CONTATTARE] Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}, presentandoci come partner all’ingrosso [FILOSOFIA_OPERATIVA].\n\nIl nostro modello distributivo punta a tutelare la marginalità operativa su famiglie complementari ad alta rotazione: {PRODOTTI_PROSA}.\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },
  {
    code: 'T018',
    name: 'F04.3 Struttura P.S. — Focus Continuità Stock & Preventivi + P.S.',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] — Alla c.a. di {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Desideriamo sottoporre Izzo Distribuzione S.r.l. quale canale B2B per l’approvvigionamento rapido di {PRODOTTI_COMPATTI}, tutti [CONFORMITA_QUALITA].\n\nPer commesse specifiche potete trasmetterci in risposta la distinta materiali per ricevere un’offerta dedicata dal nostro ufficio tecnico-commerciale.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },
  {
    code: 'T019',
    name: 'F04.4 Struttura P.S. — Unico Fornitore Multi-Famiglia + P.S.',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitura tecnica all’ingrosso per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo il Vostro profilo operativo {INCISO_CONTESTO_DB}, Vi contattiamo da Izzo Distribuzione S.r.l. per proporre una linea di approvvigionamento diretto sui materiali di consumo ricorrente.\n\nCon un unico interlocutore B2B copriamo {PRODOTTI_PROSA}, [DESTINAZIONE_FLESSIBILE]. Restiamo a Vostro riferimento per concordare quotazioni su forniture programmate.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },
  {
    code: 'T020',
    name: 'F04.5 Struttura P.S. — Razionalizzazione Acquisti + P.S.',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Accentramento forniture B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB}\n\nAffianchiamo le realtà strutturate con listini d’ingrosso trasparenti su {PRODOTTI_COMPATTI}, coniugando [CURA_IMBALLO] e referente commerciale unico. Per ogni approfondimento o valorizzazione di capitolati potete fare riferimento ai recapiti sottostanti.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },

  // ==========================================================================
  // FAMIGLIA 05 (T021-T025) — SINTESI QUALIFICA ALBO FORNITORI (TESTO PURO)
  // ==========================================================================
  {
    code: 'T021',
    name: 'F05.1 Qualifica Albo Fornitori — Sintesi Ufficio Acquisti',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Qualifica fornitore B2B — Alla c.a. Ufficio Acquisti {COMPANY_NAME}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\ntrasmettiamo una sintetica nota di presentazione di Izzo Distribuzione S.r.l. per l’eventuale inserimento nel Vostro albo fornitori B2B, {INCISO_CONTESTO_DB}.\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T022',
    name: 'F05.2 Qualifica Albo Fornitori — Accreditamento Fornitore all’Ingrosso',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Accreditamento fornitore all’ingrosso — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Sottoponiamo i riferimenti societari e commerciali di Izzo Distribuzione S.r.l. per una valutazione quale fornitore all’ingrosso {SCOPO_FORNITURA_SETTORE}:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T023',
    name: 'F05.3 Qualifica Albo Fornitori — Sintesi Direzione & Gare',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Prospetto accreditamento fornitore B2B — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, inviamo il riepilogo operativo di Izzo Distribuzione S.r.l. ai fini delle Vostre valutazioni fornitori:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n{INVITO_RISPOSTA_FLASH} [AIUTO_PRIMA_LISTA].\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T024',
    name: 'F05.4 Qualifica Albo Fornitori — Nota Tecnica di Qualifica',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nota qualifica fornitore per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Per agevolare un’eventuale verifica da parte del Vostro ufficio acquisti, riepiloghiamo i nostri riferimenti operativi:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T025',
    name: 'F05.5 Qualifica Albo Fornitori — Riepilogo Parametri Commerciali B2B',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti fornitore B2B Izzo Distribuzione S.r.l. — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nsottoponiamo i parametri essenziali di Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}, restando a disposizione per una verifica libera e gratuita dei nostri listini netti:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 06 (T026-T030) — APERTURA DIRETTA SULLA CONDIZIONE RISERVATA
  // ==========================================================================
  {
    code: 'T026',
    name: 'F06.1 Apertura Diretta — Condizione Benvenuto in Testa + Profilo Izzo',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta confronto listino B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nper consentire al Vostro ufficio acquisti di confrontare prezzi netti e disponibilità reali senza alcun impegno commerciale, abbiamo previsto per i nuovi interlocutori B2B una condizione di benvenuto pari a {CONDIZIONE_BREVE}.\n\nVi scriviamo da Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}. Distribuiamo su scala nazionale {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T027',
    name: 'F06.2 Apertura Diretta — Fascia Sconto in Apertura + Gamma Settore',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizione listino B2B ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nqualora voleste confrontare in autonomia i nostri prezzi d’ingrosso ({CONDIZIONE_BREVE}), siamo disponibili a trasmetterVi su semplice richiesta l’estratto del nostro listino riservato alle Partite IVA.\n\nSiamo Izzo Distribuzione S.r.l. e, {INCISO_CONTESTO_DB}, supportiamo gli operatori professionali fornendo direttamente {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T028',
    name: 'F06.3 Apertura Diretta — Consultazione Sola Lettura + Copertura Tecnica',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione catalogo B2B per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nmettiamo a disposizione degli uffici tecnico-acquisti del settore la possibilità di consultare liberamente il nostro listino B2B riservato, valorizzato con {CONDIZIONE_BREVE} e privo di qualsiasi vincolo.\n\nIzzo Distribuzione S.r.l. affianca in tutta Italia le strutture del Vostro comparto — {INCISO_CONTESTO_DB} — fornendo {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T029',
    name: 'F06.4 Apertura Diretta — Parametri Netti + Presentazione Sobria',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino netto B2B riservato per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\ncontattiamo la Vostra struttura {INCISO_CONTESTO_DB} per presentare Izzo Distribuzione S.r.l. quale fornitore diretto {SCOPO_FORNITURA_SETTORE}, con copertura continuativa su {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T030',
    name: 'F06.5 Apertura Diretta — Confronto Diretto Netti + Preventivi',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto listino ingrosso {DISCOUNT_FORMULA} — {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Izzo Distribuzione S.r.l. si propone quale partner distributivo su {PRODOTTI_PROSA}, riservando ai nuovi partner B2B {CONDIZIONE_BREVE}.\n\n{INVITO_RISPOSTA_FLASH} [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 07 (T031-T035) — RFQ-FIRST (QUOTAZIONE SU COMPUTO O DISTINTA)
  // ==========================================================================
  {
    code: 'T031',
    name: 'F07.1 RFQ-First — Quotazione di Confronto su Computo o Distinta',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Disponibilità quotazioni su computo e distinta materiali — {COMPANY_NAME}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nqualora abbiate in fase di analisi una distinta materiali o un computo metrico — {INCISO_CONTESTO_DB} — l’ufficio commerciale di Izzo Distribuzione S.r.l. è disponibile a sottoporVi senza impegno una quotazione netta di confronto in tempi rapidi.\n\nOperiamo come distributori B2B diretti su {PRODOTTI_PROSA}, garantendo schede tecniche complete per capitolati e dichiarazioni di conformità.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T032',
    name: 'F07.2 RFQ-First — Invio Lista via Email o WhatsApp + Estratto Listino',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazione di confronto su distinta articoli — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Vi proponiamo una modalità estremamente concreta per valutare Izzo Distribuzione S.r.l. come fornitore: potete inviarci in risposta — o via WhatsApp al {AGENT_PHONE} — un elenco tipo di materiali per ricevere una valorizzazione netta riservata.\n\nTrattiamo in pronta disponibilità {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T033',
    name: 'F07.3 RFQ-First — Preventivi Commessa con Resa su Cantiere',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Preventivi forniture B2B e capitolati per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, mettiamo a disposizione della Vostra azienda il nostro ufficio commerciale per quotare forniture complete o parziali di commessa, [DESTINAZIONE_FLESSIBILE].\n\nCon Izzo Distribuzione S.r.l. copriamo internamente {PRODOTTI_PROSA}.\n\nOltre alla possibilità di richiederci un preventivo su lista materiali, se rispondete con un cenno a questa mail Vi trasmettiamo subito l’estratto del listino netto riservato insieme a un accesso gratuito di consultazione ({CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T034',
    name: 'F07.4 RFQ-First — Supporto Tecnico-Economico su Capitolati',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Supporto capitolati e quotazioni B2B — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Segnaliamo la disponibilità dell’ufficio tecnico-commerciale di Izzo Distribuzione S.r.l. a fornire schede tecniche, equivalenze prestazionali e quotazioni B2B di riferimento per le Vostre commesse su {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T035',
    name: 'F07.5 RFQ-First — Test Operativo su Lista Riassortimento',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta di confronto su lista materiali — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nconoscendo il taglio professionale della Vostra struttura {INCISO_CONTESTO_DB}, Vi invitiamo a mettere alla prova Izzo Distribuzione S.r.l. anche su una semplice lista di articoli ad alta rotazione: elaboriamo quotazioni dedicate sia su colli frazionati sia su forniture a volume per {PRODOTTI_COMPATTI}.\n\nQualora preferiste esaminare prima il nostro listino netto generale ({CONDIZIONE_BREVE}), basta rispondere con un cenno a questa comunicazione e Vi inviamo qui il prospetto PDF riservato e l’accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 08 (T036-T040) — FLUSSO IN TRE PUNTI DISCORSIVI
  // ==========================================================================
  {
    code: 'T036',
    name: 'F08.1 Flusso 1-2-3 — Gamma, Condizioni e Confronto Netti',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta operativa di fornitura B2B per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo in tre punti concreti come Izzo Distribuzione S.r.l. può affiancare i Vostri approvvigionamenti:\n\n1. Gamma tecnica trattata: forniamo direttamente {PRODOTTI_COMPATTI}, completi di marcatura CE e schede tecniche.\n2. Gestione commesse e condizioni: {CONDIZIONE_BREVE}, [TEMPI_RESA] e referente diretto per quotazioni su distinta materiali.\n3. Confronto prezzi senza impegno: rispondendo anche con un semplice cenno a questa mail Vi trasmettiamo l’estratto del listino netto riservato e un accesso gratuito di sola consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T037',
    name: 'F08.2 Flusso 1-2-3 — Sintesi Tecnica per Direzione & Acquisti',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] — Tre punti operativi per {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sintetizziamo in tre passaggi l’offerta B2B di Izzo Distribuzione S.r.l.:\n\n1. Unico fornitore multi-reparto: {PRODOTTI_PROSA}.\n2. Condizione d’ingresso trasparente: {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\n3. Invio listino su semplice richiesta: basta rispondere a questa email per ricevere qui il prospetto PDF coi prezzi netti di categoria e l’abilitazione gratuita di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T038',
    name: 'F08.3 Flusso 1-2-3 — Prodotti, Elasticità Ordini e Verifica',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\npresentiamo in modo diretto il servizio all’ingrosso di Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}:\n\n1) Linee ad alta rotazione: {PRODOTTI_COMPATTI}.\n2) Massima elasticità negli acquisti: [VANTAGGIO_ZERO_SCORTE], con {CONDIZIONE_BREVE}.\n3) Verifica libera dei netti: se può esserVi utile, rispondete pure con un cenno a questa mail e Vi inviamo subito l’estratto PDF del catalistino e l’accesso conoscitivo gratuito.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T039',
    name: 'F08.4 Flusso 1-2-3 — Schema Esecutivo per Valutazione Fornitore',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Schema fornitura tecnica B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Riassumiamo in tre punti la proposta di fornitura diretta di Izzo Distribuzione S.r.l.:\n\nPunto 1 — Dotazioni e marchi: {PRODOTTI_COMPATTI}.\nPunto 2 — Condizioni applicate: {CONDIZIONE_BREVE} e referente commerciale diretto {CHIUSURA_SETTORE}.\nPunto 3 — Listino riservato: rispondendo con un breve cenno alla presente Vi giriamo qui l’estratto del listino netto in PDF insieme a un accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T040',
    name: 'F08.5 Flusso 1-2-3 — Copertura Tecnica, Condizioni e Preventivi',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti operativi B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo il Vostro ambito di attività {INCISO_CONTESTO_DB}, sottoponiamo Izzo Distribuzione S.r.l. attraverso tre elementi operativi:\n\n1. Materiali per la Vostra operatività: {PRODOTTI_PROSA}.\n2. Condizioni B2B chiare: {CONDIZIONE_BREVE} e preventivi rapidi su commesse dedicate.\n3. Consultazione gratuita: su un Vostro semplice cenno di risposta a questa mail Vi trasmettiamo il prospetto PDF riservato e l’abilitazione conoscitiva al portale.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 09 (T041-T045) — DOPPIO CANALE (LISTINO RISERVATO VS PREVENTIVO)
  // ==========================================================================
  {
    code: 'T041',
    name: 'F09.1 Doppio Canale — Estratto Listino Riservato / Preventivo Diretto',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Due modalità per valutare Izzo Distribuzione S.r.l. — {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Presentiamo Izzo Distribuzione S.r.l. per la fornitura diretta di {PRODOTTI_COMPATTI}.\n\nPer valutare liberamente la nostra competitività potete scegliere la modalità più comoda per il Vostro ufficio acquisti:\n\nModalità A — Listino netto e portale B2B (gratuito e non vincolante): rispondete con un breve cenno a questa mail e Vi trasmettiamo qui l’estratto PDF riservato insieme all’accesso di consultazione con {CONDIZIONE_BREVE}.\nModalità B — Quotazione diretta su distinta: rispondete allegando una lista materiali o scriveteci su WhatsApp al {AGENT_PHONE} per ricevere un’offerta dedicata dal referente commerciale.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T042',
    name: 'F09.2 Doppio Canale — Area Digitale Riservata & Canale Project/Commessa',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino B2B e ufficio preventivi per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, sottoponiamo il servizio B2B di Izzo Distribuzione S.r.l. sulle linee {PRODOTTI_PROSA}.\n\nMettiamo a Vostra disposizione due canali operativi complementari:\n\nCanale Catalogo & Listino Riservato: rispondendo con un cenno a questa mail Vi inviamo l’estratto PDF dedicato e l’accesso conoscitivo gratuito al portale ({CONDIZIONE_BREVE}).\nCanale Commesse & Capitolati: assistenza diretta del nostro ufficio commerciale {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T043',
    name: 'F09.3 Doppio Canale — Verifica Listino vs Ufficio Gare/Acquisti',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Approvvigionamento B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Izzo Distribuzione S.r.l. propone un canale diretto su {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\nPotete verificare le nostre condizioni in due modi:\n1. Richiedendo con un breve cenno in risposta l’estratto del catalistino PDF e l’abilitazione gratuita di consultazione al portale ({CONDIZIONE_BREVE}).\n2. Trasmettendo un computo o una distinta materiali ai recapiti in firma per quotazione dedicata, [DESTINAZIONE_FLESSIBILE].\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T044',
    name: 'F09.4 Doppio Canale — Confronto Prezzi o Contatto col Referente',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto listini ingrosso B2B per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nconoscendo l’attività svolta dalla Vostra azienda {INCISO_CONTESTO_DB}, Izzo Distribuzione S.r.l. sottopone la propria struttura all’ingrosso su {PRODOTTI_COMPATTI}.\n\nPer ricevere l’estratto del listino riservato e un accesso conoscitivo gratuito ({CONDIZIONE_BREVE}), è sufficiente rispondere con un cenno a questa mail. Per un confronto diretto col referente potete anche contattarci telefonicamente o su WhatsApp al {AGENT_PHONE} {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T045',
    name: 'F09.5 Doppio Canale — Giacenze Reali + Offerte su Misura',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Canale B2B e quotazioni su distinta — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Con Izzo Distribuzione S.r.l. uniamo operatività digitale e supporto umano diretto su {PRODOTTI_PROSA}.\n\nSe desiderate esaminare disponibilità effettive e prezzi netti con {CONDIZIONE_BREVE}, rispondete pure con un cenno a questa email per ricevere il prospetto PDF riservato e l’accesso gratuito di consultazione; in alternativa potete inviarci una distinta articoli per un’offerta su misura.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 10 (T046-T050) — ATTACCO TECNICO SU COMPATIBILITÀ & NORMATIVA CE
  // ==========================================================================
  {
    code: 'T046',
    name: 'F10.1 Attacco Tecnico — Compatibilità Installativa & Impatto sul Margine',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Compatibilità tecnica e listino B2B per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nnelle forniture tecniche professionali — {INCISO_CONTESTO_DB} — l’affidabilità costruttiva dei materiali e la tenuta dei prezzi netti determinano gran parte del margine operativo.\n\nIzzo Distribuzione S.r.l. distribuisce all’ingrosso {PRODOTTI_PROSA}, tutte linee provviste di certificazione CE e schede tecniche.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T047',
    name: 'F10.2 Attacco Tecnico — Continuità di Stock & Schede Prodotto CE',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] certificati CE — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nper le strutture operative {INCISO_CONTESTO_DB}, la continuità di stock su materiali certificati è essenziale quanto la competitività dei listini d’acquisto.\n\nCon Izzo Distribuzione S.r.l. rendiamo immediatamente approvvigionabili a listino B2B:\n{LINEE_PRODOTTI_IZZO}\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] anche per quotazioni su distinte ricorrenti. [SALUTO_CHIUSURA]',
  },
  {
    code: 'T048',
    name: 'F10.3 Attacco Tecnico — Standard Qualitativo & Filiera Diretta',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Linee professionali certificate B2B per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Nella selezione dei materiali tecnici, Izzo Distribuzione S.r.l. opera [EQUIVALENZA_TECNICA], mettendo a disposizione a listino diretto {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T049',
    name: 'F10.4 Attacco Tecnico — Sostenibilità Budget & Conformità Normativa',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture certificate CE e listini netti per {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nnei lavori e negli approvvigionamenti seguiti da realtà come {COMPANY_NAME} — {INCISO_CONTESTO_DB} — coniugare conformità normativa e sostenibilità del budget richiede linee affidabili a filiera corta.\n\nDa Izzo Distribuzione S.r.l. supportiamo gli operatori B2B su {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}. [SALUTO_CHIUSURA]',
  },
  {
    code: 'T050',
    name: 'F10.5 Attacco Tecnico — Dettaglio 3 Direttrici Tecniche + Invito Risposta',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Gamma tecnica e quotazioni nette B2B — {COMPANY_NAME} | Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Attraverso il canale B2B di Izzo Distribuzione S.r.l. articoliamo l’assortimento dedicato al Vostro settore su tre direttrici principali:\n{LINEE_PRODOTTI_IZZO}\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 11 (T051-T055) — DISPONIBILITÀ ESTRATTO CATALISTINO SU RICHIESTA
  // ==========================================================================
  {
    code: 'T051',
    name: 'F11.1 Focus Catalistino — Disponibilità Estratto Riservato per Categoria',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino riservato per comparto B2B — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nsiamo Izzo Distribuzione S.r.l. e, {INCISO_CONTESTO_DB}, proponiamo la nostra distribuzione all’ingrosso su {PRODOTTI_PROSA}.\n\nAbbiamo predisposto per gli operatori della Vostra categoria un estratto illustrativo del catalistino con prezzi netti riservati ({CONDIZIONE_BREVE}): se può esserVi utile riceverlo qui insieme a un accesso gratuito di consultazione al portale, rispondete pure con un breve cenno a questa mail.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T052',
    name: 'F11.2 Focus Catalistino — Doppio Riferimento Listino Ufficiale / Netto',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto listino ufficiale e netto B2B ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Izzo Distribuzione S.r.l. opera come fornitore diretto su {PRODOTTI_COMPATTI}, [VANTAGGIO_ZERO_SCORTE].\n\nPer offrire al Vostro responsabile acquisti un confronto immediato tra listino ufficiale e prezzo netto riservato ({CONDIZIONE_BREVE}), basta rispondere anche con un semplice «Sì» a questa comunicazione e Vi trasmettiamo subito il prospetto PDF dedicato con l’accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T053',
    name: 'F11.3 Focus Catalistino — Riscontro Immediato su Articoli Alta Rotazione',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Selezione catalogo B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\ncon Izzo Distribuzione S.r.l. — {INCISO_CONTESTO_DB} — affianchiamo gli operatori professionali su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T054',
    name: 'F11.4 Focus Catalistino — Nota Informativa per Ufficio Acquisti',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture tecniche e listino B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Attraverso Izzo Distribuzione S.r.l. trattiamo direttamente {PRODOTTI_COMPATTI} {SCOPO_FORNITURA_SETTORE}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T055',
    name: 'F11.5 Focus Catalistino — Listino Netto Partite IVA su Cenno di Risposta',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino B2B riservato a {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, Izzo Distribuzione S.r.l. garantisce pronta disponibilità su {PRODOTTI_PROSA} con listini riservati esclusivamente alle Partite IVA.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 12 (T056-T060) — SECONDO FORNITORE INDIPENDENTE
  // ==========================================================================
  {
    code: 'T056',
    name: 'F12.1 Secondo Fornitore — Parametro Oggettivo di Confronto Acquisti',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Affiancamento secondo fornitore B2B per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nnelle aziende strutturate — {INCISO_CONTESTO_DB} — disporre di un secondo fornitore indipendente oltre ai grossisti storici consente di avere un parametro oggettivo sui prezzi netti e di proteggere la marginalità sui materiali ad alta rotazione.\n\nÈ con questa logica che presentiamo Izzo Distribuzione S.r.l.: non chiediamo esclusive né volumi minimi annui, ma mettiamo a disposizione una filiera distributiva diretta su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T057',
    name: 'F12.2 Secondo Fornitore — Difesa del Margine Operativo',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Diversificazione fornitori B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Oggi difendere il margine operativo significa affiancare ai canali tradizionali linee professionali certificate con listino riservato alle sole Partite IVA e forte competitività d’acquisto.\n\nIzzo Distribuzione S.r.l. lavora esattamente in questo spazio, distribuendo {PRODOTTI_PROSA}, [VANTAGGIO_ZERO_SCORTE].\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T058',
    name: 'F12.3 Secondo Fornitore — Canale Integrativo Senza Vincoli di Volume',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Canale integrativo forniture B2B per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, sottoponiamo Izzo Distribuzione S.r.l. come fornitore integrativo da affiancare in piena libertà ai Vostri attuali riferimenti commerciali.\n\nQuando occorre contenere il costo medio di approvvigionamento mantenendo piena certificazione CE, le linee distribuite a nostro catalogo ({PRODOTTI_COMPATTI}) offrono un rapporto qualità/prezzo netto immediatamente misurabile.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T059',
    name: 'F12.4 Secondo Fornitore — Riduzione Dispersione su Fornitori Multipli',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitore B2B complementare per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Nella gestione acquisti, disporre di un canale B2B diretto che raggruppa più famiglie tecniche evita dispersioni su fornitori diversi e riduce l’incidenza sui costi di commessa e di magazzino.\n\nIzzo Distribuzione S.r.l. serve operatori professionali in tutta Italia su {PRODOTTI_COMPATTI}, [DESTINAZIONE_FLESSIBILE].\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T060',
    name: 'F12.5 Secondo Fornitore — Alternativa Snella su Materiali Ricorrenti',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Secondo riferimento B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nproponiamo Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB} quale secondo fornitore B2B snello per tutta la componentistica di impiego ricorrente: {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_FLASH} [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 13 (T061-T065) — MAPPA SINTETICA REPARTI
  // ==========================================================================
  {
    code: 'T061',
    name: 'F13.1 Mappa Reparti — Riepilogo Merceologico + Invito Confronto',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riepilogo reparti e listino ingrosso B2B per {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, presentiamo in sintesi i reparti coperti all’ingrosso da Izzo Distribuzione S.r.l.:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] per qualsiasi approfondimento commerciale.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T062',
    name: 'F13.2 Mappa Reparti — Copertura Diretta per Comparto',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Linee tecniche B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Riassumiamo la copertura diretta garantita dal catalogo B2B di Izzo Distribuzione S.r.l.:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{INVITO_RISPOSTA_PROSA}\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T063',
    name: 'F13.3 Mappa Reparti — Unico Canale B2B su Tre Famiglie',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture B2B multi-famiglia per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nper supportare in un unico canale B2B l’operatività di {COMPANY_NAME} — {INCISO_CONTESTO_DB} — Izzo Distribuzione S.r.l. raggruppa le seguenti famiglie di consumo quotidiano:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] anche per preventivi su distinta. [SALUTO_CHIUSURA]',
  },
  {
    code: 'T064',
    name: 'F13.4 Mappa Reparti — Quadro Sinottico Marchi + Invito Risposta',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quadro linee e marchi B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Sintetizziamo qui sotto le linee professionali distribuite da Izzo Distribuzione S.r.l. {SCOPO_FORNITURA_SETTORE}:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T065',
    name: 'F13.5 Mappa Reparti — Unificazione Ordini B2B + Riferimenti Essenziali',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitura accentrata B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, Izzo Distribuzione S.r.l. consente di unificare in un solo ordine B2B più famiglie merceologiche certificate CE:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 14 (T066-T070) — LOGISTICA NAZIONALE & ZERO MINIMO D'ORDINE
  // ==========================================================================
  {
    code: 'T066',
    name: 'F14.1 Logistica & Zero Minimo — Consegne in Sede o Cantiere',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne tracciate in sede o cantiere senza minimo d’ordine — {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nquando si gestiscono più commesse o riassortimenti — {INCISO_CONTESTO_DB} — poter ordinare anche singole integrazioni senza vincoli di importo minimo e con recapito diretto presso la sede o l’area lavori semplifica concretamente l’operatività.\n\nIzzo Distribuzione S.r.l. opera su tutto il territorio nazionale dal proprio polo distributivo di Benevento, fornendo a listino B2B {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T067',
    name: 'F14.2 Logistica & Zero Minimo — Riassortimento Snello Senza Immobilizzo Scorte',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture B2B anche a colli frazionati senza minimo — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Mantenere coperti i fabbisogni operativi senza immobilizzare capitale in lotti minimi sovradimensionati è un vantaggio gestionale immediato.\n\nCon Izzo Distribuzione S.r.l. potete approvvigionare liberamente — [ZERO_MINIMO_ORDINE] — {PRODOTTI_COMPATTI}, [TEMPI_RESA].\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T068',
    name: 'F14.3 Logistica & Zero Minimo — Resa Flessibile & Stock Verificabile',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture B2B con resa diretta e stock reale — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nsegnaliamo l’organizzazione logistica e commerciale di Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB} per l’approvvigionamento di {PRODOTTI_COMPATTI}.\n\nGestiamo spedizioni tracciate sia presso il Vostro magazzino sia direttamente presso destinazioni esterne di cantiere, senza imporre minimi d’ordine e con giacenze reali sempre allineate.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T069',
    name: 'F14.4 Logistica & Zero Minimo — Approvvigionamenti Calibrati per Commessa',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Logistica B2B e listino riservato per {COMPANY_NAME} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Ogni commessa richiede forniture calibrate per stato d’avanzamento lavori senza appesantire il deposito aziendale.\n\nIzzo Distribuzione S.r.l. affianca le aziende con spedizioni tracciate in tutta Italia e zero minimo d’ordine su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T070',
    name: 'F14.5 Logistica & Zero Minimo — Giacenze Fisiche & Chiarezza Prezzi',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture tecniche senza minimo d’ordine — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nper chi pianifica acquisti tecnici — {INCISO_CONTESTO_DB} — avere certezza su disponibilità a magazzino e costo netto prima dell’ordine evita fermi operativi e attese impreviste.\n\nCon Izzo Distribuzione S.r.l. ogni fornitura su {PRODOTTI_COMPATTI} unisce giacenza fisica verificata e prezzo netto riservato, [ZERO_MINIMO_ORDINE].\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 15 (T071-T075) — NOTA PER ARCHIVIO / RUBRICA FORNITORI
  // ==========================================================================
  {
    code: 'T071',
    name: 'F15.1 Archivio Fornitori — Nota da Protocollare per Future Consultazioni',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti B2B per archivio fornitori — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\ninviamo una sintetica nota conoscitiva affinché possiate, ove ritenuto utile, registrare i riferimenti di Izzo Distribuzione S.r.l. nell’archivio fornitori consultato da {COMPANY_NAME} {INCISO_CONTESTO_DB}.\n\nOperiamo nella distribuzione all’ingrosso B2B di {PRODOTTI_PROSA}, supportando le aziende sia in fase di preventivazione sia in fase esecutiva.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T072',
    name: 'F15.2 Archivio Fornitori — Rubrica Ufficio Acquisti Senza Scadenze',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nota informativa per rubrica fornitori B2B — {COMPANY_NAME}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\ntrasmettiamo i recapiti commerciali di Izzo Distribuzione S.r.l. perché restino a disposizione del Vostro ufficio acquisti — {INCISO_CONTESTO_DB} — in occasione dei prossimi confronti fornitori.\n\nTrattiamo all’ingrosso con listino riservato alle Partite IVA {PRODOTTI_COMPATTI}. {INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T073',
    name: 'F15.3 Archivio Fornitori — Presentazione Societaria per Albo Interno',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione societaria per albo fornitori — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo la presentazione istituzionale di Izzo Distribuzione S.r.l. per un eventuale inserimento tra i fornitori consultabili dalla Vostra struttura.\n\nIl nostro catalogo B2B riunisce {PRODOTTI_PROSA}. {INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T074',
    name: 'F15.4 Archivio Fornitori — Riferimenti Agli Atti Ufficio Tecnico-Acquisti',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti commerciali B2B Izzo Distribuzione S.r.l. — c.a. {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nlasciamo agli atti del Vostro ufficio tecnico-acquisti i riferimenti diretti di Izzo Distribuzione S.r.l. {INCISO_CONTESTO_DB}, quale distributore all’ingrosso su {PRODOTTI_COMPATTI}.\n\nSenza alcuna scadenza né impegno d’acquisto, qualora voleste confrontare le nostre quotazioni nette ({CONDIZIONE_BREVE}), rispondete pure con un cenno a questa mail e Vi trasmettiamo il prospetto PDF riservato e l’accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T075',
    name: 'F15.5 Archivio Fornitori — Contatti Diretti per Futuri Approvvigionamenti',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Contatti fornitore B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Inviamo i riferimenti di Izzo Distribuzione S.r.l. quale potenziale fornitore da tenere in rubrica {SCOPO_FORNITURA_SETTORE}: {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 16 (T076-T080) — SCENARIO REALE DI MESTIERE
  // ==========================================================================
  {
    code: 'T076',
    name: 'F16.1 Scenario di Mestiere — Esigenza Reale di Comparto & Soluzione B2B',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Continuità forniture e prezzi netti B2B — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{SCENARIO_MESTIERE_SETTORE}\n\nIzzo Distribuzione S.r.l. risponde a questa esigenza con una fornitura B2B diretta su {PRODOTTI_PROSA}, completi di certificazione CE e schede tecniche.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T077',
    name: 'F16.2 Scenario di Mestiere — Tutela Marginalità su Linee Riservate P.IVA',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Linee professionali riservate Partite IVA per {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\nCon Izzo Distribuzione S.r.l. mettiamo a disposizione degli operatori professionali {PRODOTTI_COMPATTI}, ordinabili [ZERO_MINIMO_ORDINE] e con spedizione tracciata in tutta Italia.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T078',
    name: 'F16.3 Scenario di Mestiere — Competitività in Fase di Offerta/Commessa',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Ottimizzazione costi materiali B2B — {COMPANY_NAME} | Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\nIzzo Distribuzione S.r.l. fornisce direttamente {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T079',
    name: 'F16.4 Scenario di Mestiere — Accentramento Voci Frammentate',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitura diretta B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{SCENARIO_MESTIERE_SETTORE}\n\nAccentrando queste forniture tramite Izzo Distribuzione S.r.l. accedete direttamente a listini d’ingrosso su {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_PROSA}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T080',
    name: 'F16.5 Scenario di Mestiere — Pacchetto Completo ad Alto Margine',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\nIzzo Distribuzione S.r.l. affianca la Vostra operatività con {PRODOTTI_PROSA}, restando disponibile per quotazioni dedicate {CHIUSURA_SETTORE}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 17 (T081-T085) — TRE CHIAVI SINTETICHE
  // ==========================================================================
  {
    code: 'T081',
    name: 'F17.1 Tre Chiavi — Cosa Forniamo / Condizioni / Come Confrontare i Netti',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Sintesi fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, riassumiamo senza preamboli la proposta di Izzo Distribuzione S.r.l.:\n\nCosa forniamo per il Vostro settore: {PRODOTTI_COMPATTI}.\nCondizioni commerciali: listino riservato Partite IVA con {CONDIZIONE_BREVE} e [TEMPI_RESA].\nCome confrontare i prezzi senza impegno: rispondete con un cenno a questa mail e Vi trasmettiamo qui l’estratto del listino riservato insieme a un accesso gratuito di consultazione.\n\n[FRASE_DISPONIBILITA] anche per quotazioni su distinta.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T082',
    name: 'F17.2 Tre Chiavi — Assortimento / Politica B2B / Invio Listino',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta ingrosso B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo in sintesi i riferimenti di Izzo Distribuzione S.r.l.:\n\nAssortimento trattato: {PRODOTTI_COMPATTI}.\nPolitica commerciale: {CONDIZIONE_BREVE}, stock reale e referente dedicato.\nConfronto listini: rispondendo anche con un breve «Sì» alla presente Vi inviamo il prospetto PDF riservato e l’abilitazione conoscitiva gratuita al portale.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T083',
    name: 'F17.3 Tre Chiavi — Linee Disponibili / Vantaggio / Consultazione su Richiesta',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Sintesi commerciale B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo l’operatività di {COMPANY_NAME} — {INCISO_CONTESTO_DB} — presentiamo Izzo Distribuzione S.r.l. in tre righe operative:\n\nLinee disponibili: {PRODOTTI_COMPATTI}.\nVantaggio d’ingresso: {CONDIZIONE_BREVE} e preventivi dedicati su commessa.\nVerifica gratuita: basta un cenno di risposta a questa email per ricevere l’estratto del catalistino PDF e un accesso gratuito di sola consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T084',
    name: 'F17.4 Tre Chiavi — Prodotti / Condizioni / Verifica Senza Impegno',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riepilogo fornitura B2B per {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nper supportare le attività svolte da {COMPANY_NAME} {INCISO_CONTESTO_DB}, ecco cosa mette a disposizione Izzo Distribuzione S.r.l.:\n\nProdotti: {PRODOTTI_COMPATTI}.\nCondizioni: {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\nListino riservato: rispondete pure a questa mail se desiderate ricevere qui l’estratto PDF coi prezzi netti e l’abilitazione gratuita di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T085',
    name: 'F17.5 Tre Chiavi — Gamma / Condizioni d’Acquisto / Sola Consultazione',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Scheda rapida B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Riepiloghiamo in forma essenziale l’offerta all’ingrosso di Izzo Distribuzione S.r.l.:\n\nGamma di comparto: {PRODOTTI_PROSA}.\nCondizioni d’acquisto: {CONDIZIONE_BREVE}, quotazioni su capitolato o distinta.\nConsultazione gratuita: rispondendo con un cenno alla presente Vi giriamo l’estratto del listino riservato e l’accesso di sola lettura al portale.\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 18 (T086-T090) — MONOPARAGRAFO ESECUTIVO COMPATTO
  // ==========================================================================
  {
    code: 'T086',
    name: 'F18.1 Monoparagrafo — Blocco Unico Denso & Invito Risposta',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione B2B Izzo Distribuzione S.r.l. — c.a. {COMPANY_NAME}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo Izzo Distribuzione S.r.l. quale fornitore B2B diretto per l’approvvigionamento di {PRODOTTI_PROSA}, restando disponibili anche per quotazioni dedicate su specifica distinta di commessa o magazzino.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T087',
    name: 'F18.2 Monoparagrafo — Ingrosso Senza Minimi + Chiusura Diretta',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Ingrosso B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Presentiamo Izzo Distribuzione S.r.l. per la fornitura all’ingrosso — [VANTAGGIO_ZERO_SCORTE] — di {PRODOTTI_COMPATTI}, tutti corredati da certificazione CE e spedizione tracciata su scala nazionale.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T088',
    name: 'F18.3 Monoparagrafo — Giacenze Reali & Preventivi',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture tecniche B2B per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, Izzo Distribuzione S.r.l. propone la propria struttura B2B per la fornitura diretta di {PRODOTTI_PROSA}, con giacenze reali e supporto diretto dell’ufficio commerciale {CHIUSURA_SETTORE}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T089',
    name: 'F18.4 Monoparagrafo — Unico Interlocutore B2B + Consegne Flessibili',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] — {COMPANY_NAME} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\noperando a supporto delle realtà del Vostro comparto — {INCISO_CONTESTO_DB} — Izzo Distribuzione S.r.l. consente di approvvigionare da un unico fornitore B2B {PRODOTTI_COMPATTI}, [DESTINAZIONE_FLESSIBILE].\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T090',
    name: 'F18.5 Monoparagrafo — Riferimento Tecnico-Commerciale Diretto',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimento B2B e listini netti — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo Izzo Distribuzione S.r.l. quale riferimento tecnico-commerciale {SCOPO_FORNITURA_SETTORE} sulle linee {PRODOTTI_COMPATTI}, affiancando catalogo digitale e referente dedicato.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 19 (T091-T095) — TAGLIO ANALITICO SU LISTINO NETTO & SCONTO CASCATA
  // ==========================================================================
  {
    code: 'T091',
    name: 'F19.1 Taglio Analitico — Calcolo Netto Effettivo da Listino ({NET_DISCOUNT_PCT}%)',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto analitico prezzi netti B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\nsottoponiamo a {COMPANY_NAME} — {INCISO_CONTESTO_DB} — i parametri economici riservati da Izzo Distribuzione S.r.l. ai {LISTINO_RUOLO}: listino B2B con sconto base {BASE_DISCOUNT}% integrato da un ulteriore {EXTRA_DISCOUNT}% in cascata sul primo eventuale ordine di fornitura (pari al {NET_DISCOUNT_PCT}% netto effettivo da listino ufficiale), [ZERO_MINIMO_ORDINE].\n\nLa scontistica opera sull’intera gamma in pronta disponibilità: {PRODOTTI_PROSA}.\n\nSe può esserVi utile verificare codice per codice l’incidenza sui Vostri acquisti abituali, rispondete pure con un cenno a questa mail e Vi trasmettiamo l’estratto PDF del listino netto insieme a un accesso gratuito di consultazione.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T092',
    name: 'F19.2 Taglio Analitico — Sconto Primo Ordine + Stabilità Fascia Base {BASE_DISCOUNT}%',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizione B2B {DISCOUNT_FORMULA} a cascata ({NET_DISCOUNT_PCT}% netto) — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Per offrire al Vostro ufficio acquisti un riscontro numerico oggettivo, Izzo Distribuzione S.r.l. prevede per i nuovi partner la fascia {DISCOUNT_FORMULA} a cascata valida sul primo ordine eventuale (abbattimento netto effettivo del {NET_DISCOUNT_PCT}% da listino ufficiale), con successivo mantenimento stabile dello sconto base {BASE_DISCOUNT}% senza obblighi di fatturato né minimo d’ordine.\n\n{INVITO_RISPOSTA_PROSA}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T093',
    name: 'F19.3 Taglio Analitico — Listini Oscurati al Pubblico & Tutela Marginalità',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino netto riservato Partite IVA per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, Izzo Distribuzione S.r.l. imposta la propria proposta su listini oscurati al pubblico privato e scontistica riservata {DISCOUNT_FORMULA} in cascata sul primo ordine eventuale, [ZERO_MINIMO_ORDINE].\n\nTale condizione consente un’elevata competitività d’acquisto su {PRODOTTI_PROSA}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T094',
    name: 'F19.4 Taglio Analitico — Confronto Codice per Codice Listino vs Netto',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Verifica netti B2B ({NET_DISCOUNT_PCT}% effettivo 1° ordine) — {COMPANY_NAME}',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Attraverso il catalogo B2B di Izzo Distribuzione S.r.l. ogni articolo espone affiancati listino ufficiale, giacenza effettiva e prezzo netto calcolato con sconto primo ordine {DISCOUNT_FORMULA} a cascata ({NET_DISCOUNT_PCT}% netto effettivo), senza minimo d’ordine.\n\nPer ricevere qui l’estratto PDF sulle linee {PRODOTTI_COMPATTI} e un accesso conoscitivo gratuito di consultazione, è sufficiente rispondere con un breve cenno a questa mail.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T095',
    name: 'F19.5 Taglio Analitico — Riduzione Costi di Commessa & Magazzino',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Ottimizzazione costi forniture B2B ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\nacquistare direttamente a listino d’ingrosso B2B {PRODOTTI_COMPATTI} permette a una realtà strutturata come {COMPANY_NAME} — {INCISO_CONTESTO_DB} — di ridurre sensibilmente l’incidenza dei materiali su ogni commessa o riassortimento.\n\nCon Izzo Distribuzione S.r.l. beneficiate fin dall’eventuale primo ordine dello sconto riservato {DISCOUNT_FORMULA} in cascata ({NET_DISCOUNT_PCT}% netto) senza alcun minimo d’ordine, [DESTINAZIONE_FLESSIBILE].\n\n{INVITO_RISPOSTA_FLASH}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 20 (T096-T100) — IMPOSTAZIONE TERRITORIALE PER AZIENDE LOCALI
  // ==========================================================================
  {
    code: 'T096',
    name: 'F20.1 Territoriale Prosa — Lettera Fluida su Città/Provincia e Settore',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione fornitore B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{CONTESTO_TERRITORIO_FALLBACK} Distribuiamo su tutto il territorio nazionale {PRODOTTI_PROSA}, accompagnati da certificazione CE e schede tecniche.\n\n{INVITO_RISPOSTA_PROSA}\n\n[FRASE_DISPONIBILITA] anche per quotazioni dirette su distinta materiali.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T097',
    name: 'F20.2 Territoriale Flash — Nota Breve per Operatori Locali',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{CONTESTO_TERRITORIO_FALLBACK} Trattiamo a listino diretto {PRODOTTI_COMPATTI}.\n\n{INVITO_RISPOSTA_FLASH}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}. [SALUTO_CHIUSURA]',
  },
  {
    code: 'T098',
    name: 'F20.3 Territoriale 1ª Persona — Daniele Savoia per Aziende del Territorio',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimento diretto ingrosso B2B — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME} dell’ufficio commerciale B2B di Izzo Distribuzione S.r.l. Seguiamo diverse realtà professionali su {CITY} e Vi scrivo direttamente per sottoporre alla Vostra valutazione il nostro catalogo all’ingrosso su {PRODOTTI_COMPATTI}.\n\nSe può esserVi utile dare uno sguardo ai prezzi netti senza alcun impegno e [ZERO_MINIMO_ORDINE], rispondete pure con un cenno a questa mail e Vi invio qui una sintesi in PDF del nostro listino insieme a un accesso conoscitivo gratuito ({CONDIZIONE_BREVE}).\n\nPer qualsiasi informazione potete rispondermi qui o chiamarmi direttamente al numero in firma.\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T099',
    name: 'F20.4 Territoriale con P.S. — Presentazione Sobria + Invito nel P.S.',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] — {COMPANY_NAME}{CITY_PAREN} | Izzo Distribuzione S.r.l.',
    bodyTemplate:
      '[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{CONTESTO_TERRITORIO_FALLBACK} Riforniamo direttamente gli operatori con Partita IVA su {PRODOTTI_PROSA}, operando con spedizioni tracciate anche direttamente su cantiere e referente commerciale dedicato per quotazioni su commessa.\n\n[SALUTO_CHIUSURA]\n\n{INVITO_RISPOSTA_PS}',
  },
  {
    code: 'T100',
    name: 'F20.5 Territoriale 1-2-3 — Schema in Tre Punti per Libera Valutazione',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Canale B2B forniture tecniche — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate:
      '{SALUTO_PERSONALIZZATO}\n\n{CONTESTO_TERRITORIO_FALLBACK} Sintetizziamo in tre punti i nostri riferimenti operativi per una Vostra libera valutazione quale fornitore:\n\n1. Unico interlocutore B2B: {PRODOTTI_COMPATTI}.\n2. Condizioni trasparenti senza vincoli: {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\n3. Verifica listino su richiesta: rispondendo anche con un breve cenno a questa mail Vi trasmettiamo l’estratto PDF del listino riservato e un accesso gratuito di sola consultazione.\n\n[FRASE_DISPONIBILITA] per eventuali preventivi su capitolato o distinta.\n\n[SALUTO_CHIUSURA]',
  },
];
