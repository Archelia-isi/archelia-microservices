import { PrismaClient } from '@archelia/b2b-database';
const prisma = new PrismaClient();
async function main() {
  const u = 'ferramenta.rossi';
  const exists = await prisma.b2BUser.findUnique({ where: { username: u } });
  console.log("Exists:", exists);
  console.log("Available:", !exists);
}
main();
