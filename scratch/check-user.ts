import { PrismaClient } from '@archelia/b2b-database';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.b2BUser.findMany({ select: { id: true, email: true, discount: true, role: true } });
  console.log(users.filter(u => u.discount > 0));
}
main().catch(console.error).finally(() => prisma.$disconnect());
