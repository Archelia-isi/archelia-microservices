const { typesenseClient } = require('./packages/typesense/dist/client.js');
const fs = require('fs');

async function build() {
  console.log("Fetching taxonomy...");
  const searchRes = await typesenseClient.collections('products').documents().search({
    q: '*',
    facet_by: 'family,product_group,category',
    max_facet_values: 500,
    per_page: 0
  });
  
  fs.writeFileSync('./apps/b2b-storefront/src/lib/taxonomy.json', JSON.stringify(searchRes.facet_counts, null, 2));
  console.log("Taxonomy saved!");
}
build();
