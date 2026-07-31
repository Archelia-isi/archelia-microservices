import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAdmin } from '../auth.js';

export async function adminAiWidgetsRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Use Gemini for the Copywriter Widget
  fastify.post('/api/admin/ai/copywriter', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        prompt: z.string()
      }),
      response: {
        200: z.object({ text: z.string() }),
        500: z.object({ text: z.string() })
      }
    }
  }, async (request, reply) => {
    const { prompt } = request.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return reply.status(500).send({ text: 'GEMINI_API_KEY non configurata sul server.' });
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const finalPrompt = `Sei un assistente AI copywriter, integrato nel sistema desktop aziendale.
Rispondi in modo professionale ma dritto al punto, senza troppi preamboli.
Il tuo compito è aiutare l'utente a scrivere email, annunci, o post in italiano perfetto (o altre lingue se richiesto espressamente).

RICHIESTA UTENTE:
${prompt}`;

      const result = await model.generateContent(finalPrompt);
      const text = result.response.text();
      
      return reply.status(200).send({ text });
    } catch (err: any) {
      return reply.status(500).send({ text: 'Errore generazione testo: ' + err.message });
    }
  });

  // Use Gemini for the Translator Widget
  fastify.post('/api/admin/ai/translate', {
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        text: z.string(),
        langFrom: z.string(),
        langTo: z.string()
      }),
      response: {
        200: z.object({ text: z.string() }),
        500: z.object({ text: z.string() })
      }
    }
  }, async (request, reply) => {
    const { text, langFrom, langTo } = request.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return reply.status(500).send({ text: 'GEMINI_API_KEY non configurata sul server.' });
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const finalPrompt = `Traduci il seguente testo.
Lingua di origine: ${langFrom}
Lingua di destinazione: ${langTo}

TESTO DA TRADURRE:
${text}

Rispondi SOLO ed ESCLUSIVAMENTE con il testo tradotto, senza virgolette e senza testo aggiuntivo.`;

      const result = await model.generateContent(finalPrompt);
      const translated = result.response.text().trim();
      
      return reply.status(200).send({ text: translated });
    } catch (err: any) {
      return reply.status(500).send({ text: 'Errore traduzione: ' + err.message });
    }
  });
}
