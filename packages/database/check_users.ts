import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function check() {
  const poolProd = new Pool({ connectionString: prodUrl });
  const prismaProd = new PrismaClient({ adapter: new PrismaPg(poolProd) });

  const usersProd = await prismaProd.equalizzatoreUser.count();
  const prefsProd = await prismaProd.userPreference.count();
  console.log(`Users in prod: ${usersProd}, Prefs in prod: ${prefsProd}`);
  
  poolProd.end();
}

check();
