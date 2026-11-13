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
 * 100 Modelli di Email "Madri" Universali (T001 - T100) — Izzo Distribuzione S.r.l.
 * Tutte e 100 valide per qualsiasi categoria B2B (targetCategory: 'ALL'), con personalizzazione automatica
 * basata sui dati reali del DB (sito web, città/provincia, titolare verificato, specializzazioni, marchi rilevati,
 * storicità/certificazioni e direttrici tecniche Mapam, Marlanvil, Elmark, Stellar, Kombo Pro, Surelock, Omega, Penosil).
 * Registro professionale B2B asciutto, autorevole, senza formule servili, senza ripetizioni e senza sigle interne.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  {
    code: "T001",
    name: "Presentazione Diretta su Profilo Operativo Cliente",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Con la presente desideriamo sottoporre **Izzo Distribuzione S.r.l.** alla Vostra valutazione come fornitore diretto a listino B2B {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per consentirVi di consultare in autonomia catalogo, [STOCK_REALE] e prezzi netti riservati a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T002",
    name: "Presentazione Societaria Izzo & Aggancio Sito/Territorio",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Izzo Distribuzione S.r.l. — [OGG_RAPIDITA] [OGG_PER_AZIENDA] {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE], [QUALIFICA_DISTRIBUTORE] su [SETTORI_MERCEOLOGICI], {INCISO_CONTESTO_DB}.

Supportiamo {COMPANY_NAME} e gli operatori professionali {SCOPO_FORNITURA_SETTORE} attraverso le seguenti direttrici tecniche:
{LINEE_PRODOTTI_IZZO}

[CONNETTIVO_PRATICO] [ABBIAMO_PREPARATO] [LE_CREDENZIALI] per esaminare direttamente listini riservati e disponibilità sul portale B2B:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [COME_RISPONDERE] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T003",
    name: "Sottoposizione Fornitore B2B con Scheda Merceologica",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Forniture B2B [OGG_PER_AZIENDA] {INTESTAZIONE_OGGETTO} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

[VERBO_CONTATTARE] **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, per proporre la nostra struttura distributiva {SCOPO_FORNITURA_SETTORE}.

A catalogo B2B rendiamo immediatamente disponibili referenze [CONFORMITA_QUALITA] articolate su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T004",
    name: "Lettera Istituzionale Direzione Commerciale",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "{INTESTAZIONE_OGGETTO} — [OGG_APPROCCIO_SOFT]",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** opera su scala nazionale [FILOSOFIA_OPERATIVA], proponendosi a {COMPANY_NAME} {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per agevolare una verifica interna [AVVERBIO_LIBERAMENTE], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T005",
    name: "Presentazione Struttura Distributiva e Linee Specialistiche",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "[OGG_TIPO_DOC] — {COMPANY_NAME}{CITY_PAREN} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sottoponiamo alla valutazione di {COMPANY_NAME} il profilo di **Izzo Distribuzione S.r.l.**, {INCISO_CONTESTO_DB}.

Affianchiamo [TARGET_PROFESSIONALE] [COPERTURA_ITALIA], con particolare focalizzazione su:
{LINEE_PRODOTTI_IZZO}

Per verificare direttamente codici, schede e quotazioni nette riservate alle Partite IVA, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T006",
    name: "Profilo Fornitore Diretto Partite IVA",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. | [OGG_FORMULA_PROMO] — {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Come [IDENTITA_IZZO], operiamo nella fornitura diretta [VANTAGGIO_DIRETTO], presidiando per la Vostra operatività tre comparti principali:
{LINEE_PRODOTTI_IZZO}

Nell’ottica di consentirVi [CONFRONTARE_NETTI], riportiamo i riferimenti provvisori non vincolanti predisposti per {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T007",
    name: "Nota di Qualifica Fornitore B2B",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Qualifica fornitore B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

nell’ambito dell’ampliamento dei nostri partner professionali, Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Mettiamo a disposizione della Vostra azienda [GAMMA_SELEZIONATA] {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Ai fini di un riscontro diretto su assortimento e scontistica, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] unitamente a [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T008",
    name: "Presentazione Canale All’Ingrosso & Portale B2B",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "[OGG_RAPIDITA] — Presentazione Izzo Distribuzione S.r.l. per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Con **Izzo Distribuzione S.r.l.** uniamo fornitura diretta all’ingrosso e [CANALE_RISERVATO] [AFFIDABILITA_DATO_STOCK], coprendo in particolare:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T009",
    name: "Proposta di Inserimento Albo Fornitori Aziendale",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Alla c.a. Acquisti {COMPANY_NAME} — Presentazione Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

desideriamo sottoporre **Izzo Distribuzione S.r.l.** per un eventuale inserimento tra i fornitori consultabili dalla Vostra struttura, {INCISO_CONTESTO_DB}.

Il nostro catalogo B2B risponde alle esigenze operative {SCOPO_FORNITURA_SETTORE} con disponibilità verificabile su:
{LINEE_PRODOTTI_IZZO}

Per esaminare listini netti e documentazione tecnica senza passaggi formali di registrazione, [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T010",
    name: "Presentazione Operativa Nazionale con Focus Locale",
    angleGroup: "Presentazione_Fornitore",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Presentazione fornitore B2B Izzo Distribuzione S.r.l. — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Attraverso [NOSTRO_DEPOSITO] e la piattaforma B2B dedicata, **Izzo Distribuzione S.r.l.** supporta gli operatori con Partita IVA [COPERTURA_ITALIA] sulle seguenti famiglie tecniche:
{LINEE_PRODOTTI_IZZO}

Per consentirVi una valutazione oggettiva dei prezzi netti riservati a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T011",
    name: "Ufficio Acquisti — Verifica Immediata Netti Senza Attese",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Alla c.a. Ufficio Acquisti — {COMPANY_NAME} | Listino B2B Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

[ATTACCO_UFFICIO_ACQUISTI]. A tale scopo sottoponiamo **Izzo Distribuzione S.r.l.** quale potenziale partner {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per verificare a video quotazioni nette e giacenze effettive, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] affiancate da [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T012",
    name: "Confronto Oggettivo Prezzi Netti su Referenze Abituali",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Listino riservato B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

[ATTACCO_RIVENDITA]. Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Sulla nostra piattaforma B2B riservata alle Partite IVA rendiamo direttamente confrontabili i prezzi netti sulle linee:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T013",
    name: "Trasparenza Quotazioni B2B & Schede Tecniche CE",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Quotazioni nette B2B e catalogo tecnico per {COMPANY_NAME} — Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

In **Izzo Distribuzione S.r.l.** operiamo [FILOSOFIA_OPERATIVA], mettendo a disposizione di {COMPANY_NAME} articoli [CONFORMITA_QUALITA] su:
{LINEE_PRODOTTI_IZZO}

Per permetterVi di [CONFRONTARE_NETTI], [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T014",
    name: "Ottimizzazione Costi Approvvigionamento & Marginalità",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "[OGG_TIPO_DOC] — Condizioni B2B riservate a {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Proponiamo **Izzo Distribuzione S.r.l.** [DIFESA_COMPETITIVITA] sui materiali [RICAMBIO_COSTANTE]:
{LINEE_PRODOTTI_IZZO}

Ai fini di un controllo diretto delle condizioni economiche riservate a {COMPANY_NAME}, riportiamo i riferimenti provvisori di consultazione:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T015",
    name: "Verifica Autonoma Giacenze e Prezzi Finiti H24",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Consultazione listino B2B Izzo Distribuzione S.r.l. — {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Attraverso [IL_PORTALE_B2B] rendiamo verificabili H24 disponibilità reali e prezzi netti su:
{LINEE_PRODOTTI_IZZO}

Per agevolare una verifica autonoma [AVVERBIO_LIBERAMENTE], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T016",
    name: "Analisi Fornitori — Parametro Diretto di Confronto",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Riferimento listino B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Nell’ottica di offrire al Vostro ufficio acquisti un parametro trasparente di confronto {SCOPO_FORNITURA_SETTORE}, presentiamo le linee distribuite da **Izzo Distribuzione S.r.l.**:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T017",
    name: "Controllo Costi Commessa e Riassortimento",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Listino netto riservato e catalogo B2B — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

con riferimento agli approvvigionamenti tecnici di {COMPANY_NAME}, Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Presidiamo con filiera diretta B2B le referenze [ARTICOLI_ALTA_ROTAZIONE]:
{LINEE_PRODOTTI_IZZO}

Per consentirVi di [FUNZIONI_PORTALE], [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T018",
    name: "Piattaforma B2B Oscurata al Pubblico Privato",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Area B2B riservata Partite IVA per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** opera esclusivamente verso titolari di Partita IVA mediante [CANALE_RISERVATO], proponendo condizioni dirette d’ingrosso su:
{LINEE_PRODOTTI_IZZO}

Per visionare i listini netti oscurati al pubblico privato e [IL_CATALISTINO_PDF], riportiamo di seguito le credenziali provvisorie riservate a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T019",
    name: "Valutazione Economica Codice per Codice",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "[OGG_FORMULA_PROMO] — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Sottoponiamo **Izzo Distribuzione S.r.l.** alla Vostra struttura {INCISO_CONTESTO_DB}.

Il catalogo digitale e l’estratto PDF coprono in modo mirato:
{LINEE_PRODOTTI_IZZO}

Per verificare codice per codice l’incidenza dei nostri netti [AVVERBIO_LIBERAMENTE], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T020",
    name: "Sintesi Listini Diretti & Supporto Preventivi",
    angleGroup: "Valutazione_Listino_B2B",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Prospetto listini B2B Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Affianchiamo le aziende del settore con quotazioni B2B dirette [RAPPORTO_QUALITA_PREZZO] sulle seguenti famiglie:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T021",
    name: "Accesso Provvisorio per Evitare Registrazioni Manuali",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Accesso consultazione catalogo B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Presentiamo **Izzo Distribuzione S.r.l.** quale potenziale fornitore B2B {SCOPO_FORNITURA_SETTORE}, con assortimento focalizzato su:
{LINEE_PRODOTTI_IZZO}

Per evitarVi procedure di registrazione qualora voleste esaminare listini e disponibilità, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] ([NOTA_CAMBIO_PASSWORD]):

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T022",
    name: "Credenziali di Sola Consultazione per Ufficio Tecnico/Acquisti",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Credenziali consultazione B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, per sottoporre la nostra piattaforma di fornitura all’ingrosso.

All’interno del portale B2B sono immediatamente consultabili schede tecniche, certificazioni e prezzi netti su:
{LINEE_PRODOTTI_IZZO}

L’accesso sottostante ha carattere puramente conoscitivo e [CONSENTE_DI] [ORDINARE_AUTONOMIA]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T023",
    name: "Consultazione Diretta Giacenze & Prezzi su izzodistribuzione.it",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Portale B2B izzodistribuzione.it — Riferimenti per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Come **Izzo Distribuzione S.r.l.**, mettiamo a disposizione degli operatori professionali [CANALE_RISERVATO] [CERTEZZA_EVASIONE] sulle linee:
{LINEE_PRODOTTI_IZZO}

[CONNETTIVO_PRATICO] [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T024",
    name: "Profilo Ospite B2B Non Vincolante",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "[OGG_TIPO_DOC] | Accesso conoscitivo per {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sottoponiamo alla Vostra attenzione **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Supportiamo le forniture tecniche professionali {SCOPO_FORNITURA_SETTORE} con copertura diretta su:
{LINEE_PRODOTTI_IZZO}

[ACCESSO_SENZA_IMPEGNO]: riportiamo qui sotto i riferimenti per verificare direttamente catalogo e scontistica riservata:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T025",
    name: "Strumento Digitale B2B + Referente Commerciale Dedicato",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Catalogo digitale B2B e referente dedicato per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

In **Izzo Distribuzione S.r.l.** affianchiamo la rapidità di [IL_PORTALE_B2B] [CONTATTO_UMANO_VERO], presidiando per il Vostro settore:
{LINEE_PRODOTTI_IZZO}

Per consentirVi di testare la consultazione del portale [AVVERBIO_LIBERAMENTE], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T026",
    name: "Verifica Rapida Codici da Ufficio o Cantiere",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Consultazione listini B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Sul nostro portale B2B potete ricercare in tempo reale codici, disponibilità e prezzi netti relativi a:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T027",
    name: "Abilitazione Conoscitiva Gratuita Portale Ingrosso",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "[OGG_APPROCCIO_SOFT] — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Desideriamo far conoscere a {COMPANY_NAME} il servizio distributivo di **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Unicamente per agevolare una Vostra verifica interna di articoli e condizioni, [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T028",
    name: "Consultazione Autonoma Schede Tecniche e Giacenze",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Schede tecniche e listino B2B riservato — {COMPANY_NAME} | Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in merito alle forniture tecniche per la Vostra attività, Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Raccogliamo in un unico portale B2B referenze [CONFORMITA_QUALITA] su:
{LINEE_PRODOTTI_IZZO}

Per permetterVi di [FUNZIONI_PORTALE] senza alcun vincolo, riportiamo di seguito i dati provvisori di accesso:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T029",
    name: "Specchietto Accesso B2B per Valutazione Fornitore",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Riferimenti portale B2B Izzo Distribuzione S.r.l. per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Sottoponiamo **Izzo Distribuzione S.r.l.** quale partner distributivo B2B [VANTAGGIO_DIRETTO] sulle seguenti linee:
{LINEE_PRODOTTI_IZZO}

Per verificare in autonomia la convenienza del listino riservato a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T030",
    name: "Accesso Diretto Listini e Prospetto PDF",
    angleGroup: "Credenziali_Comodita",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Catalogo e credenziali consultazione B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] {INCISO_CONTESTO_DB}.

Operiamo nella fornitura all’ingrosso {SCOPO_FORNITURA_SETTORE}, con disponibilità immediata a portale su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T031",
    name: "Condizione Commerciale d’Ingresso Senza Minimo d’Ordine",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Condizioni B2B riservate a {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Proponiamo **Izzo Distribuzione S.r.l.** alla valutazione di {COMPANY_NAME} {SCOPO_FORNITURA_SETTORE}, con focus tecnico su:
{LINEE_PRODOTTI_IZZO}

Sul profilo di consultazione predisposto per la Vostra azienda [TROVA_ATTIVO] [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ([OCCHI_AL_NETTO] {NET_DISCOUNT_PCT}%) [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T032",
    name: "Scontistica a Cascata per Verifica Operativa Fornitore",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Listino B2B ({DISCOUNT_FORMULA}) per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, per sottoporre le nostre condizioni di fornitura B2B.

Distribuiamo direttamente per operatori con Partita IVA:
{LINEE_PRODOTTI_IZZO}

Per agevolare un confronto concreto dei prezzi netti e un’eventuale prima verifica operativa ([ZERO_MINIMO_ORDINE]), [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] con profilo scontistico {DISCOUNT_FORMULA} a cascata:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T033",
    name: "Fornitura Flessibile Anche a Colli Frazionati",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Forniture B2B senza minimo d’ordine per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Con **Izzo Distribuzione S.r.l.** gestiamo forniture tecniche [VANTAGGIO_ZERO_SCORTE], coprendo per la Vostra attività:
{LINEE_PRODOTTI_IZZO}

Per esaminare i prezzi finiti già calcolati con [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], riportiamo i riferimenti di consultazione B2B:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T034",
    name: "Inquadramento Sconto Base + Condizione Primo Ordine",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Listino riservato Partite IVA e condizioni 1° ordine — {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sottoponiamo alla Vostra valutazione **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Il nostro catalogo all’ingrosso presidia con continuità di stock:
{LINEE_PRODOTTI_IZZO}

Per i nuovi interlocutori B2B abbiamo previsto il profilo {DISCOUNT_FORMULA} ([SINTESI_DOPPIO_SCONTO]), già visibile accedendo con le credenziali conoscitive sottostanti:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T035",
    name: "Test Operativo su Singola Commessa o Riassortimento",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "[OGG_TIPO_DOC] — {INTESTAZIONE_OGGETTO} | Condizione 1° ordine {DISCOUNT_FORMULA}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Qualora voleste valutare **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}, mettiamo a disposizione pronta disponibilità su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

La condizione {DISCOUNT_FORMULA} è [MOTIVO_EXTRA_SCONTO], [DOPO_PRIMO_ORDINE]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T036",
    name: "Calcolo Automatico del Netto in Area Riservata",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Quotazioni nette B2B ({DISCOUNT_FORMULA}) riservate a {COMPANY_NAME} — Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Le quotazioni riservate riguardano in particolare:
{LINEE_PRODOTTI_IZZO}

Entrando sul portale con l’utenza provvisoria sottostante, lo sconto {DISCOUNT_FORMULA} risulta [AUTOMATISMO_CARRELLO], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T037",
    name: "Tutela Marginalità su Materiali ad Alta Rotazione",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Forniture ad alta marginalità per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** supporta gli operatori professionali [DIFESA_COMPETITIVITA] attraverso tre direttrici merceologiche:
{LINEE_PRODOTTI_IZZO}

Per verificare l’incidenza netta della scontistica {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% effettivo da listino) riservata a {COMPANY_NAME}, [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T038",
    name: "Proposta Lineare Senza Vincoli di Fatturato",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Presentazione commerciale B2B per {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

presentiamo alla Vostra struttura **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, quale fornitore diretto {SCOPO_FORNITURA_SETTORE}.

Trattiamo in pronta disponibilità presso [NOSTRO_DEPOSITO]:
{LINEE_PRODOTTI_IZZO}

A supporto di una valutazione libera e priva di vincoli di volume, riportiamo le credenziali di consultazione e la condizione riservata sul primo ordine:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T039",
    name: "Confronto Economico Immediato su Listino Riservato",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Confronto listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Per sottoporre concretamente la competitività di **Izzo Distribuzione S.r.l.** sulle referenze [RICAMBIO_COSTANTE], riepiloghiamo i comparti presidiati:
{LINEE_PRODOTTI_IZZO}

[ABBIAMO_ATTIVATO] [LE_CREDENZIALI] con valorizzazione netta {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T040",
    name: "Condizioni d’Ingrosso Dirette per Operatori Qualificati",
    angleGroup: "Sconto_Benvenuto_Prova",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Condizioni B2B all’attenzione di {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in relazione alle forniture tecniche per {COMPANY_NAME}, scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Mettiamo a disposizione condizioni d’ingrosso dirette [RAPPORTO_QUALITA_PREZZO] su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T041",
    name: "Invio Estratto Catalistino PDF per il Settore Cliente",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Estratto Catalistino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Per presentare in modo immediato l’assortimento di **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}, [ABBIAMO_SELEZIONATO] in un prospetto PDF le referenze più rappresentative su:
{LINEE_PRODOTTI_IZZO}

[INVITO_CLIC_PDF] [PUO_VISIONARE] [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF], affiancato dalle credenziali provvisorie per il catalogo integrale online:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T042",
    name: "Prospetto Illustrativo PDF per Ufficio Acquisti",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Alla c.a. Acquisti {COMPANY_NAME} | Prospetto PDF listino Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sottoponiamo alla Vostra attenzione **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Abbiamo predisposto [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF], focalizzato sulle linee tecniche di Vostro interesse:
{LINEE_PRODOTTI_IZZO}

Di seguito riportiamo il collegamento diretto al PDF e l’accesso provvisorio non vincolante a [IL_PORTALE_B2B]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T043",
    name: "Selezione PDF Prezzi Netti + Portale Completo",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Prospetto prodotti e prezzi netti B2B — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Come **Izzo Distribuzione S.r.l.**, rendiamo disponibile per {COMPANY_NAME} una sintesi illustrativa in PDF [OLTRE_AL_PDF], articolata su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T044",
    name: "Prontuario Rapido PDF per Confronto Quotazioni",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Estratto listino PDF riservato a {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_RIVENDITA]. Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Per consentire una prima verifica rapida anche senza effettuare subito l’accesso al portale, condividiamo [IL_CATALISTINO_PDF] relativo a:
{LINEE_PRODOTTI_IZZO}

Nello specchietto seguente trovate sia il link per [PUO_SCARICARE_PDF] sia [LE_CREDENZIALI] per il portale B2B:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T045",
    name: "Documentazione Catalogo B2B per Archivio Fornitori",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Documentazione catalogo e listino B2B — {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Trasmettiamo a beneficio del Vostro archivio fornitori i riferimenti di **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Potete [PUO_SCARICARE_PDF] o consultare l’intera anagrafica articoli online mediante i riferimenti provvisori qui sotto:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T046",
    name: "Panoramica Tecnica in PDF & Disponibilità in Tempo Reale",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "[OGG_TIPO_DOC] e prospetto PDF [OGG_PER_AZIENDA] {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

nell’ottica di sottoporre **Izzo Distribuzione S.r.l.** come fornitore B2B per {COMPANY_NAME}, Vi scriviamo {INCISO_CONTESTO_DB}.

Abbiamo riunito nel prospetto PDF e sul portale online le famiglie tecniche [ARTICOLI_ALTA_ROTAZIONE]:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T047",
    name: "Estratto Merceologico Valorizzato al Netto Riservato",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Catalistino illustrativo B2B riservato a {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Per mostrare con trasparenza il posizionamento economico di **Izzo Distribuzione S.r.l.**, abbiamo preparato [IL_CATALISTINO_PDF] già calcolato col profilo riservato a {COMPANY_NAME} sulle linee:
{LINEE_PRODOTTI_IZZO}

Riportiamo di seguito il link diretto al documento PDF e [LE_CREDENZIALI] per [IL_PORTALE_B2B]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T048",
    name: "Sintesi PDF per Valutazione Tecnica ed Economica",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Selezione tecnica PDF per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

[ATTACCO_UFFICIO_ACQUISTI]. Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

La selezione PDF e il catalogo digitale coprono con prodotti certificati CE:
{LINEE_PRODOTTI_IZZO}

Utilizzando i riferimenti sottostanti potete aprire l’estratto PDF o accedere in autonomia al portale completo:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T049",
    name: "Prospetto Linee ad Alta Rotazione & Portale Riservato",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Linee tecniche B2B e prospetto PDF — {COMPANY_NAME} | Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** mette a disposizione della Vostra struttura [IL_CATALISTINO_PDF] [OLTRE_AL_PDF], con focus su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T050",
    name: "Consultazione Rapida PDF + Accesso Portale B2B",
    angleGroup: "Catalogo_Illustrativo_PDF",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Estratto listino B2B Izzo Distribuzione S.r.l. all’attenzione di {COMPANY_NAME}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

presentiamo **Izzo Distribuzione S.r.l.** a {COMPANY_NAME} {INCISO_CONTESTO_DB}, quale canale diretto {SCOPO_FORNITURA_SETTORE}.

All’interno del prospetto PDF e dell’area B2B trovate valorizzate le nostre principali linee:
{LINEE_PRODOTTI_IZZO}

Di seguito i riferimenti conoscitivi e non vincolanti predisposti per la Vostra azienda:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T051",
    name: "Focus Tecnico su Compatibilità Serie Civile, Quadro e LED",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "[OGG_RAPIDITA] per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** distribuisce all’ingrosso su tutto il territorio nazionale linee tecniche selezionate per affidabilità e piena integrazione impiantistica {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per esaminare schede tecniche, disponibilità effettive e prezzi netti riservati a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T052",
    name: "Copertura Multi-Reparto: Elettrico, Luce, Fissaggio e Utensileria",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Fornitura tecnica multi-reparto per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, per proporci come fornitore unico su più famiglie complementari.

Accentrare su un solo portale B2B materiale elettrico, illuminotecnica, fissaggio e utensileria consente di snellire gli ordini sulle seguenti linee:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T053",
    name: "Standard Certificati CE e Continuità di Gamma",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Componentistica certificata e listino B2B — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Attraverso **Izzo Distribuzione S.r.l.** mettiamo a disposizione di {COMPANY_NAME} prodotti [CONFORMITA_QUALITA], strutturati su:
{LINEE_PRODOTTI_IZZO}

Per verificare caratteristiche costruttive e quotazioni nette [AVVERBIO_LIBERAMENTE], [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T054",
    name: "Alternative Tecniche Compatibili ad Alta Marginalità",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Linee tecniche ad alta marginalità per {COMPANY_NAME} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_RIVENDITA]. Scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Il nostro catalogo B2B affianca [EQUIVALENZA_TECNICA] sulle direttrici di maggiore consumo:
{LINEE_PRODOTTI_IZZO}

Per un riscontro oggettivo sui prezzi netti riservati a {COMPANY_NAME}, riportiamo l’accesso provvisorio di consultazione:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T055",
    name: "Approvvigionamento Materiali di Consumo Continuativo",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Materiali ad alta rotazione per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Come **Izzo Distribuzione S.r.l.** presidiamo con stock profondo gli articoli [RICAMBIO_COSTANTE] {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T056",
    name: "Focus Tecnico per Capitolati e Commesse Strutturate",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Forniture tecniche a capitolato e commessa — {COMPANY_NAME} | Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sottoponiamo il profilo tecnico-commerciale di **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Supportiamo commesse civili, terziario e industriali con documentazione tecnica scaricabile e pronta disponibilità su:
{LINEE_PRODOTTI_IZZO}

Per consultare in autonomia catalogo e listino riservato, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T057",
    name: "Integrazione Gamma Elettrica, Smart Building & Posa",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Catalogo tecnico Izzo Distribuzione S.r.l. all’attenzione di {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Con **Izzo Distribuzione S.r.l.** rendiamo immediatamente reperibili a listino B2B soluzioni coordinate su:
{LINEE_PRODOTTI_IZZO}

Ai fini di una libera verifica tecnica ed economica da parte della Vostra struttura, riportiamo le credenziali provvisorie e il link al prospetto PDF:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T058",
    name: "Continuità di Stock e Spedizioni Tracciate Nazionali",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Disponibilità a magazzino e listino B2B — {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Dal nostro polo distributivo gestiamo forniture [COPERTURA_ITALIA] con [CERTEZZA_EVASIONE] su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T059",
    name: "Selezione Marchi Specializzati per Operatori con P.IVA",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Marchi e linee B2B per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Proponiamo a {COMPANY_NAME} il catalogo B2B di **Izzo Distribuzione S.r.l.** {SCOPO_FORNITURA_SETTORE}, articolato su marchi specializzati ad elevato rapporto qualità/prezzo:
{LINEE_PRODOTTI_IZZO}

Per esaminare direttamente codici e scontistica riservata, [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T060",
    name: "Quadro Sinottico Forniture Tecniche B2B",
    angleGroup: "Gamma_Tecnica_Completa",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "[OGG_TIPO_DOC] — Linee tecniche per {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

presentiamo **Izzo Distribuzione S.r.l.** alla Vostra valutazione {INCISO_CONTESTO_DB}.

Riepiloghiamo i tre ambiti merceologici principali disponibili sul nostro portale B2B [IMPIEGO_PRATICO]:
{LINEE_PRODOTTI_IZZO}

Di seguito l’accesso provvisorio di sola consultazione e l’estratto illustrativo in PDF:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T061",
    name: "Presentazione Diretta Daniele Savoia su Profilo Aziendale",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Riferimento commerciale Izzo Distribuzione S.r.l. per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME}, [TITOLO_REFERENTE] di **Izzo Distribuzione S.r.l.**. Vi scrivo {INCISO_CONTESTO_DB}.

Desideriamo proporci alla Vostra struttura come fornitore B2B {SCOPO_FORNITURA_SETTORE} su tre direttrici tecniche in linea con la Vostra operatività:
{LINEE_PRODOTTI_IZZO}

Per permetterVi una valutazione diretta dei nostri articoli e delle condizioni economiche, ho predisposto a Vostro favore [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

Resto personalmente a disposizione ai recapiti in firma {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T062",
    name: "Contatto Diretto Referente B2B + Autonomia Portale",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "{AGENT_NAME} — Izzo Distribuzione S.r.l. | Presentazione fornitore per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sono {AGENT_NAME} dell’ufficio commerciale B2B di **Izzo Distribuzione S.r.l.**. {FRASE_CONTESTO_DB}

Vi lascio i miei riferimenti diretti qualora voleste valutare un fornitore strutturato su:
{LINEE_PRODOTTI_IZZO}

Affianchiamo infatti al supporto commerciale diretto un portale B2B aggiornato in tempo reale, per il quale riportiamo di seguito delle credenziali provvisorie non vincolanti:

{CREDENTIALS_BLOCK}

Per qualsiasi necessità di quotazione potete rispondermi a questa email o contattarmi telefonicamente / WhatsApp al {AGENT_PHONE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T063",
    name: "Presentazione Referente senza Telefonate Invadenti",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Presentazione {AGENT_NAME} (Izzo Distribuzione S.r.l.) — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

mi chiamo {AGENT_NAME} e seguo lo sviluppo clienti B2B in **Izzo Distribuzione S.r.l.**. Vi contatto per iscritto, evitando telefonate non concordate, {INCISO_CONTESTO_DB}.

Supportiamo aziende e professionisti {SCOPO_FORNITURA_SETTORE} con disponibilità immediata su:
{LINEE_PRODOTTI_IZZO}

Per consentirVi di esaminare con calma listino e catalogo quando opportuno, ho attivato a titolo conoscitivo i seguenti riferimenti:

{CREDENTIALS_BLOCK}

Resto a Vostro riferimento diretto {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T064",
    name: "Interlocutore Unico per Distinte Materiali e Capitolati",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Alla c.a. Acquisti {COMPANY_NAME} — Referente B2B Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sono {AGENT_NAME}, [TITOLO_REFERENTE] presso **Izzo Distribuzione S.r.l.**. {FRASE_CONTESTO_DB}

Oltre alla consultazione autonoma del nostro portale B2B, seguo direttamente l’elaborazione di offerte riservate su distinte e commesse relative a:
{LINEE_PRODOTTI_IZZO}

Riporto di seguito le credenziali provvisorie per visionare subito online i prezzi netti e l’estratto PDF dedicato a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T065",
    name: "Lettera Personale del Responsabile Commerciale",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Presentazione fornitore B2B per {INTESTAZIONE_OGGETTO} — {AGENT_NAME} | Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME} di **Izzo Distribuzione S.r.l.**, [QUALIFICA_DISTRIBUTORE]. Vi scrivo {INCISO_CONTESTO_DB}, per sottoporre la nostra realtà come possibile partner di fornitura.

Le linee tecniche che curiamo direttamente a catalogo B2B comprendono:
{LINEE_PRODOTTI_IZZO}

Per verificare in autonomia la competitività dei nostri netti e la disponibilità a stock, lascio a Vostra disposizione un accesso provvisorio gratuito:

{CREDENTIALS_BLOCK}

Per confronti su specifici codici o forniture programmate rispondo direttamente ai contatti in calce.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T066",
    name: "Affiancamento Commerciale Diretto + Portale H24",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Contatto commerciale e listino B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Sono {AGENT_NAME}, [TITOLO_REFERENTE] di **Izzo Distribuzione S.r.l.**: il nostro modello unisce piattaforma B2B consultabile H24 e referente diretto raggiungibile senza filtri sulle forniture di:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

Resto volentieri a disposizione {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T067",
    name: "Riferimento Diretto per Preventivi Rapidi via Email o WhatsApp",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Riferimento B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME} (**Izzo Distribuzione S.r.l.**) e Vi scrivo {INCISO_CONTESTO_DB}.

Mettiamo a disposizione della Vostra azienda forniture dirette B2B {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Qui sotto trovate le credenziali provvisorie non vincolanti per consultare listino e giacenze sul portale B2B, insieme all’estratto PDF:

{CREDENTIALS_BLOCK}

Per quotazioni rapide su distinta materiali potete scrivermi direttamente via email ({AGENT_EMAIL}) o su WhatsApp ({AGENT_PHONE}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T068",
    name: "Presentazione Commerciale Sobria a Firma Diretta",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "{COMPANY_NAME}{CITY_PAREN} — Presentazione {AGENT_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

In qualità di [TITOLO_REFERENTE] di **Izzo Distribuzione S.r.l.**, sottopongo alla Vostra attenzione le nostre principali linee a listino B2B:
{LINEE_PRODOTTI_IZZO}

A titolo esclusivamente conoscitivo, ho generato per {COMPANY_NAME} un profilo provvisorio di consultazione del portale e del prospetto PDF:

{CREDENTIALS_BLOCK}

Resto a disposizione per qualsiasi approfondimento tecnico o economico.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T069",
    name: "Apertura Canale di Confronto Diretto Fornitore",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Proposta fornitore B2B Izzo Distribuzione S.r.l. — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME}, referente B2B di **Izzo Distribuzione S.r.l.**. Vi contatto {INCISO_CONTESTO_DB} per proporVi di valutare il nostro catalogo [RUOLO_SECONDO_CANALE].

Presidiamo con stock reale e prezzi netti dedicati:
{LINEE_PRODOTTI_IZZO}

Di seguito i riferimenti provvisori predisposti per una verifica autonoma:

{CREDENTIALS_BLOCK}

Rimango a disposizione {CHIUSURA_SETTORE} [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T070",
    name: "Biglietto da Visita Esecutivo con Accesso Listini",
    angleGroup: "Presentazione_Referente",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Contatto diretto B2B e listino riservato — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sono {AGENT_NAME} di **Izzo Distribuzione S.r.l.**. {FRASE_CONTESTO_DB}

Con questa breve nota desidero lasciarVi i miei recapiti diretti e sottoporre le nostre linee B2B {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per esaminare prezzi netti e disponibilità senza alcuna formalità, riportiamo l’accesso provvisorio riservato a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

A completa disposizione {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T071",
    name: "Posizionamento come Canale B2B Complementare",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Canale di fornitura B2B complementare per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Vi contattiamo per invitare {COMPANY_NAME} a valutare **Izzo Distribuzione S.r.l.** [RUOLO_SECONDO_CANALE] {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per agevolare un confronto diretto su articoli e condizioni economiche, riportiamo di seguito [LE_CREDENZIALI] per accedere al listino riservato B2B:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T072",
    name: "Diversificazione Fornitori su Materiali ad Alta Rotazione",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Secondo riferimento fornitura B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Affiancare un secondo distributore B2B diretto consente di ottimizzare disponibilità e costi sulle linee a maggiore rotazione:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T073",
    name: "Alternativa Diretta per Tutela Margini di Commessa",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Fornitore alternativo a listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Anche in presenza di fornitori storici consolidati, valutare **Izzo Distribuzione S.r.l.** come canale integrativo permette [EVITARE_DISAGI] su:
{LINEE_PRODOTTI_IZZO}

Per verificare in autonomia il nostro posizionamento netto riservato a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T074",
    name: "Fornitore di Riserva e Confronto per Ufficio Acquisti",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Alla c.a. Ufficio Acquisti {COMPANY_NAME} — Canale B2B Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sottoponiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, quale riferimento B2B aggiuntivo per verifiche prezzi e approvvigionamenti rapidi.

Le famiglie tecniche immediatamente riscontrabili sul nostro portale comprendono:
{LINEE_PRODOTTI_IZZO}

Riportiamo di seguito le credenziali conoscitive non vincolanti e l’estratto PDF valorizzato:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T075",
    name: "Affiancamento Linee Compatibili ai Marchi Primari",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Linee compatibili e forniture B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Molte realtà strutturate affiancano oggi ai marchi tradizionali il catalogo B2B di **Izzo Distribuzione S.r.l.** [DIFESA_COMPETITIVITA]:
{LINEE_PRODOTTI_IZZO}

Per esaminare direttamente schede tecniche e quotazioni nette [AVVERBIO_LIBERAMENTE], [ABBIAMO_PREPARATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T076",
    name: "Secondo Portale B2B Sempre Consultabile Senza Vincoli",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Portale B2B integrativo per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Tenere attivo un canale B2B aggiuntivo [ZERO_MINIMO_ORDINE] consente un riscontro immediato su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T077",
    name: "Continuità Approvvigionamenti & Flessibilità Resa",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Supporto forniture B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Proponiamo **Izzo Distribuzione S.r.l.** [RUOLO_SECONDO_CANALE], operando [DESTINAZIONE_FLESSIBILE] sulle seguenti direttrici:
{LINEE_PRODOTTI_IZZO}

Di seguito l’accesso provvisorio predisposto per consentire a {COMPANY_NAME} una libera verifica dei listini:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T078",
    name: "Confronto Preventivi su Forniture Ricorrenti",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Verifica condizioni B2B di fornitura — {COMPANY_NAME}{CITY_PAREN} | Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in merito alla gestione degli acquisti tecnici di {COMPANY_NAME}, scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Sottoponiamo il nostro listino B2B quale alternativa diretta {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per confrontare i nostri prezzi netti quando utile [QUANDO_SERVE_SUBITO], riportiamo i riferimenti di consultazione:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T079",
    name: "Partner Integrativo Nazionale per Partite IVA",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "[OGG_TIPO_DOC] — Canale alternativo per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** opera a livello nazionale [FILOSOFIA_OPERATIVA], proponendosi come secondo fornitore qualificato su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T080",
    name: "Valutazione Libera Fornitore Complementare",
    angleGroup: "Fornitore_Alternativo",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Presentazione canale B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

desideriamo sottoporre **Izzo Distribuzione S.r.l.** alla Vostra valutazione [RUOLO_SECONDO_CANALE], {INCISO_CONTESTO_DB}.

Il nostro portale riservato consente di verificare disponibilità e netti su:
{LINEE_PRODOTTI_IZZO}

Per agevolare un riscontro autonomo da parte Vostra, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T081",
    name: "Nota Esecutiva Sintetica per la Direzione",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Presentazione fornitore B2B | {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

con la presente sottoponiamo **Izzo Distribuzione S.r.l.** alla Vostra valutazione {INCISO_CONTESTO_DB}, {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per esaminare direttamente assortimento, giacenze e prezzi netti riservati, abbiamo generato un accesso provvisorio conoscitivo:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T082",
    name: "Sintesi Diretta Catalogo & Credenziali Consultazione",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Presentazione B2B e listino riservato — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Presentiamo in sintesi le linee B2B distribuite da **Izzo Distribuzione S.r.l.**:
{LINEE_PRODOTTI_IZZO}

Di seguito i riferimenti non vincolanti predisposti per consultare portale B2B ed estratto PDF:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [COME_RISPONDERE] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T083",
    name: "Comunicazione Essenziale Ufficio Acquisti",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Alla c.a. Acquisti {COMPANY_NAME} — Riferimenti B2B Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB} per sottoporre il nostro listino all’ingrosso su:
{LINEE_PRODOTTI_IZZO}

Per una verifica autonoma e immediata dei prezzi netti riservati a {COMPANY_NAME}, riportiamo i dati di consultazione:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T084",
    name: "Scheda Rapida Fornitore B2B per Titolari",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Forniture B2B Izzo Distribuzione S.r.l. — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Sottoponiamo **Izzo Distribuzione S.r.l.** quale fornitore diretto [ZERO_MINIMO_ORDINE] sulle seguenti famiglie tecniche:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

Restiamo a disposizione ai recapiti in calce {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T085",
    name: "Nota Breve a Firma Daniele Savoia",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "{AGENT_NAME} | Izzo Distribuzione S.r.l. — Riferimenti B2B per {COMPANY_NAME}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME} (**Izzo Distribuzione S.r.l.**). Vi scrivo brevemente {INCISO_CONTESTO_DB} per lasciarVi i riferimenti del nostro catalogo B2B:
{LINEE_PRODOTTI_IZZO}

Credenziali provvisorie di sola consultazione predisposte per {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

Resto direttamente raggiungibile ai recapiti sottostanti {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T086",
    name: "Memo Commerciale Essenziale Partite IVA",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Listino B2B riservato — {COMPANY_NAME}{CITY_PAREN} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

presentiamo alla Vostra struttura **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, distributore all’ingrosso attivo su:
{LINEE_PRODOTTI_IZZO}

Per visionare senza impegno prezzi netti e disponibilità in tempo reale:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T087",
    name: "Prospetto Sintetico Direzione Operativa",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "[OGG_TIPO_DOC] — {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Riepiloghiamo per una rapida valutazione i comparti forniti a listino B2B da **Izzo Distribuzione S.r.l.**:
{LINEE_PRODOTTI_IZZO}

Riferimenti conoscitivi gratuiti per portale B2B ed estratto PDF:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T088",
    name: "Presentazione Rapida Senza Formalità",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Izzo Distribuzione S.r.l. | Catalogo e netti B2B per {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sottoponiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB} quale canale B2B {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per controllare direttamente codici, schede e scontistica riservata, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T089",
    name: "Nota Diretta Riferimenti Portale & Listino",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Accesso conoscitivo listino B2B — {INTESTAZIONE_OGGETTO} | Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

Con **Izzo Distribuzione S.r.l.** mettiamo a disposizione forniture dirette B2B [COPERTURA_ITALIA] su:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T090",
    name: "Sintesi Esecutiva Qualifica Fornitore",
    angleGroup: "Nota_Conoscitiva_Breve",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Qualifica B2B Izzo Distribuzione S.r.l. — {COMPANY_NAME}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in relazione agli approvvigionamenti tecnici di {COMPANY_NAME}, presentiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}:
{LINEE_PRODOTTI_IZZO}

Riportiamo di seguito l’accesso provvisorio di consultazione al portale B2B e all’estratto PDF:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T091",
    name: "Presidio Forniture sull’Area Operativa del Cliente",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Forniture B2B su {CITY} — Presentazione Izzo Distribuzione S.r.l. per {COMPANY_NAME}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

**Izzo Distribuzione S.r.l.** serve regolarmente gli operatori professionali attivi su {CITY} [DESTINAZIONE_FLESSIBILE], presidiando {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Per consentirVi di esaminare in autonomia disponibilità e prezzi netti riservati a {COMPANY_NAME}, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T092",
    name: "Logistica Tracciata verso Sede o Cantiere",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "Izzo Distribuzione S.r.l. — Forniture tecniche per {INTESTAZIONE_OGGETTO}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi contattiamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}, per sottoporre il nostro servizio distributivo nazionale.

Uniamo [CURA_IMBALLO] e [DESTINAZIONE_FLESSIBILE] su un catalogo strutturato lungo tre direttrici:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T093",
    name: "Supporto Preventivi su Capitolati e Commesse Locali",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Quotazioni B2B e forniture tecniche — {COMPANY_NAME} ({PROVINCE}) | Izzo Distribuzione",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Oltre al listino automatico sul portale B2B, l’ufficio commerciale di **Izzo Distribuzione S.r.l.** affianca le aziende di {CITY} nella quotazione di distinte e capitolati su:
{LINEE_PRODOTTI_IZZO}

Per verificare subito il posizionamento del listino riservato, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T094",
    name: "Continuità Rifornimenti per Imprese e Punti Vendita di Zona",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "[OGG_TIPO_DOC] per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione S.r.l.",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

nell’ambito delle forniture B2B dedicate agli operatori di {CITY}, presentiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Mettiamo a disposizione stock reale verificabile online {SCOPO_FORNITURA_SETTORE}:
{LINEE_PRODOTTI_IZZO}

Riportiamo di seguito le credenziali provvisorie non vincolanti per accedere al portale riservato:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T095",
    name: "Servizio B2B Strutturato & Referente Dedicato",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Servizio forniture B2B Izzo Distribuzione S.r.l. — {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{FRASE_CONTESTO_DB}

Con **Izzo Distribuzione S.r.l.** operiamo [FLUSSO_RAPIDO], garantendo condizioni dirette d’ingrosso su:
{LINEE_PRODOTTI_IZZO}

Per permetterVi di valutare [VALORE_PUNTUALITA], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T096",
    name: "Approvvigionamento Diretto per Cantieri e Magazzino su Area Cliente",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "executive_card",
    subjectTemplate: "Listino B2B e consegne tracciate per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

[ATTACCO_CANTIERE]. Vi scriviamo da **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Dal nostro polo distributivo serviamo regolarmente {CITY} sulle seguenti famiglie merceologiche:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T097",
    name: "Presentazione Territoriale a Firma Daniele Savoia",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "plain_personal",
    subjectTemplate: "{AGENT_NAME} — Riferimento B2B Izzo Distribuzione S.r.l. su {CITY} per {COMPANY_NAME}",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

sono {AGENT_NAME}, [TITOLO_REFERENTE] di **Izzo Distribuzione S.r.l.**. {FRASE_CONTESTO_DB}

Seguo direttamente le aziende operative su {CITY} {SCOPO_FORNITURA_SETTORE}, mettendo a disposizione il nostro catalogo B2B su:
{LINEE_PRODOTTI_IZZO}

Ho predisposto per {COMPANY_NAME} un accesso provvisorio conoscitivo al portale e all’estratto PDF:

{CREDENTIALS_BLOCK}

Resto a diretta disposizione ai recapiti in calce {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T098",
    name: "Flessibilità d’Ordine e Documentazione Certificata",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "compact_memo",
    subjectTemplate: "Forniture certificate CE e listino B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.",
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sottoponiamo **Izzo Distribuzione S.r.l.** alla valutazione di {COMPANY_NAME}, {INCISO_CONTESTO_DB}.

Forniamo referenze [CONFORMITA_QUALITA], [VANTAGGIO_ZERO_SCORTE], articolate su:
{LINEE_PRODOTTI_IZZO}

Di seguito i riferimenti provvisori per esaminare in autonomia prezzi netti e schede tecniche:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] {CHIUSURA_SETTORE}.

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T099",
    name: "Affiancamento Operativo per Gare, Capitolati e Forniture",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "accent_stripe",
    subjectTemplate: "Supporto capitolati e listino B2B per {INTESTAZIONE_OGGETTO} — Izzo Distribuzione",
    bodyTemplate: `{SALUTO_PERSONALIZZATO}

{FRASE_CONTESTO_DB}

In **Izzo Distribuzione S.r.l.** affianchiamo imprese, installatori e rivendite sia tramite listino automatico B2B sia con preventivazione dedicata su capitolato per:
{LINEE_PRODOTTI_IZZO}

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] {CHIUSURA_SETTORE} [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: "T100",
    name: "Chiusura Ciclo Presentazione Rete Nazionale B2B",
    angleGroup: "Supporto_Aziende_Territorio",
    targetCategory: 'ALL',
    htmlLayoutVariant: "clean_table",
    subjectTemplate: "Presentazione Izzo Distribuzione S.r.l. — Forniture B2B per {COMPANY_NAME}{CITY_PAREN}",
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

con riferimento allo sviluppo della nostra rete di partner B2B su {CITY}, presentiamo **Izzo Distribuzione S.r.l.** {INCISO_CONTESTO_DB}.

Riepiloghiamo le linee tecniche disponibili con quotazioni nette riservate alle Partite IVA:
{LINEE_PRODOTTI_IZZO}

Per una verifica autonoma di catalogo, disponibilità e condizioni sul primo ordine, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
];
