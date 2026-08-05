import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.customerMapping.count();
  console.log('Total customers in db:', c);
  
  const cList = await prisma.customerMapping.findMany({ take: 2 });
  console.log('Sample:', cList);
}

main().catch(console.error).finally(() => process.exit(0));
