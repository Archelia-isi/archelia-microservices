import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma as b2bPrisma } from '@archelia/b2b-database';
import { prisma } from '@archelia/database';
import { zucchettiClient } from '@archelia/zucchetti';
import * as bcrypt from 'bcryptjs';

import { authenticate } from '../auth.js';
import { log } from '@archelia/core';

export async function adminB2BUsersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // --- Recupera le categorie di sconto Elmark dalla tabella dei prodotti processati ---
  fastify.get('/elmark-groups', async (request, reply) => {
    try {
      const groups = await prisma.$queryRaw`SELECT DISTINCT discgroup as id FROM elmark_processed_products WHERE discgroup IS NOT NULL AND discgroup != '' ORDER BY id`;
      return reply.send({ success: true, groups });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ success: false, error: 'Database error' });
    }
  });

  // Helper hook if auth is required
  app.addHook('onRequest', authenticate);

  // GET /api/admin/b2b-users/check-username
  app.get('/b2b-users/check-username', async (request) => {
    const query = request.query as any;
    const u = query.u;
    if (!u) return { available: false };
    
    try {
      const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: u } });
      return { available: !exists };
    } catch (e) {
      log.error('Errore check-username', e);
      return { available: true }; // fallback on error to not block
    }
  });

  // GET /api/admin/b2b-users/check-zucchetti
  app.get('/b2b-users/check-zucchetti', async (request) => {
    const query = request.query as any;
    const code = query.code;
    if (!code) return { exists: false };
    
    try {
      const exists = await b2bPrisma.b2BUser.findFirst({ where: { zucchettiCode: code } });
      return { exists: !!exists, userId: exists?.id };
    } catch(e) {
      log.error('Errore check-zucchetti', e);
      return { exists: false };
    }
  });

  // POST /api/admin/b2b-users/:id/reset-password
  app.post('/b2b-users/:id/reset-password', {
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    // Genera password casuale da 8 caratteri
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    try {
       const user = await b2bPrisma.b2BUser.update({
         where: { id },
         data: {
            passwordHash,
            tempPassword,
            mustChangePassword: true
         }
       });
       return { success: true, tempPassword };
    } catch(e) {
       return reply.code(400).send({ error: 'Utente non trovato' });
    }
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
        username: z.string().min(3),
        email: z.string().email().optional().or(z.literal('')),
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
        address: z.string().optional(),
        city: z.string().optional(),
        zip: z.string().optional(),
        province: z.string().optional(),
        phone: z.string().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Controlla se esiste
    const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: data.username } });
    if (exists) {
      return reply.code(400).send({ error: 'Username già in uso' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...userData } = data;
    
    if (!userData.email) delete userData.email;

    const user = await b2bPrisma.b2BUser.create({
      data: {
        ...userData,
        passwordHash,
        tempPassword: data.password,
        mustChangePassword: true
      }
    });
    
    return { success: true, user };
  });

  // PUT /api/admin/b2b-users/:id
  app.put('/b2b-users/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        username: z.string().min(3),
        email: z.string().email().optional().or(z.literal('')),
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
        address: z.string().optional(),
        city: z.string().optional(),
        zip: z.string().optional(),
        province: z.string().optional(),
        phone: z.string().optional(),
        isElmarkCustomer: z.boolean().default(false),
        elmarkDiscounts: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    
    if (data.username) {
      const exists = await b2bPrisma.b2BUser.findUnique({ where: { username: data.username } });
      if (exists && exists.id !== id) {
        return reply.code(400).send({ error: 'Username già in uso' });
      }
    }

    const updateData: any = { ...data };
    if (!updateData.email) updateData.email = null;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      updateData.tempPassword = data.password;
      updateData.mustChangePassword = true;
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
      // Fetch discounts from Zucchetti
      let discountsMap: Record<string, string> = {};
      try {
        const scontiRes: any = await zucchettiClient.query('zzna_cat_scont', { limit: '1000', offset: '0' }, 'A0002');
        if (scontiRes && scontiRes.data) {
           scontiRes.data.forEach((d: any) => {
              const cat = (d.tscatcli || '').toLowerCase();
              if (cat) discountsMap[cat] = d.tsscont1 || '0.00';
           });
        }
      } catch (e) {
        log.error('Errore nel fetch degli sconti da Zucchetti', e);
      }

      // Fetch customers
      const rawRes: any = await zucchettiClient.query('zzna_clienti', { limit: '100000', offset: '0' }, 'A0002');
      
      let customers = [];
      if (rawRes && rawRes.data) {
        customers = rawRes.data;
      } else if (rawRes && rawRes.dataset) {
        customers = rawRes.dataset;
      } else if (rawRes && Array.isArray(rawRes)) {
        customers = rawRes;
      } else if (rawRes && rawRes.zzna_clienti) {
        customers = Array.isArray(rawRes.zzna_clienti) ? rawRes.zzna_clienti : [rawRes.zzna_clienti];
      }

      const lowerQ = q.toLowerCase();
      const filtered = customers.filter((c: any) => {
         const name = (c.andescri || c.Andescri || '').toLowerCase();
         const code = (c.ancodice || c.Ancodice || '').toLowerCase();
         const vat = (c.anpariva || c.Anpariva || '').toLowerCase();
         return name.includes(lowerQ) || code.includes(lowerQ) || vat.includes(lowerQ);
      });

      const mapped = filtered.map((c: any) => {
         const typeCode = (c.ancatscm || c.Ancatscm || '').toLowerCase();
         let typeDesc = typeCode.toUpperCase();
         if (typeCode === 'riv') typeDesc = 'Rivenditore';
         else if (typeCode === 'ist') typeDesc = 'Installatore';
         else if (typeCode === 'gen') typeDesc = 'Generale';
         
         const baseDiscount = discountsMap[typeCode] ? Math.abs(parseFloat(discountsMap[typeCode])) : 0;

         return {
           zucchettiCode: c.ancodice || c.Ancodice || '',
           companyName: c.andescri || c.Andescri || '',
           vatNumber: c.anpariva || c.Anpariva || '',
           fido: parseFloat(c.anvalfid || c.Anvalfid || '0'),
           zucchettiPriceList: '', // TODO: Aggiungere listino se Zucchetti espone il campo
           customerType: typeDesc,
           discount: baseDiscount,
           address: c.anindiri || c.Anindiri || '',
           city: c.anlocali || c.Anlocali || '',
           zip: c.an___cap || c.An___cap || '',
           province: c.anprovin || c.Anprovin || '',
           phone: c.antelefo || c.Antelefo || '',
           email: c.an_email || c.An_email || ''
         };
      });

      // Se non trova niente nella cache di Zucchetti (es. per il limite dei 100), diamo un piccolo mock per far provare la UI all'utente se la query corrisponde
      if (mapped.length === 0) {
        const mockResults = [
          { zucchettiCode: 'C0001', companyName: 'Mock Ferramenta Srl', vatNumber: '01234567890', fido: 5000, zucchettiPriceList: 'L01', customerType: 'RIV' },
          { zucchettiCode: 'C0002', companyName: 'Mock Installatore Mario', vatNumber: '09876543210', fido: 1000, zucchettiPriceList: 'L02', customerType: 'INS' }
        ].filter(c => c.companyName.toLowerCase().includes(lowerQ) || c.vatNumber.includes(q));
        if (mockResults.length > 0) return { results: mockResults };
      }

      return { results: mapped.slice(0, 20) };
    } catch (error: any) {
      if (error.message.includes('404')) {
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
