import { prisma } from './packages/b2b-database/dist/index.js';

async function main() {
  const carts = await prisma.b2BCart.findMany({
    where: { cartType: 'ELMARK' },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(carts, null, 2));
}
main().catch(console.error);
