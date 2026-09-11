import 'dotenv/config';
import { prisma } from '@archelia/database';

async function run() {
  console.log("Updating publishedOnB2b in Database...");
  const result = await prisma.product.updateMany({
    where: { publishedOnWeb: true },
    data: { publishedOnB2b: true }
  });
  console.log(`Updated ${result.count} products in DB.`);
}
run();
