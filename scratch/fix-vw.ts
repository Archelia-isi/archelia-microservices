import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

content = content.replace(/className="max-w-\[100vw\] overflow-x-hidden"/, 'className="w-full overflow-x-hidden"');
content = content.replace(/max-w-\[100vw\]/, 'w-full');

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
