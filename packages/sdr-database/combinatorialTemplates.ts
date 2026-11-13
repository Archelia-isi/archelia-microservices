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
 * Tutte le 100 email sono valide per qualsiasi tipologia di cliente B2B (targetCategory: 'ALL').
 * Tono: presentazione B2B cortese, istituzionale e rassicurante per aziende che non ci conoscono ancora,
 * con invito libero a valutarci come fornitore e credenziali provvisorie gratuite per loro comodità.
 * Zero "2gg", zero "24/48h", zero codici interni Zucchetti, zero espressioni contrattuali ambigue.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  // ==========================================================================
  // GRUPPO 1 (T001 - T010): PRESENTAZIONE FORNITORE & INVITO A CONOSCERCI
  // ==========================================================================
  {
    code: 'T001',
    name: 'Presentazione Fornitore — Invito Conoscitivo Completo',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] e invitarVi a valutarci liberamente come fornitore B2B. Siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] nel settore di [SETTORI_MERCEOLOGICI].

[ACCESSO_SENZA_IMPEGNO]. Proprio per permetterVi di dare uno sguardo con calma ai nostri articoli e ai prezzi netti riservati, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] insieme a [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

Qualora decideste in futuro di metterci alla prova con un primo ordine, troverete già predisposto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T002',
    name: 'Presentazione Fornitore — Nota Cortese per Chi Non Ci Conosce',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | [OGG_APPROCCIO_SOFT] [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [LE_CREDENZIALI].

Non conoscendoci ancora, riteniamo che il modo più semplice e trasparente per farci valutare come possibile fornitore sia lasciarVi consultare in autonomia il nostro catalogo e le nostre quotazioni nette su [SETTORI_MERCEOLOGICI], [INCISO_SENZA_VINCOLO].

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

All’interno di [IL_PORTALE_B2B] [TROVA_ATTIVO] anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], [DOPO_PRIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T003',
    name: 'Presentazione Fornitore — Presentazione Istituzionale all’Ufficio Acquisti',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] — {COMPANY_NAME}{CITY_PAREN} | [OGG_RAPIDITA]',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Con questo spirito desideriamo presentarVi [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] attiva [COPERTURA_ITALIA], e invitarVi a valutarci tra i Vostri fornitori di riferimento.

Unicamente per Vostra comodità, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD], così che possiate verificare [AVVERBIO_LIBERAMENTE] assortimento, schede tecniche e prezzi netti sulle linee {RECOMMENDED_FAMILY}.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Nel caso voleste testare il nostro servizio, è inoltre disponibile [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T004',
    name: 'Presentazione Fornitore — Chi Siamo e Come Lavoriamo',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Presentazione aziendale Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

ci fa piacere far conoscere la nostra realtà alla Vostra azienda invitandoVi, quando ne avrete occasione, a valutarci come fornitore per le forniture di [SETTORI_MERCEOLOGICI].

In [IDENTITA_IZZO] affianchiamo ogni giorno [TARGET_PROFESSIONALE], [FILOSOFIA_OPERATIVA]. Per evitarVi perdite di tempo con moduli di registrazione, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

[CONNETTIVO_PRATICO] potrete consultare i listini [AVVERBIO_LIBERAMENTE] e, solo se un giorno vorrete provare una fornitura, usufruire dello sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T005',
    name: 'Presentazione Fornitore — Invito Semplice e Trasparente',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — [OGG_FORMULA_PROMO]',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: operiamo come [QUALIFICA_DISTRIBUTORE] e ci piacerebbe sottoporre il nostro catalogo alla Vostra libera valutazione come possibile fornitore.

Sappiamo che valutare un fornitore nuovo richiede soprattutto chiarezza sui prezzi. Per questo motivo [ABBIAMO_ATTIVATO] per {COMPANY_NAME} delle credenziali provvisorie gratuite di sola consultazione su [IL_PORTALE_B2B], accompagnate da [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T006',
    name: 'Presentazione Fornitore — Conoscenza Reciproca Senza Vincoli',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Invito a conoscere Izzo Distribuzione S.r.l. — Catalogo B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Vi scriviamo per presentare [IDENTITA_IZZO] alla Vostra struttura, [SALUTO_REFERENTE], con l’invito a valutarci senza alcuna fretta come fornitore per il comparto {SECTOR_SHORT}.

Trattiamo [SETTORI_MERCEOLOGICI] [VANTAGGIO_DIRETTO]. Per rendere più comoda una Vostra eventuale consultazione, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e un estratto PDF già valorizzato con i prezzi netti riservati.

{CREDENTIALS_BLOCK}

L’accesso [CONSENTE_DI] [FUNZIONI_PORTALE], senza alcun costo né impegno. Se vorrete poi metterci alla prova, è già pronto lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T007',
    name: 'Presentazione Fornitore — Filiera Diretta B2B per Partite IVA',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] — Presentazione Izzo Distribuzione S.r.l. a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Per questa ragione ci permettiamo di presentarVi [IDENTITA_IZZO] e di invitarVi a valutarci come fornitore [RUOLO_SECONDO_CANALE].

Operiamo tramite [CANALE_RISERVATO], [AFFIDABILITA_DATO_STOCK]. Esclusivamente per agevolarVi qualora voleste curiosare tra i nostri articoli e i nostri listini, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. A titolo di benvenuto abbiamo associato anche la condizione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], con [TEMPI_RESA].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T008',
    name: 'Presentazione Fornitore — Dialogo Aperto e Catalogo Riservato',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA} di benvenuto) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ci presentiamo con piacere alla Vostra azienda: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], e Vi scriviamo per invitarVi a valutarci liberamente come fornitore per i materiali tecnici di uso quotidiano.

Affinché possiate verificare subito se i nostri prodotti e le nostre condizioni possono essere di Vostro interesse, [ABBIAMO_ATTIVATO] per Vostra comodità un accesso ospite provvisorio e gratuito a [IL_PORTALE_B2B], oltre a [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

Entrando quando preferite [TROVA_ATTIVO] anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [SENSO_DELLA_PROVA] [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T009',
    name: 'Presentazione Fornitore — Qualità e Chiarezza per gli Acquisti',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Presentazione B2B [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME}, [SALUTO_GIORNATA]

[VERBO_CONTATTARE] [IDENTITA_IZZO] con il semplice desiderio di far conoscere la nostra azienda a {COMPANY_NAME} e invitarVi a valutarci come possibile fornitore nel settore {SECTOR_SHORT}.

Dal [NOSTRO_DEPOSITO] seguiamo [TARGET_PROFESSIONALE] [ESPERIENZA_SERVIZIO]. Per Vostra esclusiva comodità, [ABBIAMO_PREPARATO] delle credenziali provvisorie gratuite che Vi permettono di sfogliare catalogo e prezzi netti senza alcun impegno né registrazione.

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T010',
    name: 'Presentazione Fornitore — Invito Diretto dal Responsabile Commerciale',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Un contatto utile per gli acquisti di {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

mi permetto di scriverVi a nome di [IDENTITA_IZZO] per sottoporre la nostra realtà alla Vostra cortese valutazione come fornitore B2B di [SETTORI_MERCEOLOGICI].

Poiché non ci conosciamo ancora, abbiamo voluto evitare qualsiasi formalità: [ABBIAMO_ATTIVATO] gratuitamente per Vostra comodità un accesso provvisorio al nostro portale B2B e [IL_CATALISTINO_PDF], così possiate valutare in autonomia prodotti e prezzi netti.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Qualora un giorno voleste metterci alla prova, è già previsto lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 2 (T011 - T020): VALUTAZIONE TRASPARENTE LISTINO & PREZZI NETTI
  // ==========================================================================
  {
    code: 'T011',
    name: 'Valutazione Listino — Confronto Prezzi Netti in Piena Autonomia',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_FORMULA_PROMO] [OGG_PER_AZIENDA] {COMPANY_NAME} — Confronto listino B2B senza impegno',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_RIVENDITA]. Con questa breve email desideriamo presentarVi [IDENTITA_IZZO] e invitarVi a valutare con tutta calma la convenienza del nostro listino B2B.

Per permetterVi di [CONFRONTARE_NETTI], [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B], [TRASPARENZA_PREZZI].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se dal confronto troverete articoli di Vostro interesse, potrete anche contare su [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T012',
    name: 'Valutazione Listino — Trasparenza tra Listino Ufficiale e Netto',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} | Prezzi netti B2B consultabili gratuitamente',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] con l’invito a valutarci come possibile fornitore per i materiali {RECOMMENDED_FAMILY}.

In [IDENTITA_IZZO] crediamo nella massima chiarezza: invece di inviare listini generici, [ABBIAMO_PREPARATO] per Vostra comodità un accesso provvisorio gratuito al nostro portale B2B dove ogni scheda mostra sia il listino ufficiale sia il prezzo netto riservato, già comprensivo dello sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto).

{CREDENTIALS_BLOCK}

L’utenza provvisoria non comporta alcun costo né alcun vincolo: serve unicamente a farVi valutare se possiamo offrirVi [VANTAGGIO_MARGINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T013',
    name: 'Valutazione Listino — Verifica Rapida dei Costi di Fornitura',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Invito a valutare il nostro listino B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

[VERBO_CONTATTARE] [IDENTITA_IZZO] per proporVi [INCISO_SENZA_VINCOLO] di valutarci come fornitore alternativo sulle forniture di [SETTORI_MERCEOLOGICI].

Sappiamo quanto sia pratico vedere subito il prezzo finito senza dover attendere un preventivo ogni volta. Per questo [ABBIAMO_ATTIVATO] [LE_CREDENZIALI], che [CONSENTE_DI] [ORDINARE_AUTONOMIA].

{CREDENTIALS_BLOCK}

Per chi desidera metterci alla prova su una prima fornitura è inoltre previsto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE] e con [TEMPI_RESA].

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T014',
    name: 'Valutazione Listino — Riscontro Economico Immediato per l’Ufficio Acquisti',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] — Valutazione prezzi netti B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

quando un fornitore non è ancora conosciuto, il modo più serio per presentarsi è mettere in chiaro prodotti, disponibilità e condizioni economiche. È con questo approccio che [IDENTITA_IZZO] Vi invita a valutare il proprio catalogo B2B.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Accedendo quando Vi farà comodo, [TROVA_ATTIVO] la scontistica di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T015',
    name: 'Valutazione Listino — Tutela della Marginalità sugli Acquisti Ricorrenti',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_RAPIDITA] | Invito a confrontare i nostri listini B2B — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

