import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

content = content.replace(/<div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">/, '<div className="w-full max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">');

// Restore html and body to standard (remove w-full overflow-x-hidden from html as it might be buggy on mobile)
content = content.replace(/<html lang="it" className="w-full overflow-x-hidden">/, '<html lang="it">');

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
