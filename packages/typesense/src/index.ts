import { typesenseClient, PRODUCTS_COLLECTION_NAME, GUIDES_COLLECTION_NAME } from './client.js';
import { shopifyPromoService, TypesensePromoData } from '@archelia/shopify';
import { prisma } from '@archelia/database';

export * from './client.js';
export * from './search.js';
/**
 * Initializes the Typesense collection schema for products if it doesn't exist.
 * If forceRecreate is true, it will drop the collection first.
 */
export async function initializeTypesenseSchema(forceRecreate: boolean = false) {
  try {
    const collections = await typesenseClient.collections().retrieve();
    const exists = collections.some((c: any) => c.name === PRODUCTS_COLLECTION_NAME);

    if (exists && forceRecreate) {
      console.log('Dropping existing Typesense Products Collection...');
      await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).delete();
    }

    if (!exists || forceRecreate) {
      console.log('Creating Typesense Products Collection...');
      await typesenseClient.collections().create({
        name: PRODUCTS_COLLECTION_NAME,
        fields: [
          { name: 'id', type: 'string' },
          { name: 'sku', type: 'string' },
          { name: 'handle', type: 'string', optional: true },
          { name: 'title', type: 'string' },
          { name: 'original_name', type: 'string', optional: true },
          { name: 'description', type: 'string', optional: true },
          { name: 'technical_desc', type: 'string', optional: true },
          { name: 'meta_description', type: 'string', optional: true },
          { name: 'brand', type: 'string', facet: true, optional: true },
          { name: 'product_group', type: 'string', facet: true, optional: true },
          { name: 'family', type: 'string', facet: true, optional: true },
          { name: 'category', type: 'string', facet: true, optional: true },
          { name: 'unit', type: 'string', optional: true, index: false },
          { name: 'price', type: 'float', facet: true },
          { name: 'price_b2b', type: 'float', facet: true, optional: true },
          { name: 'discgroup', type: 'string', facet: true, optional: true },
          { name: 'stock', type: 'int32' },
          { name: 'stock_main', type: 'int32' },
          { name: 'stock_ek', type: 'int32' },
          { name: 'image_url', type: 'string', optional: true },
          { name: 'image_urls', type: 'string[]', optional: true, index: false },
          { name: 'publishedOnWeb', type: 'bool', facet: true },
          { name: 'publishedOnB2b', type: 'bool', facet: true, optional: true },
          { name: 'keywords', type: 'string[]', optional: true },
          { name: 'semantic_tags', type: 'string[]', optional: true },
          { name: 'sku_prefixes', type: 'string[]', optional: true },
          { name: 'natural_sku', type: 'string', optional: true, sort: true },
          { name: 'is_in_promo', type: 'bool', facet: true, optional: true },
          { name: 'promo_type', type: 'string', facet: true, optional: true },
          { name: 'promo_discount', type: 'float', optional: true },
          { name: 'promo_slogan', type: 'string', optional: true },
          { name: 'promo_badge', type: 'string', optional: true },
          { name: 'promo_badge_color', type: 'string', optional: true },
          { name: 'promo_start', type: 'string', optional: true },
          { name: 'promo_end', type: 'string', optional: true }
        ],
        default_sorting_field: 'stock',
        token_separators: ['.', '-']
      });
      console.log('Typesense Products Collection created successfully.');
    } else {
      console.log('Typesense Products Collection already exists.');
    }
  } catch (error) {
    console.error('Error initializing Typesense schema:', error);
  }
}

export async function initializeGuidesSchema(forceRecreate: boolean = false) {
  try {
    const collections = await typesenseClient.collections().retrieve();
    const exists = collections.some((c: any) => c.name === GUIDES_COLLECTION_NAME);

    if (exists && forceRecreate) {
      console.log('Dropping existing Typesense Guides Collection...');
      await typesenseClient.collections(GUIDES_COLLECTION_NAME).delete();
    }

    if (!exists || forceRecreate) {
      console.log('Creating Typesense Guides Collection...');
      await typesenseClient.collections().create({
        name: GUIDES_COLLECTION_NAME,
        fields: [
          { name: 'id', type: 'string' },
          { name: 'title', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'category', type: 'string', facet: true }
        ]
      });
      console.log('Typesense Guides Collection created successfully.');
    } else {
      console.log('Typesense Guides Collection already exists.');
    }
  } catch (error) {
    console.error('Error initializing Typesense guides schema:', error);
  }
}

