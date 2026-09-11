import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/cart/page.tsx', 'utf8');

if (!content.includes("import { cookies } from 'next/headers';")) {
  content = content.replace(
    "import { verifySession } from '@/lib/session';",
    "import { verifySession } from '@/lib/session';\nimport { cookies } from 'next/headers';"
  );
}

// 1. Update cart fetch
content = content.replace(
  'const cart = await getCart(session.userId, "ACTIVE");',
  "const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const cart = await getCart(session.userId, \"ACTIVE\", undefined, storeMode);"
);

fs.writeFileSync('apps/b2b-storefront/src/app/cart/page.tsx', content);

// Now delete the deprecated routes
fs.rmSync('apps/b2b-storefront/src/app/elmark', { recursive: true, force: true });
fs.rmSync('apps/b2b-storefront/src/app/cart-elmark', { recursive: true, force: true });

