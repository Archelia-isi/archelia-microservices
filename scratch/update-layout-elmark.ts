import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// Import
content = content.replace(
  /import CartBadge from '..\/components\/CartBadge';/,
  "import CartBadge from '../components/CartBadge';\nimport ClientElmarkLogo from '../components/ClientElmarkLogo';"
);

// Links
const oldNav = `<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">`;
const newNav = `<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">
              <ClientElmarkLogo />`;

content = content.replace(oldNav, newNav);

const catalogLink = `<Link prefetch={true} href="/catalog" className="hover:text-green-400 transition-colors">Catalogo</Link>`;
const newCatalogLink = `${catalogLink}
              {session?.user?.isElmarkCustomer && (
                <Link prefetch={true} href="/elmark" className="text-blue-400 hover:text-blue-300 transition-colors font-bold">
                  Catalogo Elmark
                </Link>
              )}`;

content = content.replace(catalogLink, newCatalogLink);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