sugli articoli [RICAMBIO_COSTANTE], anche una piccola differenza sul prezzo netto d’acquisto genera un beneficio concreto nel tempo. Per questo Vi invitiamo volentieri a valutare [IDENTITA_IZZO] come possibile fornitore B2B.

Per Vostra comodità [ABBIAMO_ATTIVATO] gratuitamente un accesso temporaneo a [IL_PORTALE_B2B], pensato [DIFESA_COMPETITIVITA].

{CREDENTIALS_BLOCK}

Potrete così [CONFRONTARE_NETTI] [AVVERBIO_LIBERAMENTE], avendo già a disposizione anche lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T016',
    name: 'Valutazione Listino — Nessuna Registrazione, Consultazione Diretta',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Consultazione libera listino B2B ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], e desideriamo invitarVi a valutarci senza impegno tra i Vostri fornitori.

Poiché il nostro sito mostra i prezzi all’ingrosso solo alle aziende registrate, per risparmiarVi qualsiasi procedura [ABBIAMO_PREPARATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Oltre alla libera consultazione di tutti i prezzi netti, per un eventuale primo ordine di prova è attivo lo sconto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [AMBITO_DISPONIBILITA].

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T017',
    name: 'Valutazione Listino — Confronto su Quattro o Cinque Articoli Abituali',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Invito a metterci alla prova sui prezzi B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci permettiamo di presentarVi [IDENTITA_IZZO] con una proposta molto semplice: invitarVi a confrontare i nostri prezzi netti su alcuni degli articoli che {COMPANY_NAME} acquista abitualmente.

Per lasciarVi la massima comodità, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF], dove è già calcolato [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA]. Naturalmente le credenziali provvisorie sono gratuite e non comportano alcun impegno.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T018',
    name: 'Valutazione Listino — Parametro Economico Chiaro per Preventivi',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Listino netto e catalogo PDF',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Con questo intento Vi presentiamo [IDENTITA_IZZO], invitandoVi a valutare il nostro servizio di fornitura B2B [QUANDO_SERVE_SUBITO].

Abbiamo pensato di agevolarVi predisponendo gratuitamente un accesso provvisorio a [IL_PORTALE_B2B], [AFFIDABILITA_DATO_STOCK] e con la condizione di benvenuto {DISCOUNT_FORMULA} [APPLICAZIONE_CARRELLO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Restiamo volentieri a disposizione [PER_OGNI_ESIGENZA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T019',
    name: 'Valutazione Listino — Convenienza Diretta e Qualità Certificata',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Proposta conoscitiva e listino B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[VERBO_CONTATTARE] [IDENTITA_IZZO] per far conoscere a {COMPANY_NAME} il nostro catalogo professionale di [SETTORI_MERCEOLOGICI], con articoli selezionati [CONFORMITA_QUALITA].

Per invitarVi a valutarci comodamente come fornitore, [METTIAMO_A_DISPOSIZIONE] [LE_CREDENZIALI] e un prospetto PDF dedicato, entrambi gratuiti e senza alcun vincolo commerciale.

{CREDENTIALS_BLOCK}

Qualora le nostre quotazioni risultassero di Vostro gradimento, sul primo ordine conoscitivo potrete usufruire dello sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [VANTAGGIO_ZERO_SCORTE].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T020',
    name: 'Valutazione Listino — Sintesi Chiarezza Prezzi e Libertà di Scelta',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

desideriamo sottoporre [IDENTITA_IZZO] alla Vostra attenzione come possibile fornitore B2B per il settore {SECTOR_SHORT}, lasciando parlare direttamente la trasparenza dei nostri prezzi.

Qui sotto trovate delle credenziali provvisorie gratuite create unicamente per Vostra comodità: permettono di entrare su [IL_PORTALE_B2B] senza moduli da compilare e verificare il listino riservato con lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 3 (T021 - T030): CREDENZIALI PROVVISORIE PER VOSTRA COMODITÀ
  // ==========================================================================
  {
    code: 'T021',
    name: 'Credenziali per Comodità — Spiegazione Chiara dell’Accesso Ospite Gratuito',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Invito a valutarci come fornitore — Accesso gratuito di consultazione per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ci permettiamo di scriverVi per presentare [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], e invitarVi a valutarci liberamente come fornitore di [SETTORI_MERCEOLOGICI].

Poiché il nostro portale è riservato ai soli operatori con Partita IVA, per non farVi perdere tempo con richieste di registrazione [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se e quando vorrete provare il nostro servizio, sul primo ordine è già disponibile lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T022',
    name: 'Credenziali per Comodità — Consultare il Sito Senza Compilare Moduli',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Credenziali provvisorie gratuite di consultazione per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

spesso quando un nuovo fornitore si presenta via email non è immediato capire quali prodotti tratti davvero e a quali prezzi. Per questo motivo, nel presentarVi [IDENTITA_IZZO], abbiamo pensato a una soluzione semplice per Vostra comodità.

Abbiamo predisposto un accesso ospite temporaneo e completamente gratuito a [IL_PORTALE_B2B], così possiate [FUNZIONI_PORTALE] quando avete due minuti liberi, senza alcun contratto né impegno.

{CREDENTIALS_BLOCK}

Nel caso decidiate un giorno di metterci alla prova come fornitore, troverete già pronto anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T023',
    name: 'Credenziali per Comodità — Massima Trasparenza: Zero Costi e Zero Obblighi',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — Consultazione gratuita portale B2B',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per sottoporre alla Vostra valutazione il nostro catalogo all’ingrosso dedicato a [TARGET_PROFESSIONALE].

Ci teniamo anzitutto alla massima chiarezza: non Vi stiamo attivando alcun servizio a pagamento né alcun abbonamento. Semplicemente, per Vostra comodità di consultazione, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] affinché possiate valutare in piena libertà se possiamo esserVi utili come fornitore.

{CREDENTIALS_BLOCK}

Per un eventuale primo acquisto conoscitivo è inoltre riservata a {COMPANY_NAME} la scontistica di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T024',
    name: 'Credenziali per Comodità — Uno Strumento Pratico per l’Ufficio Tecnico e Acquisti',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Catalogo B2B Izzo Distribuzione S.r.l. — Accesso ospite gratuito [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[ATTACCO_UFFICIO_ACQUISTI]. Da [IDENTITA_IZZO] desideriamo invitarVi a valutarci come possibile fornitore per le linee {RECOMMENDED_FAMILY}.

Per agevolare chi in azienda segue preventivi e acquisti, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]: questo accesso gratuito [CONSENTE_DI] [ORDINARE_AUTONOMIA], [CERTEZZA_EVASIONE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete testare una prima fornitura, lo sconto di benvenuto {DISCOUNT_FORMULA} è già impostato sul profilo [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T025',
    name: 'Credenziali per Comodità — Dare uno Sguardo da PC o Smartphone Quando Comodo',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] e invitarVi a conoscere il nostro assortimento di [SETTORI_MERCEOLOGICI].

Senza alcun impegno da parte Vostra e solo per comodità pratica, lasciamo qui di seguito delle credenziali provvisorie gratuite per entrare su [IL_PORTALE_B2B] o sfogliare [IL_CATALISTINO_PDF] dal computer o dallo smartphone quando preferite.

{CREDENTIALS_BLOCK}

Qualora i nostri prodotti e i nostri prezzi netti Vi convincessero, sul primo ordine è attivo lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], con [TEMPI_RESA].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T026',
    name: 'Credenziali per Comodità — Area Riservata B2B Pronta per una Libera Visita',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] | Invito gratuito al portale B2B per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in qualità di [QUALIFICA_DISTRIBUTORE], [IDENTITA_IZZO] mantiene i propri listini d’ingrosso all’interno di [CANALE_RISERVATO] per tutelare il lavoro degli operatori professionali.

Poiché ci farebbe piacere essere valutati da {COMPANY_NAME} come possibile fornitore, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD], così che possiate visitare liberamente l’area riservata senza alcuna attesa.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. All’interno troverete anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T027',
    name: 'Credenziali per Comodità — Consultazione Autonoma o Supporto via WhatsApp',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione Izzo Distribuzione S.r.l. — Riferimenti gratuiti per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi contattiamo con piacere da [IDENTITA_IZZO] per presentarVi la nostra attività e invitarVi a valutarci come fornitore nel comparto {SECTOR_SHORT}.

Alcuni clienti preferiscono guardare catalogo e prezzi in completa autonomia, altri preferiscono chiedere direttamente un preventivo: per offrirVi entrambe le comodità senza alcun impegno, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e restiamo sempre raggiungibili anche ai recapiti diretti in calce.

{CREDENTIALS_BLOCK}

Se vorrete effettuare una prima prova d’acquisto, potrete contare sullo sconto di benvenuto {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA] [ZERO_MINIMO_ORDINE].

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T028',
    name: 'Credenziali per Comodità — Verificare Schede Tecniche e Giacenze in Tempo Reale',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_RAPIDITA] — Accesso conoscitivo gratuito per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nel presentarVi [IDENTITA_IZZO] desideriamo invitarVi a valutare con calma la praticità di [IL_PORTALE_B2B], dove raccogliamo migliaia di articoli professionali [AFFIDABILITA_DATO_STOCK].

