import { env, log } from '@archelia/core';

interface ShopifyTokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
  associated_user_scope?: string;
  token_type?: string;
}

export class ShopifyAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private storeType: 'RETAIL' | 'B2B';

  constructor(storeType: 'RETAIL' | 'B2B' = 'RETAIL') {
    this.storeType = storeType;
  }

  // Rinnova il token 1 ora prima della scadenza effettiva
  private readonly RENEWAL_BUFFER_MS = 60 * 60 * 1000;

  async getAccessToken(): Promise<string> {
    const isB2B = this.storeType === 'B2B';
    const envToken = isB2B ? process.env.SHOPIFY_B2B_ACCESS_TOKEN : process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (envToken) {
      return envToken;
    }

    if (this.accessToken && Date.now() < this.tokenExpiry - this.RENEWAL_BUFFER_MS) {
      return this.accessToken;
    }

    log.info(`Richiesta nuovo access token Shopify (${this.storeType})...`, { module: 'shopify-sdk' });

    const storeUrl = isB2B ? env.SHOPIFY_B2B_STORE_URL : env.SHOPIFY_STORE_URL;
    const clientId = isB2B ? env.SHOPIFY_B2B_CLIENT_ID : env.SHOPIFY_CLIENT_ID;
    const clientSecret = isB2B ? env.SHOPIFY_B2B_CLIENT_SECRET : env.SHOPIFY_CLIENT_SECRET;

    if (!storeUrl) throw new Error(`Missing SHOPIFY_STORE_URL for ${this.storeType}`);

    const url = `https://${storeUrl}/admin/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.error(`Errore richiesta token Shopify: HTTP ${response.status}`, { body, module: 'shopify-sdk' });
      throw new Error(`Errore token Shopify: HTTP ${response.status} — ${body}`);
    }

    const data = (await response.json()) as ShopifyTokenResponse;

    this.accessToken = data.access_token;
    const expiresInMs = (data.expires_in || 24 * 60 * 60) * 1000;
    this.tokenExpiry = Date.now() + expiresInMs;

    log.info(`Access token Shopify ottenuto ✅ (scade in ${Math.round(expiresInMs / 1000 / 60)} minuti)`, { module: 'shopify-sdk' });

    return this.accessToken;
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const isB2B = this.storeType === 'B2B';
    const storeUrl = isB2B ? env.SHOPIFY_B2B_STORE_URL : env.SHOPIFY_STORE_URL;
    
    if (!storeUrl) throw new Error(`Missing store URL for ${this.storeType}`);
    
    // Path should start with a slash e.g. "/products.json"
    const url = `https://${storeUrl}/admin/api/${env.SHOPIFY_API_VERSION}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      log.warn('Token Shopify scaduto, rinnovo in corso...', { module: 'shopify-sdk' });
      this.accessToken = null;
      this.tokenExpiry = 0;

      const newToken = await this.getAccessToken();
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': newToken,
          ...options.headers,
        },
      });
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 2000;
      log.warn(`Rate limit Shopify superato (429). Attesa di ${waitMs}ms...`, { module: 'shopify-sdk' });
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.fetch(path, options);
    }

    return response;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const response = await this.fetch(path);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Shopify GET ${path} fallita: HTTP ${response.status} — ${body}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, data: unknown): Promise<T> {
    if (!env.ENABLE_GLOBAL_WRITES) {
      log.warn(`🛡️ [SHOPIFY SDK] POST ${path} bloccata da regola di sicurezza globale.`, { module: 'shopify-sdk' });
      return {} as T;
    }
    const response = await this.fetch(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Shopify POST ${path} fallita: HTTP ${response.status} — ${body}`);
    }
    return response.json() as Promise<T>;
  }

  async put<T = unknown>(path: string, data: unknown): Promise<T> {
    if (!env.ENABLE_GLOBAL_WRITES) {
      log.warn(`🛡️ [SHOPIFY SDK] PUT ${path} bloccata da regola di sicurezza globale.`, { module: 'shopify-sdk' });
      return {} as T;
    }
    const response = await this.fetch(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Shopify PUT ${path} fallita: HTTP ${response.status} — ${body}`);
    }
    return response.json() as Promise<T>;
  }
}

export const shopifyClient = new ShopifyAuthService('RETAIL');

// Cache instances
const instances = {
  RETAIL: shopifyClient,
  B2B: new ShopifyAuthService('B2B')
};

export const getShopifyClient = (storeType: string = 'RETAIL') => {
  return storeType === 'B2B' ? instances.B2B : instances.RETAIL;
};
