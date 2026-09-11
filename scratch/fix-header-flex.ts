import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// Form
content = content.replace(/className="hidden md:flex flex-1 max-w-xl mx-3 md:mx-8 relative"/, 'className="hidden md:flex flex-1 min-w-0 max-w-xl mx-3 md:mx-8 relative"');

// Logo + Menu
content = content.replace(/className="flex items-center gap-3 md:gap-6"/, 'className="flex items-center gap-3 md:gap-6 shrink-0"');

// Nav Menu
content = content.replace(/className="flex space-x-3 md:space-x-6 items-center font-medium"/, 'className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto"');

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
