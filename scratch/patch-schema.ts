import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';

async function patch() {
  try {
    await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).update({
      fields: [
        { name: 'stock_main', type: 'int32', sort: true, drop: false },
        { name: 'stock_ek', type: 'int32', sort: true, drop: false }
      ]
    });
    console.log("Schema patched successfully!");
  } catch (e) {
    console.error("Failed to patch schema:", e);
  }
}

patch();
