import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', 'utf8');

if (!content.includes("import { cookies } from 'next/headers';")) {
  content = content.replace(
    "import CatalogClient from '../../components/CatalogClient';",
    "import CatalogClient from '../../components/CatalogClient';\nimport { cookies } from 'next/headers';"
  );
}

content = content.replace(
  /export default async function CatalogPage[^{]+{/,
  "export default async function CatalogPage({ searchParams }: { searchParams: { q?: string; l1?: string; l2?: string; l3?: string } }) {\n  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';"
);

// We had a broken patch earlier where it added `catalogSource,` randomly.
// Let's fix that.
content = content.replace(/const results = await searchProducts\(query, \{\s+catalogSource,\s+b2bMode: true,/m, "const results = await searchProducts(query, { catalogSource, b2bMode: true,");

if (!content.includes('catalogSource, b2bMode')) {
    content = content.replace(
      "b2bMode: true,",
      "catalogSource, b2bMode: true,"
    );
}

// Since I ran replace color script, `#00C800` is now `brand-main` in the form. But wait, `replace_colors.py` didn't catch `focus:ring-[#00C800]`. Let's fix it.
content = content.replace(/focus:ring-\[\#00C800\]/g, 'focus:ring-brand-main');
content = content.replace(/text-\[\#00C800\]/g, 'text-brand-main');
content = content.replace(/bg-\[\#00C800\]/g, 'bg-brand-main');

fs.writeFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', content);
