import { prisma } from './index.js';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Controlla tramite Gemini Vision se l'immagine contiene solo la scritta del codice prodotto
 */
async function isFakeTextImage(imageUrl: string, sku: string): Promise<{isFake: boolean, reason: string}> {
  try {
    const responseImg = await fetch(imageUrl);
    if (!responseImg.ok) return {isFake: false, reason: "Fetch failed"};
    
    const arrayBuffer = await responseImg.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = responseImg.headers.get('content-type') || 'image/webp';

    const prompt = `Guarda attentamente questa immagine relativa al prodotto con codice SKU: "${sku}".
    L'immagine è una foto reale dell'oggetto (es. una lampadina, un interruttore, un cavo reale), oppure è palesemente un'immagine segnaposto o un disegno generico che contiene solo la scritta del codice prodotto (o un testo simile) su uno sfondo piatto?
    Rispondi con un JSON indicando 'isFake: true' se l'immagine NON è una vera foto ma solo un testo/segnaposto.`;

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
            isFake: { type: Type.BOOLEAN, description: "True se è solo una scritta o un segnaposto falso, False se è una vera foto del prodotto." },
            reason: { type: Type.STRING, description: "Motivo della decisione" }
          },
          required: ["isFake", "reason"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return result;
    }
  } catch (e) {
    console.error(`Errore Gemini su ${imageUrl}:`, e);
  }
  return {isFake: false, reason: "Error"};
}

async function runTest() {
  console.log("=== TEST SCANSIONE IMMAGINI FAKE (TESTO/SKU) ===");
  
  // Prendiamo un campione di 10 prodotti con immagine per il test
  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null, not: '' } },
    select: { sku: true, imageUrl: true },
    take: 10
  });

  for (const p of products) {
    if (!p.imageUrl) continue;
    console.log(`\nAnalizzo SKU: ${p.sku} | URL: ${p.imageUrl}`);
    const result = await isFakeTextImage(p.imageUrl, p.sku);
    console.log(`> Risultato IA: ${result.isFake ? '❌ FINTA (Scritta)' : '✅ VERA FOTO'}`);
    console.log(`> Motivo: ${result.reason}`);
  }
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
