import { prisma } from '@archelia/database';
async function main() {
  console.log('Testing connection...');
  const count = await prisma.elmarkProcessedProduct.count();
  console.log('Count:', count);
  const one = await prisma.elmarkProcessedProduct.findFirst();
  console.log('One ID:', one?.id);
}
main().catch(console.error).finally(() => process.exit(0));