/**
 * Helper to generate a Search-Only API key
 */
export async function generateSearchOnlyApiKey() {
  try {
    const key = await typesenseClient.keys().create({
      description: 'Search-only API Key for Frontend',
      actions: ['documents:search'],
      collections: [PRODUCTS_COLLECTION_NAME]
    });
    return key.value;
  } catch (error) {
    console.error('Error generating search-only key:', error);
    return null;
  }
}

/**
 * Syncs a single product to Typesense.
 */
export async function syncProductToTypesense(product: any, promoData?: TypesensePromoData) {
  if (!product || !product.id) return;
  
  try {
    // Parse tags arrays if they are strings
    let keywordsArray: string[] = [];
    if (product.keywords) {
      keywordsArray = product.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    }
    
    let semanticTagsArray: string[] = [];
    if (product.semanticTags) {
      try {
         semanticTagsArray = Array.isArray(product.semanticTags) 
            ? product.semanticTags 
            : typeof product.semanticTags === 'string' ? JSON.parse(product.semanticTags) : [];
      } catch (e) {
         semanticTagsArray = [];
      }
    }

    // Extract natural sort components from SKU (ignoring dot and suffix)
    let naturalSku = product.sku || '';
    const skuBase = (product.sku || '').split('.')[0];
    const match = skuBase.match(/^([A-Za-z]+)(\d+)$/);
    if (match) {
      const letters = match[1];
      const numbers = parseInt(match[2], 10);
      naturalSku = `${letters}${String(numbers).padStart(10, '0')}`;
    } else {
      // Fallback
      const letters = skuBase.replace(/[^A-Za-z]/g, '');
      const numMatch = skuBase.match(/\d+/);
      const numbers = numMatch ? parseInt(numMatch[0], 10) : 0;
      naturalSku = `${letters}${String(numbers).padStart(10, '0')}`;
    }

    // Generate Edge N-Grams for the SKU to guarantee prefix match precedence
    const skuPrefixesArray: string[] = [];
    const baseSkuForPrefixes = (product.sku || '').toUpperCase();
    let currentPrefix = "";
    for (let char of baseSkuForPrefixes) {
      currentPrefix += char;
      skuPrefixesArray.push(currentPrefix);
    }

    const document = {
      id: product.id,
      sku: product.sku || '',
      natural_sku: naturalSku,
      handle: product.shopifyHandle || ((product.title || product.originalName) ? (product.title || product.originalName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : ''),
      title: product.title || product.originalName || '',
      original_name: product.originalName || '',
      description: product.description || '',
      technical_desc: product.technicalDesc || '',
      meta_description: product.metaDescription || '',
      brand: product.brand || '',
      product_group: product.productGroup || '',
      family: product.family || '',
      category: product.category || '',
      unit: product.unit || '',
      price: product.price || 0,
      price_b2b: product.priceB2b || 0,
      discgroup: product.discgroup || '',
      stock: Math.floor((product.stock || 0) + (product.stockEk || 0)),
      stock_main: Math.floor(product.stock || 0),
      stock_ek: Math.floor(product.stockEk || 0),
      image_url: product.imageUrl || '',
      image_urls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
      publishedOnWeb: Boolean(product.publishedOnWeb && product.shopifyId && product.shopifyStatus === 'ACTIVE'),
      publishedOnB2b: Boolean(product.publishedOnB2b),
      keywords: keywordsArray,
      semantic_tags: semanticTagsArray,
      sku_prefixes: skuPrefixesArray,
      is_in_promo: promoData?.is_in_promo || false,
      promo_type: promoData?.promo_type || '',
      promo_discount: promoData?.promo_discount || 0,
      promo_slogan: promoData?.promo_slogan || '',
      promo_badge: promoData?.promo_badge || '',
      promo_badge_color: promoData?.promo_badge_color || '',
      promo_start: promoData?.promo_start || '',
      promo_end: promoData?.promo_end || ''
    };

    await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().upsert(document);
  } catch (error) {
    console.error(`Failed to sync product ${product.id} to Typesense:`, error);
  }
}

/**
 * Deletes a product from Typesense
 */
export async function deleteProductFromTypesense(productId: string) {
  try {
    await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents(productId).delete();
  } catch (error) {
    console.error(`Failed to delete product ${productId} from Typesense:`, error);
  }
}

/**
 * Gets the current status of the Typesense connection and collection.
 */
export async function getTypesenseStatus() {
  try {
    const health = await typesenseClient.health.retrieve();
    let documentCount = 0;
    try {
      const collection = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).retrieve();
      documentCount = collection.num_documents || 0;
    } catch (e) {
      // Collection might not exist yet
      documentCount = 0;
    }
    
    return {
      status: health.ok ? 'online' : 'offline',
      documentCount
    };
  } catch (error) {
    console.error('Typesense Connection Error Details:', error, 'URL configured:', process.env.TYPESENSE_URL);
    return {
      status: 'offline',
      documentCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Runs a bulk sync of all products to Typesense.
 */
export async function syncPromotionsToTypesense() {
  console.log('🚀 Avvio fast sync promozioni Typesense...');
  
  // 1. Fetch active promos (bypass cache)
  const promoMap = await shopifyPromoService.getActivePromosMap(false);
  
  // 2. Fetch all products IDs from DB
  console.log('Recupero ID e SKU prodotti dal DB...');
  const products = await prisma.product.findMany({ select: { id: true, sku: true } });
  const mappings = await prisma.productMapping.findMany({ select: { zucchettiSku: true, shopifyProductId: true } });
  
  const skuToShopifyId = new Map<string, string>();
  for (const m of mappings) {
    skuToShopifyId.set(m.zucchettiSku, m.shopifyProductId);
  }
  
  let synced = 0;
  let failed = 0;
  const batchSize = 250;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const updates = batch.map(p => {
       const shopifyId = skuToShopifyId.get(p.sku);
       let promoData;
       if (shopifyId) {
         promoData = promoMap.get(`gid://shopify/Product/${shopifyId}`) || promoMap.get(shopifyId);
       }

       if (promoData) {
         return {
           id: String(p.id),
           is_in_promo: true,
           promo_type: promoData.promo_type || '',
           promo_discount: promoData.promo_discount || 0,
           promo_slogan: promoData.promo_slogan || '',
           promo_badge: promoData.promo_badge || '',
           promo_badge_color: promoData.promo_badge_color || '',
           promo_start: promoData.promo_start || '',
           promo_end: promoData.promo_end || ''
         };
       } else {
         return {
           id: String(p.id),
           is_in_promo: false,
           promo_type: '',
           promo_discount: 0,
           promo_slogan: '',
           promo_badge: '',
           promo_badge_color: '',
           promo_start: '',
           promo_end: ''
         };
       }
    });

    try {
      await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().import(updates, { action: 'update' });
      synced += updates.length;
      console.log(`Aggiornate ${synced}/${products.length} promozioni...`);
    } catch (e) {
      failed += updates.length;
      console.error('Errore durante l\'importazione del batch promozioni in Typesense:', e);
    }
  }
  
  console.log(`✅ Fast sync promo completato. Aggiornati: ${synced}, Falliti: ${failed}`);
  return { synced, failed };
}

export async function runBulkSync() {
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

  console.log(`Found ${products.length} products to sync.`);

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
    const batch = products.slice(i, i + batchSize);
    
    // We run the sync concurrently within the batch
    const promises = batch.map(async (product: any) => {
      try {
        const shopifyId = skuToShopifyId.get(product.sku);
        let promoData;
        if (shopifyId) {
          promoData = promoMap.get(`gid://shopify/Product/${shopifyId}`) || promoMap.get(shopifyId);
        }
        product.discgroup = skuToDiscgroup.get(product.sku) || '';
        await syncProductToTypesense(product, promoData);
        synced++;
      } catch (e) {
        failed++;
        console.error(`Failed to sync product ${product.id}`, e);
      }
    });

    await Promise.all(promises);
    console.log(`Progress: ${Math.min(i + batchSize, products.length)} / ${products.length}`);
  }

  console.log(`
Bulk sync complete!`);
  console.log(`Successfully synced: ${synced}`);
  console.log(`Failed: ${failed}`);
  
  return {
    synced,
    failed,
    total: products.length
  };
}

/**
 * Esegue una ricerca Typesense con le priorità definite dal cliente.
 */
