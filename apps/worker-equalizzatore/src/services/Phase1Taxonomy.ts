import { logger, env } from '@archelia/core';

export class Phase1Taxonomy {
  /**
   * Riceve i dati originali di un prodotto e restituisce la tassonomia corretta e i dati tecnici validati
   */
  static async run(elmarkCode: string, rawData: any) {
    logger.info(`[Phase 1] Avvio analisi tassonomica per ${elmarkCode}`);
    
    // Import dinamico per supportare i pacchetti nativi ESM
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const prompt = `Analizza il seguente prodotto dal catalogo Elmark.
Estrai il Gruppo, Famiglia e Categoria appropriati e crea un riepilogo dei dettagli tecnici principali.
Dati originali: ${JSON.stringify(rawData)}
Assicurati che la classificazione sia ottimale per e-commerce B2B/B2C (materiale elettrico/illuminazione).

REGOLE PER technicalDetails:
- Crea un dizionario chiave-valore con TUTTI i dettagli tecnici trovati (es. in 'descriptions', 'descr', 'name').
- ESTRAI SEMPRE le specifiche fisiche, elettriche (Voltaggio, Amperaggio, Potenza), dimensionali e i materiali.
- IMPORTANTE: In "technicalDetails" inserisci SOLO dati tecnici puri e sintetici (es. "450W", "IP65", "Rame", "3x4mm2"). MASSIMO 3-4 parole per valore. È SEVERAMENTE VIETATO inserire frasi lunghe, paragrafi o la voce "Descrizione".
- TRADUZIONE OBBLIGATORIA: Tutte le chiavi e i valori testuali DEVONO essere tradotti in ITALIANO.
- Le chiavi DEVONO essere standardizzate (es. usa SEMPRE "Grado di protezione" e non "Protezione IP" o "IP", usa "Tensione nominale", "Potenza", "Corrente nominale", "Colore", "Marca", "Modello"). Non inventare nomi in inglese.

DEVI RESTITUIRE ESCLUSIVAMENTE UN JSON VALIDO CON QUESTE ESATTE CHIAVI E FORMATO:
{
  "productGroup": "Nome Gruppo",
  "family": "Nome Famiglia",
  "category": "Nome Categoria",
  "technicalDetails": {
    "Potenza": "450W",
    "Grado di protezione": "IP65",
    "Tensione nominale": "230V"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (!response.text) {
      throw new Error("Gemini non ha restituito output per la Fase 1");
    }

    const result = JSON.parse(response.text);
    logger.info(`[Phase 1] Completato per ${elmarkCode} - Result: ${JSON.stringify(result)}`);
    
    return result;
  }
}

