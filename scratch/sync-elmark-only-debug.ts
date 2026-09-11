import { prisma } from '@archelia/database';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense';

async function main() {
  const elmarkProducts = await prisma.elmarkProcessedProduct.findMany({ take: 2 });
  const ep = elmarkProducts[0];
  
  let kws: string[] = [];
  try { kws = ep.keywords ? ep.keywords.split(',').map((k: string) => k.trim()) : []; } catch(e){}
    
  const doc = {
    id: `elmark_${ep.id}`,
    sku: ep.elmarkCode || ep.sku,
    title: ep.title || ep.originalName || '',
    original_name: ep.originalName || ep.title || '',
    description: ep.description || '',
    technical_desc: ep.technicalDesc || '',
    meta_description: ep.metaDescription || '',
    keywords: kws,
    semantic_tags: [],
    brand: 'ELMARK',
    product_group: ep.productGroup || '',
    family: ep.family || '',
    category: ep.category || '',
    unit: ep.unit || '',
    unit_multiplier: ep.unitMultiplier || 1,
    price: Number(ep.price || 0),
    price_b2b: Number(ep.price || 0),
    stock: ep.stock || 0,
    stock_main: ep.stock || 0,
    stock_ek: 0,
    image_url: ep.imageUrl || '',
    image_urls: ep.imageUrl ? [ep.imageUrl] : [],
    is_flash_promo_lock: false,
    published_on_web: true,
    published_on_b2b: true,
    zucchetti_created_at: Math.floor(ep.createdAt.getTime() / 1000),
    zucchetti_updated_at: Math.floor(ep.updatedAt.getTime() / 1000),
    zucchetti_synced_at: Math.floor(Date.now() / 1000),
    catalog_source: 'elmark',
    discgroup: ep.discgroup || ''
  };

  try {
    await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().import([doc], { action: 'upsert' });
    console.log('Success!');
  } catch (e: any) {
    console.error('Failed!', e.importResults);
  }
}

main().catch(console.error).finally(() => process.exit(0));
