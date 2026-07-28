import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function syncUsersAndPrefs() {
  const poolProd = new Pool({ connectionString: prodUrl });
  const prismaProd = new PrismaClient({ adapter: new PrismaPg(poolProd) });

  const poolDev = new Pool({ connectionString: devUrl });
  const prismaDev = new PrismaClient({ adapter: new PrismaPg(poolDev) });

  try {
    console.log('Fetching users and preferences from production...');
    const users = await prismaProd.equalizzatoreUser.findMany();
    const prefs = await prismaProd.userPreference.findMany();

    console.log(`Found ${users.length} users and ${prefs.length} preferences. Syncing to v2-development...`);

    for (const user of users) {
      await prismaDev.equalizzatoreUser.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log('Users synced.');

    for (const pref of prefs) {
      await prismaDev.userPreference.upsert({
        where: { username: pref.username },
        update: pref,
        create: pref,
      });
    }
    console.log('Preferences synced.');
    console.log('Sync complete.');
  } catch (error) {
    console.error('Error syncing:', error);
  } finally {
    poolProd.end();
    poolDev.end();
  }
}

syncUsersAndPrefs();
