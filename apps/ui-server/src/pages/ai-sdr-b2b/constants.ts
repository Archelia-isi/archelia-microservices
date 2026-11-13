export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

/**
 * 11 Cluster Canonici DB (allineati 1:1 con @archelia/sdr-database CANONICAL_B2B_CLUSTERS)
 */
export const SEARCH_CATEGORIES = [
  { value: 'ALL', label: '🚀 Tutte le 11 tipologie B2B (Scansione Completa)' },
  { value: 'Installatore_Civile', label: '⚡ Installatori Elettrici & Impiantisti (IST 40%)' },
  { value: 'Impresa_Edile', label: '🏗️ Imprese Edili, Costruttori & General Contractor (IST 40%)' },
  { value: 'Rivendita_Edile', label: '🏪 Grossisti & Rivendite Materiale Elettrico/Edile (RIV 50%)' },
  { value: 'Termoidraulica_Clima', label: '❄️ Termoidraulica, Clima & HVAC (IST 40%)' },
  { value: 'Fotovoltaico_Rinnovabili', label: '☀️ Fotovoltaico & Energie Rinnovabili (IST 40%)' },
  { value: 'Sicurezza_Automazione', label: '🔒 Videosorveglianza, Antifurto & Domotica (IST 40%)' },
  { value: 'Architetto_Ingegnere', label: '📐 Studi Tecnici, Architetti & Progettisti (IST 40%)' },
  { value: 'Serramentista', label: '🚪 Serramentisti & Automazioni Infissi (IST 40%)' },
  { value: 'Quadrista', label: '⚙️ Quadristi & Automazione Industriale (IST 40%)' },
  { value: 'Ferramenta', label: '🧰 Ferramenta, Utensilerie & Bricolage (RIV 50%)' },
  { value: 'Illuminazione', label: '💡 Showroom Illuminotecnica & Design Luce (RIV 50%)' },
];

export const CANONICAL_CLUSTER_PILLS = [
  { value: 'ALL', label: '🌐 Tutti i Cluster', shortLabel: 'Tutti' },
  { value: 'Installatore_Civile', label: '⚡ Installatori Elettrici', shortLabel: 'Installatori' },
  { value: 'Impresa_Edile', label: '🏗️ Imprese Edili', shortLabel: 'Imprese Edili' },
  { value: 'Rivendita_Edile', label: '🏪 Rivendite B2B', shortLabel: 'Rivendite' },
  { value: 'Termoidraulica_Clima', label: '❄️ Termoidraulica & HVAC', shortLabel: 'Termoidraulica' },
  { value: 'Fotovoltaico_Rinnovabili', label: '☀️ Fotovoltaico', shortLabel: 'Fotovoltaico' },
  { value: 'Sicurezza_Automazione', label: '🔒 Sicurezza & Domotica', shortLabel: 'Sicurezza' },
  { value: 'Architetto_Ingegnere', label: '📐 Studi & Progettisti', shortLabel: 'Studi Tecnici' },
  { value: 'Serramentista', label: '🚪 Serramentisti', shortLabel: 'Serramentisti' },
  { value: 'Quadrista', label: '⚙️ Quadristi', shortLabel: 'Quadristi' },
  { value: 'Ferramenta', label: '🧰 Ferramenta', shortLabel: 'Ferramenta' },
  { value: 'Illuminazione', label: '💡 Illuminazione', shortLabel: 'Illuminazione' },
];

export const PIPELINE_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tutti gli Stati Pipeline' },
  { value: 'Nuovo', label: '🆕 Nuovo Lead' },
  { value: 'Pronto_Invio', label: '✅ Bozza Pronta per Invio' },
  { value: 'Contattato', label: '📨 Email Inviata' },
  { value: 'Catalogo_Aperto', label: '👀 Catalistino PDF Aperto' },
  { value: 'Loggato_Senza_Ordine', label: '🔥 Loggato Senza Ordine' },
  { value: 'Risposta_Ricevuta', label: '💬 Risposta Ricevuta (Kill-Switch)' },
  { value: 'Convertito', label: '🏆 Convertito (1° Ordine)' },
  { value: 'Pec_Scartata', label: '🛡️ PEC Scartata' },
  { value: 'Disiscritto', label: '⛔ Disiscritto / Bounce' },
];

export const ARUBA_B2B_DOMAINS = [
  'izzodistribuzioneb2b.it',
  'izzodistribuzioneb2b.com',
  'izzodistribuzione-b2b.it',
  'izzodistribuzione-b2b.com',
  'b2b-izzodistribuzione.it',
  'b2b-izzodistribuzione.com',
];

export const SPEED_GEAR_OPTIONS = [
  {
    id: 'prudente' as const,
    title: '🟢 Marcia 1 — Prudente',
    subtitle: '5 mail/casella = 300/giorno',
    detail: 'Ideale per avvio ultra-sicuro sui nuovi domini',
  },
  {
    id: 'intermedia' as const,
    title: '🔵 Marcia 2 — Intermedia',
    subtitle: '10 mail/casella = 600/giorno',
    detail: 'Velocità bilanciata per domini rodati',
  },
  {
    id: 'rampup_auto' as const,
    title: '🚀 Ramp-Up Auto 3 Settimane',
    subtitle: '5 → 10 → 15 mail/casella',
    detail: 'Scala automaticamente da 300 a 900 mail/giorno',
  },
  {
    id: 'regime_pieno' as const,
    title: '🔥 Marcia 3 — Regime Pieno',
    subtitle: '15 mail/casella = 900/giorno',
    detail: 'Piena potenza del pool da 60 caselle Aruba SSL',
  },
];

