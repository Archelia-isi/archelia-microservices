import { prisma } from '@archelia/database';

async function main() {
  const groups = ['C', 'E1', 'E2', 'F', 'L'];
  for (const g of groups) {
    const raw = await prisma.$queryRaw`SELECT "rawData"->>'discgroup' as disc, "rawData"->>'category' as cat, "rawData" FROM "elmark_raw_products" WHERE "rawData"->>'discgroup' = ${g} LIMIT 1`;
    console.log(g, raw);
  }
}
main();
