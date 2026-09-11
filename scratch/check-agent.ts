import { prisma } from '@archelia/b2b-database';

async function main() {
  const agents = await prisma.b2BUser.findMany({
    where: { role: 'AGENT' }
  });
  console.log("AGENTS:");
  console.log(JSON.stringify(agents, null, 2));
}
main().catch(console.error);
