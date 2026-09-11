import { prisma } from '@archelia/database';

async function main() {
  const raw = await prisma.elmarkRawProduct.findFirst();
  if(raw) console.log(Object.keys(raw.rawData));
  else console.log("No data");
}
main();
