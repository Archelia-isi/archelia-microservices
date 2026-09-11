import fs from 'fs';

// 1. cart/CartItemClient.tsx
let cic = fs.readFileSync('apps/b2b-storefront/src/app/cart/CartItemClient.tsx', 'utf8');
cic = cic.replace(
  /export default function CartItemClient\(\{ item, product \}: CartItemClientProps\) \{/,
  "export default function CartItemClient({ item, product, cartType = 'ZUCCHETTI' }: CartItemClientProps & { cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
);
cic = cic.replace(
  /await updateQuantity\(item\.id, newQuantity\);/g,
  "await updateQuantity(item.id, newQuantity, cartType);"
);
cic = cic.replace(
  /await removeFromCart\(item\.id\);/g,
  "await removeFromCart(item.id, cartType);"
);
fs.writeFileSync('apps/b2b-storefront/src/app/cart/CartItemClient.tsx', cic);

// 2. cart-elmark/CartItemClient.tsx
let cicEl = fs.readFileSync('apps/b2b-storefront/src/app/cart-elmark/CartItemClient.tsx', 'utf8');
cicEl = cicEl.replace(
  /export default function CartItemClient\(\{ item, product \}: CartItemClientProps\) \{/,
  "export default function CartItemClient({ item, product, cartType = 'ZUCCHETTI' }: CartItemClientProps & { cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
);
cicEl = cicEl.replace(
  /await updateQuantity\(item\.id, newQuantity\);/g,
  "await updateQuantity(item.id, newQuantity, cartType);"
);
cicEl = cicEl.replace(
  /await removeFromCart\(item\.id\);/g,
  "await removeFromCart(item.id, cartType);"
);
// Also fix event dispatch
cicEl = cicEl.replace(
  /window\.dispatchEvent\(new CustomEvent\('cart-updated', \{ detail: res\.cartCount \}\)\);/g,
  "window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: res.cartCount, cartType } }));"
);
fs.writeFileSync('apps/b2b-storefront/src/app/cart-elmark/CartItemClient.tsx', cicEl);

// QuickAddCart in both
function fixQuickAdd(path: string) {
  let qac = fs.readFileSync(path, 'utf8');
  qac = qac.replace(
    /export default function QuickAddCart\(\) \{/,
    "export default function QuickAddCart({ cartType = 'ZUCCHETTI' }: { cartType?: 'ZUCCHETTI'|'ELMARK' }) {"
  );
  qac = qac.replace(
    /const res = await addToCart\(sku, quantity\);/,
    "const res = await addToCart(sku, quantity, cartType);"
  );
  qac = qac.replace(
    /window\.dispatchEvent\(new CustomEvent\('cart-updated', \{ detail: res\.cartCount \}\)\);/g,
    "window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: res.cartCount, cartType } }));"
  );
  fs.writeFileSync(path, qac);
}

fixQuickAdd('apps/b2b-storefront/src/app/cart/QuickAddCart.tsx');
fixQuickAdd('apps/b2b-storefront/src/app/cart-elmark/QuickAddCart.tsx');

