import { log } from '@archelia/core';
import { prisma } from '@archelia/database';
import { shopifyClient } from '@archelia/shopify';

const SHOPIFY_LOCATION_PR = 117697904904;
const SHOPIFY_LOCATION_EK = 119021371656;

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

      // 1. Lettura prodotti dal DB (che il worker-zucchetti-pull ha già popolato)
      // Prendiamo solo quelli con publishedOnWeb = true (o quelli che lo erano e sono stati tolti se vogliamo gestire i draft)
      const products = await prisma.product.findMany({
        where: {
          publishedOnWeb: true, // Se è pubblicato su web Zucchetti
        },
      });

      // 2. Applicazione Blacklist (Esclusioni Selettive)
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

      // 3. Fetch prodotti esistenti da Shopify (per la mappatura)
      log.info('🔄 Recupero mapping Shopify...', { module: 'worker-shopify-push' });
      const existingProducts = await this.fetchShopifyProducts();
      const skuToShopifyData = this.buildSkuMap(existingProducts);

      // 4. Ghosting (Draft Fallback) per i prodotti entrati in Blacklist ma già presenti su Shopify
      for (const bp of blacklistedProducts) {
        const existingData = skuToShopifyData.get(bp.sku);
        if (existingData && existingData.status === 'active') {
          try {
            await shopifyClient.put<{ product: any }>(`/products/${existingData.id}.json`, {
              product: { id: existingData.id, status: 'draft' }
            });
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

      // 5. Sync sequenziale (per evitare 429 continui anche con retry)
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

  private async fetchShopifyProducts(): Promise<any[]> {
    const allProducts: any[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = pageInfo
        ? `/products.json?limit=250&page_info=${pageInfo}`
        : '/products.json?limit=250';

      const response = await shopifyClient.get<{ products: any[] }>(query);
      allProducts.push(...response.products);

      // In the old system they just fetched one page because of cursor pagination limits.
      // But we should try to get all if we implement proper Link parsing.
      // For now, matching old system:
      hasNextPage = false; 
    }

    return allProducts;
  }

  private buildSkuMap(products: any[]): Map<string, { id: number; status: string }> {
    const map = new Map<string, { id: number; status: string }>();
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.sku) {
          map.set(variant.sku, { id: product.id, status: product.status });
        }
      }
    }
    return map;
  }

  private async syncSingleProduct(
    product: any,
    skuToShopifyId: Map<string, { id: number; status: string }>
  ): Promise<{ sku: string; action: 'created' | 'updated' | 'skipped' | 'error'; shopifyId?: number }> {
    const sku = product.sku;
    const existingProductData = skuToShopifyId.get(sku);
    const existingId = existingProductData?.id;

    const shopifyData = this.mapToShopifyProduct(product);

    let productId: number;
    let inventoryItemId: number | undefined;

    if (existingId) {
      // AGGIORNA
      const response = await shopifyClient.put<{ product: any }>(`/products/${existingId}.json`, { product: shopifyData });
      productId = response.product.id;
      inventoryItemId = response.product.variants?.[0]?.inventory_item_id;
      log.debug(`Prodotto ${sku} aggiornato su Shopify`, { module: 'worker-shopify-push' });
    } else {
      // CREA
      const response = await shopifyClient.post<{ product: any }>('/products.json', { product: shopifyData });
      productId = response.product.id;
      inventoryItemId = response.product.variants?.[0]?.inventory_item_id;
      log.info(`Prodotto ${sku} creato su Shopify`, { module: 'worker-shopify-push' });
    }

    // MULTI-LOCATION INVENTORY SYNC
    if (inventoryItemId) {
      // PR
      await shopifyClient.post('/inventory_levels/set.json', {
        location_id: SHOPIFY_LOCATION_PR,
        inventory_item_id: inventoryItemId,
        available: product.stock
      });
      // EK
      await shopifyClient.post('/inventory_levels/set.json', {
        location_id: SHOPIFY_LOCATION_EK,
        inventory_item_id: inventoryItemId,
        available: product.stockEk
      });
    }

    // Aggiorniamo Product e Mapping
    await prisma.product.update({
      where: { id: product.id },
      data: {
        shopifyId: String(productId),
        shopifyStatus: existingId ? existingProductData.status : 'active'
      }
    });

    const dotIndex = sku.indexOf('.');
    const manufacturerCode = dotIndex !== -1 ? sku.substring(dotIndex + 1) : sku;

    await prisma.productMapping.upsert({
      where: { zucchettiSku: sku },
      update: {
        shopifyProductId: String(productId),
        lastSyncedPrice: product.price,
        lastSyncedStock: product.stock + product.stockEk,
        manufacturerCode,
      },
      create: {
        shopifyProductId: String(productId),
        zucchettiSku: sku,
        lastSyncedPrice: product.price,
        lastSyncedStock: product.stock + product.stockEk,
        manufacturerCode,
      },
    });

    return { sku, action: existingId ? 'updated' : 'created', shopifyId: productId };
  }

  private mapToShopifyProduct(product: any): any {
    const tags: string[] = [];
    if (product.brand) tags.push(`marca:${product.brand}`);
    if (product.productGroup) tags.push(`gruppo:${product.productGroup}`);
    if (product.family) tags.push(`famiglia:${product.family}`);
    if (product.category) tags.push(`categoria:${product.category}`);

    if (product.keywords) {
      const keywords = product.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      tags.push(...keywords);
    }

    const title = product.title || product.originalName || product.sku;
    const bodyHtml = product.description || product.technicalDesc || '';

    const p: any = {
      title,
      body_html: bodyHtml,
      vendor: product.brand || 'Archelia',
      product_type: product.family || '',
      tags,
      variants: [
        {
          sku: product.sku,
          price: product.price.toFixed(2),
          inventory_management: 'shopify',
          weight: product.grossWeight ? product.grossWeight : undefined,
          weight_unit: product.grossWeight && product.grossWeight > 0 ? 'kg' : undefined,
          requires_shipping: true,
        },
      ],
    };

    const metafields: any[] = [];

    if (product.metaDescription) {
      metafields.push({
        namespace: 'global',
        key: 'description_tag',
        value: product.metaDescription,
        type: 'single_line_text_field',
      });
    }

    if (product.title) {
      metafields.push({
        namespace: 'global',
        key: 'title_tag',
        value: product.title,
        type: 'single_line_text_field',
      });
    }

    if (product.technicalDesc) {
      metafields.push({
        namespace: 'custom',
        key: 'descrizione_tecnica',
        value: product.technicalDesc,
        type: 'multi_line_text_field',
      });
    }

    metafields.push({
      namespace: 'zucchetti',
      key: 'codice_articolo_guid',
      value: product.zucchettiCode,
      type: 'single_line_text_field',
    });

    if (product.originalName) {
      metafields.push({
        namespace: 'custom',
        key: 'nome_breve',
        value: product.originalName,
        type: 'single_line_text_field',
      });
    }

    if (metafields.length > 0) {
      p.metafields = metafields;
    }

    return p;
  }
}

export const productSyncService = new ProductSyncService();
