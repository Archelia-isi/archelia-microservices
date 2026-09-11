import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/lib/cart.ts', 'utf8');

const oldKeyFn = `const getCartKey = (userId: string, status: 'ACTIVE' | 'REVIEW', linkedOrderId?: string) => {
  if (status === 'REVIEW' && linkedOrderId) {
    return \`b2b_cart:\${userId}:REVIEW:\${linkedOrderId}\`;
  }
  return \`b2b_cart:\${userId}:ACTIVE\`;
};`;

const newKeyFn = `const getCartKey = (userId: string, status: 'ACTIVE' | 'REVIEW', linkedOrderId?: string, cartType: string = 'ZUCCHETTI') => {
  if (status === 'REVIEW' && linkedOrderId) {
    return \`b2b_cart:\${userId}:REVIEW:\${linkedOrderId}:\${cartType}\`;
  }
  return \`b2b_cart:\${userId}:ACTIVE:\${cartType}\`;
};`;

content = content.replace(oldKeyFn, newKeyFn);

fs.writeFileSync('apps/b2b-storefront/src/lib/cart.ts', content);
