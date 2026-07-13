const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.marketingJob.count();
  const pushes = await prisma.pushJob.count();
  console.log(`MarketingJobs: ${jobs}, PushJobs: ${pushes}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
