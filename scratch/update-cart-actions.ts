import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

// addToCart
content = content.replace(
  /export async function addToCart\(sku: string, quantity: number\) \{/,
  "export async function addToCart(sku: string, quantity: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);
content = content.replace(
  /const cart = await getCart\(targetUserId, cartQuery\.status, cartQuery\.linkedOrderId\);/,
  "const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);"
);

// updateQuantity
content = content.replace(
  /export async function updateQuantity\(itemId: string, quantity: number\) \{/,
  "export async function updateQuantity(itemId: string, quantity: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

// removeFromCart
content = content.replace(
  /export async function removeFromCart\(itemId: string\) \{/,
  "export async function removeFromCart(itemId: string, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

// getCartCount
content = content.replace(
  /export async function getCartCount\(\) \{/,
  "export async function getCartCount(cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {"
);

// Apply replacements to multiple occurrences of getCart inside these functions
content = content.replace(
  /const cart = await getCart\(targetUserId, cartQuery\.status, cartQuery\.linkedOrderId\);/g,
  "const cart = await getCart(targetUserId, cartQuery.status, cartQuery.linkedOrderId, cartType);"
);

fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
