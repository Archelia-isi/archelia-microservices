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
  "const featuredProducts = await searchProducts('', { filterBy: 'published_on_web:true && is_flash_promo_lock:false', perPage: 12 });",
  "const featuredProducts = await searchProducts('', { filterBy: `published_on_web:true && is_flash_promo_lock:false && catalog_source:=${catalogSource}`, perPage: 12 });"
);

// Also new arrivals
content = content.replace(
  "const newArrivals = await searchProducts('', { filterBy: 'published_on_web:true && is_flash_promo_lock:false', sortBy: 'zucchetti_created_at:desc', perPage: 12 });",
  "const newArrivals = await searchProducts('', { filterBy: `published_on_web:true && is_flash_promo_lock:false && catalog_source:=${catalogSource}`, sortBy: 'zucchetti_created_at:desc', perPage: 12 });"
);

// Also best sellers (soldCount)
content = content.replace(
  "const bestSellers = await searchProducts('', { filterBy: 'published_on_web:true && is_flash_promo_lock:false', sortBy: 'sold_count:desc', perPage: 12 });",
  "const bestSellers = await searchProducts('', { filterBy: `published_on_web:true && is_flash_promo_lock:false && catalog_source:=${catalogSource}`, sortBy: 'sold_count:desc', perPage: 12 });"
);

fs.writeFileSync('apps/b2b-storefront/src/app/page.tsx', content);
