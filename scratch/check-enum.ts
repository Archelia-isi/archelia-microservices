import { prisma } from '@archelia/b2b-database';

async function main() {
  const result = await prisma.$queryRaw`
    SELECT enum_range(NULL::"OrderStatus");
  `;
  console.log('OrderStatus enum values:', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
