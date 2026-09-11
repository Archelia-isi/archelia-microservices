import { PrismaClient } from '@prisma/client-b2b'; const p = new PrismaClient(); p.b2BOrder.findMany().then(console.log);
