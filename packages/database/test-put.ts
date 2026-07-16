import { prisma } from './index';

async function main() {
  const username = 'Salvatore';
  const data = {
    widgetConfig: JSON.stringify({ wallpaper: 'test_wallpaper_123', desktopIcons: {} })
  };
  console.log('Testing upsert...');
  const result = await prisma.userPreference.upsert({
    where: { username },
    create: { username, ...data },
    update: data,
  });
  console.log('Upsert successful!', result);
  
  const get = await prisma.userPreference.findUnique({ where: { username } });
  console.log('Get successful!', get);
}

main().catch(console.error).finally(() => prisma.$disconnect());
