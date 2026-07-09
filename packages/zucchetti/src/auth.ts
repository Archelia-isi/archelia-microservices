import { Agent } from 'undici';
import { env, logger } from '@archelia/core';
import { getZucchettiBasicAuth } from './constants.js';

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

async function zFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const fetchOptions = { ...options, dispatcher: zucchettiDispatcher } as unknown as RequestInit;
  try {
    return await fetch(url, fetchOptions);
  } catch (err: any) {
    logger.error(`zFetch auth FAILED — url: "${url}" — error: ${err.message}`);
    throw err;
  }
}

export class ZucchettiAuthService {
  private cachedTokens: Record<string, { token: string; expiry: number }> = {};
  private readonly TOKEN_TTL_MS = 4 * 60 * 1000;

  getBasicAuthHeader(): string {
    return `Basic ${getZucchettiBasicAuth()}`;
  }

  async getToken(company?: string): Promise<string> {
    const targetCompany = company || env.ZUCCHETTI_SP_COMPANY_ISI || env.ZUCCHETTI_SP_COMPANY;
    
    if (this.cachedTokens[targetCompany] && Date.now() < this.cachedTokens[targetCompany].expiry) {
      logger.debug(`Utilizzo token Zucchetti cachato per ${targetCompany}`);
      return this.cachedTokens[targetCompany].token;
    }

    logger.info('Richiesta nuovo token Zucchetti...');

    const url = `${env.ZUCCHETTI_BASE_URL}/api/getToken`;

    const formData = new URLSearchParams();
    formData.set('username', env.ZUCCHETTI_USERNAME);
    formData.set('password', env.ZUCCHETTI_PASSWORD);
    formData.set('company', targetCompany);
    formData.set('instance', 'SERVLET');

    const response = await zFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, 'Errore richiesta token Zucchetti');
      throw new Error(`Errore token Zucchetti: HTTP ${response.status} — ${body}`);
    }

    const responseText = await response.text();
    let token: string;

    try {
      const json = JSON.parse(responseText);
      if (json.responseStatus?.message === 'ok' && json.responseData?.result) {
        token = json.responseData.result;
      } else {
        throw new Error(`Risposta token non valida: ${responseText}`);
      }
    } catch (parseError) {
      token = responseText;
    }

    if (!token || token.trim().length === 0) {
      throw new Error('Token Zucchetti vuoto nella risposta');
    }

    this.cachedTokens[targetCompany] = {
      token: token.trim(),
      expiry: Date.now() + this.TOKEN_TTL_MS
    };

    logger.info(`Token Zucchetti ottenuto con successo per ${targetCompany} ✅`);
    return token.trim();
  }

  async releaseToken(company?: string): Promise<void> {
    const targetCompany = company || env.ZUCCHETTI_SP_COMPANY_ISI || env.ZUCCHETTI_SP_COMPANY;
    const cached = this.cachedTokens[targetCompany];
    
    if (!cached) {
      logger.debug(`Nessun token da rilasciare per ${targetCompany}`);
      return;
    }

    logger.info('Rilascio token Zucchetti...');

    try {
      const url = `${env.ZUCCHETTI_BASE_URL}/api/releaseToken`;

      await zFetch(url, {
        method: 'POST',
        headers: {
          authorization: cached.token,
        },
      });

      logger.info(`Token Zucchetti rilasciato per ${targetCompany} ✅`);
    } catch (error) {
      logger.warn({ error }, `Errore nel rilascio token per ${targetCompany} (non bloccante)`);
    } finally {
      delete this.cachedTokens[targetCompany];
    }
  }

  async withToken<T>(operation: (token: string) => Promise<T>, company?: string): Promise<T> {
    const token = await this.getToken(company);
    try {
      return await operation(token);
    } catch (err: any) {
      logger.error({ error: err }, 'Operazione Zucchetti (con token) non riuscita');
      throw err;
    }
  }
}

export const zucchettiAuth = new ZucchettiAuthService();
