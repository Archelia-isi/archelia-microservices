import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

content = content.replace(/<html lang="it">/, '<html lang="it" className="max-w-[100vw] overflow-x-hidden">');
content = content.replace(/<body className="\$\{\assistant\.className\} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden">/, '<body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col max-w-[100vw] overflow-x-hidden`}>');

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
