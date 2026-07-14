import fastify from 'fastify';
import cors from '@fastify/cors';
import { log, env } from '@archelia/core';
import { searchProducts, searchGuides } from '@archelia/typesense';
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

const SYSTEM_PROMPT = `Sei Alrys, l'Ologramma IA e la Top Sales Assistant di Archelia, un e-commerce B2B/B2C leader in ferramenta, materiale elettrico, illuminazione e fai-da-te. 

IL TUO RUOLO E LA TUA PERSONA:
Non sei un semplice bot, sei un'esperta venditrice consultiva. Sei amichevole, empatica, brillante e sicura di te. Dai sempre del "tu" al cliente. Il tuo obiettivo è far sentire il cliente a casa, risolvere i suoi problemi tecnici e guidarlo verso l'acquisto perfetto.

TECNICHE DI VENDITA (CROSS-SELLING E UPSELLING):
1. **Pensa sempre al "Progetto Completo":** Se un cliente compra un prodotto principale (es. trapano), proponi spontaneamente gli accessori necessari (es. punte, tasselli, occhiali protettivi). Se compra vernice, suggerisci pennelli e nastro. 
2. **Usa frasi ponte:** "Ottima scelta il trapano! Per fare un lavoro pulito ti consiglio di abbinarci anche...", "Visto che prendi questo, ti tornerà sicuramente utile anche..."

GESTIONE DELLE OBIEZIONI E DEL "FUORI CATALOGO":
1. **Obiezione sul Prezzo:** Se il cliente dice che un prodotto costa troppo, NON darti per vinta. Difendi il valore del prodotto (qualità, garanzia, durata nel tempo) e, se possibile, proponi un'alternativa più economica ("Capisco perfettamente. Questo modello è professionale e dura una vita, ma se cerchi qualcosa per uso saltuario abbiamo quest'altra opzione...").
2. **Prodotto non trovato:** Se il sistema non trova il prodotto richiesto (lista vuota), NON dire MAI "non ho trovato nulla". Usa il "Soft Fallback": "Attualmente non trattiamo quel marchio specifico, ma posso proporti un'alternativa eccellente...". Devia la conversazione in modo naturale.

REGOLE FERREE PER LA GENERAZIONE DEL MESSAGGIO:
1. **Mostrare i Prodotti a Schermo (CRITICO):** Se consigli uno o più prodotti, DEVI usare il tag \`[SHOW_PRODUCTS: sku1, sku2, sku3]\`.
   - Inserisci gli SKU REALI di TUTTI i prodotti scelti (separati da virgola).
   - **REGOLA DI SISTEMA INVIOLABILE:** IL TAG DEVE ESSERE LA PRIMA E UNICA COSA CHE SCRIVI ALL'INIZIO ASSOLUTO DEL MESSAGGIO. PRIMA DEL TAG NON DEVE ESSERCI NEMMENO UNO SPAZIO, NEMMENO UN "Ciao".
   - Esempio ESATTO: \`[SHOW_PRODUCTS: ELM-10, FRK-9] Ciao! Per il tuo progetto ti consiglio...\`
2. **Conversazione Naturale:** Dopo il tag, parla in modo fluido. MAI leggere elenchi puntati o SKU a voce. Fai un riassunto discorsivo. Fai frasi brevi e chiudi spesso con una domanda per stimolare l'acquisto (es. "Che ne pensi?", "Vuoi che te li metta nel carrello?").
3. **Fuori Tema:** Se l'utente ti saluta o fa battute, rispondi amichevolmente senza usare il tag prodotti.

SUPPORTO TECNICO INTERNO:
Se ti chiedono info sul sistema: Archelia OS sincronizza l'ERP Zucchetti con Shopify tramite worker automatizzati su code Redis.`;

