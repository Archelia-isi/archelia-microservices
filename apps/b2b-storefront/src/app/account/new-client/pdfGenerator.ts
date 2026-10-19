export interface CreatedClientPdfData {
  zucchettiCode: string;
  ragioneSociale: string;
  formaGiuridica: string;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  localita: string;
  provincia: string;
  telefono: string;
  cellulare: string;
  email: string;
  pec: string;
  codiceDestinatario: string;
  categoriaCommerciale: string;
  scontoBase: number;
  agente: string;
  isElmarkCustomer?: boolean;
  elmarkDiscounts?: Record<string, number>;
  username: string;
  tempPassword: string;
  createdAt: string;
}

function escapePdfText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti per compatibilità standard Type1 Helvetica WinAnsi
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Genera un file PDF A4 valido (standard PDF 1.4) con il riepilogo anagrafica Zucchetti
 * e le credenziali di accesso al Portale B2B Izzo Distribuzione, e ne avvia il download automatico.
 */
export function downloadClientCredentialsPdf(client: CreatedClientPdfData) {
  const lines: string[] = [];

  // Sfondo Header Nero
  lines.push('0.08 0.08 0.08 rg');
  lines.push('40 745 515 65 re f');

  // Titolo Header Bianco
  lines.push('1 1 1 RG 1 1 1 rg');
  lines.push('BT /F2 18 Tf 58 782 Td (IZZO DISTRIBUZIONE B2B) Tj ET');
  lines.push('0.85 0.85 0.85 rg');
  lines.push(
    `BT /F1 10 Tf 58 762 Td (SCHEDA ANAGRAFICA CLIENTE ZUCCHETTI & CREDENZIALI PORTALE - ${escapePdfText(
      client.createdAt
    )}) Tj ET`
  );

  // Box Codice Cliente Zucchetti in alto
  lines.push('0.96 0.98 0.96 rg');
  lines.push('0.13 0.55 0.25 RG 1.2 w');
  lines.push('40 680 515 50 re B');

  lines.push('0.10 0.45 0.20 rg');
  lines.push('BT /F2 10 Tf 58 710 Td (CODICE CLIENTE ZUCCHETTI ASSEGNATO \\(IZZO DISTRIBUZIONE\\)) Tj ET');
  lines.push('0.05 0.05 0.05 rg');
  lines.push(`BT /F2 18 Tf 58 690 Td (${escapePdfText(client.zucchettiCode)}) Tj ET`);

  lines.push('0.25 0.25 0.25 rg');
  lines.push(
    `BT /F2 11 Tf 230 708 Td (Categoria: ${escapePdfText(client.categoriaCommerciale)} \\(Sconto base ${
      client.scontoBase
    }%\\)) Tj ET`
  );
  lines.push(`BT /F1 10 Tf 230 692 Td (Agente Associato: ${escapePdfText(client.agente)}) Tj ET`);

  // Sezione 1: Dati Anagrafici e Fiscali
  lines.push('0.08 0.08 0.08 rg');
  lines.push('BT /F2 13 Tf 40 652 Td (1. DATI ANAGRAFICI E FISCALI CLIENTE) Tj ET');
  lines.push('0.80 0.80 0.80 RG 0.8 w');
  lines.push('40 645 m 555 645 l S');

  const elmarkRowText = client.isElmarkCustomer
    ? 'Abilitato (Sconti Standard: E1 20%, L 20%, E2 5%, C 5%, F 5%)'
    : 'Non abilitato';

  const rows: Array<[string, string]> = [
    ['Ragione Sociale:', `${client.ragioneSociale} (${client.formaGiuridica})`],
    ['Partita IVA / Cod. Fiscale:', `P.IVA: ${client.partitaIva}   -   C.F.: ${client.codiceFiscale}`],
    ['Indirizzo Sede Legale:', `${client.indirizzo} - ${client.cap} ${client.localita} (${client.provincia})`],
    ['Telefono / Cellulare:', `Tel: ${client.telefono || '-'}   /   Cell: ${client.cellulare || '-'}`],
    ['E-mail Principale:', client.email],
    ['Fatturazione Elettronica:', `Cod. Destinatario SDI: ${client.codiceDestinatario || '0000000'}   -   PEC: ${client.pec || '-'}`],
    ['Negozio Elmark:', elmarkRowText],
    ['Impostazioni Contabili ERP:', 'Mastro: 01030201 (CLIENTI)   -   Cat. Contabile: CLIG (CLIENTI GENERICI)   -   Partite: SI'],
  ];

  let y = 622;
  for (const [label, value] of rows) {
    lines.push('0.35 0.35 0.35 rg');
    lines.push(`BT /F2 10 Tf 48 ${y} Td (${escapePdfText(label)}) Tj ET`);
    lines.push('0.05 0.05 0.05 rg');
    lines.push(`BT /F1 10 Tf 200 ${y} Td (${escapePdfText(value.substring(0, 72))}) Tj ET`);
    lines.push('0.92 0.92 0.92 RG 0.5 w');
    lines.push(`40 ${y - 8} m 555 ${y - 8} l S`);
    y -= 26;
  }

  // Sezione 2: Box Credenziali Portale B2B
  const boxTop = y - 15;
  const boxHeight = 145;
  const boxBottom = boxTop - boxHeight;

  lines.push('0.99 0.97 0.92 rg');
  lines.push('0.85 0.55 0.10 RG 1.5 w');
  lines.push(`40 ${boxBottom} 515 ${boxHeight} re B`);

  lines.push('0.65 0.35 0.02 rg');
  lines.push(`BT /F2 13 Tf 58 ${boxTop - 26} Td (2. CREDENZIALI DI ACCESSO AL PORTALE B2B) Tj ET`);

  lines.push('0.20 0.20 0.20 rg');
  lines.push(
    `BT /F1 10 Tf 58 ${boxTop - 46} Td (Consegna queste credenziali al cliente per effettuare il primo accesso all'area riservata B2B:) Tj ET`
  );

  lines.push('0.05 0.05 0.05 rg');
  lines.push(`BT /F2 11 Tf 58 ${boxTop - 74} Td (Username:) Tj ET`);
  lines.push(`BT /F2 14 Tf 200 ${boxTop - 74} Td (${escapePdfText(client.username)}) Tj ET`);

  lines.push(`BT /F2 11 Tf 58 ${boxTop - 102} Td (Password Temporanea:) Tj ET`);
  lines.push(`BT /F2 14 Tf 200 ${boxTop - 102} Td (${escapePdfText(client.tempPassword)}) Tj ET`);

  lines.push('0.40 0.40 0.40 rg');
  lines.push(
    `BT /F1 9 Tf 58 ${boxTop - 128} Td (Nota: Al primo login il sistema chiedera' automaticamente al cliente di impostare una password personale.) Tj ET`
  );

  // Footer
  lines.push('0.55 0.55 0.55 rg');
  lines.push('BT /F1 8 Tf 40 45 Td (Documento generato automaticamente dal Portale Agenti B2B Izzo Distribuzione.) Tj ET');

  const contentStream = lines.join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n'
  );
  objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = client.ragioneSociale.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  link.href = url;
  link.download = `Scheda_Cliente_${client.zucchettiCode}_${safeName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
