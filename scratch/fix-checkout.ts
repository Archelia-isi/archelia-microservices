import fs from 'fs';

// Fix CheckoutButtons.tsx
let cb = fs.readFileSync('apps/b2b-storefront/src/components/CheckoutButtons.tsx', 'utf8');
cb = cb.replace(
  /export default function CheckoutButtons\(\{ isAgent, isImpersonating \}: \{ isAgent: boolean, isImpersonating: boolean \}\) \{/,
  "export default function CheckoutButtons({ isAgent, isImpersonating, cartType = 'ZUCCHETTI' }: { isAgent: boolean, isImpersonating: boolean, cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
);
cb = cb.replace(
  /const res = await checkoutCart\(action\);/,
  "const res = await checkoutCart(action, cartType);"
);
fs.writeFileSync('apps/b2b-storefront/src/components/CheckoutButtons.tsx', cb);

// Fix actions/checkout.ts
let act = fs.readFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', 'utf8');
act = act.replace(
  /export async function checkoutCart\(action: 'SEND_TO_ZUCCHETTI' \| 'PAUSE_CART'\) \{/,
  "export async function checkoutCart(action: 'SEND_TO_ZUCCHETTI' | 'PAUSE_CART', cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);
act = act.replace(
  /const cart = await getCart\(targetUserId, cartQuery\.status, cartQuery\.linkedOrderId\);/,
  "const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);"
);
// Make sure to push cartType to Zucchetti queue or pass it so worker knows it's an Elmark cart!
act = act.replace(
  /cartId: cart\.id,/,
  "cartId: cart.id,\n      cartType,"
);
fs.writeFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', act);
