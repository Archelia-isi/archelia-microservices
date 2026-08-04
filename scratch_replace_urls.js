const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/ui-server/src/**/*.tsx');
let changed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  if (content.includes("const API_URL = import.meta.env.VITE_API_URL || 'https://api-gateway-production-2ec6.up.railway.app';")) {
    newContent = content.replace(
      "const API_URL = import.meta.env.VITE_API_URL || 'https://api-gateway-production-2ec6.up.railway.app';",
      "const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');"
    );
  }
  
  if (content.includes("const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';")) {
    newContent = content.replace(
      "const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';",
      "const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');"
    );
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
    console.log('Fixed', file);
  }
}
console.log('Total fixed:', changed);
