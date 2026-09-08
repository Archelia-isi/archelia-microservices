import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { zucchettiClient } from '@archelia/zucchetti';
import * as bcrypt from 'bcryptjs';

export async function adminB2BUsersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Helper hook if auth is required
  app.addHook('onRequest', async (request, reply) => {
    // Basic auth check using your existing middleware
    await (fastify as any).authenticate(request, reply);
  });

  // GET /api/admin/b2b-users
  app.get('/b2b-users', {
    schema: {
      querystring: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
        search: z.string().optional(),
        role: z.string().optional(),
      })
    }
  }, async (request) => {
    const { page, limit, search, role } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let where: any = {};
    if (search) {
      where = {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { vatNumber: { contains: search, mode: 'insensitive' } },
          { zucchettiCode: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    if (role && role !== 'ALL') {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      b2bPrisma.b2BUser.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { agent: true }
      }),
      b2bPrisma.b2BUser.count({ where })
    ]);

    return { users, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // POST /api/admin/b2b-users
  app.post('/b2b-users', {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        vatNumber: z.string().optional(),
        zucchettiCode: z.string().optional(),
        role: z.enum(['USER', 'AGENT', 'ADMIN']),
        agentId: z.string().optional(),
        zucchettiPriceList: z.string().optional(),
        customerType: z.string().optional(),
        fido: z.number().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Controlla se esiste
    const exists = await b2bPrisma.b2BUser.findUnique({ where: { email: data.email } });
    if (exists) {
      return reply.code(400).send({ error: 'Email già in uso' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...userData } = data;
    
    const user = await b2bPrisma.b2BUser.create({
      data: {
        ...userData,
        passwordHash
      }
    });
    
    return { success: true, user };
  });

  // PUT /api/admin/b2b-users/:id
  app.put('/b2b-users/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        email: z.string().email(),
        password: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        vatNumber: z.string().optional(),
        zucchettiCode: z.string().optional(),
        role: z.enum(['USER', 'AGENT', 'ADMIN']),
        agentId: z.string().optional(),
        zucchettiPriceList: z.string().optional(),
        customerType: z.string().optional(),
        fido: z.number().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    
    const updateData: any = { ...data };
    
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    delete updateData.password;

    try {
      const user = await b2bPrisma.b2BUser.update({
        where: { id },
        data: updateData
      });
      return { success: true, user };
    } catch (e) {
      return reply.code(400).send({ error: 'Utente non trovato o errore database' });
    }
  });

  // DELETE /api/admin/b2b-users/:id
  app.delete('/b2b-users/:id', async (request) => {
    const { id } = request.params as { id: string };
    await b2bPrisma.b2BUser.delete({ where: { id } });
    return { success: true };
  });

  // GET /api/admin/zucchetti/customers/search
  app.get('/zucchetti/customers/search', {
    schema: {
      querystring: z.object({ q: z.string() })
    }
  }, async (request, reply) => {
    const { q } = request.query;
    if (!q || q.length < 3) return { results: [] };
    
    try {
      // In attesa che Zucchetti abiliti la query 'ZelClientiB2B' o similare, 
      // la chiamiamo in via teorica.
      const rawRes: any = await zucchettiClient.query('ZelClientiB2B', { search: q });
      
      // Assumiamo che ritorni un array di risultati con questi campi
      // Se Zucchetti ritorna XML, il pacchetto la converte in JSON.
      // Dobbiamo estrarre la lista, per ora restituiamo un mock se la query non esiste (es. HTTP 404).
      return { results: rawRes };
    } catch (error: any) {
      if (error.message.includes('404')) {
         // Mock per testare UI in attesa della query Zucchetti
         return {
           results: [
             { zucchettiCode: 'C0001', companyName: 'Mock Ferramenta Srl', vatNumber: '01234567890', fido: 5000, zucchettiPriceList: 'L01', customerType: 'RIV' },
             { zucchettiCode: 'C0002', companyName: 'Mock Installatore Mario', vatNumber: '09876543210', fido: 1000, zucchettiPriceList: 'L02', customerType: 'INS' }
           ].filter(c => c.companyName.toLowerCase().includes(q.toLowerCase()) || c.vatNumber.includes(q))
         };
      }
      return reply.code(500).send({ error: 'Errore Zucchetti SDK: ' + error.message });
    }
  });
}
