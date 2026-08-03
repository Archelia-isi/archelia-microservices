import { prisma } from '@archelia/database';

async function main() {
  const qCount = await prisma.orderQueue.count();
  const zCount = await prisma.zelShopifyOrder.count();
  console.log({ qCount, zCount });
}
main().catch(console.error).finally(() => process.exit(0));
