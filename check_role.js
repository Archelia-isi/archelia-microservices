const { prisma } = require('./packages/database/dist/index.js');
async function main() {
  const user = await prisma.adminUser.findUnique({ where: { username: 'Salvatore' } });
  console.log('Salvatore role is:', user?.role);
}
main().catch(console.error).finally(() => prisma.$disconnect());
