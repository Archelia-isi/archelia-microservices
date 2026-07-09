import { prisma } from '@archelia/database';

async function main() {
  try {
    const count = await prisma.product.count();
    console.log('Total products:', count);
    const prod = await prisma.product.findFirst();
    console.log('First product:', prod?.sku);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
