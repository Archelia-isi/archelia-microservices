import { prisma } from '@archelia/database';

async function run() {
  const p = await prisma.product.findFirst({ select: { shopifyId: true, imageUrl: true } });
  console.log('Sample product via prisma:', p);
}

run().catch(console.error).finally(() => prisma.$disconnect());
