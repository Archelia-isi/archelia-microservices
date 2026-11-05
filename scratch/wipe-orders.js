const { prisma } = require('@archelia/b2b-database');

async function main() {
  console.log('Wiping B2BCartItem...');
  await prisma.b2BCartItem.deleteMany({});
  
  console.log('Wiping B2BCart...');
  await prisma.b2BCart.deleteMany({});
  
  console.log('Wiping B2BOrderItem...');
  await prisma.b2BOrderItem.deleteMany({});
  
  console.log('Wiping B2BOrder...');
  await prisma.b2BOrder.deleteMany({});
  
  console.log('Database wiped successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
