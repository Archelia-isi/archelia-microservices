import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

content = content.replace(
  /export async function updateCartItemQuantity\(itemId: string, quantity: number, resetExtraDiscount: boolean = false\) \{/,
  "export async function updateCartItemQuantity(itemId: string, quantity: number, resetExtraDiscount: boolean = false, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

content = content.replace(
  /export async function applyExtraDiscount\(itemId: string, discount: number, minQty: number = 1\) \{/,
  "export async function applyExtraDiscount(itemId: string, discount: number, minQty: number = 1, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

content = content.replace(
  /export async function removeExtraDiscount\(itemId: string\) \{/,
  "export async function removeExtraDiscount(itemId: string, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
