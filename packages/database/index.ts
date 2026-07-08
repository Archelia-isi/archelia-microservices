import { PrismaClient } from '@prisma/client';

// Evita che Prisma apra connessioni infinite durante lo sviluppo (hot-reloading)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
