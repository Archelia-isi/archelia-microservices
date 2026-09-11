import { prisma } from '@archelia/database';
async function main() {
  const count = await prisma.product.count({ where: { priceB2b: { gt: 0 } } });
  console.log('Count of products with priceB2b > 0:', count);
}
main().catch(console.error);
