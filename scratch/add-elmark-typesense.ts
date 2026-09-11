import fs from 'fs';

let content = fs.readFileSync('packages/typesense/src/index.ts', 'utf8');

// Add catalog_source
content = content.replace(
  /{ name: 'price_b2b', type: 'float', facet: true, optional: true },/,
  "{ name: 'price_b2b', type: 'float', facet: true, optional: true },\n          { name: 'catalog_source', type: 'string', facet: true, optional: true },"
);

// Modify syncProductToTypesense to use catalog_source
content = content.replace(
  /price_b2b: Number\(product\.price_b2b || product\.price\) || 0,/,
  "price_b2b: Number(product.price_b2b || product.price) || 0,\n      catalog_source: product.catalog_source || 'zucchetti',"
);

// Modify runBulkSync to also sync elmark products
const runBulkSyncRegex = /export async function runBulkSync\(\) \{[\s\S]*?console\.log\(`Found \$\{products\.length\} products to sync\.`\);/g;

const newRunBulkSync = `export async function runBulkSync() {
  console.log('Starting bulk sync to Typesense...');
  
  // 1. Initialize schema (force recreate to ensure new fields are applied)
  await initializeTypesenseSchema(true);

  // 1.5 Fetch active promos
  console.log('Fetching active promos...');
  const promoMap = await shopifyPromoService.getActivePromosMap(true);

  // 2. Fetch all products
  console.log('Fetching all products from DB...');
  const products = await prisma.product.findMany();
  const mappings = await prisma.productMapping.findMany({ select: { zucchettiSku: true, shopifyProductId: true } });
  
  const skuToShopifyId = new Map<string, string>();
  for (const m of mappings) {
    skuToShopifyId.set(m.zucchettiSku, m.shopifyProductId);
  }

  console.log(\`Found \${products.length} products to sync.\`);

  console.log('Fetching Elmark products to sync...');
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany();
  console.log(\`Found \${elmarkProducts.length} Elmark products to sync.\`);

  // Transform ElmarkProducts to look like normal Products for Typesense
  const elmarkProductsForSync = elmarkProducts.map(ep => ({
    id: \`elmark_\${ep.id}\`,
    sku: ep.elmarkCode || ep.sku,
    title: ep.title || ep.originalName || '',
    original_name: ep.originalName || ep.title || '',
    description: ep.description || '',
    technical_desc: ep.technicalDesc || '',
    meta_description: ep.metaDescription || '',
    brand: 'ELMARK',
    product_group: ep.productGroup || '',
    family: ep.family || '',
    category: ep.category || '',
    unit: ep.unit || 'PZ',
    price: ep.price,
    price_b2b: ep.price,
    discgroup: ep.discgroup || '',
    stock: ep.stock,
    stock_main: ep.stock,
    stock_ek: ep.stockEk,
    image_url: ep.imageUrl || '',
    publishedOnWeb: true, // we want them searchable in B2B
    publishedOnB2b: true,
    keywords: ep.keywords,
    catalog_source: 'elmark'
  }));

  const allProductsToSync = [...products.map(p => ({...p, catalog_source: 'zucchetti'})), ...elmarkProductsForSync];
`;

content = content.replace(runBulkSyncRegex, newRunBulkSync);

// Wait, the loop for batching uses `products.length`.
// We need to change it to `allProductsToSync.length`
content = content.replace(
  /for \(let i = 0; i < products\.length; i \+= batchSize\) \{/g,
  "for (let i = 0; i < allProductsToSync.length; i += batchSize) {"
);

content = content.replace(
  /const batch = products\.slice\(i, i \+ batchSize\);/g,
  "const batch = allProductsToSync.slice(i, i + batchSize);"
);

// We should remove the old code fetching discgroup since we do it differently? 
// No, wait, old code did:
/*
  console.log('Fetching Elmark discgroups...');
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany({
    select: { sku: true, discgroup: true }
  });
  const skuToDiscgroup = new Map<string, string>();
  for (const ep of elmarkProducts) {
    if (ep.discgroup) skuToDiscgroup.set(ep.sku, ep.discgroup);
  }
*/
// And then in the batch loop:
// `product.discgroup = skuToDiscgroup.get(product.sku) || '';`
// We should leave that part because the Zucchetti products still need the discgroup mapped!
// Let me write a better replacement!