Per Vostra semplice comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]: non hanno alcun costo, non comportano alcun vincolo e servono unicamente a permetterVi di [CONFRONTARE_NETTI].

{CREDENTIALS_BLOCK}

A chi sceglie di provarci con un primo ordine dedichiamo inoltre la scontistica di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto), [ZERO_MINIMO_ORDINE] e con [CURA_IMBALLO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T029',
    name: 'Credenziali per Comodità — Un Invito Discreto da Conservare tra i Contatti',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Un contatto B2B da tenere a portata di mano per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

anche se in questo momento non aveste necessità immediate di acquisto, ci fa piacere presentarVi [IDENTITA_IZZO] affinché possiate conservarci tra i fornitori da valutare alla prima occasione utile.

Per farVi trovare tutto già pronto e comodo da consultare gratuitamente, lasciamo a disposizione di {COMPANY_NAME} [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Lo sconto di benvenuto {DISCOUNT_FORMULA} resterà comunque disponibile per il Vostro eventuale primo ordine [ZERO_MINIMO_ORDINE].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T030',
    name: 'Credenziali per Comodità — Semplicità di Ingresso e Chiarezza Totale',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} | Credenziali gratuite senza impegno',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], con l’unico scopo di farci conoscere dalla Vostra azienda e invitarVi a valutarci come fornitore.

[CONNETTIVO_PRATICO] [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] per consentirVi di sfogliare in libertà prodotti, schede tecniche e listini netti sulle famiglie {RECOMMENDED_FAMILY}, con lo sconto di benvenuto {DISCOUNT_FORMULA} già visibile in anteprima.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 4 (T031 - T040): SCONTO DI BENVENUTO SENZA IMPEGNO (1° ORDINE)
  // ==========================================================================
  {
    code: 'T031',
    name: 'Sconto di Benvenuto — Invito a Metterci alla Prova Senza Minimo d’Ordine',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] e invitarVi a valutarci come fornitore per le Vostre esigenze di [SETTORI_MERCEOLOGICI].

Per dare a chi non ci conosce ancora un motivo concreto e trasparente per metterci alla prova, in [IDENTITA_IZZO] abbiamo pensato a [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} (pari al {NET_DISCOUNT_PCT}% netto da listino) [SUL_PRIMO_ACQUISTO], [AMBITO_DISPONIBILITA] e [ZERO_MINIMO_ORDINE].

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Potrete quindi prima guardare con calma tutti i prezzi netti e decidere in piena libertà se e quando fare una prova.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T032',
    name: 'Sconto di Benvenuto — Come Funziona l’Agevolazione Conoscitiva',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Presentazione Izzo Distribuzione S.r.l. e sconto di benvenuto ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci presentiamo con piacere alla Vostra azienda: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] operante [COPERTURA_ITALIA], e Vi scriviamo per invitarVi a valutarci tra i Vostri fornitori B2B.

Per accompagnare questa presentazione [ABBIAMO_ATTIVATO] per Vostra comodità un accesso provvisorio gratuito al portale e abbiamo associato una condizione di benvenuto molto chiara: sconto base B2B del {BASE_DISCOUNT}% più un ulteriore {EXTRA_DISCOUNT}% in cascata ({DISCOUNT_FORMULA}) [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Lo sconto è [APPLICAZIONE_CARRELLO], [DOPO_PRIMO_ORDINE]. La consultazione è totalmente gratuita e non vincolante.

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T033',
    name: 'Sconto di Benvenuto — Testare Qualità e Puntualità anche con Pochi Articoli',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Invito conoscitivo B2B [OGG_PER_AZIENDA] {COMPANY_NAME} — Prova senza minimo d’ordine ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

quando si valuta per la prima volta un nuovo fornitore è normale voler iniziare da un piccolo ordine di prova per verificare qualità della merce, imballo e precisione del servizio.

Proprio per questo, nel presentarVi [IDENTITA_IZZO], abbiamo voluto unire due comodità per {COMPANY_NAME}: [LE_CREDENZIALI] per consultare liberamente i prezzi e [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} utilizzabile anche su pochi articoli, [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete testarci, cureremo la fornitura con [TEMPI_RESA] e [CURA_IMBALLO].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T034',
    name: 'Sconto di Benvenuto — Prezzo Netto Già Calcolato in Anteprima sul Portale',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} | Listino netto con benvenuto {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[VERBO_CONTATTARE] [IDENTITA_IZZO] per invitarVi a valutare la nostra azienda come fornitore B2B nel settore {SECTOR_SHORT}.

Per permetterVi di vedere subito la convenienza effettiva articolo per articolo, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B]: entrando gratuitamente [TROVA_ATTIVO] lo sconto di benvenuto {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [TRASPARENZA_PREZZI].

{CREDENTIALS_BLOCK}

Si tratta di [IMPATTO_SCONTO] [SENSO_DELLA_PROVA], senza alcun costo di attivazione e senza alcun obbligo d’acquisto.

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T035',
    name: 'Sconto di Benvenuto — Opportunità d’Acquisto sui Materiali di Uso Frequente',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_RAPIDITA] — Sconto di benvenuto B2B ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_RIVENDITA]. In questa prospettiva desideriamo far conoscere [IDENTITA_IZZO] a {COMPANY_NAME} e invitarVi a valutarci come fornitore.

Sui materiali [ARTICOLI_ALTA_ROTAZIONE] ({RECOMMENDED_FAMILY}) potrete verificare tramite le credenziali provvisorie gratuite qui sotto una condizione di benvenuto pari al {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T036',
    name: 'Sconto di Benvenuto — Libertà Prima e Dopo il Primo Ordine',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Condizioni B2B di presentazione [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ci teniamo a presentarci a {COMPANY_NAME} con estrema correttezza: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], e Vi invitiamo semplicemente a valutarci come fornitore quando ne avrete piacere.

Per Vostra comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI], associando uno sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo ordine di prova, [DOPO_PRIMO_ORDINE].

{CREDENTIALS_BLOCK}

Non esiste alcun minimo d’ordine né alcun impegno nel tempo: il nostro obiettivo è offrire [VANTAGGIO_MARGINE] e farci scegliere per la qualità del servizio.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T037',
    name: 'Sconto di Benvenuto — Valutare Oggi il Listino e Usarlo Quando Serve',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: con [IDENTITA_IZZO] seguiamo quotidianamente [TARGET_PROFESSIONALE] nella fornitura di [SETTORI_MERCEOLOGICI].

