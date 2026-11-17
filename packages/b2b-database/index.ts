import { PrismaClient } from '@prisma/client-b2b';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForB2bPrisma = globalThis as unknown as {
  b2bPrisma: PrismaClientSingleton | undefined;
};

export const b2bPrisma = globalForB2bPrisma.b2bPrisma ?? prismaClientSingleton();
export const prisma = b2bPrisma;

if (process.env.NODE_ENV !== 'production') globalForB2bPrisma.b2bPrisma = b2bPrisma;

export * from '@prisma/client-b2b';
