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
 * Stile: Commerciale nella proposta di valore, Istituzionale e Autorevole nella forma (zero tono pubblicitario).
 * Le discriminanti dinamiche sono affidate ai 108 gruppi di parole ([TOKEN]) pescati dal database.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  // ==========================================================================
  // GRUPPO 1 (T001 - T010): DIREZIONE & UFFICIO ACQUISTI
  // ==========================================================================
  {
    code: 'T001',
    name: 'Ufficio Acquisti — Accreditamento e Confronto Analitico Netti',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} — [OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_UFFICIO_ACQUISTI] [VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] nel comparto [SETTORI_MERCEOLOGICI].

Al fine di [SUPPORTARE_LAVORO] {COMPANY_NAME}, [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF], associando alla Vostra anagrafica [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] l’accesso a [IL_PORTALE_B2B] [CONSENTE_DI] [CONFRONTARE_NETTI] [ZERO_MINIMO_ORDINE] e con [TEMPI_RESA].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA], [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T002',
    name: 'Ufficio Acquisti — Nota Informativa Sintetica sulle Condizioni',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | {COMPANY_NAME}{CITY_PAREN} — [OGG_APPROCCIO_SOFT]',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] per sottoporre al Vostro Ufficio Acquisti un riferimento [AGGETTIVO_SOLIDO_M] relativo alle forniture [IN_PRONTA_CONSEGNA].

Presso [IDENTITA_IZZO] [FILOSOFIA_OPERATIVA] [VANTAGGIO_DIRETTO]. Per consentire un riscontro oggettivo sulle nostre condizioni, [ABBIAMO_ATTIVATO] [CANALE_RISERVATO] con parametro {DISCOUNT_FORMULA} (pari al {NET_DISCOUNT_PCT}% netto da listino) [SUL_PRIMO_ACQUISTO], [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T003',
    name: 'Ufficio Acquisti — Verifica Giacenza Fisica e Quotazione Netta',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] [OGG_PER_AZIENDA] {COMPANY_NAME} | [OGG_RAPIDITA] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nella qualificazione dei fornitori [PER_IL_COMPARTO] {SECTOR_SHORT} assumono rilievo primario due indicatori: [STOCK_REALE] e trasparenza del prezzo netto.

In qualità di [QUALIFICA_DISTRIBUTORE], da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] [LE_CREDENZIALI] intestate a {COMPANY_NAME} per verificare [AVVERBIO_LIBERAMENTE] entrambi gli aspetti sulle linee {RECOMMENDED_FAMILY}, [TRASPARENZA_PREZZI].

{CREDENTIALS_BLOCK}

[CONNETTIVO_PRATICO] la condizione {DISCOUNT_FORMULA} risulta [APPLICAZIONE_CARRELLO] [ZERO_MINIMO_ORDINE], [DOPO_PRIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T004',
    name: 'Ufficio Acquisti — Prospetto Comparativo Listino Ufficiale e Netto',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Prospetto quotazioni nette ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

per agevolare un esame immediato dei parametri economici senza attese amministrative, [IDENTITA_IZZO] ha adottato un criterio di piena trasparenza documentale: [ABBIAMO_PREPARATO] per la Vostra società [IL_CATALISTINO_PDF] [TRASPARENZA_PREZZI].

[INVITO_CLIC_PDF] [PUO_VISIONARE] [GAMMA_SELEZIONATA] [ARTICOLI_ALTA_ROTAZIONE] [CLAUSOLA_SOLO_2GG], già valorizzata con [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T005',
    name: 'Ufficio Acquisti — Ottimizzazione dei Costi di Approvvigionamento',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) — Comunicazione riservata a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] uno strumento concreto [DIFESA_COMPETITIVITA].

Sulle referenze [ARTICOLI_ALTA_ROTAZIONE] disponibili presso [NOSTRO_DEPOSITO] ([SETTORI_MERCEOLOGICI]), [ABBIAMO_ATTIVATO] a favore di {COMPANY_NAME} il parametro {DISCOUNT_FORMULA} in cascata [SUL_PRIMO_ACQUISTO], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Si tratta di [IMPATTO_SCONTO] [SENSO_DELLA_PROVA], assistito da [TEMPI_RESA] e [CURA_IMBALLO].

Per qualsiasi approfondimento sulle singole famiglie merceologiche è possibile riscontrare [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T006',
    name: 'Ufficio Acquisti — Consultazione Immediata Senza Tempi di Attesa',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Abilitazione portale B2B e [OGG_TIPO_DOC] — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nella gestione corrente degli acquisti tecnici la possibilità di verificare istantaneamente disponibilità e costo finito riduce sensibilmente gli oneri operativi. Attraverso [IL_PORTALE_B2B], [IDENTITA_IZZO] garantisce questo standard a [TARGET_PROFESSIONALE].

In sede di accreditamento [ABBIAMO_ATTIVATO] [LE_CREDENZIALI]: accedendo, il Vostro ufficio [TROVA_ATTIVO] il parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e può [FUNZIONI_PORTALE] nonché [ORDINARE_AUTONOMIA].

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T007',
    name: 'Ufficio Acquisti — Notifica di Apertura Posizione Fornitore B2B',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Apertura posizione B2B ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

con la presente informiamo che presso [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] operante [COPERTURA_ITALIA]) [ABBIAMO_ATTIVATO] la scheda anagrafica riservata alla Vostra azienda, profilata per il comparto {SECTOR_SHORT}.

L’abilitazione comprende [IL_CATALISTINO_PDF] immediatamente consultabile e [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [INCISO_SENZA_VINCOLO].

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T008',
    name: 'Ufficio Acquisti — Parametro di Riferimento per Verifiche Periodiche',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Riferimenti listino B2B ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME} — [OGG_RAPIDITA]',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anche in presenza di canali di fornitura già consolidati, disporre di un ulteriore riferimento accreditato [AFFIDABILITA_DATO_STOCK] rappresenta un utile strumento di controllo per la Direzione Acquisti.

A tal fine, da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] [IL_CATALISTINO_PDF] in favore di {COMPANY_NAME}{CITY_PAREN}, attraverso cui [PUO_VISIONARE] e [PUO_SCARICARE_PDF] le principali referenze 2gg valorizzate con la condizione {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) per la prima fornitura.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T009',
    name: 'Ufficio Acquisti — Allineamento tra Condizione Economica e Giacenza',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] ({NET_DISCOUNT_PCT}% netto 1ª fornitura) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nell’esperienza degli approvvigionamenti professionali una scontistica favorevole risulta realmente efficace solo se sostenuta da disponibilità immediata di magazzino. Per tale ragione in [IDENTITA_IZZO] [FILOSOFIA_OPERATIVA].

Abbiamo pertanto associato la condizione riservata a {COMPANY_NAME} ({DISCOUNT_FORMULA} in cascata, pari al {NET_DISCOUNT_PCT}% netto) specificamente [CLAUSOLA_SOLO_2GG], coniugando [IMPATTO_SCONTO] e [VALORE_PUNTUALITA].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

Per ogni eventuale verifica è possibile rispondere [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T010',
    name: 'Ufficio Acquisti — Riscontro Analitico su Articoli Ricorrenti',
    angleGroup: 'Ufficio_Acquisti',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — [OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[APERTURA_BREVE] da parte di [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] per il settore [SETTORI_MERCEOLOGICI].

Riportiamo di seguito [LE_CREDENZIALI] e l’accesso a [IL_CATALISTINO_PDF] già valorizzato col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] ([CLAUSOLA_SOLO_2GG]).

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA], riscontrando direttamente sia la celerità del nostro ufficio sia le linee [RAPPORTO_QUALITA_PREZZO] disponibili [IN_PRONTA_CONSEGNA].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 2 (T011 - T020): CONTINUITÀ LOGISTICA & PRONTA CONSEGNA 24/48H
  // ==========================================================================
  {
    code: 'T011',
    name: 'Continuità Logistica — Evasione 24/48h da Polo Centrale',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_RAPIDITA] [OGG_PER_AZIENDA] {COMPANY_NAME} — [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_CANTIERE] [EVITARE_DISAGI].

Attraverso [NOSTRO_DEPOSITO], [IDENTITA_IZZO] serve [COPERTURA_ITALIA] [TARGET_PROFESSIONALE] assicurando forniture [AFFIDABILITA_DATO_STOCK] e [TEMPI_RESA] [DESTINAZIONE_FLESSIBILE].

