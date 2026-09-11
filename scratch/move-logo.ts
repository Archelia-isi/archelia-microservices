import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// Remove from the beginning of nav
content = content.replace(
  /<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">\s+<ClientElmarkLogo \/>/,
  '<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">'
);

// Add to the end of nav
content = content.replace(
  /<\/nav>/,
  '  <ClientElmarkLogo />\n            </nav>'
);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
