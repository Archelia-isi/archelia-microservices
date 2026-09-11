import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');

content = content.replace(
  /window\.dispatchEvent\(new CustomEvent\('cart-updated', \{ detail: res\.cartCount \}\)\);/,
  "window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: res.cartCount, cartType } }));"
);

fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', content);

// Also need to create /cart-elmark page!
