import { logger, env } from '@archelia/core';

export class Phase2Vision {
  /**
   * Analizza l'immagine del prodotto per estrarre dettagli estetici e fisici
   */
  static async run(elmarkCode: string, imageUrl: string) {
    logger.info(`[Phase 2] Avvio analisi visiva per ${elmarkCode} (URL: ${imageUrl})`);
    
    // Import dinamico per supportare i pacchetti nativi ESM
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    if (!imageUrl) {
      logger.warn(`[Phase 2] Immagine mancante per ${elmarkCode}. Ritorno default.`);
      return { visualStyle: 'Sconosciuto', materials: [], aestheticDetails: 'Nessuna immagine fornita.' };
    }

    try {
      // 1. Fetch immagine e converti in base64
      const responseImg = await fetch(imageUrl);
      const arrayBuffer = await responseImg.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      const mimeType = responseImg.headers.get('content-type') || 'image/jpeg';

      const prompt = `Analizza questa immagine di un prodotto di illuminazione o materiale elettrico.
Descrivi:
1. Lo stile visivo (es. Moderno, Classico, Industriale, Tecnico)
2. I materiali visibili (es. Metallo, Plastica, Vetro)
3. I dettagli estetici più importanti che un acquirente vorrebbe sapere (massimo 2 frasi).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          prompt
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualStyle: { type: Type.STRING, description: "Stile visivo predominante" },
              materials: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Elenco dei materiali" 
              },
              aestheticDetails: { type: Type.STRING, description: "Breve descrizione estetica" }
            },
            required: ["visualStyle", "materials", "aestheticDetails"]
          }
        }
      });

      if (!response.text) throw new Error("Gemini Vision nessun output");
      const result = JSON.parse(response.text);
      
      logger.info(`[Phase 2] Completato per ${elmarkCode} - Result: ${JSON.stringify(result)}`);
      return result;

    } catch (error: any) {
      logger.error(`[Phase 2] Fallito per ${elmarkCode}: ${error.message}`);
      return { visualStyle: 'Analisi fallita', materials: [], aestheticDetails: error.message };
    }
  }
}

