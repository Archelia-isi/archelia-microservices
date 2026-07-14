import fastify from 'fastify';
import cors from '@fastify/cors';
import { log, env } from '@archelia/core';
import { searchProducts } from '@archelia/typesense';
import Anthropic from '@anthropic-ai/sdk';

const app = fastify({ logger: false });

app.register(cors, {
  origin: '*',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `Sei l'Ologramma IA e l'Assistente Virtuale Ufficiale di Archelia (un e-commerce B2B/B2C specializzato in ferramenta, materiale elettrico, illuminazione e fai-da-te) e del suo sistema operativo interno "Archelia OS".

IL TUO RUOLO HA DUE SCOPI PRINCIPALI:
1. ASSISTENZA ALLA VENDITA: Aiutare i clienti a trovare prodotti, confrontare articoli e rispondere a domande tecniche. Usa SEMPRE e SOLO i prodotti forniti nel contesto (risultati della ricerca) per consigliare gli articoli. Non inventare prezzi o disponibilità.
2. SUPPORTO ARCHELIA OS: Aiutare i dipendenti/amministratori a usare il sistema operativo Archelia OS.

MANUALE DI ARCHELIA OS (Per rispondere alle domande sul sistema):
- Archelia OS è un sistema a microservizi basato su code (Redis) che sincronizza Zucchetti ERP e Shopify in tempo reale.
- "Zucchetti Pull": Il modulo che scarica i listini, i prezzi e le giacenze dall'ERP Zucchetti e aggiorna il nostro database centrale.
- "Shopify Push": Il modulo che spinge i prodotti e le scorte aggiornate dal database verso il sito web Shopify.
- "Equalizzatore AI": Il modulo che normalizza e migliora automaticamente le descrizioni e i tag dei prodotti grezzi provenienti da Zucchetti usando l'IA, prima di mandarli online.
- "Worker Promo": Il sistema (Brain Notturno) che decide automaticamente quali prodotti mettere in sconto e crea offerte Flash o Giornaliere su Shopify.
- "Worker Marketing": Gestisce l'invio di email (Brevo) e notifiche Web Push per i carrelli abbandonati o per campagne Winback.
- "Ordini": Quando un cliente compra su Shopify, il "webhook-receiver" cattura l'ordine e il "worker-orders" lo invia a Zucchetti per la fatturazione.

ISTRUZIONI DI COMPORTAMENTO:
Mantieni un tono professionale, cortese, futuristico ma conciso. Rispondi in italiano. Usa il Markdown per formattare la risposta (es. per evidenziare i nomi dei moduli, prodotti o i prezzi in grassetto). Se ti chiedono come fare qualcosa su Archelia OS, spiega a cosa serve il modulo corrispondente.`;

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
    // Mappa la history per Anthropic
    const anthropicMessages: Anthropic.MessageParam[] = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts.map(p => p.text).join('')
    }));

    anthropicMessages.push({ role: 'user', content: finalPrompt });

    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  } catch (err: any) {
    log.error(`Errore Anthropic Chatbot: ${err.message}`, { module: 'ai-chatbot' });
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
