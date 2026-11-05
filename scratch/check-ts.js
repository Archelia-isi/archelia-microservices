const { searchBySkuPrefix } = require('@archelia/typesense/dist/search.js');
async function run() {
  const p = await searchBySkuPrefix('E45.41936');
  console.log(p);
}
run();