Anche se oggi aveste già le forniture coperte, Vi invitiamo a dare uno sguardo senza impegno al nostro catalogo usando le credenziali provvisorie gratuite create per Vostra comodità. Qualora in seguito voleste provarci, resterà a Vostra disposizione [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T038',
    name: 'Sconto di Benvenuto — Trasparenza per Acquisti Agili Senza Scorte Inutili',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nel presentarVi [IDENTITA_IZZO] come possibile fornitore B2B, abbiamo voluto pensare alle esigenze concrete di chi gestisce gli acquisti aziendali: prezzi chiari, disponibilità reale e nessun obbligo di grandi volumi.

Per farVi verificare tutto ciò in autonomia, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF], con l’agevolazione di benvenuto {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [VANTAGGIO_ZERO_SCORTE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T039',
    name: 'Sconto di Benvenuto — Un Benvenuto Concreto alle Aziende con Partita IVA',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Benvenuto B2B Izzo Distribuzione S.r.l. — Invito di valutazione per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[ATTACCO_CANTIERE]. Per farci conoscere dalla Vostra realtà Vi presentiamo volentieri [IDENTITA_IZZO], invitandoVi a valutarci come fornitore di fiducia.

Abbiamo predisposto gratuitamente per Vostra comodità delle credenziali provvisorie su [IL_PORTALE_B2B] e un trattamento di benvenuto pari al {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE] e con [TEMPI_RESA].

{CREDENTIALS_BLOCK}

Potete consultare il sito anche solo a titolo informativo, senza alcun costo né impegno.

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T040',
    name: 'Sconto di Benvenuto — Proposta Chiara e Verificabile a Carrello',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) — Presentazione B2B per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF].

