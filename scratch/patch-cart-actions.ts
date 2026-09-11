import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

// Replace addToCart signature
content = content.replace(
  "export async function addToCart(sku: string, quantity: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {",
  "export async function addToCart(sku: string, quantity: number) {\n  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const cartType = storeMode;"
);

// Replace updateCartItemQuantity signature
content = content.replace(
  "export async function updateCartItemQuantity(sku: string, quantity: number, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {",
  "export async function updateCartItemQuantity(sku: string, quantity: number) {\n  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const cartType = storeMode;"
);

// Replace removeFromCart signature
content = content.replace(
  "export async function removeFromCart(sku: string, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {",
  "export async function removeFromCart(sku: string) {\n  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const cartType = storeMode;"
);

// In apps/b2b-storefront/src/app/actions/checkout.ts, replace checkoutCart signature
let checkoutContent = fs.readFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', 'utf8');
checkoutContent = checkoutContent.replace(
  "export async function checkoutCart(notes?: string, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI') {",
  "export async function checkoutCart(notes?: string) {\n  const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const cartType = storeMode;"
);
fs.writeFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', checkoutContent);
fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);

