import { log, env } from '@archelia/core';
import { prisma } from '@archelia/database';
import { shopifyClient, shopifyGraphQL } from '@archelia/shopify';
import { parseTechnicalDesc } from './lookups.js';

const SHOPIFY_LOCATION_PR = 'gid://shopify/Location/117697904904';
const SHOPIFY_LOCATION_EK = 'gid://shopify/Location/119021371656';

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details: any[];
}

export class ProductSyncService {
  async syncProducts(): Promise<SyncResult> {
    const result: SyncResult = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      log.info('📦 Inizio sync prodotti Database -> Shopify', { module: 'worker-shopify-push' });

      if (!env.ENABLE_GLOBAL_WRITES) {
        log.warn('⚠️ ENABLE_GLOBAL_WRITES è false. Bypass sync Shopify (Tutto) per sicurezza.', { module: 'worker-shopify-push' });
        return result;
      }

      const products = await prisma.product.findMany({
        where: { publishedOnWeb: true },
      });

      const blacklistRule = await prisma.shopifyBlacklistRule.findUnique({ where: { id: 'singleton' } });
      const blacklistedProducts: typeof products = [];
      let activeProducts = products;

      if (blacklistRule) {
        const blacklistBrands = (blacklistRule.brands as string[]) || [];
        const blacklistGroups = (blacklistRule.productGroups as string[]) || [];
        const blacklistFamilies = (blacklistRule.families as string[]) || [];
        const blacklistCategories = (blacklistRule.categories as string[]) || [];
        const blacklistSkus = (blacklistRule.products as string[]) || [];

        activeProducts = products.filter(p => {
          const isBlacklisted =
            blacklistBrands.includes(p.brand || '') ||
            blacklistGroups.includes(p.productGroup || '') ||
            blacklistFamilies.includes(p.family || '') ||
            blacklistCategories.includes(p.category || '') ||
            blacklistSkus.includes(p.sku);

          if (isBlacklisted) {
            blacklistedProducts.push(p);
            return false;
          }
          return true;
        });

        const diff = products.length - activeProducts.length;
        if (diff > 0) {
          log.info(`🚫 Rimossi ${diff} articoli dalla sync attiva a causa della Blacklist. (Saranno forzati a DRAFT su Shopify)`, { module: 'worker-shopify-push' });
        }
      }

      result.total = activeProducts.length;

      log.info('🔄 Recupero mapping Shopify...', { module: 'worker-shopify-push' });
      const existingProducts = await this.fetchShopifyProducts();
      const skuToShopifyData = this.buildSkuMap(existingProducts);

      for (const bp of blacklistedProducts) {
        const existingData = skuToShopifyData.get(bp.sku);
        if (existingData && existingData.status === 'ACTIVE') {
          try {
            await shopifyGraphQL.query(`mutation($input: ProductSetInput!) {
              productSet(input: $input) {
                userErrors { message }
              }
            }`, { input: { id: existingData.id, status: 'DRAFT' } });
            log.info(`👻 Articolo ${bp.sku} convertito in DRAFT Shopify (incluso in Blacklist)`, { module: 'worker-shopify-push' });
            
            await prisma.product.update({
              where: { id: bp.id },
              data: { shopifyStatus: 'draft' }
            });
            result.updated++;
          } catch (e: any) {
            log.error(`❌ Errore ghosting DRAFT per ${bp.sku}: ${e.message}`, { module: 'worker-shopify-push' });
          }
        }
      }

      for (const product of activeProducts) {
        try {
          const itemResult = await this.syncSingleProduct(product, skuToShopifyData);
          result.details.push(itemResult);

          switch (itemResult.action) {
            case 'created': result.created++; break;
            case 'updated': result.updated++; break;
            case 'skipped': result.skipped++; break;
            case 'error': result.errors++; break;
          }
        } catch (error: any) {
          log.error(`Errore sync prodotto ${product.sku}: ${error.message}`, { module: 'worker-shopify-push' });
          result.errors++;
          result.details.push({ sku: product.sku, action: 'error', error: error.message });
        }
      }

      log.info(`✅ Sync Shopify completata: ${result.created} creati, ${result.updated} aggiornati, ${result.errors} errori`, { module: 'worker-shopify-push' });
      return result;
    } catch (error: any) {
      log.error(`❌ Errore fatale sync prodotti: ${error.message}`, { module: 'worker-shopify-push' });
      throw error;
    }
  }

  async syncStockOnly(): Promise<SyncResult> {
    const result: SyncResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, details: [] };
    try {
      log.info('📦 Inizio sync STOCK ONLY Database -> Shopify', { module: 'worker-shopify-push' });

      if (!env.ENABLE_GLOBAL_WRITES) {
        log.warn('⚠️ ENABLE_GLOBAL_WRITES è false. Bypass sync STOCK ONLY per sicurezza.', { module: 'worker-shopify-push' });
        return result;
      }
      const products = await prisma.product.findMany({ where: { publishedOnWeb: true } });
      const existingProducts = await this.fetchShopifyProducts();
      const skuToShopifyData = this.buildSkuMap(existingProducts);

      result.total = products.length;

      for (const product of products) {
        const existingProductData = skuToShopifyData.get(product.sku);
        if (existingProductData && existingProductData.inventoryItemId) {
          try {
            await shopifyGraphQL.query(`mutation($input: InventorySetOnHandQuantitiesInput!) {
              inventorySetOnHandQuantities(input: $input) {
                userErrors { message }
              }
            }`, {
              input: {
                reason: 'correction',
                setQuantities: [
                  { locationId: SHOPIFY_LOCATION_PR, inventoryItemId: existingProductData.inventoryItemId, quantity: product.stock },
                  { locationId: SHOPIFY_LOCATION_EK, inventoryItemId: existingProductData.inventoryItemId, quantity: product.stockEk || 0 }
                ]
              }
            });
            result.updated++;
          } catch(e: any) {
            log.error(`Errore stock sync ${product.sku}: ${e.message}`);
            result.errors++;
          }
        } else {
          result.skipped++;
        }
      }
      log.info(`✅ Sync Stock Shopify completata: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori`);
      return result;
    } catch (error: any) {
      log.error(`❌ Errore fatale sync stock: ${error.message}`);
      throw error;
    }
  }

  async syncDifferentialStock(): Promise<SyncResult> {
    const result: SyncResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, details: [] };
    try {
      log.info('📦 Inizio DIFFERENTIAL STOCK sync Database -> Shopify (GraphQL)', { module: 'worker-shopify-push' });

      if (!env.ENABLE_GLOBAL_WRITES) {
        log.warn('⚠️ ENABLE_GLOBAL_WRITES è false. Bypass DIFFERENTIAL STOCK per sicurezza.', { module: 'worker-shopify-push' });
        return result;
      }
      
      const products = await prisma.product.findMany({
        where: { publishedOnWeb: true, shopifyId: { not: null } },
        select: { id: true, sku: true, stock: true, stockEk: true }
      });
      
      const mappings = await prisma.productMapping.findMany({
        where: { zucchettiSku: { in: products.map(p => p.sku) } },
        select: { zucchettiSku: true, lastSyncedStock: true, shopifyProductId: true }
      });
      
      const mappingDict = new Map<string, any>(mappings.map(m => [m.zucchettiSku, m]));
      
      const diffProducts = products.filter(p => {
        const map = mappingDict.get(p.sku);
        if (!map) return false;
        const totalStock = p.stock + p.stockEk;
        return totalStock !== map.lastSyncedStock;
      });

      result.total = diffProducts.length;

      if (diffProducts.length === 0) {
        log.info('✅ Nessuna variazione di stock da sincronizzare verso Shopify.', { module: 'worker-shopify-push' });
        return result;
      }

      log.info(`📦 Trovate ${diffProducts.length} variazioni di stock. Fetching InventoryItem IDs...`, { module: 'worker-shopify-push' });

      const existingShopifyData = await this.fetchShopifyProducts();
      const skuToShopifyData = this.buildSkuMap(existingShopifyData);

      const maxBatchSize = 100;
      
      for (let i = 0; i < diffProducts.length; i += maxBatchSize) {
        const batch = diffProducts.slice(i, i + maxBatchSize);
        const mutationInputs: string[] = [];
        const batchUpdates: any[] = [];
        
        for (const p of batch) {
           const sData = skuToShopifyData.get(p.sku);
           if (!sData || !sData.inventoryItemId) {
              result.skipped++;
              continue;
           }

           const invId = sData.inventoryItemId;

           mutationInputs.push(`
             pr_${p.sku.replace(/\W/g, '_')}: inventorySetOnHandQuantities(input: { reason: "correction", setQuantities: [{ inventoryItemId: "${invId}", locationId: "${SHOPIFY_LOCATION_PR}", quantity: ${p.stock} }] }) {
               userErrors { field message }
             }
             ek_${p.sku.replace(/\W/g, '_')}: inventorySetOnHandQuantities(input: { reason: "correction", setQuantities: [{ inventoryItemId: "${invId}", locationId: "${SHOPIFY_LOCATION_EK}", quantity: ${p.stockEk} }] }) {
               userErrors { field message }
             }
           `);
           batchUpdates.push({ sku: p.sku, totalStock: p.stock + p.stockEk });
        }

        if (mutationInputs.length > 0) {
           const query = `mutation { ${mutationInputs.join('\n')} }`;
           try {
             const gqlRes = await shopifyGraphQL<any>(query);
             let batchHasErrors = false;
             for (const key of Object.keys(gqlRes)) {
               if (gqlRes[key]?.userErrors?.length > 0) {
                 batchHasErrors = true;
                 log.error(`Errore GraphQL stock per ${key}: ${gqlRes[key].userErrors[0].message}`);
               }
             }

             if (!batchHasErrors) {
                const upserts = batchUpdates.map(u => prisma.productMapping.update({
                  where: { zucchettiSku: u.sku },
                  data: { lastSyncedStock: u.totalStock }
                }));
                await prisma.$transaction(upserts);
                result.updated += batchUpdates.length;
             } else {
                result.errors += batchUpdates.length;
             }
           } catch(e: any) {
             log.error(`Errore batch GraphQL stock: ${e.message}`);
             result.errors += batchUpdates.length;
           }
        }
      }

      log.info(`✅ Differential Stock Sync completata: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori`, { module: 'worker-shopify-push' });
      return result;

    } catch (error: any) {
      log.error(`❌ Errore fatale differential stock sync: ${error.message}`);
      throw error;
    }
  }

  async syncDifferentialPrices(): Promise<SyncResult> {
    const result: SyncResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, details: [] };
    try {
      log.info('💰 Inizio DIFFERENTIAL PRICE sync Database -> Shopify (GraphQL)', { module: 'worker-shopify-push' });

      if (!env.ENABLE_GLOBAL_WRITES) {
        log.warn('⚠️ ENABLE_GLOBAL_WRITES è false. Bypass DIFFERENTIAL PRICE per sicurezza.', { module: 'worker-shopify-push' });
        return result;
      }
      
      const products = await prisma.product.findMany({
        where: { publishedOnWeb: true, shopifyId: { not: null } },
        select: { id: true, sku: true, price: true }
      });
      
      const mappings = await prisma.productMapping.findMany({
        where: { zucchettiSku: { in: products.map(p => p.sku) } },
        select: { zucchettiSku: true, lastSyncedPrice: true, shopifyProductId: true }
      });
      
      const mappingDict = new Map<string, any>(mappings.map(m => [m.zucchettiSku, m]));
      
      const diffProducts = products.filter(p => {
        const map = mappingDict.get(p.sku);
        if (!map) return false;
        return p.price !== map.lastSyncedPrice;
      });

      result.total = diffProducts.length;

      if (diffProducts.length === 0) {
        log.info('✅ Nessuna variazione di prezzo da sincronizzare verso Shopify.', { module: 'worker-shopify-push' });
        return result;
      }

      log.info(`💰 Trovate ${diffProducts.length} variazioni di prezzo. Fetching Variant IDs...`, { module: 'worker-shopify-push' });

      const existingShopifyData = await this.fetchShopifyProducts();
      const skuToVariantId = new Map<string, string>();
      for (const prod of existingShopifyData) {
         for (const v of prod.variants) {
            if (v.sku) skuToVariantId.set(v.sku, v.id);
         }
      }

      const maxBatchSize = 100;
      
      for (let i = 0; i < diffProducts.length; i += maxBatchSize) {
        const batch = diffProducts.slice(i, i + maxBatchSize);
        const mutationInputs: string[] = [];
        const batchUpdates: any[] = [];
        
        for (const p of batch) {
           const variantId = skuToVariantId.get(p.sku);
           if (!variantId) {
              result.skipped++;
              continue;
           }

           const priceStr = p.price.toFixed(2);

           mutationInputs.push(`
             prc_${p.sku.replace(/\W/g, '_')}: productVariantUpdate(input: { id: "${variantId}", price: "${priceStr}" }) {
               userErrors { field message }
             }
           `);
           batchUpdates.push({ sku: p.sku, price: p.price });
        }

        if (mutationInputs.length > 0) {
           const query = `mutation { ${mutationInputs.join('\n')} }`;
           try {
             const gqlRes = await shopifyGraphQL<any>(query);
             let batchHasErrors = false;
             for (const key of Object.keys(gqlRes)) {
               if (gqlRes[key]?.userErrors?.length > 0) {
                 batchHasErrors = true;
                 log.error(`Errore GraphQL price per ${key}: ${gqlRes[key].userErrors[0].message}`);
               }
             }

             if (!batchHasErrors) {
                const upserts = batchUpdates.map(u => prisma.productMapping.update({
                  where: { zucchettiSku: u.sku },
                  data: { lastSyncedPrice: u.price }
                }));
                await prisma.$transaction(upserts);
                result.updated += batchUpdates.length;
             } else {
                result.errors += batchUpdates.length;
             }
           } catch(e: any) {
             log.error(`Errore batch GraphQL price: ${e.message}`);
             result.errors += batchUpdates.length;
           }
        }
      }

      log.info(`✅ Differential Price Sync completata: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori`, { module: 'worker-shopify-push' });
      return result;

    } catch (error: any) {
      log.error(`❌ Errore fatale differential price sync: ${error.message}`);
      throw error;
    }
  }

  private async fetchShopifyProducts(): Promise<any[]> {
    const allProducts: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const query = `
        query($cursor: String) {
          products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              status
              variants(first: 10) {
                nodes { id sku inventoryItem { id } }
              }
            }
          }
        }
      `;
      const res = await shopifyGraphQL.query<any>(query, { cursor });
      
      for (const node of res.products.nodes) {
        allProducts.push({
          id: node.id,
          status: node.status,
          variants: node.variants.nodes.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            inventory_item_id: v.inventoryItem.id
          }))
        });
      }

      hasNextPage = res.products.pageInfo.hasNextPage;
      cursor = res.products.pageInfo.endCursor;
    }

    return allProducts;
  }

  private buildSkuMap(products: any[]): Map<string, { id: string; status: string; inventoryItemId?: string }> {
    const map = new Map<string, { id: string; status: string; inventoryItemId?: string }>();
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.sku) {
          map.set(variant.sku, { id: product.id, status: product.status, inventoryItemId: variant.inventory_item_id });
        }
      }
    }
    return map;
  }

  private async syncSingleProduct(
    product: any,
    skuToShopifyId: Map<string, { id: string; status: string }>
  ): Promise<{ sku: string; action: 'created' | 'updated' | 'skipped' | 'error'; shopifyId?: string }> {
    const sku = product.sku;
    const existingProductData = skuToShopifyId.get(sku);
    const existingId = existingProductData?.id;

    const tags: string[] = [];
    if (product.brand) tags.push(`marca:${product.brand}`);
    if (product.productGroup) tags.push(`gruppo:${product.productGroup}`);
    if (product.family) tags.push(`famiglia:${product.family}`);
    if (product.category) tags.push(`categoria:${product.category}`);

    if (product.keywords) {
      const keywords = product.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      tags.push(...keywords);
    }

    const { data: techData } = parseTechnicalDesc(product.technicalDesc);
    for (const key of Object.keys(techData)) {
       tags.push(techData[key]);
    }

    const title = product.title || product.originalName || product.sku;
    const bodyHtml = product.description || product.technicalDesc || '';

    const metafields: any[] = [];
    if (product.metaDescription) {
      metafields.push({ namespace: 'global', key: 'description_tag', value: product.metaDescription, type: 'single_line_text_field' });
    }
    if (product.title) {
      metafields.push({ namespace: 'global', key: 'title_tag', value: product.title, type: 'single_line_text_field' });
    }
    if (product.technicalDesc) {
      metafields.push({ namespace: 'custom', key: 'descrizione_tecnica', value: product.technicalDesc, type: 'multi_line_text_field' });
    }
    metafields.push({ namespace: 'zucchetti', key: 'codice_articolo_guid', value: product.zucchettiCode || '', type: 'single_line_text_field' });
    if (product.originalName) {
      metafields.push({ namespace: 'custom', key: 'nome_breve', value: product.originalName, type: 'single_line_text_field' });
    }
    for (const [key, value] of Object.entries(techData)) {
      metafields.push({ namespace: 'custom', key, value, type: 'single_line_text_field' });
    }

    const productSetInput: any = {
      title,
      descriptionHtml: bodyHtml,
      vendor: product.brand || 'Archelia',
      productType: product.family || '',
      tags,
      metafields,
      seo: {
        title: product.title || product.originalName,
        description: product.metaDescription || '',
      },
      status: 'ACTIVE',
      productOptions: [{ name: 'Title', position: 1, values: [{ name: 'Default Title' }] }],
      variants: [{
        optionValues: [{ name: 'Default Title', optionName: 'Title' }],
        price: parseFloat(String(product.price || 0)),
        inventoryItem: {
          sku: product.sku,
          tracked: true,
        },
        ...(!product.isFlashPromoLock ? {
          inventoryQuantities: [
            ...(product.stock >= 0 ? [{ locationId: SHOPIFY_LOCATION_PR, name: 'available', quantity: product.stock }] : []),
            ...(product.stockEk >= 0 ? [{ locationId: SHOPIFY_LOCATION_EK, name: 'available', quantity: product.stockEk }] : []),
          ],
        } : {}),
      }],
    };

    if (existingId) {
      productSetInput.id = existingId;
    }

    const MUTATION = `mutation($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) {
        product { id handle }
        userErrors { field message }
      }
    }`;

    const res = await shopifyGraphQL.query<any>(MUTATION, { input: productSetInput });
    
    if (res.productSet.userErrors.length > 0) {
      throw new Error(res.productSet.userErrors.map((e: any) => `${e.field?.join('.')}: ${e.message}`).join(', '));
    }

    const productId = res.productSet.product.id;

    await this.uploadImages(productId, product);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        shopifyId: productId.replace('gid://shopify/Product/', ''),
        shopifyStatus: 'active'
      }
    });

    const dotIndex = sku.indexOf('.');
    const manufacturerCode = dotIndex !== -1 ? sku.substring(dotIndex + 1) : sku;

    await prisma.productMapping.upsert({
      where: { zucchettiSku: sku },
      update: {
        shopifyProductId: productId.replace('gid://shopify/Product/', ''),
        lastSyncedPrice: product.price,
        lastSyncedStock: product.stock + product.stockEk,
        manufacturerCode,
      },
      create: {
        shopifyProductId: productId.replace('gid://shopify/Product/', ''),
        zucchettiSku: sku,
        lastSyncedPrice: product.price,
        lastSyncedStock: product.stock + product.stockEk,
        manufacturerCode,
      },
    });

    return { sku, action: existingId ? 'updated' : 'created', shopifyId: productId };
  }

  private async uploadImages(productId: string, product: any): Promise<void> {
    const allUrls: string[] = [];

    if (product.imageUrl) allUrls.push(product.imageUrl);

    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      for (const url of product.imageUrls) {
        if (typeof url === 'string' && !allUrls.includes(url)) {
          allUrls.push(url);
        }
      }
    }

    if (allUrls.length > 1) {
      allUrls.sort((a, b) => {
        const da = decodeURIComponent(a);
        const db = decodeURIComponent(b);
        const ma = da.match(/\((\d+)\)/); 
        const mb = db.match(/\((\d+)\)/); 
        return (ma ? parseInt(ma[1],10) : 0) - (mb ? parseInt(mb[1],10) : 0);
      });
    }

    if (allUrls.length === 0) return;

    try {
      const expectedOrderUrls = allUrls.map(url => {
        let fixedUrl = url;
        if (fixedUrl.includes('res.cloudinary.com') && !fixedUrl.includes('/f_webp')) {
          fixedUrl = fixedUrl.replace('/image/upload/', '/image/upload/f_webp,q_auto/');
        }
        const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)(\?.*)?$/i.test(fixedUrl);
        if (!hasExtension) fixedUrl += '.webp';
        fixedUrl = fixedUrl.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
        return fixedUrl;
      });

      const existingRes = await shopifyGraphQL.query<any>(`query ProductMedia($productId: ID!) {
        product(id: $productId) {
          media(first: 50) {
            edges {
              node {
                ... on MediaImage { id image { altText } }
                ... on Video { id }
                ... on Model3d { id }
                ... on ExternalVideo { id }
              }
            }
          }
        }
      }`, { productId });

      const existingMedia = existingRes.product?.media?.edges?.map((e: any) => e.node) || [];

      let isPerfectMatch = existingMedia.length === expectedOrderUrls.length;
      if (isPerfectMatch) {
        for (let i = 0; i < expectedOrderUrls.length; i++) {
          const shopifyAlt = existingMedia[i].image?.altText || '';
          const expectedUrl = expectedOrderUrls[i];
          try {
            if (decodeURIComponent(shopifyAlt) !== decodeURIComponent(expectedUrl)) {
              isPerfectMatch = false;
              break;
            }
          } catch {
            if (shopifyAlt !== expectedUrl) {
              isPerfectMatch = false;
              break;
            }
          }
        }
      }

      if (isPerfectMatch) return;

      if (existingMedia.length > 0) {
        const mediaIdsToDelete = existingMedia.map((m: any) => m.id);
        const delRes = await shopifyGraphQL.query<any>(`mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
          productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
            mediaUserErrors { message }
          }
        }`, { productId, mediaIds: mediaIdsToDelete });
      }

      const mediaInputs = expectedOrderUrls.map(url => ({
        originalSource: url,
        mediaContentType: 'IMAGE',
        alt: url
      }));

      const addRes = await shopifyGraphQL.query<any>(`mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          mediaUserErrors { message }
        }
      }`, { productId, media: mediaInputs });

      if (addRes.productCreateMedia.mediaUserErrors.length > 0) {
        const errors = addRes.productCreateMedia.mediaUserErrors.map((e: any) => e.message).join('; ');
        log.error(`❌ ${product.sku} immagini errore: ${errors}`, { module: 'worker-shopify-push' });
      }
    } catch (error: any) {
      log.error(`❌ Errore upload immagini ${product.sku}: ${error.message}`, { module: 'worker-shopify-push' });
    }
  }
}

export const productSyncService = new ProductSyncService();
