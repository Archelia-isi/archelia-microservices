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
 * 100 Email Madri Universali Izzo Distribuzione S.r.l. (T001 - T100) — STEP 1: Stile Diretto B2B 2025-2026.
 * Regole Tassative Step 1:
 * - Oggetti brevi e naturali (4-6 parole, 22-55 caratteri, tutti con prefisso a 2 parole prima di 'per {COMPANY_SHORT}'),
 *   ZERO trattini '—' o '|', ZERO 'S.r.l.' o 'Izzo Distribuzione', ZERO '%'
 * - Corpi snelli, idiomatici e centrati nella fascia [75 .. 100] parole (esclusa firma) in qualsiasi combinazione cartesiana
 * - Struttura rapida a 3 paragrafi brevi + saluto finale:
 *   1. {SALUTO_MODERNO} + presentazione con {AGENT_NAME} di Izzo Distribuzione S.r.l. e micro-descrizione ingrosso Partita IVA
 *   2. Gancio reale su azienda/territorio/settore + 2-3 prodotti mirati {PRODOTTI_MIRATI} + vantaggio concreto + condizione 1° ordine senza '%'
 *   3. Domanda finale corta di 1 sola riga + [SALUTO_CHIUSURA]
 * - Concordanza automatica 100% pura 'Lei' (titolare verificato) vs 'voi' minuscolo (azienda), zero mescolanze, zero zeugmi e zero echi di radice.
 */
