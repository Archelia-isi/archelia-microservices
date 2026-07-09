import { logger, env } from '@archelia/core';
import Anthropic from '@anthropic-ai/sdk';

export class Phase3Copywriter {
  /**
   * Genera i testi commerciali e SEO parallelizzando le richieste per massimizzare la qualità.
   */
  static async run(elmarkCode: string, phase1Data: any, phase2Data: any, retries = 2, customInstructions?: string): Promise<any> {
    logger.info(`[Phase 3] Avvio copywriting parallelo (3A+3B) per ${elmarkCode} (retries left: ${retries})`);
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    
    // --- FASE 3A: TITOLI E SEO (Alta precisione, bassa temperatura) ---
    let prompt3A = `Sei un copywriter tecnico SEO esperto in materiale elettrico.
DATI TECNICI (Fase 1):
${JSON.stringify(phase1Data, null, 2)}
DATI VISIVI (Fase 2):
${JSON.stringify(phase2Data, null, 2)}

Fornisci in output unicamente un JSON con le seguenti chiavi:
{
  "technicalB2BTitle": "Titolo TECNICO B2B. MASSIMO ASSOLUTO 40 CARATTERI. È UNA REGOLA PERENTORIA. Nessun termine commerciale (vietati 'Novità', 'Acquista'). NON abbreviare parole fondamentali (es. scrivi 'Industriale' intero, non 'Ind.'). Se superi i 40 caratteri, ELIMINA i dettagli meno importanti. CONTA I CARATTERI!",
  "seoTitle": "Titolo SEO (max 70 car). Mix accattivante tra nome prodotto e caratteristica tecnica principale per attrarre clic B2B e B2C.",
  "metaDescription": "Meta description (max 160 car). Orientata al B2C, persuasiva. È SEVERAMENTE VIETATO iniziare con parole come 'Acquista', 'Compra', 'Scopri'. Fornisci subito valore descrivendo l'utilità pratica del prodotto.",
  "metaKeywords": ["keyword", "sinonimo_regionale (es. salvavita, frutto, placca, mammut, ciabatta)", "marca_famosa_competitor (es. Bticino, Vimar, Gewiss)"]
}`;

    if (customInstructions) {
      prompt3A += `\n\n!!! ATTENZIONE, ISTRUZIONE SPECIFICA DELL'UTENTE !!!\nL'utente ha fornito questa correzione/istruzione: "${customInstructions}".\nApplicala rigorosamente anche ai campi tecnici e SEO.\n`;
    }

    // --- FASE 3B: HTML COMMERCIALE (Alta creatività, alta temperatura) ---
    let prompt3B = `Sei un Copywriter B2C Esperto per E-Commerce di fascia alta (materiale elettrico/illuminazione).
DATI TECNICI (Fase 1):
${JSON.stringify(phase1Data, null, 2)}
DATI VISIVI (Fase 2):
${JSON.stringify(phase2Data, null, 2)}

REGOLE TASSATIVE PER L'HTML:
1. LUNGHEZZA: Descrizione ESTREMAMENTE LUNGA E DETTAGLIATA (almeno 500-600 parole). Approfondisci ogni singolo dato tecnico e ogni caso d'uso.
2. STRUTTURA:
   - Inizia con 2-3 paragrafi introduttivi discorsivi ed emozionali.
   - Inserisci OBBLIGATORIAMENTE DUE LISTE <ul> distinte (introdotte da tag <h3>):
     * La prima esplora in profondità i "Vantaggi Principali".
     * La seconda sviscera le "Specifiche Tecniche" e i dettagli costruttivi.
3. TRADUZIONE CODICI: Non stampare MAI codici grezzi. Se vedi "EK", scrivi "Elmark". Se vedi "ST", scrivi "Stellar". Colori "WH", "BK", "GR" devono diventare "Bianco", "Nero", "Grigio".
4. ESTETICA B2C: Usa emoji pertinenti (💡, ⚡, 🏠, ✨, 🛡️, 🌿) in modo strategico per rendere la lettura moderna. Usa il grassetto <strong> per evidenziare le parole chiave.
5. DIVIETI: Vietati tag <html>, <head>, <body>, <h1>, <h2>. Inizia da <h3> o <h4>. Vietate Call To Action fittizie. Non consigliare articoli correlati inesistenti. Parla SOLO di questo prodotto.

Fornisci in output unicamente un JSON con le seguenti chiavi:
{
  "commercialDescHtml": "Il markup HTML generato applicando rigorosamente tutte le regole."
}`;

    if (customInstructions) {
      prompt3B += `\n\n!!! ATTENZIONE, ISTRUZIONE SPECIFICA DELL'UTENTE !!!\nL'utente ha fornito questa correzione/istruzione: "${customInstructions}".\nApplicala rigorosamente anche ai testi commerciali e HTML.\n`;
    }

    // Funzione helper per parsare il JSON dai blocchi di test
    const parseJsonFromResponse = (res: any) => {
      let text = res.content[0].text;
      let cleanedText = text.replace(/```json/gi, '').replace(/```/g, '');
      const startIndex = cleanedText.indexOf('{');
      const endIndex = cleanedText.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        cleanedText = cleanedText.substring(startIndex, endIndex + 1);
      }
      return JSON.parse(cleanedText);
    };

