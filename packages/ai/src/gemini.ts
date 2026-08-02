import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';
import { logger, env } from '@archelia/core';

// SDK per testo/slogan (funziona bene con API Key)
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  logger.warn('GEMINI_API_KEY non trovata. Il servizio AI testuale sarà disabilitato.');
}

/**
 * Genera uno slogan testuale d'impatto usando Gemini 2.5 Flash.
 */
export async function generateSlogan(productName: string, instructions?: string): Promise<string> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY non configurata sul server.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Sei un senior copywriter pubblicitario specializzato in e-commerce e advertising digitale.

PRODOTTO/CONTESTO: "${productName}"
${instructions ? `\nISTRUZIONI DEL CLIENTE: "${instructions}"` : ''}

COMPITO: Crea UNO slogan pubblicitario in ITALIANO che sia:
- Breve e memorabile (3-8 parole massimo)
- Professionale e d'impatto — come quelli di brand premium (Nike, Apple, Amazon)
- Adatto a un banner pubblicitario e-commerce
- Che comunichi un beneficio chiaro o crei urgenza/desiderio
${instructions ? '- Che segua fedelmente le istruzioni del cliente' : '- Che valorizzi il prodotto con tono professionale'}

ESEMPI DI STILE:
- "Qualità senza compromessi, prezzo imbattibile."
- "Il meglio, adesso. -30% solo oggi."
- "Prestazioni professionali, prezzo accessibile."
- "Scegli l'eccellenza. Scegli ora."

REGOLE:
1. Restituisci SOLO lo slogan, niente altro
2. Niente virgolette intorno allo slogan
3. Usa punteggiatura efficace (punti, virgole) per il ritmo
4. Se il cliente menziona uno sconto (es. 30%), INCLUDILO nello slogan
5. Tono: professionale, sicuro, premium — mai banale o generico`;

    logger.info(`Richiesta slogan a Gemini per: ${productName}`);
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^["'«»]|["'«»]$/g, '').trim();

    return text;
  } catch (err) {
    logger.error(`Errore durante la generazione dello slogan con Gemini: ${err}`);
    throw err;
  }
}

/**
 * Genera Titolo o Descrizione per la Promozione (Shopify Metaobject).
 * Usa Gemini 2.5 Flash tramite l'API standard.
 */
export async function generatePromoCopy(
  copyType: 'titolo' | 'descrizione',
  tipo: string,
  target?: string,
  sconto?: number,
  contesto?: string
): Promise<string> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY non configurata sul server.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let basePrompt = `Sei un esperto copywriter e-commerce italiano. Devi scrivere un ${copyType === 'titolo' ? 'TITOLO BREVISSIMO' : 'TESTO COMMERCIALE'} per una promozione sul sito "Archelia" (Store Professionale e Materiale Tecnico).`;
    basePrompt += `\n- Meccanica Promozionale: ${tipo}`;
    if (sconto) basePrompt += `\n- Sconto Offerto: ${sconto}%`;
    if (target) {
      basePrompt += `\n- PRODOTTI O COLLEZIONE TARGET: "${target}". \nATTENZIONE CRITICA: È REQUISITO FONDAMENTALE E TASSATIVO CHE IL COPY PARLI ESCLUSIVAMENTE DI "${target}". È SEVERAMENTE VIETATO menzionare materiale elettrico o altri argomenti se il target è diverso!`;
    }
    if (contesto) basePrompt += `\n- Dettagli extra del cliente: ${contesto}`;

    if (copyType === 'titolo') {
      basePrompt += `\n\nCOMPITO: Scrivi UN SOLO TITOLO D'IMPATTO (massimo 4-6 parole). Non usare hashtag. \nIMPORTANTE: Il titolo deve essere incentrato su "${target ? target : 'tutto il catalogo'}" e includere lo sconto. (Esempio astratto d'ispirazione: "Speciale [Materia/Prodotto] -X%").`;
    } else {
      basePrompt += `\n\nCOMPITO: Scrivi UNA DESCRIZIONE PERSUASIVA E BREVE (massimo 2 frasi, 150-200 caratteri). Fai leva sull'urgenza o sul vantaggio economico del ${sconto || 'grande'}%. \nIL TESTO DEVE ESSERE COSTRUITO SUL TARGET SPECIFICO: "${target || 'prodotti selezionati'}". Nessun saluto iniziale e nessun hashtag.`;
    }

    basePrompt += `\n\nRestituisci ESCLUSIVAMENTE il copy puro, niente punteggiatura esterna tipo virgolette e niente commenti extra.`;

    logger.info(`Generazione copia Promozione [${copyType}] via Gemini...`);
    const result = await model.generateContent(basePrompt);
    let text = result.response.text().trim();
    text = text.replace(/^["'«»]|["'«»]$/g, '').trim();

    return text;
  } catch (err) {
    logger.error(`Errore durante la generazione copy promozione con Gemini: ${err}`);
    throw err;
  }
}