export const DEFAULT_EMAIL_TEMPLATES: SeedEmailTemplate[] = [
  // ==========================================================================
  // FAMIGLIA 01 (T001-T005) — PRESENTAZIONE DIRETTA & FILIERA CORTA
  // ==========================================================================
  {
    code: 'T001',
    name: 'F01.1 Diretta — Presentazione Filiera Corta & Zero Minimo',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimo d’ordine, a prezzi netti e con un’agevolazione sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del nostro catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T002',
    name: 'F01.2 Diretta — Prezzi Netti da Grossista & Pronta Consegna',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le esigenze operative {COMP_REF_DI} {LOC_PHRASE}, teniamo [IN_PRONTA_CONSEGNA] {PRODOTTI_MIRATI}, senza alcuna soglia minima, a prezzi netti e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T003',
    name: 'F01.3 Diretta — Fornitura Snella & Margine Protetto',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta riservata per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nConoscendo l’ambito operativo {COMP_REF_DI} {LOC_PHRASE}, mettiamo a disposizione {PRODOTTI_MIRATI} [ZERO_MINIMO_ORDINE], a quotazioni nette da filiera corta e con un’agevolazione sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T004',
    name: 'F01.4 Diretta — Listino Ingrosso Chiaro & Spedizioni Rapide',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Catalogo B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le realtà del {POSS_M} comparto attive {LOC_PHRASE}, proponiamo senza minimo d’ordine {PRODOTTI_MIRATI}, con spedizioni rapide in tutta Italia e uno sconto di benvenuto sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del listino per valutare i prezzi?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T005',
    name: 'F01.5 Diretta — Confronto Libero sui Prezzi Netti',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con prezzi netti chiari e un’agevolazione [AGGETTIVO_RISERVATA_F] d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto sintetico del nostro catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 02 (T006-T010) — NOTA RAPIDA & CONFRONTO VELOCE
  // ==========================================================================
  {
    code: 'T006',
    name: 'F02.1 Nota Rapida — Riferimento Diretto in Tre Passaggi',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Dettaglio condizioni per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nVisto il profilo operativo {COMP_REF_DI} {LOC_PHRASE}, proponiamo senza quantitativi minimi {PRODOTTI_MIRATI} a quotazioni nette competitive, con merce pronta e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T007',
    name: 'F02.2 Nota Rapida — Sintesi Prezzi & Stock Reale',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Sintesi forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con [STOCK_REALE], quotazioni chiare e un’agevolazione d’ingresso.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T008',
    name: 'F02.3 Nota Rapida — Colli Piccoli & Consegna Veloce',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le forniture che {VERBO_GESTIRE} {LOC_PHRASE}, spediamo anche in piccoli colli senza soglie minime {PRODOTTI_MIRATI}, a prezzi netti e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T009',
    name: 'F02.4 Nota Rapida — Essenziale per Titolare e Acquisti',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer i {POSS_MP} approvvigionamenti operativi {LOC_PHRASE}, teniamo [IN_PRONTA_CONSEGNA] {PRODOTTI_MIRATI}, senza soglie minime, a prezzi netti e con [IL_DOPPIO_SCONTO].\n\nPosso {LASCIARE_PRON} qui in risposta un estratto del catalogo da consultare [AVVERBIO_LIBERAMENTE]?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T010',
    name: 'F02.5 Nota Rapida — Verifica Immediata Convenienza',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Confronto listini per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimi d’ordine, a quotazioni nette chiare e con una condizione [AGGETTIVO_RISERVATA_F] d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del catalogo con i nostri prezzi?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 03 (T011-T015) — CONTATTO PERSONALE 1-A-1 DANIELE SAVOIA
  // ==========================================================================
  {
    code: 'T011',
    name: 'F03.1 Prima Persona — Daniele Savoia Diretto Senza Filtri',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Contatto B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: per {PRODOTTI_MIRATI} garantiamo assistenza senza call center, assenza di minimi d’ordine, prezzi netti e un’agevolazione d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del listino per un rapido confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T012',
    name: 'F03.2 Prima Persona — Referente Unico & Risposte Veloci',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Referente forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nmi chiamo {AGENT_NAME} e seguo il reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer l’attività {COMP_REF_DI} {LOC_PHRASE}, {PRON_IND} propongo senza soglie minime {PRODOTTI_MIRATI}, a quotazioni nette da filiera corta e con [IL_DOPPIO_SCONTO].\n\n{SE_FA_COMODO}, posso {GIRARE_PRON} qui un estratto del catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T013',
    name: 'F03.3 Prima Persona — Assistenza Diretta & Prezzi da Filiera Corta',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Contatto B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSeguo in prima persona diverse realtà {LOC_PHRASE} dello stesso comparto {COMP_REF_DI}: per {PRODOTTI_MIRATI} uniamo quotazioni nette da filiera corta, assenza di quantitativi minimi e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T014',
    name: 'F03.4 Prima Persona — Risparmio Concreto sugli Acquisti Ricorrenti',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con un’agevolazione d’ingresso e prezzi netti studiati per ridurre i costi.\n\nPosso {INVIARE_PRON} qui in risposta un estratto sintetico del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T015',
    name: 'F03.5 Prima Persona — Riferimento Personale per Ogni Esigenza',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizioni riservate per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI}, con quotazioni nette chiare, scorte pronte e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 04 (T016-T020) — PRATICITÀ OPERATIVA & ZERO MINIMO D'ORDINE
  // ==========================================================================
  {
    code: 'T016',
    name: 'F04.1 Praticità — Libertà Totale sui Quantitativi',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Catalogo forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimo d’ordine, a prezzi netti chiari e con un’agevolazione sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto sintetico del nostro listino per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T017',
    name: 'F04.2 Praticità — Ricarico Protetto & Articoli Alta Rotazione',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Catalogo B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer {COMPANY_BODY_SHORT} {LOC_PHRASE}, mettiamo a disposizione {PRODOTTI_MIRATI} [ZERO_MINIMO_ORDINE], tutelando i margini operativi con quotazioni nette da filiera corta e un’agevolazione d’ingresso.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T018',
    name: 'F04.3 Praticità — Approvvigionamento Veloce & Qualità Garantita',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con conformità normativa garantita e un’agevolazione sul primo acquisto.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del catalogo con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T019',
    name: 'F04.4 Praticità — Consumi Ricorrenti & Consegna Flessibile',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nOperando con le realtà del {POSS_M} settore {LOC_PHRASE}, copriamo senza soglie minime {PRODOTTI_MIRATI} con recapito rapido in sede o all’indirizzo indicato, prezzi netti e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T020',
    name: 'F04.5 Praticità — Imballi Curati & Listini Chiari',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti {COMP_REF_DI} {LOC_PHRASE}, spediamo senza soglie minime {PRODOTTI_MIRATI}, unendo imballi curati, quotazioni nette e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 05 (T021-T025) — RUBRICA FORNITORI & PREZZI NETTI
  // ==========================================================================
  {
    code: 'T021',
    name: 'F05.1 Rubrica Fornitori — Nuovo Riferimento Ingrosso Snello',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Nuovo riferimento per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSe {VERBO_CONSIDERARE} fornitori di affiancamento per {COMPANY_BODY_SHORT} {LOC_PHRASE}, spediamo senza soglie minime {PRODOTTI_MIRATI}, con prezzi netti chiari, scorte pronte e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T022',
    name: 'F05.2 Rubrica Fornitori — Valutazione Pratica sui Prezzi Reali',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizioni B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con merce pronta a magazzino e uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del listino per un rapido confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T023',
    name: 'F05.3 Rubrica Fornitori — Alternativa Solida per Acquisti e Preventivi',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riferimento B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer supportare le richieste operative {COMP_REF_DI} {LOC_PHRASE}, mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI} a quotazioni nette trasparenti, con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T024',
    name: 'F05.4 Rubrica Fornitori — Verifica Rapida Reparto Acquisti',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Sintesi B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con scorte reali aggiornate, prezzi netti e uno sconto sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del listino per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T025',
    name: 'F05.5 Rubrica Fornitori — Parametri Chiari Fin dal Primo Sguardo',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSeguendo da vicino il {POSS_M} comparto {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI} a prezzi netti e con [IL_DOPPIO_SCONTO].\n\n{SE_FA_COMODO}, posso {LASCIARE_PRON} qui un estratto del catalogo da consultare in piena libertà?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 06 (T026-T030) — CONDIZIONE DEDICATA SUL PRIMO ORDINE
  // ==========================================================================
  {
    code: 'T026',
    name: 'F06.1 Condizione Dedicata — Prova Operativa Senza Rischi',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta dedicata per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer {COMPANY_BODY_SHORT} {LOC_PHRASE}, se {VERBO_PREFERIRE} partire anche da piccoli quantitativi, applichiamo quotazioni nette da filiera corta su {PRODOTTI_MIRATI}, con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T027',
    name: 'F06.2 Condizione Dedicata — Agevolazione Primo Acquisto & Zero Minimi',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizioni riservate per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimi d’ordine, a prezzi netti chiari e con uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T028',
    name: 'F06.3 Condizione Dedicata — Listino Netto & Benvenuto Nuovi Partner',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Gamma prodotti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti {COMP_REF_DI} {LOC_PHRASE}, teniamo [IN_PRONTA_CONSEGNA] {PRODOTTI_MIRATI}, operando senza quantitativi minimi, a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T029',
    name: 'F06.4 Condizione Dedicata — Prezzi Finiti Chiari & Zero Vincoli',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Sintesi prezzi per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con quotazioni nette chiare e un’agevolazione sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del listino da valutare [AVVERBIO_LIBERAMENTE]?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T030',
    name: 'F06.5 Condizione Dedicata — Verifica Convenienza sul Campo',
    angleGroup: 'Credenziali_Comodita',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le realtà del {POSS_M} comparto attive {LOC_PHRASE}, spediamo {PRODOTTI_MIRATI} anche in piccoli colli senza soglie minime, con prezzi netti chiari e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 07 (T031-T035) — PREVENTIVI VELOCI SU LISTA MATERIALI & WHATSAPP
  // ==========================================================================
  {
    code: 'T031',
    name: 'F07.1 Preventivi su Lista — Quotazione Rapida di Confronto',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Preventivi veloci per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSe {VERBO_AVERE} progetti o approvvigionamenti in corso {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI}, quotando in giornata anche distinte materiali con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T032',
    name: 'F07.2 Preventivi su Lista — Risposta Diretta o Estratto PDF',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Preventivi diretti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nmi chiamo {AGENT_NAME} e seguo le forniture di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer {COMPANY_BODY_SHORT} {LOC_PHRASE}, proponiamo senza minimo d’ordine {PRODOTTI_MIRATI}, con assistenza rapida su distinta via email o WhatsApp e uno sconto sul primo acquisto.\n\n{SE_FA_COMODO}, posso {INVIARE_PRON} intanto qui un estratto del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T033',
    name: 'F07.3 Preventivi su Lista — Richieste con Consegna Flessibile',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Preventivi rapidi per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nAffianchiamo {COMPANY_BODY_SHORT} {LOC_PHRASE} quotando senza soglie minime {PRODOTTI_MIRATI}, con recapito in sede o presso l’indirizzo indicato e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T034',
    name: 'F07.4 Preventivi su Lista — Schede Prodotto & Prezzi Netti',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli acquisti ricorrenti {COMP_REF_DI} {LOC_PHRASE}, garantiamo documentazione tecnica completa e prezzi netti chiari su {PRODOTTI_MIRATI}, senza minimo d’ordine e con un’agevolazione d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del nostro catalogo o {VERBO_PREFERIRE} inviare una distinta?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T035',
    name: 'F07.5 Preventivi su Lista — Test Veloce sugli Articoli Più Usati',
    angleGroup: 'Presentazione_Referente',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con preventivi rapidi su distinta e uno sconto sul primo acquisto.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 08 (T036-T040) — GAMMA CHIAVE PRONTA A MAGAZZINO
  // ==========================================================================
  {
    code: 'T036',
    name: 'F08.1 Gamma Pronta — Disponibilità Reale sui Prodotti Chiave',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Scorte B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con merce pronta in magazzino, prezzi netti e uno sconto d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto sintetico del nostro catalogo?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T037',
    name: 'F08.2 Gamma Pronta — Reparti Essenziali & Spedizione Veloce',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Gamma pronta per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nA supporto {COMP_REF_DI} {LOC_PHRASE}, teniamo a magazzino {PRODOTTI_MIRATI}, senza soglie minime, con corriere espresso tracciato e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T038',
    name: 'F08.3 Gamma Pronta — Alta Rotazione & Elasticità sugli Ordini',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Riordini agili per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} anche per piccoli quantitativi senza minimi d’ordine, a prezzi netti e con uno sconto d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta un estratto sintetico del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T039',
    name: 'F08.4 Gamma Pronta — Selezione Marchi & Referente Unico',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer i fabbisogni operativi che {VERBO_GESTIRE} {LOC_PHRASE}, mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI}, con un canale dedicato su WhatsApp e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T040',
    name: 'F08.5 Gamma Pronta — Continuità di Scorta & Prezzi Trasparenti',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Gamma prodotti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con [STOCK_REALE], prezzi netti trasparenti e uno sconto d’ingresso.\n\nPosso {MANDARE_PRON} qui in risposta un estratto sintetico del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 09 (T041-T045) — DOPPIO VANTAGGIO: LISTINO O PREVENTIVO
  // ==========================================================================
  {
    code: 'T041',
    name: 'F09.1 Doppio Canale — Listino Online più Referente Umano',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo senza minimo d’ordine {PRODOTTI_MIRATI}, con prezzi netti chiari, preventivi rapidi su lista e un’agevolazione d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del nostro catalogo riservato?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T042',
    name: 'F09.2 Doppio Canale — Autonomia sui Netti & Assistenza Dedicata',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Proposta forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer affiancare {COMPANY_BODY_SHORT} {LOC_PHRASE}, mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI} a prezzi netti da filiera corta, con quotazioni su misura e [IL_DOPPIO_SCONTO].\n\n{SE_FA_COMODO}, posso {GIRARE_PRON} qui un estratto del listino per un rapido confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T043',
    name: 'F09.3 Doppio Canale — Verifica Veloce Prezzi & Capitolati',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Schede prodotto per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con documentazione completa pronta e un’agevolazione sul primo acquisto.\n\nPosso {LASCIARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T044',
    name: 'F09.4 Doppio Canale — Confronto Immediato o Contatto Diretto',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le esigenze operative {COMP_REF_DI} {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI}, con prezzi netti competitivi, scorte pronte e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T045',
    name: 'F09.5 Doppio Canale — Giacenze Vere & Quotazioni Dedicate',
    angleGroup: 'Valutazione_Listino_B2B',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Disponibilità immediata per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimi d’ordine, con scorte reali a magazzino, quotazioni nette e uno sconto sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del catalogo riservato?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 10 (T046-T050) — QUALITÀ CERTIFICATA & TUTELA MARGINE
  // ==========================================================================
  {
    code: 'T046',
    name: 'F10.1 Taglio Tecnico — Affidabilità Installativa & Margine',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture dirette per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimo d’ordine, tutelando qualità e margine operativo anche con un’agevolazione d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del catalogo con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T047',
    name: 'F10.2 Taglio Tecnico — Materiali Certificati & Pronti a Stock',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Materiali certificati per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer realtà qualificate come {COMPANY_BODY_SHORT} {LOC_PHRASE}, forniamo {PRODOTTI_MIRATI} [ZERO_MINIMO_ORDINE], con piena conformità normativa, prezzi netti e un’agevolazione sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T048',
    name: 'F10.3 Taglio Tecnico — Affidabilità sul Campo & Filiera Corta',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con affidabilità garantita, prezzi netti chiari e uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del catalogo riservato?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T049',
    name: 'F10.4 Taglio Tecnico — Tenuta del Budget & Qualità Garantita',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture garantite per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI}, con qualità certificata, quotazioni nette e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T050',
    name: 'F10.5 Taglio Tecnico — Marchi Specializzati ad Alta Resa',
    angleGroup: 'Gamma_Tecnica_Completa',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Marchi selezionati per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimo d’ordine, difendendo il margine operativo con prezzi netti chiari e un’agevolazione d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta un estratto sintetico del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 11 (T051-T055) — ESTRATTO CATALISTINO RISERVATO PER REPARTO
  // ==========================================================================
  {
    code: 'T051',
    name: 'F11.1 Estratto Listino — Selezione Mirata coi Prezzi Netti',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Selezione B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer {COMPANY_BODY_SHORT} {LOC_PHRASE}, mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI}, per i quali abbiamo preparato [IL_CATALISTINO_PDF] abbinato a un’agevolazione sul primo acquisto.\n\n{SE_FA_COMODO}, posso {INVIARE_PRON} qui in risposta il documento per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T052',
    name: 'F11.2 Estratto Listino — Confronto Immediato Listino e Netto',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni chiare per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nmi chiamo {AGENT_NAME} e seguo il reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le realtà del {POSS_M} comparto attive {LOC_PHRASE}, forniamo senza minimo d’ordine {PRODOTTI_MIRATI}, indicando nel prospetto prezzo ufficiale e netto riservato, con un’agevolazione sul primo acquisto.\n\n{SE_FA_COMODO}, posso {GIRARE_PRON} qui in risposta un estratto del listino per dare un’occhiata?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T053',
    name: 'F11.3 Estratto Listino — Articoli Più Usati Pronti da Sfogliare',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Gamma prodotti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo in pronta consegna a magazzino {PRODOTTI_MIRATI}, senza minimo d’ordine e con un’agevolazione sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T054',
    name: 'F11.4 Estratto Listino — Prospetto Veloce da Consultare',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le esigenze operative {COMP_REF_DI} {LOC_PHRASE}, mettiamo a disposizione in pronta consegna a magazzino e senza soglie minime {PRODOTTI_MIRATI}, a prezzi netti chiari e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T055',
    name: 'F11.5 Estratto Listino — Invio Rapido Senza Impegno',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI}, con consegne rapide e un’agevolazione d’ingresso.\n\nPosso {LASCIARE_PRON} qui in risposta un riepilogo dei prezzi netti per un confronto diretto?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 12 (T056-T060) — SECONDO FORNITORE DIRETTO ACCANTO AGLI ABITUALI
  // ==========================================================================
  {
    code: 'T056',
    name: 'F12.1 Secondo Fornitore — Parametro Concreto sui Prezzi',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Fornitore alternativo per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer {COMPANY_BODY_SHORT} {LOC_PHRASE}, affiancare ai riferimenti abituali un interlocutore senza soglie minime permette di reperire con rapidità {PRODOTTI_MIRATI}, a prezzi netti e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T057',
    name: 'F12.2 Secondo Fornitore — Difesa dei Margini Operativi',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Secondo fornitore per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nmi chiamo {AGENT_NAME} e seguo il reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nCon {COMPANY_BODY_SHORT} {LOC_PHRASE} operiamo volentieri in affiancamento ai canali abituali, trattando senza minimo d’ordine {PRODOTTI_MIRATI} a prezzi netti e con un’agevolazione sul primo acquisto.\n\n{SE_FA_COMODO}, posso {GIRARE_PRON} qui in risposta un estratto del nostro listino?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T058',
    name: 'F12.3 Secondo Fornitore — Zero Esclusive & Massima Libertà',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Canale flessibile per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nCon {COMPANY_BODY_SHORT} {LOC_PHRASE} siamo disponibili a collaborare senza obblighi né soglie minime, fornendo {PRODOTTI_MIRATI} a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T059',
    name: 'F12.4 Secondo Fornitore — Appoggio Veloce per Urgenze e Scorte',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne rapide per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: sulle urgenze trattiamo senza minimo d’ordine {PRODOTTI_MIRATI}, a prezzi netti e con uno sconto sul primo acquisto.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del listino per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T060',
    name: 'F12.5 Secondo Fornitore — Alternativa Snella sui Materiali Ricorrenti',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer alleggerire i {POSS_MP} costi dei materiali di uso ricorrente {LOC_PHRASE}, trattiamo a prezzi netti {PRODOTTI_MIRATI} [ZERO_MINIMO_ORDINE] e [IN_PRONTA_CONSEGNA], con un’agevolazione sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 13 (T061-T065) — UNICO INTERLOCUTORE SUI REPARTI CHIAVE
  // ==========================================================================
  {
    code: 'T061',
    name: 'F13.1 Reparti Chiave — Unica Spedizione Senza Minimi',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Spedizione unica per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: raggruppiamo in una sola fornitura {PRODOTTI_MIRATI} senza minimi d’ordine, a prezzi netti e con uno sconto d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto sintetico del nostro catalogo?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T062',
    name: 'F13.2 Reparti Chiave — Meno Fornitori Dispersivi & Più Margine',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Linee dirette per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer snellire gli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, copriamo senza soglie minime {PRODOTTI_MIRATI} a quotazioni nette competitive e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T063',
    name: 'F13.3 Reparti Chiave — Copertura Quotidiana Pronta a Partire',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Scorte B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: rendiamo disponibili senza minimi d’ordine {PRODOTTI_MIRATI} a magazzino, con condizioni chiare e uno sconto d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T064',
    name: 'F13.4 Reparti Chiave — Selezione Marchi & Prezzi Finiti',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Marchi diretti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le realtà del {POSS_M} comparto attive {LOC_PHRASE}, riuniamo in un unico fornitore {PRODOTTI_MIRATI} [ZERO_MINIMO_ORDINE], a quotazioni nette chiare e con uno sconto sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T065',
    name: 'F13.5 Reparti Chiave — Gestione Accentrata & Spedizione Rapida',
    angleGroup: 'Catalogo_Illustrativo_PDF',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Assortimento completo per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimo d’ordine, con spedizioni tracciate in tutta Italia e un’agevolazione d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un prospetto sintetico con i prezzi netti dedicati?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 14 (T066-T070) — CONSEGNE FLESSIBILI & COLLI FRAZIONATI
  // ==========================================================================
  {
    code: 'T066',
    name: 'F14.1 Logistica Snella — Scarico in Sede o a Destinazione',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne flessibili per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le esigenze operative {COMP_REF_DI} {LOC_PHRASE}, spediamo {PRODOTTI_MIRATI} senza soglie minime, con recapito in sede o presso l’indirizzo indicato, prezzi netti e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T067',
    name: 'F14.2 Logistica Snella — Colli Frazionati Senza Immobilizzare Scorte',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture agili per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: spediamo {PRODOTTI_MIRATI} anche a colli frazionati senza minimi d’ordine, con consegna rapida e uno sconto d’ingresso.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del catalogo con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T068',
    name: 'F14.3 Logistica Snella — Centro Logistico & Giacenze Reali',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Spedizioni rapide per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nDal nostro centro logistico riforniamo direttamente {COMPANY_BODY_SHORT} {LOC_PHRASE}, coprendo {PRODOTTI_MIRATI} senza soglie minime, a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T069',
    name: 'F14.4 Logistica Snella — Ordini Calibrati sul Fabbisogno Reale',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne dirette per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo {PRODOTTI_MIRATI} senza minimi d’ordine, con recapito rapido in sede o all’indirizzo indicato e uno sconto d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta un prospetto sintetico con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T070',
    name: 'F14.5 Logistica Snella — Spedizione Tracciata & Prezzo Netto Subito',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSul fabbisogno corrente {COMP_REF_DI} {LOC_PHRASE}, uniamo [STOCK_REALE] e prezzi netti diretti per {PRODOTTI_MIRATI}, senza alcuna soglia minima e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 15 (T071-T075) — RIFERIMENTO DIRETTO PER PROSSIMI ACQUISTI
  // ==========================================================================
  {
    code: 'T071',
    name: 'F15.1 Riferimento Acquisti — Contatto Utile da Tenere a Portata',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Contatto diretto per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer i prossimi approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, mettiamo a disposizione senza soglie minime {PRODOTTI_MIRATI} a quotazioni nette chiare, con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T072',
    name: 'F15.2 Riferimento Acquisti — Confronto Senza Scadenze',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimo d’ordine né scadenze, a quotazioni nette e con un’agevolazione sul primo acquisto.\n\nPosso {LASCIARE_PRON} qui una scheda sintetica dei prezzi per i prossimi confronti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T073',
    name: 'F15.3 Riferimento Acquisti — Canale Pratico per Preventivi Futuri',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Supporto forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nIn vista dei {POSS_MP} prossimi fabbisogni {LOC_PHRASE}, teniamo senza soglie minime {PRODOTTI_MIRATI} [IN_PRONTA_CONSEGNA], abbinando quotazioni nette e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T074',
    name: 'F15.4 Riferimento Acquisti — Listino Diretto per Operatori del Settore',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni dirette per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con prezzi netti trasparenti e un’agevolazione sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto sintetico del nostro listino per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T075',
    name: 'F15.5 Riferimento Acquisti — Filo Diretto per Scorte e Urgenze',
    angleGroup: 'Fornitore_Alternativo',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_APPROCCIO_SOFT] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer le forniture correnti {COMP_REF_DI} {LOC_PHRASE}, spediamo senza quantitativi minimi {PRODOTTI_MIRATI} con filiera corta, prezzi netti chiari e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 16 (T076-T080) — SCENARIO CONCRETO DI GESTIONE O BANCO
  // ==========================================================================
  {
    code: 'T076',
    name: 'F16.1 Scenario Reale — Difesa del Margine Quotidiano',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Tutela margini per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nNegli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, evitare scorte forzate sostiene la redditività: proponiamo senza soglie minime {PRODOTTI_MIRATI} a quotazioni nette, con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T077',
    name: 'F16.2 Scenario Reale — Linee Professionali Non Inflazionate',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Marchi selezionati per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con linee non inflazionate al dettaglio e un’agevolazione sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del catalogo con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T078',
    name: 'F16.3 Scenario Reale — Più Competitività nei Preventivi',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Costi forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} e {PRON_IND} scrivo da Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nNegli approvvigionamenti ricorrenti {COMP_REF_DI} {LOC_PHRASE}, contare su prezzi netti chiari per {PRODOTTI_MIRATI} fa la differenza: spediamo senza soglie minime e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T079',
    name: 'F16.4 Scenario Reale — Taglio dei Ricarichi Intermedi',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, tagliando gli intermediari con prezzi netti e uno sconto sul primo acquisto.\n\nPosso {INVIARE_PRON} qui in risposta un estratto del catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T080',
    name: 'F16.5 Scenario Reale — Continuità e Rapidità sul Campo',
    angleGroup: 'Presentazione_Fornitore',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Spedizioni celeri per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer affiancare l’operatività {COMP_REF_DI} {LOC_PHRASE}, teniamo [IN_PRONTA_CONSEGNA] {PRODOTTI_MIRATI}, senza quantitativi minimi, a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 17 (T081-T085) — SINTESI ESSENZIALE DA SMARTPHONE
  // ==========================================================================
  {
    code: 'T081',
    name: 'F17.1 Sintesi Smartphone — Diretta al Punto in Poche Righe',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Parametri B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, affianchiamo senza minimi d’ordine le forniture di {PRODOTTI_MIRATI} con merce pronta in magazzino, prezzi netti e uno sconto sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T082',
    name: 'F17.2 Sintesi Smartphone — Prodotti Mirati & Zero Vincoli',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta riservata per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con consegna rapida e uno sconto d’ingresso.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T083',
    name: 'F17.3 Sintesi Smartphone — Rapida da Leggere Ovunque',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni riservate per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nA supporto {COMP_REF_DI} {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI} a condizioni competitive, con un canale diretto e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T084',
    name: 'F17.4 Sintesi Smartphone — Chiarezza Prezzi & Consegna Diretta',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Condizioni chiare per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con recapito rapido in sede o al cliente e uno sconto d’ingresso.\n\nPosso {LASCIARE_PRON} qui un estratto del listino con i prezzi netti?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T085',
    name: 'F17.5 Sintesi Smartphone — Confronto Immediato Senza Impegno',
    angleGroup: 'Nota_Conoscitiva_Breve',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta B2B per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti operativi della {POSS_F} attività {LOC_PHRASE}, forniamo senza soglie minime {PRODOTTI_MIRATI} con [STOCK_REALE], prezzi netti e un’agevolazione sul primo ordine.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 18 (T086-T090) — GIACENZE REALI & ZERO ATTESE
  // ==========================================================================
  {
    code: 'T086',
    name: 'F18.1 Giacenze Reali — Merce Pronta & Preventivi Veloci',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Pronta consegna per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo {PRODOTTI_MIRATI} senza minimo d’ordine, con scorte reali nel nostro magazzino, quotazioni nette e uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui in risposta un estratto del catalogo generale?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T087',
    name: 'F18.2 Giacenze Reali — Partenza Rapida & Conformità Garantita',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Forniture certificate per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nmi chiamo {AGENT_NAME} e seguo il reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nA supporto {COMP_REF_DI} {LOC_PHRASE}, spediamo senza soglie minime {PRODOTTI_MIRATI}, con conformità normativa, pronta disponibilità e [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T088',
    name: 'F18.3 Giacenze Reali — Stock Allineato & Assistenza Diretta',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Listino riservato per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo senza minimi d’ordine {PRODOTTI_MIRATI}, con [STOCK_REALE], prezzi netti in fattura e uno sconto sul primo acquisto.\n\nPosso {MANDARE_PRON} qui un estratto sintetico delle condizioni?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T089',
    name: 'F18.4 Giacenze Reali — Copertura Nazionale & Zero Formalità',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Consegne tracciate per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nForniamo alle realtà del {POSS_M} settore attive {LOC_PHRASE} {PRODOTTI_MIRATI}, con corriere espresso in tutta Italia, assenza di minimo d’ordine, prezzi netti e un’agevolazione sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T090',
    name: 'F18.5 Giacenze Reali — Controllo Immediato di Prezzi e Disponibilità',
    angleGroup: 'Supporto_Aziende_Territorio',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Stock pronto per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo {PRODOTTI_MIRATI} senza minimi d’ordine, con disponibilità a magazzino, quotazioni nette e uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui un estratto del listino per una verifica veloce?\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 19 (T091-T095) — LISTINI OSCURATI AI PRIVATI & MARGINE PROTETTO
  // ==========================================================================
  {
    code: 'T091',
    name: 'F19.1 Margine Protetto — Listini Riservati Oscurati al Pubblico',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Quotazioni protette per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nOscuriamo i listini al pubblico privato a tutela {COMP_REF_DI} {LOC_PHRASE}, fornendo senza soglie minime {PRODOTTI_MIRATI} a prezzi netti da filiera corta e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T092',
    name: 'F19.2 Margine Protetto — Prezzi Netti Stabili & Agevolazione Iniziale',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Prezzi protetti per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con listini chiusi ai privati, stock pronto e uno sconto sul primo acquisto.\n\nPosso {INVIARE_PRON} qui un estratto del catalogo per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T093',
    name: 'F19.3 Margine Protetto — Canale Puro B2B Senza Concorrenza al Dettaglio',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Circuito protetto per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME}, del reparto B2B di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer tutelare la {POSS_F} competitività {LOC_PHRASE}, forniamo a listini oscurati al dettaglio e senza soglie minime {PRODOTTI_MIRATI}, a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T094',
    name: 'F19.4 Margine Protetto — Confronto Codice per Codice sui Netti',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Verifica condizioni per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: proponiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con giacenze reali a portale, quotazioni nette e uno sconto sul primo acquisto.\n\nPosso {GIRARE_PRON} qui un estratto del listino da valutare [AVVERBIO_LIBERAMENTE]?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T095',
    name: 'F19.5 Margine Protetto — Ottimizzazione Costi di Approvvigionamento',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_RAPIDITA] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nCon la nostra filiera corta e senza minimi d’ordine su {PRODOTTI_MIRATI}, affianchiamo {COMPANY_BODY_SHORT} {LOC_PHRASE} per ottimizzare i costi di approvvigionamento a prezzi netti, con un’agevolazione sul primo acquisto.\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },

  // ==========================================================================
  // FAMIGLIA 20 (T096-T100) — PRESIDIO TERRITORIALE & PROVA SENZA VINCOLI
  // ==========================================================================
  {
    code: 'T096',
    name: 'F20.1 Territoriale — Servizio Diretto per il Comparto Locale',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Supporto forniture per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nServendo con continuità le realtà del {POSS_M} settore {LOC_PHRASE}, proponiamo senza soglie minime {PRODOTTI_MIRATI} a quotazioni nette da filiera corta, con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T097',
    name: 'F20.2 Territoriale — Nota Diretta per Realtà Locali',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_TIPO_DOC] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: trattiamo senza minimi d’ordine {PRODOTTI_MIRATI}, con scorte pronte a magazzino, quotazioni nette e un’agevolazione d’ingresso.\n\nPosso {INVIARE_PRON} qui in risposta una scheda riepilogativa dei prezzi per un confronto?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T098',
    name: 'F20.3 Territoriale — Daniele Savoia per le Aziende del Territorio',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Offerta riservata per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nSeguendo diverse realtà {LOC_PHRASE} dello stesso comparto {COMP_REF_DI}, {PRON_IND} propongo senza soglie minime {PRODOTTI_MIRATI}, a quotazioni nette chiare e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T099',
    name: 'F20.4 Territoriale — Spedizioni Tracciate & Prova Senza Impegno',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: '[OGG_FORMULA_PROMO] per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\n{FRASE_AGGANCIO_BREVE}: forniamo senza minimi d’ordine {PRODOTTI_MIRATI}, con spedizioni rapide e uno sconto sul primo acquisto.\n\nPosso {MANDARE_PRON} qui in risposta un estratto del listino per un confronto sui prezzi?\n\n[SALUTO_CHIUSURA]',
  },
  {
    code: 'T100',
    name: 'F20.5 Territoriale — Disponibilità Pronta per Acquisti e Progetti',
    angleGroup: 'Sconto_Benvenuto_Prova',
    targetCategory: 'ALL',
    htmlLayoutVariant: 'plain_personal',
    subjectTemplate: 'Assortimento pronto per {COMPANY_SHORT}',
    bodyTemplate:
      '{SALUTO_MODERNO}\n\nsono {AGENT_NAME} di Izzo Distribuzione S.r.l., {MICRO_PRESENTAZIONE_IZZO}.\n\nPer gli approvvigionamenti operativi {COMP_REF_DI} {LOC_PHRASE}, rendiamo disponibili a stock e senza soglie minime {PRODOTTI_MIRATI}, a quotazioni nette e con [IL_DOPPIO_SCONTO].\n\n{DOMANDA_FINALE_BREVE}\n\n[SALUTO_CHIUSURA]',
  },
];
