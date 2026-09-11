import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', 'utf8');

const badChunk = `export default async function CatalogPage({ searchParams }: { searchParams: { q?: string; l1?: string; l2?: string; l3?: string } }) {
  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';
  searchParams,
}: {
  searchParams: { q?: string; l1?: string; l2?: string; l3?: string };
}) {`;

const goodChunk = `export default async function CatalogPage({ searchParams }: { searchParams: { q?: string; l1?: string; l2?: string; l3?: string } }) {
  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const catalogSource = storeMode === 'ELMARK' ? 'elmark' : 'zucchetti';`;

content = content.replace(badChunk, goodChunk);
fs.writeFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', content);
