import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', 'utf8');

// 1. Import cookies
if (!content.includes("import { cookies } from 'next/headers';")) {
  content = content.replace(
    "import CatalogClient from '@/components/CatalogClient';",
    "import CatalogClient from '@/components/CatalogClient';\nimport { cookies } from 'next/headers';"
  );
}

// 2. Read storeMode
content = content.replace(
  'export default async function CatalogPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {',
  "export default async function CatalogPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {\n  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';"
);

// 3. Update searchProducts call
content = content.replace(
  "const results = await searchProducts(query, { ",
  "const results = await searchProducts(query, { \n    catalogSource,\n"
);

// 4. Pass catalogSource to CatalogClient
content = content.replace(
  '<CatalogClient initialData={initialData} initialSearchParams={searchParams} />',
  '<CatalogClient initialData={initialData} initialSearchParams={searchParams} catalogSource={catalogSource} />'
);

fs.writeFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', content);

// And CatalogClient was already patched in the previous step, but let's re-verify it.
let clientContent = fs.readFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', 'utf8');
if (!clientContent.includes('catalogSource: string;')) {
  clientContent = clientContent.replace(
    'initialSearchParams: any;',
    'initialSearchParams: any;\n  catalogSource: string;'
  );
  clientContent = clientContent.replace(
    'export default function CatalogClient({ initialData, initialSearchParams }: CatalogClientProps) {',
    'export default function CatalogClient({ initialData, initialSearchParams, catalogSource }: CatalogClientProps) {'
  );
}
// Inside CatalogClient, searchProducts is called via API route!
// Wait! CatalogClient calls `/api/search`!
// Let's see what it does.
fs.writeFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', clientContent);
