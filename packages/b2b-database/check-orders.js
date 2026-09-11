import { prisma } from './dist/index.js'; prisma.b2BOrder.findMany().then(console.log);
