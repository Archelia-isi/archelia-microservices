const fs = require('fs');
const path = require('path');

const brainDir = '/Users/salvatoreizzo/.gemini/antigravity/brain/69148b4c-026b-4a49-8b21-71b959f64e4e';
const publicIconsDir = '/Users/salvatoreizzo/Library/Mobile Documents/com~apple~CloudDocs/Archelia/archelia-microservices/apps/ui-server/public/icons/themes';
const apps = ['dashboard', 'orders', 'products', 'settings', 'equalizzatore', 'marketing', 'email_builder', 'promo-manual', 'os-settings', 'promo_auto', 'infinity', 'images', 'typesense', 'analytics', 'logs'];
const themes = ['retro', 'panic', 'zen', 'matrix', 'kawaii', 'cartoon', 'neon'];

if (!fs.existsSync(publicIconsDir)) fs.mkdirSync(publicIconsDir, { recursive: true });

themes.forEach(theme => {
  const themeDir = path.join(publicIconsDir, theme);
  if (!fs.existsSync(themeDir)) fs.mkdirSync(themeDir);
  
  // Trova il file icon_<theme>_*.jpg
  const files = fs.readdirSync(brainDir);
  const iconFile = files.find(f => f.startsWith(`icon_${theme}_`) && f.endsWith('.jpg'));
  
  if (iconFile) {
    const srcPath = path.join(brainDir, iconFile);
    apps.forEach(app => {
      const destPath = path.join(themeDir, `${app}.jpg`);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${theme} icon for app ${app}`);
    });
  } else {
    console.error(`Icon for ${theme} not found!`);
  }
});
