const { PrismaClient } = require('./packages/b2b-database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.b2BOrder.findMany({
    where: { storeMode: 'ZUCCHETTI' },
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });

  let fixed = 0;
  for (const order of orders) {
    if (order.notes && order.notes.includes('ELMARK')) {
      await prisma.b2BOrder.update({
        where: { id: order.id },
        data: { storeMode: 'ELMARK' }
      });
      fixed++;
      console.log(`Fixed order ${order.id}`);
    }
  }
  console.log(`Total fixed: ${fixed}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
