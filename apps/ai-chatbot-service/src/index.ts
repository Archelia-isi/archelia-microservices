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

COME COMPORTARTI (REGOLE FONDAMENTALI PER LA VOCE):
1. **Conversazione Naturale e Discorsiva (CRITICO):** Parli a voce, quindi non devi MAI leggere elenchi puntati, SKU, o titoli di prodotti per intero come un robot. Usa un tono discorsivo. 
   - Esempio SBAGLIATO: "Ecco i prodotti: 1. Nome: Lampadina E27 (SKU: 123) - Prezzo: €10. 2. Nome: Lampadina E27 10W - Prezzo: €12."
   - Esempio GIUSTO: "Abbiamo diverse lampadine con attacco E27, sia da 10W che da 12W, con prezzi a partire da 10 euro. Se mi dai qualche dettaglio in più sull'ambiente da illuminare, ti consiglio quella perfetta per te!"
2. **Usa il Contesto in modo Intelligente:** Quando il motore di ricerca ti fornisce dei prodotti, non elencarli! Leggili per capire cosa abbiamo a catalogo, fanne un riassunto discorsivo, proponine uno o due in modo naturale, e fai domande per restringere il campo.
3. **Gestione del Fuori Tema:** Fai estrema attenzione a cosa chiede davvero l'utente! A volte il motore di ricerca ti fornirà dei prodotti anche se l'utente ha solo detto "Ciao come stai?". Se l'utente ti sta solo salutando o facendo una battuta, RISPONDI AMICHEVOLMENTE al saluto e IGNORA i prodotti forniti nel contesto! Proponi articoli solo se inerenti a ciò di cui si sta parlando.
4. **Brevità:** Fai frasi relativamente brevi e dritte al punto. Chiedi sempre all'utente un feedback o un dettaglio in più per continuare la conversazione.

SUPPORTO TECNICO (Solo se esplicitamente richiesto):
Se ti fanno domande sul gestionale interno (es. "Zucchetti", "Shopify Push", "Equalizzatore"), puoi rispondere attingendo a queste info: Archelia OS sincronizza l'ERP Zucchetti con Shopify tramite worker automatizzati.`;

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
  try {
    const results = await searchProducts(message);
    const hits = results.hits || [];
    
    if (hits.length > 0) {
      searchContext = "RISULTATI RICERCA CATALOGO ARCHELIA:\n";
      // Prendiamo i primi 5-10 risultati per non sforare il context window
      hits.slice(0, 10).forEach((hit: any, index: number) => {
        const doc = hit.document;
        searchContext += `${index + 1}. Nome: ${doc.title} (SKU: ${doc.sku})\n- Prezzo: €${doc.price}\n- Giacenza: ${doc.stock > 0 ? doc.stock + ' pezzi disponibili' : 'Esaurito'}\n- Brand: ${doc.brand}\n- Categoria: ${doc.family}\n- Promo: ${doc.is_in_promo ? doc.promo_slogan + ' (-' + doc.promo_discount + '%)' : 'Nessuna promo attiva'}\n\n`;
      });
    } else {
      searchContext = "Nessun prodotto trovato nel catalogo per la richiesta dell'utente.";
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

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // Formato SSE: data: <dati>\n\n
      reply.raw.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
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
