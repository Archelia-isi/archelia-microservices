import fastify from 'fastify';
import cors from '@fastify/cors';
import { log, env } from '@archelia/core';
import { searchProducts } from '@archelia/typesense';
import { GoogleGenerativeAI } from '@google/generative-ai';
import textToSpeech from '@google-cloud/text-to-speech';

const app = fastify({ logger: false });

app.register(cors, {
  origin: '*',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Inizializza TTS
let ttsClient: any = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
  try {
    const jsonStr = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8');
    const credentials = JSON.parse(jsonStr);
    ttsClient = new textToSpeech.TextToSpeechClient({ credentials, projectId: credentials.project_id });
  } catch (err) {
    log.error(`Errore caricamento credenziali Google Cloud TTS`, { module: 'ai-chatbot' });
  }
}

const SYSTEM_PROMPT = `Sei Alrys, l'Ologramma IA e la commessa virtuale di Archelia, un e-commerce B2B/B2C specializzato in ferramenta, materiale elettrico, illuminazione e fai-da-te. 

IL TUO RUOLO PRINCIPALE È L'ASSISTENZA ALLA VENDITA:
Devi essere super amichevole, empatica, brillante e accogliente, proprio come una fantastica commessa in un negozio fisico. Dai sempre del "tu" al cliente. Il tuo obiettivo è far sentire il cliente a casa e consigliargli i prodotti migliori.

COME COMPORTARTI (REGOLE FONDAMENTALI PER LA VOCE E I PRODOTTI):
1. **Mostrare i Prodotti (NOVITÀ CRITICA):** Se l'utente ti chiede un prodotto o un consiglio, devi ASSOLUTAMENTE mostrare i prodotti a schermo usando il tag speciale \`[SHOW_PRODUCTS: sku1, sku2]\`.
   - **Regola vitale per gli SKU:** Al posto di "sku1", devi inserire gli SKU REALI dei prodotti che hai scelto dal CONTESTO fornito sotto.
   - Regola ferrea: Questo tag deve essere SEMPRE all'inizio assoluto della tua risposta. Non dire "Certo" prima del tag. 
   - Esempio ESATTO (usando SKU reali del contesto): \`[SHOW_PRODUCTS: ELM-1020, FRK-90] Certo! Per la cuccia del cane ti servirà un trapano come questo...\`
2. **Conversazione Naturale e Discorsiva:** Dopo il tag (o se non ci sono prodotti da mostrare), parla in modo fluido. Non devi MAI leggere elenchi puntati, SKU, o titoli di prodotti per intero. 
   - Usa un tono discorsivo e riassuntivo. Se il sistema non trova prodotti (lista vuota), NON dire MAI frasi come "non ho trovato nulla nel catalogo" o "non ci sono prodotti". Semplicemente inventa una scusa o devia la conversazione in modo super amichevole.
3. **Gestione del Fuori Tema:** Se l'utente ti sta solo salutando o facendo una battuta, RISPONDI AMICHEVOLMENTE al saluto e IGNORA i prodotti! 
4. **Brevità:** Fai frasi brevi e dritte al punto. Chiedi all'utente un feedback.

SUPPORTO TECNICO (Solo se esplicitamente richiesto):
Se ti fanno domande sul gestionale interno, puoi rispondere attingendo a queste info: Archelia OS sincronizza l'ERP Zucchetti con Shopify tramite worker automatizzati.`;

app.post('/api/chat/stream', async (request, reply) => {
  const { message, history = [] } = request.body as { 
    message: string, 
    history?: { role: string, parts: { text: string }[] }[] 
  };

  if (!message) {
    return reply.status(400).send({ error: 'Message is required' });
  }

  // 1. Cerca su Typesense
  let searchContext = '';
  let hits: any[] = [];
  try {
    const results = await searchProducts(message);
    hits = results.hits || [];
    
    if (hits.length > 0) {
      searchContext = "RISULTATI RICERCA CATALOGO ARCHELIA:\n";
      // Prendiamo i primi 5-10 risultati per non sforare il context window
      hits.slice(0, 10).forEach((hit: any, index: number) => {
        const doc = hit.document;
        searchContext += `${index + 1}. Nome: ${doc.title} (SKU: ${doc.sku})\n- Prezzo: €${doc.price}\n- Giacenza: ${doc.stock > 0 ? doc.stock + ' pezzi disponibili' : 'Esaurito'}\n- Brand: ${doc.brand}\n- Categoria: ${doc.family}\n- Promo: ${doc.is_in_promo ? doc.promo_slogan + ' (-' + doc.promo_discount + '%)' : 'Nessuna promo attiva'}\n\n`;
      });
    } else {
      searchContext = "NESSUN PRODOTTO TROVATO. Rispondi in modo amichevole, senza dire all'utente che non hai trovato nulla nel catalogo (non rivelare mai i tuoi meccanismi interni di ricerca). Prosegui la conversazione o chiedi dettagli aggiuntivi.";
    }
  } catch (err: any) {
    log.error(`Errore Typesense RAG: ${err.message}`, { module: 'ai-chatbot' });
    searchContext = "Errore durante la ricerca nel catalogo.";
  }

  // 2. Costruisci il prompt finale
  const finalPrompt = `DOMANDA UTENTE: ${message}\n\nCONTESTO PRODOTTI (da Typesense):\n${searchContext}`;

  // 3. Prepara lo stream SSE (Server-Sent Events)
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('Access-Control-Allow-Origin', '*');
  reply.raw.flushHeaders();

  try {
    // Inizializza la chat con history e system prompt
    const chat = model.startChat({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }], role: 'system' },
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: h.parts
      }))
    });

    const result = await chat.sendMessageStream(finalPrompt);

    let buffer = '';
    let tagParsed = false;
    let chunksCount = 0;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      
      if (!tagParsed) {
        buffer += chunkText;
        chunksCount++;
        
        const match = buffer.match(/\[SHOW_PRODUCTS:\s*([^\]]+)\]/);
        if (match) {
           const skusStr = match[1];
           const skus = skusStr.split(',').map(s => s.trim());
           console.log(`[AI-CHATBOT] Gemini ha richiesto di mostrare i prodotti con SKU:`, skus);
           // Trova i prodotti nei risultati typesense originali
           const recommendedProducts = hits.filter((h: any) => skus.includes(h.document.sku)).map((h: any) => h.document);
           console.log(`[AI-CHATBOT] Prodotti effettivamente trovati nel contesto:`, recommendedProducts.map((p: any) => p.sku));
           
           if (recommendedProducts.length > 0) {
             reply.raw.write(`data: ${JSON.stringify({ type: 'products', items: recommendedProducts })}\n\n`);
           }
           tagParsed = true;
           
           const remainingText = buffer.replace(match[0], '').trimStart();
           if (remainingText) {
             reply.raw.write(`data: ${JSON.stringify({ type: 'text', text: remainingText })}\n\n`);
           }
        } else if (chunksCount > 10 || buffer.length > 250) {
           tagParsed = true;
           // Elimina eventuali tag scritti a metà che sono rimasti incastrati all'inizio
           let cleanBuffer = buffer.replace(/\[SHOW_PRO.*/, '');
           reply.raw.write(`data: ${JSON.stringify({ type: 'text', text: cleanBuffer })}\n\n`);
        }
      } else {
         // Rimuoviamo al volo eventuali altri tag se il modello li stampa per sbaglio in mezzo al testo
         const cleanText = chunkText.replace(/\[SHOW_PRODUCTS:[^\]]*\]/g, '');
         if (cleanText) {
           reply.raw.write(`data: ${JSON.stringify({ type: 'text', text: cleanText })}\n\n`);
         }
      }
    }

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  } catch (err: any) {
    log.error(`Errore Gemini Chatbot: ${err.message}`, { module: 'ai-chatbot' });
    reply.raw.write(`data: ${JSON.stringify({ error: 'Scusa, si è verificato un errore durante la generazione della risposta.' })}\n\n`);
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  }
});

