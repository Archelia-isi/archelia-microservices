const { prisma } = require('@archelia/database');
async function main() {
  const configs = await prisma.schedulerConfig.findMany();
  console.log(JSON.stringify(configs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
