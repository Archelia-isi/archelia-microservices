const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.logEntry.count();
  console.log("Total logs in DB:", count);
  if (count > 0) {
    const logs = await prisma.logEntry.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log("Latest logs:", logs.map(l => l.message));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
