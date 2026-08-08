import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const carts = await prisma.cartSyncQueue.count();
  const mJobs = await prisma.marketingJob.count();
  const pJobs = await prisma.pushJob.count();
  const events = await prisma.marketingEvent.count();
  
  console.log('=== STATS DATABASE ===');
  console.log(`CartSyncQueue (Carrelli): ${carts}`);
  console.log(`MarketingJob (Email Inviate): ${mJobs}`);
  console.log(`PushJob (Push Inviate): ${pJobs}`);
  console.log(`MarketingEvent (Eventi Utente): ${events}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
