import { getTypesenseStatus, searchProducts } from '@archelia/typesense';
async function run() {
  try {
    const status = await getTypesenseStatus();
    console.log('Status:', status);
    const search = await searchProducts('E53', { includeUnpublished: true });
    console.log('Search E53:', search.hits?.length, 'hits');
    const search2 = await searchProducts('canalina', { includeUnpublished: true });
    console.log('Search canalina:', search2.hits?.length, 'hits');
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
