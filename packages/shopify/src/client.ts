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

  // Rinnova il token 1 ora prima della scadenza effettiva
  private readonly RENEWAL_BUFFER_MS = 60 * 60 * 1000;

  async getAccessToken(): Promise<string> {
    if (process.env.SHOPIFY_ACCESS_TOKEN) {
      return process.env.SHOPIFY_ACCESS_TOKEN;
    }

    if (this.accessToken && Date.now() < this.tokenExpiry - this.RENEWAL_BUFFER_MS) {
      return this.accessToken;
    }

    log.info('Richiesta nuovo access token Shopify...', { module: 'shopify-sdk' });

    const url = `https://${env.SHOPIFY_STORE_URL}/admin/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
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
    // Path should start with a slash e.g. "/products.json"
    const url = `https://${env.SHOPIFY_STORE_URL}/admin/api/${env.SHOPIFY_API_VERSION}${path}`;

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

export const shopifyClient = new ShopifyAuthService();
