import { prisma } from '@archelia/core';

async function run() {
  const p = await prisma.product.findFirst({ select: { shopifyId: true, imageSrc: true }});
  console.log('Sample product:', p);
}
run().catch(console.error).finally(() => prisma.$disconnect());