/**
 * Base prompt per BANNER PUBBLICITARI — focalizzato su grafica promozionale, non foto prodotto.
 */
const BANNER_BASE_PROMPT = `TIPO DI IMMAGINE: Banner pubblicitario promozionale per e-commerce.
Questa NON è una foto prodotto — è una GRAFICA PROMOZIONALE accattivante e d'impatto.

REQUISITI FONDAMENTALI:
- Banner pubblicitario con composizione grafica professionale
- Sfondo scenografico e coinvolgente (ambientazione, texture, gradienti, pattern astratti)
- Se ci sono prodotti, devono essere integrati nella scena promozionale, NON isolati su sfondo neutro
- Spazio vuoto strategico dove potrebbe essere sovrapposto testo/CTA successivamente
- Atmosfera vivace, dinamica ed emozionale che cattura l'attenzione
- Palette colori audace e coordinata (colori complementari, contrasti forti)
- Illuminazione cinematica o creativa (non studio flat)
- Nessun testo, logo, watermark sovrimposto — solo l'immagine grafica
- Alta risoluzione, colori vividi, dettagli nitidi, qualità professionale
- Stile moderno ispirato ai migliori banner di e-commerce (Amazon, Apple, Nike)`;

/**
 * Genera un singolo prompt ottimizzato per creare un BANNER PROMOZIONALE con Gemini.
 * Combina: base prompt banner + istruzioni utente + info prodotto opzionale.
 */
export async function generateBannerPrompt(
  userInstructions: string,
  productInfo?: { title?: string; description?: string }
): Promise<string> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY non configurata sul server.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const productContext = productInfo?.title
      ? `\nPRODOTTO DA INTEGRARE NEL BANNER (non una foto isolata, ma integrato nella scena):\n- Nome: "${productInfo.title}"\n${productInfo.description ? `- Descrizione: "${productInfo.description}"` : ''}`
      : '';

    const prompt = `Sei un art director esperto in banner pubblicitari per e-commerce.

COMPITO: Genera UN SINGOLO prompt in INGLESE (80-150 parole) per creare un banner promozionale accattivante.

IMPORTANTE: Il risultato deve essere un BANNER PUBBLICITARIO, NON una foto prodotto isolata.
Deve sembrare una grafica pubblicitaria professionale come quelle di Amazon, Apple o Nike.

${BANNER_BASE_PROMPT}
${productContext}

ISTRUZIONI DELL'UTENTE (PRIORITÀ MASSIMA):
"${userInstructions}"

REGOLE PER IL PROMPT:
1. Inizia SEMPRE con "Professional e-commerce advertising banner" o "Promotional banner graphic"
2. Descrivi lo SFONDO/SCENA principale (ambientazione, colori, atmosfera)
3. Se c'è un prodotto, descrivi come è INTEGRATO nella scena (non isolato).
4. IMPERATIVO: Nel prompt specifica chiaramente che l'illuminazione NON DEVE alterare il colore naturale del prodotto. Se l'utente chiede un colore specifico (es. "verde"), applicalo SOLO allo sfondo o all'atmosfera, mantenendo il prodotto protetto da dominanti di colore.
5. Termina con: "high resolution, vibrant colors, professional advertising quality, eye-catching promotional design"
6. NON scrivere "product photography" o "studio shot" — è un BANNER, non una foto prodotto

FORMATO: Restituisci SOLO il prompt finale, senza commenti o virgolette.`;

    logger.info(`Generazione prompt banner per: ${userInstructions.slice(0, 60)}...`);
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^[\"'«»]|[\"'«»]$/g, '').trim();

    return text;
  } catch (err) {
    logger.error(`Errore durante la generazione del prompt banner: ${err}`);
    throw err;
  }
}

/**
 * Ottiene un access token OAuth2 dal Service Account per autenticarsi su Vertex AI.
 */
async function getVertexAccessToken(): Promise<{ token: string; projectId: string }> {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!b64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_B64 non configurata. Necessaria per generazione immagini via Vertex AI.');
  }

  const credentialsJson = Buffer.from(b64, 'base64').toString('utf-8');
  const credentials = JSON.parse(credentialsJson);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error('Impossibile ottenere access token dal Service Account.');
  }

  return { token: tokenResponse.token, projectId: credentials.project_id };
}

