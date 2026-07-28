import { prisma } from './index.ts';
async function main() {
  const config = await prisma.marketingSettings.findUnique({ where: { id: "marketing_config" } });
  console.log(JSON.stringify(config, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
