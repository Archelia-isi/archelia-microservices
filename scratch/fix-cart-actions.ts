import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

content = content.replace(/import { revalidatePath } from 'next\/headers';/, '');
content = content.replace(/import { cookies } from 'next\/headers';/, "import { cookies } from 'next/headers';\nimport { revalidatePath } from 'next/cache';");

content = content.replace(/await saveCartToRedis\(cart\);\n    return { success: true };/g, "await saveCartToRedis(cart);\n    revalidatePath('/cart');\n    return { success: true };");

fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
