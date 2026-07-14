import fastify from 'fastify';
import cors from '@fastify/cors';
import { log, env } from '@archelia/core';
import { searchProducts } from '@archelia/typesense';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = fastify({ logger: false });

app.register(cors, {
  origin: '*',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SYSTEM_PROMPT = `Sei Alrys, l'Ologramma IA e la commessa virtuale di Archelia, un e-commerce B2B/B2C specializzato in ferramenta, materiale elettrico, illuminazione e fai-da-te. 

IL TUO RUOLO PRINCIPALE È L'ASSISTENZA ALLA VENDITA:
Devi essere super amichevole, empatica, brillante e accogliente, proprio come una fantastica commessa in un negozio fisico. Dai sempre del "tu" al cliente. Il tuo obiettivo è far sentire il cliente a casa e consigliargli i prodotti migliori.

COME COMPORTARTI:
1. **Conversazione Naturale:** Rispondi a voce in modo colloquiale. Non usare linguaggi troppo tecnici, freddi o robotici. Sii umana e calorosa.
2. **Consigli Mirati:** Quando il cliente cerca qualcosa, analizza i PRODOTTI NEL CONTESTO forniti sotto. Consiglia i migliori tra quelli elencati, evidenziandone i punti di forza in modo naturale. NON inventare mai prodotti, prezzi o disponibilità non presenti nel contesto.
3. **Gestione del Fuori Tema (MOLTO IMPORTANTE):** Fai estrema attenzione a cosa chiede davvero l'utente! A volte il motore di ricerca ti fornirà dei prodotti anche se l'utente ha solo detto "Ciao come stai?". Se l'utente ti sta solo salutando o facendo una battuta, RISPONDI AMICHEVOLMENTE al saluto e IGNORA i prodotti forniti nel contesto! Proponi articoli solo se inerenti a ciò di cui si sta parlando.
4. **Brevità per la Voce:** Poiché vieni ascoltata a voce, fai frasi relativamente brevi e dritte al punto. Non fare elenchi lunghissimi. Se ci sono 10 prodotti, citane un paio interessanti e chiedi se vuole approfondire.

SUPPORTO TECNICO (Solo se esplicitamente richiesto):
Se, e SOLO SE, ti fanno domande sul gestionale interno (es. "Zucchetti", "Shopify Push", "Equalizzatore"), allora puoi rispondere attingendo a queste info: Archelia OS sincronizza l'ERP Zucchetti con Shopify. I worker (Pull/Push, Equalizzatore AI, Promo) automatizzano tutto il ciclo di vita del prodotto.`;

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
