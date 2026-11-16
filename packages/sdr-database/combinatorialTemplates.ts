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
 * 100 Email Madri Universali Izzo Distribuzione S.r.l. (T001 - T100)
 * Architettura approvata a 20 Famiglie di Impostazione Strutturale radicalmente diverse
 * (5 varianti ciascuna = 100 modelli) + 108 gruppi di parole dinamiche + Personalizzazione automatica da DB.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  {
    "code": "T001",
    "name": "F01.1 Prosa Pura — Presentazione Diretta & Marchi nel Testo",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_TIPO_DOC] per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} [VERBO_CONTATTARE] **Izzo Distribuzione S.r.l.** quale fornitore B2B alternativo {SCOPO_FORNITURA_SETTORE}, con disponibilità continuativa su {PRODOTTI_PROSA}.\n\n{CREDENZIALI_PROSA}\n\n[FRASE_DISPONIBILITA] [COME_RISPONDERE] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T002",
    "name": "F01.2 Prosa Pura — Taglio Istituzionale & Filiera Diretta",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Forniture all’ingrosso B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n[VERBO_CONTATTARE] **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}. Operiamo su tutto il territorio nazionale distribuendo agli operatori con Partita IVA {PRODOTTI_PROSA}, tutti [CONFORMITA_QUALITA].\n\n{CREDENZIALI_PROSA}\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T003",
    "name": "F01.3 Prosa Pura — Ufficio Acquisti & Documentazione CE",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_RAPIDITA] per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo la struttura B2B di **Izzo Distribuzione S.r.l.** quale canale complementare di approvvigionamento su {PRODOTTI_PROSA}, [COPERTURA_ITALIA].\n\n{CREDENZIALI_PROSA}\n\nPer distinte materiali o forniture programmate elaboriamo inoltre quotazioni dedicate su richiesta diretta.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T004",
    "name": "F01.4 Prosa Pura — Accentramento Acquisti & Zero Formalità",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Canale di fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nin qualità di [QUALIFICA_DISTRIBUTORE], contattiamo la Vostra struttura {INCISO_CONTESTO_DB} per proporre un unico riferimento all’ingrosso su {PRODOTTI_PROSA}.\n\n{CREDENZIALI_PROSA}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T005",
    "name": "F01.5 Prosa Pura — Confronto Libero Prezzi Netti",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Catalogo riservato Partite IVA per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Il catalogo riservato agli operatori B2B di **Izzo Distribuzione S.r.l.** affianca condizioni all’ingrosso trasparenti e pronta disponibilità su {PRODOTTI_PROSA}.\n\n{CREDENZIALI_PROSA} [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T006",
    "name": "F02.1 Nota Flash — Riferimenti Diretti in 6 Righe",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Riferimenti B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo il listino B2B diretto di **Izzo Distribuzione S.r.l.** su {PRODOTTI_COMPATTI}.\n\nPer una verifica rapida dei prezzi netti ({CONDIZIONE_BREVE}), lasciamo un accesso conoscitivo non vincolante:\n{CREDENZIALI_RIGA_FLASH}\n\n[FRASE_DISPONIBILITA] anche su singola commessa. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T007",
    "name": "F02.2 Nota Flash — Sintesi Ufficio Acquisti",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\noperando {INCISO_CONTESTO_DB}, presentiamo **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE} ({PRODOTTI_COMPATTI}).\n\nAccesso gratuito e senza impegno per confronto listini netti ({DISCOUNT_FORMULA} sul 1° ordine, [ZERO_MINIMO_ORDINE]):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T008",
    "name": "F02.3 Nota Flash — Ingrosso & Colli Frazionati",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "[OGG_TIPO_DOC] — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} **Izzo Distribuzione S.r.l.** distribuisce direttamente a listino B2B {PRODOTTI_COMPATTI}.\n\nRiferimenti provvisori e gratuiti ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T009",
    "name": "F02.4 Nota Flash — Essenziale Direzione Aziendale",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Nota conoscitiva B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nsegnaliamo il canale B2B diretto di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, con pronta disponibilità su {PRODOTTI_COMPATTI}.\n\nPer consultare senza vincoli i prezzi netti ({DISCOUNT_FORMULA} a cascata sul 1° ordine, zero minimo):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T010",
    "name": "F02.5 Nota Flash — Verifica Rapida Prezzi & Stock",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Accesso consultazione B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sul portale all’ingrosso di **Izzo Distribuzione S.r.l.** trattiamo {PRODOTTI_COMPATTI}.\n\nDati provvisori di sola consultazione ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[FRASE_DISPONIBILITA] per preventivi su distinta. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T011",
    "name": "F03.1 Prima Persona — Daniele Savoia Diretto + Distinta WhatsApp",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Contatto diretto B2B per {COMPANY_NAME} — {AGENT_NAME} (Izzo Distribuzione)",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME} e seguo lo sviluppo commerciale B2B di **Izzo Distribuzione S.r.l.** Vi scrivo direttamente {INCISO_CONTESTO_DB}, per metterVi a disposizione un canale di fornitura alternativo, snello e senza filtri intermedi su {PRODOTTI_PROSA}.\n\nPer farVi verificare subito se i nostri netti sono competitivi rispetto agli attuali fornitori, ho attivato personalmente un accesso di sola lettura, gratuito e senza alcun vincolo:\n- Indirizzo login: {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`)\n- Selezione rapida in PDF: {OFFER_URL}\n\nSul profilo è già caricato lo sconto riservato del {DISCOUNT_FORMULA} a cascata per un eventuale primo ordine, [ZERO_MINIMO_ORDINE]. Se preferite mettermi alla prova su una lista materiali in corso, potete girarmela in risposta a questa mail o su WhatsApp al numero qui sotto.\n\nBuon lavoro e cordiali saluti,"
  },
  {
    "code": "T012",
    "name": "F03.2 Prima Persona — Filo Diretto Referente B2B in Prosa",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Referente diretto B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nmi chiamo {AGENT_NAME} e sono il referente B2B di **Izzo Distribuzione S.r.l.** {FRASE_CONTESTO_DB} Vi contatto personalmente per presentarVi la nostra distribuzione diretta su {PRODOTTI_COMPATTI}, tutti [CONFORMITA_QUALITA].\n\nHo preparato per Vostra comodità un profilo provvisorio e non vincolante ({CONDIZIONE_BREVE}): potete entrare su {LOGIN_URL} con utente `{USERNAME}` e password `{TEMP_PASSWORD}`, oppure dare uno sguardo veloce al PDF riepilogativo su {OFFER_URL}.\n\nResto raggiungibile direttamente per telefono o WhatsApp al {AGENT_PHONE} {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T013",
    "name": "F03.3 Prima Persona — Presentazione Personale Senza Call Center",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Filo diretto forniture B2B per {COMPANY_NAME} — {AGENT_NAME}",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nVi scrivo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}. Seguo personalmente i clienti professionali B2B e vorrei sottoporre la nostra realtà alla Vostra valutazione come fornitore integrativo su {PRODOTTI_PROSA}.\n\nPer evitarVi perdite di tempo in registrazioni, ho generato delle credenziali conoscitive gratuite su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`, estratto PDF su {OFFER_URL}), dove trovate già calcolato il netto col {DISCOUNT_FORMULA} sul primo ordine e zero minimo d’acquisto.\n\nSe avete una distinta articoli su cui confrontare i nostri prezzi netti, inviatemela pure direttamente qui: Vi rispondo personalmente con quotazione dedicata.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T014",
    "name": "F03.4 Prima Persona — Taglio Pratico per Risparmio Acquisti",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Forniture B2B e riferimento diretto per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME}, referente commerciale di **Izzo Distribuzione S.r.l.** {FRASE_CONTESTO_DB} Vi scrivo per presentarVi una soluzione pratica con cui molte aziende del settore riducono i costi d’acquisto su {PRODOTTI_COMPATTI}.\n\nPotete controllare liberamente i prezzi netti a Voi riservati ({DISCOUNT_FORMULA} a cascata sul primo eventuale acquisto, [ZERO_MINIMO_ORDINE]) entrando quando volete su {LOGIN_URL} con utente provvisorio `{USERNAME}` e password `{TEMP_PASSWORD}`, oppure consultando l’estratto PDF su {OFFER_URL}. L’utenza è gratuita e priva di qualunque vincolo.\n\nPer qualsiasi esigenza resto a Vostra diretta disposizione ai contatti sotto indicati.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T015",
    "name": "F03.5 Prima Persona — Riferimento Tecnico-Commerciale Dedicato",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Presentazione commerciale B2B — {AGENT_NAME} per {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nmi presento brevemente: sono {AGENT_NAME} dell’ufficio commerciale B2B di **Izzo Distribuzione S.r.l.** Conoscendo il Vostro ambito operativo {INCISO_CONTESTO_DB}, desidero lasciarVi il mio riferimento diretto per le forniture di {PRODOTTI_COMPATTI}.\n\nA titolo puramente conoscitivo ho abilitato per {COMPANY_NAME} l’accesso a {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`) e il prospetto PDF {OFFER_URL}, già valorizzati con {CONDIZIONE_BREVE}.\n\nPer preventivi fuori standard, campionature o verifiche di disponibilità potete chiamarmi o scrivermi direttamente.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T016",
    "name": "F04.1 Struttura P.S. — Corpo Tecnico Pulito + Accesso nel Post-Scriptum",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Presentazione Izzo Distribuzione S.r.l. — Forniture B2B per {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB}\n\nSottoponiamo alla Vostra valutazione **Izzo Distribuzione S.r.l.** quale fornitore strutturato {SCOPO_FORNITURA_SETTORE}: distribuiamo su scala nazionale {PRODOTTI_PROSA}.\n\nOperiamo [COPERTURA_ITALIA], con gestione flessibile senza minimi d’ordine e ufficio commerciale diretto per quotazioni su specifica distinta di commessa.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T017",
    "name": "F04.2 Struttura P.S. — Taglio Marginalità & Assortimento + P.S.",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Distribuzione B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n[VERBO_CONTATTARE] **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, presentandoci come partner all’ingrosso [FILOSOFIA_OPERATIVA].\n\nIl nostro modello distributivo punta a tutelare la marginalità operativa su famiglie complementari ad alta rotazione: {PRODOTTI_PROSA}.\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T018",
    "name": "F04.3 Struttura P.S. — Focus Continuità Stock & Preventivi + P.S.",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_RAPIDITA] — Alla c.a. di {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Desideriamo sottoporre **Izzo Distribuzione S.r.l.** quale canale B2B per l’approvvigionamento rapido di {PRODOTTI_COMPATTI}, tutti [CONFORMITA_QUALITA].\n\nPer commesse specifiche potete trasmetterci in risposta la distinta materiali per ricevere un’offerta dedicata dal nostro ufficio tecnico-commerciale.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T019",
    "name": "F04.4 Struttura P.S. — Unico Fornitore Multi-Famiglia + P.S.",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Fornitura tecnica all’ingrosso per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo il Vostro profilo operativo {INCISO_CONTESTO_DB}, Vi contattiamo da **Izzo Distribuzione S.r.l.** per proporre una linea di approvvigionamento diretto sui materiali di consumo ricorrente.\n\nCon un unico interlocutore B2B copriamo {PRODOTTI_PROSA}, [DESTINAZIONE_FLESSIBILE]. Restiamo a Vostro riferimento per concordare quotazioni su forniture programmate.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T020",
    "name": "F04.5 Struttura P.S. — Razionalizzazione Acquisti + P.S.",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Accentramento forniture B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB}\n\nAffianchiamo le realtà strutturate con listini d’ingrosso trasparenti su {PRODOTTI_COMPATTI}, coniugando [CURA_IMBALLO] e referente commerciale unico. Per ogni approfondimento o valorizzazione di capitolati potete fare riferimento ai recapiti sottostanti.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T021",
    "name": "F05.1 Scheda Albo Fornitori — Tabella Qualifica Ufficio Acquisti",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "clean_table",
    "subjectTemplate": "Scheda qualifica fornitore B2B — Alla c.a. Ufficio Acquisti {COMPANY_NAME}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\ntrasmettiamo una sintetica scheda di presentazione di **Izzo Distribuzione S.r.l.** per l’eventuale inserimento nel Vostro albo fornitori B2B, {INCISO_CONTESTO_DB}.\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\nRestiamo a disposizione per l’invio di documentazione tecnica integrativa o per quotare una distinta base di confronto.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T022",
    "name": "F05.2 Scheda Albo Fornitori — Accreditamento Fornitore all’Ingrosso",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "clean_table",
    "subjectTemplate": "Accreditamento fornitore all’ingrosso — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Sottoponiamo i riferimenti societari e commerciali di **Izzo Distribuzione S.r.l.** per una valutazione quale fornitore all’ingrosso {SCOPO_FORNITURA_SETTORE}:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\nL’utenza sopra indicata ha carattere esclusivamente conoscitivo e non comporta alcun vincolo. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T023",
    "name": "F05.3 Scheda Albo Fornitori — Dossier Sintetico Direzione & Gare",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "clean_table",
    "subjectTemplate": "Prospetto accreditamento fornitore B2B — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, inviamo il riepilogo operativo di **Izzo Distribuzione S.r.l.** ai fini delle Vostre valutazioni fornitori:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n[AIUTO_PRIMA_LISTA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T024",
    "name": "F05.4 Scheda Albo Fornitori — Nota Tecnica di Qualifica",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "clean_table",
    "subjectTemplate": "Nota qualifica fornitore per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Per agevolare un’eventuale verifica da parte del Vostro ufficio acquisti, riepiloghiamo in forma schematica i nostri dati operativi:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n[FRASE_DISPONIBILITA] [COME_RISPONDERE] [PER_OGNI_ESIGENZA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T025",
    "name": "F05.5 Scheda Albo Fornitori — Riepilogo Parametri Commerciali B2B",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "clean_table",
    "subjectTemplate": "Dossier fornitore B2B Izzo Distribuzione S.r.l. — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nsottoponiamo i parametri essenziali di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, con tutti i riferimenti per una verifica autonoma e gratuita dei listini netti:\n\n{SCHEDA_QUALIFICA_FORNITORE}\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T026",
    "name": "F06.1 Apertura Invertita — Accesso Riservato in Testa + Profilo Izzo",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Credenziali conoscitive listino B2B predisposte per {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nper consentire al Vostro ufficio acquisti di verificare direttamente prezzi netti e giacenze senza procedure di registrazione né alcun impegno commerciale, [ABBIAMO_ATTIVATO] un accesso provvisorio gratuito al nostro portale B2B:\n\n{CREDENTIALS_BLOCK}\n\nVi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}. Distribuiamo su scala nazionale {PRODOTTI_PROSA}.\n\n[FRASE_DISPONIBILITA] [COME_RISPONDERE] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T027",
    "name": "F06.2 Apertura Invertita — Barra Rapida in Apertura + Gamma Settore",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Accesso consultazione listino B2B ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\ntrasmettiamo in apertura i riferimenti conoscitivi e gratuiti predisposti per {COMPANY_NAME} qualora voleste confrontare in autonomia i nostri prezzi d’ingrosso ({CONDIZIONE_BREVE}):\n\n{CREDENZIALI_RIGA_FLASH}\n\nSiamo **Izzo Distribuzione S.r.l.** e, {INCISO_CONTESTO_DB}, supportiamo gli operatori con Partita IVA fornendo direttamente {PRODOTTI_PROSA}.\n\n[FRASE_DISPONIBILITA] per qualsiasi chiarimento commerciale.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T028",
    "name": "F06.3 Apertura Invertita — Abilitazione Sola Lettura + Copertura Tecnica",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Abilitazione consultazione catalogo B2B per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nmettiamo a disposizione del Vostro reparto tecnico-acquisti un profilo gratuito di sola consultazione su {LOGIN_URL} (username `{USERNAME}`, password temporanea `{TEMP_PASSWORD}`, prospetto PDF su {OFFER_URL}), già allineato a {CONDIZIONE_BREVE}. L’accesso è privo di qualsiasi vincolo.\n\n**Izzo Distribuzione S.r.l.** affianca in tutta Italia le strutture del Vostro settore — {INCISO_CONTESTO_DB} — fornendo {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T029",
    "name": "F06.4 Apertura Invertita — Specchietto Immediato + Presentazione Sobria",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Listino netto B2B attivo in consultazione per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nqui di seguito i riferimenti gratuiti e non vincolanti per esaminare a video il nostro listino riservato:\n\n{CREDENTIALS_BLOCK}\n\nContattiamo la Vostra struttura {INCISO_CONTESTO_DB} per presentare **Izzo Distribuzione S.r.l.** quale fornitore diretto {SCOPO_FORNITURA_SETTORE}, con copertura su {PRODOTTI_COMPATTI}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T030",
    "name": "F06.5 Apertura Invertita — Consultazione Diretta Netti + Preventivi",
    "angleGroup": "Credenziali_Comodita",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Consultazione diretta listino ingrosso {DISCOUNT_FORMULA} — {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n[ABBIAMO_PREPARATO] a favore di {COMPANY_NAME} un’utenza provvisoria gratuita per verificare in tempo reale disponibilità e prezzi netti su {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`) unitamente al prospetto PDF consultabile su {OFFER_URL}, valorizzato con {CONDIZIONE_BREVE}.\n\n{FRASE_CONTESTO_DB} **Izzo Distribuzione S.r.l.** si propone quale partner distributivo su {PRODOTTI_PROSA}. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T031",
    "name": "F07.1 RFQ-First — Quotazione di Confronto su Computo o Distinta",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Disponibilità quotazioni su computo e distinta materiali — {COMPANY_NAME}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nqualora abbiate in fase di analisi una distinta materiali o un computo metrico — {INCISO_CONTESTO_DB} — l’ufficio commerciale di **Izzo Distribuzione S.r.l.** è disponibile a sottoporVi senza impegno una quotazione netta di confronto in tempi rapidi.\n\nOperiamo come distributori B2B diretti su {PRODOTTI_PROSA}, garantendo schede tecniche complete per capitolati e dichiarazioni di conformità.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T032",
    "name": "F07.2 RFQ-First — Invio Lista via Email o WhatsApp + Portale in Coda",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Quotazione di confronto su distinta articoli — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Vi proponiamo una modalità estremamente concreta per valutare **Izzo Distribuzione S.r.l.** come fornitore: potete inviarci in risposta — o via WhatsApp al {AGENT_PHONE} — un elenco tipo di materiali per ricevere una valorizzazione netta riservata.\n\nTrattiamo in pronta disponibilità {PRODOTTI_COMPATTI}.\n\nIn affiancamento al canale preventivo, trovate già abilitati per semplice comodità di consultazione i riferimenti gratuiti ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T033",
    "name": "F07.3 RFQ-First — Preventivi Commessa con Resa su Cantiere",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Preventivi forniture B2B e capitolati per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, mettiamo a disposizione della Vostra azienda il nostro ufficio commerciale per quotare forniture complete o parziali di commessa, [DESTINAZIONE_FLESSIBILE].\n\nCon **Izzo Distribuzione S.r.l.** copriamo internamente {PRODOTTI_PROSA}.\n\nOltre alla possibilità di richiederci un preventivo su lista materiali, potete verificare in qualsiasi momento i nostri prezzi netti tramite l’accesso conoscitivo gratuito su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) o dal prospetto PDF {OFFER_URL} ({CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T034",
    "name": "F07.4 RFQ-First — Supporto Tecnico-Economico su Capitolati",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Supporto capitolati e quotazioni B2B — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Segnaliamo la disponibilità dell’ufficio tecnico-commerciale di **Izzo Distribuzione S.r.l.** a fornire schede tecniche, equivalenze prestazionali e quotazioni B2B di riferimento per le Vostre commesse su {PRODOTTI_COMPATTI}.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T035",
    "name": "F07.5 RFQ-First — Test Operativo su Lista Riassortimento",
    "angleGroup": "Presentazione_Referente",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Offerta di confronto su lista materiali — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nconoscendo il taglio professionale della Vostra struttura {INCISO_CONTESTO_DB}, Vi invitiamo a mettere alla prova **Izzo Distribuzione S.r.l.** anche su una semplice lista di articoli ad alta rotazione: elaboriamo quotazioni dedicate sia su colli frazionati sia su forniture a volume per {PRODOTTI_COMPATTI}.\n\nQualora preferiste verificare prima i prezzi netti direttamente online ({CONDIZIONE_BREVE}), potete utilizzare senza alcun vincolo l’accesso provvisorio su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) o il prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T036",
    "name": "F08.1 Flusso 1-2-3 — Gamma, Consultazione Netti e Gestione Commesse",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Proposta operativa di fornitura B2B per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo in tre punti concreti come **Izzo Distribuzione S.r.l.** può affiancare i Vostri approvvigionamenti:\n\n1. **Gamma tecnica trattata:** forniamo direttamente {PRODOTTI_COMPATTI}, completi di marcatura CE e schede tecniche.\n2. **Verifica autonoma dei netti (senza impegno):** su {LOGIN_URL} (utente provvisorio `{USERNAME}`, password `{TEMP_PASSWORD}`) e nell’estratto PDF {OFFER_URL} potete controllare giacenze reali e prezzi con {CONDIZIONE_BREVE}.\n3. **Gestione commesse:** [TEMPI_RESA] e referente diretto per quotazioni su distinta materiali.\n\n[FRASE_DISPONIBILITA] [COME_RISPONDERE].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T037",
    "name": "F08.2 Flusso 1-2-3 — Sintesi Tecnica per Direzione & Acquisti",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "[OGG_RAPIDITA] — Tre punti operativi per {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sintetizziamo in tre passaggi l’offerta B2B di **Izzo Distribuzione S.r.l.**:\n\n1. **Unico fornitore multi-reparto:** {PRODOTTI_PROSA}.\n2. **Condizione d’ingresso trasparente:** {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\n3. **Consultazione immediata e gratuita:** accesso provvisorio non vincolante su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) ed estratto PDF su {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T038",
    "name": "F08.3 Flusso 1-2-3 — Prodotti, Elasticità Ordini e Verifica",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\npresentiamo in modo diretto il servizio all’ingrosso di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}:\n\n1) **Linee ad alta rotazione:** {PRODOTTI_COMPATTI}.\n2) **Massima elasticità negli acquisti:** [VANTAGGIO_ZERO_SCORTE], con {CONDIZIONE_BREVE}.\n3) **Strumenti di verifica già pronti:** prospetto PDF su {OFFER_URL} e accesso conoscitivo gratuito al portale {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T039",
    "name": "F08.4 Flusso 1-2-3 — Schema Esecutivo per Valutazione Fornitore",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Schema fornitura tecnica B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Riassumiamo in tre punti la proposta di fornitura diretta di **Izzo Distribuzione S.r.l.**:\n\n- **Punto 1 — Dotazioni e marchi:** {PRODOTTI_COMPATTI}.\n- **Punto 2 — Verifica prezzi senza impegno:** [ABBIAMO_ATTIVATO] un accesso gratuito su {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`) e un estratto PDF su {OFFER_URL}.\n- **Punto 3 — Condizioni applicate:** {CONDIZIONE_BREVE} e referente commerciale diretto {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T040",
    "name": "F08.5 Flusso 1-2-3 — Copertura Tecnica, Portale e Preventivi",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Riferimenti operativi B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo il Vostro ambito di attività {INCISO_CONTESTO_DB}, sottoponiamo **Izzo Distribuzione S.r.l.** attraverso tre elementi operativi:\n\n1. **Materiali per la Vostra operatività:** {PRODOTTI_PROSA}.\n2. **Accesso conoscitivo già attivo:** portale {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) + prospetto PDF {OFFER_URL}, predisposti gratuitamente per sola comodità di verifica.\n3. **Condizioni B2B chiare:** {CONDIZIONE_BREVE} e preventivi rapidi su commesse dedicate.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T041",
    "name": "F09.1 Doppio Canale — Modalità A Portale H24 / Modalità B Preventivo Diretto",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Due modalità per valutare Izzo Distribuzione S.r.l. — {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Presentiamo **Izzo Distribuzione S.r.l.** per la fornitura diretta di {PRODOTTI_COMPATTI}.\n\nPer valutare liberamente la nostra competitività potete scegliere la modalità più comoda per il Vostro ufficio acquisti:\n\n- **Modalità A — Consultazione autonoma H24 (gratuita e non vincolante):** potete entrare su {LOGIN_URL} con utente provvisorio `{USERNAME}` e password `{TEMP_PASSWORD}` (oppure aprire l’estratto PDF {OFFER_URL}), verificando giacenze reali e prezzi netti già calcolati con {CONDIZIONE_BREVE}.\n- **Modalità B — Quotazione diretta su distinta:** potete rispondere a questa email o scrivere su WhatsApp al {AGENT_PHONE} allegando una lista materiali per ricevere un’offerta dedicata dal referente commerciale.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T042",
    "name": "F09.2 Doppio Canale — Area Digitale Riservata & Canale Project/Commessa",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Portale B2B e ufficio preventivi per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, sottoponiamo il servizio B2B di **Izzo Distribuzione S.r.l.** sulle linee {PRODOTTI_PROSA}.\n\nMettiamo a Vostra disposizione due canali operativi complementari:\n\n**Canale Digitale Riservato:** accesso conoscitivo gratuito su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) + selezione PDF {OFFER_URL}, con {CONDIZIONE_BREVE}.\n**Canale Commesse & Capitolati:** assistenza diretta del nostro ufficio commerciale {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T043",
    "name": "F09.3 Doppio Canale — Verifica Self-Service vs Ufficio Gare/Acquisti",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Approvvigionamento B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} **Izzo Distribuzione S.r.l.** propone un canale diretto su {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\nPotete verificare le nostre condizioni in due modi:\n1. **Autonomamente a portale (senza impegno):** login su {LOGIN_URL} con credenziali provvisorie `{USERNAME}` / `{TEMP_PASSWORD}` o lettura del PDF {OFFER_URL} ({CONDIZIONE_BREVE}).\n2. **Tramite ufficio preventivi:** invio del computo o distinta materiali ai recapiti in firma per quotazione dedicata, [DESTINAZIONE_FLESSIBILE].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T044",
    "name": "F09.4 Doppio Canale — Confronto Prezzi Online o Contatto col Referente",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Confronto listini ingrosso B2B per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nconoscendo l’attività svolta dalla Vostra azienda {INCISO_CONTESTO_DB}, **Izzo Distribuzione S.r.l.** sottopone la propria piattaforma all’ingrosso su {PRODOTTI_COMPATTI}.\n\n• **Per una verifica self-service immediata:** abbiamo predisposto gratuitamente utente `{USERNAME}` e password `{TEMP_PASSWORD}` su {LOGIN_URL}, oltre al prospetto PDF {OFFER_URL}, già valorizzati con {CONDIZIONE_BREVE}.\n• **Per un confronto diretto con il referente:** potete contattarci telefonicamente o su WhatsApp al {AGENT_PHONE} {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T045",
    "name": "F09.5 Doppio Canale — Giacenze a Video H24 + Offerte su Misura",
    "angleGroup": "Valutazione_Listino_B2B",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Canale B2B e quotazioni su distinta — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Con **Izzo Distribuzione S.r.l.** uniamo operatività digitale e supporto umano diretto su {PRODOTTI_PROSA}:\n\n- **Area B2B H24 (accesso conoscitivo gratuito):** su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e nel PDF {OFFER_URL} potete controllare disponibilità effettive e netti con {CONDIZIONE_BREVE};\n- **Ufficio Preventivi B2B:** trasmettendoci una distinta articoli, elaboriamo rapidamente un’offerta riservata.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T046",
    "name": "F10.1 Attacco Tecnico — Compatibilità Installativa & Impatto sul Margine",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Compatibilità tecnica e listino B2B per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nnelle forniture tecniche professionali — {INCISO_CONTESTO_DB} — l’affidabilità costruttiva dei materiali e la tenuta dei prezzi netti determinano gran parte del margine operativo.\n\n**Izzo Distribuzione S.r.l.** distribuisce all’ingrosso {PRODOTTI_PROSA}, tutte linee provviste di certificazione CE e schede tecniche scaricabili.\n\nPer verificare la resa economica sui Vostri codici abituali senza alcun impegno ({CONDIZIONE_BREVE}), lasciamo attivo un profilo conoscitivo:\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T047",
    "name": "F10.2 Attacco Tecnico — Continuità di Stock & Schede Prodotto CE",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "[OGG_RAPIDITA] certificati CE — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nper le strutture operative {INCISO_CONTESTO_DB}, la continuità di stock su materiali certificati è essenziale quanto la competitività dei listini d’acquisto.\n\nCon **Izzo Distribuzione S.r.l.** rendiamo immediatamente approvvigionabili a listino B2B:\n{LINEE_PRODOTTI_IZZO}\n\nAccesso provvisorio gratuito per riscontro tecnico ed economico ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[FRASE_DISPONIBILITA] anche per quotazioni su distinte ricorrenti. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T048",
    "name": "F10.3 Attacco Tecnico — Standard Qualitativo & Filiera Diretta",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Linee professionali certificate B2B per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Nella selezione dei materiali tecnici, **Izzo Distribuzione S.r.l.** opera [EQUIVALENZA_TECNICA], mettendo a disposizione a listino diretto {PRODOTTI_PROSA}.\n\nPer esaminare schede e prezzi netti senza registrazioni né impegni ({CONDIZIONE_BREVE}), trovate un profilo provvisorio attivo su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e un prospetto PDF su {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T049",
    "name": "F10.4 Attacco Tecnico — Sostenibilità Budget & Conformità Normativa",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Forniture certificate CE e listini netti per {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nnei lavori e negli approvvigionamenti seguiti da realtà come {COMPANY_NAME} — {INCISO_CONTESTO_DB} — coniugare conformità normativa e sostenibilità del budget richiede linee affidabili a filiera corta.\n\nDa **Izzo Distribuzione S.r.l.** supportiamo gli operatori B2B su {PRODOTTI_COMPATTI}, [CONFORMITA_QUALITA].\n\nRiferimenti conoscitivi gratuiti per consultazione schede e listini netti ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T050",
    "name": "F10.5 Attacco Tecnico — Dettaglio 3 Direttrici Tecniche + Accesso Compatto",
    "angleGroup": "Gamma_Tecnica_Completa",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Gamma tecnica e quotazioni nette B2B — {COMPANY_NAME} | Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sul portale B2B di **Izzo Distribuzione S.r.l.** articoliamo l’assortimento dedicato al Vostro settore su tre direttrici principali:\n{LINEE_PRODOTTI_IZZO}\n\nPotete riscontrare direttamente i prezzi netti ({CONDIZIONE_BREVE}) tramite l’accesso gratuito su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) o l’estratto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T051",
    "name": "F11.1 PDF in Apertura — Trasmissione Prospetto PDF + Estensione Portale",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Trasmissione estratto catalistino PDF B2B — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\ntrasmettiamo all’attenzione del Vostro ufficio acquisti il collegamento diretto a un estratto illustrativo in PDF del nostro catalistino B2B, già valorizzato per la Vostra categoria:\n**Estratto PDF riservato:** {OFFER_URL}\n\nSiamo **Izzo Distribuzione S.r.l.** e, {INCISO_CONTESTO_DB}, proponiamo la nostra distribuzione all’ingrosso su {PRODOTTI_PROSA}.\n\nQualora oltre al PDF desideraste consultare l’intero catalogo con giacenze in tempo reale ({CONDIZIONE_BREVE}), lasciamo attivo gratuitamente e senza vincoli anche l’accesso a {LOGIN_URL} con utente `{USERNAME}` e password `{TEMP_PASSWORD}`.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T052",
    "name": "F11.2 PDF in Apertura — Doppio Riferimento Listino / Netto in PDF",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Prospetto PDF prezzi netti ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nmettiamo a disposizione del Vostro responsabile acquisti una selezione sintetica in formato PDF degli articoli ad alta rotazione con doppio riferimento listino ufficiale e prezzo netto riservato:\n{OFFER_URL}\n\n{FRASE_CONTESTO_DB} **Izzo Distribuzione S.r.l.** opera come fornitore diretto su {PRODOTTI_COMPATTI}, [VANTAGGIO_ZERO_SCORTE].\n\nL’intero catalogo resta inoltre consultabile senza impegno su {LOGIN_URL} (utente provvisorio `{USERNAME}`, password `{TEMP_PASSWORD}`, {CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T053",
    "name": "F11.3 PDF in Apertura — Riscontro Immediato Senza Login Obbligatorio",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Selezione PDF catalogo B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nper offrirVi un riscontro visivo ed economico immediato anche senza effettuare subito il login, abbiamo raccolto in un prospetto PDF dedicato a {COMPANY_NAME} una sintesi delle nostre linee:\n{OFFER_URL}\n\nCon **Izzo Distribuzione S.r.l.** — {INCISO_CONTESTO_DB} — affianchiamo gli operatori professionali su {PRODOTTI_PROSA}.\n\nPer verificare tutte le referenze a catalogo ({CONDIZIONE_BREVE}), potete utilizzare liberamente anche le credenziali conoscitive `{USERNAME}` / `{TEMP_PASSWORD}` su {LOGIN_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T054",
    "name": "F11.4 PDF in Apertura — Nota di Trasmissione Documentale B2B",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Estratto PDF forniture tecniche B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\ninviamo per opportuna conoscenza del Vostro ufficio acquisti il prospetto PDF riepilogativo delle linee distribuite da **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}:\n{OFFER_URL}\n\n{FRASE_CONTESTO_DB} Trattiamo direttamente {PRODOTTI_COMPATTI}.\n\nA completamento del PDF, lasciamo attivo a titolo puramente conoscitivo anche l’ingresso al portale completo {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`), già configurato con {CONDIZIONE_BREVE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T055",
    "name": "F11.5 PDF in Apertura — Download Diretto Prospetto + Ricerca Codici Online",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Prospetto PDF listino B2B riservato a {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nrendiamo direttamente scaricabile al collegamento {OFFER_URL} un estratto del nostro catalistino B2B con prezzi netti riservati alle Partite IVA.\n\n{INCISO_CONTESTO_DB}, **Izzo Distribuzione S.r.l.** garantisce disponibilità su {PRODOTTI_PROSA}.\n\nPer ricercare singoli codici e schede tecniche sul portale integrale ({CONDIZIONE_BREVE}), potete accedere senza impegno a {LOGIN_URL} con `{USERNAME}` / `{TEMP_PASSWORD}`.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T056",
    "name": "F12.1 Secondo Fornitore — Parametro Oggettivo di Confronto Acquisti",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Affiancamento secondo fornitore B2B per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nnelle aziende strutturate — {INCISO_CONTESTO_DB} — disporre di un secondo fornitore indipendente oltre ai grossisti storici consente di avere un parametro oggettivo sui prezzi netti e di proteggere la marginalità sui materiali ad alta rotazione.\n\nÈ con questa logica che presentiamo **Izzo Distribuzione S.r.l.**: non chiediamo esclusive né volumi minimi annui, ma mettiamo a disposizione una filiera distributiva diretta su {PRODOTTI_PROSA}.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T057",
    "name": "F12.2 Secondo Fornitore — Difesa del Margine Operativo",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Diversificazione fornitori B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Oggi difendere il margine operativo significa affiancare ai canali tradizionali linee professionali certificate con listino riservato alle sole Partite IVA e forte competitività d’acquisto.\n\n**Izzo Distribuzione S.r.l.** lavora esattamente in questo spazio, distribuendo {PRODOTTI_PROSA}, [VANTAGGIO_ZERO_SCORTE].\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T058",
    "name": "F12.3 Secondo Fornitore — Canale Integrativo Senza Vincoli di Volume",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Canale integrativo forniture B2B per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, sottoponiamo **Izzo Distribuzione S.r.l.** come fornitore integrativo da affiancare in piena libertà ai Vostri attuali riferimenti commerciali.\n\nQuando occorre contenere il costo medio di approvvigionamento mantenendo piena certificazione CE, le linee distribuite a nostro catalogo ({PRODOTTI_COMPATTI}) offrono un rapporto qualità/prezzo netto immediatamente misurabile.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T059",
    "name": "F12.4 Secondo Fornitore — Riduzione Dispersione su Fornitori Multipli",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Fornitore B2B complementare per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Nella gestione acquisti, disporre di un canale B2B diretto che raggruppa più famiglie tecniche evita dispersioni su fornitori diversi e riduce l’incidenza sui costi di commessa e di magazzino.\n\n**Izzo Distribuzione S.r.l.** serve operatori professionali in tutta Italia su {PRODOTTI_COMPATTI}, [DESTINAZIONE_FLESSIBILE].\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T060",
    "name": "F12.5 Secondo Fornitore — Alternativa Snella su Materiali Ricorrenti",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Secondo riferimento B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nproponiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB} quale secondo fornitore B2B snello per tutta la componentistica di impiego ricorrente: {PRODOTTI_PROSA}.\n\nSenza alcuna formalità né vincolo, potete confrontare i nostri prezzi netti ({CONDIZIONE_BREVE}) entrando su {LOGIN_URL} con `{USERNAME}` / `{TEMP_PASSWORD}` o consultando il PDF sintetico {OFFER_URL}. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T061",
    "name": "F13.1 Mappa Reparti — Riepilogo Merceologico + Filetto Credenziali",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Riepilogo reparti e listino ingrosso B2B per {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, presentiamo in sintesi i reparti coperti all’ingrosso da **Izzo Distribuzione S.r.l.**:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{CREDENZIALI_FILETTO}\n\n[FRASE_DISPONIBILITA] per qualsiasi approfondimento commerciale.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T062",
    "name": "F13.2 Mappa Reparti — Copertura Diretta per Comparto + Divisorio",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Linee tecniche B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Riassumiamo la copertura diretta garantita dal catalogo B2B di **Izzo Distribuzione S.r.l.**:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{CREDENZIALI_FILETTO}\n\n[QUOTAZIONI_SU_COMMESSA].\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T063",
    "name": "F13.3 Mappa Reparti — Unico Canale B2B su Tre Famiglie + Filetto",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Forniture B2B multi-famiglia per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nper supportare in un unico canale B2B l’operatività di {COMPANY_NAME} — {INCISO_CONTESTO_DB} — **Izzo Distribuzione S.r.l.** raggruppa le seguenti famiglie di consumo quotidiano:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{CREDENZIALI_FILETTO}\n\n[FRASE_DISPONIBILITA] anche per preventivi su distinta. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T064",
    "name": "F13.4 Mappa Reparti — Quadro Sinottico Marchi + Accesso Sotto Filetto",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Quadro linee e marchi B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Sintetizziamo qui sotto le linee professionali distribuite da **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T065",
    "name": "F13.5 Mappa Reparti — Unificazione Ordini B2B + Riferimenti Essenziali",
    "angleGroup": "Catalogo_Illustrativo_PDF",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Fornitura accentrata B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, **Izzo Distribuzione S.r.l.** consente di unificare in un solo ordine B2B più famiglie merceologiche certificate CE:\n\n{PRODOTTI_MATRICE_REPARTI}\n\n{CREDENZIALI_FILETTO}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T066",
    "name": "F14.1 Logistica & Zero Minimo — Consegne in Sede o Cantiere",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Consegne tracciate in sede o cantiere senza minimo d’ordine — {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nquando si gestiscono più commesse o riassortimenti — {INCISO_CONTESTO_DB} — poter ordinare anche singole integrazioni senza vincoli di importo minimo e con recapito diretto presso la sede o l’area lavori semplifica concretamente l’operatività.\n\n**Izzo Distribuzione S.r.l.** opera su tutto il territorio nazionale dal proprio polo distributivo di Benevento, fornendo a listino B2B {PRODOTTI_PROSA}.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T067",
    "name": "F14.2 Logistica & Zero Minimo — Riassortimento Snello Senza Immobilizzo Scorte",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Forniture B2B anche a colli frazionati senza minimo — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Mantenere coperti i fabbisogni operativi senza immobilizzare capitale in lotti minimi sovradimensionati è un vantaggio gestionale immediato.\n\nCon **Izzo Distribuzione S.r.l.** potete approvvigionare liberamente — [ZERO_MINIMO_ORDINE] — {PRODOTTI_COMPATTI}, [TEMPI_RESA].\n\nAbbiamo predisposto per Vostra comodità un profilo gratuito di sola consultazione ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T068",
    "name": "F14.3 Logistica & Zero Minimo — Resa Flessibile & Stock Verificabile",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Forniture B2B con resa diretta e stock online — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nsegnaliamo l’organizzazione logistica e commerciale di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB} per l’approvvigionamento di {PRODOTTI_COMPATTI}.\n\nGestiamo spedizioni tracciate sia presso il Vostro magazzino sia direttamente presso destinazioni esterne di cantiere, senza imporre minimi d’ordine e con verifica in tempo reale delle quantità effettivamente presenti a stock.\n\nPotete esaminare liberamente catalogo e prezzi netti ({CONDIZIONE_BREVE}) su {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) o tramite il prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T069",
    "name": "F14.4 Logistica & Zero Minimo — Approvvigionamenti Calibrati per Commessa",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Logistica B2B e listino riservato per {COMPANY_NAME} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Ogni commessa richiede forniture calibrate per stato d’avanzamento lavori senza appesantire il deposito aziendale.\n\n**Izzo Distribuzione S.r.l.** affianca le aziende con spedizioni tracciate in tutta Italia e zero minimo d’ordine su {PRODOTTI_PROSA}.\n\nPer consultare in autonomia le condizioni riservate ({CONDIZIONE_BREVE}), riportiamo i riferimenti conoscitivi gratuiti:\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T070",
    "name": "F14.5 Logistica & Zero Minimo — Giacenze Fisiche Visibili Prima dell’Ordine",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "executive_card",
    "subjectTemplate": "Giacenze verificabili online e forniture senza minimo — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nper chi pianifica acquisti tecnici — {INCISO_CONTESTO_DB} — sapere prima della conferma d’ordine quali quantità sono effettivamente disponibili a magazzino evita fermi operativi e attese impreviste.\n\nSul portale B2B di **Izzo Distribuzione S.r.l.** ogni articolo ({PRODOTTI_COMPATTI}) espone in tempo reale sia la giacenza fisica sia il prezzo netto riservato, [ZERO_MINIMO_ORDINE].\n\nPotete verificarlo direttamente e senza impegno su {LOGIN_URL} con le credenziali provvisorie `{USERNAME}` / `{TEMP_PASSWORD}` (estratto PDF su {OFFER_URL}, già allineato a {CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T071",
    "name": "F15.1 Archivio Fornitori — Nota da Protocollare per Future Consultazioni",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Riferimenti B2B per archivio fornitori — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\ninviamo una sintetica nota conoscitiva affinché possiate, ove ritenuto utile, registrare i riferimenti di **Izzo Distribuzione S.r.l.** nell’archivio fornitori consultato da {COMPANY_NAME} {INCISO_CONTESTO_DB}.\n\nOperiamo nella distribuzione all’ingrosso B2B di {PRODOTTI_PROSA}, supportando le aziende sia in fase di preventivazione sia in fase esecutiva.\n\nLasciamo a Vostro riferimento un accesso gratuito e non vincolante al portale B2B {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e il prospetto PDF {OFFER_URL}, valorizzati con {CONDIZIONE_BREVE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T072",
    "name": "F15.2 Archivio Fornitori — Rubrica Ufficio Acquisti Senza Scadenze",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Nota informativa per rubrica fornitori B2B — {COMPANY_NAME}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\ntrasmettiamo i recapiti commerciali di **Izzo Distribuzione S.r.l.** perché restino a disposizione del Vostro ufficio acquisti — {INCISO_CONTESTO_DB} — in occasione dei prossimi confronti fornitori.\n\nTrattiamo all’ingrosso con listino riservato alle Partite IVA {PRODOTTI_COMPATTI}. Quando vorrete esaminare catalogo e prezzi netti senza registrazioni né impegni, potrete utilizzare l’utenza provvisoria `{USERNAME}` / `{TEMP_PASSWORD}` su {LOGIN_URL} oppure il documento PDF {OFFER_URL} ({CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T073",
    "name": "F15.3 Archivio Fornitori — Presentazione Societaria per Albo Interno",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Presentazione societaria per albo fornitori — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo la presentazione istituzionale di **Izzo Distribuzione S.r.l.** per un eventuale inserimento tra i fornitori consultabili dalla Vostra struttura.\n\nLa nostra piattaforma B2B riunisce {PRODOTTI_PROSA}. A solo scopo conoscitivo restano attive per la Vostra azienda le credenziali gratuite `{USERNAME}` / `{TEMP_PASSWORD}` su {LOGIN_URL} e l’estratto PDF {OFFER_URL} ({CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T074",
    "name": "F15.4 Archivio Fornitori — Riferimenti Agli Atti Ufficio Tecnico-Acquisti",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Riferimenti commerciali B2B Izzo Distribuzione S.r.l. — c.a. {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nlasciamo agli atti del Vostro ufficio tecnico-acquisti i riferimenti diretti di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, quale distributore all’ingrosso su {PRODOTTI_COMPATTI}.\n\nSenza alcuna scadenza né impegno d’acquisto, qualora in occasione di una prossima commessa voleste confrontare le nostre quotazioni nette ({CONDIZIONE_BREVE}), trovate già predisposti l’accesso provvisorio a {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e il prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T075",
    "name": "F15.5 Archivio Fornitori — Contatti Diretti per Futuri Approvvigionamenti",
    "angleGroup": "Fornitore_Alternativo",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Contatti fornitore B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Inviamo i riferimenti di **Izzo Distribuzione S.r.l.** quale potenziale fornitore da tenere in rubrica {SCOPO_FORNITURA_SETTORE}: {PRODOTTI_COMPATTI}.\n\nPer ogni eventuale verifica futura dei listini netti B2B ({CONDIZIONE_BREVE}), restano disponibili gratuitamente utente `{USERNAME}` e password `{TEMP_PASSWORD}` su {LOGIN_URL} oltre al PDF sintetico {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T076",
    "name": "F16.1 Scenario di Mestiere — Esigenza Reale di Comparto & Soluzione B2B",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Continuità forniture e prezzi netti B2B — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{SCENARIO_MESTIERE_SETTORE}\n\n**Izzo Distribuzione S.r.l.** risponde a questa esigenza con una fornitura B2B diretta su {PRODOTTI_PROSA}, completi di certificazione CE e schede tecniche scaricabili.\n\nPer un controllo autonomo e non vincolante dei prezzi netti ({CONDIZIONE_BREVE}), potete entrare su {LOGIN_URL} con `{USERNAME}` / `{TEMP_PASSWORD}` o aprire il prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T077",
    "name": "F16.2 Scenario di Mestiere — Tutela Marginalità su Linee Riservate P.IVA",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Linee professionali riservate Partite IVA per {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\nCon **Izzo Distribuzione S.r.l.** mettiamo a disposizione degli operatori professionali {PRODOTTI_COMPATTI}, ordinabili [ZERO_MINIMO_ORDINE] e con spedizione tracciata in tutta Italia.\n\nRiferimenti conoscitivi gratuiti per verificare i netti ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T078",
    "name": "F16.3 Scenario di Mestiere — Competitività in Fase di Offerta/Commessa",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Ottimizzazione costi materiali B2B — {COMPANY_NAME} | Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\n**Izzo Distribuzione S.r.l.** fornisce direttamente {PRODOTTI_PROSA}. Lasciamo attivo gratuitamente e senza alcun vincolo il profilo provvisorio `{USERNAME}` / `{TEMP_PASSWORD}` su {LOGIN_URL} e il PDF {OFFER_URL} ({CONDIZIONE_BREVE}).\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T079",
    "name": "F16.4 Scenario di Mestiere — Accentramento Voci Frammentate",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Fornitura diretta B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{SCENARIO_MESTIERE_SETTORE}\n\nAccentrando queste forniture sul portale B2B di **Izzo Distribuzione S.r.l.** accedete direttamente a listini d’ingrosso su {PRODOTTI_COMPATTI}.\n\n{CREDENZIALI_PROSA}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T080",
    "name": "F16.5 Scenario di Mestiere — Pacchetto Completo ad Alto Margine",
    "angleGroup": "Presentazione_Fornitore",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_RAPIDITA] per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{SCENARIO_MESTIERE_SETTORE}\n\n**Izzo Distribuzione S.r.l.** affianca la Vostra operatività con {PRODOTTI_PROSA}, restando disponibile per quotazioni dedicate {CHIUSURA_SETTORE}.\n\nAccesso conoscitivo gratuito ({CONDIZIONE_BREVE}):\n{LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) — Selezione PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T081",
    "name": "F17.1 Tre Chiavi — Cosa Forniamo / Condizioni / Come Verificare",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Sintesi fornitura B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, riassumiamo senza preamboli la proposta di **Izzo Distribuzione S.r.l.**:\n\n**Cosa forniamo per il Vostro settore:** {PRODOTTI_COMPATTI}.\n**Condizioni commerciali:** listino riservato Partite IVA con {CONDIZIONE_BREVE} e [TEMPI_RESA].\n**Come verificare senza impegno:** portale {LOGIN_URL} (utente gratuito `{USERNAME}`, password `{TEMP_PASSWORD}`) oppure estratto PDF {OFFER_URL}.\n\n[FRASE_DISPONIBILITA] anche per quotazioni su distinta.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T082",
    "name": "F17.2 Tre Chiavi — Assortimento / Politica B2B / Accesso Gratuito",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Proposta ingrosso B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo in sintesi i riferimenti di **Izzo Distribuzione S.r.l.**:\n\n• **Assortimento trattato:** {PRODOTTI_COMPATTI}.\n• **Politica commerciale:** {CONDIZIONE_BREVE}, stock reale visibile online e referente dedicato.\n• **Accesso conoscitivo gratuito:** {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) + prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T083",
    "name": "F17.3 Tre Chiavi — Linee Disponibili / Vantaggio / Consultazione Libera",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Sintesi commerciale B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\nconoscendo l’operatività di {COMPANY_NAME} — {INCISO_CONTESTO_DB} — presentiamo **Izzo Distribuzione S.r.l.** in tre righe operative:\n\n- **Linee disponibili:** {PRODOTTI_COMPATTI}.\n- **Vantaggio d’ingresso:** {CONDIZIONE_BREVE} e preventivi dedicati su commessa.\n- **Consultazione libera e gratuita:** {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`) ed estratto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T084",
    "name": "F17.4 Tre Chiavi — Prodotti / Condizioni / Verifica Immediata",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Riepilogo fornitura B2B per {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nper supportare le attività svolte da {COMPANY_NAME} {INCISO_CONTESTO_DB}, ecco cosa mette a disposizione **Izzo Distribuzione S.r.l.**:\n\n**Prodotti:** {PRODOTTI_COMPATTI}.\n**Condizioni:** {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\n**Verifica immediata (gratuita e non vincolante):** {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) — PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T085",
    "name": "F17.5 Tre Chiavi — Gamma / Condizioni d’Acquisto / Sola Consultazione",
    "angleGroup": "Nota_Conoscitiva_Breve",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "compact_memo",
    "subjectTemplate": "Scheda rapida B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Riepiloghiamo in forma essenziale l’offerta all’ingrosso di **Izzo Distribuzione S.r.l.**:\n\n• **Gamma di comparto:** {PRODOTTI_PROSA}.\n• **Condizioni d’acquisto:** {CONDIZIONE_BREVE}, quotazioni su capitolato o distinta.\n• **Accesso di sola consultazione:** {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T086",
    "name": "F18.1 Monoparagrafo + Filetto — Blocco Unico Denso & Chiusura Separata",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Presentazione B2B Izzo Distribuzione S.r.l. — c.a. {COMPANY_NAME}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{INCISO_CONTESTO_DB}, sottoponiamo **Izzo Distribuzione S.r.l.** quale fornitore B2B diretto per l’approvvigionamento di {PRODOTTI_PROSA}, restando disponibili anche per quotazioni dedicate su specifica distinta di commessa o magazzino.\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T087",
    "name": "F18.2 Monoparagrafo + Filetto — Ingrosso Senza Minimi + Riga Divisoria",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Ingrosso B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Presentiamo **Izzo Distribuzione S.r.l.** per la fornitura all’ingrosso — [VANTAGGIO_ZERO_SCORTE] — di {PRODOTTI_COMPATTI}, tutti corredati da certificazione CE e spedizione tracciata su scala nazionale.\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T088",
    "name": "F18.3 Monoparagrafo + Filetto — Giacenze Reali & Preventivi + Filetto",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Forniture tecniche B2B per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, **Izzo Distribuzione S.r.l.** propone la propria piattaforma B2B per la fornitura diretta di {PRODOTTI_PROSA}, con giacenze reali verificabili online e supporto diretto dell’ufficio commerciale {CHIUSURA_SETTORE}.\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T089",
    "name": "F18.4 Monoparagrafo + Filetto — Unico Portale B2B + Consegne Flessibili",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_TIPO_DOC] — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\noperando a supporto delle realtà del Vostro comparto — {INCISO_CONTESTO_DB} — **Izzo Distribuzione S.r.l.** consente di approvvigionare in un unico portale B2B {PRODOTTI_COMPATTI}, [DESTINAZIONE_FLESSIBILE].\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T090",
    "name": "F18.5 Monoparagrafo + Filetto — Riferimento Tecnico-Commerciale Diretto",
    "angleGroup": "Supporto_Aziende_Territorio",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Riferimento B2B e listini netti — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sottoponiamo **Izzo Distribuzione S.r.l.** quale riferimento tecnico-commerciale {SCOPO_FORNITURA_SETTORE} sulle linee {PRODOTTI_COMPATTI}, affiancando portale digitale e referente dedicato.\n\n{CREDENZIALI_FILETTO}\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T091",
    "name": "F19.1 Taglio Analitico — Calcolo Netto Effettivo da Listino ({NET_DISCOUNT_PCT}%)",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Confronto analitico prezzi netti B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\nsottoponiamo a {COMPANY_NAME} — {INCISO_CONTESTO_DB} — i parametri economici riservati da **Izzo Distribuzione S.r.l.** ai {LISTINO_RUOLO}: listino B2B con sconto base {BASE_DISCOUNT}% integrato da un ulteriore {EXTRA_DISCOUNT}% in cascata sul primo eventuale ordine di fornitura (pari al {NET_DISCOUNT_PCT}% netto effettivo da listino ufficiale), applicato automaticamente a video [ZERO_MINIMO_ORDINE].\n\nLa scontistica opera sull’intera gamma in pronta disponibilità: {PRODOTTI_PROSA}.\n\nPer verificare codice per codice l’incidenza sui Vostri acquisti abituali senza alcun vincolo, potete accedere a {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) o esaminare l’estratto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T092",
    "name": "F19.2 Taglio Analitico — Sconto Primo Ordine + Stabilità Fascia Base {BASE_DISCOUNT}%",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Condizione B2B {DISCOUNT_FORMULA} a cascata ({NET_DISCOUNT_PCT}% netto) — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{FRASE_CONTESTO_DB} Per offrire al Vostro ufficio acquisti un riscontro numerico immediato, **Izzo Distribuzione S.r.l.** ha associato a un profilo conoscitivo gratuito la fascia **{DISCOUNT_FORMULA} a cascata** valida sul primo ordine eventuale (abbattimento netto effettivo del {NET_DISCOUNT_PCT}% da listino ufficiale), con successivo mantenimento stabile dello sconto base {BASE_DISCOUNT}% senza obblighi di fatturato né minimo d’ordine.\n\nPotete confrontare i prezzi finiti sulle linee {PRODOTTI_COMPATTI} sia dal prospetto PDF {OFFER_URL} sia direttamente sul portale {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`).\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T093",
    "name": "F19.3 Taglio Analitico — Listini Oscurati al Pubblico & Tutela Marginalità",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Listino netto riservato Partite IVA per {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{INCISO_CONTESTO_DB}, **Izzo Distribuzione S.r.l.** imposta la propria proposta su listini oscurati al pubblico privato e scontistica riservata **{DISCOUNT_FORMULA} in cascata** sul primo ordine eventuale, [ZERO_MINIMO_ORDINE].\n\nTale condizione consente un’elevata competitività d’acquisto su {PRODOTTI_PROSA}.\n\nAccesso provvisorio gratuito per verifica diretta dei prezzi netti: {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) — Estratto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T094",
    "name": "F19.4 Taglio Analitico — Confronto Codice per Codice Listino vs Netto",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Verifica netti B2B ({NET_DISCOUNT_PCT}% effettivo 1° ordine) — {COMPANY_NAME}",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{FRASE_CONTESTO_DB} Sul portale B2B di **Izzo Distribuzione S.r.l.** ogni articolo espone affiancati listino ufficiale, giacenza effettiva e prezzo netto calcolato con sconto 1° ordine **{DISCOUNT_FORMULA} a cascata** ({NET_DISCOUNT_PCT}% netto effettivo), senza minimo d’ordine.\n\nPotete testare direttamente l’incidenza economica su {PRODOTTI_COMPATTI} tramite le credenziali conoscitive gratuite `{USERNAME}` / `{TEMP_PASSWORD}` su {LOGIN_URL} o dal PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T095",
    "name": "F19.5 Taglio Analitico — Riduzione Costi di Commessa & Magazzino",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "accent_stripe",
    "subjectTemplate": "Ottimizzazione costi forniture B2B ({DISCOUNT_FORMULA}) — {INTESTAZIONE_OGGETTO}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\nacquistare direttamente a listino d’ingrosso B2B {PRODOTTI_COMPATTI} permette a una realtà strutturata come {COMPANY_NAME} — {INCISO_CONTESTO_DB} — di ridurre sensibilmente l’incidenza dei materiali su ogni commessa o riassortimento.\n\nCon **Izzo Distribuzione S.r.l.** beneficiate fin dall’eventuale primo ordine dello sconto riservato **{DISCOUNT_FORMULA} in cascata** ({NET_DISCOUNT_PCT}% netto) senza alcun minimo d’ordine, [DESTINAZIONE_FLESSIBILE].\n\nRiferimenti gratuiti e non vincolanti per controllo listini: {LOGIN_URL} (`{USERNAME}` / `{TEMP_PASSWORD}`) e prospetto PDF {OFFER_URL}.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T096",
    "name": "F20.1 Territoriale Prosa — Lettera Fluida su Città/Provincia e Settore",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Presentazione fornitore B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{CONTESTO_TERRITORIO_FALLBACK} Distribuiamo su tutto il territorio nazionale {PRODOTTI_PROSA}, accompagnati da certificazione CE e schede tecniche.\n\n{CREDENZIALI_PROSA} [FRASE_DISPONIBILITA] anche per quotazioni dirette su distinta materiali.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T097",
    "name": "F20.2 Territoriale Flash — Nota Breve 6 Righe per Operatori Locali",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_UFFICIO] {COMPANY_NAME},\n\n{CONTESTO_TERRITORIO_FALLBACK} Trattiamo a listino diretto {PRODOTTI_COMPATTI}.\n\nPer consultare liberamente schede tecniche e listini netti ({CONDIZIONE_BREVE}):\n{CREDENZIALI_RIGA_FLASH}\n\n[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}. [SALUTO_CHIUSURA]"
  },
  {
    "code": "T098",
    "name": "F20.3 Territoriale 1ª Persona — Daniele Savoia per Aziende del Territorio",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Riferimento diretto ingrosso B2B — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_UMANO_1A1}\n\nsono {AGENT_NAME} dell’ufficio commerciale B2B di **Izzo Distribuzione S.r.l.** Seguiamo diverse realtà professionali su {CITY} e Vi scrivo direttamente per sottoporre alla Vostra valutazione il nostro catalogo all’ingrosso su {PRODOTTI_COMPATTI}.\n\nPer permetterVi di dare uno sguardo ai prezzi netti senza alcun impegno e [ZERO_MINIMO_ORDINE], ho attivato un accesso conoscitivo gratuito su {LOGIN_URL} con utente `{USERNAME}` e password `{TEMP_PASSWORD}`, affiancato da una sintesi in PDF su {OFFER_URL} ({CONDIZIONE_BREVE}).\n\nPer qualsiasi informazione potete rispondermi qui o chiamarmi direttamente al numero in firma.\n\n[SALUTO_CHIUSURA]"
  },
  {
    "code": "T099",
    "name": "F20.4 Territoriale con P.S. — Presentazione Sobria + Accesso nel P.S.",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "[OGG_RAPIDITA] — {COMPANY_NAME}{CITY_PAREN} | Izzo Distribuzione S.r.l.",
    "bodyTemplate": "[SALUTO_AZIENDA] {COMPANY_NAME},\n\n{CONTESTO_TERRITORIO_FALLBACK} Riforniamo direttamente gli operatori con Partita IVA su {PRODOTTI_PROSA}, operando con spedizioni tracciate anche direttamente su cantiere e referente commerciale dedicato per quotazioni su commessa.\n\n[SALUTO_CHIUSURA]\n\n{CREDENZIALI_PS}"
  },
  {
    "code": "T100",
    "name": "F20.5 Territoriale 1-2-3 — Schema in Tre Punti per Libera Valutazione",
    "angleGroup": "Sconto_Benvenuto_Prova",
    "targetCategory": "ALL",
    "htmlLayoutVariant": "plain_personal",
    "subjectTemplate": "Canale B2B forniture tecniche — {COMPANY_NAME}{CITY_PAREN}",
    "bodyTemplate": "{SALUTO_PERSONALIZZATO}\n\n{CONTESTO_TERRITORIO_FALLBACK} Sintetizziamo in tre punti i nostri riferimenti operativi per una Vostra libera valutazione quale fornitore:\n\n1. **Unico interlocutore B2B:** {PRODOTTI_COMPATTI}.\n2. **Condizioni trasparenti senza vincoli:** {CONDIZIONE_BREVE}, [DESTINAZIONE_FLESSIBILE].\n3. **Consultazione immediata e gratuita:** portale {LOGIN_URL} (utente `{USERNAME}`, password `{TEMP_PASSWORD}`) ed estratto PDF {OFFER_URL}.\n\n[FRASE_DISPONIBILITA] per eventuali preventivi su capitolato o distinta.\n\n[SALUTO_CHIUSURA]"
  }
];
