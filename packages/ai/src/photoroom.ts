import { logger, env } from '@archelia/core';

const PHOTOROOM_API_URL = 'https://image-api.photoroom.com/v2/edit';

/**
 * Invia l'immagine a Photoroom per rimuovere lo sfondo originale
 * e posizionare l'oggetto in un nuovo ambiente generato dall'IA.
 * Questa API (V2 Edit) è perfetta per formati panoramici esotici in quanto
 * genera l'ambiente "su misura" per le dimensioni fornite.
 * 
 * @param imageUrl URL dell'immagine originale su Cloudinary (o locale)
 * @param contextPrompt Il prompt in inglese per l'ambiente (generato da Gemini)
 * @param width Larghezza finale esatta desiderata in pixel
 * @param height Altezza finale esatta desiderata in pixel
 * @returns ArrayBuffer dell'immagine elaborata da Photoroom
 */
export async function generateProductBackground(
  imageUrl: string, 
  contextPrompt: string, 
  width?: number, 
  height?: number
): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    throw new Error('PHOTOROOM_API_KEY non configurata nel server (.env)');
  }

  const outputW = width || 1080;
  const outputH = height || 1080;
  logger.info(`[Photoroom] Avvio V2 Edit per URL [${imageUrl}] | Dims: ${outputW}x${outputH} | Prompt: "${contextPrompt.slice(0, 50)}..."`);

  // Photoroom V2 Edit API si aspetta una form-data
  const form = new FormData();
  form.append('imageUrl', imageUrl);
  
  // Istruiamo l'API a usare un background generato dall'intelligenza
  form.append('background.prompt', contextPrompt);
  
  // Padding standard per non tagliare bordi del prodotto ritagliato
  form.append('padding', '0.1'); 
  
  // Fondamentale: dimensioni personalizzate (es. 1920x400)
  form.append('outputSize', `${outputW}x${outputH}`);

  try {
    logger.info(`[Photoroom] Chiamata API in corso...`);
    const response = await fetch(PHOTOROOM_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        // FormData gestisce automaticamente il Content-Type (boundary)
      },
      body: form
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Errore API Photoroom HTTP ${response.status}: ${errText}`);
      throw new Error(`Photoroom API Error: ${response.status} - ${errText}`);
    }

    // Le API grafiche restituiscono direttamente il file binario
    const buffer = await response.arrayBuffer();
    logger.info(`[Photoroom] Generazione completata con successo (${buffer.byteLength} bytes)`);
    return Buffer.from(buffer);
    
  } catch (error) {
    logger.error(`Errore di rete o elaborazione con Photoroom: ${error}`);
    throw error;
  }
}
