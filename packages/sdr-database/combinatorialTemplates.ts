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
 * 100 Modelli di Email "Madri" completamente differenti tra loro per struttura,
 * taglio commerciale, lunghezza, ordine degli argomenti e oggetto.
 * Ciascuna email innesta decine di [TOKEN] pescati dinamicamente dal database delle 108 parole.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  // ==========================================================================
  // GRUPPO 1 (T001 - T010): UFFICIO ACQUISTI & CONFRONTO RAPIDO NETTI
  // ==========================================================================
  {
    code: 'T001',
    name: 'Ufficio Acquisti — Confronto Diretto Netti 2gg',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — {DISCOUNT_FORMULA} ([OGG_RAPIDITA])',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI] [VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI].

Per [SUPPORTARE_LAVORO] {COMPANY_NAME}, [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF], abbinato a [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] su [IL_PORTALE_B2B] [CONSENTE_DI] [CONFRONTARE_NETTI] [ZERO_MINIMO_ORDINE] e con [TEMPI_RESA].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA]: [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T002',
    name: 'Ufficio Acquisti — Nota Sintetica 30 Secondi',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{COMPANY_NAME}{CITY_PAREN}: [OGG_APPROCCIO_SOFT] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] per lasciare al Vostro reparto acquisti un riferimento [AGGETTIVO_SOLIDO_M] sulle forniture [IN_PRONTA_CONSEGNA].

Da [IDENTITA_IZZO] [FILOSOFIA_OPERATIVA] [VANTAGGIO_DIRETTO]. Per presentarci coi numeri anziché con le parole, [ABBIAMO_ATTIVATO] [CANALE_RISERVATO] con sconto {DISCOUNT_FORMULA} (netto effettivo {NET_DISCOUNT_PCT}% da listino) [SUL_PRIMO_ACQUISTO], [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T003',
    name: 'Ufficio Acquisti — Parametro di Verifica Fornitori',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME} | [OGG_TIPO_DOC] ({DISCOUNT_FORMULA} su Stock 2gg)',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

chi gestisce gli acquisti [PER_IL_COMPARTO] {SECTOR_SHORT} ha spesso bisogno di verificare al volo due aspetti: [STOCK_REALE] e prezzo netto reale.

Come [QUALIFICA_DISTRIBUTORE] ([IDENTITA_IZZO]), [METTIAMO_A_DISPOSIZIONE] {COMPANY_NAME} [LE_CREDENZIALI] per verificare [AVVERBIO_LIBERAMENTE] entrambi i parametri su {RECOMMENDED_FAMILY}, [TRASPARENZA_PREZZI].

{CREDENTIALS_BLOCK}

