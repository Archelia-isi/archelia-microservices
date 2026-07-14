import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasselli = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: 'tassell', mode: 'insensitive' } },
        { title: { contains: 'trapan', mode: 'insensitive' } }
      ]
    }
  });

  console.log('Tasselli e Trapani trovati:', tasselli.length);
  tasselli.forEach(t => console.log(t.sku, t.title));
}

main().catch(console.error).finally(() => prisma.$disconnect());
