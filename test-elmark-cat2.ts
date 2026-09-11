import { prisma } from '@archelia/database';

async function main() {
  const res = await prisma.$queryRaw`SELECT DISTINCT "rawData"->>'category' as cat FROM "elmark_raw_products" WHERE "rawData"->>'category' IS NOT NULL ORDER BY cat`;
  console.log(res);
}
main();
