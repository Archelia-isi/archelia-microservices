import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// The CartBadge call needs to pass the current mode so it knows which count to show.
content = content.replace(
  '<CartBadge initialCount={cartItemCount} elmarkCount={elmarkCartCount} />',
  '<CartBadge initialCount={storeMode === "ELMARK" ? elmarkCartCount : cartItemCount} elmarkCount={0} />'
);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);

// Also patch CartBadge.tsx to remove its own pathname logic
let badgeContent = fs.readFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', 'utf8');

badgeContent = badgeContent.replace(
  "import { usePathname } from 'next/navigation';",
  ""
);
badgeContent = badgeContent.replace(
  "const pathname = usePathname();",
  ""
);
badgeContent = badgeContent.replace(
  "const isElmark = pathname === '/elmark' || pathname === '/cart-elmark';",
  ""
);
badgeContent = badgeContent.replace(
  "const displayCount = isElmark ? elmarkCount : count;",
  "const displayCount = count;"
);
badgeContent = badgeContent.replace(
  'href={isElmark ? "/cart-elmark" : "/cart"}',
  'href="/cart"'
);

fs.writeFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', badgeContent);