Chi entra sul portale può simulare liberamente un carrello per vedere il totale netto con lo sconto di benvenuto {DISCOUNT_FORMULA} [APPLICAZIONE_CARRELLO], [ZERO_MINIMO_ORDINE]. Naturalmente si tratta di un accesso provvisorio gratuito, creato solo per Vostra comodità e senza alcun vincolo.

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 5 (T041 - T050): CATALOGO ILLUSTRATIVO PDF DA SFOGLIARE CON CALMA
  // ==========================================================================
  {
    code: 'T041',
    name: 'Catalogo Illustrativo PDF — Estratto Pratico con Foto e Prezzi Netti',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Catalistino illustrativo PDF e presentazione fornitore [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per presentarVi in modo concreto [IDENTITA_IZZO] e invitarVi a valutarci come possibile fornitore B2B, [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

[INVITO_CLIC_PDF] [PUO_VISIONARE] [GAMMA_SELEZIONATA] [PER_IL_COMPARTO] {SECTOR_SHORT}, oltre ad avere a disposizione per Vostra comodità [LE_CREDENZIALI] per consultare l’intero sito.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Nel documento PDF i prezzi mostrano già anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} riservato a un eventuale primo ordine [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T042',
    name: 'Catalogo Illustrativo PDF — Sfogliare o Scaricare il Listino in Pochi Secondi',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] (PDF) [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sappiamo che spesso in ufficio è più comodo sfogliare rapidamente un documento PDF ordinato prima ancora di visitare un sito web. Per questo, nel presentarVi [IDENTITA_IZZO], [METTIAMO_A_DISPOSIZIONE] [IL_CATALISTINO_PDF] dedicato a {COMPANY_NAME}.

Al suo interno [ABBIAMO_SELEZIONATO] gli articoli [ARTICOLI_ALTA_ROTAZIONE] sulle famiglie {RECOMMENDED_FAMILY}, che potrete [PUO_SCARICARE_PDF], [INCISO_SENZA_VINCOLO].

{CREDENTIALS_BLOCK}

Accanto al PDF trovate anche delle credenziali provvisorie gratuite create solo per Vostra comodità qualora voleste esplorare tutte le altre linee su [IL_PORTALE_B2B].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T043',
    name: 'Catalogo Illustrativo PDF — Un Assaggio Chiaro del Nostro Assortimento B2B',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Estratto catalogo PDF e prezzi riservati [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[VERBO_CONTATTARE] [IDENTITA_IZZO] con il piacere di invitarVi a valutarci come fornitore per i materiali di [SETTORI_MERCEOLOGICI].

Per darVi subito un’idea chiara dei prodotti che trattiamo e dei nostri prezzi all’ingrosso, [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] [OLTRE_AL_PDF]. Per Vostra comodità abbiamo incluso anche [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[ACCESSO_SENZA_IMPEGNO]. Sul primo ordine conoscitivo è inoltre disponibile lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T044',
    name: 'Catalogo Illustrativo PDF — Prontuario Utile da Tenere in Archivio Fornitori',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Prontuario PDF gratuito [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

ci permettiamo di inviarVi questa presentazione di [IDENTITA_IZZO] invitandoVi, senza alcuna urgenza né impegno, a valutarci tra i Vostri fornitori B2B.

Abbiamo predisposto per {COMPANY_NAME} [IL_CATALISTINO_PDF], comodissimo da [PUO_SCARICARE_PDF] nell’archivio fornitori per qualsiasi futuro confronto prezzi, insieme a delle credenziali provvisorie gratuite per il portale online.

{CREDENTIALS_BLOCK}

Sia il PDF sia le credenziali provvisorie sono puramente conoscitivi e gratuiti; qualora decideste di fare una prova, avrete a disposizione anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T045',
    name: 'Catalogo Illustrativo PDF — Confronto Immediato A Colpo d’Occhio',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_RAPIDITA] | Catalistino PDF conoscitivo per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Per presentare [IDENTITA_IZZO] in modo concreto e veloce, abbiamo raccolto in un unico PDF illustrativo una selezione di prodotti [IN_PRONTA_CONSEGNA] con listino e netto già affiancati.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per chi volesse poi testarci su un primo ordine è attivo lo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T046',
    name: 'Catalogo Illustrativo PDF — Dal Prospetto PDF al Catalogo Completo Online',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] — Prospetto PDF e accesso ospite gratuito per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: operiamo con [IDENTITA_IZZO] nella distribuzione B2B di [SETTORI_MERCEOLOGICI] e saremmo lieti se voleste valutarci come fornitore.

Per offrirVi la massima praticità di consultazione, mettiamo gratuitamente a Vostra disposizione due strumenti senza impegno: [IL_CATALISTINO_PDF] per una panoramica immediata, e [LE_CREDENZIALI] per cercare qualsiasi altro codice su [IL_PORTALE_B2B].

{CREDENTIALS_BLOCK}

Entrambi gli strumenti riportano già la condizione di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE].

[QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T047',
    name: 'Catalogo Illustrativo PDF — Selezione Dedicata per il Vostro Settore',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Selezione prodotti e listino PDF [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nel presentarVi [IDENTITA_IZZO] abbiamo voluto preparare qualcosa di utile e mirato [PER_IL_COMPARTO] {SECTOR_SHORT}, invitandoVi a valutare con calma la nostra proposta di fornitura.

Nel riquadro seguente potrete aprire [IL_CATALISTINO_PDF] dedicato alle famiglie {RECOMMENDED_FAMILY}, oppure usare le credenziali provvisorie gratuite create solo per Vostra comodità di accesso al sito.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Ogni articolo gode inoltre dello sconto di benvenuto {DISCOUNT_FORMULA} qualora voleste effettuare un primo ordine di prova [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T048',
    name: 'Catalogo Illustrativo PDF — Lettura Semplice per Ufficio e Reparto Operativo',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] (con Catalistino PDF) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci permettiamo di sottoporre [IDENTITA_IZZO] alla Vostra attenzione come possibile fornitore B2B, condividendo [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

È un documento leggero e chiaro che potrete condividere internamente o conservare per futuri confronti, affiancato per Vostra comodità da [LE_CREDENZIALI] su [IL_PORTALE_B2B].

{CREDENTIALS_BLOCK}

Precisiamo che sia il catalogo PDF sia le credenziali temporanee sono gratuiti e non comportano alcun vincolo. Per un eventuale primo ordine resta disponibile lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T049',
    name: 'Catalogo Illustrativo PDF — Panoramica Prezzi Riservati e Disponibilità',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Catalogo illustrativo B2B Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_RIVENDITA]. Con questo spirito Vi scriviamo da [IDENTITA_IZZO] per invitarVi a valutarci liberamente come fornitore all’ingrosso.

[INVITO_CLIC_PDF] [PUO_VISIONARE] il nostro prospetto PDF illustrato e utilizzare, se lo desiderate, le credenziali provvisorie gratuite predisposte per accedere in autonomia a tutti i listini del portale.

{CREDENTIALS_BLOCK}

Sul primo acquisto conoscitivo potrete contare su [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE] e con [TEMPI_RESA].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T050',
    name: 'Catalogo Illustrativo PDF — Invito Veloce alla Consultazione del PDF',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Estratto listino PDF gratuito [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi inviamo un breve saluto di presentazione da [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) per invitarVi a valutarci come fornitore.

Solo per Vostra comodità lasciamo qui sotto il link per sfogliare gratuitamente [IL_CATALISTINO_PDF] e le credenziali provvisorie per consultare senza impegno [IL_PORTALE_B2B], dove è già previsto lo sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo ordine.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  // ==========================================================================
  // GRUPPO 6 (T051 - T060): GAMMA TECNICA ELETTRICO, LED, QUADRI & FISSAGGIO
  // ==========================================================================
  {
    code: 'T051',
    name: 'Gamma Tecnica — Illuminazione LED Tecnica, Civile e Industriale',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_RAPIDITA] — Presentazione Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ci fa piacere presentare alla Vostra azienda [IDENTITA_IZZO] e invitarVi a valutarci liberamente come fornitore B2B, in particolare per il comparto illuminotecnico ed elettrico.

Sul nostro catalogo trattiamo un’ampia selezione professionale [DETTAGLIO_LUCE_LED], con articoli scelti [RAPPORTO_QUALITA_PREZZO]. Per Vostra comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] così possiate consultare senza impegno schede tecniche e prezzi netti.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete metterci alla prova su un primo ordine, troverete già pronto lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T052',
    name: 'Gamma Tecnica — Materiale Elettrico, Modulare DIN e Quadristica',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Forniture elettriche e quadristica B2B — Invito di valutazione per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], per sottoporre alla Vostra libera valutazione la nostra gamma dedicata agli impianti elettrici e ai quadri.

Trattiamo regolarmente [DETTAGLIO_ELETTRICO_QUADRO], [EQUIVALENZA_TECNICA]. Solo per agevolarVi in una consultazione senza impegno, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Sul primo ordine conoscitivo è inoltre disponibile [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T053',
    name: 'Gamma Tecnica — Fissaggio, Sigillanti, Utensileria e Consumabili',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Elettrico, fissaggio e utensileria B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

nel presentarVi la nostra azienda desideriamo invitarVi a valutare [IDENTITA_IZZO] anche per tutti i materiali complementari che servono quotidianamente in cantiere, in officina o a banco vendita.

Accanto all’illuminazione e al materiale elettrico disponiamo infatti di [DETTAGLIO_BANCO_FERRAMENTA], [IMPIEGO_PRATICO]. Per Vostra comodità abbiamo predisposto gratuitamente delle credenziali provvisorie sul nostro portale B2B.

{CREDENTIALS_BLOCK}

Potrete così visionare ogni articolo in piena autonomia e senza alcun costo, usufruendo dello sconto di benvenuto {DISCOUNT_FORMULA} qualora voleste effettuare una prima prova [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T054',
    name: 'Gamma Tecnica — Un Unico Catalogo per Più Esigenze Merceologiche',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — Panoramica linee B2B',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[ATTACCO_CANTIERE]. Per questo motivo ci permettiamo di presentarVi [IDENTITA_IZZO] invitandoVi a valutarci come possibile fornitore multiprodotto.

Su [IL_PORTALE_B2B] riuniamo in un unico spazio [SETTORI_MERCEOLOGICI], [CERTEZZA_EVASIONE]. Per farVi esplorare comodamente l’intero assortimento senza moduli di iscrizione, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. In caso di un primo ordine di prova è già previsto lo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T055',
    name: 'Gamma Tecnica — Soluzioni Affidabili per il Vostro Settore Operativo',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Linee B2B {SECTOR_SHORT} — Presentazione Izzo Distribuzione S.r.l. a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE] per far conoscere a {COMPANY_NAME} le nostre linee dedicate [PER_IL_COMPARTO] {SECTOR_SHORT}, invitandoVi a valutarci con calma come fornitore.

In particolare troverete disponibili {RECOMMENDED_FAMILY}, con articoli selezionati [CONFORMITA_QUALITA]. Qui di seguito lasciamo per Vostra comodità un accesso provvisorio gratuito al portale e al Catalistino PDF.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Resta inoltre a Vostra disposizione lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T056',
    name: 'Gamma Tecnica — Articoli Certificati ad Alta Rotazione',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] | Qualità certificata e listini B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

quando si valuta un nuovo fornitore tecnico contano sia il prezzo sia l’affidabilità del materiale installato o rivenduto. Con questa premessa desideriamo presentarVi [IDENTITA_IZZO].

Selezioniamo prodotti [ARTICOLI_ALTA_ROTAZIONE] [CONFORMITA_QUALITA], proponendoli [VANTAGGIO_DIRETTO]. Per consentirVi una verifica diretta e gratuita, [ABBIAMO_ATTIVATO] per Vostra comodità [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

Potrete consultare schede tecniche e prezzi senza alcun vincolo e, se lo vorrete, provare il servizio con [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T057',
    name: 'Gamma Tecnica — Dall’Illuminotecnica alla Domotica e Serie Civile',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Catalogo elettrico, serie civile e LED B2B — Presentazione a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per invitarVi a valutare senza impegno il nostro catalogo all’ingrosso dedicato agli operatori con Partita IVA.

All’interno di [IL_PORTALE_B2B] spaziate comodamente tra [DETTAGLIO_ELETTRICO_QUADRO] e linee complete di illuminazione LED. Unicamente per Vostra comodità [ABBIAMO_PREPARATO] [LE_CREDENZIALI] pronte all’uso.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. In caso di interesse per una prima fornitura è attivo lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], con [CURA_IMBALLO].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T058',
    name: 'Gamma Tecnica — Materiali Pronti a Magazzino per Lavorare Senza Attese',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] — Assortimento disponibile per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci permettiamo di presentarVi [IDENTITA_IZZO] con l’invito a valutarci come fornitore per i materiali [IN_PRONTA_CONSEGNA] di uso più comune nel settore {SECTOR_SHORT}.

Presso [NOSTRO_DEPOSITO] manteniamo disponibili le referenze di maggiore rotazione su [SETTORI_MERCEOLOGICI], [CERTEZZA_EVASIONE]. Per farVi controllare liberamente disponibilità e prezzi, lasciamo qui sotto delle credenziali provvisorie gratuite create per Vostra comodità.

{CREDENTIALS_BLOCK}

Non c’è alcun costo né alcun obbligo; qualora decideste di testarci, potrete usufruire anche dello sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T059',
    name: 'Gamma Tecnica — Equilibrio tra Prestazioni Tecniche e Convenienza',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Proposta forniture tecniche B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[ATTACCO_RIVENDITA]. È proprio su questo equilibrio che lavora [IDENTITA_IZZO], realtà B2B che ci fa piacere sottoporre alla Vostra valutazione come possibile fornitore.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[ACCESSO_SENZA_IMPEGNO]. Sul primo ordine conoscitivo è già riservato lo sconto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T060',
    name: 'Gamma Tecnica — Esplorazione Libera delle Famiglie di Prodotto',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Elettrico, LED e Utensileria',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi scriviamo una breve presentazione di [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) per invitarVi a scoprire il nostro assortimento professionale e valutarci liberamente tra i Vostri fornitori.

Con le credenziali provvisorie gratuite predisposte qui sotto per Vostra comodità potrete [FUNZIONI_PORTALE], trovando già impostato anche lo sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 7 (T061 - T070): PRESENTAZIONE REFERENTE UMANO & CONTATTO DIRETTO
  // ==========================================================================
  {
    code: 'T061',
    name: 'Referente Diretto — Presentazione Personale con Credenziali di Cortesia',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione {AGENT_NAME} — Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sono {AGENT_NAME}, [TITOLO_REFERENTE] di [IDENTITA_IZZO], e mi permetto di scriverVi per presentare la nostra azienda e invitarVi a valutarci liberamente come fornitore B2B.

Credo molto nel rapporto diretto e trasparente: per non disturbarVi con telefonate improvvise e lasciarVi valutare con calma i nostri articoli e i nostri prezzi, ho preparato gratuitamente per Vostra comodità delle credenziali provvisorie di consultazione sul nostro portale e [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se un giorno vorrete metterci alla prova, troverete già pronto anche lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE]. Per qualsiasi domanda rispondo personalmente ai recapiti qui sotto.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T062',
    name: 'Referente Diretto — Un Interlocutore Reale Accanto al Portale B2B',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Un riferimento B2B diretto [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in un mercato dove spesso ci si scontra con portali impersonali, in [IDENTITA_IZZO] ci teniamo a unire la praticità del catalogo online alla presenza costante di un referente reale. Con questo spirito Vi invitiamo a valutarci come fornitore per [SETTORI_MERCEOLOGICI].

Per Vostra semplice comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI], così che possiate guardare prodotti e prezzi netti in autonomia, sapendo di poter contare sempre su {AGENT_NAME} ([CONTATTO_UMANO_VERO]).

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Sul Vostro eventuale primo ordine è già previsto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T063',
    name: 'Referente Diretto — Disponibilità per Preventivi Veloci via Email o WhatsApp',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — Contatto diretto e catalogo gratuito',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

mi presento volentieri alla Vostra struttura: sono {AGENT_NAME} di [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) e Vi scrivo per sottoporre la nostra realtà alla Vostra valutazione come fornitore.

Per farVi verificare subito i nostri prezzi senza attese, ho predisposto gratuitamente per Vostra comodità un accesso provvisorio a [IL_PORTALE_B2B] con lo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) già visibile in anteprima.

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA]. Le credenziali provvisorie sono del tutto gratuite e non comportano alcun impegno.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T064',
    name: 'Referente Diretto — Nessuna Insistenza Commerciale, Massima Disponibilità',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Nota conoscitiva da {AGENT_NAME} (Izzo Distribuzione S.r.l.) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

rispettiamo molto il lavoro quotidiano delle aziende e non amiamo le insistenze pubblicitarie: per questo Vi inviamo semplicemente un invito cortese a valutare [IDENTITA_IZZO] come possibile fornitore nel settore {SECTOR_SHORT}.

Qui sotto trovate delle credenziali provvisorie gratuite create solo per Vostra comodità e il link a [IL_CATALISTINO_PDF], oltre ai miei recapiti diretti qualora un giorno aveste bisogno di un confronto prezzi o di una fornitura.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per un eventuale primo ordine di prova resta a disposizione lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T065',
    name: 'Referente Diretto — Assistenza Dedicata su Liste Materiali e Commesse',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Presentazione fornitore e supporto preventivi B2B — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per presentarVi il nostro servizio di fornitura B2B su [SETTORI_MERCEOLOGICI] e invitarVi a valutarci tra i Vostri fornitori.

Oltre a lasciarVi gratuitamente per Vostra comodità [LE_CREDENZIALI] per consultare i prezzi netti online, il nostro referente {AGENT_NAME} è a Vostra disposizione per affiancarVi su richieste specifiche: [QUOTAZIONI_SU_COMMESSA].

{CREDENTIALS_BLOCK}

L’accesso provvisorio è puramente conoscitivo e senza impegno, e include già l’agevolazione di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T066',
    name: 'Referente Diretto — Un Contatto Semplice tra Aziende',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Piacere di presentarci a {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi scrivo con piacere a nome di [IDENTITA_IZZO]: non ci conosciamo ancora e il senso di questa email è semplicemente presentarci con discrezione, invitandoVi a valutarci come fornitore quando potrà farVi comodo.

Per permetterVi di vedere subito chi siamo, cosa trattiamo e con quali prezzi lavoriamo, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] e preparato [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete provarci con un primo ordine anche piccolo, troverete attivo lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T067',
    name: 'Referente Diretto — Chiarezza nelle Risposte e Cura del Cliente',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] — Izzo Distribuzione S.r.l. al servizio di {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] lavoriamo ogni giorno per [SUPPORTARE_LAVORO] {COMPANY_NAME} e delle realtà professionali che cercano un fornitore [AGGETTIVO_SOLIDO_M] su [SETTORI_MERCEOLOGICI].

Vi invitiamo volentieri a valutarci partendo da una libera consultazione del nostro catalogo: a questo scopo [ABBIAMO_PREPARATO] [LE_CREDENZIALI], totalmente gratuite e senza alcun vincolo, accompagnate dal supporto diretto di {AGENT_NAME}.

{CREDENTIALS_BLOCK}

Qualora decideste di testare il nostro servizio, sul primo acquisto è previsto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA], [ZERO_MINIMO_ORDINE] e con [FLUSSO_RAPIDO].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T068',
    name: 'Referente Diretto — Invito a Salvare i Nostri Recapiti Aziendali',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Recapiti commerciali e catalogo B2B gratuito [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE] affinché possiate, se lo riterrete utile, conservare i riferimenti di [IDENTITA_IZZO] tra i fornitori da interpellare per le linee {RECOMMENDED_FAMILY}.

Per Vostra comodità abbiamo incluso qui sotto sia un accesso ospite gratuito al nostro portale B2B (con sconto di benvenuto {DISCOUNT_FORMULA} sul primo ordine), sia tutti i nostri recapiti diretti e riferimenti societari completi in calce.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Restiamo a disposizione [PER_OGNI_ESIGENZA], [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T069',
    name: 'Referente Diretto — Dal Primo Sguardo al Catalogo al Supporto Quotidiano',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] — Un saluto a {COMPANY_NAME} da Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

ci presentiamo a {COMPANY_NAME} con la massima semplicità: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], e saremmo lieti di essere valutati come Vostro possibile fornitore B2B.

Per renderVi immediata la consultazione dei prezzi riservati alle Partite IVA, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD], affiancate dalla disponibilità diretta del nostro ufficio commerciale ([CONTATTO_UMANO_VERO]).

