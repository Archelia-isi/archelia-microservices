import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';

export async function adminFinanceRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Proxy to Yahoo Finance for the Finance Widget
  fastify.get('/api/admin/finance/quote', {
    preHandler: [requireAdmin],
    schema: {
      querystring: z.object({
        symbols: z.string() // comma separated like AAPL,MSFT,EURUSD=X
      }),
      response: {
        200: z.any(),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { symbols } = request.query;
    
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`);
      const data = await response.json();
      
      return reply.status(200).send(data);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to fetch from Yahoo Finance' });
    }
  });
}
