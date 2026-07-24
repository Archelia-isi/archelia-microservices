const { prisma } = require('@archelia/database');
async function main() {
  const configs = await prisma.schedulerConfig.findMany();
  console.log(configs.map(c => c.jobId));
}
main().catch(console.error).finally(() => prisma.$disconnect());