{CREDENTIALS_BLOCK}

Nessun costo e nessun impegno: solo la comodità di verificare quando vorrete il nostro catalogo e lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T070',
    name: 'Referente Diretto — Lettera Aperta di Presentazione Commerciale',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Invito a valutare Izzo Distribuzione S.r.l. come fornitore — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

mi chiamo {AGENT_NAME} e seguo i rapporti con le aziende per [IDENTITA_IZZO]. Vi scrivo perché ci farebbe davvero piacere far conoscere il nostro catalogo alla Vostra realtà e invitarVi a valutarci come fornitore per [SETTORI_MERCEOLOGICI].

Per agevolarVi senza chiederVi alcuna registrazione, ho lasciato attive gratuitamente delle credenziali provvisorie di consultazione e un estratto PDF illustrato con lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se avrete piacere di scriverci anche solo per un confronto prezzi, sarò lieto di risponderVi personalmente.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 8 (T071 - T080): FORNITORE ALTERNATIVO DA AFFIANCARE CON LIBERTÀ
  // ==========================================================================
  {
    code: 'T071',
    name: 'Fornitore Alternativo — Un Canale B2B in Più Accanto ai Fornitori Abituali',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Un fornitore B2B in più da valutare senza impegno — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI]. Proprio con questo spirito ci permettiamo di presentarVi [IDENTITA_IZZO], invitandoVi a valutarci [RUOLO_SECONDO_CANALE].

