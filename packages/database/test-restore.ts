import { prisma } from './index';

async function main() {
  const username = 'Salvatore';
  const pref = await prisma.userPreference.findUnique({ where: { username } });
  if (pref && pref.widgetConfig) {
    let conf = JSON.parse(pref.widgetConfig);
    if (conf.wallpaper === 'from_test_script') {
       conf.wallpaper = '/wallpapers/mac-dark.jpg'; // standard wallpaper
       conf.desktopIcons = {}; // reset so they go to default
       await prisma.userPreference.update({
         where: { username },
         data: { widgetConfig: JSON.stringify(conf) }
       });
       console.log('Restored config!');
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
