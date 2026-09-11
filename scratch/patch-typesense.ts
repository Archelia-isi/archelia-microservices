import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense';

async function main() {
  console.log('Updating schema on products collection...');
  try {
    const res = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).update({
      fields: [
        { name: 'catalog_source', type: 'string', facet: true, optional: true }
      ]
    });
    console.log('Update success:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error('Update error:', e.message);
  }
}

main();
