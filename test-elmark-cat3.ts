import { prisma } from '@archelia/database';

async function main() {
  const raw = await prisma.elmarkRawProduct.findFirst();
  if(raw) console.log(raw.rawData.category);
}
main();