Non chiediamo di cambiare le Vostre abitudini, ma semplicemente di dare uno sguardo quando Vi è comodo al nostro catalogo di [SETTORI_MERCEOLOGICI]: per questo [ABBIAMO_ATTIVATO] gratuitamente per Vostra comodità [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Qualora su qualche articolo ci trovaste convenienti e voleste fare una prova, è già pronto lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T072',
    name: 'Fornitore Alternativo — Utile per Confronti Rapidi e Fabbisogni Mirati',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — Un’alternativa B2B comoda e trasparente',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE]. Con questa email desideriamo presentarVi [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) e invitarVi a valutarci come fornitore complementare per la Vostra attività.

Per offrirVi uno strumento pronto all’uso [QUANDO_SERVE_SUBITO], [ABBIAMO_PREPARATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B] e [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

La consultazione è gratuita e totalmente libera da impegni; in più, per un eventuale primo acquisto conoscitivo è previsto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [VANTAGGIO_ZERO_SCORTE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T073',
    name: 'Fornitore Alternativo — Libertà di Sceglierci Solo Quando Conviene',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Invito a valutarci tra i fornitori di {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

sappiamo bene che ogni azienda strutturata collabora già con propri fornitori di fiducia. Il motivo per cui Vi scriviamo da [IDENTITA_IZZO] è semplicemente proporci come un’ulteriore opzione seria e trasparente da consultare in totale libertà.

Solo per Vostra comodità [ABBIAMO_ATTIVATO] un accesso provvisorio gratuito al nostro portale B2B, così possiate verificare in qualsiasi momento se su {RECOMMENDED_FAMILY} possiamo offrirVi un vantaggio concreto.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Sul primo ordine di prova troverete attivo lo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE], [DOPO_PRIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T074',
    name: 'Fornitore Alternativo — Flessibilità sugli Ordini Piccoli e Medi',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_RAPIDITA] — Un riferimento B2B flessibile per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE] per sottoporre [IDENTITA_IZZO] alla Vostra valutazione come fornitore agile, pensato per [EVITARE_DISAGI].

Che si tratti di integrare pochi pezzi o di quotare una fornitura più ampia, lavoriamo [ZERO_MINIMO_ORDINE] e con [DESTINAZIONE_FLESSIBILE]. Qui sotto trovate delle credenziali provvisorie gratuite create unicamente per farVi consultare comodamente catalogo e listini.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per il primo ordine conoscitivo è inoltre disponibile lo sconto {DISCOUNT_FORMULA} [AMBITO_DISPONIBILITA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T075',
    name: 'Fornitore Alternativo — Un Secondo Riscontro Sempre Accessibile H24',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Catalogo B2B consultabile liberamente [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

poter controllare a qualsiasi ora disponibilità e prezzo netto su un secondo portale B2B è spesso un aiuto prezioso nella preparazione dei preventivi. Per questo Vi invitiamo a conoscere [IDENTITA_IZZO] e a valutarci come fornitore.

Per evitarVi procedure di iscrizione, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] [NOTA_CAMBIO_PASSWORD], insieme a [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

L’accesso è gratuito e senza alcun vincolo commerciale; qualora decideste di effettuare una prima fornitura di prova, potrete beneficiare dello sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T076',
    name: 'Fornitore Alternativo — Valutazione Graduale Senza Alcuna Fretta',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] con l’auspicio di farci conoscere da {COMPANY_NAME} [RUOLO_SECONDO_CANALE] nel comparto {SECTOR_SHORT}.

Crediamo nelle collaborazioni che nascono con gradualità e fiducia: per questo non Vi chiediamo alcun impegno, ma lasciamo semplicemente a Vostra disposizione [LE_CREDENZIALI] per dare uno sguardo gratuito ai nostri prodotti quando avrete tempo.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. A titolo di benvenuto resta predisposto lo sconto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T077',
    name: 'Fornitore Alternativo — Risparmio di Tempo nelle Verifiche Quotidiane',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] — Uno strumento gratuito di confronto prezzi per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nel lavoro d’ufficio e di cantiere poter verificare in un attimo se un materiale è disponibile e quanto costa al netto permette di [EVITARE_DISAGI]. Con questa idea Vi presentiamo [IDENTITA_IZZO] e Vi invitiamo a valutarci come fornitore.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Oltre alla consultazione libera di [SETTORI_MERCEOLOGICI], per un eventuale primo ordine è già attivo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T078',
    name: 'Fornitore Alternativo — Affiancamento su Elettrico, Illuminazione e Minuteria',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione B2B Izzo Distribuzione S.r.l. — Invito libero per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ci fa piacere presentarVi [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], invitandoVi a valutare il nostro catalogo come risorsa aggiuntiva per gli acquisti di {COMPANY_NAME}.

Trattando sia materiale elettrico e illuminazione LED sia fissaggio e utensileria, spesso riusciamo a essere un valido appoggio sulle forniture correnti [IMPIEGO_PRATICO]. Per Vostra comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI], gratuite e senza alcun impegno.

{CREDENTIALS_BLOCK}

Se un giorno vorrete provarci, troverete già pronto lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE] con [TEMPI_RESA].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T079',
    name: 'Fornitore Alternativo — Serietà Commerciale Come Unico Biglietto da Visita',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Invito a conoscere Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

quando ci si propone a un’azienda che non ci conosce ancora, contano solo i fatti: [VALORE_PUNTUALITA]. È su queste basi che Vi invitiamo a valutare [IDENTITA_IZZO] tra i Vostri fornitori B2B.

Per consentirVi di verificare direttamente il nostro modo di lavorare, [METTIAMO_A_DISPOSIZIONE] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF], senza alcun costo né vincolo.

{CREDENTIALS_BLOCK}

In caso di una prima fornitura conoscitiva potrete inoltre contare sullo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T080',
    name: 'Fornitore Alternativo — Un Invito Aperto per Ogni Esigenza Futura',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_FORMULA_PROMO] — Presentazione Izzo Distribuzione S.r.l. a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE]: con [IDENTITA_IZZO] operiamo [COPERTURA_ITALIA] al servizio delle Partite IVA e desideriamo invitarVi a valutarci liberamente come fornitore alternativo.

Per Vostra esclusiva comodità lasciamo qui sotto delle credenziali temporanee gratuite per visitare [IL_PORTALE_B2B] quando preferite, con lo sconto di benvenuto {DISCOUNT_FORMULA} già predisposto per un eventuale primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [QUOTAZIONI_SU_COMMESSA].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 9 (T081 - T090): NOTA CONOSCITIVA BREVE & ESSENZIALE
  // ==========================================================================
  {
    code: 'T081',
    name: 'Nota Breve — Presentazione Essenziale in Tre Punti Chiari',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Breve presentazione fornitore B2B [OGG_PER_AZIENDA] {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi rubiamo meno di un minuto per presentarVi [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) e invitarVi a valutarci come possibile fornitore su [SETTORI_MERCEOLOGICI].

Solo per Vostra comodità, gratuitamente e senza alcun impegno, [ABBIAMO_ATTIVATO] un accesso provvisorio al nostro catalogo B2B e un estratto PDF con lo sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T082',
    name: 'Nota Breve — Biglietto da Visita Digitale con Accesso Gratuito',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Biglietto da visita B2B per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

considerate pure questa breve email come un semplice biglietto da visita di [IDENTITA_IZZO], con l’invito a valutarci liberamente come fornitore B2B quando ne avrete occasione.

Per permetterVi di dare uno sguardo immediato ai nostri articoli e prezzi netti senza registrazioni, lasciamo a Vostra disposizione delle credenziali provvisorie totalmente gratuite e non vincolanti.

{CREDENTIALS_BLOCK}

Qualora voleste un giorno provare il servizio, sul primo ordine è attivo lo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T083',
    name: 'Nota Breve — Invito Sintetico per l’Ufficio Acquisti',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] — {COMPANY_NAME} | Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per farci conoscere dalla Vostra struttura e invitarVi a valutare senza impegno il nostro listino riservato alle aziende del comparto {SECTOR_SHORT}.

Qui sotto riportiamo per Vostra comodità le credenziali provvisorie gratuite di consultazione su [IL_PORTALE_B2B] e il link al Catalistino PDF, dove è già prevista l’agevolazione di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T084',
    name: 'Nota Breve — Chiarezza Immediata su Chi Siamo e Cosa Offriamo',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Presentazione Izzo Distribuzione S.r.l. e catalogo B2B gratuito per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[CONNETTIVO_SINTESI] Vi scriviamo da [IDENTITA_IZZO] per presentarci come distributore B2B di [SETTORI_MERCEOLOGICI] e invitarVi a valutarci tra i Vostri fornitori.

Per farVi consultare comodamente i prezzi netti riservati alle Partite IVA abbiamo creato un accesso ospite gratuito e senza alcun vincolo, accompagnato da [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} qualora voleste effettuare una prima prova [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Restiamo volentieri a disposizione ai recapiti in calce [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T085',
    name: 'Nota Breve — Un Minuto per Verificare la Nostra Convenienza',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

non conoscendoci ancora, abbiamo voluto presentarVi [IDENTITA_IZZO] nel modo più semplice e rispettoso del Vostro tempo: un invito libero a valutarci come fornitore attraverso i nostri prodotti e i nostri prezzi reali.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete metterci alla prova su un primo ordine, troverete già applicabile lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T086',
    name: 'Nota Breve — Riferimenti Diretti e Portale Ospite Gratuito',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '[OGG_RAPIDITA] — Contatto conoscitivo B2B per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE]: con [IDENTITA_IZZO] forniamo all’ingrosso {RECOMMENDED_FAMILY} [COPERTURA_ITALIA] e ci farebbe piacere essere valutati dalla Vostra azienda come fornitore.

Le credenziali provvisorie nel riquadro seguente sono state predisposte gratuitamente solo per Vostra comodità di consultazione, senza alcun costo né contratto, e includono lo sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo acquisto.

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T087',
    name: 'Nota Breve — Presentazione Sobria Senza Formalità',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Invito a consultare il catalogo B2B Izzo Distribuzione S.r.l. — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Vi contattiamo da [IDENTITA_IZZO] con il piacere di sottoporre il nostro catalogo B2B alla valutazione di {COMPANY_NAME} per le forniture di [SETTORI_MERCEOLOGICI].

Per evitarVi moduli o attese, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]: potete usarle gratuitamente anche solo per curiosità o confronto prezzi, sapendo che per una prima prova d’ordine è disponibile lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T088',
    name: 'Nota Breve — Scheda Sintetica Condizioni di Benvenuto',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME} — Nota conoscitiva',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

desideriamo presentarVi sinteticamente [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], invitandoVi a valutarci liberamente come fornitore B2B.

Per Vostra comodità abbiamo preparato un accesso ospite gratuito al portale e un prospetto PDF illustrativo, con [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) utilizzabile senza minimo d’ordine qualora decideste di testarci.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T089',
    name: 'Nota Breve — Un Saluto Commerciale Discreto e Trasparente',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Presentazione fornitore B2B Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

Vi inviamo questa nota conoscitiva per far conoscere [IDENTITA_IZZO] alla Vostra azienda e invitarVi a valutare con calma il nostro servizio di fornitura all’ingrosso.

Nel riquadro sottostante trovate [LE_CREDENZIALI] e [IL_CATALISTINO_PDF], predisposti gratuitamente per Vostra sola comodità, oltre allo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T090',
    name: 'Nota Breve — Consultazione Immediata e Contatto Umano',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Invito conoscitivo B2B per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

siamo [IDENTITA_IZZO] e ci occupiamo di distribuzione B2B di [SETTORI_MERCEOLOGICI]: Vi scriviamo semplicemente per invitarVi a valutarci come possibile fornitore.

Per comodità Vi lasciamo delle credenziali provvisorie gratuite per guardare listini e disponibilità su [IL_PORTALE_B2B] (con benvenuto {DISCOUNT_FORMULA} su un eventuale primo ordine), restando sempre disponibili ai recapiti aziendali qui in calce.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 10 (T091 - T100): SUPPORTO ALLE AZIENDE DEL TERRITORIO & PREVENTIVI
  // ==========================================================================
  {
    code: 'T091',
    name: 'Aziende del Territorio — Invito Conoscitivo per le Realtà di Zona',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Presentazione Izzo Distribuzione S.r.l. alle aziende di {CITY} — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[CONTESTO_ZONA] {CITY}, ci fa particolarmente piacere presentare [IDENTITA_IZZO] alla Vostra realtà e invitarVi a valutarci liberamente come fornitore B2B.

Trattiamo all’ingrosso [SETTORI_MERCEOLOGICI], [COPERTURA_ITALIA]. Unicamente per Vostra comodità, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] così possiate consultare senza alcun impegno articoli e prezzi netti.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per un eventuale primo ordine di prova presso {CITY} è già disponibile lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T092',
    name: 'Aziende del Territorio — Spedizioni Curate e Preventivi Dedicati',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Forniture B2B e listino gratuito',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE], con il desiderio di farci conoscere da {COMPANY_NAME} e invitarVi a valutarci tra i Vostri fornitori per il comparto {SECTOR_SHORT}.

Serviamo regolarmente gli operatori di {CITY} con [TEMPI_RESA] e [DESTINAZIONE_FLESSIBILE]. Per permetterVi di verificare comodamente la nostra convenienza, [ABBIAMO_PREPARATO] [LE_CREDENZIALI] gratuite e senza vincoli.

{CREDENTIALS_BLOCK}

Oltre ai listini già scontati con la formula di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO], siamo sempre disponibili per offerte dedicate: [QUOTAZIONI_SU_COMMESSA].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T093',
    name: 'Aziende del Territorio — Un Partner Vicino anche a Distanza',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Un contatto B2B per le forniture di {COMPANY_NAME}{CITY_PAREN} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_REFERENTE],

