import { prisma } from '@archelia/database';

async function main() {
  const res = await prisma.$queryRaw`SELECT DISTINCT discgroup as d FROM "elmark_processed_products" WHERE discgroup IS NOT NULL ORDER BY d`;
  console.log(res);
}
main();