[CONNETTIVO_PRATICO] lo sconto {DISCOUNT_FORMULA} è [APPLICAZIONE_CARRELLO] [ZERO_MINIMO_ORDINE], [DOPO_PRIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T004',
    name: 'Ufficio Acquisti — Doppia Colonna Listino e Netto',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Quotazioni nette {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME} — [OGG_RAPIDITA]',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

spesso i cataloghi dei fornitori obbligano a lunghe richieste di preventivo solo per conoscere il netto reale. In [IDENTITA_IZZO] abbiamo scelto l’approccio opposto: [ABBIAMO_PREPARATO] per Voi [IL_CATALISTINO_PDF] [TRASPARENZA_PREZZI].

[INVITO_CLIC_PDF] [PUO_VISIONARE] [GAMMA_SELEZIONATA] [ARTICOLI_ALTA_ROTAZIONE] [CLAUSOLA_SOLO_2GG], già calcolata con [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[AIUTO_PRIMA_LISTA]. [SALUTO_CHIUSURA]`,
  },
  {
    code: 'T005',
    name: 'Ufficio Acquisti — Riduzione Costo Distinta',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] una leva immediata [DIFESA_COMPETITIVITA].

Sulle referenze [ARTICOLI_ALTA_ROTAZIONE] presenti in [NOSTRO_DEPOSITO] ([SETTORI_MERCEOLOGICI]), [ABBIAMO_ATTIVATO] a favore di {COMPANY_NAME} una condizione d’ingresso pari a {DISCOUNT_FORMULA} in cascata [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

È [IMPATTO_SCONTO] [SENSO_DELLA_PROVA], con [TEMPI_RESA] e [CURA_IMBALLO].

Per qualsiasi confronto su singole voci di spesa [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T006',
    name: 'Ufficio Acquisti — Zero Attese Preventivo',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accesso B2B immediato e [OGG_TIPO_DOC] — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

quante volte capita di attendere ore o giorni una quotazione per materiale che serve subito? Con [IL_PORTALE_B2B] di [IDENTITA_IZZO] abbiamo voluto eliminare questo collo di bottiglia per [TARGET_PROFESSIONALE].

Abbiamo già associato alla Vostra ragione sociale [LE_CREDENZIALI]: entrando [TROVA_ATTIVO] lo sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e può [FUNZIONI_PORTALE] ed eventualmente [ORDINARE_AUTONOMIA].

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T007',
    name: 'Ufficio Acquisti — Scheda Fornitore Abilitato',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Abilitazione listino B2B {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Vi informiamo con piacere che presso [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] [COPERTURA_ITALIA]) [ABBIAMO_ATTIVATO] la scheda fornitura riservata alla Vostra azienda, calibrata per il settore {SECTOR_SHORT}.

Il profilo include [IL_CATALISTINO_PDF] scaricabile subito e l’extra agevolazione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [INCISO_SENZA_VINCOLO].

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T008',
    name: 'Ufficio Acquisti — Benchmark Prezzi Materiale Tecnico',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Verifica netti B2B ({DISCOUNT_FORMULA}) per {COMPANY_NAME} — [OGG_RAPIDITA]',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anche quando si hanno già fornitori consolidati, disporre di un listino aggiornato [AFFIDABILITA_DATO_STOCK] aiuta sempre a comprare meglio.

Per questo da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] [IL_CATALISTINO_PDF] studiato per {COMPANY_NAME} ({CITY}), dove [PUO_VISIONARE] e [PUO_SCARICARE_PDF] i nostri migliori articoli 2gg scontati al {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) per il Vostro 1° ordine.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]: verifichi pure 3 o 4 articoli che acquistate ogni settimana per misurare la differenza.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T009',
    name: 'Ufficio Acquisti — Trasparenza Stock + Prezzo Netto',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] ({NET_DISCOUNT_PCT}% netto 1° ordine) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

in [IDENTITA_IZZO] sappiamo che uno sconto alto serve a poco se poi il materiale non è realmente disponibile. Perciò [FILOSOFIA_OPERATIVA].

Abbiamo legato il Vostro trattamento di benvenuto ({DISCOUNT_FORMULA} in cascata, pari al {NET_DISCOUNT_PCT}% netto) proprio [CLAUSOLA_SOLO_2GG], così da unire [IMPATTO_SCONTO] e [VALORE_PUNTUALITA].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

Per qualsiasi domanda [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T010',
    name: 'Ufficio Acquisti — Invito Verifica Veloce su 5 Codici',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta pratica per {COMPANY_NAME}: [OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE]: siamo [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI].

Le lascio qui sotto [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] già scontato al {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] ([CLAUSOLA_SOLO_2GG]).

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA]: vedrà subito sia la rapidità di risposta sia [RAPPORTO_QUALITA_PREZZO] delle nostre linee [IN_PRONTA_CONSEGNA].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 2 (T011 - T020): URGENZA CANTIERE & CONSEGNA RAPIDA 24/48H (2GG)
  // ==========================================================================
  {
    code: 'T011',
    name: 'Urgenza 24/48h — Zero Fermi Lavoro in Cantiere',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_NAME}: [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE] [EVITARE_DISAGI].

Da [IDENTITA_IZZO] serviamo [COPERTURA_ITALIA] [TARGET_PROFESSIONALE] partendo direttamente da [NOSTRO_DEPOSITO], [AFFIDABILITA_DATO_STOCK] e [TEMPI_RESA] [DESTINAZIONE_FLESSIBILE].

Per farVi provare questa rapidità fin dalla prima esigenza, [ABBIAMO_PREPARATO] per {COMPANY_NAME} [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[CERTEZZA_EVASIONE], con [CURA_IMBALLO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T012',
    name: 'Urgenza 24/48h — Consegna Diretta anche sul Luogo Lavori',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Materiale pronto in 24/48h [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Sconto {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[QUANDO_SERVE_SUBITO], poter contare su [NOSTRO_DEPOSITO] con partenza veloce fa risparmiare ore preziose ai tecnici sul campo.

[VERBO_CONTATTARE] [IDENTITA_IZZO] perché [ABBIAMO_ATTIVATO] per la Vostra azienda [CANALE_RISERVATO] dedicato agli articoli [IN_PRONTA_CONSEGNA] ({RECOMMENDED_FAMILY}), [DESTINAZIONE_FLESSIBILE].

{CREDENTIALS_BLOCK}

Sul primo ordine [TROVA_ATTIVO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [APPLICAZIONE_CARRELLO].

[INVITO_MORBIDO_CATALISTINO] basta un clic sul pulsante sopra o una risposta diretta a questa mail.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T013',
    name: 'Urgenza 24/48h — La Certezza dello Stock Fisico Reale',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Stock reale 2gg e listino {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

il problema più frequente negli acquisti online B2B è ordinare merce data per disponibile e scoprire dopo giorni che deve ancora arrivare dal produttore.

In [IDENTITA_IZZO] abbiamo separato nettamente la linea **Pronta Consegna 2gg**: tutto ciò che vede in [IL_CATALISTINO_PDF] ha [STOCK_REALE] in [NOSTRO_DEPOSITO] e parte con [TEMPI_RESA], [CERTEZZA_EVASIONE].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] per il 1° ordine di {COMPANY_NAME} abbiamo abbinato {DISCOUNT_FORMULA} in cascata [ZERO_MINIMO_ORDINE], [SENSO_DELLA_PROVA].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T014',
    name: 'Urgenza 24/48h — Magazzino Esterno Pronto a 2 Giorni',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Un deposito 24/48h già scontato ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

immagini di poter contare su migliaia di articoli elettrici, LED e tecnici pronti a partire in 24/48h [VANTAGGIO_ZERO_SCORTE].

È esattamente il servizio che [IDENTITA_IZZO] offre a {COMPANY_NAME} ({CITY}): [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] con extra condizione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Quando capita un’integrazione urgente o una commessa rapida, ha già tutto pronto e attivo.

[FRASE_DISPONIBILITA] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T015',
    name: 'Urgenza 24/48h — Rifornimento Veloce Squadre e Furgoni',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) — Rifornimenti 24/48h per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

per tenere sempre operativi tecnici, furgoni e cantieri sui materiali [ARTICOLI_ALTA_ROTAZIONE], [IDENTITA_IZZO] ha strutturato una linea rapida 2gg su [SETTORI_MERCEOLOGICI], [FLUSSO_RAPIDO].

Per {COMPANY_NAME} [ABBIAMO_SELEZIONATO] i codici più richiesti [PER_IL_COMPARTO] {SECTOR_SHORT} all’interno di [IL_CATALISTINO_PDF], applicando [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

[CURA_IMBALLO] e [ZERO_MINIMO_ORDINE] rendono semplicissimo anche un primo test veloce.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T016',
    name: 'Urgenza 24/48h — Quando sulla Piazza Locale Manca un Codice',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '{COMPANY_NAME}: [OGG_RAPIDITA] e sconto {DISCOUNT_FORMULA} già attivi',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

capita spesso che al banco locale manchi la quantità necessaria di un proiettore, di una protezione modulare o di un accessorio d’installazione proprio [QUANDO_SERVE_SUBITO].

Tenere a portata di mano l’accesso a [IDENTITA_IZZO] Le permette di verificare in 10 secondi la [STOCK_REALE] in [NOSTRO_DEPOSITO] e ricevere tutto con [TEMPI_RESA], godendo sul 1° ordine dello sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Conservi pure queste credenziali: al primo imprevisto di fornitura Le faranno risparmiare tempo e margine.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T017',
    name: 'Urgenza 24/48h — Dal Clic alla Consegna in 2 Giorni',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Forniture B2B in 48h [OGG_PER_AZIENDA] {COMPANY_NAME} | Sconto {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO], realtà logistica B2B [ESPERIENZA_SERVIZIO].

Abbiamo riservato alla Vostra azienda un pacchetto di benvenuto molto concreto:
1) [IL_CATALISTINO_PDF] focalizzato esclusivamente su articoli con partenza immediata;
2) [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG];
3) [ZERO_MINIMO_ORDINE] e [TEMPI_RESA] [COPERTURA_ITALIA].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA]: [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T018',
    name: 'Urgenza 24/48h — Continuità di Cantiere Garantita',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_RAPIDITA] ({DISCOUNT_FORMULA} 1° ordine) — Riservato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

chiudere un lavoro nei tempi concordati col committente dipende per metà dalla squadra e per metà da [VALORE_PUNTUALITA] dei fornitori.

Da [IDENTITA_IZZO] presidiamo ogni giorno le scorte di {RECOMMENDED_FAMILY} [RICAMBIO_COSTANTE], così da garantire a realtà come {COMPANY_NAME} [CONTESTO_ZONA] {CITY} una fornitura [AGGETTIVO_VELOCE_F] e [CONFORMITA_QUALITA].

{CREDENTIALS_BLOCK}

Provi pure a sfogliare [IL_CATALISTINO_PDF]: ogni prezzo netto tiene già conto dello sconto {DISCOUNT_FORMULA} attivo sul Vostro primo acquisto 2gg.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T019',
    name: 'Urgenza 24/48h — Ordini la Sera, Parte dal Deposito',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Sportello B2B h24 + [OGG_RAPIDITA] ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

spesso la lista del materiale mancante esce a fine giornata, quando i grossisti di zona hanno già chiuso. Su [IL_PORTALE_B2B] di [IDENTITA_IZZO] può controllare scorte e [ORDINARE_AUTONOMIA] anche la sera dall’ufficio o dal telefono, con [FLUSSO_RAPIDO] il mattino seguente.

Per darVi il benvenuto [ABBIAMO_ATTIVATO] [LE_CREDENZIALI] con extra sconto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T020',
    name: 'Urgenza 24/48h — Velocità Logistica + Referente Umano',
    angleGroup: 'Urgenza_Cantiere_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME}: linea veloce 2gg ({DISCOUNT_FORMULA}) + referente diretto',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

unire la velocità di un e-commerce B2B [AFFIDABILITA_DATO_STOCK] alla presenza di un [TITOLO_REFERENTE] ({AGENT_NAME}) è il modo migliore per risolvere forniture urgenti senza errori.

Presso [IDENTITA_IZZO] [ABBIAMO_PREPARATO] per {COMPANY_NAME} sia [IL_CATALISTINO_PDF] sia l’utenza già scontata al {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [DESTINAZIONE_FLESSIBILE].

{CREDENTIALS_BLOCK}

Per verificare al volo grandi quantità o urgenze particolari [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 3 (T021 - T030): VANTAGGIO ECONOMICO DOPPIO SCONTO & ZERO MINIMO
  // ==========================================================================
  {
    code: 'T021',
    name: 'Doppio Sconto — Spiegazione Chiara Cascata (40+10 / 50+10)',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Sconto in cascata {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per far conoscere concretamente la convenienza di [IDENTITA_IZZO] alle aziende [CONTESTO_ZONA] {CITY}, abbiamo scelto di investire direttamente sul Vostro primo ordine.

Oltre al listino B2B professionale ({BASE_DISCOUNT}%), [ABBIAMO_ATTIVATO] per {COMPANY_NAME} un ulteriore +{EXTRA_DISCOUNT}% extra in cascata (pari al **{NET_DISCOUNT_PCT}% di sconto netto effettivo** da listino) [SUL_PRIMO_ACQUISTO], [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] l’agevolazione vale [ZERO_MINIMO_ORDINE] ed è [APPLICAZIONE_CARRELLO], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T022',
    name: 'Doppio Sconto — Prova Senza Minimo d’Ordine',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nessun minimo d’ordine + Sconto {DISCOUNT_FORMULA} (2gg) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

quando si prova un nuovo fornitore B2B è giusto voler iniziare con cautela, magari su una piccola fornitura, senza essere costretti a grandi importi.

Proprio per questo in [IDENTITA_IZZO] [ABBIAMO_PREPARATO] per {COMPANY_NAME} un’offerta d’ingresso [ZERO_MINIMO_ORDINE], ma con [IL_DOPPIO_SCONTO] massimo {DISCOUNT_FORMULA} attivo fin dal primo euro [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Così può testare [CURA_IMBALLO], [VALORE_PUNTUALITA] e qualità di [SETTORI_MERCEOLOGICI] [INCISO_SENZA_VINCOLO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T023',
    name: 'Doppio Sconto — Più Margine sui Vostri Preventivi',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_FORMULA_PROMO] {DISCOUNT_FORMULA} — Riservato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in un mercato dove ogni punto percentuale d’acquisto incide sull’utile finale, comprare con uno sconto {DISCOUNT_FORMULA} in cascata [CONSENTE_DI] recuperare subito marginalità preziosa.

Da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] {COMPANY_NAME} questa condizione [AGGETTIVO_RISERVATA_F] [SUL_PRIMO_ACQUISTO] su tutte le referenze [IN_PRONTA_CONSEGNA] ({RECOMMENDED_FAMILY}), [VANTAGGIO_DIRETTO].

{CREDENTIALS_BLOCK}

[INVITO_CLIC_PDF] [PUO_VISIONARE] i netti già ricalcolati e [CONFRONTARE_NETTI] con estrema rapidità.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T024',
    name: 'Doppio Sconto — Automatico a Carrello Senza Coupon',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Profilo {COMPANY_NAME} attivo: {DISCOUNT_FORMULA} automatico su Pronta Consegna 2gg',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: niente codici sconto da ricordare né richieste da attendere. Sul profilo B2B che [IDENTITA_IZZO] ha predisposto per {COMPANY_NAME}, la regola {DISCOUNT_FORMULA} è [APPLICAZIONE_CARRELLO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Le basta entrare con [LE_CREDENZIALI] qui sopra (o aprire [IL_CATALISTINO_PDF]) per vedere ogni articolo 2gg già scontato al {NET_DISCOUNT_PCT}% netto, [ZERO_MINIMO_ORDINE].

Per qualunque supporto [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T025',
    name: 'Doppio Sconto — Investiamo Noi sul Primo Ordine di Prova',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Offerta benvenuto {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anziché spendere in pubblicità generica, in [IDENTITA_IZZO] preferiamo trasferire un vantaggio economico diretto sul primo acquisto delle aziende del settore {SECTOR_SHORT} che desideriamo farci conoscere.

Per {COMPANY_NAME} questo si traduce in uno sconto effettivo {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], accompagnato da [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T026',
    name: 'Doppio Sconto — Convenienza da Grosso Volume anche sul Singolo Collo',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Condizioni da grande volume ({DISCOUNT_FORMULA}) anche sul 1° ordine — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

di solito le scontistiche più spinte vengono concesse solo a fronte di grossi impegni annuali. Con la formula 1° Acquisto di [IDENTITA_IZZO], {COMPANY_NAME} accede subito a {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE] su tutto lo stock [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

È un modo trasparente per permetterVi di [CONFRONTARE_NETTI] su [SETTORI_MERCEOLOGICI] e testare [TEMPI_RESA], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T027',
    name: 'Doppio Sconto — Focus Risparmio Immediato Materiali di Consumo',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Risparmio netto {DISCOUNT_FORMULA} sui materiali 2gg per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sui materiali [ARTICOLI_ALTA_ROTAZIONE] — quelli che si ricomprano decine di volte l’anno — ottenere un +{EXTRA_DISCOUNT}% extra sopra il listino {BASE_DISCOUNT}% genera un risparmio immediato e concreto.

Come [IDENTITA_IZZO] [ABBIAMO_PREPARATO] per {COMPANY_NAME} esattamente questa opportunità [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [IMPIEGO_PRATICO].

{CREDENTIALS_BLOCK}

Sfogli pure [IL_CATALISTINO_PDF] quando ha cinque minuti: siamo certi che troverà diversi articoli di utilizzo immediato a un netto davvero interessante.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T028',
    name: 'Doppio Sconto — Condizione Attiva Subito, Senza Scadenze Stressanti',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] + Sconto {DISCOUNT_FORMULA} già registrato per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

le scrivo da [IDENTITA_IZZO] per confermarLe che la regola promozionale {DISCOUNT_FORMULA} riservata al 1° acquisto di {COMPANY_NAME} è già stata caricata sul Vostro codice cliente e rimane pronta per quando avrete la prossima necessità di rifornimento [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

Intanto [PUO_VISIONARE] e [PUO_SCARICARE_PDF] [IL_CATALISTINO_PDF], così da avere già i netti sottomano al momento opportuno, [INCISO_SENZA_VINCOLO].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T029',
    name: 'Doppio Sconto — Chiarezza Commerciale al 100%',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Riepilogo condizioni B2B {DISCOUNT_FORMULA} (Solo 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ci piace lavorare con patti chiari e verificabili in un istante:
• Chi siamo: [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI];
• Cosa abbiamo attivato per {COMPANY_NAME}: sconto {DISCOUNT_FORMULA} in cascata ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO];
• Dove si applica: [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE];
• Dopo il 1° ordine: resta attivo il listino B2B {BASE_DISCOUNT}%, [DOPO_PRIMO_ORDINE].

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T030',
    name: 'Doppio Sconto — Un Primo Carrello che Ripaga Subito',
    angleGroup: 'Vantaggio_Doppio_Sconto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{COMPANY_NAME}: attivo extra sconto {DISCOUNT_FORMULA} su [OGG_RAPIDITA]',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [CANALE_RISERVATO] già pronto all’uso, pensato [VANTAGGIO_MARGINE].

All’interno di [IL_CATALISTINO_PDF] [ABBIAMO_SELEZIONATO] per Voi le migliori opportunità [IN_PRONTA_CONSEGNA] per {RECOMMENDED_FAMILY}, tutte coperte dallo sconto 1° ordine {DISCOUNT_FORMULA}.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per ogni richiesta diretta mi trova in risposta a questa email.

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 4 (T031 - T040): LETTERA PERSONALE DEL REFERENTE DEDICATO
  // ==========================================================================
  {
    code: 'T031',
    name: 'Referente Personale — Presentazione Diretta Daniele Savoia',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Presentazione e [OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) per {COMPANY_NAME} — {AGENT_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

mi chiamo {AGENT_NAME} e sono il Vostro [TITOLO_REFERENTE] in [IDENTITA_IZZO]. Le scrivo personalmente perché seguo le aziende del comparto {SECTOR_SHORT} [CONTESTO_ZONA] {CITY}.

So bene quanto sia fastidioso avere a che fare con portali anonimi dove non risponde mai nessuno: per questo, oltre ad averVi attivato [IL_PORTALE_B2B] con sconto 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], ci tenevo a lasciarVi il mio contatto diretto.

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA], [CONTATTO_UMANO_VERO].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T032',
    name: 'Referente Personale — Un Interlocutore Unico per Ogni Esigenza',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Riferimento diretto B2B e listino {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sono {AGENT_NAME} di [IDENTITA_IZZO]. Vi contatto per mettermi a disposizione come referente unico della Vostra azienda per le forniture di [SETTORI_MERCEOLOGICI] [IN_PRONTA_CONSEGNA].

Per iniziare col piede giusto ho già fatto abilitare sul Vostro profilo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] ([CLAUSOLA_SOLO_2GG]) e generato [IL_CATALISTINO_PDF] intestato a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

Qualsiasi dubbio abbia su caratteristiche tecniche, imballi o disponibilità su quantità, [COME_RISPONDERE] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T033',
    name: 'Referente Personale — Proposta di Quotare una Prima Lista',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '{COMPANY_NAME}: posso quotarVi una prima lista con sconto {DISCOUNT_FORMULA}?',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

sono {AGENT_NAME} ([REPARTO_FIRMA] — [IDENTITA_IZZO]). So che durante la giornata lavorativa non sempre c’è il tempo di mettersi a cercare codici su un portale nuovo.

Perciò Le propongo due strade semplicissime:
• se preferisce fare in autonomia, qui sotto trova [IL_CATALISTINO_PDF] e [LE_CREDENZIALI] già attive col {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG];
• se invece ha poco tempo, risponda pure a questa mail con 4 o 5 articoli che acquistate abitualmente e preparo io stesso il prospetto netto scontato per {COMPANY_NAME}.

{CREDENTIALS_BLOCK}

In entrambi i casi sarà un piacere mostrarLe la nostra rapidità.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T034',
    name: 'Referente Personale — Tono Cordiale da Consulente B2B',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Un cordiale contatto da {AGENT_NAME} — [OGG_TIPO_DOC] per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Le scrivo con piacere dalla sede commerciale di [IDENTITA_IZZO]. Seguendo da vicino gli operatori professionali di {CITY}{CITY_PAREN}, ho predisposto personalmente per la Vostra realtà [CANALE_RISERVATO] focalizzato su {RECOMMENDED_FAMILY}.

Ho incluso [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE], così che possiate testare [AVVERBIO_LIBERAMENTE] sia i nostri prodotti sia [TEMPI_RESA].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

Mi consideri fin d’ora a disposizione diretta: [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T035',
    name: 'Referente Personale — Zero Call Center, Risposta Immediata',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Filo diretto B2B + Sconto {DISCOUNT_FORMULA} (2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] uniamo la comodità di ordinare online h24 su [IL_PORTALE_B2B] alla tranquillità di avere una persona vera ({AGENT_NAME}, Cod. {AGENT_CODE}) sempre raggiungibile, [CONTATTO_UMANO_VERO].

Le invio qui sotto [LE_CREDENZIALI] riservate a {COMPANY_NAME} e il collegamento a [IL_CATALISTINO_PDF], dove vede già applicato lo sconto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Quando vuole fare una prova, anche minima, sono qui per seguirLa personalmente dal clic fino allo scarico merce.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T036',
    name: 'Referente Personale — Affiancamento Tecnico e Commerciale',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME}: referente dedicato e [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sono {AGENT_NAME}, referente B2B di [IDENTITA_IZZO]. Nel nostro mestiere non conta solo il prezzo: conta avere dall’altra parte qualcuno che capisca al volo un codice tecnico, verifichi i colli in magazzino e rispetti le urgenze.

Con questo spirito [ABBIAMO_PREPARATO] per {COMPANY_NAME} [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF] e attivato la scontistica speciale {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. Non esiti a scrivermi direttamente in risposta per qualsiasi necessità.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T037',
    name: 'Referente Personale — Nota Breve dopo Preparazione Catalogo',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Ho preparato il Catalistino 2gg ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE]: sono {AGENT_NAME} di [IDENTITA_IZZO]. Ho appena generato il prospetto riservato a {COMPANY_NAME} con gli articoli [IN_PRONTA_CONSEGNA] più adatti al settore {SECTOR_SHORT} e lo sconto 1° ordine {DISCOUNT_FORMULA} già calcolato su ogni riga.

{CREDENTIALS_BLOCK}

[INVITO_MORBIDO_CATALISTINO] se trova qualche linea interessante o desidera una verifica su altri articoli a catalogo, [COME_RISPONDERE].

Buon lavoro e [SALUTO_CHIUSURA]`,
  },
  {
    code: 'T038',
    name: 'Referente Personale — Invito a Conoscerci Senza Fretta',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Piacere di presentarci a {COMPANY_NAME} — [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

mi presento volentieri: sono {AGENT_NAME} e curo i rapporti con le aziende professionali per [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI].

Senza alcuna fretta e [INCISO_SENZA_VINCOLO], desideravo lasciarVi i riferimenti del profilo B2B che abbiamo aperto per {COMPANY_NAME}, comprensivo dell’agevolazione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
Per qualunque confronto, anche telefonico, mi trova sempre disponibile.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T039',
    name: 'Referente Personale — Supporto al Primo Login e Scelta Articoli',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Credenziali B2B e supporto diretto per {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Le scrive {AGENT_NAME} da [IDENTITA_IZZO]. Ho associato il mio codice agente ({AGENT_CODE}) all’anagrafica riservata di {COMPANY_NAME} affinché abbiate sempre assistenza prioritaria sia sulle spedizioni 24/48h sia sulle offerte a volume.

Qui di seguito trova [LE_CREDENZIALI] ([NOTA_CAMBIO_PASSWORD]) e il pulsante per aprire subito [IL_CATALISTINO_PDF] col {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se ha piacere di verificare insieme una fornitura imminente, basta un cenno in risposta.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T040',
    name: 'Referente Personale — Concretezza e Rispetto del Tempo',
    angleGroup: 'Referente_Personale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{AGENT_NAME} (Izzo B2B) — Listino 2gg {DISCOUNT_FORMULA} per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

rispetto molto il tempo di chi lavora, quindi le lascio solo ciò che può esserLe concretamente utile da subito:
1) un catalogo reale di prodotti pronti in 24/48h in [NOSTRO_DEPOSITO];
2) uno sconto effettivo {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) sul 1° ordine 2gg [ZERO_MINIMO_ORDINE];
3) il mio contatto diretto ({AGENT_NAME}) per ogni esigenza tecnica o commerciale.

{CREDENTIALS_BLOCK}

Grazie per l’attenzione e buon lavoro a tutto lo staff di {COMPANY_NAME}.

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 5 (T041 - T050): FOCUS CATALISTINO PDF SFOGLIABILE & SMART LINK
  // ==========================================================================
  {
    code: 'T041',
    name: 'Catalistino PDF — Sfoglia Subito da PC o Smartphone',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] pronto da sfogliare [OGG_PER_AZIENDA] {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per farVi consultare le nostre migliori proposte [IN_PRONTA_CONSEGNA] senza nemmeno dover fare prima il login, in [IDENTITA_IZZO] [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] intestato direttamente a {COMPANY_NAME}.

[INVITO_CLIC_PDF] [PUO_VISIONARE] l’anteprima interattiva e [PUO_SCARICARE_PDF], [DETTAGLIO_CONTENUTO_PDF] con formula {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

Quando individua gli articoli di Suo interesse, entra su [IL_PORTALE_B2B] con [LE_CREDENZIALI] e trova gli stessi identici netti [APPLICAZIONE_CARRELLO] [CLAUSOLA_SOLO_2GG].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T042',
    name: 'Catalistino PDF — Prontuario Prezzi da Tenere sulla Scrivania',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Prontuario PDF Pronta Consegna 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME}, [SALUTO_GIORNATA]

molti responsabili acquisti e titolari preferiscono avere un documento PDF ordinato da aprire al volo quando devono quotare un lavoro o confrontare un prezzo.

Per questo [IDENTITA_IZZO] ha generato su misura per {COMPANY_NAME} [IL_CATALISTINO_PDF] dedicato a {RECOMMENDED_FAMILY}, [OLTRE_AL_PDF].

{CREDENTIALS_BLOCK}

Ogni voce del PDF riflette [STOCK_REALE] in [NOSTRO_DEPOSITO] e lo sconto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) valido sul Vostro primo acquisto 2gg [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T043',
    name: 'Catalistino PDF — Selezione Mirata per il Vostro Settore',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Selezione PDF {SECTOR_SHORT} ({DISCOUNT_FORMULA} 2gg) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anziché inviarVi un catalogo dispersivo di diecimila pagine, da [IDENTITA_IZZO] [ABBIAMO_SELEZIONATO] dentro [IL_CATALISTINO_PDF] solo [GAMMA_SELEZIONATA] [PER_IL_COMPARTO] {SECTOR_SHORT} realmente disponibili per spedizione in 24/48h.

{BRANDS_NOTE}

{CREDENTIALS_BLOCK}

Aprendo il documento vede subito foto, codice, prezzo di listino e netto finito col {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]. E sul sito trova poi migliaia di altri codici complementari!

[FRASE_DISPONIBILITA] [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T044',
    name: 'Catalistino PDF — Consultazione Immediata in Un Clic',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Il Catalistino 2gg riservato a {COMPANY_NAME} è pronto ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] da [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI]): è pronto online [IL_CATALISTINO_PDF] riservato alla Vostra azienda con sconto 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[INVITO_MORBIDO_CATALISTINO] può sfogliarlo subito dal browser oppure salvarlo in PDF, [INCISO_SENZA_VINCOLO].

Per qualsiasi richiesta diretta sono a disposizione ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T045',
    name: 'Catalistino PDF — Dal PDF al Carrello B2B in Due Minuti',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] + Accesso B2B {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

abbiamo reso semplicissimo valutare le condizioni B2B di [IDENTITA_IZZO]:
• **Passo 1**: apre [IL_CATALISTINO_PDF] dal link riservato e controlla in un colpo d’occhio qualità della gamma e prezzi netti ({DISCOUNT_FORMULA});
• **Passo 2**: quando trova ciò che Le serve, entra su [IL_PORTALE_B2B] con [LE_CREDENZIALI] e conferma in autonomia con [TEMPI_RESA] [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T046',
    name: 'Catalistino PDF — Giacenze Verificate + Doppio Riferimento Prezzo',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Listino PDF con prezzi netti ({DISCOUNT_FORMULA}) dedicato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [IL_CATALISTINO_PDF] aggiornato sulle disponibilità odierne di [NOSTRO_DEPOSITO].

A differenza dei listini tradizionali dove bisogna calcolare gli sconti a mano, nel Vostro PDF ogni articolo mostra già il netto reale scontato al {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO], valido [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONFORMITA_QUALITA] e [CURA_IMBALLO] completano il servizio su ogni spedizione.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T047',
    name: 'Catalistino PDF — Utile Anche per Quotare Veloce ai Vostri Clienti',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Strumento rapido per i preventivi di {COMPANY_NAME}: [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

avere sottomano [IL_CATALISTINO_PDF] di [IDENTITA_IZZO] è comodissimo anche quando deve preparare al volo un preventivo per un Suo cliente: vede immediatamente sia il prezzo di listino pubblico sia il Suo costo netto finito ({DISCOUNT_FORMULA} sul 1° ordine 2gg), con la certezza di ricevere la merce in 24/48h.

{CREDENTIALS_BLOCK}

[OLTRE_AL_PDF], entrando su [IL_PORTALE_B2B] può [FUNZIONI_PORTALE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T048',
    name: 'Catalistino PDF — Aggiornato sullo Stock Pronta Consegna',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '{COMPANY_NAME}{CITY_PAREN} — Estratto PDF Pronta Consegna 24/48h ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

da [IDENTITA_IZZO] [FILOSOFIA_OPERATIVA]. Per mostrarVi concretamente cosa è pronto a partire oggi stesso da [NOSTRO_DEPOSITO], [ABBIAMO_PREPARATO] un estratto PDF dedicato a {COMPANY_NAME} con le referenze più richieste in ambito {SECTOR_SHORT}.

{CREDENTIALS_BLOCK}

Sul Vostro primo acquisto tutta la linea 2gg gode in automatico di {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [SENSO_DELLA_PROVA].

Per informazioni o offerte su volumi [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T049',
    name: 'Catalistino PDF — Visionabile Senza Registrazioni Lunghe',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nessun modulo da compilare: [OGG_TIPO_DOC] già attivo per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sappiamo quanto sia scomodo dover compilare lunghi moduli di registrazione prima ancora di sapere se i prezzi di un distributore sono competitivi.

Per questo in [IDENTITA_IZZO] abbiamo fatto tutto noi in anticipo per {COMPANY_NAME}: [IL_CATALISTINO_PDF] è già pronto da aprire in un clic e [LE_CREDENZIALI] con sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] sono già attive.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Mi trova sempre disponibile come Vostro referente ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T050',
    name: 'Catalistino PDF — Panoramica Luce, Elettrico e Cantiere 2gg',
    angleGroup: 'Catalistino_PDF_Diretto',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Catalogo 2gg ({DISCOUNT_FORMULA}) riservato a {COMPANY_NAME} — Izzo Distribuzione B2B',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per inviarVi il collegamento diretto a [IL_CATALISTINO_PDF] predisposto per la Vostra struttura, [DETTAGLIO_LUCE_LED] e [DETTAGLIO_ELETTRICO_QUADRO], tutto rigorosamente [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

Lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] è già attivo sul profilo [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 6 (T051 - T060): TAGLIO TECNICO IMPIANTISTICO & COMMESSE (IST)
  // ==========================================================================
  {
    code: 'T051',
    name: 'Tecnico Impiantisti — Quadri, Protezioni DIN e Illuminazione Tecnica',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Forniture impianti {SECTOR_SHORT} 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nelle installazioni professionali e nei cablaggi [DETTAGLIO_ELETTRICO_QUADRO], avere disponibilità immediata a prezzo netto certo permette di chiudere le commesse senza intoppi e con maggior margine.

Come [IDENTITA_IZZO] [ABBIAMO_PREPARATO] per {COMPANY_NAME} un accesso B2B specifico per installatori e imprese, con sconto 1° ordine {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T052',
    name: 'Tecnico Impiantisti — Supporto su Distinte Cantiere e Manutenzioni',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME}: materiali da installazione in 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_CANTIERE] disporre di un fornitore [AGGETTIVO_SOLIDO_M] [IMPIEGO_PRATICO].

Da [IDENTITA_IZZO] seguiamo gli specialisti in {SECTOR_SHORT} [CONTESTO_ZONA] {CITY} con una linea rapida da [NOSTRO_DEPOSITO] ({RECOMMENDED_FAMILY}), [CONFORMITA_QUALITA]. Sul Vostro 1° acquisto 2gg è già attivo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Se avete una distinta lavori da quotare a breve, [COME_RISPONDERE]: Vi preparo un riscontro rapido su misura.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T053',
    name: 'Tecnico Impiantisti — Efficienza LED e Componentistica Certificata',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Illuminotecnica e modulare 24/48h ({DISCOUNT_FORMULA}) — Riservato {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

per le Vostre realizzazioni e riqualificazioni impiantistiche, [IDENTITA_IZZO] mette a disposizione una gamma pronta in 24/48h [DETTAGLIO_LUCE_LED], [EQUIVALENZA_TECNICA].

Abbiamo generato per {COMPANY_NAME} [IL_CATALISTINO_PDF] già ricalcolato con la formula {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[DESTINAZIONE_FLESSIBILE] e [CURA_IMBALLO] Vi consentono di ricevere tutto direttamente dove operano i tecnici.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T054',
    name: 'Tecnico Impiantisti — Competitività nei Preventivi Chiavi in Mano',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Più margine sulle commesse di {COMPANY_NAME}: listino 2gg {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

oggi per aggiudicarsi una commessa impiantistica o edile serve essere competitivi sul preventivo finale senza ridurre il proprio utile. Acquistare direttamente da [IDENTITA_IZZO] [VANTAGGIO_DIRETTO] [CONSENTE_DI] abbassare subito il costo dei materiali.

Per la prima fornitura di {COMPANY_NAME} [ABBIAMO_ATTIVATO] {DISCOUNT_FORMULA} in cascata [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Su [IL_PORTALE_B2B] può [FUNZIONI_PORTALE] in qualunque momento.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T055',
    name: 'Tecnico Impiantisti — Scorta Furgone e Interventi Rapidi',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Riassortimento tecnico 24/48h ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

magnetotermici, differenziali, alimentatori, scatole stagne, proiettori e minuteria sono i codici che finiscono sempre nel momento meno opportuno.

Con l’account B2B [IDENTITA_IZZO] già attivo per {COMPANY_NAME}, riordina in due minuti da [NOSTRO_DEPOSITO] con sconto 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e [TEMPI_RESA]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per verifiche tecniche risponda pure direttamente a me ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T056',
    name: 'Tecnico Impiantisti — Focus Quadristica, Automazione e Protezione',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Componentistica quadro e impianto 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per presentarVi la nostra disponibilità immediata su componentistica elettrotecnica, protezione, comando e illuminazione industriale dedicata a chi opera in ambito {SECTOR_SHORT}.

All’interno di [IL_CATALISTINO_PDF] trova una selezione pronta a partire da [NOSTRO_DEPOSITO], su cui {COMPANY_NAME} gode automaticamente di {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONFORMITA_QUALITA]. Resto a disposizione per schede tecniche o quotazioni dedicate.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T057',
    name: 'Tecnico Impiantisti — Forniture Cantiere Senza Ritardi',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegna rapida in sede o cantiere ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

quando avete una squadra fuori sede, anche farsi recapitare direttamente in cantiere quadri, corpi illuminanti e materiale elettrico in 24/48h fa risparmiare viaggi e mezze giornate.

In [IDENTITA_IZZO] gestiamo quotidianamente spedizioni [DESTINAZIONE_FLESSIBILE] con [CURA_IMBALLO]. Per il 1° ordine di {COMPANY_NAME} [ABBIAMO_ATTIVATO] lo sconto riservato {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T058',
    name: 'Tecnico Impiantisti — Alternative Pronte ad Alta Marginalità',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] per installatori e imprese ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{BRANDS_NOTE}

Proprio per affiancare il lavoro tecnico di {COMPANY_NAME}, in [IDENTITA_IZZO] [ABBIAMO_SELEZIONATO] linee [RAPPORTO_QUALITA_PREZZO] tutte [IN_PRONTA_CONSEGNA], attivando sul Vostro primo carrello il trattamento {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Dia uno sguardo a [IL_CATALISTINO_PDF]: i netti parlano da soli.

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T059',
    name: 'Tecnico Impiantisti — Riferimento per Fotovoltaico, Clima e Sicurezza',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Materiale elettrico e complementi tecnici 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

chi realizza impianti tecnologici ({SECTOR_SHORT}) ha costante bisogno di protezioni, carpenterie stagne, alimentazione, illuminazione LED e accessori di cablaggio subito disponibili.

Presso [IDENTITA_IZZO] trova tutto raggruppato in un unico deposito 24/48h, con [LE_CREDENZIALI] già abilitate per {COMPANY_NAME} allo sconto 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[DOPO_PRIMO_ORDINE]. Per qualsiasi esigenza specifica [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T060',
    name: 'Tecnico Impiantisti — Dal Progetto alla Fornitura Veloce',
    angleGroup: 'Tecnico_Impiantistico',
    targetCategory: 'IST',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{COMPANY_NAME}{CITY_PAREN}: listino tecnico 24/48h ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] da {AGENT_NAME} ([IDENTITA_IZZO]). Abbiamo predisposto per la Vostra struttura tecnica [IL_CATALISTINO_PDF] su {RECOMMENDED_FAMILY}, con extra sconto {DISCOUNT_FORMULA} attivo sul 1° ordine [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Sia per piccoli riordini veloci [ZERO_MINIMO_ORDINE] sia per commesse complete, conta sul mio supporto diretto.

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 7 (T061 - T070): TAGLIO BANCO VENDITA, FERRAMENTA & RIVENDITE (RIV)
  // ==========================================================================
  {
    code: 'T061',
    name: 'Rivendita & Banco — Alta Rotazione e Ricarico Netto (50% + Extra)',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Listino Rivenditori {DISCOUNT_FORMULA} (Pronta Consegna 2gg) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_RIVENDITA] [VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] per rivendite edili/elettriche, ferramenta e showroom illuminazione.

Sappiamo che al banco contano due fattori: **comprare bene** e **riassortire in 48 ore senza riempire inutilmente il magazzino**. Per {COMPANY_NAME} [ABBIAMO_ATTIVATO] il listino Rivenditori con condizione speciale {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto da listino) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

All’interno di [IL_CATALISTINO_PDF] trova [DETTAGLIO_BANCO_FERRAMENTA] e [DETTAGLIO_LUCE_LED], [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T062',
    name: 'Rivendita & Banco — Riassortimento in 24/48h Zero Immobilizzo',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Riassortimento banco in 24/48h ({DISCOUNT_FORMULA}) — Riservato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

oggi immobilizzare capitale in grossi stock fermi a scaffale non conviene a nessuna rivendita. Grazie a [NOSTRO_DEPOSITO] di [IDENTITA_IZZO], {COMPANY_NAME} può riordinare con [TEMPI_RESA] solo ciò che gira davvero, [VANTAGGIO_ZERO_SCORTE].

Per il Vostro primo riassortimento di prova [ABBIAMO_PREPARATO] [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

[DOPO_PRIMO_ORDINE]. Mi scriva pure in risposta per qualsiasi linea espositiva o richiesta a cartone.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T063',
    name: 'Rivendita & Banco — Prodotti da Banco ad Alto Smercio Giornaliero',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] Rivendite ({DISCOUNT_FORMULA}) per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

artigiani, manutentori e clienti privati chiedono ogni giorno al banco sorgenti LED, proiettori, multiprese, adattatori, magnetotermici e materiale elettrico pronto all’uso.

In [IL_CATALISTINO_PDF] che [IDENTITA_IZZO] ha predisposto per {COMPANY_NAME}, trova esattamente queste referenze [ARTICOLI_ALTA_ROTAZIONE] già scontate al {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Confezioni curate, [CONFORMITA_QUALITA] e ottimo margine di rivendita fin dal primo pezzo.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T064',
    name: 'Rivendita & Banco — Showroom & Illuminazione Decorativa/Tecnica 2gg',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizioni Rivenditore {DISCOUNT_FORMULA} su Luce ed Elettrico 2gg — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sono {AGENT_NAME} di [IDENTITA_IZZO]. Per realtà commerciali come {COMPANY_NAME} ({CITY}) [ABBIAMO_PREPARATO] un profilo Rivenditore dedicato che unisce ampia scelta su {RECOMMENDED_FAMILY} e spedizione veloce in 24/48h quando un cliente finale ha fretta di ritirare.

Sul primo ordine di benvenuto gode del {DISCOUNT_FORMULA} in cascata ({NET_DISCOUNT_PCT}% netto) su tutto lo stock 2gg [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Sfogli pure [IL_CATALISTINO_PDF] anche insieme ai colleghi del banco vendita: resto a disposizione per ogni informazione.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T065',
    name: 'Rivendita & Banco — Prova Libera Anche su Pochi Pezzi da Esposizione',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Zero minimo d’ordine per Rivendite + Sconto {DISCOUNT_FORMULA} — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

molti grossisti impongono minimi d’ordine elevati prima di applicare lo sconto rivenditore. In [IDENTITA_IZZO] vogliamo farVi toccare con mano presentazione, packaging e velocità: per questo {COMPANY_NAME} ha già attivo il {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG] **senza alcun minimo d’ordine**.

{CREDENTIALS_BLOCK}

Può fare anche una piccola campionatura da banco e riceverla in 24/48h con [CURA_IMBALLO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T066',
    name: 'Rivendita & Banco — Integrare il Reparto Elettrico e LED con Facilità',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Potenziamento reparto elettrico/LED 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

ampliare o rifornire il reparto elettrico e illuminotecnico con un partner B2B che spedisce in 24/48h permette di non dire mai "no" al cliente che entra in negozio cercando un codice specifico.

Con [IL_PORTALE_B2B] di [IDENTITA_IZZO], il banco di {COMPANY_NAME} vede in tempo reale giacenze 2gg e prezzo netto rivenditore ({DISCOUNT_FORMULA} sul 1° ordine):

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T067',
    name: 'Rivendita & Banco — Marginalità Primaria fin dal Primo Ingresso',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Netto Rivenditore {NET_DISCOUNT_PCT}% (1° ordine 2gg) riservato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

comprare con sconto {DISCOUNT_FORMULA} in cascata significa partire subito con uno sconto netto del **{NET_DISCOUNT_PCT}% da listino** su articoli ad altissima rotazione [CLAUSOLA_SOLO_2GG].

È la proposta riservata che [IDENTITA_IZZO] dedica a {COMPANY_NAME} per inaugure un rapporto di fornitura snello, veloce e profittevole:

{CREDENTIALS_BLOCK}

[INVITO_CLIC_PDF] [PUO_VISIONARE] subito i prezzi netti articolo per articolo.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T068',
    name: 'Rivendita & Banco — Listino Chiaro per Banco e Ufficio Acquisti',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Abilitazione Listino RIV {DISCOUNT_FORMULA} — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

confermiamo l’abilitazione del profilo **RIV (Rivenditore B2B)** a nome di {COMPANY_NAME} sulla piattaforma [IDENTITA_IZZO].

Il profilo include:
• Sconto base Rivenditore {BASE_DISCOUNT}% + Extra {EXTRA_DISCOUNT}% sul 1° acquisto [CLAUSOLA_SOLO_2GG];
• [IL_CATALISTINO_PDF] già calcolato coi Vostri netti;
• [TEMPI_RESA] e referente dedicato ({AGENT_NAME}).

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T069',
    name: 'Rivendita & Banco — Continuità di Scaffale Garantita',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Rifornimenti rapidi 2gg per il punto vendita {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

evitare i "buchi a scaffale" sui prodotti più venduti senza appesantire le giacenze è la chiave di una rivendita moderna. Da [IDENTITA_IZZO] manteniamo scorte profonde in [NOSTRO_DEPOSITO] [RICAMBIO_COSTANTE] proprio per servire i rivenditori in 24/48h.

Qui sotto trova [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] di {COMPANY_NAME} con lo sconto {DISCOUNT_FORMULA} attivo sul 1° ordine 2gg:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T070',
    name: 'Rivendita & Banco — Proposta Snella per Ferramenta e Ingrosso',
    angleGroup: 'Banco_Rivendita_Rotazione',
    targetCategory: 'RIV',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{COMPANY_NAME}: Catalistino Rivenditori 2gg ({DISCOUNT_FORMULA}) pronto',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] da [IDENTITA_IZZO]: abbiamo generato per il Vostro punto vendita [IL_CATALISTINO_PDF] con sconto Rivenditore {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Quando ha un minuto tra un cliente e l’altro, dia uno sguardo ai netti: per qualsiasi info sono a disposizione diretta ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 8 (T071 - T080): SECONDO FORNITORE AGILE / CANALE PARALLELO
  // ==========================================================================
  {
    code: 'T071',
    name: 'Secondo Fornitore — Rispetto dei Fornitori Storici + Alternativa 2gg',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Un canale B2B agile in più per {COMPANY_NAME} ({DISCOUNT_FORMULA} su 2gg)',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sappiamo perfettamente che un’azienda strutturata come la Vostra ha già i propri fornitori storici di fiducia, e non Vi scriviamo con la pretesa di sostituirli dall’oggi al domani.

Il nostro obiettivo in [IDENTITA_IZZO] è offrirVi un **secondo canale B2B agile**, già pronto e attivo [RUOLO_SECONDO_CANALE]. Per renderlo subito vantaggioso [ABBIAMO_ATTIVATO] sul 1° ordine di {COMPANY_NAME} lo sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Lo tenga pure tra i preferiti: alla prima urgenza 24/48h o verifica prezzi Le tornerà utilissimo.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T072',
    name: 'Secondo Fornitore — Piano B Immediato per Urgenze e Margini',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Canale parallelo Pronta Consegna 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

ogni responsabile acquisti sa quanto sia prezioso avere un "piano B" già codificato e scontato quando il fornitore abituale ha tempi lunghi o prezzi rigidi su una commessa.

In [IDENTITA_IZZO] abbiamo già fatto tutta la parte burocratica per {COMPANY_NAME}: [LE_CREDENZIALI] sono attive, [IL_CATALISTINO_PDF] è pronto e lo sconto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG] resta a Vostra disposizione [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[INCISO_SENZA_VINCOLO] e [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T073',
    name: 'Secondo Fornitore — Confrontare Non Costa Nulla',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Confronto libero listino 2gg ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

confrontare un secondo listino B2B non costa nulla, richiede due minuti e spesso riserva ottime sorprese sui margini d’acquisto.

Da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] {COMPANY_NAME} [IL_CATALISTINO_PDF] su {RECOMMENDED_FAMILY} con sconto 1° ordine {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Se poi vorrà metterci alla prova anche su un piccolo ordine, spediamo in 24/48h!

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T074',
    name: 'Secondo Fornitore — Nessun Contratto, Solo Servizio Quando Serve',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Profilo B2B senza vincoli ({DISCOUNT_FORMULA} 1° ordine) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

molti operatori apprezzano [IDENTITA_IZZO] proprio per la libertà operativa: nessun budget annuo richiesto, zero costi di iscrizione, [ZERO_MINIMO_ORDINE] e [STOCK_REALE] in 24/48h quando serve davvero.

Abbiamo già configurato questa posizione per {COMPANY_NAME} ({CITY}) includendo l’extra agevolazione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T075',
    name: 'Secondo Fornitore — Affiancare Senza Invadere',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Un punto d’appoggio B2B in più per {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Le scrivo con discrezione da [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI]). Il nostro intento è semplicemente lasciarVi le chiavi di accesso al nostro magazzino 2gg, così che le abbiate già pronte al momento del bisogno.

Sul primo utilizzo {COMPANY_NAME} beneficia automaticamente di {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Non riceverà telefonate insistenti: resto io ({AGENT_NAME}) a Vostra disposizione solo quando sarete Voi a voler approfondire.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T076',
    name: 'Secondo Fornitore — Quando Serve Merce che Altrove è in Ordine',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Disponibilità immediata 2gg ({DISCOUNT_FORMULA}) a supporto di {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anche i migliori fornitori locali non possono avere sempre tutto in casa nello stesso momento. È proprio in quelle occasioni che [NOSTRO_DEPOSITO] di [IDENTITA_IZZO] diventa un alleato prezioso per {COMPANY_NAME}.

Con il profilo che [ABBIAMO_ATTIVATO] qui sotto, controlla in tempo reale i pezzi pronti 2gg e ordina col doppio sconto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO]:

{CREDENTIALS_BLOCK}

[TEMPI_RESA] [COPERTURA_ITALIA].

[FRASE_DISPONIBILITA] [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T077',
    name: 'Secondo Fornitore — Testare su Una Singola Esigenza',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Metta alla prova il nostro deposito 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

il modo più sincero per valutare un nuovo distributore B2B è provarlo su una singola esigenza concreta: un pacco urgente, un confronto su dieci lampade o su qualche componente da quadro.

Per agevolare proprio questo primo test, [IDENTITA_IZZO] ha riservato a {COMPANY_NAME} lo sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] [ZERO_MINIMO_ORDINE] e [IL_CATALISTINO_PDF] già pronto:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T078',
    name: 'Secondo Fornitore — Doppia Fonte = Maggiore Potere d’Acquisto',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Ottimizzazione acquisti {SECTOR_SHORT} ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

diversificare le fonti d’approvvigionamento sui materiali [ARTICOLI_ALTA_ROTAZIONE] permette a ogni impresa strutturata di spuntare condizioni migliori e non fermarsi mai per carenza stock.

A questo scopo [IDENTITA_IZZO] mette a disposizione di {COMPANY_NAME} [CANALE_RISERVATO] con listino 1° acquisto {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T079',
    name: 'Secondo Fornitore — Credenziali Pronte da Archiviare in Ufficio',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Da conservare per l’ufficio acquisti di {COMPANY_NAME}: accesso 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anche se oggi stesso non aveste acquisti in programma, Le consiglio di conservare questa email o inoltrarla a chi segue gli ordini in {COMPANY_NAME}: contiene [LE_CREDENZIALI] già attive per [IDENTITA_IZZO] e [IL_CATALISTINO_PDF] scontato al {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Alla prima necessità di materiale elettrico, illuminazione LED o ferramenta in 24/48h, avrete già tutto pronto in un clic!

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T080',
    name: 'Secondo Fornitore — Approccio Consulenziale Aperto',
    angleGroup: 'Secondo_Fornitore_Parallelo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Collaborazione B2B flessibile ({DISCOUNT_FORMULA} 2gg) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

da [IDENTITA_IZZO] lavoriamo ogni giorno per offrire a realtà come la Vostra un’alternativa [AGGETTIVO_VELOCE_F], trasparente e conveniente su {RECOMMENDED_FAMILY}.

Abbiamo predisposto per {COMPANY_NAME} sia il documento PDF di consultazione immediata sia l’utenza B2B con sconto benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 9 (T081 - T090): MEMO ESECUTIVO ULTRA-BREVE (SMARTPHONE FRIENDLY)
  // ==========================================================================
  {
    code: 'T081',
    name: 'Memo Breve — 4 Punti Essenziali Lettura Rapida',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '{COMPANY_NAME}: attivo sconto {DISCOUNT_FORMULA} Pronta Consegna 2gg',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

una nota velocissima da [IDENTITA_IZZO] ([SETTORI_MERCEOLOGICI]): abbiamo attivato la Vostra posizione B2B con queste condizioni immediate:

{CREDENTIALS_BLOCK}

Zero minimi, merce reale in 24/48h e referente umano diretto ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T082',
    name: 'Memo Breve — Flash Offerta 1° Acquisto Solo 2gg',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

Le trasmetto in forma sintetica i riferimenti riservati che [IDENTITA_IZZO] ha abilitato per il Vostro 1° acquisto [CLAUSOLA_SOLO_2GG] ({NET_DISCOUNT_PCT}% netto effettivo da listino):

{CREDENTIALS_BLOCK}

Il Catalistino PDF si apre subito anche da cellulare dal pulsante dedicato. Per ogni info basta rispondere a questa mail.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T083',
    name: 'Memo Breve — Diretto per Chi Legge dal Cantiere',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Credenziali B2B 24/48h ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

so che spesso si legge la posta al volo dal telefono, quindi vado dritto al sodo: sono {AGENT_NAME} di [IDENTITA_IZZO] e ho preparato per {COMPANY_NAME} il listino Pronta Consegna 2gg scontato al {DISCOUNT_FORMULA} sul primo ordine [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Quando Le serve materiale veloce, è già tutto attivo!

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T084',
    name: 'Memo Breve — Scheda Attivazione Istantanea',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Attivazione utenza B2B {COMPANY_NAME} — Sconto {DISCOUNT_FORMULA} (2gg)',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

presso [IDENTITA_IZZO] è attiva da oggi l’utenza B2B riservata a {COMPANY_NAME} ({SECTOR_SHORT}) con doppio sconto benvenuto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e [TEMPI_RESA]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T085',
    name: 'Memo Breve — Link PDF + Login Pronti all’Uso',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'PDF Prezzi Netti + Login B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

abbiamo riunito in un’unica scheda qui sotto sia [IL_CATALISTINO_PDF] sia [LE_CREDENZIALI] di [IDENTITA_IZZO] per {COMPANY_NAME}, con extra sconto {DISCOUNT_FORMULA} già calcolato sulla Pronta Consegna 2gg:

{CREDENTIALS_BLOCK}

Resto a disposizione diretta per qualsiasi necessità ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T086',
    name: 'Memo Breve — Tre Vantaggi Secchi per il Primo Ordine',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: '3 vantaggi B2B attivi per {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per presentarVi il servizio logistico di [IDENTITA_IZZO] abbiamo attivato per {COMPANY_NAME}:
• **{DISCOUNT_FORMULA} in cascata** sul 1° ordine [CLAUSOLA_SOLO_2GG];
• **Zero minimo d’ordine** e spedizione rapida 24/48h;
• **Catalistino PDF riservato** consultabile subito.

{CREDENTIALS_BLOCK}

Buon lavoro e [SALUTO_CHIUSURA]`,
  },
  {
    code: 'T087',
    name: 'Memo Breve — Nota Operativa Reparto Commerciale',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Rif. {COMPANY_NAME}{CITY_PAREN} — Listino 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in allegato logico al link sottostante trasmettiamo [IL_CATALISTINO_PDF] emesso da [IDENTITA_IZZO] per la Vostra ragione sociale, completo di credenziali portale e scontistica 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Per preventivi su lista o informazioni risponda pure a questa comunicazione.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T088',
    name: 'Memo Breve — Invito a Verificare un Solo Articolo',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Provi a verificare anche un solo prezzo 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

non Le chiedo lunghi confronti: quando ha 60 secondi apra [IL_CATALISTINO_PDF] di [IDENTITA_IZZO] qui sotto e guardi il netto finito col {DISCOUNT_FORMULA} su due o tre articoli che comprate ogni mese.

{CREDENTIALS_BLOCK}

Se il prezzo e la consegna 24/48h La convincono, ha già Username e Password pronti!

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T089',
    name: 'Memo Breve — Riepilogo Pulito Senza Giri di Parole',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Offerta 1° acquisto {DISCOUNT_FORMULA} (Stock 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

da [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] B2B) [CONNETTIVO_SINTESI]

{CREDENTIALS_BLOCK}

Tutta la merce inclusa nello sconto {DISCOUNT_FORMULA} parte da [NOSTRO_DEPOSITO] in 24/48h, [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T090',
    name: 'Memo Breve — Contatto Veloce con Firma Diretta',
    angleGroup: 'Memo_Esecutivo_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Da {AGENT_NAME} per {COMPANY_NAME} — Catalistino 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

Le lascio in due righe il collegamento a [IL_CATALISTINO_PDF] e l’accesso al portale [IDENTITA_IZZO] già abilitato per {COMPANY_NAME} con lo sconto 1° acquisto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Per qualsiasi necessità mi scriva pure in risposta ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 10 (T091 - T100): PRESIDIO TERRITORIALE & PARTNERSHIP B2B
  // ==========================================================================
  {
    code: 'T091',
    name: 'Territorio & Partnership — Servire con Rapidità le Aziende della Zona',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Forniture B2B 24/48h su {CITY} — Condizioni {DISCOUNT_FORMULA} per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

stiamo potenziando il servizio diretto di [IDENTITA_IZZO] a supporto degli operatori professionali [CONTESTO_ZONA] {CITY}{CITY_PAREN} attivi nel settore {SECTOR_SHORT}.

Per presentarci in modo concreto alla Vostra azienda, [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] sulle linee {RECOMMENDED_FAMILY} e attivato lo sconto speciale {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], con [TEMPI_RESA] direttamente presso la Vostra sede di {CITY}.

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T092',
    name: 'Territorio & Partnership — Logistica Nazionale con Attenzione Locale',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}: [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME}, [SALUTO_GIORNATA]

il nostro obiettivo in [IDENTITA_IZZO] è portare alle aziende dinamiche [CONTESTO_ZONA] {CITY} tutta la profondità di stock di un grande polo logistico 24/48h, mantenendo però il rapporto umano e diretto di un referente dedicato ({AGENT_NAME}).

Per inaugurare questa conoscenza [ABBIAMO_ATTIVATO] a favore di {COMPANY_NAME} [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T093',
    name: 'Territorio & Partnership — Costruire un Rapporto Continuativo e Serio',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta di collaborazione B2B ({DISCOUNT_FORMULA} 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] non cerchiamo la vendita occasionale fine a sé stessa, ma relazioni B2B continuative con aziende serie [PER_IL_COMPARTO] {SECTOR_SHORT}.

Sappiamo però che la fiducia va conquistata sul campo: per questo [METTIAMO_A_DISPOSIZIONE] {COMPANY_NAME} una prima fornitura [ZERO_MINIMO_ORDINE] con sconto potenziato {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], accompagnata da [IL_CATALISTINO_PDF] trasparente al centesimo.

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T094',
    name: 'Territorio & Partnership — Consegne Veloci su Sede e Cantieri Provinciali',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Copertura 24/48h per {COMPANY_NAME}{CITY_PAREN} | Sconto {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

grazie ai flussi giornalieri con corrieri espressi da [NOSTRO_DEPOSITO], serviamo regolarmente in 24/48h tutta l’area di {CITY}{CITY_PAREN}, [DESTINAZIONE_FLESSIBILE].

Per {COMPANY_NAME} [ABBIAMO_PREPARATO] un pacchetto di attivazione immediata su [SETTORI_MERCEOLOGICI] con formula {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[CERTEZZA_EVASIONE] e [CURA_IMBALLO]. Per ogni informazione [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T095',
    name: 'Territorio & Partnership — Invito alle Realtà Qualificate del Comparto',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Invito B2B riservato a {COMPANY_NAME} — Listino 2gg {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

selezionando gli operatori qualificati di {SECTOR_SHORT} attivi su {CITY}, abbiamo avuto il piacere di individuare {COMPANY_NAME} e di predisporre una proposta d’ingresso dedicata sulla piattaforma [IDENTITA_IZZO].

Aprendo il prospetto riservato qui sotto [PUO_VISIONARE] [IL_CATALISTINO_PDF] già scontato al {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e utilizzare [LE_CREDENZIALI] [INCISO_SENZA_VINCOLO]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T096',
    name: 'Territorio & Partnership — Un Partner Solido per Crescere Insieme',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Partner distributivo 24/48h per {COMPANY_NAME}: attivo {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

avere alle spalle un [QUALIFICA_DISTRIBUTORE] come [IDENTITA_IZZO] significa poter contare tutto l’anno su [STOCK_REALE], prezzi chiari e un referente ({AGENT_NAME}) pronto a supportarVi su {RECOMMENDED_FAMILY}.

Iniziare è immediato e privo di qualsiasi vincolo: sul 1° ordine 2gg {COMPANY_NAME} ha già attivo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T097',
    name: 'Territorio & Partnership — Efficienza Digitale + Valori Tradizionali',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Serietà commerciale e Pronta Consegna 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] abbiamo investito in tecnologia per darVi un portale B2B veloce e [IL_CATALISTINO_PDF] sempre aggiornato, ma conserviamo i valori del commercio tradizionale: parola data sui tempi, merce controllata e contatto umano diretto.

Con questo spirito dedichiamo a {COMPANY_NAME} ({CITY}) lo sconto di benvenuto {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T098',
    name: 'Territorio & Partnership — Supporto Dedicato alle Imprese della Provincia',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Linea B2B {CITY} ({DISCOUNT_FORMULA} 1° ordine 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

sono {AGENT_NAME} e seguo per [IDENTITA_IZZO] lo sviluppo dei clienti professionali nella Vostra provincia. Ho attivato per {COMPANY_NAME} il profilo B2B con extra sconto {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Sfogli pure [IL_CATALISTINO_PDF] con comodità: se possiamo esserVi utili anche su una prima fornitura veloce, mi trova subito qui in risposta.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T099',
    name: 'Territorio & Partnership — Vantaggio Immediato + Continuità nel Tempo',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Condizioni B2B riservate a {COMPANY_NAME} — Primo ordine {DISCOUNT_FORMULA} + Listino {BASE_DISCOUNT}%',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

la proposta che [IDENTITA_IZZO] ha strutturato per {COMPANY_NAME} guarda sia all’immediato sia al lungo periodo:
• **Subito sul 1° acquisto**: sconto potenziato {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG] [ZERO_MINIMO_ORDINE];
• **Sui riacquisti successivi**: mantenimento del listino professionale {BASE_DISCOUNT}% e offerte dedicate [PER_IL_COMPARTO] {SECTOR_SHORT}.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T100',
    name: 'Territorio & Partnership — Benvenuto Ufficiale nel Network B2B Izzo',
    angleGroup: 'Presidio_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Benvenuto B2B per {COMPANY_NAME}: [OGG_TIPO_DOC] e Sconto {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

siamo lieti di trasmetterVi i riferimenti completi dell’apertura canale B2B presso [IDENTITA_IZZO] ([SETTORI_MERCEOLOGICI]) predisposta a nome di {COMPANY_NAME}.

Tutto è già pronto per permetterVi di consultare [IL_CATALISTINO_PDF] e usufruire sul Vostro primo ordine dello sconto riservato {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], con [TEMPI_RESA] [COPERTURA_ITALIA]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[FRASE_DISPONIBILITA] ({AGENT_NAME} — [CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
];