[CONTESTO_ZONA] {CITY}, desideriamo presentarVi con semplicità [IDENTITA_IZZO] e invitarVi a valutare il nostro servizio di fornitura B2B su {RECOMMENDED_FAMILY}.

Anche a distanza lavoriamo con grande vicinanza al cliente ([CONTATTO_UMANO_VERO]) e con massima chiarezza sui prezzi: per Vostra comodità abbiamo predisposto gratuitamente delle credenziali provvisorie per visitare [IL_PORTALE_B2B] quando preferite.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se vorrete metterci alla prova con una prima fornitura, troverete già pronto [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T094',
    name: 'Aziende del Territorio — Servizio Snello per Cantieri, Studi e Punti Vendita',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_RAPIDITA] [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Presentazione B2B',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

[ATTACCO_CANTIERE]. Con questo spirito presentiamo [IDENTITA_IZZO] a {COMPANY_NAME}, invitandoVi a valutarci come possibile fornitore per le Vostre attività su {CITY}.

[INVITO_MORBIDO_CATALISTINO]

{CREDENTIALS_BLOCK}

L’accesso provvisorio è completamente gratuito e senza impegno; qualora decideste di testare il nostro servizio, potrete contare sullo sconto di benvenuto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE] e su [CURA_IMBALLO].

[FRASE_DISPONIBILITA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T095',
    name: 'Aziende del Territorio — Quotazioni su Misura su Computi e Liste Materiali',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Preventivi B2B senza impegno e catalogo gratuito [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci permettiamo di presentare [IDENTITA_IZZO] alla Vostra azienda con un doppio invito senza alcun impegno: valutarci tramite il catalogo online oppure metterci alla prova su una richiesta di preventivo.

Per Vostra comodità [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B], già configurate con lo sconto di benvenuto {DISCOUNT_FORMULA} per un eventuale primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T096',
    name: 'Aziende del Territorio — Supporto agli Operatori Professionali con P.IVA',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Invito di valutazione fornitore per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: da [IDENTITA_IZZO] affianchiamo [TARGET_PROFESSIONALE] anche nell’area di {CITY}, offrendo una distribuzione B2B diretta su [SETTORI_MERCEOLOGICI].

Poiché non ci conosciamo ancora, abbiamo voluto metterVi nella condizione più comoda e trasparente possibile per valutarci: qui sotto trovate delle credenziali provvisorie gratuite per consultare listini e disponibilità, oltre a [IL_CATALISTINO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per una eventuale prima fornitura conoscitiva resta riservato a {COMPANY_NAME} lo sconto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[PROMESSA_FIDUCIA]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T097',
    name: 'Aziende del Territorio — Flessibilità di Consegna in Sede o Destinazione Operativa',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] — Servizio forniture B2B [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nel sottoporre [IDENTITA_IZZO] alla Vostra cortese valutazione come fornitore B2B, desideriamo evidenziare la praticità operativa con cui seguiamo le aziende su {CITY} e in tutta Italia: [FLUSSO_RAPIDO], [DESTINAZIONE_FLESSIBILE].

Per farVi esaminare in autonomia assortimento e prezzi netti riservati, [ABBIAMO_ATTIVATO] gratuitamente per Vostra comodità [LE_CREDENZIALI].

{CREDENTIALS_BLOCK}

La consultazione non comporta alcun costo né impegno; se vorrete effettuare un primo ordine di prova, troverete già pronto lo sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T098',
    name: 'Aziende del Territorio — Un Contatto Diretto per Rifornimenti e Nuove Commesse',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] [OGG_PER_AZIENDA] {COMPANY_NAME} ({CITY})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[CONTESTO_ZONA] {CITY}, Vi scriviamo da [IDENTITA_IZZO] con il piacere di presentarci e invitarVi a valutarci come fornitore [IMPIEGO_PRATICO].

Per risparmiarVi moduli di registrazione qualora voleste dare uno sguardo ai nostri prezzi, lasciamo a Vostra disposizione [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. In caso di interesse per un primo acquisto conoscitivo potrete usufruire dello sconto di benvenuto {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T099',
    name: 'Aziende del Territorio — Trasparenza Aziendale e Condizioni Chiare',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Presentazione istituzionale Izzo Distribuzione S.r.l. [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

riteniamo che per valutare serenamente un nuovo fornitore a distanza servano due elementi: la massima trasparenza sui prezzi e riferimenti aziendali chiari e verificabili. Con questo spirito Vi presentiamo [IDENTITA_IZZO].

In calce a questa comunicazione riportiamo tutti i nostri dati societari e recapiti diretti, mentre nel riquadro qui sotto lasciamo gratuitamente per Vostra comodità [LE_CREDENZIALI] per visionare catalogo, schede tecniche e lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Restiamo a Vostra disposizione [PER_OGNI_ESIGENZA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T100',
    name: 'Aziende del Territorio — Invito Finale a Conoscerci Senza Impegno',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Invito a valutare Izzo Distribuzione S.r.l. — Catalogo e credenziali gratuite per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

chiudiamo la nostra presentazione con un invito molto semplice e trasparente: quando avrete qualche minuto, provate a valutare [IDENTITA_IZZO] come possibile fornitore per i materiali di [SETTORI_MERCEOLOGICI].

Esclusivamente per Vostra comodità, gratuitamente e senza alcun impegno né contratto, [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] su [IL_PORTALE_B2B] e preparato [IL_CATALISTINO_PDF], includendo anche [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) per chi volesse metterci alla prova su un primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
];
