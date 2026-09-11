import { syncProductToTypesense } from '@archelia/typesense';

async function test() {
  const product = {
    id: "test1234",
    sku: "TEST-SKU",
    title: "Test Product",
    price: 10,
    priceB2b: 8,
    stock: 5,
    stockEk: 10,
    publishedOnWeb: true,
    publishedOnB2b: true
  };
  
  await syncProductToTypesense(product);
  console.log("Sync success!");
}
test();
