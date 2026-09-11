import { prisma } from '@archelia/database';

async function main() {
  const users = await prisma.b2BUser.findMany({ select: { id: true, email: true, discount: true, role: true } });
  console.log(users.filter(u => u.discount > 0 || true).slice(0, 5));
}
main().catch(console.error);
