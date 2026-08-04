const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const poolProd = new Pool({ connectionString: prodUrl });
  const prismaProd = new PrismaClient({ adapter: new PrismaPg(poolProd) });

  const poolDev = new Pool({ connectionString: devUrl });
  const prismaDev = new PrismaClient({ adapter: new PrismaPg(poolDev) });

  try {
    console.log("Looking for fake Salvatore in v2-development...");
    const fakeDevSalvatore = await prismaDev.adminUser.findUnique({
      where: { username: 'Salvatore' }
    });

    if (fakeDevSalvatore) {
      console.log('Deleting fake Salvatore from v2-development...', fakeDevSalvatore.id);
      await prismaDev.adminUser.delete({
        where: { id: fakeDevSalvatore.id }
      });
      console.log('Successfully deleted fake Salvatore.');
    } else {
      console.log('No fake Salvatore found in v2-development.');
    }

    console.log("Fetching preferences from Prod...");
    const prodPrefs = await prismaProd.userPreference.findUnique({
      where: { username: 'salvatore' }
    });

    if (!prodPrefs) {
      console.log('No preferences found in Prod for salvatore.');
    } else {
      console.log("Migrating preferences to Dev...", prodPrefs);
      const result = await prismaDev.userPreference.upsert({
        where: { username: 'salvatore' },
        update: {
          widgetConfig: prodPrefs.widgetConfig,
          theme: prodPrefs.theme
        },
        create: {
          username: 'salvatore',
          widgetConfig: prodPrefs.widgetConfig,
          theme: prodPrefs.theme
        }
      });
      console.log('Successfully migrated preferences:', result);
    }
    
    // Check ferdinando just in case
    const prodFerdPrefs = await prismaProd.userPreference.findUnique({
      where: { username: 'ferdinando' }
    });
    
    if (prodFerdPrefs) {
      console.log("Migrating ferdinando preferences to Dev...");
      await prismaDev.userPreference.upsert({
        where: { username: 'ferdinando' },
        update: {
          widgetConfig: prodFerdPrefs.widgetConfig,
          theme: prodFerdPrefs.theme
        },
        create: {
          username: 'ferdinando',
          widgetConfig: prodFerdPrefs.widgetConfig,
          theme: prodFerdPrefs.theme
        }
      });
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prismaProd.$disconnect();
    await prismaDev.$disconnect();
  }
}
main();