/**
 * Aspect ratio supportati da Gemini 2.5 Flash Image.
 * Dato width/height dell'utente, troviamo il più vicino.
 */
const SUPPORTED_RATIOS = [
  { ratio: '1:1', value: 1 },
  { ratio: '16:9', value: 16 / 9 },
  { ratio: '9:16', value: 9 / 16 },
  { ratio: '4:3', value: 4 / 3 },
  { ratio: '3:4', value: 3 / 4 },
  { ratio: '3:2', value: 3 / 2 },
  { ratio: '2:3', value: 2 / 3 },
  { ratio: '21:9', value: 21 / 9 },
  { ratio: '5:4', value: 5 / 4 },
  { ratio: '4:5', value: 4 / 5 },
];

function findClosestAspectRatio(width: number, height: number): string {
  const target = width / height;
  let closest = SUPPORTED_RATIOS[0];
  let minDiff = Math.abs(target - closest.value);

  for (const ar of SUPPORTED_RATIOS) {
    const diff = Math.abs(target - ar.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ar;
    }
  }

  return closest.ratio;
}

/**
 * Genera un'immagine usando Vertex AI (Gemini) — bypassa il blocco geografico italiano.
 * Supporta aspect ratio calcolato dalle dimensioni utente e post-resize pixel-perfect.
 *
 * @param prompt La descrizione testuale dell'immagine da generare
 * @param referenceUrls Array opzionale di URL di immagini da usare come ispirazione
 * @param targetWidth Larghezza desiderata in pixel (per aspect ratio e post-resize)
 * @param targetHeight Altezza desiderata in pixel (per aspect ratio e post-resize)
 * @returns Buffer dell'immagine generata alle dimensioni esatte richieste
 */