async function extractSearchQueries(message: string): Promise<string[]> {
  try {
    const prompt = `Sei un Query Expander per l'e-commerce Archelia. 
Analizza la richiesta dell'utente ed estrai i prodotti richiesti esplicitamente E deduci gli accessori/strumenti impliciti necessari per completare il lavoro.
Cerca di estrarre termini secchi (es. "lampadario design", "tasselli", "trapano").
Ritorna SOLO un array JSON di stringhe.
Esempio Utente: "Devo fissare un lampadario al soffitto"
Esempio Output: ["lampadario", "trapano", "tasselli", "viti", "morsetti"]

Richiesta Utente: "${message}"`;
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const text = result.response.text();
    const queries = JSON.parse(text);
    if (Array.isArray(queries) && queries.length > 0) {
      return queries;
    }
  } catch (err) {
    log.error(`Errore Query Expansion: ${err}`, { module: 'ai-chatbot' });
  }
  return [message]; // Fallback to original message
}

app.post('/api/chat/stream', async (request, reply) => {
  const { message, history = [] } = request.body as { 
    message: string, 
    history?: { role: string, parts: { text: string }[] }[] 
  };

  if (!message) {
    return reply.status(400).send({ error: 'Message is required' });
  }

  // 1. Cerca su Typesense (Multi-Search: Prodotti e Guide con Query Expansion)
  let searchContext = '';
  let hits: any[] = [];
  try {
    const searchQueries = await extractSearchQueries(message);
    log.info(`[RAG] Query espanse: ${searchQueries.join(', ')}`, { module: 'ai-chatbot' });

    // Cerca le guide usando solo il messaggio originale (più semantico)
    const guidesResults = await searchGuides(message);
    const guideHits = guidesResults.hits || [];

    // Cerca i prodotti usando tutte le query espanse in parallelo
    const productPromises = searchQueries.map(q => searchProducts(q));
    const productsResultsArray = await Promise.all(productPromises);
    
    // Unisci e deduplica i prodotti trovati
    const uniqueHitsMap = new Map();
    productsResultsArray.forEach(res => {
      (res.hits || []).forEach((hit: any) => {
        if (!uniqueHitsMap.has(hit.document.sku)) {
          uniqueHitsMap.set(hit.document.sku, hit);
        }
      });
    });
    hits = Array.from(uniqueHitsMap.values());
    
    if (guideHits.length > 0) {
      searchContext += "MANUALI E GUIDE (Usa queste info per consigliare il cliente):\n";
      guideHits.forEach((hit: any) => {
        searchContext += `Titolo: ${hit.document.title}\nContenuto: ${hit.document.content}\n\n`;
      });
      searchContext += "---\n\n";
    }

    if (hits.length > 0) {
      searchContext += "RISULTATI RICERCA CATALOGO ARCHELIA:\n";
      // Prendiamo i primi 15 risultati per coprire più prodotti
      hits.slice(0, 15).forEach((hit: any, index: number) => {
        const doc = hit.document;
        searchContext += `${index + 1}. Nome: ${doc.title} (SKU: ${doc.sku})\n- Prezzo: €${doc.price}\n- Giacenza: ${doc.stock > 0 ? doc.stock + ' pezzi disponibili' : 'Esaurito'}\n- Brand: ${doc.brand}\n- Categoria: ${doc.family}\n- Promo: ${doc.is_in_promo ? doc.promo_slogan + ' (-' + doc.promo_discount + '%)' : 'Nessuna promo attiva'}\n\n`;
      });
    } else {
      searchContext += "NESSUN PRODOTTO TROVATO. Rispondi in modo amichevole, senza dire all'utente che non hai trovato nulla nel catalogo (non rivelare mai i tuoi meccanismi interni di ricerca). Prosegui la conversazione o chiedi dettagli aggiuntivi.";
    }
  } catch (err: any) {
    log.error(`Errore Typesense RAG: ${err.message}`, { module: 'ai-chatbot' });
    searchContext = "Errore durante la ricerca nel catalogo.";
  }

  // 2. Costruisci il prompt finale
  const finalPrompt = `DOMANDA UTENTE: ${message}\n\nCONTESTO RECUPERATO DA TYPESENSE:\n${searchContext}`;

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
