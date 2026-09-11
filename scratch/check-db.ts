import { prisma } from '@archelia/database';
async function main() {
  const p = await prisma.product.findUnique({ where: { sku: 'CA1.KOSH001' } });
  console.log(p?.price, p?.priceB2b);
}
main().catch(console.error);