    const run3A = async (attemptsLeft: number): Promise<any> => {
      try {
        const response3A = await Promise.race([
          anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 2000,
            temperature: 0.2, // Temperatura bassa: precisione matematica per i 40 caratteri
            messages: [{ role: 'user', content: prompt3A }]
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Anthropic 3A (90s)")), 90000))
        ]) as any;

        const result3A = parseJsonFromResponse(response3A);
        
        // VALIDAZIONE DEI CAMPI MANCANTI 3A
        const requiredFields = ['technicalB2BTitle', 'seoTitle', 'metaDescription', 'metaKeywords'];
        for (const f of requiredFields) {
          if (!result3A[f] || (Array.isArray(result3A[f]) && result3A[f].length === 0)) {
            throw new Error(`Manca il campo ${f} in Fase 3A`);
          }
        }

        // VALIDAZIONE DEI 40 CARATTERI
        if (result3A.technicalB2BTitle.length > 40) {
          if (attemptsLeft > 0) {
            throw new Error(`technicalB2BTitle supera i 40 caratteri (sono ${result3A.technicalB2BTitle.length}: "${result3A.technicalB2BTitle}")`);
          } else {
            logger.warn(`[Phase 3A] Limite 40 caratteri superato per ${elmarkCode} dopo i retry, accetto il testo per review manuale. Titolo: "${result3A.technicalB2BTitle}"`);
          }
        }

        return result3A;
      } catch (error: any) {
        if (attemptsLeft > 0) {
          logger.info(`[Phase 3A] Errore su ${elmarkCode} (${error.message}). Riprovo... tentativi rimasti: ${attemptsLeft - 1}`);
          return run3A(attemptsLeft - 1);
        }
        throw new Error(`Fallimento definitivo in Fase 3A: ${error.message}`);
      }
    };

    const run3B = async (attemptsLeft: number): Promise<any> => {
      try {
        const response3B = await Promise.race([
          anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 8000,
            temperature: 0.6, // Temperatura alta: creatività per l'HTML lungo
            messages: [{ role: 'user', content: prompt3B }]
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Anthropic 3B (120s)")), 120000))
        ]) as any;

        const result3B = parseJsonFromResponse(response3B);
        if (!result3B.commercialDescHtml) {
          throw new Error(`Manca il campo commercialDescHtml in Fase 3B`);
        }
        return result3B;
      } catch (error: any) {
        if (attemptsLeft > 0) {
          logger.info(`[Phase 3B] Errore su ${elmarkCode} (${error.message}). Riprovo... tentativi rimasti: ${attemptsLeft - 1}`);
          return run3B(attemptsLeft - 1);
        }
        throw new Error(`Fallimento definitivo in Fase 3B: ${error.message}`);
      }
    };

    try {
      // Esecuzione parallela delle due fasi AI con retry indipendenti
      const [result3A, result3B] = await Promise.all([
        run3A(retries),
        run3B(retries)
      ]);

      // FUSIONE DEI RISULTATI
      const finalResult = {
        technicalB2BTitle: result3A.technicalB2BTitle,
        seoTitle: result3A.seoTitle,
        metaDescription: result3A.metaDescription,
        metaKeywords: result3A.metaKeywords,
        commercialDescHtml: result3B.commercialDescHtml
      };

      logger.info(`[Phase 3] Completamento parallelo avvenuto per ${elmarkCode}`);
      return finalResult;

    } catch (error: any) {
      logger.error(`[Phase 3] Errore critico su ${elmarkCode}: ${error.message}`);
      throw new Error(`Fallimento definitivo in Fase 3: ${error.message}`);
    }
  }
}
