import { prisma } from '@archelia/database';

async function main() {
  console.log('Connecting to DB...');
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

main().then(() => process.exit(0)).catch(console.error);
