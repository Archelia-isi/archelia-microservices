import fs from 'fs';

// 1. Update layout.tsx
let layoutContent = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// Add relative to header if not present
layoutContent = layoutContent.replace(
  '<header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-green-600">',
  '<header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-green-600 relative">'
);

// We keep ClientElmarkLogo where it is in the DOM (it doesn't matter much if it's absolute, but it shouldn't be in the nav flex flow).
// Let's move it OUTSIDE the `div max-w-7xl` so it's a direct child of `header`, making it independent of the centered container flex layout.
layoutContent = layoutContent.replace('              <ClientElmarkLogo />\n', '');
layoutContent = layoutContent.replace(
  '          </div>\n        </header>',
  '          </div>\n          <ClientElmarkLogo />\n        </header>'
);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', layoutContent);

// 2. Update ClientElmarkLogo.tsx
let logoContent = fs.readFileSync('apps/b2b-storefront/src/components/ClientElmarkLogo.tsx', 'utf8');
logoContent = logoContent.replace(
  'className="hidden md:flex items-center ml-4"',
  'className="hidden md:flex items-center absolute right-4 md:right-8 top-1/2 -translate-y-1/2"'
);
fs.writeFileSync('apps/b2b-storefront/src/components/ClientElmarkLogo.tsx', logoContent);

