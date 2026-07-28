const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.logEntry.createMany({
    data: [
      { category: 'api-gateway', level: 'INFO', message: '🚀 API Gateway avviato su porta 3000', details: JSON.stringify({ module: 'api-gateway' }) },
      { category: 'api-gateway', level: 'INFO', message: '✅ Default ADMIN user created (Salvatore)', details: JSON.stringify({ module: 'api-gateway:auth' }) },
      { category: 'api-gateway', level: 'WARN', message: 'Nessun task in coda', details: JSON.stringify({ module: 'api-gateway:scheduler' }) },
      { category: 'worker-promo', level: 'INFO', message: 'Worker Promo inizializzato', details: JSON.stringify({ module: 'worker-promo' }) },
      { category: 'worker-promo', level: 'INFO', message: 'Sincronizzazione offerte completata', details: JSON.stringify({ items: 45 }) }
    ]
  });
  console.log("Seeded logs.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
