import { prisma } from './src/index.js';

async function run() {
  const configs = await prisma.schedulerConfig.findMany();
  console.log(JSON.stringify(configs, null, 2));
}

run().finally(() => prisma.$disconnect());
