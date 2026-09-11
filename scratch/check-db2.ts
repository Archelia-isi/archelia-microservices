import { prisma } from '@archelia/database';
async function main() {
  const p = await prisma.product.findUnique({ where: { sku: 'CA1.KOSH001' } });
  console.log('lastSyncedPrice:', p?.lastSyncedPrice);
  console.log('price:', p?.price);
  console.log('priceB2b:', p?.priceB2b);
  console.log('updatedAt:', p?.updatedAt);
}
main().catch(console.error);