// Endpoint TTS Cloud
app.post('/api/tts', async (request, reply) => {
  if (!ttsClient) {
    return reply.status(500).send({ error: 'Motore Vocale non configurato' });
  }

  const { text } = request.body as { text: string };
  if (!text) {
    return reply.status(400).send({ error: 'Testo mancante' });
  }

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'it-IT', name: 'it-IT-Journey-F' }, // Voce femminile ultra-realistica
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
    });

    if (!response.audioContent) {
       return reply.status(500).send({ error: 'Nessun audio generato' });
    }

    reply.header('Content-Type', 'audio/mpeg');
    return reply.send(response.audioContent);
  } catch (err: any) {
    log.error(`Errore Cloud TTS: ${err.message}`, { module: 'ai-chatbot' });
    
    // Fallback in caso Journey-F non sia abilitata nel progetto GCP, provo Neural2
    if (err.message?.includes('voice not found') || err.message?.includes('Journey')) {
      try {
        const [fallbackResp] = await ttsClient.synthesizeSpeech({
          input: { text },
          voice: { languageCode: 'it-IT', name: 'it-IT-Neural2-A' }, 
          audioConfig: { audioEncoding: 'MP3' },
        });
        reply.header('Content-Type', 'audio/mpeg');
        return reply.send(fallbackResp.audioContent);
      } catch (fallbackErr) {
        return reply.status(500).send({ error: 'Errore fallback TTS' });
      }
    }

    return reply.status(500).send({ error: 'Errore durante la sintesi vocale' });
  }
});

app.get('/health', async (request, reply) => {
  return reply.send({ status: 'ok', service: 'ai-chatbot-service' });
});

const PORT = parseInt(process.env.PORT || '8004', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    log.error(`Avvio fallito: ${err.message}`, { module: 'ai-chatbot' });
    process.exit(1);
  }
  log.info(`🤖 AI Chatbot Service in ascolto su ${address}`, { module: 'ai-chatbot' });
});
