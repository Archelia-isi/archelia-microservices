import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/lib/cart.ts', 'utf8');

// Update getCartKey
content = content.replace(
  /export function getCartKey\(userId: string, status: string = 'ACTIVE', linkedOrderId\?: string\) \{/,
  "export function getCartKey(userId: string, status: string = 'ACTIVE', linkedOrderId?: string, cartType: string = 'ZUCCHETTI') {"
);
content = content.replace(
  /return `b2b_cart:\$\{userId\}:\$\{status\}:\$\{linkedOrderId\}`;/,
  "return `b2b_cart:${userId}:${status}:${linkedOrderId}:${cartType}`;"
);
content = content.replace(
  /return `b2b_cart:\$\{userId\}:\$\{status\}`;/,
  "return `b2b_cart:${userId}:${status}:${cartType}`;"
);

// Update RedisCart interface
content = content.replace(
  /status: string;/,
  "status: string;\n  cartType: string;"
);

// Update getCart
content = content.replace(
  /export async function getCart\(userId: string, status: 'ACTIVE' \| 'REVIEW' = 'ACTIVE', linkedOrderId\?: string\): Promise<RedisCart> \{/,
  "export async function getCart(userId: string, status: 'ACTIVE' | 'REVIEW' = 'ACTIVE', linkedOrderId?: string, cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI'): Promise<RedisCart> {"
);
content = content.replace(
  /const key = getCartKey\(userId, status, linkedOrderId\);/,
  "const key = getCartKey(userId, status, linkedOrderId, cartType);"
);

content = content.replace(
  /where: \{ \n      userId, \n      status, /,
  "where: { \n      userId, \n      status, \n      cartType,"
);

content = content.replace(
  /userId,\n        status,\n        linkedOrderId: status === 'REVIEW' \? linkedOrderId : null\n      \},/,
  "userId,\n        status,\n        cartType,\n        linkedOrderId: status === 'REVIEW' ? linkedOrderId : null\n      },"
);

content = content.replace(
  /userId: dbCart\.userId!,\n    status: dbCart\.status,/,
  "userId: dbCart.userId!,\n    status: dbCart.status,\n    cartType: dbCart.cartType,"
);

// Update saveCartToRedis
content = content.replace(
  /const key = getCartKey\(cart\.userId, cart\.status\);/,
  "const key = getCartKey(cart.userId, cart.status, undefined, cart.cartType);"
);
// In cart.ts there might be linkedOrderId in saveCartToRedis
content = content.replace(
  /const key = getCartKey\(cart\.userId, cart\.status, \(cart as any\)\.linkedOrderId\);/,
  "const key = getCartKey(cart.userId, cart.status, (cart as any).linkedOrderId, cart.cartType);"
);


fs.writeFileSync('apps/b2b-storefront/src/lib/cart.ts', content);
