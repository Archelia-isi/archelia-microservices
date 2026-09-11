import { prisma } from '@archelia/database';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense';

async function main() {
  console.log('Fetching Elmark products to sync...');
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany();
  console.log(`Found ${elmarkProducts.length} Elmark products.`);

  const elmarkProductsForSync = elmarkProducts.map(ep => {
    let kws: string[] = [];
    try { kws = ep.keywords ? ep.keywords.split(',').map((k: string) => k.trim()) : []; } catch(e){}
    
    return {
      id: `elmark_${ep.id}`,
      sku: ep.elmarkCode || ep.sku,
      title: ep.title || ep.originalName || '',
      original_name: ep.originalName || ep.title || '',
      description: ep.description || '',
      technical_desc: ep.technicalDesc || '',
      meta_description: ep.metaDescription || '',
      keywords: kws,
      brand: 'ELMARK',
      product_group: ep.productGroup || '',
      family: ep.family || '',
      category: ep.category || '',
      unit: ep.unit || 'PZ',
      price: Number(ep.price || 0),
      price_b2b: Number(ep.price || 0),
      discgroup: ep.discgroup || '',
      stock: ep.stock || 0,
      stock_main: ep.stock || 0,
      stock_ek: ep.stockEk || 0,
      image_url: ep.imageUrl || '',
      publishedOnWeb: true,
      publishedOnB2b: true,
      isFlashPromoLock: false,
      catalog_source: 'elmark'
    };
  });

  console.log('Syncing to Typesense...');
  let synced = 0;
  const batchSize = 100;
  for (let i = 0; i < elmarkProductsForSync.length; i += batchSize) {
    const batch = elmarkProductsForSync.slice(i, i + batchSize);
    try {
      await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().import(batch, { action: 'upsert' });
      synced += batch.length;
      console.log(`Synced ${synced}/${elmarkProductsForSync.length}`);
    } catch (e: any) {
      console.error('Batch failed:', e.importResults?.[0] || e.message);
    }
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => process.exit(0));