export const MASTER_AUDIT_SPECS_15 = [
  { code: 'V01', name: 'Ragione Sociale & Insegna', desc: 'Pulizia ragione sociale e rimozione caratteri anomali' },
  { code: 'V02', name: 'Tassonomia 11 Cluster B2B', desc: 'Mappatura univoca su cluster DB e listino IST 40% / RIV 50%' },
  { code: 'V03', name: 'Geolocalizzazione ISTAT', desc: 'Validazione Comune, Provincia (sigla) e Regione ufficiale ISTAT' },
  { code: 'V04', name: 'Checksum P.IVA Modulo-10', desc: 'Verifica algoritmica formale P.IVA italiana a 11 cifre + VIES' },
  { code: 'V05', name: 'Firewall Anti-PEC 4 Livelli', desc: 'Blocco categorico domini PEC camerali (Legalmail, ArubaPEC, ecc.)' },
  { code: 'V06', name: 'Verifica DNS MX Dominio', desc: 'Controllo record MX attivi sul dominio destinatario pre-invio' },
  { code: 'V07', name: 'Normalizzazione Telefoni', desc: 'Separazione fisso, mobile e WhatsApp Business cliccabile' },
  { code: 'V08', name: 'Deep-Web Sito Ufficiale', desc: 'Scansione homepage, contatti, chi-siamo e privacy policy' },
  { code: 'V09', name: 'Marchi & Certificazioni', desc: 'Rilevamento brand elettrici trattati e abilitazioni DM 37/08 / SOA' },
  { code: 'V10', name: 'Relazione 4 Quadranti', desc: 'Sintesi strategica Q1 Societario, Q2 Operativo, Q3 Digitale, Q4 Offerta' },
  { code: 'V11', name: 'Deduplicazione Multi-Chiave', desc: 'Controllo univocità su P.IVA, Email ordinaria, Telefono e Insegna+Città' },
  { code: 'V12', name: 'Esclusione Clienti Attivi', desc: 'Verifica incrociata con anagrafica clienti B2B già attivi a portale' },
  { code: 'V13', name: 'Coerenza Sconto ALL_2GG', desc: 'Allineamento sconto 1° acquisto (40+10 o 50+10) solo su Pronta Consegna 2gg' },
  { code: 'V14', name: 'Guardia Anti-Placeholder', desc: 'Blocco invio bozze con segnaposto non risolti o password assenti' },
  { code: 'V15', name: 'Conformità B2B & Opt-Out', desc: 'Informativa contatto B2B legittimo interesse + Kill-Switch automatico' },
];

export const ITALY_SVG_REGIONS: Array<{ name: string; d: string }> = [
  { name: "Valle d'Aosta", d: 'M 90 70 L 130 65 L 140 90 L 105 105 L 85 90 Z' },
  { name: 'Piemonte', d: 'M 85 90 L 140 90 L 165 80 L 175 145 L 140 185 L 100 195 L 75 145 Z' },
  { name: 'Liguria', d: 'M 95 195 L 140 185 L 200 195 L 210 215 L 170 210 L 105 205 Z' },
  { name: 'Lombardia', d: 'M 165 75 L 235 65 L 245 130 L 255 155 L 220 180 L 170 180 L 165 110 Z' },
  { name: 'Trentino-Alto Adige', d: 'M 235 55 L 305 45 L 300 110 L 250 115 L 240 80 Z' },
  { name: 'Veneto', d: 'M 255 120 L 320 100 L 335 145 L 335 185 L 275 190 L 250 155 Z' },
  { name: 'Friuli-Venezia Giulia', d: 'M 325 95 L 375 90 L 385 140 L 345 150 L 335 115 Z' },
  { name: 'Emilia-Romagna', d: 'M 175 185 L 275 185 L 340 190 L 370 240 L 265 240 L 210 205 Z' },
  { name: 'Toscana', d: 'M 205 215 L 270 220 L 295 260 L 285 330 L 220 310 L 205 240 Z' },
  { name: 'Marche', d: 'M 285 240 L 350 250 L 355 305 L 315 315 L 295 270 Z' },
  { name: 'Umbria', d: 'M 275 275 L 310 275 L 315 335 L 275 335 Z' },
  { name: 'Lazio', d: 'M 250 325 L 305 325 L 340 375 L 345 425 L 295 420 L 255 355 Z' },
  { name: 'Abruzzo', d: 'M 320 325 L 385 345 L 390 395 L 340 385 Z' },
  { name: 'Molise', d: 'M 370 385 L 420 390 L 415 425 L 365 420 Z' },
  { name: 'Campania', d: 'M 330 425 L 400 420 L 425 470 L 405 520 L 345 480 L 335 440 Z' },
  { name: 'Puglia', d: 'M 410 410 L 490 445 L 565 520 L 530 550 L 460 495 L 420 445 Z' },
  { name: 'Basilicata', d: 'M 415 475 L 470 480 L 465 540 L 425 530 Z' },
  { name: 'Calabria', d: 'M 425 535 L 470 545 L 460 625 L 410 655 L 405 615 L 425 565 Z' },
  { name: 'Sicilia', d: 'M 285 615 L 425 610 L 395 675 L 305 660 Z' },
  { name: 'Sardegna', d: 'M 90 330 L 155 330 L 150 470 L 85 465 Z' },
];

/**
 * Sanitizza HTML email lato client eliminando tag eseguibili e attributi on* / javascript:
 */
export function sanitizeEmailHtml(rawHtml?: string | null, fallbackText?: string | null): string {
  if (!rawHtml || !rawHtml.trim()) {
    const escaped = String(fallbackText || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    return `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 13.5px; line-height: 1.6;">${escaped}</div>`;
  }

  if (typeof DOMParser === 'undefined') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'form', 'meta', 'link', 'base'];
  forbiddenTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (
        (name === 'href' || name === 'src' || name === 'xlink:href') &&
        (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}