export async function generateImagenImage(
  prompt: string,
  referenceUrls?: string[],
  targetWidth?: number,
  targetHeight?: number
): Promise<Buffer> {
  const w = targetWidth || 1080;
  const h = targetHeight || 1080;
  const aspectRatio = findClosestAspectRatio(w, h);

  logger.info(`Richiesta generazione immagine via Vertex AI. AspectRatio: ${aspectRatio} (target: ${w}x${h}). Ref images: ${referenceUrls?.length || 0}`);

  try {
    const { token: accessToken, projectId } = await getVertexAccessToken();

    // Costruzione delle parti multimodali
    const parts: any[] = [];

    // Aggiungi le immagini di riferimento come inlineData
    if (referenceUrls && referenceUrls.length > 0) {
      for (const url of referenceUrls) {
        try {
          const res = await fetch(url);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          parts.push({
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg'
            }
          });
        } catch (downloadErr) {
          logger.warn(`Impossibile scaricare immagine reference ${url}: ${downloadErr}`);
        }
      }
    }

    // Aggiungi il prompt testuale
    parts.push({ text: prompt });

    // Chiamata REST a Vertex AI
    const MODEL_ID = 'imagen-3.0-generate-001';
    const LOCATION = 'us-central1';
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
        },
      }
    };

    logger.info(`Invio richiesta a Vertex AI: ${url} | aspectRatio: ${aspectRatio}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      logger.error(`Errore Vertex AI HTTP ${response.status}: ${errMsg}`);
      throw new Error(`Vertex AI Error: ${errMsg}`);
    }

    // Estrai l'immagine dalla risposta
    if (data.candidates && data.candidates.length > 0) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          let imageBuffer = Buffer.from(part.inlineData.data, 'base64');

          // Post-resize con Sharp per dimensioni pixel-perfect
          const metadata = await sharp(imageBuffer).metadata();
          if (metadata.width !== w || metadata.height !== h) {
            logger.info(`Post-resize: ${metadata.width}x${metadata.height} → ${w}x${h}`);
            imageBuffer = (await sharp(imageBuffer)
              .resize(w, h, { fit: 'fill' })
              .png()
              .toBuffer()) as any;
          }

          logger.info(`Generazione Vertex AI Image completata! Output: ${w}x${h}`);
          return imageBuffer;
        }
      }
    }

    throw new Error("Vertex AI non ha restituito alcuna immagine nella risposta.");
  } catch (err) {
    logger.error(`Fallita la chiamata a Vertex AI Image: ${err}`);
    throw err;
  }
}

/**
 * Genera un banner con Imagen 3 Product Recontext + Style Transfer.
 * Usa il modello imagen-3.0-capability-001 via Vertex AI :predict endpoint.
 * Le foto prodotto vengono passate come referenceImages (SUBJECT) per piazzamento realistico.
 *
 * @param prompt Descrizione della scena/banner desiderato
 * @param productImageUrls URL delle foto prodotto da integrare nella scena
 * @param styleImageUrl URL opzionale di un'immagine di stile di riferimento
 * @param targetWidth Larghezza desiderata in pixel
 * @param targetHeight Altezza desiderata in pixel
 * @returns Buffer dell'immagine generata
 */
export async function generateImagen3Banner(
  prompt: string,
  productImageUrls?: string[],
  styleImageUrl?: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<Buffer> {
  const w = targetWidth || 1080;
  const h = targetHeight || 1080;
  const aspectRatio = findClosestAspectRatio(w, h);

  logger.info(`[Imagen3] Richiesta generazione banner. AspectRatio: ${aspectRatio} (target: ${w}x${h}). Product images: ${productImageUrls?.length || 0}`);

  try {
    const { token: accessToken, projectId } = await getVertexAccessToken();

    // Costruisci referenceImages array
    const referenceImages: any[] = [];
    let refIdCounter = 1;

    // Aggiungi foto prodotto come SUBJECT (product recontext)
    if (productImageUrls && productImageUrls.length > 0) {
      for (const imgUrl of productImageUrls) {
        try {
          logger.info(`[Imagen3] Step 3: Download immagine ${refIdCounter}: ${imgUrl.substring(0, 80)}...`);
          const res = await fetch(imgUrl);
          const arrayBuffer = await res.arrayBuffer();
          // Converte SEMPRE in JPEG per evitare problemi con formati WebP/AVIF e Imagen 3
          const jpegBuffer = await sharp(Buffer.from(arrayBuffer))
            .jpeg({ quality: 90 })
            .toBuffer() as any;
          const base64 = jpegBuffer.toString('base64');
          logger.info(`[Imagen3] Step 3: Immagine ${refIdCounter} convertita in JPEG. Base64 length: ${base64.length}`);
          referenceImages.push({
            referenceId: refIdCounter,
            referenceType: 'REFERENCE_TYPE_SUBJECT',
            referenceImage: { 
              bytesBase64Encoded: base64,
              mimeType: 'image/jpeg'
            },
            subjectImageConfig: {
              subjectDescription: "product",
              subjectType: "SUBJECT_TYPE_PRODUCT"
            }
          });
          refIdCounter++;
        } catch (downloadErr) {
          logger.warn(`[Imagen3] Impossibile scaricare immagine prodotto ${imgUrl}: ${downloadErr}`);
        }
      }
    }

    // Aggiungi immagine di stile opzionale (STYLE_TRANSFER)
    if (styleImageUrl) {
      try {
        const res = await fetch(styleImageUrl);
        const arrayBuffer = await res.arrayBuffer();
        const jpegBuffer = await sharp(Buffer.from(arrayBuffer))
          .jpeg({ quality: 90 })
          .toBuffer() as any;
        const base64 = jpegBuffer.toString('base64');
        referenceImages.push({
          referenceId: refIdCounter,
          referenceType: 'REFERENCE_TYPE_STYLE',
          referenceImage: { 
            bytesBase64Encoded: base64,
            mimeType: 'image/jpeg'
          }
        });
      } catch (downloadErr) {
        logger.warn(`[Imagen3] Impossibile scaricare immagine stile ${styleImageUrl}: ${downloadErr}`);
      }
    }

    // Endpoint :predict per Imagen 3
    // Se ci sono immagini di riferimento usiamo il modello 'capability' (edits), altrimenti 'generate' (text-to-image puro)
    const MODEL_ID = referenceImages.length > 0 ? 'imagen-3.0-capability-001' : 'imagen-3.0-generate-001';
    const LOCATION = 'us-central1';
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

    // Imagen 3 supporta solo 5 aspect ratio
    const IMAGEN3_RATIOS = [
      { ratio: '1:1', value: 1 },
      { ratio: '16:9', value: 16 / 9 },
      { ratio: '9:16', value: 9 / 16 },
      { ratio: '4:3', value: 4 / 3 },
      { ratio: '3:4', value: 3 / 4 },
    ];
    const target = w / h;
    let imagen3Ratio = IMAGEN3_RATIOS[0];
    let minDiff = Math.abs(target - imagen3Ratio.value);
    for (const ar of IMAGEN3_RATIOS) {
      const diff = Math.abs(target - ar.value);
      if (diff < minDiff) { minDiff = diff; imagen3Ratio = ar; }
    }

    let finalPrompt = prompt;
    if (referenceImages.length > 0) {
      // Vertex AI Imagen 3 Customization EXPLICITLY requires referenceId tags like "[1]" in the prompt
      // If omitted, the API will reject the payload with INVALID_ARGUMENT.
      const tagsString = referenceImages.map(r => `[${r.referenceId}]`).join(' and ');
      if (!finalPrompt.includes('[1]')) {
        finalPrompt += `\n\nCRITICAL MANDATORY INSTRUCTION: You MUST prominently feature the EXACT product(s) represented by ${tagsString} within the scene.`;
      }
    }

    const instance: any = { prompt: finalPrompt };
    if (referenceImages.length > 0) {
      instance.referenceImages = referenceImages;
    }

    const body = {
      instances: [instance],
      parameters: {
        sampleCount: 1,
        // RIMOSSO personGeneration: 'dont_allow' (potrebbe non essere supportato dal modello capability)
        aspectRatio: imagen3Ratio.ratio,
      }
    };

    // Log struttura senza base64 per debug
    const logBody = {
      instances: [{
        prompt: prompt.substring(0, 100) + '...',
        referenceImages: referenceImages.map((r: any) => ({
          referenceId: r.referenceId,
          referenceType: r.referenceType,
          referenceImage: `(base64 length: ${r.referenceImage?.bytesBase64Encoded?.length || 0})`
        }))
      }],
      parameters: body.parameters
    };
    logger.info(`[Imagen3] Step 5: Request body: ${JSON.stringify(logBody)}`);
    logger.info(`[Imagen3] Step 5: URL: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    logger.info(`[Imagen3] Step 6: Response status: ${response.status} ${response.statusText}`);
    const data: any = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      logger.error(`[Imagen3] ERRORE HTTP ${response.status}: ${errMsg}`);
      logger.error(`[Imagen3] Error code: ${data?.error?.code}`);
      logger.error(`[Imagen3] Error status: ${data?.error?.status}`);
      if (data?.error?.details) {
        logger.error(`[Imagen3] Error details: ${JSON.stringify(data.error.details)}`);
      }
      logger.error(`[Imagen3] Full error: ${JSON.stringify(data)}`);
      throw new Error(`Imagen 3 Error: ${errMsg}`);
    }

    // Estrai immagine dalla risposta :predict
    logger.info(`[Imagen3] Step 7: Parsing risposta...`);
    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded;

      if (!imageBase64) {
        throw new Error('[Imagen3] Nessuna immagine nella risposta predictions.');
      }

      let imageBuffer = Buffer.from(imageBase64, 'base64');

      // Post-resize con Sharp — usa 'cover' per ritaglio intelligente dal centro
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.width !== w || metadata.height !== h) {
        logger.info(`[Imagen3] Step 8: Post-crop: ${metadata.width}x${metadata.height} → ${w}x${h} (cover/center)`);
        imageBuffer = (await sharp(imageBuffer)
          .resize(w, h, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer()) as any;
      }

      logger.info(`[Imagen3] === COMPLETATO! Output: ${w}x${h} ===`);
      return imageBuffer;
    }

    throw new Error('[Imagen3] Vertex AI non ha restituito alcuna immagine nella risposta.');
  } catch (err) {
    logger.error(`[Imagen3] Fallita la chiamata: ${err}`);
    throw err;
  }
}

