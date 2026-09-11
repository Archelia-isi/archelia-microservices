import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

content = content.replace(
  '<CartBadge initialCount={storeMode === "ELMARK" ? elmarkCartCount : cartItemCount} elmarkCount={0} />',
  '<CartBadge initialCount={cartItemCount} />'
);

// Wait! earlier in layout.tsx, I had `const cart = await getCart(targetUserId, "ACTIVE");`
// Let's check `layout.tsx` to see how `cartItemCount` and `elmarkCartCount` are defined.

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
