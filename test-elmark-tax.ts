import { prisma } from '@archelia/database';

async function main() {
  const cats = await prisma.$queryRaw`SELECT DISTINCT category FROM elmark_processed_products WHERE category IS NOT NULL LIMIT 10`;
  const fams = await prisma.$queryRaw`SELECT DISTINCT family FROM elmark_processed_products WHERE family IS NOT NULL LIMIT 10`;
  const pgs = await prisma.$queryRaw`SELECT DISTINCT "productGroup" FROM elmark_processed_products WHERE "productGroup" IS NOT NULL LIMIT 10`;
  
  console.log("Categories:", cats);
  console.log("Families:", fams);
  console.log("Product Groups:", pgs);
}
main();
