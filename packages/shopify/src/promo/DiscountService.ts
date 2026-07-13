import { shopifyClient } from '../client.js';
import { log as logger } from '@archelia/core';

export class ShopifyDiscountService {
  /**
   * Helper generico per chiamate GraphQL verso Shopify
   */
  private async gql(query: string, variables: any = {}) {
    const res = await shopifyClient.post<{ data: any; errors?: any }>('/graphql.json', { query, variables });
    if (res.errors) {
      throw new Error(`Shopify GraphQL Error: ${JSON.stringify(res.errors)}`);
    }
    return res.data;
  }

  /**
   * Genera un identificativo "sicuro" da usare nel titolo dello sconto per poterlo poi ritrovare.
   * Aggiungiamo [ID:xxxx] alla fine del titolo.
   */
  private formatTitle(baseTitle: string, metaobjectId: string): string {
    const idHash = metaobjectId.split('/').pop() || metaobjectId;
    return `${baseTitle} [ID:${idHash}]`.substring(0, 255);
  }

  // ==========================================
  // CASO 1 & 5 & 6: Sconto Automatico Base (Prodotti o Collezioni)
  // ==========================================
  async createAutomaticBasicDiscount(params: {
    title: string;
    metaobjectId: string;
    startsAt: string;
    endsAt?: string;
    percentage: number;
    collectionGids?: string[];
    productGids?: string[];
  }): Promise<string> {
    const mutation = `
      mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
          automaticDiscountNode { id automaticDiscount { ... on DiscountAutomaticBasic { title } } }
          userErrors { field message }
        }
      }
    `;

    const items: any = {};
    if (params.collectionGids && params.collectionGids.length > 0) {
      items.collections = { add: params.collectionGids };
    } else if (params.productGids && params.productGids.length > 0) {
      items.products = { productsToAdd: params.productGids };
    } else {
      items.all = true;
    }

    const payload = {
      automaticBasicDiscount: {
        title: this.formatTitle(params.title, params.metaobjectId),
        startsAt: params.startsAt,
        ...(params.endsAt ? { endsAt: params.endsAt } : {}),
        customerGets: {
          value: { percentage: params.percentage },
          items: items
        }
      }
    };

    logger.info(`[DiscountService] Creazione AutomaticBasicDiscount: ${payload.automaticBasicDiscount.title}`, { module: 'shopify-promo' });
    const data = await this.gql(mutation, payload);
    const errors = data?.discountAutomaticBasicCreate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(`Errore creazione Automatic Discount: ${JSON.stringify(errors)}`);
    }
    return data.discountAutomaticBasicCreate.automaticDiscountNode.id;
  }

  // ==========================================
  // CASO 2: BXGY (Sconto Automatico NATIVO)
  // ==========================================
  async createAutomaticBxgyDiscount(params: {
    title: string;
    metaobjectId: string;
    startsAt: string;
    endsAt?: string;
    buyCollectionGids?: string[];
    buyProductGids?: string[];
    getFreeProductGids: string[];
    percentage: number;
  }): Promise<string> {
    const mutation = `
      mutation discountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
        discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
          automaticDiscountNode { id }
          userErrors { field message }
        }
      }
    `;

    const payload = {
      automaticBxgyDiscount: {
        title: this.formatTitle(params.title, params.metaobjectId),
        startsAt: params.startsAt,
        ...(params.endsAt ? { endsAt: params.endsAt } : {}),
        customerBuys: {
          value: { quantity: "1" },
          items: params.buyProductGids && params.buyProductGids.length > 0
            ? { products: { productsToAdd: params.buyProductGids } }
            : { collections: { add: params.buyCollectionGids } }
        },
        customerGets: {
          value: { 
            discountOnQuantity: {
              quantity: "1",
              effect: { percentage: params.percentage }
            }
          },
          items: {
            products: { productsToAdd: params.getFreeProductGids }
          }
        },
        usesPerOrderLimit: "1"
      }
    };

    logger.info(`[DiscountService] Creazione BXGY Automatico (Title: ${payload.automaticBxgyDiscount.title})`, { module: 'shopify-promo' });
    const data = await this.gql(mutation, payload);
    const errors = data?.discountAutomaticBxgyCreate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(`Errore creazione Automatic BXGY: ${JSON.stringify(errors)}`);
    }
    return data.discountAutomaticBxgyCreate.automaticDiscountNode.id;
  }

  // ==========================================
  // CASO 3: Sconto Globale a Codice
  // ==========================================
  async createCodeBasicDiscount(params: {
    title: string;
    metaobjectId: string;
    code: string;
    percentage: number;
    startsAt: string;
    endsAt?: string;
  }): Promise<string> {
    const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }
    `;

    const payload = {
      basicCodeDiscount: {
        title: this.formatTitle(params.title, params.metaobjectId),
        startsAt: params.startsAt,
        ...(params.endsAt ? { endsAt: params.endsAt } : {}),
        code: params.code,
        customerGets: {
          value: { percentage: params.percentage },
          items: { all: true }
        },
        customerSelection: { all: true },
        usageLimit: null
      }
    };

    logger.info(`[DiscountService] Creazione CodeBasicDiscount: ${params.code}`, { module: 'shopify-promo' });
    const data = await this.gql(mutation, payload);
    const errors = data?.discountCodeBasicCreate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(`Errore creazione CodeBasic Discount: ${JSON.stringify(errors)}`);
    }
    return data.discountCodeBasicCreate.codeDiscountNode.id;
  }

  // ==========================================
  // CASO 4: Spedizione Gratuita Automatica
  // ==========================================
  async createAutomaticFreeShipping(params: {
    title: string;
    metaobjectId: string;
    startsAt: string;
    endsAt?: string;
  }): Promise<string> {
    const mutation = `
      mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
        discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
          automaticDiscountNode { id }
          userErrors { field message }
        }
      }
    `;

    const payload = {
      freeShippingAutomaticDiscount: {
        title: this.formatTitle(params.title, params.metaobjectId),
        startsAt: params.startsAt,
        ...(params.endsAt ? { endsAt: params.endsAt } : {}),
        destination: { all: true },
        minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: "1" } }
      }
    };

    logger.info(`[DiscountService] Creazione FreeShippingDiscount Automatico`, { module: 'shopify-promo' });
    const data = await this.gql(mutation, payload);
    const errors = data?.discountAutomaticFreeShippingCreate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(`Errore creazione FreeShipping Discount: ${JSON.stringify(errors)}`);
    }
    return data.discountAutomaticFreeShippingCreate.automaticDiscountNode.id;
  }

  // ==========================================
  // METODI DI CANCELLAZIONE
  // ==========================================
  
  /**
   * Elimina uno sconto conoscendo già l'ID esatto (Automatic o Code)
   */
  async deleteDiscountById(gid: string, isCode: boolean): Promise<void> {
    const mutation = isCode 
      ? `mutation discountCodeDelete($id: ID!) { discountCodeDelete(id: $id) { deletedCodeDiscountId userErrors { field message } } }`
      : `mutation discountAutomaticDelete($id: ID!) { discountAutomaticDelete(id: $id) { deletedAutomaticDiscountId userErrors { field message } } }`;
    
    logger.info(`[DiscountService] Esecuzione Hard Delete per sconto: ${gid}`, { module: 'shopify-promo' });
    const data = await this.gql(mutation, { id: gid });
    
    const errors = data?.discountCodeDelete?.userErrors || data?.discountAutomaticDelete?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(`Errore delete discount ${gid}: ${JSON.stringify(errors)}`);
    }
  }

  /**
   * Interroga Shopify via filter title per trovare lo sconto nativo legato all'ID metaobject
   */
  async deleteDiscountsLinkedToMetaobject(metaobjectId: string): Promise<number> {
    const idHash = metaobjectId.split('/').pop() || metaobjectId;
    const filterTerm = `[ID:${idHash}]`;

    logger.info(`[DiscountService] Ricerca sconti attivi con tag: ${filterTerm}`, { module: 'shopify-promo' });

    const QUERY = `
      query searchDiscounts($query: String!) {
        discountNodes(first: 10, query: $query) {
          edges {
            node {
              id
              discount {
                ... on DiscountAutomaticApp { title }
                ... on DiscountAutomaticBasic { title }
                ... on DiscountAutomaticBxgy { title }
                ... on DiscountAutomaticFreeShipping { title }
                ... on DiscountCodeApp { title }
                ... on DiscountCodeBasic { title }
                ... on DiscountCodeBxgy { title }
                ... on DiscountCodeFreeShipping { title }
              }
            }
          }
        }
      }
    `;

    const data = await this.gql(QUERY, { query: `title:*${filterTerm}*` });
    const nodes = data?.discountNodes?.edges || [];
    
    let deleted = 0;
    for (const edge of nodes) {
      const gid = edge.node.id;
      try {
        await this.deleteDiscountById(gid, false); // Prova automatic
        deleted++;
      } catch (e1: any) {
        try {
          await this.deleteDiscountById(gid, true); // Prova code
          deleted++;
        } catch (e2: any) {
          logger.warn(`Impossibile eliminare lo sconto GID ${gid}. Errore Auto: ${e1.message}. Errore Code: ${e2.message}`, { module: 'shopify-promo' });
        }
      }
    }
    
    return deleted;
  }

  // ==========================================
  // GENERAZIONE SCONTI VOLATILI (Marketing Winback)
  // ==========================================
  
  /**
   * Genera uno sconto univoco a codice per i recuperi carrello / winback.
   */
  async generateWinbackDiscount(): Promise<string> {
    const code = `WINBACK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const startsAt = new Date().toISOString();
    
    // Scadenza a 48 ore
    const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await this.createCodeBasicDiscount({
      title: `Winback Sconto (${code})`,
      metaobjectId: 'winback-auto-generated',
      code: code,
      percentage: 0.10, // 10% di default per winback
      startsAt: startsAt,
      endsAt: endsAt
    });

    return code;
  }
}

export const shopifyDiscountService = new ShopifyDiscountService();
