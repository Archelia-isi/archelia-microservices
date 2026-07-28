import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const poolProd = new Pool({ connectionString: prodUrl });
const adapterProd = new PrismaPg(poolProd);
const prismaProd = new PrismaClient({ adapter: adapterProd });

async function check() {
  try {
    const data = await prismaProd.zelShopifyOrder.findMany({
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
      include: { zucchettiQueue: true }
    });
    console.log(`Trovati ${data.length} ordini. Primo ordine:`, data[0]);
  } catch (e) {
    console.error('Errore query:', e);
  } finally {
    poolProd.end();
  }
}

check();
