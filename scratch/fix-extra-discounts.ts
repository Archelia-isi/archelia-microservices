import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

content = content.replace(
  /export async function updateCartItemExtraDiscount\(itemId: string, discount: number\) \{/,
  "export async function updateCartItemExtraDiscount(itemId: string, discount: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

content = content.replace(
  /export async function massUpdateCartExtraDiscount\(discount: number\) \{/,
  "export async function massUpdateCartExtraDiscount(discount: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
