import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@archelia/database';
import { env, log } from '@archelia/core';
import { encryptPassword, decryptPassword } from '../utils/crypto';

// Default to a fallback secret if not in env, for safety during development
const JWT_SECRET = env.JWT_SECRET || 'secret-key-super-sicura-1234';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  permissions?: any;
  isRoot?: boolean;
}

// Authentication Hook
export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};

// Admin Authorization Hook (MASTER or ADMIN)
export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  await authenticate(request, reply);
  const user = (request as any).user as JwtPayload;
  if (user?.role !== 'ADMIN' && user?.role !== 'MASTER') {
    return reply.status(403).send({ error: 'Forbidden: Admin only' });
  }
};

export async function authRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get('/api/auth/debug-db', async () => {
    return { 
      url: process.env.DATABASE_URL?.substring(0, 40) + '...',
      userCount: await prisma.adminUser.count()
    };
  });

  fastify.addHook('onReady', async () => {
    try {
      const adminExists = await prisma.adminUser.findUnique({ where: { username: 'Salvatore' } });
      if (!adminExists) {
        const passwordHash = await bcrypt.hash('Salvatore', 10);
        const { encryptedPassword, encryptionIv } = encryptPassword('Salvatore');
        await prisma.adminUser.create({
          data: {
            username: 'Salvatore',
            passwordHash,
            encryptedPassword,
            encryptionIv,
            role: 'MASTER',
            isRoot: true,
            permissions: { allowedStores: ["RETAIL", "B2B"] },
            displayName: 'Salvatore'
          }
        });
        log.info('✅ Default ROOT MASTER user created (Salvatore)', { module: 'api-gateway:auth' });
      }
    } catch (e) {
      log.error('Error creating default master', { error: e, module: 'api-gateway:auth' });
    }
  });

  fastify.post('/api/auth/login', {
    schema: {
      body: z.object({
        username: z.string().min(1, 'Username is required'),
        password: z.string().min(1, 'Password is required')
      }),
      response: {
        200: z.object({
          token: z.string(),
          user: z.object({
            id: z.string(),
            username: z.string(),
            role: z.string(),
            displayName: z.string().nullable(),
            permissions: z.any().optional(),
            isRoot: z.boolean().optional()
          })
        }),
        401: z.object({
          error: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body;

    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return reply.status(401).send({ error: 'Credenziali non valide' });

    let isValid = false;
    if (user.passwordHash.length === 64) {
      // Legacy SHA-256 for backward compatibility if any
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      isValid = hash === user.passwordHash;
    } else {
      // Bcrypt
      isValid = await bcrypt.compare(password, user.passwordHash);
    }
    
    if (!isValid) return reply.status(401).send({ error: 'Credenziali non valide' });

    // FORZATURA ASSOLUTA: Salvatore è sempre MASTER e isRoot, a prescindere da cosa dice il DB (sia esso prod o dev)
    if (user.username.toLowerCase() === 'salvatore') {
      user.role = 'MASTER';
      user.isRoot = true;
    }

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role, permissions: user.permissions, isRoot: user.isRoot };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Aggiorna ultimo login in background per non bloccare la request
    prisma.adminUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(err => {
      log.error('Failed to update last login', { error: err, module: 'api-gateway:auth' });
    });

    return reply.status(200).send({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        displayName: user.displayName,
        permissions: user.permissions,
        isRoot: user.isRoot
      } 
    });
  });

  fastify.get('/api/auth/me', { 
    preHandler: [authenticate],
    schema: {
      response: {
        200: z.object({
          user: z.object({
            userId: z.string(),
            username: z.string(),
            role: z.string(),
            permissions: z.any().optional(),
            isRoot: z.boolean().optional()
          })
        }),
        401: z.object({
          error: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user as JwtPayload;
    return reply.status(200).send({ user });
  });

  fastify.get('/api/auth/users', { 
    preHandler: [requireAdmin],
    schema: {
      response: {
        200: z.array(z.object({
          id: z.string(),
          username: z.string(),
          role: z.string(),
          displayName: z.string().nullable(),
          lastLogin: z.date().nullable(),
          createdAt: z.date(),
          createdById: z.string().nullable(),
          isRoot: z.boolean(),
          permissions: z.any(),
          rawPassword: z.string().nullable()
        })),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const caller = (request as any).user as JwtPayload;
    
    // Master vede tutti, Admin vede solo quelli che ha creato o che gli sono stati assegnati
    const whereClause = caller.role === 'MASTER' ? {} : { createdById: caller.userId };

    const users = await prisma.adminUser.findMany({
      where: whereClause,
      select: { id: true, username: true, role: true, displayName: true, lastLogin: true, createdAt: true, createdById: true, isRoot: true, permissions: true, encryptedPassword: true, encryptionIv: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const mappedUsers = users.map(u => {
      let rawPassword = null;
      if (u.encryptedPassword && u.encryptionIv) {
         rawPassword = decryptPassword(u.encryptedPassword, u.encryptionIv);
      }
      
      // FORZATURA ASSOLUTA per visualizzazione
      if (u.username.toLowerCase() === 'salvatore') {
        u.role = 'MASTER';
        u.isRoot = true;
      }
      
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        displayName: u.displayName,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        isRoot: u.isRoot,
        permissions: u.permissions || {},
        createdById: u.createdById,
        rawPassword
      };
    });

    return reply.status(200).send(mappedUsers);
  });

  fastify.post('/api/auth/users', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        displayName: z.string().optional(),
        role: z.enum(['MASTER', 'ADMIN', 'OPERATOR', 'AGENT', 'VIEWER']),
        permissions: z.any().optional()
      }),
      response: {
        200: z.object({
          id: z.string(),
          username: z.string(),
          role: z.string(),
          displayName: z.string().nullable()
        }),
        400: z.object({ error: z.string() }),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const caller = (request as any).user as JwtPayload;
    
    // FORZATURA ASSOLUTA: Salvatore ha sempre poteri MASTER, anche se il token è vecchio
    if (caller.username.toLowerCase() === 'salvatore') {
      caller.role = 'MASTER';
      caller.isRoot = true;
    }

    const { username, password, displayName, role, permissions } = request.body;

    // RBAC Validation
    if (caller.role === 'ADMIN' && (role === 'MASTER' || role === 'ADMIN')) {
      return reply.status(403).send({ error: 'Gli Admin possono creare solo Operatori, Agenti o Visitatori.' });
    }

    const exists = await prisma.adminUser.findUnique({ where: { username } });
    if (exists) return reply.status(400).send({ error: 'Username già in uso' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { encryptedPassword, encryptionIv } = encryptPassword(password);
    
    const user = await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
        encryptedPassword,
        encryptionIv,
        role,
        displayName: displayName || username,
        createdById: caller.userId,
        permissions: permissions || {}
      },
      select: { id: true, username: true, role: true, displayName: true }
    });

    return reply.status(200).send(user);
  });
  
  // Aggiungiamo anche il PUT e DELETE per completezza di gestione utenti
  fastify.put('/api/auth/users/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        id: z.string()
      }),
      body: z.object({
        username: z.string().min(3).optional(),
        password: z.string().min(6).optional(),
        displayName: z.string().optional(),
        role: z.enum(['MASTER', 'ADMIN', 'OPERATOR', 'AGENT', 'VIEWER']).optional(),
        permissions: z.any().optional(),
        createdById: z.string().optional().nullable()
      })
    }
  }, async (request, reply) => {
    const caller = (request as any).user as JwtPayload;
    const { id } = request.params;
    const updateData = request.body;
    
    const targetUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetUser) return reply.status(404).send({ error: 'Utente non trovato' });
    
    if (targetUser.isRoot && caller.userId !== targetUser.id) {
       return reply.status(403).send({ error: 'Nessuno può modificare il Master Fondatore.' });
    }
    
    if (caller.role === 'ADMIN' && targetUser.createdById !== caller.userId) {
       return reply.status(403).send({ error: 'Puoi modificare solo gli utenti della tua squadra.' });
    }
    
    if (caller.role === 'ADMIN' && updateData.role && (updateData.role === 'MASTER' || updateData.role === 'ADMIN')) {
       return reply.status(403).send({ error: 'Non hai i permessi per assegnare questo ruolo.' });
    }

    const dataToUpdate: any = { ...updateData };
    if (updateData.password) {
       dataToUpdate.passwordHash = await bcrypt.hash(updateData.password, 10);
       const { encryptedPassword, encryptionIv } = encryptPassword(updateData.password);
       dataToUpdate.encryptedPassword = encryptedPassword;
       dataToUpdate.encryptionIv = encryptionIv;
       delete dataToUpdate.password;
    }
    
    const updated = await prisma.adminUser.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, username: true, role: true, displayName: true, permissions: true, createdById: true }
    });
    
    return reply.status(200).send(updated);
  });
  
  fastify.delete('/api/auth/users/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: z.object({
        id: z.string()
      })
    }
  }, async (request, reply) => {
    const caller = (request as any).user as JwtPayload;
    const { id } = request.params;
    
    const targetUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetUser) return reply.status(404).send({ error: 'Utente non trovato' });
    
    if (targetUser.isRoot) {
       return reply.status(403).send({ error: 'Il Master Fondatore non può essere eliminato.' });
    }
    
    if (caller.role === 'ADMIN' && targetUser.createdById !== caller.userId) {
       return reply.status(403).send({ error: 'Puoi eliminare solo gli utenti della tua squadra.' });
    }
    
    await prisma.adminUser.delete({ where: { id } });
    return reply.status(200).send({ success: true });
  });
}

