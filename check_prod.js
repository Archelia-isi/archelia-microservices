const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isRoot: true,
        createdAt: true
      }
    });
    console.log(JSON.stringify(users, null, 2));
    
    // Controlla se c'è "Salvatore" (maiuscolo) e, nel caso, proponiamo di rimuoverlo
    const fakeSalvatore = users.find(u => u.username === 'Salvatore');
    if (fakeSalvatore) {
      console.log('FOUND FAKE SALVATORE:', fakeSalvatore.id);
      await prisma.adminUser.delete({ where: { id: fakeSalvatore.id } });
      console.log('Successfully deleted the automatically generated Salvatore from Production.');
    } else {
      console.log('No fake Salvatore found in Production.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
