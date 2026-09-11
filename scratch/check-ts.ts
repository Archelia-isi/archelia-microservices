import { searchProducts } from '@archelia/typesense/dist/search.js';
async function main() {
  const results = await searchProducts('*', { limit: 1 });
  console.log(JSON.stringify(results.hits[0].document, null, 2));
}
main().catch(console.error);
