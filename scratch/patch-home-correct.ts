import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/page.tsx', 'utf8');

// 1. Import cookies
if (!content.includes("import { cookies } from 'next/headers';")) {
  content = content.replace(
    "import ProductCarousel from '../components/ProductCarousel';",
    "import ProductCarousel from '../components/ProductCarousel';\nimport { cookies } from 'next/headers';"
  );
}

// 2. Read storeMode
content = content.replace(
  'export default async function Home() {',
  "export default async function Home() {\n  const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';\n  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';"
);

// 3. Pass catalogSource to searchProducts
content = content.replace(
  /\{ b2bMode: true \}/g,
  "{ b2bMode: true, catalogSource }"
);

fs.writeFileSync('apps/b2b-storefront/src/app/page.tsx', content);
