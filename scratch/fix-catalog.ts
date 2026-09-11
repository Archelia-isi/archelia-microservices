import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', 'utf8');

content = content.replace(
  /export default async function CatalogPage\([^}]+\} \)\ {\n  const cookieStore = cookies\(\);\n  const storeMode = \(cookieStore\.get\('b2b_store_mode'\)\?\.value as 'ZUCCHETTI' \| 'ELMARK'\) \|\| 'ZUCCHETTI';\n  const catalogSource = storeMode === 'ELMARK' \? 'elmark' : 'zucchetti';\n  searchParams,\n\}: \{\n  searchParams: \{ q\?: string; l1\?: string; l2\?: string; l3\?: string \};\n\}\) \{/,
  "export default async function CatalogPage({ searchParams }: { searchParams: { q?: string; l1?: string; l2?: string; l3?: string } }) {\n  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';"
);

fs.writeFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', content);
