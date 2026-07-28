import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const poolProd = new Pool({ connectionString: prodUrl });

async function check() {
  try {
    const res1 = await poolProd.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'zel_shopify_order'`);
    console.log('zel_shopify_order columns:', res1.rows.map(r => r.column_name).join(', '));
    
    const res2 = await poolProd.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'zel_zucchetti_order_queue'`);
    console.log('zel_zucchetti_order_queue columns:', res2.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  } finally {
    poolProd.end();
  }
}

check();