/**
 * Genera un report analitico testuale (Executive Summary) usando i dati raccolti.
 */
export async function generateAnalyticsSummary(metricsJson: any): Promise<string> {
  if (!genAI) {
    return 'L\'analisi IA non è disponibile (API Key mancante).';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Sei un Data Analyst e-commerce senior. Ho estratto queste metriche dal mio sito per l'ultimo periodo:
${JSON.stringify(metricsJson, null, 2)}

COMPITO: Scrivi un Executive Summary professionale in ITALIANO di 2-3 brevi paragrafi per il management.
ANALIZZA:
1. Come sta andando il fatturato in base agli utenti e alle sessioni.
2. Il tasso di conversione (acquisti / sessioni) e l'efficacia del funnel.
3. Lo stato dei carrelli abbandonati (se ci sono).

STILE: 
- Professionale, conciso, orientato ai risultati.
- Nessuna formattazione Markdown (niente \`**\` o \`##\`), solo testo semplice diviso in paragrafi.
- Niente saluti o frasi di circostanza.`;

    logger.info(`Richiesta Executive Summary a Gemini...`);
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    text = text.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '').trim();

    return text;
  } catch (err: any) {
    logger.error(`Errore durante la generazione del summary analitico con Gemini: ${err.message}`);
    if (err.message?.includes('429') || err.message?.includes('depleted')) {
       return "⚠️ Analisi IA temporaneamente sospesa: i crediti dell'API Key di Gemini risultano esauriti.";
    }
    return 'Analisi IA temporaneamente non disponibile per un errore tecnico.';
  }
}
