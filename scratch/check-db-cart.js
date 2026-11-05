const { PrismaClient } = require('./packages/b2b-database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const carts = await prisma.b2BCart.findMany({
    where: { cartType: 'ELMARK' },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(carts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
