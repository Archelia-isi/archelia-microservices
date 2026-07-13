import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@archelia/core';
import mjml2html from 'mjml';

let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  logger.warn('GEMINI_API_KEY non trovata. Il servizio AI testuale sarà disabilitato.');
}

/**
 * Genera il codice MJML puro di una mail sfruttando Gemini 2.5 Flash e lo compila in HTML.
 */
export async function generateMjmlEmail(prompt: string): Promise<{ mjml: string; html: string }> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY non configurata sul server.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `Sei un Senior Email Developer ed Esperto di Conversion Rate Optimization (CRO).
Il tuo compito è generare il codice sorgente MJML per campagne di Email Marketing di un e-commerce di successo.

REGOLE ASSOLUTE:
1. Devi generare ESCLUSIVAMENTE codice MJML puro e valido. Nessun markdown (es. niente \`\`\`mjml), niente spiegazioni. Solo codice che inizia con <mjml> e finisce con </mjml>.
2. Il design deve essere premium, moderno e reattivo (responsive). Usa <mj-style> per ritocchini CSS se necessario.
3. INSERIMENTO DINAMICO DATI (MAGIC TAGS): Devi ASSOLUTAMENTE utilizzare i seguenti tag testuali quando pertinente:
   - {{Nome}} -> Sostituito con il nome del cliente
   - {{LinkPagamento}} -> Sostituito con il link al carrello abbandonato
   - {{ProdottiDimenticati}} -> Sostituito con la griglia dei prodotti

OBIETTIVO DELLA CAMPAGNA:
"${prompt}"

Ricorda: rispondi SOLO ed ESCLUSIVAMENTE con il codice MJML.`;

    logger.info(`Generazione template Email MJML via Gemini avviata...`);
    
    const result = await model.generateContent(systemPrompt);
    let mjmlCode = result.response.text().trim();
    
    if (mjmlCode.startsWith('\`\`\`mjml')) mjmlCode = mjmlCode.substring(7);
    else if (mjmlCode.startsWith('\`\`\`xml')) mjmlCode = mjmlCode.substring(6);
    else if (mjmlCode.startsWith('\`\`\`')) mjmlCode = mjmlCode.substring(3);
    if (mjmlCode.endsWith('\`\`\`')) mjmlCode = mjmlCode.substring(0, mjmlCode.length - 3);
    
    mjmlCode = mjmlCode.trim();

    // Compila MJML in HTML per l'anteprima e per l'invio
    const htmlOutput = mjml2html(mjmlCode, { validationLevel: 'soft' });
    
    if (htmlOutput.errors.length > 0) {
      logger.warn(`L'IA ha generato MJML con piccoli errori di validazione:`, htmlOutput.errors);
    }

    return { 
      mjml: mjmlCode, 
      html: htmlOutput.html 
    };

  } catch (err: any) {
    logger.error(`Errore durante la generazione dell'email MJML: ${err.message}`);
    throw err;
  }
}
