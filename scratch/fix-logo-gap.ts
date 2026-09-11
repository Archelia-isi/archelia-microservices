import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

const oldLink = '<Link prefetch={true} href="/" className="flex items-center">';
const newLink = '<Link prefetch={true} href="/" className="flex items-center pr-4 md:pr-10">';

content = content.replace(oldLink, newLink);
fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
