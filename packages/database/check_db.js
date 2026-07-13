const { prisma } = require('./dist/index.js');

async function run() {
  const items = await prisma.equalizzatoreStaging.findMany({ take: 5 });
  console.log("Samples:", JSON.stringify(items, null, 2));
  const counts = await prisma.equalizzatoreStaging.groupBy({
    by: ['reviewStatus'],
    _count: { _all: true }
  });
  console.log("Counts by reviewStatus:", counts);
}
run().catch(console.error).finally(() => prisma.$disconnect());
