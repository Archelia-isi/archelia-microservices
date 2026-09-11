const { PrismaClient } = require('@archelia/database');
const prisma = new PrismaClient();

async function main() {
  const raw = await prisma.elmarkRawProduct.findFirst();
  console.log(Object.keys(raw.rawData));
  console.log(raw.rawData.category_name, raw.rawData.category_path);
  
  // Get distinct categories
  const res = await prisma.$queryRaw`SELECT DISTINCT "rawData"->>'category_name' as cat FROM "elmark_raw_products" WHERE "rawData"->>'category_name' IS NOT NULL ORDER BY cat`;
  console.log(res);
}
main();
