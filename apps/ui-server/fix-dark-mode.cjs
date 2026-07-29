const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.css')) results.push(file);
    }
  });
  return results;
}

const cssFiles = walk('/Users/salvatoreizzo/Library/Mobile Documents/com~apple~CloudDocs/Archelia/archelia-microservices/apps/ui-server/src');

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace background: #ffffff or #fff
  content = content.replace(/background:\s*#ffffff/gi, 'background: var(--color-surface-solid)');
  content = content.replace(/background:\s*#fff;/gi, 'background: var(--color-surface-solid);');
  
  // Replace background-color: #ffffff or #fff
  content = content.replace(/background-color:\s*#ffffff/gi, 'background-color: var(--color-surface-solid)');
  content = content.replace(/background-color:\s*#fff;/gi, 'background-color: var(--color-surface-solid);');

  // Replace background: white
  content = content.replace(/background:\s*white/gi, 'background: var(--color-surface-solid)');
  content = content.replace(/background-color:\s*white/gi, 'background-color: var(--color-surface-solid)');
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  }
});
