import 'dotenv/config';
import { prisma } from '@archelia/database';

async function run() {
  const count = await prisma.product.count({ where: { publishedOnB2b: true } });
  console.log(`Products with publishedOnB2b=true: ${count}`);
}
run();