Per consentire una verifica diretta del nostro standard logistico, [ABBIAMO_PREPARATO] a favore di {COMPANY_NAME} [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Operiamo [CERTEZZA_EVASIONE], garantendo [CURA_IMBALLO]. [FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T012',
    name: 'Continuità Logistica — Flessibilità di Recapito Operativo',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Servizio logistico 24/48h [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — Condizioni {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[QUANDO_SERVE_SUBITO], poter fare affidamento su [NOSTRO_DEPOSITO] con partenza immediata consente una gestione ordinata delle attività programmate.

[VERBO_CONTATTARE] [IDENTITA_IZZO] per comunicare che [ABBIAMO_ATTIVATO] a nome della Vostra società [CANALE_RISERVATO] dedicato alle referenze [IN_PRONTA_CONSEGNA] ({RECOMMENDED_FAMILY}), [DESTINAZIONE_FLESSIBILE].

{CREDENTIALS_BLOCK}

Sulla prima fornitura l’anagrafica [TROVA_ATTIVO] il parametro {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [APPLICAZIONE_CARRELLO].

[INVITO_MORBIDO_CATALISTINO]

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T013',
    name: 'Continuità Logistica — Separazione Rigorosa Circuito 2gg',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Disponibilità verificata 2gg e listino {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

uno degli aspetti più critici negli approvvigionamenti B2B consiste nel distinguere la reale giacenza fisica dai materiali soggetti a riordino presso il produttore.

Sulla piattaforma di [IDENTITA_IZZO] il circuito **Pronta Consegna 2gg** identifica esclusivamente codici con [STOCK_REALE] presso [NOSTRO_DEPOSITO], gestiti con [TEMPI_RESA] [CERTEZZA_EVASIONE].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] per la prima fornitura di {COMPANY_NAME} [ABBIAMO_ATTIVATO] la condizione {DISCOUNT_FORMULA} in cascata [ZERO_MINIMO_ORDINE], [SENSO_DELLA_PROVA].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T014',
    name: 'Continuità Logistica — Estensione Operativa del Magazzino Aziendale',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Polo logistico 24/48h e condizioni {DISCOUNT_FORMULA} — Riservato a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

disporre di un ampio assortimento elettrico, illuminotecnico e tecnico evadibile in 24/48 ore permette di pianificare gli acquisti [VANTAGGIO_ZERO_SCORTE].

È questa l’impostazione di servizio che [IDENTITA_IZZO] riserva a {COMPANY_NAME}{CITY_PAREN}: [ABBIAMO_PREPARATO] [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] abbinati a [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T015',
    name: 'Continuità Logistica — Approvvigionamento Regolare Materiali Ricorrenti',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) — Linea 24/48h per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

per garantire regolarità di rifornimento sulle referenze [ARTICOLI_ALTA_ROTAZIONE], [IDENTITA_IZZO] ha strutturato una linea dedicata su [SETTORI_MERCEOLOGICI], gestita [FLUSSO_RAPIDO].

Per {COMPANY_NAME} [ABBIAMO_SELEZIONATO] gli articoli di maggior rilievo [PER_IL_COMPARTO] {SECTOR_SHORT} all’interno di [IL_CATALISTINO_PDF], applicando [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

Standard elevati di [CURA_IMBALLO] e [ZERO_MINIMO_ORDINE] consentono una verifica immediata e priva di vincoli.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T016',
    name: 'Continuità Logistica — Copertura Rapida dei Fabbisogni Immediati',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '{COMPANY_NAME} — Abilitazione [OGG_RAPIDITA] e parametro {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nelle forniture tecniche si verificano frequentemente esigenze di integrazione rapida su apparecchiature di protezione, corpi illuminanti o materiali complementari [QUANDO_SERVE_SUBITO].

Disporre di un accesso già accreditato presso [IDENTITA_IZZO] consente ai Vostri uffici di riscontrare istantaneamente la [STOCK_REALE] in [NOSTRO_DEPOSITO] e ricevere la merce con [TEMPI_RESA], beneficiando sulla prima fornitura del parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Le credenziali riportate restano stabilmente attive a nome della Vostra società per ogni futura necessità.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T017',
    name: 'Continuità Logistica — Protocollo Operativo a Due Giorni Lavorativi',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accreditamento logistica 24/48h [OGG_PER_AZIENDA] {COMPANY_NAME} | {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO], organizzazione distributiva B2B [ESPERIENZA_SERVIZIO].

Riepiloghiamo i tre elementi dell’abilitazione predisposta a favore della Vostra ragione sociale:
1) [IL_CATALISTINO_PDF] relativo alle referenze con partenza immediata da deposito;
2) [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG];
3) [ZERO_MINIMO_ORDINE] con [TEMPI_RESA] [COPERTURA_ITALIA].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA], [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T018',
    name: 'Continuità Logistica — Affidabilità dei Tempi di Resa',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_RAPIDITA] ({DISCOUNT_FORMULA} 1ª fornitura) — Posizione {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

il rispetto delle programmazioni aziendali dipende in misura rilevante da [VALORE_PUNTUALITA] assicurata dai propri partner di fornitura.

In [IDENTITA_IZZO] presidiamo quotidianamente le disponibilità di {RECOMMENDED_FAMILY} [RICAMBIO_COSTANTE], garantendo alle aziende strutturate come {COMPANY_NAME} [CONTESTO_ZONA] {CITY} un’evasione [AGGETTIVO_VELOCE_F] e prodotti [CONFORMITA_QUALITA].

{CREDENTIALS_BLOCK}

All’interno di [IL_CATALISTINO_PDF] ciascuna voce espone già il valore netto derivante dal parametro {DISCOUNT_FORMULA} attivo sul primo ordine 2gg.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T019',
    name: 'Continuità Logistica — Operatività Digitale H24 e Presa in Carico Prioritaria',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Piattaforma B2B h24 e [OGG_RAPIDITA] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

la pianificazione degli acquisti richiede spesso di verificare disponibilità e costi anche al di fuori dei consueti orari di sportello. Tramite [IL_PORTALE_B2B] è possibile controllare le scorte e [ORDINARE_AUTONOMIA], attivando l’evasione [FLUSSO_RAPIDO].

A tale scopo [ABBIAMO_ATTIVATO] per {COMPANY_NAME} [LE_CREDENZIALI] complete della condizione riservata {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T020',
    name: 'Continuità Logistica — Sinergia tra Piattaforma Digitale e Referente Assegnato',
    angleGroup: 'Continuità_Logistica_24_48h',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME} — Servizio 2gg ({DISCOUNT_FORMULA}) e referente assegnato',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

coniugare l’efficienza di una piattaforma B2B [AFFIDABILITA_DATO_STOCK] con l’assistenza di un [TITOLO_REFERENTE] ({AGENT_NAME}) consente di gestire ogni fornitura con precisione amministrativa e logistica.

Presso [IDENTITA_IZZO] [ABBIAMO_PREPARATO] per {COMPANY_NAME} sia [IL_CATALISTINO_PDF] sia l’utenza abilitata col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [DESTINAZIONE_FLESSIBILE].

{CREDENTIALS_BLOCK}

Per verifiche su quantitativi specifici o forniture urgenti è attivo il contatto diretto [COME_RISPONDERE] ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 3 (T021 - T030): CONDIZIONI ECONOMICHE QUADRO & PRIMA FORNITURA
  // ==========================================================================
  {
    code: 'T021',
    name: 'Condizioni Quadro — Struttura dello Sconto in Cascata',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Parametri economici B2B {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nell’accreditare la nostra struttura presso le realtà professionali [CONTESTO_ZONA] {CITY}, in [IDENTITA_IZZO] privilegiamo condizioni economiche immediatamente riscontrabili fin dalla prima fornitura.

In aggiunta al listino B2B di categoria ({BASE_DISCOUNT}%), [ABBIAMO_ATTIVATO] a favore di {COMPANY_NAME} un’ulteriore agevolazione del +{EXTRA_DISCOUNT}% in cascata (pari al **{NET_DISCOUNT_PCT}% di sconto netto effettivo** da listino ufficiale) [SUL_PRIMO_ACQUISTO], [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[CONNETTIVO_AGGIUNTA] tale condizione opera [ZERO_MINIMO_ORDINE] ed è [APPLICAZIONE_CARRELLO], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T022',
    name: 'Condizioni Quadro — Prima Fornitura Conoscitiva Senza Minimo d’Ordine',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Abilitazione B2B senza minimo d’ordine ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nella valutazione iniziale di un nuovo fornitore B2B è prassi corretta poter effettuare una prima verifica operativa senza vincoli di fatturato minimo.

In quest’ottica, [IDENTITA_IZZO] ha formalizzato per {COMPANY_NAME} una condizione d’ingresso [ZERO_MINIMO_ORDINE], mantenendo integralmente attivo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Ciò consente alla Vostra struttura di riscontrare direttamente [CURA_IMBALLO], [VALORE_PUNTUALITA] e standard qualitativo su [SETTORI_MERCEOLOGICI] [INCISO_SENZA_VINCOLO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T023',
    name: 'Condizioni Quadro — Tutela della Marginalità Operativa',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_FORMULA_PROMO] ({DISCOUNT_FORMULA}) — Posizione riservata a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in uno scenario di mercato che richiede attento controllo dei costi diretti, accedere a condizioni d’acquisto {DISCOUNT_FORMULA} in cascata [CONSENTE_DI] consolidare la marginalità operativa aziendale.

Da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] questa quotazione [AGGETTIVO_RISERVATA_F] per {COMPANY_NAME} [SUL_PRIMO_ACQUISTO] sull’intero perimetro [IN_PRONTA_CONSEGNA] ({RECOMMENDED_FAMILY}), [VANTAGGIO_DIRETTO].

{CREDENTIALS_BLOCK}

[INVITO_CLIC_PDF] [PUO_VISIONARE] i prezzi netti già determinati e [CONFRONTARE_NETTI] con immediatezza.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T024',
    name: 'Condizioni Quadro — Parametrizzazione Nativa sull’Anagrafica Cliente',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Anagrafica {COMPANY_NAME} abilitata — Parametro {DISCOUNT_FORMULA} su Linea 2gg',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] per confermare che sul profilo B2B aperto da [IDENTITA_IZZO] a nome di {COMPANY_NAME} la condizione {DISCOUNT_FORMULA} è [APPLICAZIONE_CARRELLO] [CLAUSOLA_SOLO_2GG], senza necessità di inserire codici manuali.

{CREDENTIALS_BLOCK}

Autenticandosi con [LE_CREDENZIALI] sopra indicate — o consultando [IL_CATALISTINO_PDF] — ogni referenza 2gg espone già il netto riservato ({NET_DISCOUNT_PCT}% da listino), [ZERO_MINIMO_ORDINE].

Per qualsiasi chiarimento è possibile rispondere [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T025',
    name: 'Condizioni Quadro — Accreditamento Diretto per Operatori di Settore',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Condizioni di accreditamento B2B ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nello sviluppo dei rapporti commerciali con gli operatori qualificati del comparto {SECTOR_SHORT}, [IDENTITA_IZZO] adotta una politica di accreditamento diretto basata su condizioni economiche verificabili fin dal primo ordine.

Per {COMPANY_NAME} tale impostazione prevede il parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], corredato da [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T026',
    name: 'Condizioni Quadro — Accesso a Parametri Direzionali Senza Impegni Annui',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Parametri direzionali ({DISCOUNT_FORMULA}) attivi per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

normalmente i livelli di sconto più elevati nella distribuzione tecnica sono subordinati a impegni di volume annuali. Attraverso il protocollo di primo accreditamento di [IDENTITA_IZZO], {COMPANY_NAME} accede direttamente al parametro {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE] sulle linee [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

La procedura è finalizzata a consentirVi di [CONFRONTARE_NETTI] su [SETTORI_MERCEOLOGICI] e verificare sul campo [TEMPI_RESA], [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T027',
    name: 'Condizioni Quadro — Incidenza Economica sui Materiali a Consumo Ricorrente',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni riservate {DISCOUNT_FORMULA} su referenze 2gg — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

sulle forniture [ARTICOLI_ALTA_ROTAZIONE] l’applicazione di un ulteriore +{EXTRA_DISCOUNT}% in cascata oltre allo sconto base B2B ({BASE_DISCOUNT}%) determina un beneficio economico immediato e misurabile.

Da [IDENTITA_IZZO] [ABBIAMO_PREPARATO] a favore di {COMPANY_NAME} esattamente questa configurazione [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], per referenze utili [IMPIEGO_PRATICO].

{CREDENTIALS_BLOCK}

La consultazione di [IL_CATALISTINO_PDF] permette di verificare con precisione i valori netti dedicati alla Vostra società.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T028',
    name: 'Condizioni Quadro — Validità Stabile senza Scadenze Pressanti',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] e condizione {DISCOUNT_FORMULA} registrata per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

comunichiamo da parte di [IDENTITA_IZZO] che l’agevolazione {DISCOUNT_FORMULA} riservata alla prima fornitura di {COMPANY_NAME} è stata regolarmente registrata sulla Vostra anagrafica e rimarrà disponibile per il Vostro prossimo fabbisogno [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

Nel frattempo [PUO_VISIONARE] e [PUO_SCARICARE_PDF] [IL_CATALISTINO_PDF], conservando i riferimenti a disposizione dei Vostri uffici [INCISO_SENZA_VINCOLO].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T029',
    name: 'Condizioni Quadro — Prospetto Sintetico dei Patti Commerciali',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Quadro condizioni commerciali B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

riepiloghiamo in modo lineare i termini della posizione commerciale aperta a Vostro nome:
• Società fornitrice: [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] per [SETTORI_MERCEOLOGICI];
• Parametro 1ª fornitura per {COMPANY_NAME}: sconto {DISCOUNT_FORMULA} in cascata ({NET_DISCOUNT_PCT}% netto da listino);
• Perimetro applicativo: [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE];
• Regime ordinario successivo: mantenimento del listino professionale {BASE_DISCOUNT}%, [DOPO_PRIMO_ORDINE].

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T030',
    name: 'Condizioni Quadro — Efficienza Economica e Logistica Integrata',
    angleGroup: 'Condizioni_Quadro_Riservate',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Parametri B2B {DISCOUNT_FORMULA} attivi per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [CANALE_RISERVATO] già operativo, strutturato [VANTAGGIO_MARGINE].

All’interno di [IL_CATALISTINO_PDF] [ABBIAMO_SELEZIONATO] le principali referenze [IN_PRONTA_CONSEGNA] relative a {RECOMMENDED_FAMILY}, tutte valorizzate col parametro riservato {DISCOUNT_FORMULA} sulla prima fornitura.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per ogni approfondimento siamo reperibili [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 4 (T031 - T040): NOTA UFFICIALE DEL REFERENTE COMMERCIALE ASSEGNATO
  // ==========================================================================
  {
    code: 'T031',
    name: 'Referente Assegnato — Comunicazione di Presa in Carico Anagrafica',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Assegnazione referente B2B e [OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

la presente per comunicarVi che, nell’ambito dell’organizzazione commerciale di [IDENTITA_IZZO], la posizione relativa a {COMPANY_NAME}{CITY_PAREN} è affidata al sottoscritto {AGENT_NAME} in qualità di [TITOLO_REFERENTE].

Riteniamo essenziale affiancare agli strumenti digitali un riferimento personale certo: pertanto, oltre ad aver abilitato [IL_PORTALE_B2B] con condizione riservata {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], Vi lascio i miei recapiti diretti per ogni esigenza operativa.

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA], [CONTATTO_UMANO_VERO].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T032',
    name: 'Referente Assegnato — Interlocutore Unico per Forniture e Quotazioni',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Riferimento commerciale diretto e listino {DISCOUNT_FORMULA} [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

scrivo in qualità di referente assegnato ({AGENT_NAME}) presso [IDENTITA_IZZO], a disposizione della Vostra struttura per la gestione delle forniture di [SETTORI_MERCEOLOGICI] [IN_PRONTA_CONSEGNA].

Contestualmente all’apertura anagrafica, [ABBIAMO_ATTIVATO] sul Vostro profilo [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] ([CLAUSOLA_SOLO_2GG]) ed elaborato [IL_CATALISTINO_PDF] intestato a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

Per verifiche tecniche, disponibilità su lotti o condizioni dedicate potete contattarmi [COME_RISPONDERE] [OPZIONE_TELEFONATA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T033',
    name: 'Referente Assegnato — Doppia Modalità di Consultazione o Quotazione Assistita',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Supporto commerciale B2B e condizioni {DISCOUNT_FORMULA} — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

come referente B2B ({AGENT_NAME} — [IDENTITA_IZZO]), desidero agevolare al massimo la consultazione delle nostre condizioni da parte dei Vostri uffici, mettendo a disposizione due modalità operative:

• **Consultazione autonoma**: tramite il riquadro sottostante sono già accessibili [IL_CATALISTINO_PDF] e [LE_CREDENZIALI] con parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG];
• **Quotazione assistita**: qualora preferiste inviare in risposta un elenco sintetico di articoli di uso ricorrente, provvederò personalmente a trasmetterVi il relativo prospetto netto riservato a {COMPANY_NAME}.

{CREDENTIALS_BLOCK}

Resto a completa disposizione per entrambe le soluzioni.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T034',
    name: 'Referente Assegnato — Presidio Dedicato per gli Operatori del Territorio',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Comunicazione da {AGENT_NAME} (Izzo Distribuzione S.r.l.) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

dalla Direzione Commerciale di [IDENTITA_IZZO] seguo direttamente i rapporti con le aziende professionali attive su {CITY}. In tale veste ho curato la predisposizione per la Vostra società di [CANALE_RISERVATO] focalizzato su {RECOMMENDED_FAMILY}.

Il profilo comprende [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE], affinché possiate valutare [AVVERBIO_LIBERAMENTE] sia la qualità della gamma sia [TEMPI_RESA].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

Per ogni riscontro diretto sono reperibile [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T035',
    name: 'Referente Assegnato — Gestione Diretta Senza Filtri Automatici',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Canale diretto B2B e condizioni {DISCOUNT_FORMULA} (Linea 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

l’organizzazione di [IDENTITA_IZZO] affianca all’operatività h24 di [IL_PORTALE_B2B] la presenza costante di un referente dedicato ({AGENT_NAME}, Cod. {AGENT_CODE}), [CONTATTO_UMANO_VERO].

Trasmetto qui di seguito [LE_CREDENZIALI] assegnate a {COMPANY_NAME} e l’accesso a [IL_CATALISTINO_PDF], già valorizzato col parametro {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Rimango a disposizione per seguire personalmente ogni Vostra richiesta informativa o di fornitura.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T036',
    name: 'Referente Assegnato — Assistenza Tecnica e Commerciale Dedicata',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME} — Referente B2B e [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nella gestione delle forniture tecniche per aziende strutturate è fondamentale disporre di un interlocutore che presidi direttamente codici, giacenze di magazzino e tempistiche di spedizione.

Con questa impostazione, per conto di [IDENTITA_IZZO] ({AGENT_NAME}) [ABBIAMO_PREPARATO] a favore di {COMPANY_NAME} [IL_CATALISTINO_PDF] [DETTAGLIO_CONTENUTO_PDF] e abilitato la condizione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. Per qualsiasi esigenza potete fare riferimento diretto alla presente comunicazione.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T037',
    name: 'Referente Assegnato — Trasmissione Prospetto Valorizzato',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Trasmissione prospetto riservato 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] a cura di {AGENT_NAME} ([IDENTITA_IZZO]): abbiamo emesso il prospetto riservato a {COMPANY_NAME} relativo agli articoli [IN_PRONTA_CONSEGNA] d’interesse per il comparto {SECTOR_SHORT}, con applicazione del parametro {DISCOUNT_FORMULA} sulla prima fornitura.

{CREDENTIALS_BLOCK}

[INVITO_MORBIDO_CATALISTINO] Per approfondimenti su specifiche linee o ulteriori referenze a catalogo sono contattabile [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T038',
    name: 'Referente Assegnato — Accreditamento Istituzionale Senza Vincoli',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accreditamento commerciale B2B per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

in qualità di responsabile commerciale B2B ({AGENT_NAME}) per [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] di [SETTORI_MERCEOLOGICI], desidero sottoporre alla Vostra Direzione i riferimenti dell’utenza riservata aperta a Vostro nome.

L’abilitazione, predisposta [INCISO_SENZA_VINCOLO], include l’agevolazione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
Resto a disposizione per ogni eventuale colloquio conoscitivo.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T039',
    name: 'Referente Assegnato — Codice Agente Associato per Gestione Prioritaria',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Credenziali B2B e assistenza diretta ({AGENT_NAME}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

comunico di aver associato il mio codice referente ({AGENT_CODE} — {AGENT_NAME}) all’anagrafica di {COMPANY_NAME} presso [IDENTITA_IZZO], al fine di garantire gestione prioritaria sia sulle spedizioni 24/48h sia sulle richieste di quotazione dedicata.

Di seguito si riportano [LE_CREDENZIALI] ([NOTA_CAMBIO_PASSWORD]) e il collegamento per consultare [IL_CATALISTINO_PDF] valorizzato col parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T040',
    name: 'Referente Assegnato — Sintesi Direzionale in Tre Punti',
    angleGroup: 'Referente_Direzionale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Rif. {AGENT_NAME} | Izzo Distribuzione S.r.l. — Posizione B2B {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nel pieno rispetto delle Vostre tempistiche operative, riepilogo i tre elementi essenziali attivati da [IDENTITA_IZZO] a favore della Vostra società:
1) accesso diretto alle disponibilità reali 24/48h presenti presso [NOSTRO_DEPOSITO];
2) condizione riservata {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) sulla prima fornitura 2gg [ZERO_MINIMO_ORDINE];
3) riferimento commerciale diretto ({AGENT_NAME}) per supporto tecnico e quotazioni.

{CREDENTIALS_BLOCK}

Ringraziando per la cortese attenzione, porgo a tutta la struttura di {COMPANY_NAME}

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 5 (T041 - T050): TRASMISSIONE PROSPETTO LISTINO PDF RISERVATO
  // ==========================================================================
  {
    code: 'T041',
    name: 'Documentazione PDF — Consultazione Diretta Senza Obbligo Preliminare di Login',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: '[OGG_TIPO_DOC] in formato PDF [OGG_PER_AZIENDA] {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

al fine di consentire un esame immediato delle referenze [IN_PRONTA_CONSEGNA] anche prima dell’accesso al portale, [IDENTITA_IZZO] ha elaborato [IL_CATALISTINO_PDF] intestato a {COMPANY_NAME}.

[INVITO_CLIC_PDF] [PUO_VISIONARE] il documento integrale e [PUO_SCARICARE_PDF], [DETTAGLIO_CONTENUTO_PDF] secondo il parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO].

{CREDENTIALS_BLOCK}

Qualora intendeste procedere con un ordine, autenticandosi su [IL_PORTALE_B2B] mediante [LE_CREDENZIALI] riscontrerete i medesimi valori netti [APPLICAZIONE_CARRELLO] [CLAUSOLA_SOLO_2GG].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T042',
    name: 'Documentazione PDF — Prontuario Prezzi per l’Ufficio Acquisti e Preventivazione',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Prontuario PDF Pronta Consegna 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME}, [SALUTO_GIORNATA]

nell’attività di preventivazione e controllo costi risulta particolarmente funzionale disporre di un prospetto PDF ordinato, consultabile rapidamente dai referenti interni.

A tale scopo [IDENTITA_IZZO] ha predisposto per {COMPANY_NAME} [IL_CATALISTINO_PDF] relativo alle famiglie {RECOMMENDED_FAMILY}, [OLTRE_AL_PDF].

{CREDENTIALS_BLOCK}

Ogni articolo inserito nel documento rispecchia [STOCK_REALE] presso [NOSTRO_DEPOSITO] ed espone la quotazione netta {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) valida sulla prima fornitura 2gg [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T043',
    name: 'Documentazione PDF — Estratto Selezionato per Comparto Operativo',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Estratto listino PDF {SECTOR_SHORT} ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per offrire uno strumento di consultazione mirato ed essenziale, in [IDENTITA_IZZO] [ABBIAMO_SELEZIONATO] all’interno di [IL_CATALISTINO_PDF] esclusivamente [GAMMA_SELEZIONATA] [PER_IL_COMPARTO] {SECTOR_SHORT} con effettiva partenza in 24/48 ore.

{BRANDS_NOTE}

{CREDENTIALS_BLOCK}

Il prospetto riporta per ciascun codice immagine, descrizione tecnica, listino ufficiale e prezzo netto calcolato col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [OLTRE_AL_PDF].

[FRASE_DISPONIBILITA] [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T044',
    name: 'Documentazione PDF — Notifica di Emissione Fascicolo Commerciale',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Emissione prospetto PDF riservato a {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] da [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] per [SETTORI_MERCEOLOGICI]): è disponibile online [IL_CATALISTINO_PDF] riservato alla Vostra ragione sociale, valorizzato con la condizione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

[INVITO_MORBIDO_CATALISTINO] La consultazione e l’archiviazione del documento avvengono [INCISO_SENZA_VINCOLO].

Per ogni approfondimento resta attivo il referente assegnato ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T045',
    name: 'Documentazione PDF — Integrazione tra Documento PDF e Piattaforma B2B',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] e credenziali portale B2B — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

la procedura di accreditamento predisposta da [IDENTITA_IZZO] consente una verifica lineare in due passaggi:
• **Consultazione documentale**: apertura immediata di [IL_CATALISTINO_PDF] per esaminare gamma tecnica e quotazioni nette riservate ({DISCOUNT_FORMULA});
• **Operatività a portale**: utilizzo di [LE_CREDENZIALI] su [IL_PORTALE_B2B] per verificare le giacenze aggiornate e gestire eventuali forniture con [TEMPI_RESA] [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T046',
    name: 'Documentazione PDF — Valorizzazione Netta Già Calcolata su Ogni Riga',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Documentazione PDF con prezzi netti calcolati ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] [MOTIVO_CONTATTO] [IL_CATALISTINO_PDF] allineato alle disponibilità attuali di [NOSTRO_DEPOSITO].

Per semplificare il lavoro di analisi dei Vostri uffici, ciascuna referenza inclusa nel PDF espone già il prezzo netto finito derivante dal parametro {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO], applicabile [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Prodotti [CONFORMITA_QUALITA] e procedure di [CURA_IMBALLO] caratterizzano ogni spedizione effettuata.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T047',
    name: 'Documentazione PDF — Supporto per Preventivazione Rapida Interna',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Prospetto prezzi B2B per l’ufficio tecnico/acquisti di {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

disporre in archivio di [IL_CATALISTINO_PDF] emesso da [IDENTITA_IZZO] agevola anche l’elaborazione rapida dei Vostri preventivi: ogni scheda riporta congiuntamente il listino ufficiale e il costo netto riservato ({DISCOUNT_FORMULA} sulla prima fornitura 2gg), con garanzia di evasione in 24/48 ore.

{CREDENTIALS_BLOCK}

Contemplando referenze [OLTRE_AL_PDF], l’accesso a [IL_PORTALE_B2B] permette in ogni momento di [FUNZIONI_PORTALE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T048',
    name: 'Documentazione PDF — Riepilogo Disponibilità Immediate di Magazzino',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '{COMPANY_NAME}{CITY_PAREN} — Prospetto disponibilità 24/48h ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in [IDENTITA_IZZO] [FILOSOFIA_OPERATIVA]. Al fine di documentare puntualmente le referenze pronte alla spedizione presso [NOSTRO_DEPOSITO], [ABBIAMO_PREPARATO] un prospetto PDF dedicato a {COMPANY_NAME} calibrato sul comparto {SECTOR_SHORT}.

{CREDENTIALS_BLOCK}

Sulla prima fornitura l’intera selezione 2gg beneficia automaticamente della condizione {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE], [SENSO_DELLA_PROVA].

Per richieste specifiche o quotazioni a volume siamo operativi [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T049',
    name: 'Documentazione PDF — Pre-Accreditamento Completo Senza Formalità',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Pre-accreditamento B2B e listino PDF riservato — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per evitare ai Vostri uffici iter preliminari di registrazione prima ancora di aver valutato listini e disponibilità, [IDENTITA_IZZO] ha completato internamente il pre-accreditamento anagrafico a favore di {COMPANY_NAME}.

Di conseguenza, sia [IL_CATALISTINO_PDF] sia [LE_CREDENZIALI] con parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] risultano già immediatamente fruibili:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Il referente assegnato ({AGENT_NAME}) rimane a disposizione.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T050',
    name: 'Documentazione PDF — Quadro Generale Comparti Elettrico, LED e Tecnico',
    angleGroup: 'Documentazione_Listino_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Documentazione 2gg ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per trasmettere l’accesso a [IL_CATALISTINO_PDF] predisposto per la Vostra società, comprensivo delle linee [DETTAGLIO_LUCE_LED] e [DETTAGLIO_ELETTRICO_QUADRO], tutte gestite [IN_PRONTA_CONSEGNA].

{CREDENTIALS_BLOCK}

La condizione riservata {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] è già associata al profilo [ZERO_MINIMO_ORDINE].

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 6 (T051 - T060): QUALIFICAZIONE GAMMA TECNICA, CONFORMITÀ & ASSORTIMENTO (UNIVERSALE)
  // ==========================================================================
  {
    code: 'T051',
    name: 'Gamma Tecnica — Completezza Merceologica e Conformità Certificata',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Forniture professionali {SECTOR_SHORT} 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nella selezione di un fornitore B2B per apparecchiature elettriche e sistemi illuminotecnici [DETTAGLIO_ELETTRICO_QUADRO], la certezza della conformità normativa e della pronta giacenza incide direttamente sull’efficienza aziendale.

Da [IDENTITA_IZZO] [ABBIAMO_PREPARATO] a favore di {COMPANY_NAME} una posizione B2B completa di parametro {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T052',
    name: 'Gamma Tecnica — Affidabilità per Approvvigionamenti Programmati e Correnti',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME} — Assortimento tecnico 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[ATTACCO_CANTIERE] avvalersi di un partner distributivo [AGGETTIVO_SOLIDO_M] per forniture utili [IMPIEGO_PRATICO].

In [IDENTITA_IZZO] affianchiamo gli operatori qualificati di ambito {SECTOR_SHORT} [CONTESTO_ZONA] {CITY} mediante spedizioni dirette da [NOSTRO_DEPOSITO] ({RECOMMENDED_FAMILY}), con articoli [CONFORMITA_QUALITA]. Sulla prima fornitura 2gg risulta già operativa [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Per sottoporre eventuali distinte materiali a quotazione dedicata è sufficiente scrivere [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T053',
    name: 'Gamma Tecnica — Sistemi LED ad Alta Efficienza e Componentistica',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Sistemi illuminotecnici ed elettrotecnica 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

a supporto delle forniture tecniche della Vostra organizzazione, [IDENTITA_IZZO] rende disponibile con evasione 24/48h un assortimento strutturato [DETTAGLIO_LUCE_LED], [EQUIVALENZA_TECNICA].

Abbiamo formalizzato a nome di {COMPANY_NAME} [IL_CATALISTINO_PDF] già calcolato secondo la formula {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Modalità di [DESTINAZIONE_FLESSIBILE] e standard di [CURA_IMBALLO] assicurano una gestione logistica puntuale.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T054',
    name: 'Gamma Tecnica — Sostenibilità Economica delle Forniture Dirette',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Efficienza costi d’acquisto per {COMPANY_NAME} — Listino 2gg {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

coniugare standard qualitativi certificati e contenimento dei costi d’acquisto richiede canali distributivi snelli. Operare direttamente con [IDENTITA_IZZO] [VANTAGGIO_DIRETTO] [CONSENTE_DI] ottimizzare sensibilmente il valore netto delle forniture.

Per il primo ordine di {COMPANY_NAME} [ABBIAMO_ATTIVATO] il parametro {DISCOUNT_FORMULA} in cascata [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

Tramite [IL_PORTALE_B2B] i Vostri referenti possono [FUNZIONI_PORTALE] in completa autonomia.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T055',
    name: 'Gamma Tecnica — Presidio Continuativo sui Codici ad Alta Rotazione',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Reintegro rapido referenze tecniche 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

protezioni modulari, alimentatori, contenitori stagni, proiettori LED, componentistica di distribuzione e accessori tecnici costituiscono referenze essenziali la cui disponibilità non può subire interruzioni.

Con l’utenza B2B [IDENTITA_IZZO] già abilitata per {COMPANY_NAME}, l’approvvigionamento da [NOSTRO_DEPOSITO] avviene con parametro 1ª fornitura {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e [TEMPI_RESA]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO]. Per chiarimenti tecnici resta attivo il riferimento diretto ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T056',
    name: 'Gamma Tecnica — Componentistica Elettrotecnica, Protezione e Illuminazione',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Disponibilità centrale 2gg ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

[VERBO_CONTATTARE] [IDENTITA_IZZO] per portare a conoscenza della Vostra struttura la disponibilità immediata sulle linee di protezione, distribuzione elettrica, comando e illuminazione professionale rivolte agli operatori del settore {SECTOR_SHORT}.

All’interno di [IL_CATALISTINO_PDF] sono raccolte le principali referenze pronte in [NOSTRO_DEPOSITO], sulle quali {COMPANY_NAME} beneficia del parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Tutti i prodotti proposti risultano [CONFORMITA_QUALITA]. Restiamo a disposizione per schede tecniche e quotazioni dedicate.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T057',
    name: 'Gamma Tecnica — Logistica Protetta e Consegna su Sede o Destinazione Operativa',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Servizio di recapito diretto 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

nella pianificazione logistica aziendale la possibilità di ricevere apparecchiature elettriche e corpi illuminanti in 24/48h direttamente presso l’indirizzo operativo prescelto riduce tempi e costi di movimentazione interna.

In [IDENTITA_IZZO] gestiamo regolarmente spedizioni [DESTINAZIONE_FLESSIBILE] assicurando [CURA_IMBALLO]. Per la prima fornitura di {COMPANY_NAME} [ABBIAMO_ATTIVATO] la condizione riservata {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T058',
    name: 'Gamma Tecnica — Linee Professionali ad Elevata Competitività Economica',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_TIPO_DOC] per operatori professionali ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

{BRANDS_NOTE}

Al fine di supportare con efficacia gli approvvigionamenti di {COMPANY_NAME}, in [IDENTITA_IZZO] [ABBIAMO_SELEZIONATO] linee professionali [RAPPORTO_QUALITA_PREZZO] tutte [IN_PRONTA_CONSEGNA], associando alla prima fornitura il trattamento {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

La consultazione di [IL_CATALISTINO_PDF] offre riscontro immediato sui valori netti riservati.

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T059',
    name: 'Gamma Tecnica — Unico Polo Distributivo per Più Famiglie Tecnologiche',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Fornitura integrata elettrico, LED e dotazioni 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

le aziende attive nel comparto {SECTOR_SHORT} necessitano quotidianamente di concentrare in forniture rapide e coordinate protezioni modulari, carpenterie stagne, alimentazione, illuminazione LED e accessori tecnici [DETTAGLIO_BANCO_FERRAMENTA].

Presso [IDENTITA_IZZO] tali famiglie sono disponibili in un unico polo logistico 24/48h, con [LE_CREDENZIALI] già abilitate a nome di {COMPANY_NAME} col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[DOPO_PRIMO_ORDINE]. Per richieste specifiche siamo contattabili [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T060',
    name: 'Gamma Tecnica — Continuità dalla Preventivazione all’Evasione Ordine',
    angleGroup: 'Qualificazione_Gamma_Tecnica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Listino riservato 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] a nome di {AGENT_NAME} ([IDENTITA_IZZO]). Abbiamo predisposto per la Vostra organizzazione [IL_CATALISTINO_PDF] focalizzato su {RECOMMENDED_FAMILY}, con condizione riservata {DISCOUNT_FORMULA} operativa sul primo ordine [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Sia per forniture contenute [ZERO_MINIMO_ORDINE] sia per approvvigionamenti strutturati, confermiamo la nostra piena assistenza diretta.

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 7 (T061 - T070): ACCREDITAMENTO ANAGRAFICA B2B & ROTAZIONE SCORTE (UNIVERSALE)
  // ==========================================================================
  {
    code: 'T061',
    name: 'Accreditamento B2B — Ottimizzazione Rotazione e Marginalità d’Acquisto',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accreditamento listino B2B {DISCOUNT_FORMULA} (Pronta Consegna 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[ATTACCO_RIVENDITA] [VERBO_CONTATTARE] [IDENTITA_IZZO], [QUALIFICA_DISTRIBUTORE] per il settore [SETTORI_MERCEOLOGICI].

Nelle organizzazioni B2B moderne risultano determinanti due fattori: **acquistare a condizioni nette competitive** e **riapprovvigionare in 24/48 ore evitando immobilizzi superflui**. A favore di {COMPANY_NAME} [ABBIAMO_ATTIVATO] il profilo aziendale con parametro riservato {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto da listino) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

All’interno di [IL_CATALISTINO_PDF] sono presenti referenze [DETTAGLIO_BANCO_FERRAMENTA] e [DETTAGLIO_LUCE_LED], acquistabili [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T062',
    name: 'Accreditamento B2B — Gestione Snella dello Stock Aziendale',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Gestione snella approvvigionamenti 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

contenere l’immobilizzo di capitale in magazzino mantenendo intatta la rapidità operativa rappresenta una leva gestionale di primario interesse. Attraverso [NOSTRO_DEPOSITO] di [IDENTITA_IZZO], {COMPANY_NAME} può approvvigionare con [TEMPI_RESA] i materiali effettivamente richiesti, [VANTAGGIO_ZERO_SCORTE].

Per la prima fornitura conoscitiva [ABBIAMO_PREPARATO] [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

[DOPO_PRIMO_ORDINE]. Per richieste su confezionamenti multipli o lotti dedicati siamo a disposizione [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T063',
    name: 'Accreditamento B2B — Referenze ad Elevata Movimentazione Giornaliera',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) [OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

sorgenti e corpi illuminanti LED, proiettori professionali, protezioni modulari, quadri, multiprese e componentistica elettrica costituiscono articoli di impiego costante in ogni realtà operativa del settore {SECTOR_SHORT}.

All’interno di [IL_CATALISTINO_PDF] predisposto da [IDENTITA_IZZO] per {COMPANY_NAME}, tali referenze [ARTICOLI_ALTA_ROTAZIONE] sono già valorizzate col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Standard [CONFORMITA_QUALITA] e quotazioni nette chiare sostengono l’efficienza di ogni ordine.

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T064',
    name: 'Accreditamento B2B — Posizione Profilata e Spedizione Celere',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Posizione commerciale B2B {DISCOUNT_FORMULA} (Linea 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

a nome di [IDENTITA_IZZO] ({AGENT_NAME}), comunichiamo di aver configurato per {COMPANY_NAME}{CITY_PAREN} una posizione B2B dedicata che coniuga ampiezza di gamma su {RECOMMENDED_FAMILY} ed evasione rapida in 24/48 ore lavorative.

Sulla prima fornitura l’anagrafica beneficia del parametro {DISCOUNT_FORMULA} in cascata ({NET_DISCOUNT_PCT}% netto) sull’intero assortimento 2gg [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

La documentazione in [IL_CATALISTINO_PDF] resta a disposizione dei Vostri referenti interni per ogni valutazione.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T065',
    name: 'Accreditamento B2B — Verifica Qualitativa Senza Vincoli Quantitativi',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Abilitazione listino B2B senza minimo d’ordine ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

spesso i canali all’ingrosso subordinano l’applicazione delle migliori condizioni al superamento di soglie minime elevate. Per consentire una verifica diretta della qualità dei prodotti e dell’efficienza logistica, presso [IDENTITA_IZZO] l’anagrafica di {COMPANY_NAME} dispone già del parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG] [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Anche un primo approvvigionamento mirato viene evaso in 24/48h con [CURA_IMBALLO].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T066',
    name: 'Accreditamento B2B — Continuità di Approvvigionamento sul Comparto Elettrico e LED',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Canale distributivo 2gg ({DISCOUNT_FORMULA}) abilitato per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

affiancare alla propria organizzazione un partner distributivo B2B in grado di spedire in 24/48 ore consente di rispondere con tempestività a qualsiasi richiesta tecnica o commessa urgente.

Attraverso [IL_PORTALE_B2B], i referenti di {COMPANY_NAME} visualizzano in tempo reale disponibilità 2gg e quotazione netta riservata ({DISCOUNT_FORMULA} sulla prima fornitura):

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA]. [FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T067',
    name: 'Accreditamento B2B — Parametro Netto Effettivo di Fascia Primaria',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Quotazione netta riservata ({NET_DISCOUNT_PCT}% da listino su 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

operare con una condizione {DISCOUNT_FORMULA} in cascata determina sulla prima fornitura uno sconto netto effettivo pari al **{NET_DISCOUNT_PCT}% rispetto al listino ufficiale** [CLAUSOLA_SOLO_2GG].

È il parametro istituzionale di benvenuto che [IDENTITA_IZZO] ha deliberato a favore di {COMPANY_NAME} per avviare un rapporto di fornitura trasparente e continuativo:

{CREDENTIALS_BLOCK}

[INVITO_CLIC_PDF] [PUO_VISIONARE] analiticamente le quotazioni nette per singola referenza.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T068',
    name: 'Accreditamento B2B — Conferma Ufficiale di Abilitazione Anagrafica',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Conferma abilitazione anagrafica B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

confermiamo la regolare abilitazione della posizione anagrafica B2B intestata a {COMPANY_NAME} sulla piattaforma di [IDENTITA_IZZO].

Il profilo comprende i seguenti parametri operativi:
• Sconto B2B di categoria {BASE_DISCOUNT}% + agevolazione {EXTRA_DISCOUNT}% in cascata [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG];
• [IL_CATALISTINO_PDF] già valorizzato coi prezzi netti dedicati;
• [TEMPI_RESA] e referente commerciale assegnato ({AGENT_NAME}).

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T069',
    name: 'Accreditamento B2B — Regolarità di Rifornimento da Deposito Centrale',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Approvvigionamenti rapidi 2gg ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

garantire continuità di disponibilità sui materiali più richiesti senza appesantire i costi fissi di stoccaggio richiede un polo distributivo puntuale. In [IDENTITA_IZZO] manteniamo scorte strutturate presso [NOSTRO_DEPOSITO] [RICAMBIO_COSTANTE] per servire le aziende accreditate in 24/48 ore.

Riportiamo di seguito [LE_CREDENZIALI] e [IL_CATALISTINO_PDF] predisposti per {COMPANY_NAME} col parametro {DISCOUNT_FORMULA} attivo sul primo ordine 2gg:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T070',
    name: 'Accreditamento B2B — Comunicazione di Servizio per la Direzione',
    angleGroup: 'Accreditamento_Anagrafica_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. — Prospetto B2B 2gg ({DISCOUNT_FORMULA}) per {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

[APERTURA_BREVE] da [IDENTITA_IZZO]: abbiamo emesso a favore della Vostra società [IL_CATALISTINO_PDF] con condizione riservata {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Per ogni esigenza informativa o commerciale rimane a disposizione il referente assegnato ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 8 (T071 - T080): AFFIANCAMENTO FORNITORI & CANALE B2B PARALLELO
  // ==========================================================================
  {
    code: 'T071',
    name: 'Canale Complementare — Affiancamento Rispettoso ai Fornitori Storici',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Accreditamento secondo canale B2B ({DISCOUNT_FORMULA} su 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

siamo consapevoli che una realtà strutturata come la Vostra dispone già di fornitori consolidati, e la presente comunicazione non intende in alcun modo interferire con gli equilibri esistenti.

L’intento di [IDENTITA_IZZO] è mettere formalmente a Vostra disposizione un canale distributivo B2B già accreditato [RUOLO_SECONDO_CANALE]. Per renderne immediatamente apprezzabile l’utilizzo, [ABBIAMO_ATTIVATO] sulla prima fornitura di {COMPANY_NAME} il parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

I riferimenti restano attivi a disposizione del Vostro Ufficio Acquisti per ogni futura verifica comparativa o esigenza 24/48h.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T072',
    name: 'Canale Complementare — Continuità di Approvvigionamento Senza Burocrazia',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Canale di fornitura complementare 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nella gestione professionale degli acquisti disporre di un ulteriore fornitore già codificato e con condizioni chiare tutela l’azienda qualora sui canali abituali si registrino allungamenti dei tempi di consegna o rigidità di listino.

Presso [IDENTITA_IZZO] l’iter amministrativo per {COMPANY_NAME} è già stato perfezionato: [LE_CREDENZIALI] sono attive, [IL_CATALISTINO_PDF] è consultabile e il parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG] è operativo [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

Il tutto [INCISO_SENZA_VINCOLO] e [DOPO_PRIMO_ORDINE].

[FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T073',
    name: 'Canale Complementare — Valutazione Comparativa Trasparente',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Prospetto comparativo listino 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

esaminare un secondo listino B2B accreditato rappresenta una buona prassi gestionale che richiede pochi minuti e consente spesso di individuare interessanti margini di ottimizzazione sui costi d’acquisto.

A tal fine, da [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] [IL_CATALISTINO_PDF] relativo a {RECOMMENDED_FAMILY} con parametro 1ª fornitura {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG] riservato a {COMPANY_NAME}:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO], con piena operatività di spedizione in 24/48 ore lavorative.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T074',
    name: 'Canale Complementare — Zero Obblighi Contrattuali o Volumi Minimi Annui',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Posizione B2B esente da vincoli ({DISCOUNT_FORMULA} 1ª fornitura) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

numerosi operatori professionali scelgono di mantenere attiva una posizione presso [IDENTITA_IZZO] per la linearità delle condizioni applicate: nessun obbligo di volume annuo, zero oneri di tenuta conto, [ZERO_MINIMO_ORDINE] e [STOCK_REALE] evadibile in 24/48h.

Abbiamo formalizzato tale configurazione a nome di {COMPANY_NAME}{CITY_PAREN} comprensiva dell’agevolazione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T075',
    name: 'Canale Complementare — Approccio Discreto e Istituzionale',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimenti di accesso magazzino B2B 24/48h — {COMPANY_NAME}{CITY_PAREN}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

trasmettiamo con la massima discrezione da parte di [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE] per [SETTORI_MERCEOLOGICI]) le credenziali di accesso al nostro polo logistico 2gg, affinché siano già disponibili presso i Vostri uffici in caso di necessità.

Al primo utilizzo {COMPANY_NAME} usufruirà automaticamente della condizione {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Nel rispetto della Vostra operatività non seguiranno solleciti telefonici: il referente assegnato ({AGENT_NAME}) rimane a disposizione qualora desideraste approfondire.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T076',
    name: 'Canale Complementare — Supporto sulle Carenze Temporanee di Mercato',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Disponibilità immediata 2gg ({DISCOUNT_FORMULA}) a supporto di {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

anche nelle catene di fornitura più efficienti possono verificarsi temporanee indisponibilità su specifici codici tecnici. In tali circostanze [NOSTRO_DEPOSITO] di [IDENTITA_IZZO] costituisce un concreto supporto operativo per {COMPANY_NAME}.

Tramite l’utenza che [ABBIAMO_ATTIVATO] qui di seguito è possibile verificare in tempo reale i quantitativi pronti 2gg e perfezionare l’ordine col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO]:

{CREDENTIALS_BLOCK}

Garantiamo [TEMPI_RESA] [COPERTURA_ITALIA].

[FRASE_DISPONIBILITA] [COME_RISPONDERE].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T077',
    name: 'Canale Complementare — Verifica Operativa su una Singola Fornitura',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accreditamento fornitura di verifica 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

la valutazione più attendibile di un distributore B2B scaturisce sempre dal riscontro diretto su una prima fornitura concreta, anche di entità contenuta, verificando precisione documentale, integrità dei colli e rispetto delle tempistiche.

Proprio per agevolare tale verifica, [IDENTITA_IZZO] ha associato a {COMPANY_NAME} la condizione {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] [ZERO_MINIMO_ORDINE] unitamente a [IL_CATALISTINO_PDF]:

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T078',
    name: 'Canale Complementare — Diversificazione Qualificata delle Fonti d’Acquisto',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Diversificazione fornitori B2B {SECTOR_SHORT} ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

affiancare più fonti qualificate di approvvigionamento sulle referenze [ARTICOLI_ALTA_ROTAZIONE] consente alle aziende strutturate di migliorare i parametri medi d’acquisto e garantire continuità esecutiva.

In quest’ottica [IDENTITA_IZZO] [METTIAMO_A_DISPOSIZIONE] [CANALE_RISERVATO] intestato a {COMPANY_NAME} con quotazione 1ª fornitura {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T079',
    name: 'Canale Complementare — Comunicazione da Archiviare per l’Ufficio Acquisti',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Riferimenti B2B da archiviare per l’Ufficio Acquisti di {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

qualora nell’immediato non aveste approvvigionamenti in programma, suggeriamo di conservare la presente nota o inoltrarla al referente acquisti di {COMPANY_NAME}: riporta [LE_CREDENZIALI] già abilitate presso [IDENTITA_IZZO] e l’accesso a [IL_CATALISTINO_PDF] valorizzato col parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Alla prima esigenza di materiale elettrico, illuminazione LED o forniture tecniche in 24/48 ore disporrete già di una posizione immediatamente operativa.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T080',
    name: 'Canale Complementare — Collaborazione Flessibile Orientata al Servizio',
    angleGroup: 'Canale_Fornitura_Complementare',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Rapporto di fornitura B2B flessibile ({DISCOUNT_FORMULA} su 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] operiamo per offrire alle aziende del territorio una soluzione distributiva [AGGETTIVO_VELOCE_F], trasparente e competitiva sulle linee {RECOMMENDED_FAMILY}.

Abbiamo pertanto predisposto per {COMPANY_NAME} sia la documentazione PDF di consultazione immediata sia l’utenza B2B con condizione riservata {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 9 (T081 - T090): COMUNICAZIONE ESECUTIVA SINTETICA ALLA DIREZIONE
  // ==========================================================================
  {
    code: 'T081',
    name: 'Nota Esecutiva — Prospetto Essenziale di Abilitazione',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Izzo Distribuzione S.r.l. | Abilitazione B2B {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

trasmettiamo in forma sintetica da parte di [IDENTITA_IZZO] ([SETTORI_MERCEOLOGICI]) i riferimenti della posizione B2B attivata a nome della Vostra società:

{CREDENTIALS_BLOCK}

Condizioni operative: [ZERO_MINIMO_ORDINE], disponibilità reale 24/48h e referente commerciale assegnato ({AGENT_NAME}).

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T082',
    name: 'Nota Esecutiva — Trasmissione Parametri Prima Fornitura 2gg',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: '[OGG_TIPO_DOC] ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

comunichiamo in estrema sintesi i parametri riservati che [IDENTITA_IZZO] ha associato alla Vostra ragione sociale per la prima fornitura [CLAUSOLA_SOLO_2GG] ({NET_DISCOUNT_PCT}% di sconto netto effettivo da listino):

{CREDENTIALS_BLOCK}

Il prospetto PDF è immediatamente consultabile dal collegamento dedicato. Per qualsiasi chiarimento è attivo il riscontro diretto a questa email.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T083',
    name: 'Nota Esecutiva — Comunicazione Rapida alla Direzione Operativa',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Credenziali B2B e listino 24/48h ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per agevolare una lettura immediata anche in mobilità, riepilogo a nome di [IDENTITA_IZZO] ({AGENT_NAME}) l’abilitazione predisposta per {COMPANY_NAME} sul listino Pronta Consegna 2gg col parametro {DISCOUNT_FORMULA} sulla prima fornitura [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

L’utenza e il prospetto PDF restano stabilmente attivi a disposizione della Vostra struttura.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T084',
    name: 'Nota Esecutiva — Notifica Ufficiale di Attivazione Utenza',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Attivazione utenza B2B {COMPANY_NAME} — Parametro {DISCOUNT_FORMULA} (Linea 2gg)',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

informiamo che presso [IDENTITA_IZZO] risulta attiva da data odierna l’utenza B2B riservata a {COMPANY_NAME} ({SECTOR_SHORT}), configurata con condizione {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG] e [TEMPI_RESA]:

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T085',
    name: 'Nota Esecutiva — Quadro Unificato Documentazione PDF e Accesso Portale',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Documentazione PDF e accesso B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

abbiamo riunito nel prospetto sottostante sia [IL_CATALISTINO_PDF] sia [LE_CREDENZIALI] emesse da [IDENTITA_IZZO] a favore di {COMPANY_NAME}, con parametro riservato {DISCOUNT_FORMULA} già calcolato sulla linea Pronta Consegna 2gg:

{CREDENTIALS_BLOCK}

Il referente assegnato ({AGENT_NAME}) resta a diretta disposizione per ogni approfondimento.
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T086',
    name: 'Nota Esecutiva — Riepilogo Puntuale Condizioni Abilitate',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Riepilogo condizioni B2B attivate per {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nell’accreditare il servizio distributivo di [IDENTITA_IZZO], confermiamo i parametri abilitati a favore di {COMPANY_NAME}:
• **Parametro {DISCOUNT_FORMULA} in cascata** sulla prima fornitura [CLAUSOLA_SOLO_2GG];
• **Assenza di minimo d’ordine** ed evasione rapida in 24/48h;
• **Documentazione PDF riservata** immediatamente consultabile.

{CREDENTIALS_BLOCK}

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T087',
    name: 'Nota Esecutiva — Trasmissione Formale Ufficio Commerciale',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Rif. anagrafica {COMPANY_NAME}{CITY_PAREN} — Listino 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

tramite il collegamento riportato nel riquadro seguente trasmettiamo [IL_CATALISTINO_PDF] emesso da [IDENTITA_IZZO] per la Vostra ragione sociale, completo di credenziali di autenticazione B2B e parametro 1ª fornitura {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG].

{CREDENTIALS_BLOCK}

Per quotazioni su distinta o chiarimenti amministrativi potete rispondere direttamente alla presente.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T088',
    name: 'Nota Esecutiva — Riscontro Rapido sui Codici di Maggior Consumo',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Verifica quotazioni nette 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

per una verifica rapida ed essenziale delle nostre condizioni, è sufficiente aprire [IL_CATALISTINO_PDF] di [IDENTITA_IZZO] dal riquadro sottostante ed esaminare il prezzo netto finito ({DISCOUNT_FORMULA}) sulle referenze di Vostro più frequente utilizzo:

{CREDENTIALS_BLOCK}

L’utenza riportata consente in ogni momento la consultazione integrale del portale e delle giacenze 24/48h.

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T089',
    name: 'Nota Esecutiva — Sintesi Istituzionale Direzione Commerciale',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Condizioni riservate prima fornitura {DISCOUNT_FORMULA} (Linea 2gg) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

da parte di [IDENTITA_IZZO] ([QUALIFICA_DISTRIBUTORE]) [CONNETTIVO_SINTESI]

{CREDENTIALS_BLOCK}

Tutte le referenze soggette al parametro {DISCOUNT_FORMULA} vengono spedite da [NOSTRO_DEPOSITO] in 24/48 ore lavorative, [ZERO_MINIMO_ORDINE].

[FRASE_DISPONIBILITA] ({AGENT_NAME}).
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T090',
    name: 'Nota Esecutiva — Invio Riferimenti Diretti Referente e Portale',
    angleGroup: 'Comunicazione_Esecutiva_Sintetica',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Comunicazione {AGENT_NAME} per {COMPANY_NAME} — Prospetto 2gg ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

trasmetto in forma sintetica il collegamento a [IL_CATALISTINO_PDF] e i parametri di accesso al portale di [IDENTITA_IZZO] abilitati a favore di {COMPANY_NAME} con condizione 1ª fornitura {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Per ogni necessità operativa potete fare riferimento diretto al sottoscritto ([CONTATTO_UMANO_VERO]).

[SALUTO_CHIUSURA]`,
  },

  // ==========================================================================
  // GRUPPO 10 (T091 - T100): PRESIDIO TERRITORIALE & PARTNERSHIP B2B CONTINUATIVA
  // ==========================================================================
  {
    code: 'T091',
    name: 'Sviluppo Territoriale — Potenziamento Servizio Diretto sull’Area',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Servizio forniture B2B 24/48h su {CITY} — Posizione riservata a {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

nell’ambito del potenziamento del servizio distributivo diretto di [IDENTITA_IZZO] a favore degli operatori qualificati [CONTESTO_ZONA] {CITY} attivi nel comparto {SECTOR_SHORT}, abbiamo riservato una specifica abilitazione alla Vostra società.

Nello specifico [ABBIAMO_PREPARATO] [IL_CATALISTINO_PDF] relativo alle linee {RECOMMENDED_FAMILY} e attivato il parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG], garantendo [TEMPI_RESA] presso la Vostra sede di {CITY}.

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T092',
    name: 'Sviluppo Territoriale — Capacità Logistica Nazionale e Referente Dedicato',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: '[OGG_PER_AZIENDA] {COMPANY_NAME}{CITY_PAREN} — [OGG_TIPO_DOC] ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME}, [SALUTO_GIORNATA]

il modello operativo di [IDENTITA_IZZO] è strutturato per mettere a disposizione delle aziende [CONTESTO_ZONA] {CITY} la profondità di stock di un polo logistico centrale 24/48h, affiancata dalla continuità relazionale di un referente dedicato ({AGENT_NAME}).

Per avviare tale collaborazione [ABBIAMO_ATTIVATO] a favore di {COMPANY_NAME} [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

{BRANDS_NOTE}

[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T093',
    name: 'Sviluppo Territoriale — Impostazione Orientata a Rapporti B2B Stabili',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Accreditamento partnership di fornitura B2B ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

la politica commerciale di [IDENTITA_IZZO] è orientata alla costruzione di rapporti di fornitura B2B continuativi e qualificati con le realtà strutturate [PER_IL_COMPARTO] {SECTOR_SHORT}.

Consapevoli che ogni collaborazione solida nasce da una verifica concreta sul campo, [METTIAMO_A_DISPOSIZIONE] una prima fornitura [ZERO_MINIMO_ORDINE] assistita dal parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e da [IL_CATALISTINO_PDF] dedicato a {COMPANY_NAME}.

{CREDENTIALS_BLOCK}

[PROMESSA_FIDUCIA]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T094',
    name: 'Sviluppo Territoriale — Collegamenti Giornalieri Corriere Espresso sulla Provincia',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Copertura logistica 24/48h per {COMPANY_NAME}{CITY_PAREN} | Condizioni {DISCOUNT_FORMULA}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

attraverso partenze giornaliere da [NOSTRO_DEPOSITO] con corrieri espressi nazionali, [IDENTITA_IZZO] presidia regolarmente con consegne in 24/48h l’area di {CITY}, operando [DESTINAZIONE_FLESSIBILE].

A favore di {COMPANY_NAME} [ABBIAMO_PREPARATO] una posizione immediatamente operativa su [SETTORI_MERCEOLOGICI] col parametro {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

Operiamo [CERTEZZA_EVASIONE] e con rigorosa [CURA_IMBALLO]. Per ogni informazione siamo contattabili [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T095',
    name: 'Sviluppo Territoriale — Comunicazione Riservata agli Operatori Qualificati',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Accreditamento riservato operatori B2B — {COMPANY_NAME} ({DISCOUNT_FORMULA})',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

nell’ambito dell’accreditamento degli operatori professionali del comparto {SECTOR_SHORT} presenti su {CITY}, la Direzione Commerciale di [IDENTITA_IZZO] ha predisposto una posizione riservata intestata a {COMPANY_NAME}.

Tramite il quadro riepilogativo sottostante [PUO_VISIONARE] [IL_CATALISTINO_PDF] valorizzato col parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e utilizzare [LE_CREDENZIALI] [INCISO_SENZA_VINCOLO]:

{CREDENTIALS_BLOCK}

[QUOTAZIONI_SU_COMMESSA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T096',
    name: 'Sviluppo Territoriale — Continuità di Stock e Assistenza nel Tempo',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'accent_stripe',
    subjectTemplate: 'Partner distributivo B2B 24/48h per {COMPANY_NAME} — Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

collaborare con una [QUALIFICA_DISTRIBUTORE] quale [IDENTITA_IZZO] consente di fare affidamento tutto l’anno su [STOCK_REALE], listini trasparenti e un referente dedicato ({AGENT_NAME}) a supporto degli acquisti su {RECOMMENDED_FAMILY}.

L’attivazione non prevede alcun vincolo: sulla prima fornitura 2gg {COMPANY_NAME} dispone già di [IL_DOPPIO_SCONTO] {DISCOUNT_FORMULA} [ZERO_MINIMO_ORDINE].

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA], [COME_RISPONDERE] [OPZIONE_TELEFONATA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T097',
    name: 'Sviluppo Territoriale — Innovazione Digitale B2B e Serietà Commerciale',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Organizzazione B2B e Pronta Consegna 2gg ({DISCOUNT_FORMULA}) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

in [IDENTITA_IZZO] affianchiamo a un’infrastruttura digitale B2B evoluta e a [IL_CATALISTINO_PDF] in costante aggiornamento i principi cardine della distribuzione professionale: rispetto rigoroso delle tempistiche concordate, controllo qualità in spedizione e rapporto diretto col referente.

Con questa impostazione dedichiamo a {COMPANY_NAME}{CITY_PAREN} la condizione di primo accreditamento {DISCOUNT_FORMULA} [SUL_PRIMO_ACQUISTO] [CLAUSOLA_SOLO_2GG]:

{CREDENTIALS_BLOCK}

[AIUTO_PRIMA_LISTA].
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T098',
    name: 'Sviluppo Territoriale — Riferimento Provinciale Area Clienti Direzionali',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'compact_memo',
    subjectTemplate: 'Area Clienti B2B {CITY} ({DISCOUNT_FORMULA} 1ª fornitura) — {COMPANY_NAME}',
    bodyTemplate: `[SALUTO_UFFICIO] {COMPANY_NAME},

in qualità di referente ({AGENT_NAME}) incaricato da [IDENTITA_IZZO] per i rapporti con le aziende professionali della Vostra area provinciale, confermo l’abilitazione del profilo B2B di {COMPANY_NAME} col parametro {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG] e [ZERO_MINIMO_ORDINE]:

{CREDENTIALS_BLOCK}

La documentazione contenuta in [IL_CATALISTINO_PDF] è immediatamente scaricabile; per qualsiasi riscontro operativo resto direttamente reperibile [COME_RISPONDERE].

[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T099',
    name: 'Sviluppo Territoriale — Condizioni di Primo Impianto e Regime Ordinario B2B',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'clean_table',
    subjectTemplate: 'Parametri B2B riservati a {COMPANY_NAME} — 1ª fornitura {DISCOUNT_FORMULA} e Listino {BASE_DISCOUNT}%',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME},

l’accreditamento predisposto da [IDENTITA_IZZO] a favore di {COMPANY_NAME} definisce condizioni chiare sia per la verifica iniziale sia per la gestione ordinaria successiva:
• **Prima fornitura conoscitiva**: applicazione del parametro {DISCOUNT_FORMULA} ({NET_DISCOUNT_PCT}% netto) [CLAUSOLA_SOLO_2GG] [ZERO_MINIMO_ORDINE];
• **Forniture successive**: mantenimento stabile del listino professionale {BASE_DISCOUNT}% e quotazioni dedicate [PER_IL_COMPARTO] {SECTOR_SHORT}.

{CREDENTIALS_BLOCK}

[ACCESSO_SENZA_IMPEGNO].
[PRE_SALUTO_FINALE]
[SALUTO_CHIUSURA]`,
  },
  {
    code: 'T100',
    name: 'Sviluppo Territoriale — Comunicazione Ufficiale di Accreditamento al Portale B2B',
    angleGroup: 'Sviluppo_Rete_Territoriale',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'executive_card',
    subjectTemplate: 'Comunicazione ufficiale di accreditamento B2B — {COMPANY_NAME} | Izzo Distribuzione S.r.l.',
    bodyTemplate: `[SALUTO_AZIENDA] {COMPANY_NAME}, [SALUTO_GIORNATA]

con la presente la Direzione Commerciale di [IDENTITA_IZZO] ([SETTORI_MERCEOLOGICI]) trasmette i riferimenti ufficiali relativi all’apertura della posizione B2B intestata a {COMPANY_NAME}.

L’anagrafica è già pienamente abilitata per la consultazione di [IL_CATALISTINO_PDF] e per l’applicazione sulla prima fornitura del parametro riservato {DISCOUNT_FORMULA} [CLAUSOLA_SOLO_2GG], con [TEMPI_RESA] [COPERTURA_ITALIA]:

{CREDENTIALS_BLOCK}

[FRASE_DISPONIBILITA] [PER_OGNI_ESIGENZA].
[SALUTO_CHIUSURA]`,
  },
];
