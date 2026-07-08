import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@archelia/database';
import { env, log } from '@archelia/core';

// Default to a fallback secret if not in env, for safety during development
const JWT_SECRET = env.JWT_SECRET || 'secret-key-super-sicura-1234';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
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

// Admin Authorization Hook
export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  await authenticate(request, reply);
  const user = (request as any).user as JwtPayload;
  if (user?.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Forbidden: Admin only' });
  }
};

export async function authRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.addHook('onReady', async () => {
    try {
      const adminExists = await prisma.equalizzatoreUser.findUnique({ where: { username: 'Salvatore' } });
      if (!adminExists) {
        const passwordHash = await bcrypt.hash('Salvatore', 10);
        await prisma.equalizzatoreUser.create({
          data: {
            username: 'Salvatore',
            passwordHash,
            rawPassword: 'Salvatore',
            role: 'ADMIN',
            displayName: 'Salvatore'
          }
        });
        log.info('✅ Default ADMIN user created (Salvatore)', { module: 'api-gateway:auth' });
      }
    } catch (e) {
      log.error('Error creating default admin', { error: e, module: 'api-gateway:auth' });
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
            displayName: z.string().nullable()
          })
        }),
        401: z.object({
          error: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body;

    const user = await prisma.equalizzatoreUser.findUnique({ where: { username } });
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

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Aggiorna ultimo login in background per non bloccare la request
    prisma.equalizzatoreUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(err => {
      log.error('Failed to update last login', { error: err, module: 'api-gateway:auth' });
    });

    return reply.status(200).send({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        displayName: user.displayName 
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
            role: z.string()
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
          rawPassword: z.string().nullable()
        })),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const users = await prisma.equalizzatoreUser.findMany({
      select: { id: true, username: true, role: true, displayName: true, lastLogin: true, createdAt: true, rawPassword: true },
      orderBy: { createdAt: 'desc' }
    });
    return reply.status(200).send(users);
  });

  fastify.post('/api/auth/users', { 
    preHandler: [requireAdmin],
    schema: {
      body: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        displayName: z.string().optional()
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
    const { username, password, displayName } = request.body;

    const exists = await prisma.equalizzatoreUser.findUnique({ where: { username } });
    if (exists) return reply.status(400).send({ error: 'Username già in uso' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.equalizzatoreUser.create({
      data: {
        username,
        passwordHash,
        rawPassword: password,
        role: 'OPERATOR',
        displayName: displayName || username
      },
      select: { id: true, username: true, role: true, displayName: true }
    });

    return reply.status(200).send(user);
  });
}
