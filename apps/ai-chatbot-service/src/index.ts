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

const SYSTEM_PROMPT = `Sei l'assistente virtuale di Archelia, un e-commerce B2B/B2C specializzato in ferramenta, materiale elettrico, illuminazione e fai-da-te.
Il tuo compito è aiutare i clienti a trovare i prodotti giusti, rispondere a domande tecniche e fornire assistenza agli acquisti.
Usa SEMPRE e SOLO i prodotti forniti nel contesto (risultati della ricerca) per consigliare gli articoli. Se non trovi nulla di pertinente nel contesto, dillo chiaramente e suggerisci di contattare l'assistenza o riformulare la ricerca. Non inventare mai prezzi, stock o codici SKU.
Mantieni un tono professionale, cortese e conciso. Rispondi in italiano. Usa il Markdown per formattare la risposta (es. per evidenziare i nomi dei prodotti o i prezzi in grassetto).`;

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
