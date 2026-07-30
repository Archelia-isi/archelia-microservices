const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'apps', 'ui-server', 'src', 'components', 'os', 'widgets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Widget.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Trova tutti i div con flex: 1 e flexDirection: 'column' o omettendo minHeight
  content = content.replace(/flex: 1,\s*display: 'flex',\s*flexDirection: 'column'/g, "flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0");
  // Per sicurezza, se era già minHeight: 0, non raddoppiarlo (o usa una regex più complessa)
  content = content.replace(/minHeight: 0, minHeight: 0/g, "minHeight: 0");
  
  // Aggiungiamo minHeight: 0 anche ai div di overflow generici
  content = content.replace(/flex: 1,\s*overflowY: 'auto'/g, "flex: 1, minHeight: 0, overflowY: 'auto'");
  content = content.replace(/minHeight: 0, minHeight: 0/g, "minHeight: 0");

  fs.writeFileSync(filePath, content);
}
console.log('Flex containers patched');
