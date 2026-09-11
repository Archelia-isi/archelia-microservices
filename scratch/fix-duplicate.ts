import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', 'utf8');

content = content.replace(
  "  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};",
  "  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';"
);

fs.writeFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', content);
