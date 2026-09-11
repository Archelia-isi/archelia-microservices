import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// Header wrapper
content = content.replace(/gap-6/, 'gap-3 md:gap-6');
content = content.replace(/mx-8/, 'mx-3 md:mx-8');
content = content.replace(/space-x-6/, 'space-x-3 md:space-x-6');

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
