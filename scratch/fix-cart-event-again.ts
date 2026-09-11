import fs from 'fs';

let cic = fs.readFileSync('apps/b2b-storefront/src/app/cart/CartItemClient.tsx', 'utf8');
cic = cic.replace(
  /window\.dispatchEvent\(new CustomEvent\('cart-updated', \{ detail: res\.cartCount \}\)\);/g,
  "window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: res.cartCount, cartType } }));"
);
fs.writeFileSync('apps/b2b-storefront/src/app/cart/CartItemClient.tsx', cic);

let cb = fs.readFileSync('apps/b2b-storefront/src/components/CheckoutButtons.tsx', 'utf8');
cb = cb.replace(
  /export default function CheckoutButtons\(\{ cartId, total \}: CheckoutButtonsProps\) \{/,
  "export default function CheckoutButtons({ cartId, total, cartType = 'ZUCCHETTI' }: CheckoutButtonsProps & { cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
);
cb = cb.replace(
  /const res = await fetch\(`\/api\/checkout`, \{/,
  "const res = await fetch(`/api/checkout`, {" // Keep standard
);
cb = cb.replace(
  /body: JSON\.stringify\(\{ cartId, notes \}\),/,
  "body: JSON.stringify({ cartId, notes, cartType }),"
);
fs.writeFileSync('apps/b2b-storefront/src/components/CheckoutButtons.tsx', cb);
