import { prisma } from '@archelia/database';

async function main() {
  const res = await prisma.$queryRaw`SELECT DISTINCT "rawData"->>'category_name' as cat FROM "elmark_raw_products" WHERE "rawData"->>'category_name' IS NOT NULL ORDER BY cat`;
  console.log(res);
}
main();
