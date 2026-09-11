import { prisma } from '@archelia/database';

async function main() {
  const res = await prisma.$queryRaw`SELECT DISTINCT "rawData"->>'type' as t FROM "elmark_raw_products" WHERE "rawData"->>'type' IS NOT NULL ORDER BY t`;
  console.log(res);
}
main();
