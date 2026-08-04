import { prisma } from '@archelia/database';
async function main() {
  const users = await prisma.adminUser.findMany({ select: { id: true, username: true, email: true } });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => process.exit(0));
