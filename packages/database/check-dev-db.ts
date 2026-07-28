import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const poolDev = new Pool({ connectionString: devUrl });
const adapterDev = new PrismaPg(poolDev);
const prismaDev = new PrismaClient({ adapter: adapterDev });

async function check() {
  const count = await prismaDev.zelShopifyOrder.count();
  console.log('Orders in v2-development:', count);
}

check().catch(console.error).finally(() => prismaDev.$disconnect());
