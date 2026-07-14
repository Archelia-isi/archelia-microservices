import { shopifyClient } from './client.js';
import { env, log } from '@archelia/core';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
}

export async function shopifyGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (query.trim().toLowerCase().startsWith('mutation') && !env.ENABLE_GLOBAL_WRITES) {
    log.warn('🛡️ [SHOPIFY SDK] Mutation bloccata da regola di sicurezza globale (ENABLE_GLOBAL_WRITES=false).', { module: 'shopify-sdk' });
    // Ritorniamo un mock o solleviamo un errore. Meglio simulare successo per non far crashare i worker.
    return {} as T;
  }

  const response = await shopifyClient.fetch('/graphql.json', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const isThrottled = json.errors.some(e => e.message === 'Throttled' || e.extensions?.code === 'THROTTLED');
    if (isThrottled) {
      log.warn('Shopify GraphQL Rate Limit superato (Throttled). Attesa di 2000ms e retry...', { module: 'shopify-sdk' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      return shopifyGraphQL<T>(query, variables);
    }
    throw new Error(`Shopify GraphQL Error: ${json.errors.map(e => e.message).join(', ')}`);
  }

  if (!json.data) {
    throw new Error('Shopify GraphQL response missing data field');
  }

  return json.data;
}
