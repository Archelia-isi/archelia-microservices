import { PrismaClient } from '@prisma/client';
import fs from 'fs';

process.env.DATABASE_URL = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prisma = new PrismaClient();

async function main() {
  console.log('Leggo ordini dalla produzione...');
  const prodOrders = await prisma.zelShopifyOrder.findMany({
    include: { zucchettiQueue: true }
  });
  console.log(`Trovati ${prodOrders.length} ordini in produzione.`);
  fs.writeFileSync('orders_dump.json', JSON.stringify(prodOrders, null, 2));
  console.log('Salvato in orders_dump.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
