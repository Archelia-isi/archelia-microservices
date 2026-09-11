import fs from 'fs';

let content = fs.readFileSync('packages/typesense/src/index.ts', 'utf8');

const oldRunBulkSync = `export async function runBulkSync() {
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

  console.log('Fetching Elmark discgroups...');
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany({
    select: { sku: true, discgroup: true }
  });
  const skuToDiscgroup = new Map<string, string>();
  for (const ep of elmarkProducts) {
    if (ep.discgroup) skuToDiscgroup.set(ep.sku, ep.discgroup);
  }

  // 3. Sync in batches of 100 to avoid overwhelming the Typesense server
  let synced = 0;
  let failed = 0;
  const batchSize = 100;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);`;

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

  console.log('Fetching full Elmark products to sync...');
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany();
  console.log(\`Found \${elmarkProducts.length} Elmark products to sync.\`);

  const skuToDiscgroup = new Map<string, string>();
  for (const ep of elmarkProducts) {
    if (ep.discgroup) skuToDiscgroup.set(ep.sku, ep.discgroup);
  }
  
  // Transform ElmarkProducts to look like normal Products for Typesense
  const elmarkProductsForSync = elmarkProducts.map(ep => {
    // Parse tags safely if needed
    let kws = [];
    try { kws = ep.keywords ? ep.keywords.split(',').map((k: string) => k.trim()) : []; } catch(e){}
    
    return {
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
      keywords: kws,
      catalog_source: 'elmark'
    }
  });

  const allProductsToSync = [...products.map(p => ({...p, catalog_source: 'zucchetti'})), ...elmarkProductsForSync];

  // 3. Sync in batches of 100 to avoid overwhelming the Typesense server
  let synced = 0;
  let failed = 0;
  const batchSize = 100;

  for (let i = 0; i < allProductsToSync.length; i += batchSize) {
    const batch = allProductsToSync.slice(i, i + batchSize);`;

content = content.replace(oldRunBulkSync, newRunBulkSync);

// Fix the progress log
content = content.replace(
  /console\.log\(\`Progress: \$\{Math\.min\(i \+ batchSize, products\.length\)\} \/ \$\{products\.length\}\`\);/,
  "console.log(`Progress: ${Math.min(i + batchSize, allProductsToSync.length)} / ${allProductsToSync.length}`);"
);

fs.writeFileSync('packages/typesense/src/index.ts', content);
